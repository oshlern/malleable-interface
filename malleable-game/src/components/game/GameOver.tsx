import React from "react";
import { useGameStore } from "../../state/store";
import { Skull } from "lucide-react";

export function GameOver() {
  const gameOver = useGameStore((s) => s.gameOver);

  if (!gameOver) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm animate-fade-in">
      <div className="text-center">
        <Skull size={48} className="mx-auto mb-4 text-red-500 animate-pulse-slow" />
        <h2 className="font-game text-2xl text-red-400 mb-2">YOU DIED</h2>
        <p className="font-ui text-sm text-white/40 mb-6">
          The dungeon claims another soul...
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 font-game text-xs text-arcane-400 border border-arcane-500/40 rounded-lg hover:bg-arcane-500/10 transition-colors"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
