import React, { useRef, useEffect } from "react";
import { useGameStore } from "../../state/store";
import { MessageSquare, X } from "lucide-react";

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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-abyss/95 border border-white/5 rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <MessageSquare size={12} className="text-white/40" />
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

      <div className="p-2 h-[130px] overflow-y-auto">
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
