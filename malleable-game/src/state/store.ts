import { create } from "zustand";
import type {
  Position,
  Direction,
  PlayerStats,
  InventorySlot,
  NPCDef,
  QuestDef,
  Room,
  GameMessage,
  ContextAction,
  PredictedAction,
  HudPanel,
  ItemDef,
  SmartPlan,
  PlanStep,
  RunStats,
  RunEvent,
  StatusEffect,
} from "../engine/types";
import { generatePlan } from "../engine/planner";
import { createRooms } from "../content/rooms";
import { QUESTS } from "../content/quests";
import { ITEMS } from "../content/items";
import { setSeed, getSeed, formatSeed, parseSeed, generateSeed, SEED_LENGTH } from "../engine/rng";
import {
  sfxStep,
  sfxPickup,
  sfxHit,
  sfxPlayerHurt,
  sfxEnemyDeath,
  sfxLevelUp,
  sfxQuestAccept,
  sfxQuestComplete,
  sfxTalk,
  sfxUseItem,
  sfxDoorOpen,
  sfxDeath,
  sfxTabComplete,
  startMusic,
  changeAmbiance,
  setMusicReactivity,
} from "../engine/audio";
import {
  saveGame as saveGameToStorage,
  loadGame as loadGameFromStorage,
  deleteSave as deleteSaveFromStorage,
} from "../engine/save";
import { addFloatingText, triggerShake } from "../engine/effects";
import {
  evaluateDifficulty,
  generateAdaptation,
  type AdaptationAction,
} from "../engine/difficulty";
import { generateHint } from "../engine/hints";
import {
  generateCustomQuest,
  checkCustomQuestProgress,
} from "../engine/quest-gen";

export interface GameStore {
  player: {
    position: Position;
    stats: PlayerStats;
    inventory: InventorySlot[];
    facing: Direction;
  };
  currentRoomId: string;
  rooms: Record<string, Room>;
  quests: Record<string, QuestDef>;
  messages: GameMessage[];
  contextActions: ContextAction[];
  predictedAction: PredictedAction | null;
  activePanels: HudPanel[];
  commandOpen: boolean;
  menuOpen: boolean;
  gameOver: boolean;
  victory: boolean;
  worldIndex: 1 | 2;
  worldOneComplete: boolean;
  turnCount: number;
  combatTarget: NPCDef | null;
  tradeOpen: boolean;
  tradeNpc: NPCDef | null;
  autopilot: boolean;
  autopilotStepIntervalMs: number;
  seed: number;
  smartPlanner: boolean;
  smartPlan: SmartPlan | null;
  plannerLoading: boolean;
  recentMoves: string[];
  runStats: RunStats;
  runEvents: RunEvent[];
  statusEffects: StatusEffect[];
  hint: string | null;
  hintLoading: boolean;

  move: (dir: Direction) => void;
  interact: () => void;
  useItem: (itemId: string) => void;
  equipItem: (itemId: string) => void;
  dropItem: (itemId: string) => void;
  pickUpItem: () => void;
  attackTarget: () => void;
  talkToNpc: () => void;
  acceptQuest: (questId: string) => void;
  openTrade: (npc: NPCDef) => void;
  closeTrade: () => void;
  buyItem: (itemId: string) => void;
  sellItem: (itemId: string) => void;
  togglePanel: (panel: HudPanel) => void;
  setCommandOpen: (open: boolean) => void;
  executePredicted: () => void;
  addMessage: (text: string, type: GameMessage["type"]) => void;
  processCommand: (command: string) => void;
  toggleAutopilot: () => void;
  setAutopilotStepIntervalMs: (ms: number) => void;
  getAutopilotAction: () => (() => void) | null;
  newGame: (seed?: number) => void;
  setMenuOpen: (open: boolean) => void;
  saveGame: () => void;
  loadGame: () => void;
  addStatusEffect: (effect: StatusEffect) => void;
  deleteSave: () => void;
  toggleSmartPlanner: () => void;
  requestReplan: (stuckReason?: string) => void;
  getSmartAction: () => (() => void) | null;
  requestHint: () => void;
  createCustomQuest: (description: string) => void;
}

let msgId = 0;

const defaultSeed = generateSeed();
const DEFAULT_AUTOPILOT_STEP_INTERVAL_MS = 80;
const MIN_AUTOPILOT_STEP_INTERVAL_MS = 30;
const MAX_AUTOPILOT_STEP_INTERVAL_MS = 400;

function clampAutopilotStepIntervalMs(value: number): number {
  return Math.max(
    MIN_AUTOPILOT_STEP_INTERVAL_MS,
    Math.min(MAX_AUTOPILOT_STEP_INTERVAL_MS, value),
  );
}

const emptyRunStats: RunStats = {
  steps: 0,
  attacks: 0,
  damageDealt: 0,
  damageTaken: 0,
  itemsPickedUp: 0,
  itemsUsed: 0,
  npcsTalkedTo: 0,
  questsAccepted: 0,
  questsCompleted: 0,
  roomsDiscovered: 0,
  enemiesKilled: 0,
  goldEarned: 0,
  healsUsed: 0,
  actionCounts: {},
};

function bumpAction(stats: RunStats, action: string): RunStats {
  const actionCounts = { ...stats.actionCounts, [action]: (stats.actionCounts[action] ?? 0) + 1 };
  return { ...stats, actionCounts };
}

function cloneRooms(seed?: number): Record<string, Room> {
  setSeed(seed ?? defaultSeed);
  return JSON.parse(JSON.stringify(createRooms()));
}

function cloneQuests(): Record<string, QuestDef> {
  return JSON.parse(JSON.stringify(QUESTS));
}

function dist(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const recentPositions: Position[] = [];
const MAX_RECENT = 6;
let lastTalkedNpcId: string | null = null;
let lastEnteredFromRoomId: string | null = null;
let turnEnteredRoom = 0;
const ENTRY_COOLDOWN_TURNS = 8;
let lastTalkedTurn = -Infinity;

// Room-level exploration memory
const roomVisitCount = new Map<string, number>();
const roomLastVisitTurn = new Map<string, number>();
const roomCleared = new Set<string>();
const recentRoomPath: string[] = [];
const MAX_ROOM_PATH = 8;
const PATH_FOLLOW_TIMEOUT_TURNS = 100;
let activePathGoalKey: string | null = null;
let activePathGoalStartTurn = 0;

function resetPathFollowTracking() {
  activePathGoalKey = null;
  activePathGoalStartTurn = 0;
}

function recordRoomVisit(roomId: string, turn: number) {
  roomVisitCount.set(roomId, (roomVisitCount.get(roomId) ?? 0) + 1);
  roomLastVisitTurn.set(roomId, turn);
  recentRoomPath.push(roomId);
  if (recentRoomPath.length > MAX_ROOM_PATH) recentRoomPath.shift();
}

function isRoomCleared(roomId: string, state: GameStore): boolean {
  if (roomCleared.has(roomId)) return true;
  const room = state.rooms[roomId];
  if (!room || !room.discovered) return false;

  const hasHostiles = room.npcs.some((n) => n.type === "hostile");
  const hasItems = room.items.length > 0;
  const hasAvailableQuest = room.npcs.some((n) => {
    if (!n.questId) return false;
    const q = state.quests[n.questId];
    return q && (q.status === "available" || q.status === "completed");
  });

  if (!hasHostiles && !hasItems && !hasAvailableQuest) {
    roomCleared.add(roomId);
    return true;
  }
  return false;
}

function isRoomLooping(): boolean {
  if (recentRoomPath.length < 4) return false;
  // Detect 2-room loop: A-B-A-B
  const last4 = recentRoomPath.slice(-4);
  if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) return true;
  // Detect 3-room loop: A-B-C-A-B-C
  if (recentRoomPath.length >= 6) {
    const last6 = recentRoomPath.slice(-6);
    if (last6[0] === last6[3] && last6[1] === last6[4] && last6[2] === last6[5]) return true;
  }
  // Detect revisiting same room too often in recent history
  if (recentRoomPath.length >= 6) {
    const recent = recentRoomPath.slice(-6);
    const counts = new Map<string, number>();
    for (const r of recent) counts.set(r, (counts.get(r) ?? 0) + 1);
    for (const c of counts.values()) {
      if (c >= 3) return true;
    }
  }
  return false;
}

function resetRoomMemory() {
  roomVisitCount.clear();
  roomLastVisitTurn.clear();
  roomCleared.clear();
  recentRoomPath.length = 0;
  resetPathFollowTracking();
}

interface RoomGoal {
  targetRoomId: string;
  nextRoomId: string;
  distance: number;
  reason: string;
}

function findBestRoomGoal(currentRoomId: string, state: GameStore): RoomGoal | null {
  // BFS from current room to find the nearest interesting destination
  const visited = new Set<string>([currentRoomId]);
  // Queue entries: [roomId, first step roomId from current, distance]
  const queue: Array<[string, string | null, number]> = [];

  const currentRoom = state.rooms[currentRoomId];
  if (!currentRoom) return null;

  for (const exit of currentRoom.exits) {
    if (!visited.has(exit.targetRoomId)) {
      visited.add(exit.targetRoomId);
      queue.push([exit.targetRoomId, exit.targetRoomId, 1]);
    }
  }

  let bestGoal: RoomGoal | null = null;
  let bestScore = -Infinity;

  while (queue.length > 0) {
    const [roomId, firstStep, distance] = queue.shift()!;
    const room = state.rooms[roomId];
    if (!room) continue;
    if (!state.worldOneComplete && roomId.startsWith("world2_")) continue;

    let score = 0;
    let reason = "";

    if (!room.discovered) {
      score = 100 - distance * 5;
      reason = "undiscovered room";
    } else {
      // Check if this discovered room has exits to undiscovered rooms
      const hasUnexploredExits = room.exits.some((e) => {
        const neighbor = state.rooms[e.targetRoomId];
        return neighbor && !neighbor.discovered;
      });
      if (hasUnexploredExits) {
        score = 80 - distance * 5;
        reason = "has unexplored exits";
      }

      // Room has interesting content
      if (!isRoomCleared(roomId, state)) {
        const hasHostiles = room.npcs.some((n) => n.type === "hostile");
        const hasItems = room.items.length > 0;
        const hasQuest = room.npcs.some((n) => {
          if (!n.questId) return false;
          const q = state.quests[n.questId];
          return q && (q.status === "available" || q.status === "completed");
        });
        if (hasQuest) {
          const s = 70 - distance * 3;
          if (s > score) { score = s; reason = "has quest NPC"; }
        }
        if (hasHostiles) {
          const s = 50 - distance * 3;
          if (s > score) { score = s; reason = "has enemies"; }
        }
        if (hasItems) {
          const s = 40 - distance * 3;
          if (s > score) { score = s; reason = "has items"; }
        }
      }
    }

    // Penalize heavily visited rooms as destinations (not as waypoints)
    const visits = roomVisitCount.get(roomId) ?? 0;
    score -= visits * 2;

    // Only consider rooms that actually have something worth going to
    if (score > bestScore && score > 0 && firstStep) {
      bestScore = score;
      bestGoal = { targetRoomId: roomId, nextRoomId: firstStep, distance, reason };
    }

    // Always continue BFS through discovered rooms — they may be waypoints to reach undiscovered ones
    if (room.discovered && distance < 8) {
      for (const exit of room.exits) {
        if (!visited.has(exit.targetRoomId)) {
          visited.add(exit.targetRoomId);
          queue.push([exit.targetRoomId, firstStep!, distance + 1]);
        }
      }
    }
  }

  return bestGoal;
}

