import React from "react";
import { useGameStore } from "../../state/store";
import { Scroll, X, Check, Circle } from "lucide-react";
import { useAmbianceTheme } from "../shared/AmbianceTheme";

export function QuestPanel() {
  const quests = useGameStore((s) => s.quests);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const theme = useAmbianceTheme();

  const activeQuests = Object.values(quests).filter(
    (q) => q.status === "active" || q.status === "completed",
  );

  return (
    <div className={`${theme.panelBg} border ${theme.panelBorder} rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2 ${theme.headerBg}`}>
        <div className="flex items-center gap-1.5">
          <Scroll size={12} className={theme.accentColor} />
          <span className="text-[10px] font-game text-white/60 tracking-wider">
            QUESTS
          </span>
        </div>
        <button
          onClick={() => togglePanel("quests")}
          className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
        >
          <X size={12} />
        </button>
      </div>

      <div className="p-2 space-y-2 max-h-[180px] overflow-y-auto">
        {activeQuests.length === 0 ? (
          <p className="text-[10px] font-ui text-white/20 text-center py-3">
            No active quests
          </p>
        ) : (
          activeQuests.map((quest) => (
            <div
              key={quest.id}
              className={`px-2 py-1.5 rounded-md border ${
                quest.status === "completed"
                  ? "border-heal-500/30 bg-heal-500/5"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {quest.status === "completed" ? (
                  <Check size={10} className="text-heal-400" />
                ) : (
                  <Circle size={10} className="text-yellow-400/60" />
                )}
                <span className="text-[10px] font-ui text-white/70 font-medium">
                  {quest.name}
                </span>
              </div>
              <p className="text-[9px] font-ui text-white/30 ml-4">
                {quest.objective}
              </p>
              <div className="ml-4 mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quest.status === "completed"
                        ? "bg-heal-500"
                        : "bg-yellow-500"
                    }`}
                    style={{
                      width: `${(quest.progress / quest.target) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[8px] text-white/30">
                  {quest.progress}/{quest.target}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
