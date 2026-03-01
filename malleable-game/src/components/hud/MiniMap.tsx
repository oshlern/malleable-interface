import React from "react";
import { useGameStore } from "../../state/store";
import { Map, X } from "lucide-react";

export function MiniMap() {
  const rooms = useGameStore((s) => s.rooms);
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const player = useGameStore((s) => s.player);
  const togglePanel = useGameStore((s) => s.togglePanel);

  const room = rooms[currentRoomId];
  if (!room) return null;

  const scale = 4;

  return (
    <div className="bg-abyss/95 border border-white/5 rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <Map size={12} className="text-heal-400" />
          <span className="text-[10px] font-game text-white/60 tracking-wider">
            MAP
          </span>
        </div>
        <button
          onClick={() => togglePanel("map")}
          className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
        >
          <X size={12} />
        </button>
      </div>

      <div className="p-2 flex justify-center">
        <div
          className="relative bg-void rounded border border-white/5"
          style={{
            width: room.width * scale,
            height: room.height * scale,
          }}
        >
          {room.tiles.map((row, y) =>
            row.map((tile, x) => {
              if (!tile.discovered) return null;
              let color = "#1a1a2e";
              if (tile.type === "wall") color = "#333355";
              else if (tile.type === "door") color = "#c89b3c";
              else if (tile.type === "floor") color = tile.visible ? "#2a2a3e" : "#1e1e2e";
              else if (tile.type === "water") color = "#1e3a5f";
              else if (tile.type === "lava") color = "#5f1e0a";

              return (
                <div
                  key={`${x}-${y}`}
                  className="absolute"
                  style={{
                    left: x * scale,
                    top: y * scale,
                    width: scale,
                    height: scale,
                    backgroundColor: color,
                  }}
                />
              );
            }),
          )}

          {room.npcs.map((npc) => (
            <div
              key={npc.id}
              className="absolute rounded-full"
              style={{
                left: npc.position.x * scale,
                top: npc.position.y * scale,
                width: scale,
                height: scale,
                backgroundColor:
                  npc.type === "hostile" ? "#ef4444" : "#60a5fa",
              }}
            />
          ))}

          <div
            className="absolute rounded-full bg-arcane-500 animate-pulse-slow"
            style={{
              left: player.position.x * scale,
              top: player.position.y * scale,
              width: scale,
              height: scale,
            }}
          />
        </div>
      </div>

      <div className="px-3 py-1 border-t border-white/5">
        <div className="flex items-center justify-center gap-3 text-[7px] font-ui text-white/20">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-arcane-500" />
            You
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Enemy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            NPC
          </span>
        </div>
      </div>
    </div>
  );
}