function findNextRoomHop(
  fromRoomId: string,
  toRoomId: string,
  state: GameStore,
): string | null {
  if (fromRoomId === toRoomId) return null;
  const visited = new Set<string>([fromRoomId]);
  const queue: string[] = [fromRoomId];
  const prev = new Map<string, string>();

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    const room = state.rooms[roomId];
    if (!room) continue;

    for (const exit of room.exits) {
      const next = exit.targetRoomId;
      if (visited.has(next)) continue;
      visited.add(next);
      prev.set(next, roomId);
      if (next === toRoomId) {
        // Reconstruct only the first hop after fromRoomId.
        let cur = toRoomId;
        while (prev.get(cur) && prev.get(cur) !== fromRoomId) {
          cur = prev.get(cur)!;
        }
        return cur;
      }
      queue.push(next);
    }
  }

  return null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  player: {
    position: { x: 8, y: 5 },
    stats: {
      health: 40,
      maxHealth: 40,
      attack: 5,
      defense: 3,
      speed: 5,
      level: 1,
      xp: 0,
      xpToNext: 100,
      gold: 20,
    },
    inventory: [],
    facing: "down",
  },
  currentRoomId: "village",
  rooms: cloneRooms(),
  quests: cloneQuests(),
  messages: [
    {
      id: `msg_${++msgId}`,
      text: "You arrive at Ashford Village. The old dungeon lies to the south. Something stirs below.",
      type: "info",
      timestamp: Date.now(),
    },
  ],
  contextActions: [],
  predictedAction: null,
  activePanels: ["log"],
  commandOpen: false,
  menuOpen: false,
  gameOver: false,
  victory: false,
  worldIndex: 1,
  worldOneComplete: false,
  turnCount: 0,
  combatTarget: null,
  tradeOpen: false,
  tradeNpc: null,
  autopilot: false,
  autopilotStepIntervalMs: DEFAULT_AUTOPILOT_STEP_INTERVAL_MS,
  seed: defaultSeed,
  smartPlanner: false,
  smartPlan: null,
  plannerLoading: false,
  recentMoves: [],
  runStats: { ...emptyRunStats },
  runEvents: [],
  statusEffects: [],
  hint: null,
  hintLoading: false,

  move(dir: Direction) {
    const state = get();
    if (state.gameOver || state.victory) return;

    const { position } = state.player;
    const room = state.rooms[state.currentRoomId];
    if (!room) return;

    const delta: Record<Direction, Position> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    const d = delta[dir];
    const nx = position.x + d.x;
    const ny = position.y + d.y;

    if (nx < 0 || ny < 0 || nx >= room.width || ny >= room.height) return;

    const tile = room.tiles[ny][nx];
    if (!tile.walkable) return;

    const blockingNpc = room.npcs.find(
      (n) => n.position.x === nx && n.position.y === ny && n.blocking,
    );
    if (blockingNpc) {
      if (blockingNpc.type === "hostile") {
        set({ combatTarget: blockingNpc });
      }
      return;
    }

    const exit = room.exits.find(
      (e) => e.position.x === nx && e.position.y === ny,
    );

    if (exit) {
      if (
        exit.targetRoomId.startsWith("world2_") &&
        !state.worldOneComplete
      ) {
        get().addMessage(
          "The Veil Gate is dormant. The Pianist's Nocturne must be restored first.",
          "narration",
        );
        return;
      }
      const targetRoom = state.rooms[exit.targetRoomId];
      if (targetRoom) {
        const entryExit = targetRoom.exits.find(
          (e) => e.targetRoomId === state.currentRoomId,
        );
        const entryPos = entryExit
          ? {
              x: entryExit.position.x + (exit.direction === "left" ? -1 : exit.direction === "right" ? 1 : 0),
              y: entryExit.position.y + (exit.direction === "up" ? -1 : exit.direction === "down" ? 1 : 0),
            }
          : { x: Math.floor(targetRoom.width / 2), y: Math.floor(targetRoom.height / 2) };

        const wasNew = !targetRoom.discovered;
        targetRoom.discovered = true;
        const moveRunStats = bumpAction({ ...state.runStats, steps: state.runStats.steps + 1 }, "enter room");
        const moveRunEvents = [...state.runEvents];
        if (wasNew) {
          moveRunStats.roomsDiscovered += 1;
          moveRunEvents.push({ turn: state.turnCount, text: `Discovered ${targetRoom.name}`, type: "explore" });
        }
        lastEnteredFromRoomId = state.currentRoomId;
        turnEnteredRoom = state.turnCount;
        recentPositions.length = 0;
        recordRoomVisit(exit.targetRoomId, state.turnCount);
        set({
          currentRoomId: exit.targetRoomId,
          player: { ...state.player, position: entryPos, facing: dir },
          combatTarget: null,
          worldIndex: exit.targetRoomId.startsWith("world2_") ? 2 : state.worldIndex,
          runStats: moveRunStats,
          runEvents: moveRunEvents,
        });
        sfxDoorOpen();
        changeAmbiance(targetRoom.ambiance);
        get().addMessage(`Entered ${targetRoom.name}.`, "info");
        if (exit.targetRoomId.startsWith("world2_") && state.worldIndex === 1) {
          get().addMessage("You step into World 2: The Veil Expanse.", "narration");
        }
        advanceCustomQuests(get, set, `entered ${targetRoom.name}`);

        if (exit.targetRoomId === "chapel_ruins") {
          get().addStatusEffect({ id: "blessed", name: "Blessed", icon: "✨", color: "#a78bfa", turnsRemaining: 20, healPerTurn: 1 });
          get().addMessage("A holy aura washes over you.", "info");
        }

        if (exit.targetRoomId === "crypt" && state.quests.quest_crypt?.status === "active") {
          const quests = { ...state.quests };
          quests.quest_crypt.progress = 1;
          quests.quest_crypt.status = "completed";
          sfxQuestComplete();
          get().addMessage("Quest complete: The Silent Nocturne! The Pianist awaits.", "quest");
          const s2 = get();
          set({
            quests,
            runStats: bumpAction({ ...s2.runStats, questsCompleted: s2.runStats.questsCompleted + 1 }, "complete quest"),
            runEvents: [...s2.runEvents, { turn: state.turnCount, text: `Completed quest: The Silent Nocturne`, type: "quest" }],
          });
        }

        updateVisibility(get);
        updateContext(get, set);
        get().saveGame();
        return;
      }
    }

    recentPositions.push({ x: position.x, y: position.y });
    if (recentPositions.length > MAX_RECENT) recentPositions.shift();

    const newTurn = state.turnCount + 1;
    const moves = [...state.recentMoves, `Turn ${newTurn}: move ${dir} to (${nx},${ny})`];
    if (moves.length > 30) moves.splice(0, moves.length - 30);

    set({
      player: { ...state.player, position: { x: nx, y: ny }, facing: dir },
      turnCount: newTurn,
      combatTarget: null,
      recentMoves: moves,
      runStats: bumpAction({ ...state.runStats, steps: state.runStats.steps + 1 }, `move ${dir}`),
    });

    sfxStep();
    startMusic(room.ambiance);
    moveNpcs(get, set);
    updateVisibility(get);

    const adjOffsets = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
    const nearLava = adjOffsets.some((off) => {
      const ax = nx + off.x;
      const ay = ny + off.y;
      return ax >= 0 && ay >= 0 && ax < room.width && ay < room.height && room.tiles[ay][ax].type === "lava";
    });
    if (nearLava && Math.random() < 0.15) {
      get().addStatusEffect({ id: "burning", name: "Burning", icon: "🔥", color: "#f97316", turnsRemaining: 3, damagePerTurn: 3 });
      get().addMessage("The heat singes you!", "danger");
    }

    autoHealIfLow(get, set);
    updateContext(get, set);
    tickStatusEffects(get, set);
    maybeReplan(get, newTurn);
    checkAdaptiveDifficulty(get, set, newTurn);
  },

  interact() {
    const state = get();
    const actions = state.contextActions;
    if (actions.length > 0) {
      actions[0].action();
    }
  },

  pickUpItem() {
    const state = get();
    const room = state.rooms[state.currentRoomId];
    if (!room) return;

    const { position } = state.player;
    const itemIdx = room.items.findIndex(
      (i) => i.position.x === position.x && i.position.y === position.y,
    );
    if (itemIdx === -1) return;

    const { item } = room.items[itemIdx];
    const inventory = [...state.player.inventory];
    const existingSlot = inventory.find(
      (s) => s.item.id === item.id && item.stackable,
    );

    if (existingSlot) {
      existingSlot.quantity += 1;
    } else {
      inventory.push({ item, quantity: 1, equipped: false });
    }

    room.items.splice(itemIdx, 1);
    set({
      player: { ...state.player, inventory },
      rooms: { ...state.rooms, [state.currentRoomId]: { ...room } },
      runStats: bumpAction({ ...state.runStats, itemsPickedUp: state.runStats.itemsPickedUp + 1 }, "pick up"),
      runEvents: [...state.runEvents, { turn: state.turnCount, text: `Picked up ${item.name}`, type: "loot" as const }],
    });
    sfxPickup();
    addFloatingText(state.player.position.x * 32 + 16, state.player.position.y * 32, item.name, "#fbbf24");
    get().addMessage(`Picked up ${item.name}.`, "loot");

    const quests = { ...get().quests };
    let questCompleted = false;
    let questName = "";
    if (item.id === "locket" && quests.quest_locket?.status === "active") {
      quests.quest_locket.progress = 1;
      quests.quest_locket.status = "completed";
      sfxQuestComplete();
      get().addMessage("Quest complete: The Tarnished Locket! Return to Grandmother Voss.", "quest");
      questCompleted = true;
      questName = "The Tarnished Locket";
    }
    if (
      (item.id === "gold_pile" || item.id === "sapphire") &&
      state.currentRoomId === "deep_caves" &&
      quests.quest_treasure?.status === "active"
    ) {
      quests.quest_treasure.progress = 1;
      quests.quest_treasure.status = "completed";
      sfxQuestComplete();
      get().addMessage("Quest complete: Buried Fortune! Maren will be pleased.", "quest");
      questCompleted = true;
      questName = "Buried Fortune";
    }
    if (
      item.id === "sapphire" &&
      state.currentRoomId.startsWith("world2_") &&
      quests.quest_shards?.status === "active"
    ) {
      quests.quest_shards.progress = Math.min(
        quests.quest_shards.target,
        quests.quest_shards.progress + 1,
      );
      get().addMessage(
        `Resonance Shard recovered (${quests.quest_shards.progress}/${quests.quest_shards.target}).`,
        "quest",
      );
      if (quests.quest_shards.progress >= quests.quest_shards.target) {
        quests.quest_shards.status = "completed";
        sfxQuestComplete();
        get().addMessage(
          "Quest complete: Resonance Fragments! Return to Lyra.",
          "quest",
        );
        questCompleted = true;
        questName = "Resonance Fragments";
      }
    }
    if (questCompleted) {
      const s2 = get();
      set({
        quests,
        runStats: bumpAction({ ...s2.runStats, questsCompleted: s2.runStats.questsCompleted + 1 }, "complete quest"),
        runEvents: [...s2.runEvents, { turn: state.turnCount, text: `Completed quest: ${questName}`, type: "quest" as const }],
      });
    } else {
      set({ quests });
    }

    logAction(get, set, `pickup ${item.name}`);
    advanceCustomQuests(get, set, `picked up ${item.name}`);
    autoEquipBest(get, set);
    updateContext(get, set);
  },

  useItem(itemId: string) {
    const state = get();
    const inventory = [...state.player.inventory];
    const slotIdx = inventory.findIndex((s) => s.item.id === itemId);
    if (slotIdx === -1) return;

    const slot = inventory[slotIdx];
    const { item } = slot;

    if (item.effect && (item.type === "potion" || item.type === "food")) {
      const stats = { ...state.player.stats };
      const isHeal = item.effect.stat === "health";
      if (isHeal) {
        stats.health = Math.min(stats.maxHealth, stats.health + item.effect.amount);
      }
      slot.quantity -= 1;
      if (slot.quantity <= 0) inventory.splice(slotIdx, 1);

      let useRunStats = bumpAction({ ...state.runStats, itemsUsed: state.runStats.itemsUsed + 1 }, "use item");
      if (isHeal) useRunStats = { ...useRunStats, healsUsed: useRunStats.healsUsed + 1 };
      set({ player: { ...state.player, stats, inventory }, runStats: useRunStats });
      sfxUseItem();
      addFloatingText(state.player.position.x * 32 + 16, state.player.position.y * 32, `+${item.effect.amount}`, "#4ade80");
      logAction(get, set, `use ${item.name}`);
      get().addMessage(`Used ${item.name}. +${item.effect.amount} ${item.effect.stat}.`, "info");
    }
    updateContext(get, set);
  },

  equipItem(itemId: string) {
    const state = get();
    const inventory = [...state.player.inventory];
    const slot = inventory.find((s) => s.item.id === itemId);
    if (!slot || (slot.item.type !== "weapon" && slot.item.type !== "armor")) return;

    inventory.forEach((s) => {
      if (s.item.type === slot.item.type && s.equipped) s.equipped = false;
    });
    slot.equipped = true;

    const stats = { ...state.player.stats };
    if (slot.item.effect) {
      if (slot.item.effect.stat === "attack") stats.attack = 5 + slot.item.effect.amount;
      if (slot.item.effect.stat === "defense") stats.defense = 3 + slot.item.effect.amount;
    }

    set({ player: { ...state.player, stats, inventory } });
    get().addMessage(`Equipped ${slot.item.name}.`, "info");
  },

  dropItem(itemId: string) {
    const state = get();
    const inventory = [...state.player.inventory];
    const slotIdx = inventory.findIndex((s) => s.item.id === itemId);
    if (slotIdx === -1) return;

    const slot = inventory[slotIdx];
    const room = { ...state.rooms[state.currentRoomId] };
    room.items = [
      ...room.items,
      { item: slot.item, position: { ...state.player.position } },
    ];
    inventory.splice(slotIdx, 1);

    set({
      player: { ...state.player, inventory },
      rooms: { ...state.rooms, [state.currentRoomId]: room },
    });
    get().addMessage(`Dropped ${slot.item.name}.`, "info");
    updateContext(get, set);
  },

  attackTarget() {
    const state = get();
    const target = state.combatTarget;
    if (!target) return;

    const room = state.rooms[state.currentRoomId];
    if (!room) return;

    const playerAtk = state.player.stats.attack;
    const playerDef = state.player.stats.defense;
    const dmgToEnemy = Math.max(1, playerAtk - target.defense);
    target.health -= dmgToEnemy;

    sfxHit();
    addFloatingText(target.position.x * 32 + 16, target.position.y * 32, `-${dmgToEnemy}`, "#ef4444");
    logAction(get, set, `attack ${target.name} for ${dmgToEnemy} dmg`);
    get().addMessage(
      `You hit ${target.name} for ${dmgToEnemy} damage!`,
      "combat",
    );

    const atkRunStats = bumpAction({ ...state.runStats, attacks: state.runStats.attacks + 1, damageDealt: state.runStats.damageDealt + dmgToEnemy }, "attack");
    const atkRunEvents = [...state.runEvents];

    if (target.health <= 0) {
      sfxEnemyDeath();
      get().addMessage(`${target.name} defeated!`, "combat");

      room.npcs = room.npcs.filter((n) => n.id !== target.id);

      let goldFromLoot = 0;
      if (target.loot) {
        for (const lootItem of target.loot) {
          room.items.push({
            item: lootItem,
            position: { ...target.position },
          });
          get().addMessage(`${target.name} dropped ${lootItem.name}.`, "loot");
          if (lootItem.type === "treasure") goldFromLoot += lootItem.value;
        }
      }

      atkRunStats.enemiesKilled += 1;
      atkRunStats.goldEarned += goldFromLoot;
      atkRunEvents.push({ turn: state.turnCount, text: `Killed ${target.name}`, type: "combat" });

      const xpGain = 15 + target.maxHealth;
      addFloatingText(target.position.x * 32 + 16, target.position.y * 32, `+${xpGain} XP`, "#a78bfa");
      const stats = { ...state.player.stats };
      stats.xp += xpGain;
      get().addMessage(`Gained ${xpGain} XP.`, "info");

      if (stats.xp >= stats.xpToNext) {
        stats.level += 1;
        stats.xp -= stats.xpToNext;
        stats.xpToNext = Math.floor(stats.xpToNext * 1.5);
        stats.maxHealth += 10;
        stats.health = stats.maxHealth;
        stats.attack += 2;
        stats.defense += 1;
        sfxLevelUp();
        get().addMessage(`Level up! You are now level ${stats.level}!`, "system");
      }

      const quests = { ...state.quests };
      let ratQuestCompleted = false;
      if (target.name === "Giant Rat") {
        const q = quests.quest_rats;
        if (q && q.status === "active") {
          q.progress += 1;
          if (q.progress >= q.target) {
            q.status = "completed";
            sfxQuestComplete();
            get().addMessage("Quest complete: Rat Infestation! Return to the guard.", "quest");
            ratQuestCompleted = true;
          }
        }
      }
      if (target.id === "npc_conductor") {
        const q = quests.quest_conductor;
        if (q && q.status === "active") {
          q.progress = 1;
          q.status = "completed";
          sfxQuestComplete();
          get().addMessage("Quest complete: Final Movement! The Veil begins to heal.", "quest");
          atkRunStats.questsCompleted += 1;
          atkRunEvents.push({ turn: state.turnCount, text: "Completed quest: Final Movement", type: "quest" });
        }
        set({
          victory: true,
          runEvents: [...atkRunEvents, { turn: state.turnCount, text: "The Conductor falls — World 2 cleared", type: "quest" as const }],
        });
      }

      if (ratQuestCompleted) {
        atkRunStats.questsCompleted += 1;
        atkRunEvents.push({ turn: state.turnCount, text: `Completed quest: Rat Infestation`, type: "quest" });
      }

      set({
        rooms: { ...state.rooms, [state.currentRoomId]: room },
        player: { ...state.player, stats },
        combatTarget: null,
        quests,
        runStats: atkRunStats,
        runEvents: atkRunEvents,
      });
      advanceCustomQuests(get, set, `killed ${target.name}`);
    } else {
      const dmgToPlayer = Math.max(1, target.attack - playerDef);
      const stats = { ...state.player.stats };
      stats.health -= dmgToPlayer;

      atkRunStats.damageTaken += dmgToPlayer;

      sfxPlayerHurt();
      addFloatingText(state.player.position.x * 32 + 16, state.player.position.y * 32, `-${dmgToPlayer}`, "#f97316");
      triggerShake(6, 12);
      get().addMessage(
        `${target.name} hits you for ${dmgToPlayer} damage!`,
        "danger",
      );

      if (stats.health <= 0) {
        stats.health = 0;
        atkRunEvents.push({ turn: state.turnCount, text: `Killed by ${target.name}`, type: "death" });
        set({
          player: { ...state.player, stats },
          gameOver: true,
          combatTarget: null,
          runStats: atkRunStats,
          runEvents: atkRunEvents,
        });
        sfxDeath();
        triggerShake(12, 30);
        get().addMessage("You have been defeated...", "danger");
        return;
      }

      set({
        player: { ...state.player, stats },
        combatTarget: target,
        runStats: atkRunStats,
        runEvents: atkRunEvents,
      });

      if (target.name.includes("Spider") && Math.random() < 0.3) {
        get().addStatusEffect({ id: "poison", name: "Poisoned", icon: "☠", color: "#65a30d", turnsRemaining: 5, damagePerTurn: 2 });
        get().addMessage("You've been poisoned!", "danger");
      }

      autoHealIfLow(get, set);
    }
    updateContext(get, set);
  },

  talkToNpc() {
    const state = get();
    const room = state.rooms[state.currentRoomId];
    if (!room) return;

    const { position } = state.player;
    const nearbyNpc = room.npcs.find(
      (n) => dist(position, n.position) <= 1 && n.type !== "hostile",
    );
    if (!nearbyNpc) return;

    lastTalkedNpcId = nearbyNpc.id;
    lastTalkedTurn = state.turnCount;

    const line =
      nearbyNpc.dialogue[
        Math.floor(Math.random() * nearbyNpc.dialogue.length)
      ];
    sfxTalk();
    logAction(get, set, `talk to ${nearbyNpc.name}`);
    set({ runStats: bumpAction({ ...get().runStats, npcsTalkedTo: get().runStats.npcsTalkedTo + 1 }, "talk") });
    get().addMessage(`${nearbyNpc.name}: "${line}"`, "info");

    if (nearbyNpc.id === "npc_elena" && state.quests.quest_rescue?.status === "active") {
      const quests = { ...state.quests };
      quests.quest_rescue.progress = 1;
      quests.quest_rescue.status = "completed";
      sfxQuestComplete();
      get().addMessage("Quest complete: No One Left Behind! Elena is safe.", "quest");
      set({ quests });
    }

    if (nearbyNpc.type === "merchant") {
      set({ tradeOpen: true, tradeNpc: nearbyNpc });
    }

    if (nearbyNpc.id === "npc_ghost") {
      const hasCryptKey = state.player.inventory.some((s) => s.item.id === "crypt_key");
      if (hasCryptKey) {
        if (!state.worldOneComplete) {
          get().addMessage(
            "The piano begins to play... A rift opens beneath the crypt. The Veil Gate awakens.",
            "quest",
          );
          set({
            worldOneComplete: true,
            runEvents: [
              ...get().runEvents,
              { turn: state.turnCount, text: "Completed World 1: The Nocturne restored", type: "quest" as const },
            ],
          });
        } else {
          get().addMessage("The Nocturne still echoes. The Veil Gate remains open.", "narration");
        }
      } else {
        get().addMessage(
          "The Pianist whispers: \"The melody is incomplete... bring me the Crypt Key.\"",
          "narration",
        );
      }
      updateContext(get, set);
      return;
    }

    if (nearbyNpc.questId) {
      const quest = state.quests[nearbyNpc.questId];
      if (quest?.status === "available") {
        get().addMessage(
          `${nearbyNpc.name} offers a quest: ${quest.name}`,
          "quest",
        );
      } else if (quest?.status === "completed") {
        const stats = { ...state.player.stats };
        stats.xp += quest.reward.xp;
        stats.gold += quest.reward.gold;
        quest.status = "rewarded";
        get().addMessage(
          `Quest rewarded! +${quest.reward.xp} XP, +${quest.reward.gold} Gold`,
          "quest",
        );
        const s2 = get();
        set({
          player: { ...state.player, stats },
          quests: { ...state.quests, [quest.id]: quest },
          runStats: { ...s2.runStats, goldEarned: s2.runStats.goldEarned + quest.reward.gold },
        });
      }
    }
    updateContext(get, set);
  },

  acceptQuest(questId: string) {
    const state = get();
    const quests = { ...state.quests };
    const quest = quests[questId];
    if (!quest || quest.status !== "available") return;

    quest.status = "active";
    set({
      quests,
      runStats: bumpAction({ ...state.runStats, questsAccepted: state.runStats.questsAccepted + 1 }, "accept quest"),
      runEvents: [...state.runEvents, { turn: state.turnCount, text: `Accepted quest: ${quest.name}`, type: "quest" as const }],
    });
    sfxQuestAccept();
    logAction(get, set, `accept quest: ${quest.name}`);
    get().addMessage(`Quest accepted: ${quest.name}`, "quest");

    if (!state.activePanels.includes("quests")) {
      set({ activePanels: [...get().activePanels, "quests"] });
    }
    updateContext(get, set);
  },

  openTrade(npc: NPCDef) {
    set({ tradeOpen: true, tradeNpc: npc });
  },

  closeTrade() {
    set({ tradeOpen: false, tradeNpc: null });
  },

  buyItem(itemId: string) {
    const state = get();
    const itemDef = ITEMS[itemId];
    if (!itemDef) return;
    const price = itemDef.value;
    if (state.player.stats.gold < price) {
      get().addMessage("Not enough gold.", "system");
      return;
    }
    const stats = { ...state.player.stats, gold: state.player.stats.gold - price };
    const inventory = [...state.player.inventory];
    const existingSlot = inventory.find((s) => s.item.id === itemId && itemDef.stackable);
    if (existingSlot) {
      existingSlot.quantity += 1;
    } else {
      inventory.push({ item: { ...itemDef }, quantity: 1, equipped: false });
    }
    set({ player: { ...state.player, stats, inventory }, runStats: bumpAction(state.runStats, "buy") });
    get().addMessage(`Bought ${itemDef.name} for ${price}g.`, "loot");
  },

  sellItem(itemId: string) {
    const state = get();
    const inventory = [...state.player.inventory];
    const slotIdx = inventory.findIndex((s) => s.item.id === itemId);
    if (slotIdx === -1) return;
    const slot = inventory[slotIdx];
    const sellPrice = Math.floor(slot.item.value / 2);
    const stats = { ...state.player.stats, gold: state.player.stats.gold + sellPrice };
    if (slot.quantity > 1) {
      inventory[slotIdx] = { ...slot, quantity: slot.quantity - 1 };
    } else {
      inventory.splice(slotIdx, 1);
    }
    set({ player: { ...state.player, stats, inventory }, runStats: bumpAction(state.runStats, "sell") });
    get().addMessage(`Sold ${slot.item.name} for ${sellPrice}g.`, "loot");
  },

  togglePanel(panel: HudPanel) {
    const state = get();
    const panels = state.activePanels.includes(panel)
      ? state.activePanels.filter((p) => p !== panel)
      : [...state.activePanels, panel];
    set({ activePanels: panels });
  },

  setCommandOpen(open: boolean) {
    set({ commandOpen: open });
  },

  executePredicted() {
    const { predictedAction } = get();
    if (predictedAction) {
      sfxTabComplete();
      predictedAction.action();
      set({ predictedAction: null });
    }
  },

  addMessage(text: string, type: GameMessage["type"]) {
    const state = get();
    const msg: GameMessage = {
      id: `msg_${++msgId}`,
      text,
      type,
      timestamp: Date.now(),
    };
    set({ messages: [...state.messages.slice(-50), msg] });
  },

  processCommand(command: string) {
    const s = get();
    const cmd = command.toLowerCase().trim();

    if (cmd === "heal" || cmd === "use potion") {
      const potion = s.player.inventory.find(
        (sl) => sl.item.type === "potion" && sl.quantity > 0,
      );
      if (potion) {
        s.useItem(potion.item.id);
      } else {
        s.addMessage("You have no potions.", "system");
      }
    } else if (cmd.startsWith("show ")) {
      const panel = cmd.replace("show ", "") as HudPanel;
      if (["inventory", "stats", "quests", "map", "log"].includes(panel)) {
        if (!s.activePanels.includes(panel)) {
          set({ activePanels: [...s.activePanels, panel] });
          s.addMessage(`Showing ${panel} panel.`, "system");
        }
      }
    } else if (cmd.startsWith("hide ")) {
      const panel = cmd.replace("hide ", "") as HudPanel;
      set({ activePanels: s.activePanels.filter((p) => p !== panel) });
      s.addMessage(`Hid ${panel} panel.`, "system");
    } else if (cmd === "help") {
      s.addMessage(
        "Commands: heal, show/hide [panel], help, look, stats, autopilot, autopilot speed <ms>",
        "system",
      );
    } else if (cmd === "look") {
      const room = s.rooms[s.currentRoomId];
      s.addMessage(`You are in ${room.name}.`, "info");
      if (room.npcs.length > 0) {
        s.addMessage(
          `You see: ${room.npcs.map((n) => n.name).join(", ")}`,
          "info",
        );
      }
    } else if (cmd === "stats") {
      if (!s.activePanels.includes("stats")) {
        set({ activePanels: [...s.activePanels, "stats"] });
      }
    } else if (cmd.startsWith("autopilot speed")) {
      const speedArg = cmd.replace("autopilot speed", "").trim();
      const speed = parseInt(speedArg, 10);
      if (speedArg.length === 0 || isNaN(speed)) {
        s.addMessage(
          `Usage: autopilot speed <${MIN_AUTOPILOT_STEP_INTERVAL_MS}-${MAX_AUTOPILOT_STEP_INTERVAL_MS} ms>`,
          "system",
        );
      } else {
        const clamped = clampAutopilotStepIntervalMs(speed);
        s.setAutopilotStepIntervalMs(speed);
        if (clamped !== speed) {
          s.addMessage(
            `Autopilot speed clamped to ${clamped}ms (${MIN_AUTOPILOT_STEP_INTERVAL_MS}-${MAX_AUTOPILOT_STEP_INTERVAL_MS}ms).`,
            "system",
          );
        } else {
          s.addMessage(`Autopilot speed set to ${clamped}ms per step.`, "system");
        }
      }
    } else if (cmd === "autopilot") {
      s.toggleAutopilot();
    } else if (cmd.startsWith("seed ")) {
      const seedCode = cmd.replace("seed ", "").trim();
      const seedVal = parseSeed(seedCode);
      if (seedVal !== null) {
        s.newGame(seedVal);
      } else {
        s.addMessage(`Usage: seed <${SEED_LENGTH} uppercase letters>`, "system");
      }
    } else if (cmd === "new game" || cmd === "restart") {
      s.newGame();
    } else if (cmd === "seed") {
      s.addMessage(`Current seed: ${formatSeed(s.seed)}`, "system");
    } else if (cmd === "save") {
      s.saveGame();
    } else if (cmd === "load") {
      s.loadGame();
    } else if (cmd === "delete save") {
      s.deleteSave();
    } else if (cmd === "planner" || cmd === "smart") {
      s.toggleSmartPlanner();
    } else if (cmd === "replan") {
      s.requestReplan();
    } else if (cmd === "hint") {
      s.requestHint();
    } else if (cmd.startsWith("quest ") || cmd.startsWith("goal ")) {
      const desc = command.replace(/^(quest|goal)\s+/i, "").trim();
      if (desc) {
        s.createCustomQuest(desc);
      } else {
        s.addMessage("Usage: quest <description> or goal <description>", "system");
      }
    } else {
      s.addMessage(`Unknown command: "${command}"`, "system");
    }

    set({ commandOpen: false });
  },

  toggleAutopilot() {
    const current = get().autopilot;
    set({ autopilot: !current });
    get().addMessage(
      current ? "Autopilot disengaged." : "Autopilot engaged. Hold Tab to watch.",
      "system",
    );
  },

  setAutopilotStepIntervalMs(ms: number) {
    set({ autopilotStepIntervalMs: clampAutopilotStepIntervalMs(ms) });
  },

  newGame(seed?: number) {
    const s = seed ?? generateSeed();
    msgId = 0;
    recentPositions.length = 0;
    lastEnteredFromRoomId = null;
    turnEnteredRoom = 0;
    resetRoomMemory();
    set({
      player: {
        position: { x: 8, y: 5 },
        stats: {
          health: 40, maxHealth: 40, attack: 5, defense: 3, speed: 5,
          level: 1, xp: 0, xpToNext: 100, gold: 20,
        },
        inventory: [],
        facing: "down",
      },
      currentRoomId: "village",
      rooms: cloneRooms(s),
      quests: cloneQuests(),
      messages: [{
        id: `msg_${++msgId}`,
        text: `Seed: ${formatSeed(s)}. You arrive at Ashford Village.`,
        type: "system",
        timestamp: Date.now(),
      }],
      contextActions: [],
      predictedAction: null,
      activePanels: ["log"],
      commandOpen: false,
      gameOver: false,
      victory: false,
      worldIndex: 1,
      worldOneComplete: false,
      turnCount: 0,
      combatTarget: null,
      tradeOpen: false,
      tradeNpc: null,
      autopilot: false,
      autopilotStepIntervalMs: get().autopilotStepIntervalMs,
      seed: s,
      smartPlanner: false,
      smartPlan: null,
      plannerLoading: false,
      menuOpen: false,
      recentMoves: [],
      runStats: { ...emptyRunStats },
      runEvents: [],
      statusEffects: [],
      hint: null,
      hintLoading: false,
    });
  },

  setMenuOpen(open: boolean) {
    set({ menuOpen: open });
  },

  saveGame() {
    saveGameToStorage(get());
    get().addMessage("Game saved.", "system");
  },

  loadGame() {
    const data = loadGameFromStorage();
    if (!data) {
      get().addMessage("No save found.", "system");
      return;
    }
    set({
      player: data.player,
      currentRoomId: data.currentRoomId,
      rooms: data.rooms,
      quests: data.quests,
      messages: data.messages,
      turnCount: data.turnCount,
      seed: data.seed,
      activePanels: data.activePanels,
      gameOver: data.gameOver,
      worldIndex: data.worldIndex ?? (data.currentRoomId.startsWith("world2_") ? 2 : 1),
      worldOneComplete: data.worldOneComplete ?? data.currentRoomId.startsWith("world2_"),
      autopilotStepIntervalMs:
        data.autopilotStepIntervalMs ?? DEFAULT_AUTOPILOT_STEP_INTERVAL_MS,
      combatTarget: null,
      contextActions: [],
      predictedAction: null,
      runStats: data.runStats ?? { ...emptyRunStats },
      runEvents: data.runEvents ?? [],
    });
    get().addMessage("Game loaded.", "system");
    updateVisibility(get);
    updateContext(get, set);
  },

  addStatusEffect(effect: StatusEffect) {
    const effects = [...get().statusEffects];
    const existing = effects.findIndex((e) => e.id === effect.id);
    if (existing !== -1) {
      effects[existing] = { ...effect, turnsRemaining: Math.max(effects[existing].turnsRemaining, effect.turnsRemaining) };
    } else {
      effects.push(effect);
    }
    set({ statusEffects: effects });
  },

  deleteSave() {
    deleteSaveFromStorage();
    get().addMessage("Save deleted.", "system");
  },

  getAutopilotAction() {
    const state = get();
    if (state.gameOver || state.victory) return null;

    if (state.tradeOpen) {
      return () => autoTrade(get, set);
    }

    if (state.smartPlanner && state.smartPlan && !state.plannerLoading) {
      const smartAction = get().getSmartAction();
      if (smartAction) return smartAction;
    }

    const room = state.rooms[state.currentRoomId];
    if (!room) return null;
    const { position, stats, inventory } = state.player;

    // Priority 1: If in combat, attack
    if (state.combatTarget) {
      return () => get().attackTarget();
    }

    // Priority 2: Heal if low health and have a potion
    if (stats.health < stats.maxHealth * 0.4) {
      const potion = inventory.find(
        (s) => (s.item.type === "potion" || s.item.type === "food") && s.quantity > 0,
      );
      if (potion) {
        return () => get().useItem(potion.item.id);
      }
    }

    // Priority 3: Pick up item on current tile
    const itemHere = room.items.find(
      (i) => i.position.x === position.x && i.position.y === position.y,
    );
    if (itemHere) {
      return () => get().pickUpItem();
    }

    // Priority 3.5: Move toward nearby equipment upgrades or useful items
    const upgradeItem = findBestNearbyItem(room, position, inventory);
    if (upgradeItem) {
      const dir = chooseDirectionToward(state, room, position, upgradeItem.position);
      if (dir) {
        return () => get().move(dir);
      }
    }

    // Priority 4: Accept available quest from nearby NPC
    const nearbyFriendly = room.npcs.find(
      (n) => dist(position, n.position) <= 1 && n.type !== "hostile",
    );
    if (nearbyFriendly?.questId) {
      const quest = state.quests[nearbyFriendly.questId];
      if (quest?.status === "available") {
        return () => {
          get().talkToNpc();
          get().acceptQuest(quest.id);
        };
      }
    }

    // Priority 5: Talk to nearby friendly NPC (only occasionally, skip if we just talked to them)
    if (
      nearbyFriendly &&
      state.turnCount % 8 === 0 &&
      !(nearbyFriendly.id === lastTalkedNpcId && state.turnCount - lastTalkedTurn < 15)
    ) {
      return () => get().talkToNpc();
    }

    // Priority 6: Move toward a goal
    const moveDir = chooseDirection(state, room, position);
    if (moveDir) {
      return () => get().move(moveDir);
    }

    // Fallback: random walkable direction, preferring unvisited tiles
    const dirs: Direction[] = ["up", "down", "left", "right"];
    const shuffled = dirs.sort(() => Math.random() - 0.5);
    const delta: Record<Direction, Position> = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    };
    const validFallbacks: Direction[] = [];
    for (const dir of shuffled) {
      const d = delta[dir];
      const nx = position.x + d.x;
      const ny = position.y + d.y;
      if (nx < 0 || ny < 0 || nx >= room.width || ny >= room.height) continue;
      const tile = room.tiles[ny][nx];
      if (!tile.walkable) continue;
      const blocked = room.npcs.find(
        (n) => n.position.x === nx && n.position.y === ny && n.blocking && n.type !== "hostile",
      );
      if (blocked) continue;
      validFallbacks.push(dir);
    }
    if (validFallbacks.length > 0) {
      const fresh = validFallbacks.filter((dir) => {
        const d = delta[dir];
        return !recentPositions.some(
          (p) => p.x === position.x + d.x && p.y === position.y + d.y,
        );
      });
      const pick = fresh.length > 0 ? fresh[0] : validFallbacks[0];
      return () => get().move(pick);
    }

    return null;
  },

  toggleSmartPlanner() {
    const current = get().smartPlanner;
    set({ smartPlanner: !current });
    if (current) resetPathFollowTracking();
    get().addMessage(
      current
        ? "Smart Planner disengaged."
        : "Smart Planner engaged. GPT will plan every 100 turns.",
      "system",
    );
    if (!current) {
      const state = get();
      if (!state.activePanels.includes("plan")) {
        set({ activePanels: [...state.activePanels, "plan"] });
      }
      get().requestReplan();
    }
  },

  requestReplan(stuckReason?: string) {
    const state = get();
    if (state.plannerLoading) return;
    set({ plannerLoading: true });
    get().addMessage(
      stuckReason ? `Smart Planner: stuck detected — replanning...` : "Smart Planner: thinking...",
      "system",
    );

    generatePlan({
      player: state.player,
      currentRoomId: state.currentRoomId,
      rooms: state.rooms,
      quests: state.quests,
      recentMoves: state.recentMoves,
      turnCount: state.turnCount,
      combatTarget: state.combatTarget,
      worldIndex: state.worldIndex,
      worldOneComplete: state.worldOneComplete,
      stuckReason,
      previousPlan: state.smartPlan ?? undefined,
    })
      .then((plan) => {
        resetPathFollowTracking();
        set({ smartPlan: plan, plannerLoading: false });
        const s = useGameStore.getState();
        s.addMessage(`Plan: ${plan.summary}`, "system");
        if (!s.activePanels.includes("plan")) {
          set({ activePanels: [...s.activePanels, "plan"] });
        }
      })
      .catch((err) => {
        set({ plannerLoading: false });
        get().addMessage(`Planner error: ${(err as Error).message}`, "danger");
      });
  },

  getSmartAction() {
    const state = get();
    const plan = state.smartPlan;
    if (!plan || plan.steps.length === 0) return null;

    const stepIndex = plan.steps.findIndex((s) => !s.done);
    if (stepIndex === -1) return null;
    const currentStep = plan.steps[stepIndex];

    const room = state.rooms[state.currentRoomId];
    if (!room) return null;
    const { position } = state.player;

    const markDone = () => {
      const p = get().smartPlan;
      if (p) {
        const updated = {
          ...p,
          steps: p.steps.map((s, i) => (i === stepIndex ? { ...s, done: true } : s)),
        };
        set({ smartPlan: updated });
        resetPathFollowTracking();
      }
    };

    const targetRoomId = currentStep.room ?? state.currentRoomId;
    const targetLocation = currentStep.location;
    const roomReached = state.currentRoomId === targetRoomId;
    const locationReached = !targetLocation
      || (position.x === targetLocation.x && position.y === targetLocation.y);
    const isNavigatingToGoal = !!(currentStep.room || currentStep.location) && !(roomReached && locationReached);

    if (isNavigatingToGoal) {
      const goalKey = `${plan.generatedAtTurn}:${stepIndex}:${targetRoomId}:${targetLocation ? `${targetLocation.x},${targetLocation.y}` : "-"}`;
      if (activePathGoalKey !== goalKey) {
        activePathGoalKey = goalKey;
        activePathGoalStartTurn = state.turnCount;
      } else if (state.turnCount - activePathGoalStartTurn >= PATH_FOLLOW_TIMEOUT_TURNS) {
        const where = targetLocation
          ? `(${targetLocation.x},${targetLocation.y}) in ${targetRoomId}`
          : `room ${targetRoomId}`;
        resetPathFollowTracking();
        get().requestReplan(
          `Path timeout: unable to reach ${where} after ${PATH_FOLLOW_TIMEOUT_TURNS} turns.`,
        );
        return null;
      }

      if (!roomReached) {
        const nextHopRoomId = findNextRoomHop(
          state.currentRoomId,
          targetRoomId,
          state,
        );
        if (nextHopRoomId) {
          const exit = room.exits.find((e) => e.targetRoomId === nextHopRoomId);
          if (exit) {
            const dir = chooseDirectionToward(state, room, position, exit.position);
            return dir ? () => get().move(dir) : null;
          }
        }
        return null;
      }

      if (targetLocation) {
        const dir = chooseDirectionToward(state, room, position, targetLocation);
        return dir ? () => get().move(dir) : null;
      }
    } else if (activePathGoalKey) {
      resetPathFollowTracking();
    }

    switch (currentStep.action) {
      case "attack": {
        if (state.combatTarget) {
          return () => get().attackTarget();
        }
        const target = room.npcs.find(
          (n) => n.type === "hostile" && (!currentStep.target || n.name.toLowerCase().includes(currentStep.target.toLowerCase())),
        );
        if (target) {
          const d = dist(position, target.position);
          if (d <= 1) {
            set({ combatTarget: target });
            return () => get().attackTarget();
          }
          const dir = chooseDirection(state, room, position);
          return dir ? () => get().move(dir) : null;
        }
        markDone();
        return null;
      }

      case "pickup": {
        const item = room.items.find(
          (i) => !currentStep.target || i.item.name.toLowerCase().includes(currentStep.target.toLowerCase()),
        );
        if (item) {
          if (item.position.x === position.x && item.position.y === position.y) {
            return () => { get().pickUpItem(); markDone(); };
          }
          const dir = chooseDirectionToward(state, room, position, item.position);
          return dir ? () => get().move(dir) : null;
        }
        markDone();
        return null;
      }

      case "talk": {
        const npc = room.npcs.find(
          (n) => n.type !== "hostile" && (!currentStep.target || n.name.toLowerCase().includes(currentStep.target.toLowerCase())),
        );
        if (npc) {
          if (dist(position, npc.position) <= 1) {
            return () => { get().talkToNpc(); markDone(); };
          }
          const dir = chooseDirectionToward(state, room, position, npc.position);
          return dir ? () => get().move(dir) : null;
        }
        markDone();
        return null;
      }

      case "quest": {
        const npc = room.npcs.find(
          (n) => n.questId && n.type !== "hostile",
        );
        if (npc?.questId) {
          const quest = state.quests[npc.questId];
          if (quest?.status === "available") {
            if (dist(position, npc.position) <= 1) {
              return () => { get().talkToNpc(); get().acceptQuest(quest.id); markDone(); };
            }
            const dir = chooseDirectionToward(state, room, position, npc.position);
            return dir ? () => get().move(dir) : null;
          }
        }
        markDone();
        return null;
      }

      case "use_item": {
        const slot = state.player.inventory.find(
          (s) => !currentStep.target || s.item.name.toLowerCase().includes(currentStep.target.toLowerCase()),
        );
        if (slot) {
          return () => { get().useItem(slot.item.id); markDone(); };
        }
        markDone();
        return null;
      }

      case "move":
      case "explore": {
        markDone();
        return null;
      }

      default:
        markDone();
        return null;
    }
  },

  requestHint() {
    const state = get();
    if (state.hintLoading) return;
    set({ hintLoading: true, hint: null });

    const room = state.rooms[state.currentRoomId];
    generateHint({
      currentRoomId: state.currentRoomId,
      room,
      player: state.player,
      quests: state.quests,
      turnCount: state.turnCount,
    })
      .then((hint) => {
        set({ hint, hintLoading: false });
        setTimeout(() => {
          const cur = useGameStore.getState();
          if (cur.hint === hint) set({ hint: null });
        }, 8000);
      })
      .catch(() => {
        set({ hint: "Explore carefully.", hintLoading: false });
      });
  },

  createCustomQuest(description: string) {
    const state = get();
    get().addMessage(`Creating quest: "${description}"...`, "system");

    generateCustomQuest(description, {
      rooms: state.rooms,
      player: state.player,
      currentRoomId: state.currentRoomId,
    })
      .then((quest) => {
        const quests = { ...useGameStore.getState().quests, [quest.id]: quest };
        set({ quests });
        get().addMessage(`Quest created: ${quest.name} — ${quest.objective}`, "quest");
        sfxQuestAccept();
        if (!useGameStore.getState().activePanels.includes("quests")) {
          set({ activePanels: [...useGameStore.getState().activePanels, "quests"] });
        }
      })
      .catch(() => {
        get().addMessage("Failed to create quest.", "danger");
      });
  },
}));

