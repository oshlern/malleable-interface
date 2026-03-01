import React, { useRef, useEffect } from "react";
import { useGameStore } from "../../state/store";
import { MessageSquare, X } from "lucide-react";
import { useAmbianceTheme } from "../shared/AmbianceTheme";

const TYPE_COLORS: Record<string, string> = {
  info: "text-white/50",
  combat: "text-ember-400",
  loot: "text-yellow-400",
  quest: "text-arcane-400",
  system: "text-frost-400",
  danger: "text-red-400",
};

export function LogPanel() {
  const messages = useGameStore((s) => s.messages);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const theme = useAmbianceTheme();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={`${theme.panelBg} border ${theme.panelBorder} rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden flex flex-col max-h-full`}>
      <div className={`flex items-center justify-between px-3 py-2 ${theme.headerBg} flex-shrink-0`}>
        <div className="flex items-center gap-1.5">
          <MessageSquare size={12} className={theme.accentColor} />
          <span className="text-[10px] font-game text-white/60 tracking-wider">
            LOG
          </span>
        </div>
        <button
          onClick={() => togglePanel("log")}
          className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
        >
          <X size={12} />
        </button>
      </div>

      <div className="p-2 min-h-0 flex-1 overflow-y-auto">
        {messages.slice(-20).map((msg) => (
          <div key={msg.id} className="py-0.5">
            <span
              className={`text-[10px] font-ui leading-relaxed ${
                TYPE_COLORS[msg.type] || "text-white/50"
              }`}
            >
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
