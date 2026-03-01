import React from "react";
import { useGameStore } from "../../state/store";
import { Heart, Shield, Sword, Zap } from "lucide-react";

export function HealthBar() {
  const stats = useGameStore((s) => s.player.stats);
  const healthPct = (stats.health / stats.maxHealth) * 100;
  const xpPct = (stats.xp / stats.xpToNext) * 100;

  const healthColor =
    healthPct > 60 ? "bg-heal-500" : healthPct > 30 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-abyss/90 border-b border-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 flex-1">
        <Heart size={14} className="text-red-400" />
        <div className="flex-1 max-w-[140px]">
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full ${healthColor} rounded-full transition-all duration-300`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
          <span className="text-[9px] font-ui text-white/40 mt-0.5 block">
            {stats.health}/{stats.maxHealth}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-ui text-white/50">
        <span className="flex items-center gap-1">
          <Sword size={10} className="text-ember-400" />
          {stats.attack}
        </span>
        <span className="flex items-center gap-1">
          <Shield size={10} className="text-frost-400" />
          {stats.defense}
        </span>
        <span className="flex items-center gap-1">
          <Zap size={10} className="text-arcane-400" />
          Lv.{stats.level}
        </span>
      </div>

      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-[9px] font-ui text-yellow-400/60">
          {stats.gold}g
        </span>
        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-arcane-500/60 rounded-full transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
