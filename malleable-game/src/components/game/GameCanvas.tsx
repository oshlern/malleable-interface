import React, { useRef, useEffect, useCallback } from "react";
import { useGameStore } from "../../state/store";

const TILE_SIZE = 32;
const FONT = "20px monospace";

const AMBIANCE_COLORS: Record<string, { bg: string; fog: string }> = {
  town: { bg: "#1a1a2e", fog: "rgba(26,26,46,0.6)" },
  dungeon: { bg: "#0f0f18", fog: "rgba(15,15,24,0.7)" },
  cave: { bg: "#0a0a12", fog: "rgba(10,10,18,0.75)" },
  forest: { bg: "#0f1a0f", fog: "rgba(15,26,15,0.6)" },
  boss: { bg: "#1a0a0a", fog: "rgba(26,10,10,0.5)" },
};

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const rooms = useGameStore((s) => s.rooms);
  const player = useGameStore((s) => s.player);
  const turnCount = useGameStore((s) => s.turnCount);
  const combatTarget = useGameStore((s) => s.combatTarget);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const room = rooms[currentRoomId];
    if (!room) return;

    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    const ambiance = AMBIANCE_COLORS[room.ambiance] || AMBIANCE_COLORS.dungeon;
    ctx.fillStyle = ambiance.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = Math.floor(canvas.width / 2 - player.position.x * TILE_SIZE - TILE_SIZE / 2);
    const offsetY = Math.floor(canvas.height / 2 - player.position.y * TILE_SIZE - TILE_SIZE / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = room.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (!tile.discovered) {
          ctx.fillStyle = "#08080c";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          continue;
        }

        ctx.fillStyle = tile.bgColor || ambiance.bg;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.font = FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (tile.visible) {
          ctx.fillStyle = tile.color;
        } else {
          ctx.fillStyle = `${tile.color}55`;
        }
        ctx.fillText(tile.symbol, px + TILE_SIZE / 2, py + TILE_SIZE / 2);

        if (!tile.visible && tile.discovered) {
          ctx.fillStyle = ambiance.fog;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    for (const { item, position } of room.items) {
      const tile = room.tiles[position.y]?.[position.x];
      if (!tile?.visible) continue;
      const px = position.x * TILE_SIZE;
      const py = position.y * TILE_SIZE;

      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = item.color;

      const bob = Math.sin(Date.now() / 400 + position.x) * 2;
      ctx.fillText(item.symbol, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + bob);
    }

    for (const npc of room.npcs) {
      const tile = room.tiles[npc.position.y]?.[npc.position.x];
      if (!tile?.visible) continue;
      const px = npc.position.x * TILE_SIZE;
      const py = npc.position.y * TILE_SIZE;

      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = npc.color;
      ctx.fillText(npc.symbol, px + TILE_SIZE / 2, py + TILE_SIZE / 2);

      if (npc.type === "hostile" && npc.health < npc.maxHealth) {
        const barWidth = TILE_SIZE - 4;
        const barHeight = 3;
        const healthPct = npc.health / npc.maxHealth;
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(px + 2, py - 2, barWidth, barHeight);
        ctx.fillStyle = healthPct > 0.5 ? "#22c55e" : healthPct > 0.25 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(px + 2, py - 2, barWidth * healthPct, barHeight);
      }
    }

    const ppx = player.position.x * TILE_SIZE;
    const ppy = player.position.y * TILE_SIZE;
    const glow = Math.sin(Date.now() / 500) * 0.15 + 0.85;

    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(139,92,246,${glow})`;
    ctx.fillText("@", ppx + TILE_SIZE / 2, ppy + TILE_SIZE / 2);

    ctx.restore();
  }, [rooms, currentRoomId, player, turnCount, combatTarget]);

  useEffect(() => {
    let animFrame: number;
    const loop = () => {
      draw();
      animFrame = requestAnimationFrame(loop);
    };
    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-abyss/80 border border-arcane-500/30 rounded-lg backdrop-blur-sm">
        <span className="font-game text-[10px] text-arcane-400 tracking-wider">
          {rooms[currentRoomId]?.name}
        </span>
      </div>
    </div>
  );
}
