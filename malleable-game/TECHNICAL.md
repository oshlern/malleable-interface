# Malleable Dungeon — Technical Description

6,200 lines of TypeScript across 31 files. React 18, Zustand, Tailwind, Web Audio API. No external game engine.

## Architecture

```
state/store.ts (1,957 lines) — single Zustand store owns all game state
engine/                       — pure logic modules (no React)
  types.ts                    — all interfaces
  audio.ts                    — Web Audio synth + music
  effects.ts                  — floating text + screen shake
  rng.ts                      — seeded Mulberry32 PRNG
  save.ts                     — localStorage serialization
  planner.ts                  — GPT-4o-mini strategic planner
content/                      — game data (rooms, items, quests)
components/                   — React rendering layer
  game/                       — canvas, keyboard, game over, victory
  hud/                        — panels (inventory, stats, quests, map, log, trade)
  command/                    — command bar with tab-completion
  menu/                       — pause menu
  shared/                     — seed display, ambiance theme hook
```

## Rendering

Single `<canvas>` in `GameCanvas.tsx`, redrawn every frame via `requestAnimationFrame`. Camera follows the player by translating the context. Tile rendering: 32px grid, each tile drawn as a monospace character. Fog of war via 6-tile radius flood from player position, updating `tile.visible` and `tile.discovered` flags per turn.

Visual effects layered on top: ambient particles (per-room type, sine-wave drift), player light halo (radial gradient, breathing), item glow, enemy threat aura, water/lava shimmer, vignette. Floating damage numbers and screen shake managed in `effects.ts` as module-level arrays, drawn in world-space after the main scene pass.

## State Management

One Zustand store, ~40 actions. State is mutated immutably via shallow copies (`{ ...state.player, stats: { ...stats } }`). Module-level helper functions (`updateVisibility`, `updateContext`, `moveNpcs`, `tickStatusEffects`) take `get`/`set` and are called at the end of actions to recompute derived state.

The `updateContext` function scans the player's surroundings each turn and builds two things: `contextActions` (keybindings shown in the action bar) and `predictedAction` (the Tab-completable ghost prompt). These are fully recomputed on every move, kill, pickup, and room transition.

## Predictive Action System

`updateContext` assigns a `PredictedAction` based on priority: item on tile > adjacent hostile > adjacent quest giver > low health + has potion. When autopilot is enabled, `getAutopilotAction()` returns a richer decision that also includes movement (via `chooseDirection`, a greedy pathfinder toward the highest-priority target in the room). The keyboard handler lets Tab's `keydown` repeat events fire without blocking, so holding Tab executes actions at the OS key repeat rate.

When the trade panel is open during autopilot, `autoTrade` takes over: sell junk, buy potions until 3, buy weapon/armor upgrades, close trade. Each Tab press executes one trade step.

## Audio

All sound is procedural via Web Audio API oscillators and noise buffers. No audio files.

**SFX** (12 sounds): each is a function that creates short-lived oscillator/noise nodes with gain envelopes. E.g., `sfxHit` = noise burst + low sawtooth; `sfxLevelUp` = 4-note ascending sine fanfare with triangle harmonics.

**Music**: per-ambiance phrase sets (town/dungeon/cave/boss/forest), each with 3 composed phrases using actual note frequencies in E minor. Inspired by Chopin's Prelude in E minor — descending chromatic melody lines over sustained sine-wave chord pads. A `playMusicPhrase` function picks the next phrase, schedules all its notes and chords via `oscillator.start(time)`, then sets a timeout for the next phrase. Phrase index cycles sequentially, resets on room change.

**Reactivity**: `setMusicReactivity` accepts `{ nearEnemies, inCombat, lowHealth }` flags. Low health adds a heartbeat (40Hz double-thump). Combat adds heavier bass and 40% faster phrase cycling. Nearby enemies add a sub-bass tension drone. Called from `updateContext` each turn.

## Seeded RNG

Mulberry32 PRNG in `rng.ts`. `setSeed(n)` sets the 32-bit state; `random()` returns [0,1). Used for entity placement: `placeEntities` flood-fills from exits to find reachable floor tiles, then picks random positions using the seeded RNG. Same seed = identical NPC/item layout. Seed displayed in health bar, pause menu, and game over screen with Balatro-style click-to-copy.

## Entity Placement

`placeEntities` in `rooms.ts`: BFS from all exit positions to find every walkable floor tile connected to at least one exit. 5x5 exclusion zone around each exit prevents doorway blocking. NPCs and items then pick from the remaining reachable tiles, tracked via a `Set<string>` to prevent collisions. Runs once at room creation time (driven by the seed).

## NPC AI

`moveNpcs` runs once per player turn. Hostile NPCs within 8 tiles and visible chase the player (greedy step along the axis with greater distance), stopping when adjacent (triggering combat). Friendly/merchant NPCs wander randomly with 20% probability. Both check walkability and avoid collisions with other NPCs and the player.

## Combat

Turn-based bump combat. Walking into a hostile sets `combatTarget`. Pressing E (or Tab in autopilot) calls `attackTarget`: damage = max(1, ATK - DEF). On kill: drop loot, grant XP, check level-up (1.5x XP curve, +10 HP/+2 ATK/+1 DEF), check quest progress. Enemy retaliates same turn: damage to player, screen shake, hurt SFX. Death sets `gameOver`.

## Status Effects

`StatusEffect` array in store. Spider hits have 30% chance to poison (2 dmg/turn, 5 turns). Adjacent lava has 15% chance to burn (3 dmg/turn, 3 turns). Entering the chapel grants blessed (1 heal/turn, 20 turns). `tickStatusEffects` runs at end of `move()`: applies damage/healing, decrements duration, removes expired effects, checks death. Displayed as colored pill badges in the health bar.

## Quest System

5 quests with `status: available → active → completed`. `quest_rats` tracks kills in `attackTarget`. Others trigger in `pickUpItem` (locket, treasure), `talkToNpc` (rescue), and `move` room transition (crypt). Quest giver NPCs have a `questId` field; when the player talks to them and the quest is available, it can be accepted. Completed quests grant XP + gold + optional item on return to giver.

## Save/Load

`save.ts` serializes player, rooms, quests, messages, turnCount, seed, activePanels, runStats, runEvents to `localStorage`. Auto-saves on every room transition. Manual save/load via pause menu buttons or `/save`, `/load` commands. On load, `updateVisibility` and `updateContext` are called to rebuild fog of war and context actions from the restored state.

## Adaptive HUD

`useAmbianceTheme` hook reads `rooms[currentRoomId].ambiance` and returns a `ThemeColors` object (panel background, border, accent color). Five themes: town (amber), dungeon (purple), cave (cyan), forest (emerald), boss (red). Applied to all HUD panels via template literal class composition.

## Run Statistics

`RunStats` tracks 13 counters (steps, attacks, damageDealt, etc.) incremented throughout store actions. `RunEvent` is a timestamped timeline of significant moments. Both displayed on the game over and victory screens as a stat grid + scrollable event log.

## Smart Planner

Optional GPT-4o-mini integration. Serializes the full game state (map layout, NPCs, items, inventory, quests, room graph, recent moves) into a prompt. Returns a JSON plan with steps (move/pickup/attack/talk/quest/explore). `getSmartAction` executes the current step. Re-plans every 100 turns, on completion, or when stuck (oscillation detection via recent position tracking).
