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
} from "../engine/types";
import { generatePlan } from "../engine/planner";
import { createRooms } from "../content/rooms";
import { QUESTS } from "../content/quests";
import { setSeed, getSeed } from "../engine/rng";
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
} from "../engine/audio";

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
  turnCount: number;
  combatTarget: NPCDef | null;
  autopilot: boolean;
  seed: number;
  smartPlanner: boolean;
  smartPlan: SmartPlan | null;
  plannerLoading: boolean;
  recentMoves: string[];

  move: (dir: Direction) => void;
  interact: () => void;
  useItem: (itemId: string) => void;
  equipItem: (itemId: string) => void;
  dropItem: (itemId: string) => void;
  pickUpItem: () => void;
  attackTarget: () => void;
  talkToNpc: () => void;
  acceptQuest: (questId: string) => void;
  togglePanel: (panel: HudPanel) => void;
  setCommandOpen: (open: boolean) => void;
  executePredicted: () => void;
  addMessage: (text: string, type: GameMessage["type"]) => void;
  processCommand: (command: string) => void;
  toggleAutopilot: () => void;
  getAutopilotAction: () => (() => void) | null;
  newGame: (seed?: number) => void;
  setMenuOpen: (open: boolean) => void;
  toggleSmartPlanner: () => void;
  requestReplan: (stuckReason?: string) => void;
  getSmartAction: () => (() => void) | null;
}

let msgId = 0;