function checkAdaptiveDifficulty(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  turn: number,
) {
  if (turn % 30 !== 0 || turn === 0) return;

  const state = get();
  const assessment = evaluateDifficulty(state.runStats, turn, state.player);
  if (assessment === "balanced") return;

  const room = state.rooms[state.currentRoomId];
  generateAdaptation(assessment, {
    roomName: room.name,
    playerHealth: state.player.stats.health,
    playerMaxHealth: state.player.stats.maxHealth,
    playerLevel: state.player.stats.level,
    enemyCount: room.npcs.filter((n) => n.type === "hostile").length,
    turnCount: turn,
  }).then((result) => {
    const s = useGameStore.getState();
    get().addMessage(result.narration, "narration");

    for (const action of result.actions) {
      switch (action.type) {
        case "heal_player": {
          const amt = action.amount ?? 10;
          const stats = { ...s.player.stats };
          stats.health = Math.min(stats.maxHealth, stats.health + amt);
          set({ player: { ...s.player, stats } });
          break;
        }
        case "add_gold": {
          const amt = action.amount ?? 15;
          const stats = { ...s.player.stats, gold: s.player.stats.gold + amt };
          set({ player: { ...s.player, stats } });
          break;
        }
        case "spawn_item": {
          const itemId = action.itemId || "health_potion";
          const item = ITEMS[itemId];
          if (item) {
            const curRoom = s.rooms[s.currentRoomId];
            const pos = { x: s.player.position.x, y: s.player.position.y + 1 };
            curRoom.items.push({ item, position: pos });
            set({ rooms: { ...s.rooms, [s.currentRoomId]: curRoom } });
          }
          break;
        }
        case "buff_enemy": {
          const amt = action.amount ?? 2;
          for (const roomData of Object.values(s.rooms)) {
            if (roomData.id === s.currentRoomId) continue;
            for (const npc of roomData.npcs) {
              if (npc.type === "hostile") {
                npc.attack += amt;
                npc.defense += Math.floor(amt / 2);
              }
            }
          }
          break;
        }
      }
    }
  });
}

