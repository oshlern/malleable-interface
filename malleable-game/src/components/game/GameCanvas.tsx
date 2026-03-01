import React, { useRef, useEffect, useCallback } from "react";
import { useGameStore } from "../../state/store";
import { getShakeOffset, updateAndDrawFloatingTexts } from "../../engine/effects";

const TILE_SIZE = 32;
const FONT = "20px monospace";

const AMBIANCE_COLORS: Record<
  string,
  { bg: string; fog: string; particle: string; particleCount: number }
> = {
  town: {
    bg: "#1a1a2e",
    fog: "rgba(26,26,46,0.6)",
    particle: "rgba(255,220,120,",
    particleCount: 25,
  },
  dungeon: {
    bg: "#0f0f18",
    fog: "rgba(15,15,24,0.7)",
    particle: "rgba(100,80,180,",
    particleCount: 15,
  },
  cave: {
    bg: "#0a0a12",
    fog: "rgba(10,10,18,0.75)",
    particle: "rgba(60,140,200,",
    particleCount: 12,
  },
  forest: {
    bg: "#0f1a0f",
    fog: "rgba(15,26,15,0.6)",
    particle: "rgba(180,220,160,",
    particleCount: 30,
  },
  boss: {
    bg: "#1a0a0a",
    fog: "rgba(26,10,10,0.5)",
    particle: "rgba(240,80,60,",
    particleCount: 20,
  },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  drift: number;
  phase: number;
}

function createParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.15 - Math.random() * 0.3,
    size: 1 + Math.random() * 2.5,
    life: Math.random() * 200,
    maxLife: 200 + Math.random() * 300,
    drift: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
  };
}

const particlePool: Particle[] = [];

function ensureParticles(count: number, w: number, h: number) {
  while (particlePool.length < count) {
    particlePool.push(createParticle(w, h));
  }
  while (particlePool.length > count) {
    particlePool.pop();
  }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colorBase: string,
  time: number,
) {
  for (const p of particlePool) {
    p.life++;
    if (p.life > p.maxLife) {
      p.x = Math.random() * w;
      p.y = h + 10;
      p.life = 0;
      p.maxLife = 200 + Math.random() * 300;
    }

    p.x += p.vx + Math.sin(time * 0.001 + p.phase) * p.drift * 0.02;
    p.y += p.vy;

    if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;

    const fadeIn = Math.min(1, p.life / 40);
    const fadeOut = Math.min(1, (p.maxLife - p.life) / 60);
    const alpha = fadeIn * fadeOut * (0.12 + Math.sin(time * 0.002 + p.phase) * 0.06);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `${colorBase}${alpha})`;
    ctx.fill();
  }
}

