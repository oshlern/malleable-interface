import type { QuestDef } from "../engine/types";
import { ITEMS } from "./items";

export const QUESTS: Record<string, QuestDef> = {
  quest_rats: {
    id: "quest_rats",
    name: "Rat Infestation",
    description:
      "The town guard wants you to clear out the giant rats infesting the dungeon.",
    objective: "Defeat 3 Giant Rats",
    status: "available",
    progress: 0,
    target: 3,
    reward: { xp: 50, gold: 30, item: ITEMS.iron_sword },
    giverNpcId: "npc_guard",
  },
  quest_treasure: {
    id: "quest_treasure",
    name: "Lost Treasure",
    description:
      "Rumors speak of gold hidden in the deepest caves. Find it and return.",
    objective: "Find the Gold Pile in the Deep Caves",
    status: "available",
    progress: 0,
    target: 1,
    reward: { xp: 80, gold: 100 },
    giverNpcId: "npc_merchant",
  },
};