function advanceCustomQuests(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  eventText: string,
) {
  const state = get();
  const quests = { ...state.quests };
  let changed = false;

  for (const quest of Object.values(quests)) {
    if (quest.status !== "active") continue;
    if (!quest.id.startsWith("quest_custom_")) continue;

    if (checkCustomQuestProgress(quest, eventText)) {
      quest.progress = Math.min(quest.target, quest.progress + 1);
      changed = true;

      if (quest.progress >= quest.target) {
        quest.status = "rewarded";
        const stats = { ...state.player.stats };
        stats.xp += quest.reward.xp;
        stats.gold += quest.reward.gold;
        set({ player: { ...state.player, stats } });
        get().addMessage(
          `Custom quest complete: ${quest.name}! +${quest.reward.xp} XP, +${quest.reward.gold}g`,
          "quest",
        );
        sfxQuestComplete();
      }
    }
  }

  if (changed) set({ quests });
}

const MERCHANT_STOCK = [
  "health_potion",
  "greater_health_potion",
  "bread",
  "iron_sword",
  "leather_vest",
  "torch",
  "scroll_fireball",
];

function autoTrade(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
) {
  const state = get();
  const { stats, inventory } = state.player;

  const sellableTypes = new Set(["treasure", "food"]);
  const junk = inventory.find(
    (s) =>
      !s.equipped &&
      (sellableTypes.has(s.item.type) ||
        (s.item.type === "key" && s.item.id === "torch" && s.quantity > 1)),
  );
  if (junk) {
    get().sellItem(junk.item.id);
    return;
  }

  const hasPotion = inventory.some(
    (s) => s.item.type === "potion" && s.quantity > 0,
  );
  const potionCount = inventory
    .filter((s) => s.item.type === "potion")
    .reduce((sum, s) => sum + s.quantity, 0);

  if (potionCount < 3 && stats.gold >= 25) {
    const potionId =
      stats.gold >= 60 ? "greater_health_potion" : "health_potion";
    get().buyItem(potionId);
    return;
  }

  const equippedWeapon = inventory.find(
    (s) => s.item.type === "weapon" && s.equipped,
  );
  const equippedArmor = inventory.find(
    (s) => s.item.type === "armor" && s.equipped,
  );

  const weaponAtk = equippedWeapon?.item.effect?.amount ?? 0;
  const armorDef = equippedArmor?.item.effect?.amount ?? 0;

  for (const stockId of MERCHANT_STOCK) {
    const item = ITEMS[stockId];
    if (!item || stats.gold < item.value) continue;
    if (
      item.type === "weapon" &&
      item.effect &&
      item.effect.amount > weaponAtk
    ) {
      get().buyItem(stockId);
      return;
    }
    if (
      item.type === "armor" &&
      item.effect &&
      item.effect.amount > armorDef
    ) {
      get().buyItem(stockId);
      return;
    }
  }

  get().closeTrade();
}

