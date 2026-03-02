import OpenAI from "openai";
import type { RunStats, PlayerStats, Room, Position, ItemDef } from "./types";
import { ITEMS } from "../content/items";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY ?? "";
    if (!apiKey) throw new Error("No OpenAI API key. Set VITE_OPENAI_API_KEY in .env");
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

export type DifficultyAssessment = "struggling" | "cruising" | "balanced";

export function evaluateDifficulty(
  runStats: RunStats,
  turnCount: number,
  player: { stats: PlayerStats },
): DifficultyAssessment {
  if (turnCount < 15) return "balanced";

  const healthPct = player.stats.health / player.stats.maxHealth;
  const dmgRatio =
    runStats.damageDealt > 0
      ? runStats.damageTaken / runStats.damageDealt
      : runStats.damageTaken > 0
        ? 2
        : 0;

  const struggling =
    (healthPct < 0.3 && runStats.healsUsed > 3) ||
    dmgRatio > 1.5 ||
    (turnCount > 50 && runStats.enemiesKilled === 0);

  if (struggling) return "struggling";

  const cruising =
    healthPct > 0.8 &&
    dmgRatio < 0.3 &&
    runStats.enemiesKilled >= 3 &&
    player.stats.gold > 80;

  if (cruising) return "cruising";

  return "balanced";
}

export interface AdaptationAction {
  type: "spawn_item" | "buff_enemy" | "heal_player" | "add_gold";
  itemId?: string;
  amount?: number;
}

export interface AdaptationResult {
  narration: string;
  actions: AdaptationAction[];
}

export async function generateAdaptation(
  assessment: DifficultyAssessment,
  context: {
    roomName: string;
    playerHealth: number;
    playerMaxHealth: number;
    playerLevel: number;
    enemyCount: number;
    turnCount: number;
  },
): Promise<AdaptationResult> {
  try {
    const openai = getClient();
    const adaptationSchema = {
      type: "object",
      additionalProperties: false,
      properties: {
        narration: { type: "string", maxLength: 120 },
        actions: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: {
                type: "string",
                enum: ["spawn_item", "buff_enemy", "heal_player", "add_gold"],
              },
              itemId: { type: "string", maxLength: 32 },
              amount: { type: "number" },
            },
            required: ["type"],
          },
        },
      },
      required: ["narration", "actions"],
    } as const;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a dungeon master narrating subtle world changes in a dark fantasy roguelike. The player is ${assessment}. Respond with a JSON object: { "narration": "one atmospheric sentence describing what happens in the world", "actions": [{ "type": "spawn_item"|"buff_enemy"|"heal_player"|"add_gold", "itemId?": "health_potion"|"bread"|"greater_health_potion"|"torch", "amount?": number }] }. For struggling players: spawn healing items or grant small heals. For cruising players: note that enemies grow stronger. Keep narration evocative and in-world — never break the fourth wall. Max 1-2 actions.`,
        },
        {
          role: "user",
          content: `Player is ${assessment} in ${context.roomName}. HP: ${context.playerHealth}/${context.playerMaxHealth}, Level ${context.playerLevel}, ${context.enemyCount} enemies in room, turn ${context.turnCount}.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 140,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "difficulty_adaptation",
          strict: true,
          schema: adaptationSchema,
        },
      },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as AdaptationResult;
    return {
      narration: parsed.narration || "The dungeon shifts imperceptibly.",
      actions: parsed.actions || [],
    };
  } catch {
    if (assessment === "struggling") {
      return {
        narration: "A faint warmth reaches you from somewhere above...",
        actions: [{ type: "heal_player", amount: 10 }],
      };
    }
    return {
      narration: "The darkness deepens. Something stirs in the walls.",
      actions: [{ type: "buff_enemy", amount: 2 }],
    };
  }
}
