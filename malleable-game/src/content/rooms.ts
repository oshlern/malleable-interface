import type { Room, Tile, NPCDef, Position } from "../engine/types";
import { ITEMS } from "./items";
import { random } from "../engine/rng";

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

const T2 = {
  floor: () => makeTile("floor", true, "·", "#7dd3fc", "#0a1020"),
  wall: () => makeTile("wall", false, "▓", "#1f2a44", "#060b16"),
  door: () => makeTile("door", true, "◍", "#a78bfa", "#0b1324"),
  chest: () => makeTile("chest", true, "◆", "#22d3ee", "#0b1324"),
  stairs: () => makeTile("stairs", true, "✦", "#e879f9", "#0b1324"),
  water: () => makeTile("water", false, "≈", "#38bdf8", "#07182d"),
  lava: () => makeTile("lava", false, "~", "#f43f5e", "#2a0610"),
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

function makeGrid2(width: number, height: number, layout: string[]): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const ch = layout[y]?.[x] ?? "#";
      switch (ch) {
        case ".": row.push(T2.floor()); break;
        case "#": row.push(T2.wall()); break;
        case "+": row.push(T2.door()); break;
        case "C": row.push(T2.chest()); break;
        case ">": row.push(T2.stairs()); break;
        case "~": row.push(T2.water()); break;
        case "L": row.push(T2.lava()); break;
        default:  row.push(T2.floor()); break;
      }
    }
    grid.push(row);
  }
  return grid;
}

function getReachableFloors(tiles: Tile[][], seeds: Position[]): Position[] {
  const h = tiles.length;
  const w = tiles[0].length;
  const visited = new Set<string>();
  const queue: Position[] = [];

  for (const s of seeds) {
    const key = `${s.x},${s.y}`;
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(s);
    }
  }

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (!tiles[ny][nx].walkable) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }

  const result: Position[] = [];
  for (const key of visited) {
    const [xs, ys] = key.split(",");
    const x = parseInt(xs, 10);
    const y = parseInt(ys, 10);
    if (tiles[y][x].type === "floor") {
      result.push({ x, y });
    }
  }
  return result;
}

function placeEntities(room: Room): void {
  const exitPositions = room.exits.map((e) => e.position);
  const floors = getReachableFloors(room.tiles, exitPositions);
  const taken = new Set<string>();

  for (const exit of room.exits) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        taken.add(`${exit.position.x + dx},${exit.position.y + dy}`);
      }
    }
  }

  function pickSpot(): Position {
    for (let attempt = 0; attempt < 200; attempt++) {
      const pos = floors[Math.floor(random() * floors.length)];
      const key = `${pos.x},${pos.y}`;
      if (!taken.has(key)) {
        taken.add(key);
        return { ...pos };
      }
    }
    return { x: 1, y: 1 };
  }

  for (const npc of room.npcs) {
    npc.position = pickSpot();
  }

  for (const item of room.items) {
    item.position = pickSpot();
  }
}

// ─── NPCs ────────────────────────────────────────

const P0 = { x: 0, y: 0 };

const GUARD: NPCDef = {
  id: "npc_guard", name: "Captain Aldric", position: { ...P0 },
  symbol: "A", color: "#60a5fa", blocking: true, type: "friendly",
  health: 60, maxHealth: 60, attack: 10, defense: 8,
  dialogue: [
    "The old dungeon has grown restless. Rats first, then... worse things.",
    "If you're heading below, clear the vermin. I'll make it worth your while.",
    "My daughter Elena went down there weeks ago. She hasn't returned.",
  ],
  questId: "quest_rats",
};

const MERCHANT: NPCDef = {
  id: "npc_merchant", name: "Maren the Peddler", position: { ...P0 },
  symbol: "M", color: "#fbbf24", blocking: true, type: "merchant",
  health: 30, maxHealth: 30, attack: 2, defense: 2,
  dialogue: [
    "Potions, blades, curiosities — I have what you need.",
    "Business is slow since the music stopped.",
    "They say a pianist once played in the chapel below. Now only silence.",
  ],
  questId: "quest_treasure",
};