function moveNpcs(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
) {
  const state = get();
  const room = state.rooms[state.currentRoomId];
  if (!room) return;

  const playerPos = state.player.position;

  for (const npc of room.npcs) {
    const tile = room.tiles[npc.position.y]?.[npc.position.x];
    if (!tile?.visible) continue;

    if (npc.type === "hostile") {
      const dx = playerPos.x - npc.position.x;
      const dy = playerPos.y - npc.position.y;
      const d = Math.abs(dx) + Math.abs(dy);

      if (d <= 1) continue;
      if (d > 8) continue;

      let nx = npc.position.x;
      let ny = npc.position.y;
      if (Math.random() < 0.35) {
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        const pick = dirs[Math.floor(Math.random() * dirs.length)];
        nx += pick.x;
        ny += pick.y;
      } else if (Math.abs(dx) >= Math.abs(dy)) {
        nx += dx > 0 ? 1 : -1;
      } else {
        ny += dy > 0 ? 1 : -1;
      }

      if (nx >= 0 && ny >= 0 && nx < room.width && ny < room.height) {
        const targetTile = room.tiles[ny][nx];
        if (targetTile.walkable && targetTile.type === "floor") {
          const blocked = room.npcs.some(
            (other) => other.id !== npc.id && other.position.x === nx && other.position.y === ny,
          );
          if (!blocked && !(nx === playerPos.x && ny === playerPos.y)) {
            npc.position = { x: nx, y: ny };
          }
        }
      }
    } else if (npc.type === "friendly" || npc.type === "merchant") {
      if (Math.random() > 0.2) continue;

      const dirs = [
        { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      ];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = npc.position.x + dir.x;
      const ny = npc.position.y + dir.y;

      if (nx >= 0 && ny >= 0 && nx < room.width && ny < room.height) {
        const targetTile = room.tiles[ny][nx];
        if (targetTile.walkable && targetTile.type === "floor") {
          const blocked = room.npcs.some(
            (other) => other.id !== npc.id && other.position.x === nx && other.position.y === ny,
          );
          if (!blocked && !(nx === playerPos.x && ny === playerPos.y)) {
            npc.position = { x: nx, y: ny };
          }
        }
      }
    }
  }
}

function tickStatusEffects(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
) {
  const state = get();
  const effects = [...state.statusEffects];
  if (effects.length === 0) return;

  const stats = { ...state.player.stats };
  const messages: { text: string; type: GameMessage["type"] }[] = [];

  for (const effect of effects) {
    if (effect.damagePerTurn) {
      stats.health -= effect.damagePerTurn;
      messages.push({ text: `${effect.icon} ${effect.name} deals ${effect.damagePerTurn} damage!`, type: "danger" });
    }
    if (effect.healPerTurn) {
      stats.health = Math.min(stats.maxHealth, stats.health + effect.healPerTurn);
      messages.push({ text: `${effect.icon} ${effect.name} heals ${effect.healPerTurn} HP.`, type: "info" });
    }
    effect.turnsRemaining -= 1;
  }

  const expired = effects.filter((e) => e.turnsRemaining <= 0);
  const remaining = effects.filter((e) => e.turnsRemaining > 0);

  for (const e of expired) {
    messages.push({ text: `${e.icon} ${e.name} wore off.`, type: "info" });
  }

  set({
    player: { ...state.player, stats },
    statusEffects: remaining,
  });

  for (const m of messages) {
    get().addMessage(m.text, m.type);
  }

  if (stats.health <= 0) {
    stats.health = 0;
    set({
      player: { ...get().player, stats: { ...get().player.stats, health: 0 } },
      gameOver: true,
      combatTarget: null,
      runEvents: [...get().runEvents, { turn: state.turnCount, text: "Killed by status effect", type: "death" as const }],
    });
    sfxDeath();
    triggerShake(12, 30);
    get().addMessage("You have been defeated...", "danger");
  }
}

function findBestNearbyItem(
  room: Room,
  position: Position,
  inventory: InventorySlot[],
): { item: ItemDef; position: Position } | null {
  const equippedWeapon = inventory.find((s) => s.item.type === "weapon" && s.equipped);
  const equippedArmor = inventory.find((s) => s.item.type === "armor" && s.equipped);

  let bestItem: { item: ItemDef; position: Position } | null = null;
  let bestScore = 0;

  for (const groundItem of room.items) {
    const { item, position: itemPos } = groundItem;
    const distance = dist(position, itemPos);
    if (distance > 10) continue;

    let score = 0;
    if (item.type === "weapon" && item.effect) {
      const currentAmount = equippedWeapon?.item.effect?.amount ?? 0;
      if (item.effect.amount > currentAmount) {
        score = item.effect.amount - currentAmount;
      }
    } else if (item.type === "armor" && item.effect) {
      const currentAmount = equippedArmor?.item.effect?.amount ?? 0;
      if (item.effect.amount > currentAmount) {
        score = item.effect.amount - currentAmount;
      }
    } else if ((item.type === "potion" || item.type === "food") && item.effect?.stat === "health") {
      const hasHealing = inventory.some(
        (s) => (s.item.type === "potion" || s.item.type === "food") && s.item.effect?.stat === "health",
      );
      if (!hasHealing) score = 3;
    }

    if (score <= 0) continue;

    const priority = score / Math.max(1, distance);
    if (priority > bestScore) {
      bestScore = priority;
      bestItem = groundItem;
    }
  }

  return bestItem;
}

function autoEquipBest(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
) {
  const state = get();
  const inventory = [...state.player.inventory];
  const stats = { ...state.player.stats };
  let changed = false;

  for (const slotType of ["weapon", "armor"] as const) {
    const candidates = inventory.filter((s) => s.item.type === slotType && s.item.effect);
    if (candidates.length === 0) continue;

    const best = candidates.reduce((a, b) =>
      (b.item.effect?.amount ?? 0) > (a.item.effect?.amount ?? 0) ? b : a,
    );
    const equipped = candidates.find((s) => s.equipped);

    if (equipped === best) continue;

    if (equipped) equipped.equipped = false;
    best.equipped = true;
    changed = true;

    if (best.item.effect) {
      if (best.item.effect.stat === "attack") stats.attack = 5 + best.item.effect.amount;
      if (best.item.effect.stat === "defense") stats.defense = 3 + best.item.effect.amount;
    }

    get().addMessage(`Auto-equipped ${best.item.name}.`, "info");
  }

  if (changed) {
    set({ player: { ...state.player, stats, inventory } });
  }
}

function autoHealIfLow(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
) {
  const state = get();
  const { stats, inventory } = state.player;
  if (stats.health >= stats.maxHealth * 0.35) return;

  const healables = inventory
    .filter(
      (s) =>
        (s.item.type === "potion" || s.item.type === "food") &&
        s.item.effect?.stat === "health" &&
        s.quantity > 0,
    )
    .sort((a, b) => (b.item.effect?.amount ?? 0) - (a.item.effect?.amount ?? 0));

  if (healables.length === 0) return;

  // Use the smallest heal that would bring us above 50%, otherwise use the biggest
  const deficit = stats.maxHealth * 0.5 - stats.health;
  const efficient = healables.find((s) => (s.item.effect?.amount ?? 0) >= deficit);
  const pick = efficient ?? healables[0];

  get().useItem(pick.item.id);
}

function logAction(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  desc: string,
) {
  const state = get();
  const moves = [...state.recentMoves, `Turn ${state.turnCount}: ${desc}`];
  if (moves.length > 30) moves.splice(0, moves.length - 30);
  set({ recentMoves: moves });
}

function detectStuck(state: GameStore): string | null {
  if (recentPositions.length < MAX_RECENT) return null;

  // Check for oscillation: if the last N positions only cover 2-3 unique tiles
  const uniqueTiles = new Set(recentPositions.map((p) => `${p.x},${p.y}`));
  if (uniqueTiles.size <= 2) {
    return `Movement oscillation detected: the bot has been alternating between ${uniqueTiles.size} tiles for the last ${recentPositions.length} moves (positions: ${[...uniqueTiles].join(" and ")}). The current path or target is likely blocked or unreachable.`;
  }
  if (uniqueTiles.size <= 3 && recentPositions.length >= 6) {
    return `Movement loop detected: the bot is circling between ${uniqueTiles.size} tiles. It may be stuck trying to reach an inaccessible target.`;
  }

  // Check for room-level oscillation
  if (isRoomLooping()) {
    const last4 = recentRoomPath.slice(-4);
    return `Room oscillation detected: the bot keeps going back and forth between rooms ${last4[0]} and ${last4[1]}. It needs to pick a different destination or explore a new exit.`;
  }

  // Check if current plan step has stalled (>30 turns on the same step)
  const plan = state.smartPlan;
  if (plan) {
    const currentStep = plan.steps.find((s) => !s.done);
    if (currentStep) {
      const turnsSincePlan = state.turnCount - plan.generatedAtTurn;
      const completedSteps = plan.steps.filter((s) => s.done).length;
      if (turnsSincePlan > 30 && completedSteps === 0) {
        return `No plan progress: ${turnsSincePlan} turns have passed since the plan was generated but no steps have been completed. Current step "${currentStep.action}${currentStep.target ? ` → ${currentStep.target}` : ""}" appears stuck.`;
      }
    }
  }

  return null;
}

const REPLAN_COOLDOWN = 20;
let lastReplanTurn = -Infinity;

function maybeReplan(get: () => GameStore, turn: number) {
  const state = get();
  if (!state.smartPlanner || state.plannerLoading) return;
  if (turn - lastReplanTurn < REPLAN_COOLDOWN) return;

  const plan = state.smartPlan;

  // Scheduled replan every 100 turns
  if (!plan || turn - plan.generatedAtTurn >= 100) {
    lastReplanTurn = turn;
    state.requestReplan();
    return;
  }

  // All steps completed — need a new plan
  if (plan.steps.every((s) => s.done)) {
    lastReplanTurn = turn;
    state.requestReplan();
    return;
  }

  // Stuck detection — only check every 10 turns to avoid spamming
  if (turn % 10 === 0) {
    const stuckReason = detectStuck(state);
    if (stuckReason) {
      lastReplanTurn = turn;
      state.requestReplan(stuckReason);
    }
  }
}

function chooseDirectionToward(
  state: GameStore,
  room: Room,
  from: Position,
  to: Position,
): Direction | null {
  const fakeState = { ...state };
  const fakeRoom = { ...room, npcs: room.npcs.filter((n) => n.type === "hostile" || !(n.position.x === to.x && n.position.y === to.y)) };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;

  const allDirs: Direction[] = ["up", "down", "left", "right"];
  const delta: Record<Direction, Position> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  const ranked = allDirs
    .filter((dir) => {
      const d = delta[dir];
      const nx = from.x + d.x;
      const ny = from.y + d.y;
      if (nx < 0 || ny < 0 || nx >= room.width || ny >= room.height) return false;
      if (!room.tiles[ny][nx].walkable) return false;
      const blocked = fakeRoom.npcs.find(
        (n) => n.position.x === nx && n.position.y === ny && n.blocking && n.type !== "hostile",
      );
      return !blocked;
    })
    .sort((a, b) => {
      const da = delta[a];
      const db = delta[b];
      const distA = Math.abs(to.x - (from.x + da.x)) + Math.abs(to.y - (from.y + da.y));
      const distB = Math.abs(to.x - (from.x + db.x)) + Math.abs(to.y - (from.y + db.y));
      return distA - distB;
    });

  if (ranked.length === 0) return null;
  const fresh = ranked.filter((dir) => {
    const d = delta[dir];
    return !recentPositions.some((p) => p.x === from.x + d.x && p.y === from.y + d.y);
  });
  return fresh.length > 0 ? fresh[0] : ranked[0];
}

function chooseDirection(
  state: GameStore,
  room: Room,
  position: Position,
): Direction | null {
  // Find the most interesting target to move toward
  type Target = { pos: Position; priority: number };
  const targets: Target[] = [];

  // Hostile NPCs nearby — approach to fight
  for (const npc of room.npcs) {
    if (npc.type === "hostile") {
      targets.push({ pos: npc.position, priority: 10 });
    }
  }

  // Items on the ground
  for (const { position: itemPos } of room.items) {
    targets.push({ pos: itemPos, priority: 7 });
  }

  // Use room-level pathfinding to find the best exit
  const recentlyEnteredRoom = lastEnteredFromRoomId && (state.turnCount - turnEnteredRoom) < ENTRY_COOLDOWN_TURNS;
  const looping = isRoomLooping();
  const roomGoal = findBestRoomGoal(state.currentRoomId, state);
  const currentRoomDone = isRoomCleared(state.currentRoomId, state);

  let deferredBacktrackExit: { pos: Position; priority: number } | null = null;
  for (const exit of room.exits) {
    const targetRoom = state.rooms[exit.targetRoomId];
    if (!targetRoom) continue;

    const isBfsGoal = roomGoal && exit.targetRoomId === roomGoal.nextRoomId;
    const isImmediateBacktrack =
      !!recentlyEnteredRoom && exit.targetRoomId === lastEnteredFromRoomId;

    // Never immediately bounce back through the same door while cooldown is active.
    // Keep it as a fallback only if no other targets exist.
    if (isImmediateBacktrack) {
      deferredBacktrackExit = { pos: exit.position, priority: 1 };
      continue;
    }

    // BFS goal exits are never blocked — they represent a planned route
    if (!isBfsGoal) {
      if (looping && recentRoomPath.slice(-6).includes(exit.targetRoomId)) continue;
    }

    if (isBfsGoal) {
      targets.push({ pos: exit.position, priority: currentRoomDone ? 12 : 8 });
    } else if (!targetRoom.discovered) {
      targets.push({ pos: exit.position, priority: 11 });
    } else if (!isRoomCleared(exit.targetRoomId, state)) {
      const visits = roomVisitCount.get(exit.targetRoomId) ?? 0;
      targets.push({ pos: exit.position, priority: Math.max(2, 6 - visits) });
    } else {
      targets.push({ pos: exit.position, priority: 1 });
    }
  }

  if (targets.length === 0 && deferredBacktrackExit) {
    targets.push(deferredBacktrackExit);
  }

  // Quest-related NPCs
  for (const npc of room.npcs) {
    if (npc.type !== "hostile" && npc.questId) {
      const quest = state.quests[npc.questId];
      if (quest?.status === "available" || quest?.status === "completed") {
        targets.push({ pos: npc.position, priority: 9 });
      }
    }
  }

  if (targets.length === 0) return null;

  targets.sort((a, b) => b.priority - a.priority);
  const best = targets[0];

  // Rank all 4 directions by how much they reduce distance to target
  const allDirs: Direction[] = ["up", "down", "left", "right"];
  const candidates = allDirs
    .map((dir) => {
      const d = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[dir];
      const nx = position.x + d.x;
      const ny = position.y + d.y;
      const newDist = Math.abs(best.pos.x - nx) + Math.abs(best.pos.y - ny);
      return { dir, newDist };
    })
    .sort((a, b) => a.newDist - b.newDist)
    .map((e) => e.dir);

  const delta: Record<Direction, Position> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };

  function isWalkable(dir: Direction): boolean {
    const d = delta[dir];
    const nx = position.x + d.x;
    const ny = position.y + d.y;
    if (nx < 0 || ny < 0 || nx >= room.width || ny >= room.height) return false;
    const tile = room.tiles[ny][nx];
    if (!tile.walkable) return false;
    const blockingNpc = room.npcs.find(
      (n) => n.position.x === nx && n.position.y === ny && n.blocking && n.type !== "hostile",
    );
    return !blockingNpc;
  }

  function wasRecentlyVisited(dir: Direction): boolean {
    const d = delta[dir];
    const nx = position.x + d.x;
    const ny = position.y + d.y;
    return recentPositions.some((p) => p.x === nx && p.y === ny);
  }

  const walkable = candidates.filter(isWalkable);
  if (walkable.length === 0) return null;

  const fresh = walkable.filter((d) => !wasRecentlyVisited(d));
  return fresh.length > 0 ? fresh[0] : walkable[0];
}

