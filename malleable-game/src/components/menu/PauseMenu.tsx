import React, { useState } from "react";
import { useGameStore } from "../../state/store";
import { SeedDisplay } from "../shared/SeedDisplay";
import { X, Play, RotateCcw, Hash } from "lucide-react";

export function PauseMenu() {
  const menuOpen = useGameStore((s) => s.menuOpen);
  const setMenuOpen = useGameStore((s) => s.setMenuOpen);
  const seed = useGameStore((s) => s.seed);
  const newGame = useGameStore((s) => s.newGame);
  const turnCount = useGameStore((s) => s.turnCount);
  const stats = useGameStore((s) => s.player.stats);

  const [seedInput, setSeedInput] = useState("");
  const [showSeedInput, setShowSeedInput] = useState(false);

  if (!menuOpen) return null;

  const handleSeededStart = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(seedInput, 10);
    if (!isNaN(val)) {
      newGame(val);
      setMenuOpen(false);
      setSeedInput("");
      setShowSeedInput(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-void/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-abyss/95 border border-white/10 rounded-2xl w-[320px] overflow-hidden shadow-2xl shadow-arcane-500/5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-game text-sm text-arcane-400 tracking-wider">
            PAUSED
          </h2>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-ui text-white/30 px-1">
            <span>Turn {turnCount}</span>
            <span>Level {stats.level}</span>
            <span>{stats.gold}g</span>
          </div>

          <div className="flex justify-center py-2">
            <SeedDisplay seed={seed} size="md" />
          </div>

          <button
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-arcane-500/10 border border-white/5 hover:border-arcane-500/30 transition-all group"
          >
            <Play size={16} className="text-arcane-400" />
            <span className="font-ui text-sm text-white/70 group-hover:text-white/90">
              Resume
            </span>
            <kbd className="ml-auto text-[8px] font-game text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
              Esc
            </kbd>
          </button>

          <button
            onClick={() => {
              newGame();
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-ember-500/10 border border-white/5 hover:border-ember-500/30 transition-all group"
          >
            <RotateCcw size={16} className="text-ember-400" />
            <span className="font-ui text-sm text-white/70 group-hover:text-white/90">
              New Game
            </span>
          </button>

          <button
            onClick={() => setShowSeedInput(!showSeedInput)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-frost-500/10 border border-white/5 hover:border-frost-500/30 transition-all group"
          >
            <Hash size={16} className="text-frost-400" />
            <span className="font-ui text-sm text-white/70 group-hover:text-white/90">
              Set Seed
            </span>
          </button>

          {showSeedInput && (
            <form onSubmit={handleSeededStart} className="animate-slide-up">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder="Enter seed..."
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-lg text-white/80 placeholder:text-white/20 outline-none focus:border-frost-500/40"
                />
                <button
                  type="submit"
                  disabled={!seedInput || isNaN(parseInt(seedInput, 10))}
                  className="px-4 py-2 text-xs font-game text-frost-400 bg-frost-500/10 border border-frost-500/30 rounded-lg hover:bg-frost-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  GO
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/5">
          <p className="text-[8px] font-ui text-white/15 text-center">
            WASD move · E interact · Tab predict · P autopilot · / command
          </p>
        </div>
      </div>
    </div>
  );
}