const OLD_WOMAN: NPCDef = {
  id: "npc_old_woman", name: "Grandmother Voss", position: { ...P0 },
  symbol: "V", color: "#c084fc", blocking: true, type: "friendly",
  health: 15, maxHealth: 15, attack: 1, defense: 1,
  dialogue: [
    "I hear the piano at night, child. The same nocturne, over and over...",
    "My granddaughter had a locket. Shaped like a heart. If you find it...",
    "The dead don't rest easy here. They remember what they've lost.",
  ],
  questId: "quest_locket",
};

const HERMIT: NPCDef = {
  id: "npc_hermit", name: "Brother Cassius", position: { ...P0 },
  symbol: "C", color: "#a78bfa", blocking: true, type: "friendly",
  health: 25, maxHealth: 25, attack: 3, defense: 3,
  dialogue: [
    "This chapel was beautiful once. Now the hymns are replaced by silence.",
    "The crypt key is hidden somewhere in these halls. The Warden guards it.",
    "If you reach the crypt, play the piano. It may quiet the restless dead.",
  ],
  questId: "quest_crypt",
};

const ELENA: NPCDef = {
  id: "npc_elena", name: "Elena (injured)", position: { ...P0 },
  symbol: "E", color: "#fb7185", blocking: true, type: "friendly",
  health: 8, maxHealth: 30, attack: 6, defense: 3,
  dialogue: [
    "*cough* You... you came from the surface? Father sent you?",
    "I found a journal down here. Take it. It explains what happened.",
    "I can't walk. Please — clear the way and come back for me.",
  ],
  questId: "quest_rescue",
};

const RAT_1: NPCDef = {
  id: "npc_rat_1", name: "Giant Rat", position: { ...P0 },
  symbol: "r", color: "#a1a1aa", blocking: true, type: "hostile",
  health: 12, maxHealth: 12, attack: 4, defense: 1,
  dialogue: ["*squeak*"], loot: [ITEMS.rat_tail],
};

const RAT_2: NPCDef = {
  id: "npc_rat_2", name: "Giant Rat", position: { ...P0 },
  symbol: "r", color: "#a1a1aa", blocking: true, type: "hostile",
  health: 12, maxHealth: 12, attack: 4, defense: 1,
  dialogue: ["*hiss*"], loot: [ITEMS.rat_tail],
};

const RAT_3: NPCDef = {
  id: "npc_rat_3", name: "Giant Rat", position: { ...P0 },
  symbol: "r", color: "#a1a1aa", blocking: true, type: "hostile",
  health: 15, maxHealth: 15, attack: 5, defense: 2,
  dialogue: ["*screech*"], loot: [ITEMS.health_potion],
};

const RAT_4: NPCDef = {
  id: "npc_rat_4", name: "Giant Rat", position: { ...P0 },
  symbol: "r", color: "#a1a1aa", blocking: true, type: "hostile",
  health: 12, maxHealth: 12, attack: 4, defense: 1,
  dialogue: ["*squeal*"], loot: [ITEMS.rat_tail],
};

const SKELETON_1: NPCDef = {
  id: "npc_skel_1", name: "Skeleton", position: { ...P0 },
  symbol: "S", color: "#e2e8f0", blocking: true, type: "hostile",
  health: 20, maxHealth: 20, attack: 7, defense: 3,
  dialogue: ["..."], loot: [ITEMS.bone_charm],
};

const SKELETON_2: NPCDef = {
  id: "npc_skel_2", name: "Skeleton Archer", position: { ...P0 },
  symbol: "S", color: "#d4d4d8", blocking: true, type: "hostile",
  health: 18, maxHealth: 18, attack: 9, defense: 2,
  dialogue: ["..."], loot: [ITEMS.gold_pile],
};

