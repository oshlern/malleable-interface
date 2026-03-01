import React from "react";
import { useGameStore } from "../../state/store";
import { Skull } from "lucide-react";
import { SeedDisplay } from "../shared/SeedDisplay";

export function GameOver() {
  const gameOver = useGameStore((s) => s.gameOver);
  const seed = useGameStore((s) => s.seed);
  const newGame = useGameStore((s) => s.newGame);
  const stats = useGameStore((s) => s.player.stats);
  const turnCount = useGameStore((s) => s.turnCount);

  if (!gameOver) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm animate-fade-in">
      <div className="text-center bg-abyss/80 border border-white/10 rounded-2xl px-8 py-6 shadow-2xl shadow-red-500/5">
        <Skull size={48} className="mx-auto mb-4 text-red-500 animate-pulse-slow" />
        <h2 className="font-game text-2xl text-red-400 mb-1">YOU DIED</h2>
        <p className="font-ui text-sm text-white/40 mb-4">
          The dungeon claims another soul...
        </p>

        <div className="flex items-center justify-center gap-4 text-[10px] font-ui text-white/25 mb-5">
          <span>Turn {turnCount}</span>
          <span>·</span>
          <span>Level {stats.level}</span>
          <span>·</span>
          <span>{stats.gold}g</span>
        </div>

        <div className="flex justify-center mb-5">
          <SeedDisplay seed={seed} size="md" />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => newGame(seed)}
            className="px-5 py-2.5 font-game text-[10px] text-arcane-400 border border-arcane-500/40 rounded-lg hover:bg-arcane-500/10 transition-colors"
          >
            RETRY SEED
          </button>
          <button
            onClick={() => newGame()}
            className="px-5 py-2.5 font-game text-[10px] text-ember-400 border border-ember-500/40 rounded-lg hover:bg-ember-500/10 transition-colors"
          >
            NEW RUN
          </button>
        </div>
      </div>
    </div>
  );
}
