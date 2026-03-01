import OpenAI from "openai";
import type {
  Room,
  PlayerStats,
  InventorySlot,
  QuestDef,
  Position,
  PlanStep,
  SmartPlan,
  NPCDef,
} from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = localStorage.getItem("openai_api_key") ?? "";
    if (!apiKey) {
      throw new Error(
        "No OpenAI API key found. Set it via /setkey <key> in the command bar.",
      );
    }
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

export function clearPlannerClient() {
  client = null;
}

function serializeMap(room: Room): string {
  const lines: string[] = [];
  for (let y = 0; y < room.height; y++) {
    let row = "";
    for (let x = 0; x < room.width; x++) {
      const tile = room.tiles[y][x];
      if (!tile.discovered) {
        row += "?";
      } else {
        row += tile.symbol;
      }
    }
    lines.push(row);
  }
  return lines.join("\n");
}

function serializeNpcs(npcs: NPCDef[]): string {
  return npcs
    .map(
      (n) =>
        `- ${n.name} (${n.type}, HP ${n.health}/${n.maxHealth}) at (${n.position.x},${n.position.y})${n.questId ? ` [quest: ${n.questId}]` : ""}`,
    )
    .join("\n");
}

function serializeItems(items: { item: { name: string }; position: Position }[]): string {
  return items.map((i) => `- ${i.item.name} at (${i.position.x},${i.position.y})`).join("\n");
}

function serializeInventory(inv: InventorySlot[]): string {
  if (inv.length === 0) return "Empty";
  return inv
    .map((s) => `- ${s.item.name} x${s.quantity}${s.equipped ? " [equipped]" : ""}`)
    .join("\n");
}

function serializeQuests(quests: Record<string, QuestDef>): string {
  return Object.values(quests)
    .map(
      (q) =>
        `- [${q.status}] ${q.name}: ${q.objective} (${q.progress}/${q.target})`,
    )
    .join("\n");
}

function serializeRoomGraph(rooms: Record<string, Room>, currentRoomId: string): string {
  return Object.values(rooms)
    .map((r) => {
      const marker = r.id === currentRoomId ? " <-- YOU ARE HERE" : "";
      const discovered = r.discovered ? "" : " (undiscovered)";
      const exits = r.exits
        .map((e) => `${e.direction} -> ${e.targetRoomId}`)
        .join(", ");
      return `- ${r.name} [${r.id}]${discovered}${marker}: exits=[${exits}]`;
    })
    .join("\n");
}

function buildPrompt(state: {
  player: { position: Position; stats: PlayerStats; inventory: InventorySlot[] };
  currentRoomId: string;
  rooms: Record<string, Room>;
  quests: Record<string, QuestDef>;
  recentMoves: string[];
  turnCount: number;
  combatTarget: NPCDef | null;
}): string {
  const room = state.rooms[state.currentRoomId];

  return `You are a strategic planner for a roguelike game. Analyze the current game state and produce a high-level plan of 4-8 steps.

## Current State (Turn ${state.turnCount})

**Player** at (${state.player.position.x}, ${state.player.position.y}) in ${room.name}
- HP: ${state.player.stats.health}/${state.player.stats.maxHealth}
- ATK: ${state.player.stats.attack}, DEF: ${state.player.stats.defense}
- Level: ${state.player.stats.level}, XP: ${state.player.stats.xp}/${state.player.stats.xpToNext}
- Gold: ${state.player.stats.gold}
${state.combatTarget ? `- IN COMBAT with ${state.combatTarget.name} (HP ${state.combatTarget.health}/${state.combatTarget.maxHealth})` : ""}

**Inventory:**
${serializeInventory(state.player.inventory)}

**Quests:**
${serializeQuests(state.quests)}

**Current Room: ${room.name}**
Map (? = undiscovered, · = floor, █ = wall, ▯ = door):
${serializeMap(room)}

NPCs:
${room.npcs.length > 0 ? serializeNpcs(room.npcs) : "None"}

Items on ground:
${room.items.length > 0 ? serializeItems(room.items) : "None"}

**World Map:**
${serializeRoomGraph(state.rooms, state.currentRoomId)}

**Recent actions (last 15):**
${state.recentMoves.length > 0 ? state.recentMoves.slice(-15).join("\n") : "None yet"}

## Instructions
Produce a plan of 4-8 concrete steps. Consider:
- Complete active quests (check progress)
- Pick up useful items
- Heal if low on health
- Explore undiscovered rooms
- Fight enemies when strong enough, retreat when weak
- Accept available quests from NPCs

Return valid JSON matching this schema exactly:
{
  "summary": "One sentence overview of the plan",
  "steps": [
    {
      "action": "move" | "pickup" | "attack" | "talk" | "quest" | "use_item" | "explore",
      "target": "name of target entity/item/npc (optional)",
      "room": "room id where this should happen (optional)",
      "reason": "brief explanation"
    }
  ]
}`;
}

export async function generatePlan(state: {
  player: { position: Position; stats: PlayerStats; inventory: InventorySlot[] };
  currentRoomId: string;
  rooms: Record<string, Room>;
  quests: Record<string, QuestDef>;
  recentMoves: string[];
  turnCount: number;
  combatTarget: NPCDef | null;
}): Promise<SmartPlan> {
  const openai = getClient();
  const prompt = buildPrompt(state);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a game AI planner. Return only valid JSON, no markdown fences.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    summary?: string;
    steps?: Array<{
      action: PlanStep["action"];
      target?: string;
      room?: string;
      reason: string;
    }>;
  };

  return {
    summary: parsed.summary ?? "No plan generated",
    steps: (parsed.steps ?? []).map((s) => ({
      action: s.action,
      target: s.target,
      room: s.room,
      reason: s.reason,
      done: false,
    })),
    generatedAtTurn: state.turnCount,
  };
}