const WRAITH: NPCDef = {
  id: "npc_wraith", name: "Wraith", position: { ...P0 },
  symbol: "W", color: "#818cf8", blocking: true, type: "hostile",
  health: 30, maxHealth: 30, attack: 10, defense: 5,
  dialogue: ["...the music... where is the music..."],
  loot: [ITEMS.sapphire],
};

const WARDEN: NPCDef = {
  id: "npc_warden", name: "The Warden", position: { ...P0 },
  symbol: "W", color: "#f87171", blocking: true, type: "hostile",
  health: 45, maxHealth: 45, attack: 12, defense: 6,
  dialogue: ["NONE SHALL PASS."],
  loot: [ITEMS.crypt_key, ITEMS.knight_armor],
};

const GHOST: NPCDef = {
  id: "npc_ghost", name: "The Pianist", position: { ...P0 },
  symbol: "♪", color: "#c4b5fd", blocking: true, type: "friendly",
  health: 1, maxHealth: 1, attack: 0, defense: 0,
  dialogue: [
    "You brought the key... you can hear me, can't you?",
    "I played every night until the darkness took me. The prelude in E minor — do you know it?",
    "The dead wander because the music stopped. Play it again, and they may rest.",
    "Thank you. The nocturne will continue. Even in silence, music endures.",
  ],
};

const SPIDER_1: NPCDef = {
  id: "npc_spider_1", name: "Cave Spider", position: { ...P0 },
  symbol: "x", color: "#65a30d", blocking: true, type: "hostile",
  health: 14, maxHealth: 14, attack: 6, defense: 2,
  dialogue: ["*click click*"], loot: [ITEMS.mushroom_stew],
};

const SPIDER_2: NPCDef = {
  id: "npc_spider_2", name: "Cave Spider", position: { ...P0 },
  symbol: "x", color: "#65a30d", blocking: true, type: "hostile",
  health: 14, maxHealth: 14, attack: 6, defense: 2,
  dialogue: ["*hissss*"], loot: [ITEMS.bread],
};

const BAT_1: NPCDef = {
  id: "npc_bat_1", name: "Shadow Bat", position: { ...P0 },
  symbol: "b", color: "#71717a", blocking: true, type: "hostile",
  health: 8, maxHealth: 8, attack: 5, defense: 1,
  dialogue: ["*screech*"],
};

const BAT_2: NPCDef = {
  id: "npc_bat_2", name: "Shadow Bat", position: { ...P0 },
  symbol: "b", color: "#71717a", blocking: true, type: "hostile",
  health: 8, maxHealth: 8, attack: 5, defense: 1,
  dialogue: ["*screech*"],
};

// ─── World 2 NPCs ───────────────────────────────

const STAR_GUIDE: NPCDef = {
  id: "npc_star_guide", name: "Lyra, Star Guide", position: { ...P0 },
  symbol: "L", color: "#67e8f9", blocking: true, type: "friendly",
  health: 40, maxHealth: 40, attack: 4, defense: 6,
  dialogue: [
    "You crossed the Veil. Few from Ashford ever do.",
    "This realm fractures when the Conductor plays.",
    "Gather three Resonance Shards so we can open the Heart Chamber.",
  ],
  questId: "quest_shards",
};

const ARCHIVIST: NPCDef = {
  id: "npc_archivist", name: "Archivist Nox", position: { ...P0 },
  symbol: "N", color: "#c4b5fd", blocking: true, type: "friendly",
  health: 35, maxHealth: 35, attack: 3, defense: 5,
  dialogue: [
    "These halls remember every song ever silenced.",
    "Bring me a shard and I will attune your gear.",
    "The Conductor waits beyond the Storm Nexus.",
  ],
  questId: "quest_conductor",
};

