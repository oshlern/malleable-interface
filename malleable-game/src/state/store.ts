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
} from "../engine/types";
import { ROOMS } from "../content/rooms";
import { QUESTS } from "../content/quests";
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
  gameOver: boolean;
  turnCount: number;
  combatTarget: NPCDef | null;

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
}

let msgId = 0;

function cloneRooms(): Record<string, Room> {
  return JSON.parse(JSON.stringify(ROOMS));
}

function cloneQuests(): Record<string, QuestDef> {
  return JSON.parse(JSON.stringify(QUESTS));
}

function dist(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
  gameOver: false,
  turnCount: 0,
  combatTarget: null,

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

    set({
      player: { ...state.player, position: { x: nx, y: ny }, facing: dir },
      turnCount: state.turnCount + 1,
      combatTarget: null,
    });

    sfxStep();
    startMusic(room.ambiance);
    updateVisibility(get);
    updateContext(get, set);
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
    } else {
      s.addMessage(`Unknown command: "${command}"`, "system");
    }

    set({ commandOpen: false });
  },
}));

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
  set({ contextActions: actions, predictedAction: predicted });
}
