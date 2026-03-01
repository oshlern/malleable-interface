import React from "react";
import { useGameStore } from "../../state/store";
import { Brain, X, Check, Circle, Loader } from "lucide-react";

export function PlanPanel() {
  const smartPlan = useGameStore((s) => s.smartPlan);
  const plannerLoading = useGameStore((s) => s.plannerLoading);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const requestReplan = useGameStore((s) => s.requestReplan);

  return (
    <div className="bg-abyss/95 border border-arcane-500/20 rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-arcane-500/10">
        <div className="flex items-center gap-1.5">
          <Brain size={12} className="text-arcane-400" />
          <span className="text-[10px] font-game text-arcane-400/80 tracking-wider">
            SMART PLAN
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => requestReplan()}
            disabled={plannerLoading}
            className="text-[8px] font-ui px-1.5 py-0.5 rounded bg-arcane-500/10 text-arcane-400/60 hover:text-arcane-400 hover:bg-arcane-500/20 disabled:opacity-30 transition-all"
          >
            {plannerLoading ? "..." : "Replan"}
          </button>
          <button
            onClick={() => togglePanel("quests")}
            className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
        {plannerLoading && !smartPlan ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader size={12} className="text-arcane-400 animate-spin" />
            <span className="text-[10px] font-ui text-white/30">
              GPT is thinking...
            </span>
          </div>
        ) : !smartPlan ? (
          <p className="text-[10px] font-ui text-white/20 text-center py-3">
            No plan yet. Enable Smart Planner to begin.
          </p>
        ) : (
          <>
            <p className="text-[9px] font-ui text-arcane-400/60 px-1 mb-2">
              {smartPlan.summary}
            </p>
            {smartPlan.steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-1.5 px-2 py-1.5 rounded-md border ${
                  step.done
                    ? "border-heal-500/20 bg-heal-500/5 opacity-50"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {step.done ? (
                    <Check size={10} className="text-heal-400" />
                  ) : (
                    <Circle size={10} className="text-arcane-400/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-game px-1 py-0.5 rounded bg-arcane-500/10 text-arcane-400/60 uppercase">
                      {step.action}
                    </span>
                    {step.target && (
                      <span className="text-[9px] font-ui text-white/50 truncate">
                        {step.target}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-ui text-white/30 mt-0.5">
                    {step.reason}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-[8px] font-ui text-white/15 text-center pt-1">
              Generated at turn {smartPlan.generatedAtTurn}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