const RIFT_STALKER_1: NPCDef = {
  id: "npc_rift_stalker_1", name: "Rift Stalker", position: { ...P0 },
  symbol: "ϟ", color: "#a78bfa", blocking: true, type: "hostile",
  health: 24, maxHealth: 24, attack: 10, defense: 4,
  dialogue: ["*crackling hiss*"], loot: [ITEMS.scroll_fireball],
};

const RIFT_STALKER_2: NPCDef = {
  id: "npc_rift_stalker_2", name: "Rift Stalker", position: { ...P0 },
  symbol: "ϟ", color: "#a78bfa", blocking: true, type: "hostile",
  health: 24, maxHealth: 24, attack: 10, defense: 4,
  dialogue: ["*hiss*"], loot: [ITEMS.gold_pile],
};

const NULL_SENTINEL_1: NPCDef = {
  id: "npc_null_sentinel_1", name: "Null Sentinel", position: { ...P0 },
  symbol: "Ω", color: "#93c5fd", blocking: true, type: "hostile",
  health: 34, maxHealth: 34, attack: 12, defense: 7,
  dialogue: ["UNWORTHY."], loot: [ITEMS.knight_armor],
};

const NULL_SENTINEL_2: NPCDef = {
  id: "npc_null_sentinel_2", name: "Null Sentinel", position: { ...P0 },
  symbol: "Ω", color: "#93c5fd", blocking: true, type: "hostile",
  health: 34, maxHealth: 34, attack: 12, defense: 7,
  dialogue: ["INTRUDER."], loot: [ITEMS.iron_shield],
};

const ECHO_WISP_1: NPCDef = {
  id: "npc_echo_wisp_1", name: "Echo Wisp", position: { ...P0 },
  symbol: "◌", color: "#22d3ee", blocking: true, type: "hostile",
  health: 16, maxHealth: 16, attack: 8, defense: 2,
  dialogue: ["...return the song..."], loot: [ITEMS.sapphire],
};

const ECHO_WISP_2: NPCDef = {
  id: "npc_echo_wisp_2", name: "Echo Wisp", position: { ...P0 },
  symbol: "◌", color: "#22d3ee", blocking: true, type: "hostile",
  health: 16, maxHealth: 16, attack: 8, defense: 2,
  dialogue: ["...hollow harmony..."], loot: [ITEMS.bone_charm],
};

const VEIL_HOUND: NPCDef = {
  id: "npc_veil_hound", name: "Veil Hound", position: { ...P0 },
  symbol: "h", color: "#fb7185", blocking: true, type: "hostile",
  health: 28, maxHealth: 28, attack: 11, defense: 5,
  dialogue: ["*warped growl*"], loot: [ITEMS.greater_health_potion],
};

const CONDUCTOR: NPCDef = {
  id: "npc_conductor", name: "The Conductor", position: { ...P0 },
  symbol: "𝄞", color: "#f472b6", blocking: true, type: "hostile",
  health: 90, maxHealth: 90, attack: 16, defense: 9,
  dialogue: ["THE FINAL MOVEMENT BEGINS."],
  loot: [ITEMS.shadow_blade, ITEMS.elixir_of_vigor],
};

// ─── ROOMS ───────────────────────────────────────

