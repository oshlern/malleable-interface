export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  type: "floor" | "wall" | "door" | "chest" | "stairs" | "water" | "lava";
  walkable: boolean;
  symbol: string;
  color: string;
  bgColor?: string;
  discovered: boolean;
  visible: boolean;
}

export type Direction = "up" | "down" | "left" | "right";

export interface GameEntity {
  id: string;
  name: string;
  position: Position;
  symbol: string;
  color: string;
  blocking: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  symbol: string;
  color: string;
  type: "weapon" | "armor" | "potion" | "key" | "scroll" | "food" | "treasure";
  description: string;
  effect?: ItemEffect;
  value: number;
  stackable: boolean;
}

export interface ItemEffect {
  stat: "health" | "maxHealth" | "attack" | "defense" | "speed";
  amount: number;
  duration?: number;
}

export interface InventorySlot {
  item: ItemDef;
  quantity: number;
  equipped: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
}

export interface NPCDef extends GameEntity {
  type: "friendly" | "hostile" | "merchant";
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  dialogue: string[];
  loot?: ItemDef[];
  questId?: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: "available" | "active" | "completed" | "failed";
  progress: number;
  target: number;
  reward: { xp: number; gold: number; item?: ItemDef };
  giverNpcId: string;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  entities: GameEntity[];
  npcs: NPCDef[];
  items: { item: ItemDef; position: Position }[];
  exits: { direction: Direction; targetRoomId: string; position: Position }[];
  ambiance: "dungeon" | "cave" | "forest" | "town" | "boss";
  discovered: boolean;
}

export interface ContextAction {
  key: string;
  label: string;
  description: string;
  action: () => void;
  priority: number;
  icon?: string;
}

export interface PredictedAction {
  label: string;
  confidence: number;
  action: () => void;
  description: string;
}

export interface GameMessage {
  id: string;
  text: string;
  type: "info" | "combat" | "loot" | "quest" | "system" | "danger";
  timestamp: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  icon: string;
  color: string;
  turnsRemaining: number;
  damagePerTurn?: number;
  healPerTurn?: number;
}

export type HudPanel = "inventory" | "stats" | "quests" | "map" | "log" | "plan";

export interface PlanStep {
  action: "move" | "pickup" | "attack" | "talk" | "quest" | "use_item" | "explore";
  target?: string;
  room?: string;
  reason: string;
  done: boolean;
}

export interface SmartPlan {
  steps: PlanStep[];
  summary: string;
  generatedAtTurn: number;
}

export interface RunStats {
  steps: number;
  attacks: number;
  damageDealt: number;
  damageTaken: number;
  itemsPickedUp: number;
  itemsUsed: number;
  npcsTalkedTo: number;
  questsAccepted: number;
  questsCompleted: number;
  roomsDiscovered: number;
  enemiesKilled: number;
  goldEarned: number;
  healsUsed: number;
}

export interface RunEvent {
  turn: number;
  text: string;
  type: "combat" | "loot" | "quest" | "explore" | "death";
}
