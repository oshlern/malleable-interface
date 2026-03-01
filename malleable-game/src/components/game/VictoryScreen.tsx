import React from "react";
import { useGameStore } from "../../state/store";
import { SeedDisplay } from "../shared/SeedDisplay";
import type { RunEvent } from "../../engine/types";

const eventColor: Record<RunEvent["type"], string> = {
  combat: "text-red-400",
  loot: "text-amber-400",
  quest: "text-arcane-400",
  explore: "text-emerald-400",
  death: "text-red-500",
};

export function VictoryScreen() {
  const victory = useGameStore((s) => s.victory);
  const seed = useGameStore((s) => s.seed);
  const newGame = useGameStore((s) => s.newGame);
  const stats = useGameStore((s) => s.player.stats);
  const turnCount = useGameStore((s) => s.turnCount);
  const runStats = useGameStore((s) => s.runStats);
  const runEvents = useGameStore((s) => s.runEvents);

  if (!victory) return null;

  const statEntries: [string, number][] = [
    ["Turns", turnCount],
    ["Level", stats.level],
    ["Enemies Killed", runStats.enemiesKilled],
    ["Quests Completed", runStats.questsCompleted],
    ["Items Found", runStats.itemsPickedUp],
    ["Gold Earned", runStats.goldEarned],
    ["Steps Taken", runStats.steps],
    ["Damage Dealt", runStats.damageDealt],
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm animate-fade-in">
      <div className="text-center bg-abyss/80 border border-arcane-500/20 rounded-2xl px-8 py-6 shadow-2xl shadow-arcane-500/10 max-w-md w-full">
        <p className="text-4xl mb-3">♪</p>
        <h2 className="font-game text-2xl text-arcane-400 mb-1">
          THE NOCTURNE PLAYS
        </h2>
        <p className="font-ui text-sm text-white/40 mb-4">
          The dead find peace. The dungeon sleeps.
        </p>

        <div className="flex items-center justify-center gap-4 text-[10px] font-ui text-white/25 mb-5">
          <span>Turn {turnCount}</span>
          <span>·</span>
          <span>Level {stats.level}</span>
          <span>·</span>
          <span>{stats.gold}g</span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-left mb-4 px-2">
          {statEntries.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between font-ui text-[11px]"
            >
              <span className="text-white/30">{label}</span>
              <span className="text-white/70 tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        {runEvents.length > 0 && (
          <div className="mb-4 px-2">
            <p className="font-ui text-[10px] text-white/25 mb-1 text-left">
              Timeline
            </p>
            <div className="max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-px text-left">
              {runEvents.map((ev, i) => (
                <div
                  key={i}
                  className={`font-ui text-[10px] ${eventColor[ev.type]}`}
                >
                  <span className="text-white/20 mr-1.5">T{ev.turn}</span>
                  {ev.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center mb-5">
          <SeedDisplay seed={seed} size="md" />
        </div>

        <button
          onClick={() => newGame()}
          className="px-6 py-2.5 font-game text-[10px] text-arcane-400 border border-arcane-500/40 rounded-lg hover:bg-arcane-500/10 transition-colors"
        >
          NEW ADVENTURE
        </button>
      </div>
    </div>
  );
}
