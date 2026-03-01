import React, { useState, useRef, useEffect, useMemo } from "react";
import { useGameStore } from "../../state/store";
import { Terminal } from "lucide-react";

const COMMANDS = [
  { name: "heal", description: "Use a potion to restore health" },
  { name: "show inventory", description: "Open inventory panel" },
  { name: "show stats", description: "Open stats panel" },
  { name: "show quests", description: "Open quests panel" },
  { name: "show map", description: "Open map panel" },
  { name: "show log", description: "Open message log panel" },
  { name: "hide inventory", description: "Close inventory panel" },
  { name: "hide stats", description: "Close stats panel" },
  { name: "hide quests", description: "Close quests panel" },
  { name: "hide map", description: "Close map panel" },
  { name: "look", description: "Examine your surroundings" },
  { name: "help", description: "List available commands" },
  { name: "autopilot", description: "Toggle autopilot mode" },
  { name: "seed", description: "Show or set the game seed" },
  { name: "new game", description: "Start a new game" },
  { name: "restart", description: "Restart the game" },
  { name: "planner", description: "Toggle smart planner" },
  { name: "replan", description: "Request a replan" },
  { name: "save", description: "Save current game" },
  { name: "load", description: "Load saved game" },
  { name: "delete save", description: "Delete saved game" },
];

export function CommandBar() {
  const commandOpen = useGameStore((s) => s.commandOpen);
  const setCommandOpen = useGameStore((s) => s.setCommandOpen);
  const processCommand = useGameStore((s) => s.processCommand);

  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (input.length === 0) return COMMANDS;
    const lower = input.toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower),
    );
  }, [input]);

  const ghostText = useMemo(() => {
    if (input.length === 0 || filtered.length === 0) return "";
    const top = filtered[selectedIndex]?.name ?? "";
    if (top.toLowerCase().startsWith(input.toLowerCase())) {
      return top.slice(input.length);
    }
    return "";
  }, [input, filtered, selectedIndex]);

  useEffect(() => {
    if (commandOpen) {
      setInput("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector("[data-active]");
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!commandOpen) return null;

  const submit = (cmd: string) => {
    if (cmd.trim()) {
      processCommand(cmd.trim());
    }
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filtered.length > 0) {
      submit(filtered[selectedIndex].name);
    } else {
      submit(input + ghostText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab" && ghostText) {
      e.preventDefault();
      setInput(input + ghostText);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCommandOpen(false);
    }
  };

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-[400px] animate-slide-up flex flex-col-reverse gap-1">
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
              autoComplete="off"
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

      {filtered.length > 0 && (
        <div
          ref={listRef}
          className="max-h-[240px] overflow-y-auto rounded-xl border border-arcane-500/20 bg-abyss/95 backdrop-blur-md shadow-2xl shadow-arcane-500/10 py-1"
        >
          {filtered.map((cmd, i) => (
            <button
              key={cmd.name}
              type="button"
              data-active={i === selectedIndex ? "" : undefined}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => submit(cmd.name)}
              className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
                i === selectedIndex
                  ? "bg-arcane-500/15 text-white"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <span className="text-sm font-ui truncate">{cmd.name}</span>
              <span className="text-[11px] font-ui text-white/30 truncate">
                {cmd.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
