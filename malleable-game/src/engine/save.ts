import type { GameStore } from "../state/store";

const SAVE_KEY = "jelly_dungeon_save";

type SaveData = Pick<
  GameStore,
  | "player"
  | "currentRoomId"
  | "rooms"
  | "quests"
  | "messages"
  | "turnCount"
  | "seed"
  | "worldIndex"
  | "worldOneComplete"
  | "autopilotStepIntervalMs"
  | "activePanels"
  | "gameOver"
  | "runStats"
  | "runEvents"
>;

export function saveGame(store: GameStore): void {
  const data: SaveData = {
    player: store.player,
    currentRoomId: store.currentRoomId,
    rooms: store.rooms,
    quests: store.quests,
    messages: store.messages,
    turnCount: store.turnCount,
    seed: store.seed,
    worldIndex: store.worldIndex,
    worldOneComplete: store.worldOneComplete,
    autopilotStepIntervalMs: store.autopilotStepIntervalMs,
    activePanels: store.activePanels,
    gameOver: store.gameOver,
    runStats: store.runStats,
    runEvents: store.runEvents,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
