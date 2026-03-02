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
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY ?? "";
    if (!apiKey) {
      throw new Error(
        "No OpenAI API key found. Set VITE_OPENAI_API_KEY in .env",
      );
    }
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
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

function serializeRoomGraphJson(rooms: Record<string, Room>, currentRoomId: string): string {
  const graph = Object.values(rooms).map((r) => ({
    id: r.id,
    name: r.name,
    discovered: r.discovered,
    current: r.id === currentRoomId,
    exits: r.exits.map((e) => ({
      direction: e.direction,
      to: e.targetRoomId,
      toDiscovered: !!rooms[e.targetRoomId]?.discovered,
    })),
  }));
  return JSON.stringify(graph, null, 2);
}

export interface PlannerInput {
  player: { position: Position; stats: PlayerStats; inventory: InventorySlot[] };
  currentRoomId: string;
  rooms: Record<string, Room>;
  quests: Record<string, QuestDef>;
  recentMoves: string[];
  turnCount: number;
  combatTarget: NPCDef | null;
  stuckReason?: string;
  previousPlan?: SmartPlan;
}

function buildPrompt(state: PlannerInput): string {
  const room = state.rooms[state.currentRoomId];

  const stuckSection = state.stuckReason
    ? `\n## ⚠️ STUCK DETECTED\n${state.stuckReason}\nThe previous plan is not working. You MUST change strategy — try a different approach, different route, or different goal.\n`
    : "";

  const prevPlanSection = state.previousPlan
    ? `\n## Previous Plan (generated at turn ${state.previousPlan.generatedAtTurn})\nSummary: ${state.previousPlan.summary}\nSteps:\n${state.previousPlan.steps.map((s, i) => `${i + 1}. [${s.done ? "DONE" : "PENDING"}] ${s.action}${s.target ? ` → ${s.target}` : ""}${s.room ? ` (in ${s.room})` : ""}: ${s.reason}`).join("\n")}\n`
    : "";

  return `You are a strategic planner for a roguelike game. Analyze the current game state and produce a high-level plan of 4-8 steps.
${stuckSection}${prevPlanSection}
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

**Room Graph (JSON):**
${serializeRoomGraphJson(state.rooms, state.currentRoomId)}

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
- Look at recent actions — if you see repetitive movement patterns (back and forth, loops), the bot is stuck. Choose a DIFFERENT target, room, or approach than what was tried before.
- If a previous plan is shown with pending steps that aren't progressing, abandon that approach and try something else entirely.
- The bot navigates using greedy pathfinding. If a target seems unreachable, try going to a different room first or pursuing a different goal.
- You can set the "room" field in a step to route to that room through intermediate rooms.
- For any step with "room", use an exact room id from the Room Graph JSON.

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

export async function generatePlan(state: PlannerInput): Promise<SmartPlan> {
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
