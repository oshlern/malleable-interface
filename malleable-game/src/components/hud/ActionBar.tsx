import React from "react";
import { useGameStore } from "../../state/store";

export function ActionBar() {
  const contextActions = useGameStore((s) => s.contextActions);
  const predictedAction = useGameStore((s) => s.predictedAction);
  const combatTarget = useGameStore((s) => s.combatTarget);

  return (
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

      <div className="flex items-center gap-1.5 text-[9px] font-ui text-white/20">
        <kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px]">/</kbd>
        <span>cmd</span>
      </div>
    </div>
  );
}
