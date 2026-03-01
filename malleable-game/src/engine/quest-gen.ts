import OpenAI from "openai";
import type { QuestDef, Room, PlayerStats, InventorySlot } from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY ?? "";
    if (!apiKey) throw new Error("No OpenAI API key. Set VITE_OPENAI_API_KEY in .env");
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

export async function generateCustomQuest(
  description: string,
  state: {
    rooms: Record<string, Room>;
    player: { stats: PlayerStats; inventory: InventorySlot[] };
    currentRoomId: string;
  },
): Promise<QuestDef> {
  const roomNames = Object.values(state.rooms).map((r) => r.name).join(", ");
  const allNpcs = Object.values(state.rooms)
    .flatMap((r) => r.npcs.map((n) => `${n.name} (${n.type}, in ${r.name})`))
    .join(", ");
  const allItems = Object.values(state.rooms)
    .flatMap((r) => r.items.map((i) => `${i.item.name} (in ${r.name})`))
    .join(", ");

  const questId = `quest_custom_${Date.now()}`;

  try {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You generate quests for a dark fantasy dungeon crawler. Given the player's goal and the game world, create a quest. Return JSON matching: { "name": "short quest name", "description": "1-2 sentence description", "objective": "what to do (e.g. 'Kill 3 Giant Rats', 'Find the Locket', 'Reach The Crypt')", "target": number (1-5), "reward_xp": number (30-150), "reward_gold": number (20-80), "trackingKeywords": ["keyword1", "keyword2"] }

The trackingKeywords should be lowercase words that will be matched against game events to auto-track progress. Include enemy names, item names, or room names as relevant. Examples:
- For "kill rats" → ["giant rat", "rat"]
- For "find treasure" → ["gold pile", "sapphire", "treasure"]
- For "explore everything" → ["entered", "discovered"]
- For "collect items" → ["picked up"]

Available rooms: ${roomNames}
NPCs in world: ${allNpcs}
Items in world: ${allItems}
Player level: ${state.player.stats.level}`,
        },
        {
          role: "user",
          content: `Player's goal: "${description}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 250,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      name?: string;
      description?: string;
      objective?: string;
      target?: number;
      reward_xp?: number;
      reward_gold?: number;
      trackingKeywords?: string[];
    };

    const quest: QuestDef = {
      id: questId,
      name: parsed.name || description.slice(0, 30),
      description: parsed.description || description,
      objective: parsed.objective || description,
      status: "active",
      progress: 0,
      target: Math.min(5, Math.max(1, parsed.target || 1)),
      reward: {
        xp: Math.min(150, Math.max(30, parsed.reward_xp || 50)),
        gold: Math.min(80, Math.max(20, parsed.reward_gold || 30)),
      },
      giverNpcId: "player",
    };

    (quest as QuestDef & { trackingKeywords?: string[] }).trackingKeywords =
      parsed.trackingKeywords || [];

    return quest;
  } catch {
    return {
      id: questId,
      name: description.slice(0, 30),
      description,
      objective: description,
      status: "active",
      progress: 0,
      target: 1,
      reward: { xp: 50, gold: 30 },
      giverNpcId: "player",
    };
  }
}

export function checkCustomQuestProgress(
  quest: QuestDef,
  eventText: string,
): boolean {
  const keywords = (quest as QuestDef & { trackingKeywords?: string[] })
    .trackingKeywords;
  if (!keywords || keywords.length === 0) return false;

  const lower = eventText.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}
