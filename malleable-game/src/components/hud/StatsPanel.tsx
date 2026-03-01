import React from "react";
import { useGameStore } from "../../state/store";
import { User, X, BarChart3 } from "lucide-react";
import { useAmbianceTheme } from "../shared/AmbianceTheme";

const BAR_COLORS = [
  "bg-ember-400",
  "bg-frost-400",
  "bg-arcane-400",
  "bg-heal-400",
  "bg-yellow-400",
  "bg-red-400",
  "bg-amber-400",
  "bg-cyan-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-sky-400",
];

export function StatsPanel() {
  const stats = useGameStore((s) => s.player.stats);
  const actionCounts = useGameStore((s) => s.runStats.actionCounts);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const theme = useAmbianceTheme();

  const entries: [string, number | string, string][] = [
    ["Health", `${stats.health}/${stats.maxHealth}`, "text-red-400"],
    ["Attack", stats.attack, "text-ember-400"],
    ["Defense", stats.defense, "text-frost-400"],
    ["Speed", stats.speed, "text-heal-400"],
    ["Level", stats.level, "text-arcane-400"],
    ["XP", `${stats.xp}/${stats.xpToNext}`, "text-arcane-400"],
    ["Gold", stats.gold, "text-yellow-400"],
  ];

  const sorted = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 0;

  return (
    <div className={`${theme.panelBg} border ${theme.panelBorder} rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden flex flex-col max-h-full`}>
      <div className={`flex items-center justify-between px-3 py-2 ${theme.headerBg} flex-shrink-0`}>
        <div className="flex items-center gap-1.5">
          <User size={12} className={theme.accentColor} />
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

      <div className="p-2 space-y-1 min-h-0 flex-1 overflow-y-auto">
        {entries.map(([label, value, color]) => (
          <div
            key={label}
            className="flex items-center justify-between px-2 py-1"
          >
            <span className="text-[10px] font-ui text-white/40">{label}</span>
            <span className={`text-[10px] font-ui ${color}`}>{value}</span>
          </div>
        ))}

        {sorted.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 border-t border-white/5">
              <BarChart3 size={10} className={theme.accentColor} />
              <span className="text-[9px] font-game text-white/40 tracking-wider">ACTIONS</span>
            </div>
            {sorted.map(([action, count], i) => (
              <div key={action} className="px-2 py-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] font-ui text-white/40 truncate">{action}</span>
                  <span className="text-[8px] font-ui text-white/30 ml-1 flex-shrink-0">{count}</span>
                </div>
                <div className="h-[4px] w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} opacity-70`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