export function createRooms(): Record<string, Room> {
  const ROOMS: Record<string, Room> = {

  // 1. Starting area — the village
  village: {
    id: "village",
    name: "Ashford Village",
    width: 20,
    height: 14,
    tiles: makeGrid(20, 14, [
      "####################",
      "#..................#",
      "#..................#",
      "#..........##......#",
      "#..........##......#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "##########+#########",
    ]),
    entities: [],
    npcs: [GUARD, MERCHANT, OLD_WOMAN],
    items: [
      { item: ITEMS.bread, position: { ...P0 } },
      { item: ITEMS.rusty_dagger, position: { ...P0 } },
    ],
    exits: [
      { direction: "down", targetRoomId: "dungeon_hall", position: { x: 10, y: 13 } },
    ],
    ambiance: "town",
    discovered: true,
  },

  // 2. Upper dungeon — long corridor with rats
  dungeon_hall: {
    id: "dungeon_hall",
    name: "Dungeon Hall",
    width: 20,
    height: 14,
    tiles: makeGrid(20, 14, [
      "##########+#########",
      "#..................#",
      "#..##..............#",
      "#..##..............#",
      "#..................#",
      "#..............##..#",
      "#..............##..#",
      "#..................#",
      "#..................#",
      "#.....##...........#",
      "#.....##...........#",
      "#..................#",
      "#..................#",
      "#####+#######+######",
    ]),
    entities: [],
    npcs: [RAT_1, RAT_2, RAT_3, RAT_4],
    items: [
      { item: ITEMS.health_potion, position: { ...P0 } },
      { item: ITEMS.torch, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "village", position: { x: 10, y: 0 } },
      { direction: "down", targetRoomId: "flooded_passage", position: { x: 5, y: 13 } },
      { direction: "down", targetRoomId: "chapel_ruins", position: { x: 13, y: 13 } },
    ],
    ambiance: "dungeon",
    discovered: false,
  },

  // 3. Flooded underground passage — water hazards
  flooded_passage: {
    id: "flooded_passage",
    name: "Flooded Passage",
    width: 20,
    height: 14,
    tiles: makeGrid(20, 14, [
      "#####+##############",
      "#.......~~~........#",
      "#.......~~~........#",
      "#..................#",
      "#..~~..............#",
      "#..~~..............#",
      "#..............~~..#",
      "#..............~~..#",
      "#..................#",
      "#......~~~~........#",
      "#......~~~~........#",
      "#..................#",
      "#..................#",
      "#####+##############",
    ]),
    entities: [],
    npcs: [SPIDER_1, SPIDER_2, BAT_1],
    items: [
      { item: ITEMS.mushroom_stew, position: { ...P0 } },
      { item: ITEMS.scroll_light, position: { ...P0 } },
      { item: ITEMS.old_journal, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "dungeon_hall", position: { x: 5, y: 0 } },
      { direction: "down", targetRoomId: "deep_caves", position: { x: 5, y: 13 } },
    ],
    ambiance: "cave",
    discovered: false,
  },

  // 4. Chapel ruins — lore, a friendly NPC
  chapel_ruins: {
    id: "chapel_ruins",
    name: "Ruined Chapel",
    width: 18,
    height: 12,
    tiles: makeGrid(18, 12, [
      "#######+##########",
      "#................#",
      "#..####....####..#",
      "#..#..#....#..#..#",
      "#..#..#....#..#..#",
      "#..####....####..#",
      "#................#",
      "#................#",
      "#.......##.......#",
      "#.......##.......#",
      "#................#",
      "#######+##########",
    ]),
    entities: [],
    npcs: [HERMIT, BAT_2],
    items: [
      { item: ITEMS.health_potion, position: { ...P0 } },
      { item: ITEMS.silver_rapier, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "dungeon_hall", position: { x: 7, y: 0 } },
      { direction: "down", targetRoomId: "ossuary", position: { x: 7, y: 11 } },
    ],
    ambiance: "dungeon",
    discovered: false,
  },

  // 5. Deep caves — Elena is trapped here
  deep_caves: {
    id: "deep_caves",
    name: "Deep Caves",
    width: 18,
    height: 14,
    tiles: makeGrid(18, 14, [
      "#####+############",
      "#................#",
      "#................#",
      "#.....##.........#",
      "#.....##.........#",
      "#................#",
      "#........LL......#",
      "#........LL......#",
      "#................#",
      "#..##............#",
      "#..##............#",
      "#................#",
      "#................#",
      "##################",
    ]),
    entities: [],
    npcs: [SKELETON_1, SKELETON_2, ELENA],
    items: [
      { item: ITEMS.iron_sword, position: { ...P0 } },
      { item: ITEMS.locket, position: { ...P0 } },
      { item: ITEMS.greater_health_potion, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "flooded_passage", position: { x: 5, y: 0 } },
    ],
    ambiance: "cave",
    discovered: false,
  },

  // 6. Ossuary — bone-filled corridors, the Warden boss
  ossuary: {
    id: "ossuary",
    name: "The Ossuary",
    width: 18,
    height: 14,
    tiles: makeGrid(18, 14, [
      "#######+##########",
      "#................#",
      "#..##........##..#",
      "#..##........##..#",
      "#................#",
      "#......####......#",
      "#......#..#......#",
      "#......#..#......#",
      "#......####......#",
      "#................#",
      "#..##........##..#",
      "#..##........##..#",
      "#................#",
      "#######+##########",
    ]),
    entities: [],
    npcs: [WARDEN, WRAITH],
    items: [
      { item: ITEMS.elixir_of_vigor, position: { ...P0 } },
      { item: ITEMS.scroll_fireball, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "chapel_ruins", position: { x: 7, y: 0 } },
      { direction: "down", targetRoomId: "crypt", position: { x: 7, y: 13 } },
    ],
    ambiance: "boss",
    discovered: false,
  },

  // 7. The Crypt — final room, the piano, the ghost
  crypt: {
    id: "crypt",
    name: "The Crypt",
    width: 18,
    height: 14,
    tiles: makeGrid(18, 14, [
      "#######+##########",
      "#................#",
      "#................#",
      "#...##......##...#",
      "#...##......##...#",
      "#................#",
      "#.......CC.......#",
      "#.......CC.......#",
      "#................#",
      "#...##......##...#",
      "#...##......##...#",
      "#................#",
      "#................#",
      "#########+########",
    ]),
    entities: [],
    npcs: [GHOST],
    items: [
      { item: ITEMS.shadow_blade, position: { ...P0 } },
      { item: ITEMS.sapphire, position: { ...P0 } },
      { item: ITEMS.greater_health_potion, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "ossuary", position: { x: 7, y: 0 } },
      { direction: "down", targetRoomId: "world2_gateway", position: { x: 9, y: 13 } },
    ],
    ambiance: "forest",
    discovered: false,
  },

  // 8+. World 2 — the Veil Expanse
  world2_gateway: {
    id: "world2_gateway",
    name: "Veil Gate",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "##########+###########",
      "#....................#",
      "#....~~~~............#",
      "#....~~~~............#",
      "#....................#",
      "#........###.........#",
      "#........###.........#",
      "#....................#",
      "#..........C.........#",
      "#....................#",
      "#....###.............#",
      "#....###.............#",
      "#....................#",
      "######+######+########",
    ]),
    entities: [],
    npcs: [STAR_GUIDE, ECHO_WISP_1],
    items: [
      { item: ITEMS.greater_health_potion, position: { ...P0 } },
      { item: ITEMS.sapphire, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "crypt", position: { x: 10, y: 0 } },
      { direction: "down", targetRoomId: "world2_shard_fields", position: { x: 6, y: 13 } },
      { direction: "down", targetRoomId: "world2_fracture_halls", position: { x: 13, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_shard_fields: {
    id: "world2_shard_fields",
    name: "Shard Fields",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "######+###############",
      "#....................#",
      "#..##......##........#",
      "#..##......##........#",
      "#....................#",
      "#..............~~....#",
      "#..............~~....#",
      "#....................#",
      "#....C...............#",
      "#....................#",
      "#........###.........#",
      "#........###.........#",
      "#....................#",
      "##########+###########",
    ]),
    entities: [],
    npcs: [RIFT_STALKER_1, ECHO_WISP_2],
    items: [
      { item: ITEMS.gold_pile, position: { ...P0 } },
      { item: ITEMS.iron_sword, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_gateway", position: { x: 6, y: 0 } },
      { direction: "down", targetRoomId: "world2_mirror_lake", position: { x: 10, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_fracture_halls: {
    id: "world2_fracture_halls",
    name: "Fracture Halls",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "#############+#######",
      "#....................#",
      "#....####............#",
      "#....####............#",
      "#....................#",
      "#...........####.....#",
      "#...........####.....#",
      "#....................#",
      "#....~~..............#",
      "#....~~..............#",
      "#....................#",
      "#..............##....#",
      "#..............##....#",
      "######+#####+#########",
    ]),
    entities: [],
    npcs: [NULL_SENTINEL_1, RIFT_STALKER_2],
    items: [
      { item: ITEMS.knight_armor, position: { ...P0 } },
      { item: ITEMS.scroll_light, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_gateway", position: { x: 13, y: 0 } },
      { direction: "down", targetRoomId: "world2_obsidian_bridge", position: { x: 6, y: 13 } },
      { direction: "down", targetRoomId: "world2_celestial_archive", position: { x: 14, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_mirror_lake: {
    id: "world2_mirror_lake",
    name: "Mirror Lake",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "##########+###########",
      "#......~~~~~~........#",
      "#......~~~~~~........#",
      "#....................#",
      "#....####............#",
      "#....####............#",
      "#....................#",
      "#...........C........#",
      "#....................#",
      "#............####....#",
      "#............####....#",
      "#....................#",
      "#....................#",
      "######+#####+#########",
    ]),
    entities: [],
    npcs: [VEIL_HOUND, ECHO_WISP_1],
    items: [
      { item: ITEMS.sapphire, position: { ...P0 } },
      { item: ITEMS.greater_health_potion, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_shard_fields", position: { x: 10, y: 0 } },
      { direction: "down", targetRoomId: "world2_frozen_spine", position: { x: 6, y: 13 } },
      { direction: "down", targetRoomId: "world2_singing_grove", position: { x: 12, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_obsidian_bridge: {
    id: "world2_obsidian_bridge",
    name: "Obsidian Bridge",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "######+###############",
      "#........LL..........#",
      "#........LL..........#",
      "#....................#",
      "#....####............#",
      "#....####............#",
      "#....................#",
      "#.............####...#",
      "#.............####...#",
      "#....................#",
      "#....................#",
      "#....~~..............#",
      "#....~~..............#",
      "##########+###########",
    ]),
    entities: [],
    npcs: [NULL_SENTINEL_2, RIFT_STALKER_1],
    items: [
      { item: ITEMS.scroll_fireball, position: { ...P0 } },
      { item: ITEMS.bone_charm, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_fracture_halls", position: { x: 6, y: 0 } },
      { direction: "down", targetRoomId: "world2_storm_nexus", position: { x: 10, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_celestial_archive: {
    id: "world2_celestial_archive",
    name: "Celestial Archive",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "##########+###########",
      "#....................#",
      "#..####........####..#",
      "#..#..#........#..#..#",
      "#..####........####..#",
      "#....................#",
      "#...........C........#",
      "#....................#",
      "#....##........##....#",
      "#....##........##....#",
      "#....................#",
      "#....................#",
      "#....................#",
      "######+#####+#########",
    ]),
    entities: [],
    npcs: [ARCHIVIST, ECHO_WISP_2],
    items: [
      { item: ITEMS.elixir_of_vigor, position: { ...P0 } },
      { item: ITEMS.shadow_blade, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_fracture_halls", position: { x: 10, y: 0 } },
      { direction: "down", targetRoomId: "world2_storm_nexus", position: { x: 6, y: 13 } },
      { direction: "down", targetRoomId: "world2_singing_grove", position: { x: 12, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_frozen_spine: {
    id: "world2_frozen_spine",
    name: "Frozen Spine",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "######+###############",
      "#.........~~.........#",
      "#.........~~.........#",
      "#....................#",
      "#....####............#",
      "#....####............#",
      "#....................#",
      "#..............####..#",
      "#..............####..#",
      "#....................#",
      "#....C...............#",
      "#....................#",
      "#....................#",
      "##########+#+#########",
    ]),
    entities: [],
    npcs: [VEIL_HOUND, NULL_SENTINEL_1],
    items: [
      { item: ITEMS.greater_health_potion, position: { ...P0 } },
      { item: ITEMS.iron_shield, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_mirror_lake", position: { x: 6, y: 0 } },
      { direction: "down", targetRoomId: "world2_storm_nexus", position: { x: 10, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_singing_grove: {
    id: "world2_singing_grove",
    name: "Singing Grove",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "##########+#+#########",
      "#....................#",
      "#....####............#",
      "#....####............#",
      "#....................#",
      "#...........~~.......#",
      "#...........~~.......#",
      "#....................#",
      "#....C...............#",
      "#....................#",
      "#..........####......#",
      "#..........####......#",
      "#....................#",
      "##########+###########",
    ]),
    entities: [],
    npcs: [RIFT_STALKER_2, ECHO_WISP_1],
    items: [
      { item: ITEMS.mushroom_stew, position: { ...P0 } },
      { item: ITEMS.silver_rapier, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_mirror_lake", position: { x: 12, y: 0 } },
      { direction: "up", targetRoomId: "world2_celestial_archive", position: { x: 10, y: 0 } },
      { direction: "down", targetRoomId: "world2_heart_chamber", position: { x: 10, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_storm_nexus: {
    id: "world2_storm_nexus",
    name: "Storm Nexus",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "######+###+###+#######",
      "#....~~..............#",
      "#....~~..............#",
      "#....................#",
      "#...........####.....#",
      "#...........####.....#",
      "#....................#",
      "#....C...............#",
      "#....................#",
      "#..............LL....#",
      "#..............LL....#",
      "#....................#",
      "#....................#",
      "##########+###########",
    ]),
    entities: [],
    npcs: [NULL_SENTINEL_2, VEIL_HOUND],
    items: [
      { item: ITEMS.health_potion, position: { ...P0 } },
      { item: ITEMS.gold_pile, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_obsidian_bridge", position: { x: 10, y: 0 } },
      { direction: "up", targetRoomId: "world2_celestial_archive", position: { x: 6, y: 0 } },
      { direction: "up", targetRoomId: "world2_frozen_spine", position: { x: 14, y: 0 } },
      { direction: "down", targetRoomId: "world2_heart_chamber", position: { x: 10, y: 13 } },
    ],
    ambiance: "void",
    discovered: false,
  },

  world2_heart_chamber: {
    id: "world2_heart_chamber",
    name: "Heart Chamber",
    width: 22,
    height: 14,
    tiles: makeGrid2(22, 14, [
      "##########+#+#########",
      "#....................#",
      "#....####....####....#",
      "#....#..#....#..#....#",
      "#....####....####....#",
      "#....................#",
      "#...........C........#",
      "#....................#",
      "#....####....####....#",
      "#....#..#....#..#....#",
      "#....####....####....#",
      "#....................#",
      "#....................#",
      "######################",
    ]),
    entities: [],
    npcs: [CONDUCTOR],
    items: [
      { item: ITEMS.shadow_blade, position: { ...P0 } },
      { item: ITEMS.elixir_of_vigor, position: { ...P0 } },
    ],
    exits: [
      { direction: "up", targetRoomId: "world2_singing_grove", position: { x: 10, y: 0 } },
      { direction: "up", targetRoomId: "world2_storm_nexus", position: { x: 12, y: 0 } },
    ],
    ambiance: "void",
    discovered: false,
  },
  };

  for (const room of Object.values(ROOMS)) {
    placeEntities(room);
  }

  return ROOMS;
}
