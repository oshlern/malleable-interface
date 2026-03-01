import React, { useState, useEffect } from "react";
import { useGameStore } from "../../state/store";
import { Brain, X, Check, Circle } from "lucide-react";

const THINKING_PHASES = [
  "Analyzing game state...",
  "Evaluating quests...",
  "Scanning threats...",
  "Charting routes...",
  "Forming strategy...",
];

function ThinkingIndicator() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % THINKING_PHASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-1.5 rounded-md border border-arcane-500/20 bg-arcane-500/5 overflow-hidden">
      <div className="relative h-1.5 bg-arcane-500/10 overflow-hidden">
        <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-arcane-500/60 to-transparent animate-progress-indeterminate" />
      </div>
      <div className="px-2.5 py-2 flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <Brain size={14} className="text-arcane-400 animate-pulse" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-arcane-500 rounded-full animate-ping opacity-40" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-ui text-arcane-400/80 block animate-fade-in" key={phase}>
            {THINKING_PHASES[phase]}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PlanPanel() {
  const smartPlan = useGameStore((s) => s.smartPlan);
  const plannerLoading = useGameStore((s) => s.plannerLoading);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const requestReplan = useGameStore((s) => s.requestReplan);

  return (
    <div className="bg-abyss/95 border border-arcane-500/20 rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden flex flex-col max-h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-arcane-500/10 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Brain size={12} className={plannerLoading ? "text-arcane-400 animate-pulse" : "text-arcane-400"} />
          <span className="text-[10px] font-game text-arcane-400/80 tracking-wider">
            SMART PLAN
          </span>
          {plannerLoading && (
            <span className="text-[7px] font-ui text-arcane-400/50 animate-pulse ml-0.5">
              ●
            </span>
          )}
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
            onClick={() => togglePanel("plan")}
            className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="p-2 space-y-1.5 min-h-0 flex-1 overflow-y-auto">
        {plannerLoading && <ThinkingIndicator />}
        {!smartPlan && !plannerLoading && (
          <p className="text-[10px] font-ui text-white/20 text-center py-3">
            No plan yet. Enable Smart Planner to begin.
          </p>
        )}
        {smartPlan && (
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
                  <p className="text-[7px] font-ui text-white/25 mt-0.5 leading-tight">
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