const defaultSeed = Math.floor(Math.random() * 2147483647);

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
  turnCount: 0,
  combatTarget: null,
  autopilot: false,
  seed: defaultSeed,
  smartPlanner: false,
  smartPlan: null,
  plannerLoading: false,
  recentMoves: [],

  move(dir: Direction) {
    const state = get();
    if (state.gameOver) return;

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

        targetRoom.discovered = true;
        set({
          currentRoomId: exit.targetRoomId,
          player: { ...state.player, position: entryPos, facing: dir },
          combatTarget: null,
        });
        sfxDoorOpen();
        changeAmbiance(targetRoom.ambiance);
        get().addMessage(`Entered ${targetRoom.name}.`, "info");
        updateVisibility(get);
        updateContext(get, set);
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
    });

    sfxStep();
    startMusic(room.ambiance);
    updateVisibility(get);
    autoHealIfLow(get, set);
    updateContext(get, set);
    maybeReplan(get, newTurn);
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
    });
    sfxPickup();
    get().addMessage(`Picked up ${item.name}.`, "loot");
    logAction(get, set, `pickup ${item.name}`);
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
      if (item.effect.stat === "health") {
        stats.health = Math.min(stats.maxHealth, stats.health + item.effect.amount);
      }
      slot.quantity -= 1;
      if (slot.quantity <= 0) inventory.splice(slotIdx, 1);

      set({ player: { ...state.player, stats, inventory } });
      sfxUseItem();
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
    logAction(get, set, `attack ${target.name} for ${dmgToEnemy} dmg`);
    get().addMessage(
      `You hit ${target.name} for ${dmgToEnemy} damage!`,
      "combat",
    );

    if (target.health <= 0) {
      sfxEnemyDeath();
      get().addMessage(`${target.name} defeated!`, "combat");

      room.npcs = room.npcs.filter((n) => n.id !== target.id);

      if (target.loot) {
        for (const lootItem of target.loot) {
          room.items.push({
            item: lootItem,
            position: { ...target.position },
          });
          get().addMessage(`${target.name} dropped ${lootItem.name}.`, "loot");
        }
      }

      const xpGain = 15 + target.maxHealth;
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

      // Quest progress
      const quests = { ...state.quests };
      if (target.name === "Giant Rat") {
        const q = quests.quest_rats;
        if (q && q.status === "active") {
          q.progress += 1;
          if (q.progress >= q.target) {
            q.status = "completed";
            sfxQuestComplete();
            get().addMessage("Quest complete: Rat Infestation! Return to the guard.", "quest");
          }
        }
      }

      set({
        rooms: { ...state.rooms, [state.currentRoomId]: room },
        player: { ...state.player, stats },
        combatTarget: null,
        quests,
      });
    } else {
      const dmgToPlayer = Math.max(1, target.attack - playerDef);
      const stats = { ...state.player.stats };
      stats.health -= dmgToPlayer;

      sfxPlayerHurt();
      get().addMessage(
        `${target.name} hits you for ${dmgToPlayer} damage!`,
        "danger",
      );

      if (stats.health <= 0) {
        stats.health = 0;
        set({
          player: { ...state.player, stats },
          gameOver: true,
          combatTarget: null,
        });
        sfxDeath();
        get().addMessage("You have been defeated...", "danger");
        return;
      }

      set({
        player: { ...state.player, stats },
        combatTarget: target,
      });
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

    const line =
      nearbyNpc.dialogue[
        Math.floor(Math.random() * nearbyNpc.dialogue.length)
      ];
    sfxTalk();
    logAction(get, set, `talk to ${nearbyNpc.name}`);
    get().addMessage(`${nearbyNpc.name}: "${line}"`, "info");

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
        quest.status = "completed";
        get().addMessage(
          `Quest rewarded! +${quest.reward.xp} XP, +${quest.reward.gold} Gold`,
          "quest",
        );
        set({
          player: { ...state.player, stats },
          quests: { ...state.quests, [quest.id]: quest },
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
    set({ quests });
    sfxQuestAccept();
    logAction(get, set, `accept quest: ${quest.name}`);
    get().addMessage(`Quest accepted: ${quest.name}`, "quest");

    if (!state.activePanels.includes("quests")) {
      set({ activePanels: [...state.activePanels, "quests"] });
    }
    updateContext(get, set);
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
      s.addMessage("Commands: heal, show/hide [panel], help, look, stats", "system");
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
    } else if (cmd === "autopilot") {
      s.toggleAutopilot();
    } else if (cmd.startsWith("seed ")) {
      const seedVal = parseInt(cmd.replace("seed ", ""), 10);
      if (!isNaN(seedVal)) {
        s.newGame(seedVal);
      } else {
        s.addMessage("Usage: seed <number>", "system");
      }
    } else if (cmd === "new game" || cmd === "restart") {
      s.newGame();
    } else if (cmd === "seed") {
      s.addMessage(`Current seed: ${s.seed}`, "system");
    } else if (cmd === "planner" || cmd === "smart") {
      s.toggleSmartPlanner();
    } else if (cmd === "replan") {
      s.requestReplan();
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

  newGame(seed?: number) {
    const s = seed ?? Math.floor(Math.random() * 2147483647);
    msgId = 0;
    recentPositions.length = 0;
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
        text: `Seed: ${s}. You arrive at Ashford Village.`,
        type: "system",
        timestamp: Date.now(),
      }],
      contextActions: [],
      predictedAction: null,
      activePanels: ["log"],
      commandOpen: false,
      gameOver: false,
      turnCount: 0,
      combatTarget: null,
      autopilot: false,
      seed: s,
      smartPlanner: false,
      smartPlan: null,
      plannerLoading: false,
      menuOpen: false,
      recentMoves: [],
    });
  },

  setMenuOpen(open: boolean) {
    set({ menuOpen: open });
  },

  getAutopilotAction() {
    const state = get();
    if (state.gameOver) return null;

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

    // Priority 5: Talk to nearby friendly NPC (only occasionally)
    if (nearbyFriendly && state.turnCount % 8 === 0) {
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
    get().addMessage(
      current
        ? "Smart Planner disengaged."
        : "Smart Planner engaged. GPT will plan every 100 turns.",
      "system",
    );
    if (!current) {
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
      stuckReason,
      previousPlan: state.smartPlan ?? undefined,
    })
      .then((plan) => {
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

    const currentStep = plan.steps.find((s) => !s.done);
    if (!currentStep) return null;

    const room = state.rooms[state.currentRoomId];
    if (!room) return null;
    const { position } = state.player;

    const markDone = () => {
      const p = get().smartPlan;
      if (p) {
        const updated = { ...p, steps: p.steps.map((s) => (s === currentStep ? { ...s, done: true } : s)) };
        set({ smartPlan: updated });
      }
    };

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
        if (currentStep.room && currentStep.room !== state.currentRoomId) {
          const exit = room.exits.find((e) => e.targetRoomId === currentStep.room);
          if (exit) {
            if (exit.position.x === position.x && exit.position.y === position.y) {
              markDone();
            }
            const dir = chooseDirectionToward(state, room, position, exit.position);
            return dir ? () => get().move(dir) : null;
          }
        }
        markDone();
        return null;
      }

      default:
        markDone();
        return null;
    }
  },
}));

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

  // Unexplored exits — prefer going deeper
  for (const exit of room.exits) {
    const targetRoom = state.rooms[exit.targetRoomId];
    if (targetRoom && !targetRoom.discovered) {
      targets.push({ pos: exit.position, priority: 8 });
    } else if (targetRoom) {
      targets.push({ pos: exit.position, priority: 3 });
    }
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

      if (!predicted) {
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

  set({ contextActions: actions, predictedAction: predicted });
}
