import React from "react";
import { useGameStore } from "../../state/store";
import { Loader2, HelpCircle } from "lucide-react";

export function ActionBar() {
  const contextActions = useGameStore((s) => s.contextActions);
  const predictedAction = useGameStore((s) => s.predictedAction);
  const combatTarget = useGameStore((s) => s.combatTarget);
  const autopilot = useGameStore((s) => s.autopilot);
  const toggleAutopilot = useGameStore((s) => s.toggleAutopilot);
  const smartPlanner = useGameStore((s) => s.smartPlanner);
  const toggleSmartPlanner = useGameStore((s) => s.toggleSmartPlanner);
  const plannerLoading = useGameStore((s) => s.plannerLoading);
  const hint = useGameStore((s) => s.hint);
  const hintLoading = useGameStore((s) => s.hintLoading);
  const requestHint = useGameStore((s) => s.requestHint);

  return (
    <div className="relative">
      {(hint || hintLoading) && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/25 rounded-full backdrop-blur-sm">
            {hintLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-amber-400/60" />
                <span className="text-[10px] font-ui text-amber-400/60">Thinking...</span>
              </div>
            ) : (
              <span className="text-[10px] font-ui text-amber-300/90">{hint}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 bg-abyss/90 border-t border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {contextActions.map((action, i) => (
            <button
              key={i}
              onClick={action.action}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-arcane-500/40 rounded-md transition-all group"
            >
              <kbd className="text-[9px] font-game text-arcane-400 bg-arcane-500/10 px-1 py-0.5 rounded">
                {action.key}
              </kbd>
              <span className="text-[10px] font-ui text-white/70 group-hover:text-white/90">
                {action.label}
              </span>
            </button>
          ))}

          {combatTarget && (
            <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-md animate-pulse-slow">
              <span className="text-[10px] font-ui text-red-400">
                COMBAT: {combatTarget.name} ({combatTarget.health}/{combatTarget.maxHealth})
              </span>
            </div>
          )}
        </div>

        {predictedAction && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-arcane-500/10 border border-arcane-500/20 rounded-md">
              <kbd className="text-[9px] font-game text-arcane-400 bg-arcane-500/20 px-1 py-0.5 rounded">
                Tab
              </kbd>
              <span className="text-[10px] font-ui text-arcane-400/80">
                {predictedAction.label}
              </span>
              <span className="text-[8px] font-ui text-white/20">
                {Math.round(predictedAction.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={requestHint}
            disabled={hintLoading}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-ui transition-all ${
              !predictedAction && !autopilot
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse-slow"
                : "bg-white/5 border-white/10 text-white/30 hover:text-amber-400 hover:border-amber-500/30"
            } disabled:opacity-40`}
          >
            <kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px] font-game">H</kbd>
            <HelpCircle size={12} />
          </button>
          <button
            onClick={toggleSmartPlanner}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-ui transition-all ${
              smartPlanner
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
            }`}
          >
            <kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px] font-game">G</kbd>
            <span>
              {plannerLoading ? "Planning..." : smartPlanner ? "GPT ON" : "Smart"}
            </span>
          </button>
          <button
            onClick={toggleAutopilot}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-ui transition-all ${
              autopilot
                ? "bg-arcane-500/20 border-arcane-500/40 text-arcane-400 animate-glow"
                : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
            }`}
          >
            <kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px] font-game">P</kbd>
            <span>{autopilot ? "AUTOPILOT ON" : "Autopilot"}</span>
          </button>
          <div className="flex items-center gap-1.5 text-[9px] font-ui text-white/20">
            <kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px]">/</kbd>
            <span>cmd</span>
          </div>
        </div>
      </div>
    </div>
  );
}
