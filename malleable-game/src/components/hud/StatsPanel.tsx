import React from "react";
import { useGameStore } from "../../state/store";
import { User, X } from "lucide-react";

export function StatsPanel() {
  const stats = useGameStore((s) => s.player.stats);
  const togglePanel = useGameStore((s) => s.togglePanel);

  const entries: [string, number | string, string][] = [
    ["Health", `${stats.health}/${stats.maxHealth}`, "text-red-400"],
    ["Attack", stats.attack, "text-ember-400"],
    ["Defense", stats.defense, "text-frost-400"],
    ["Speed", stats.speed, "text-heal-400"],
    ["Level", stats.level, "text-arcane-400"],
    ["XP", `${stats.xp}/${stats.xpToNext}`, "text-arcane-400"],
    ["Gold", stats.gold, "text-yellow-400"],
  ];

  return (
    <div className="bg-abyss/95 border border-white/5 rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-arcane-400" />
          <span className="text-[10px] font-game text-white/60 tracking-wider">
            STATS
          </span>
        </div>
        <button
          onClick={() => togglePanel("stats")}
          className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
        >
          <X size={12} />
        </button>
      </div>

      <div className="p-2 space-y-1">
        {entries.map(([label, value, color]) => (
          <div
            key={label}
            className="flex items-center justify-between px-2 py-1"
          >
            <span className="text-[10px] font-ui text-white/40">{label}</span>
            <span className={`text-[10px] font-ui ${color}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
