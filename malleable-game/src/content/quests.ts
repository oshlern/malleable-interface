import type { QuestDef } from "../engine/types";
import { ITEMS } from "./items";

export const QUESTS: Record<string, QuestDef> = {
  quest_rats: {
    id: "quest_rats",
    name: "The Vermin Below",
    description:
      "Captain Aldric's soldiers won't enter the dungeon. Clear the giant rats so they can search for his daughter.",
    objective: "Defeat 4 Giant Rats",
    status: "available",
    progress: 0,
    target: 4,
    reward: { xp: 60, gold: 40, item: ITEMS.iron_shield },
    giverNpcId: "npc_guard",
  },

  quest_locket: {
    id: "quest_locket",
    name: "The Tarnished Locket",
    description:
      "Grandmother Voss lost her granddaughter's locket somewhere in the caves below. It's all she has left.",
    objective: "Find the Tarnished Locket",
    status: "available",
    progress: 0,
    target: 1,
    reward: { xp: 80, gold: 60 },
    giverNpcId: "npc_old_woman",
  },

  quest_rescue: {
    id: "quest_rescue",
    name: "No One Left Behind",
    description:
      "Elena, Captain Aldric's daughter, is injured in the deep caves. She found a journal that may explain the darkness spreading through the dungeon.",
    objective: "Find Elena in the Deep Caves",
    status: "available",
    progress: 0,
    target: 1,
    reward: { xp: 100, gold: 50, item: ITEMS.old_journal },
    giverNpcId: "npc_guard",
  },

  quest_crypt: {
    id: "quest_crypt",
    name: "The Silent Nocturne",
    description:
      "Brother Cassius believes the restless dead can be calmed if someone plays the piano in the crypt. But first, the Crypt Key must be recovered from the Warden in the Ossuary.",
    objective: "Defeat the Warden and reach the Crypt",
    status: "available",
    progress: 0,
    target: 1,
    reward: { xp: 200, gold: 100, item: ITEMS.shadow_blade },
    giverNpcId: "npc_hermit",
  },

  quest_treasure: {
    id: "quest_treasure",
    name: "Buried Fortune",
    description:
      "Maren has heard rumors of treasure hidden in the deepest caves. Find it and she'll give you a fair cut.",
    objective: "Find treasure in the Deep Caves",
    status: "available",
    progress: 0,
    target: 1,
    reward: { xp: 80, gold: 100 },
    giverNpcId: "npc_merchant",
  },

  quest_shards: {
    id: "quest_shards",
    name: "Resonance Fragments",
    description:
      "Lyra believes three Resonance Shards must be gathered from the Veil Expanse to stabilize the path to the Heart Chamber.",
    objective: "Collect 3 Resonance Shards",
    status: "available",
    progress: 0,
    target: 3,
    reward: { xp: 220, gold: 150, item: ITEMS.elixir_of_vigor },
    giverNpcId: "npc_star_guide",
  },

  quest_conductor: {
    id: "quest_conductor",
    name: "Final Movement",
    description:
      "Archivist Nox asks you to silence the Conductor in the Heart Chamber before the Veil collapses into Ashford.",
    objective: "Defeat the Conductor in the Heart Chamber",
    status: "available",
    progress: 0,
    target: 1,
    reward: { xp: 500, gold: 400, item: ITEMS.shadow_blade },
    giverNpcId: "npc_archivist",
  },
};