function updateVisibility(get: () => GameStore) {
  const state = get();
  const room = state.rooms[state.currentRoomId];
  if (!room) return;

  const { x: px, y: py } = state.player.position;
  const radius = 6;

  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      room.tiles[y][x].visible = false;
    }
  }

  for (let y = Math.max(0, py - radius); y <= Math.min(room.height - 1, py + radius); y++) {
    for (let x = Math.max(0, px - radius); x <= Math.min(room.width - 1, px + radius); x++) {
      const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (d <= radius) {
        room.tiles[y][x].visible = true;
        room.tiles[y][x].discovered = true;
      }
    }
  }
}

function updateContext(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
) {
  const state = get();
  const room = state.rooms[state.currentRoomId];
  if (!room) return;

  const { position } = state.player;
  const actions: ContextAction[] = [];
  let predicted: PredictedAction | null = null;

  const itemHere = room.items.find(
    (i) => i.position.x === position.x && i.position.y === position.y,
  );
  if (itemHere) {
    const act = () => get().pickUpItem();
    actions.push({
      key: "E",
      label: `Pick up ${itemHere.item.name}`,
      description: itemHere.item.description,
      action: act,
      priority: 10,
    });
    predicted = {
      label: `Pick up ${itemHere.item.name}`,
      confidence: 0.9,
      action: act,
      description: `Press E or Tab to pick up the ${itemHere.item.name}`,
    };
  }

  const nearbyNpc = room.npcs.find(
    (n) => dist(position, n.position) <= 1,
  );
  if (nearbyNpc) {
    if (nearbyNpc.type === "hostile") {
      const act = () => get().attackTarget();
      actions.push({
        key: "E",
        label: `Attack ${nearbyNpc.name}`,
        description: `HP: ${nearbyNpc.health}/${nearbyNpc.maxHealth}`,
        action: act,
        priority: 20,
      });
      if (!predicted) {
        predicted = {
          label: `Attack ${nearbyNpc.name}`,
          confidence: 0.85,
          action: act,
          description: `Press E or Tab to attack`,
        };
      }
    } else {
      const talkAct = () => get().talkToNpc();
      actions.push({
        key: "E",
        label: `Talk to ${nearbyNpc.name}`,
        description: nearbyNpc.type === "merchant" ? "Trade & Chat" : "Chat",
        action: talkAct,
        priority: 15,
      });

      if (nearbyNpc.questId) {
        const quest = state.quests[nearbyNpc.questId];
        if (quest?.status === "available") {
          actions.push({
            key: "Q",
            label: `Accept: ${quest.name}`,
            description: quest.objective,
            action: () => get().acceptQuest(quest.id),
            priority: 18,
          });
          if (!predicted) {
            predicted = {
              label: `Accept quest: ${quest.name}`,
              confidence: 0.8,
              action: () => get().acceptQuest(quest.id),
              description: `Press Q or Tab to accept quest`,
            };
          }
        }
      }

      if (!predicted && !(nearbyNpc.id === lastTalkedNpcId && state.turnCount - lastTalkedTurn < 15)) {
        predicted = {
          label: `Talk to ${nearbyNpc.name}`,
          confidence: 0.7,
          action: talkAct,
          description: `Press E or Tab to talk`,
        };
      }
    }
  }

  const nearbyChest = room.tiles[position.y]?.[position.x];
  if (nearbyChest?.type === "chest") {
    actions.push({
      key: "E",
      label: "Open Chest",
      description: "See what's inside",
      action: () => {
        get().addMessage("The chest is empty... for now.", "info");
      },
      priority: 12,
    });
  }

  if (
    state.player.stats.health < state.player.stats.maxHealth * 0.4 &&
    state.player.inventory.some((s) => s.item.type === "potion")
  ) {
    const potionSlot = state.player.inventory.find(
      (s) => s.item.type === "potion",
    );
    if (potionSlot && !predicted) {
      predicted = {
        label: `Use ${potionSlot.item.name}`,
        confidence: 0.75,
        action: () => get().useItem(potionSlot.item.id),
        description: "You're low on health",
      };
    }
  }

  actions.sort((a, b) => b.priority - a.priority);

  // In autopilot mode, override prediction with the full AI action
  if (state.autopilot) {
    const aiAction = get().getAutopilotAction();
    if (aiAction) {
      predicted = {
        label: "AI",
        confidence: 1.0,
        action: aiAction,
        description: "Autopilot",
      };
    }
  }

  const hasNearbyEnemies = room.npcs.some(
    (n) => n.type === "hostile" &&
    Math.abs(n.position.x - position.x) + Math.abs(n.position.y - position.y) <= 5,
  );
  setMusicReactivity({
    nearEnemies: hasNearbyEnemies,
    inCombat: state.combatTarget !== null,
    lowHealth: state.player.stats.health < state.player.stats.maxHealth * 0.3,
  });

  set({ contextActions: actions, predictedAction: predicted });
}