function drawPlayerLight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  ambiance: string,
) {
  const breathe = Math.sin(time * 0.0015) * 15 + 5;
  const radius = 120 + breathe;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  if (ambiance === "boss") {
    grad.addColorStop(0, "rgba(240,80,60,0.08)");
    grad.addColorStop(0.5, "rgba(200,50,30,0.03)");
  } else if (ambiance === "cave") {
    grad.addColorStop(0, "rgba(60,140,220,0.07)");
    grad.addColorStop(0.5, "rgba(40,100,180,0.02)");
  } else if (ambiance === "forest") {
    grad.addColorStop(0, "rgba(160,220,140,0.06)");
    grad.addColorStop(0.5, "rgba(100,180,80,0.02)");
  } else {
    grad.addColorStop(0, "rgba(139,92,246,0.08)");
    grad.addColorStop(0.5, "rgba(100,60,200,0.03)");
  }
  grad.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

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

    const w = canvas.width;
    const h = canvas.height;
    const time = Date.now();

    const ambiance = AMBIANCE_COLORS[room.ambiance] || AMBIANCE_COLORS.dungeon;

    ctx.fillStyle = ambiance.bg;
    ctx.fillRect(0, 0, w, h);

    ensureParticles(ambiance.particleCount, w, h);
    drawParticles(ctx, w, h, ambiance.particle, time);

    const offsetX = Math.floor(w / 2 - player.position.x * TILE_SIZE - TILE_SIZE / 2);
    const offsetY = Math.floor(h / 2 - player.position.y * TILE_SIZE - TILE_SIZE / 2);
    const shake = getShakeOffset();
    const finalOffsetX = offsetX + shake.x;
    const finalOffsetY = offsetY + shake.y;

    ctx.save();
    ctx.translate(finalOffsetX, finalOffsetY);

    // Tiles
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

        // Subtle animated shimmer on water and lava
        if (tile.type === "water" && tile.visible) {
          const shimmer = Math.sin(time * 0.003 + x * 0.7 + y * 0.5) * 0.15 + 0.1;
          ctx.fillStyle = `rgba(56,189,248,${shimmer})`;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile.type === "lava" && tile.visible) {
          const shimmer = Math.sin(time * 0.004 + x * 0.5 + y * 0.8) * 0.2 + 0.15;
          ctx.fillStyle = `rgba(249,115,22,${shimmer})`;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

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

    // Items — bobbing glow
    for (const { item, position } of room.items) {
      const tile = room.tiles[position.y]?.[position.x];
      if (!tile?.visible) continue;
      const px = position.x * TILE_SIZE;
      const py = position.y * TILE_SIZE;

      const bob = Math.sin(time / 400 + position.x + position.y) * 2;

      const glowRadius = 12 + Math.sin(time * 0.003 + position.x) * 4;
      const grd = ctx.createRadialGradient(
        px + TILE_SIZE / 2, py + TILE_SIZE / 2 + bob, 0,
        px + TILE_SIZE / 2, py + TILE_SIZE / 2 + bob, glowRadius,
      );
      grd.addColorStop(0, `${item.color}30`);
      grd.addColorStop(1, `${item.color}00`);
      ctx.fillStyle = grd;
      ctx.fillRect(px - 4, py - 4 + bob, TILE_SIZE + 8, TILE_SIZE + 8);

      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = item.color;
      ctx.fillText(item.symbol, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + bob);
    }

    // NPCs
    for (const npc of room.npcs) {
      const tile = room.tiles[npc.position.y]?.[npc.position.x];
      if (!tile?.visible) continue;
      const px = npc.position.x * TILE_SIZE;
      const py = npc.position.y * TILE_SIZE;

      if (npc.type === "hostile") {
        const pulseAlpha = Math.sin(time * 0.004) * 0.08 + 0.08;
        const grd = ctx.createRadialGradient(
          px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0,
          px + TILE_SIZE / 2, py + TILE_SIZE / 2, 18,
        );
        grd.addColorStop(0, `rgba(239,68,68,${pulseAlpha})`);
        grd.addColorStop(1, "rgba(239,68,68,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(px - 4, py - 4, TILE_SIZE + 8, TILE_SIZE + 8);
      }

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
        ctx.fillStyle =
          healthPct > 0.5 ? "#22c55e" : healthPct > 0.25 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(px + 2, py - 2, barWidth * healthPct, barHeight);
      }
    }

    // Player — glowing @ with light halo
    const ppx = player.position.x * TILE_SIZE;
    const ppy = player.position.y * TILE_SIZE;
    const glow = Math.sin(time / 500) * 0.15 + 0.85;

    drawPlayerLight(
      ctx,
      ppx + TILE_SIZE / 2,
      ppy + TILE_SIZE / 2,
      time,
      room.ambiance,
    );

    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(139,92,246,${glow})`;
    ctx.fillText("@", ppx + TILE_SIZE / 2, ppy + TILE_SIZE / 2);

    ctx.restore();

    ctx.save();
    ctx.translate(finalOffsetX, finalOffsetY);
    updateAndDrawFloatingTexts(ctx);
    ctx.restore();

    drawVignette(ctx, w, h);
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
