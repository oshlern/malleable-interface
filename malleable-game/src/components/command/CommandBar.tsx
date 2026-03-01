import React, { useState, useRef, useEffect } from "react";
import { useGameStore } from "../../state/store";
import { Terminal } from "lucide-react";

const SUGGESTIONS = [
  "heal",
  "show inventory",
  "show stats",
  "show quests",
  "show map",
  "hide inventory",
  "hide stats",
  "hide quests",
  "hide map",
  "look",
  "help",
];

export function CommandBar() {
  const commandOpen = useGameStore((s) => s.commandOpen);
  const setCommandOpen = useGameStore((s) => s.setCommandOpen);
  const processCommand = useGameStore((s) => s.processCommand);

  const [input, setInput] = useState("");
  const [ghostText, setGhostText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandOpen) {
      setInput("");
      setGhostText("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandOpen]);

  useEffect(() => {
    if (input.length > 0) {
      const match = SUGGESTIONS.find((s) =>
        s.toLowerCase().startsWith(input.toLowerCase()),
      );
      setGhostText(match ? match.slice(input.length) : "");
    } else {
      setGhostText("");
    }
  }, [input]);

  if (!commandOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input + ghostText;
    if (cmd.trim()) {
      processCommand(cmd.trim());
    }
    setInput("");
    setGhostText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && ghostText) {
      e.preventDefault();
      setInput(input + ghostText);
      setGhostText("");
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setCommandOpen(false);
    }
  };

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-[400px] animate-slide-up">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 px-4 py-3 bg-abyss/95 border border-arcane-500/30 rounded-xl backdrop-blur-md shadow-2xl shadow-arcane-500/10">
          <Terminal size={14} className="text-arcane-400 flex-shrink-0" />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="w-full bg-transparent text-sm font-ui text-white/90 placeholder:text-white/20 outline-none"
            />
            {ghostText && (
              <span className="absolute left-0 top-0 pointer-events-none text-sm font-ui text-white/20">
                <span className="invisible">{input}</span>
                {ghostText}
              </span>
            )}
          </div>
          {ghostText && (
            <kbd className="text-[8px] font-game text-arcane-400/60 bg-arcane-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
              Tab
            </kbd>
          )}
        </div>
      </form>
    </div>
  );
}
