import type { Room, Tile, NPCDef, ItemDef, Position } from "../engine/types";
import { ITEMS } from "./items";

function makeTile(
  type: Tile["type"],
  walkable: boolean,
  symbol: string,
  color: string,
  bgColor?: string,
): Tile {
  return { type, walkable, symbol, color, bgColor, discovered: false, visible: false };
}

const T = {
  floor: () => makeTile("floor", true, "·", "#3a3a4a", "#16161e"),
  wall: () => makeTile("wall", false, "█", "#4a4a5a", "#1e1e2a"),
  door: () => makeTile("door", true, "▯", "#c89b3c", "#1e1e2a"),
  chest: () => makeTile("chest", true, "◈", "#f59e0b", "#1e1e2a"),
  stairs: () => makeTile("stairs", true, "≡", "#8b5cf6", "#1e1e2a"),
  water: () => makeTile("water", false, "~", "#38bdf8", "#0c2d48"),
  lava: () => makeTile("lava", false, "~", "#f97316", "#3c1106"),
};

function makeGrid(width: number, height: number, layout: string[]): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const ch = layout[y]?.[x] ?? "#";
      switch (ch) {
        case ".": row.push(T.floor()); break;
        case "#": row.push(T.wall()); break;
        case "+": row.push(T.door()); break;
        case "C": row.push(T.chest()); break;
        case ">": row.push(T.stairs()); break;
        case "~": row.push(T.water()); break;
        case "L": row.push(T.lava()); break;
        default:  row.push(T.floor()); break;
      }
    }
    grid.push(row);
  }
  return grid;
}

const GUARD_NPC: NPCDef = {
  id: "npc_guard",
  name: "Town Guard",
  position: { x: 6, y: 4 },
  symbol: "G",
  color: "#60a5fa",
  blocking: true,
  type: "friendly",
  health: 50,
  maxHealth: 50,
  attack: 8,
  defense: 6,
  dialogue: [
    "The dungeon entrance is to the east. Be careful, adventurer.",
    "Rats have been swarming from the caves. Someone should clear them out.",
    "Come back if you find anything valuable.",
  ],
  questId: "quest_rats",
};

const MERCHANT_NPC: NPCDef = {
  id: "npc_merchant",
  name: "Wandering Merchant",
  position: { x: 3, y: 3 },
  symbol: "M",
  color: "#fbbf24",
  blocking: true,
  type: "merchant",
  health: 30,
  maxHealth: 30,
  attack: 2,
  defense: 2,
  dialogue: [
    "Welcome! I have wares if you have coin.",
    "This health potion? Only 25 gold. A bargain!",
    "Safe travels, friend.",
  ],
};

const RAT_1: NPCDef = {
  id: "npc_rat_1",
  name: "Giant Rat",
  position: { x: 8, y: 3 },
  symbol: "r",
  color: "#a1a1aa",
  blocking: true,
  type: "hostile",
  health: 12,
  maxHealth: 12,
  attack: 4,
  defense: 1,
  dialogue: ["*squeak*"],
  loot: [ITEMS.rat_tail],
};

const RAT_2: NPCDef = {
  id: "npc_rat_2",
  name: "Giant Rat",
  position: { x: 11, y: 6 },
  symbol: "r",
  color: "#a1a1aa",
  blocking: true,
  type: "hostile",
  health: 12,
  maxHealth: 12,
  attack: 4,
  defense: 1,
  dialogue: ["*hiss*"],
  loot: [ITEMS.rat_tail],
};

const RAT_3: NPCDef = {
  id: "npc_rat_3",
  name: "Giant Rat",
  position: { x: 5, y: 8 },
  symbol: "r",
  color: "#a1a1aa",
  blocking: true,
  type: "hostile",
  health: 15,
  maxHealth: 15,
  attack: 5,
  defense: 2,
  dialogue: ["*screech*"],
  loot: [ITEMS.health_potion],
};

const SKELETON: NPCDef = {
  id: "npc_skeleton",
  name: "Skeleton Warrior",
  position: { x: 7, y: 4 },
  symbol: "S",
  color: "#e2e8f0",
  blocking: true,
  type: "hostile",
  health: 25,
  maxHealth: 25,
  attack: 8,
  defense: 4,
  dialogue: ["..."],
  loot: [ITEMS.iron_sword],
};

export const ROOMS: Record<string, Room> = {
  town_square: {
    id: "town_square",
    name: "Town Square",
    width: 16,
    height: 12,
    tiles: makeGrid(16, 12, [
      "################",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "########+#######",
    ]),
    entities: [],
    npcs: [GUARD_NPC, MERCHANT_NPC],
    items: [
      { item: ITEMS.health_potion, position: { x: 12, y: 2 } },
    ],
    exits: [
      { direction: "down", targetRoomId: "dungeon_entry", position: { x: 8, y: 11 } },
    ],
    ambiance: "town",
    discovered: true,
  },

  dungeon_entry: {
    id: "dungeon_entry",
    name: "Dungeon Entrance",
    width: 16,
    height: 12,
    tiles: makeGrid(16, 12, [
      "########+#######",
      "#..............#",
      "#..............#",
      "#....####......#",
      "#....#..#......#",
      "#....#..#......#",
      "#....####......#",
      "#..............#",
      "#..............#",
      "#.......C......#",
      "#..............#",
      "########+#######",
    ]),
    entities: [],
    npcs: [RAT_1, RAT_2],
    items: [
      { item: ITEMS.torch, position: { x: 2, y: 1 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "town_square", position: { x: 8, y: 0 } },
      { direction: "down", targetRoomId: "deep_caves", position: { x: 8, y: 11 } },
    ],
    ambiance: "dungeon",
    discovered: false,
  },

  deep_caves: {
    id: "deep_caves",
    name: "Deep Caves",
    width: 16,
    height: 12,
    tiles: makeGrid(16, 12, [
      "########+#######",
      "#..~~..........#",
      "#..~~..........#",
      "#..............#",
      "#......##......#",
      "#.....####.....#",
      "#......##......#",
      "#..............#",
      "#..........LL..#",
      "#..........LL..#",
      "#..............#",
      "################",
    ]),
    entities: [],
    npcs: [RAT_3, SKELETON],
    items: [
      { item: ITEMS.iron_shield, position: { x: 13, y: 2 } },
      { item: ITEMS.gold_pile, position: { x: 1, y: 10 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "dungeon_entry", position: { x: 8, y: 0 } },
    ],
    ambiance: "cave",
    discovered: false,
  },
};
