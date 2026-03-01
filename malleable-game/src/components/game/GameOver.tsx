import React from "react";
import { useGameStore } from "../../state/store";
import { Skull } from "lucide-react";

export function GameOver() {
  const gameOver = useGameStore((s) => s.gameOver);
  const seed = useGameStore((s) => s.seed);
  const newGame = useGameStore((s) => s.newGame);

  if (!gameOver) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm animate-fade-in">
      <div className="text-center">
        <Skull size={48} className="mx-auto mb-4 text-red-500 animate-pulse-slow" />
        <h2 className="font-game text-2xl text-red-400 mb-2">YOU DIED</h2>
        <p className="font-ui text-sm text-white/40 mb-6">
          The dungeon claims another soul...
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => newGame(seed)}
            className="px-6 py-2 font-game text-xs text-arcane-400 border border-arcane-500/40 rounded-lg hover:bg-arcane-500/10 transition-colors"
          >
            RETRY (same map)
          </button>
          <button
            onClick={() => newGame()}
            className="px-6 py-2 font-game text-xs text-ember-400 border border-ember-500/40 rounded-lg hover:bg-ember-500/10 transition-colors"
          >
            NEW MAP
          </button>
        </div>
        <p className="font-ui text-[9px] text-white/15 mt-4">
          seed: {seed}
        </p>
      </div>
    </div>
  );
}
