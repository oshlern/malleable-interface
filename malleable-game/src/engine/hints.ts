import OpenAI from "openai";
import type {
  Room,
  PlayerStats,
  InventorySlot,
  QuestDef,
  NPCDef,
} from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY ?? "";
    if (!apiKey) throw new Error("No OpenAI API key. Set VITE_OPENAI_API_KEY in .env");
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

export async function generateHint(state: {
  currentRoomId: string;
  room: Room;
  player: { stats: PlayerStats; inventory: InventorySlot[] };
  quests: Record<string, QuestDef>;
  turnCount: number;
}): Promise<string> {
  const { room, player, quests, turnCount } = state;

  const healthPct = Math.round(
    (player.stats.health / player.stats.maxHealth) * 100,
  );
  const nearbyNpcs = room.npcs
    .map((n) => `${n.name} (${n.type})`)
    .join(", ");
  const items = room.items.map((i) => i.item.name).join(", ");
  const inv = player.inventory
    .map((s) => `${s.item.name}${s.equipped ? " [eq]" : ""} x${s.quantity}`)
    .join(", ");
  const activeQuests = Object.values(quests)
    .filter((q) => q.status === "active")
    .map((q) => `${q.name} (${q.progress}/${q.target})`)
    .join(", ");
  const exits = room.exits
    .map((e) => `${e.direction} → ${e.targetRoomId}`)
    .join(", ");

  try {
    const openai = getClient();
    const hintSchema = {
      type: "object",
      additionalProperties: false,
      properties: {
        hint: { type: "string", maxLength: 80 },
      },
      required: ["hint"],
    } as const;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a concise game advisor. Return JSON with one field: hint. Keep hint to max 12 words, tactical, specific, no fluff.",
        },
        {
          role: "user",
          content: `Turn ${turnCount}. In: ${room.name}. HP: ${healthPct}%. ATK: ${player.stats.attack}, DEF: ${player.stats.defense}. Gold: ${player.stats.gold}. Lv${player.stats.level}.
NPCs here: ${nearbyNpcs || "none"}
Items here: ${items || "none"}
Inventory: ${inv || "empty"}
Active quests: ${activeQuests || "none"}
Exits: ${exits}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 24,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tactical_hint",
          strict: true,
          schema: hintSchema,
        },
      },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { hint?: string };
    return parsed.hint?.trim() || "Explore carefully and watch your health.";
  } catch {
    return "Check your inventory and plan your next move.";
  }
}
