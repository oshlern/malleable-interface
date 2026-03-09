import React from "react";
import { useGameStore } from "../../state/store";
import { Map as MapIcon, X } from "lucide-react";
import { useAmbianceTheme } from "../shared/AmbianceTheme";
import type { Position, Room } from "../../engine/types";

function keyOf(p: Position): string {
  return `${p.x},${p.y}`;
}

function inBounds(room: Room, p: Position): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < room.width && p.y < room.height;
}

function bfsInRoomPath(room: Room, start: Position, goal: Position): Position[] {
  if (!inBounds(room, start) || !inBounds(room, goal)) return [];
  if (start.x === goal.x && start.y === goal.y) return [start];
  if (!room.tiles[goal.y][goal.x].walkable) return [];

  const deltas: Position[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  const queue: Position[] = [start];
  const visited = new Set<string>([keyOf(start)]);
  const prev = new Map<string, string>();

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const d of deltas) {
      const next = { x: cur.x + d.x, y: cur.y + d.y };
      if (!inBounds(room, next)) continue;
      if (!room.tiles[next.y][next.x].walkable) continue;
      const nextKey = keyOf(next);
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      prev.set(nextKey, keyOf(cur));
      if (next.x === goal.x && next.y === goal.y) {
        const path: Position[] = [goal];
        let k = nextKey;
        while (prev.has(k)) {
          const pk = prev.get(k)!;
          const [x, y] = pk.split(",").map(Number);
          path.push({ x, y });
          k = pk;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }

  return [];
}

function findRoomRoute(
  rooms: Record<string, Room>,
  startRoomId: string,
  targetRoomId: string,
): string[] {
  if (startRoomId === targetRoomId) return [startRoomId];
  const queue: string[] = [startRoomId];
  const visited = new Set<string>([startRoomId]);
  const prev = new Map<string, string>();

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    const room = rooms[roomId];
    if (!room) continue;

    for (const exit of room.exits) {
      const nextRoomId = exit.targetRoomId;
      if (visited.has(nextRoomId)) continue;
      visited.add(nextRoomId);
      prev.set(nextRoomId, roomId);
      if (nextRoomId === targetRoomId) {
        const route: string[] = [targetRoomId];
        let cur = targetRoomId;
        while (prev.has(cur)) {
          const p = prev.get(cur)!;
          route.push(p);
          cur = p;
        }
        return route.reverse();
      }
      queue.push(nextRoomId);
    }
  }

  return [];
}

export function MiniMap() {
  const rooms = useGameStore((s) => s.rooms);
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const player = useGameStore((s) => s.player);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const smartPlanner = useGameStore((s) => s.smartPlanner);
  const smartPlan = useGameStore((s) => s.smartPlan);
  const theme = useAmbianceTheme();

  const room = rooms[currentRoomId];
  if (!room) return null;

  const scale = 4;
  const activeStep = smartPlan?.steps.find((s) => !s.done);
  const targetRoomId = activeStep?.room ?? null;
  const targetLocation = activeStep?.location;

  const roomRoute = React.useMemo(() => {
    if (!smartPlanner || !activeStep || !targetRoomId) return [];
    return findRoomRoute(rooms, currentRoomId, targetRoomId);
  }, [smartPlanner, activeStep, targetRoomId, rooms, currentRoomId]);

  const nextHopRoomId = roomRoute.length > 1 ? roomRoute[1] : null;
  const routeGoalInCurrentRoom = targetRoomId === currentRoomId ? targetLocation : undefined;
  const nextHopExit = React.useMemo(() => {
    if (!nextHopRoomId) return undefined;
    return room.exits.find((e) => e.targetRoomId === nextHopRoomId)?.position;
  }, [room, nextHopRoomId]);

  const overlayGoal = routeGoalInCurrentRoom ?? nextHopExit;
  const overlayPath = React.useMemo(() => {
    if (!smartPlanner || !activeStep || !overlayGoal) return [];
    return bfsInRoomPath(room, player.position, overlayGoal);
  }, [smartPlanner, activeStep, room, player.position, overlayGoal]);
  const hasCrossRoomRoute = roomRoute.length > 1;

  return (
    <div className={`${theme.panelBg} border ${theme.panelBorder} rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2 ${theme.headerBg}`}>
        <div className="flex items-center gap-1.5">
          <MapIcon size={12} className={theme.accentColor} />
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
              const isVoid = room.ambiance === "void";
              let color = isVoid ? "#0b1426" : "#1a1a2e";
              if (tile.type === "wall") color = "#333355";
              else if (tile.type === "door") color = "#c89b3c";
              else if (tile.type === "floor") color = tile.visible ? (isVoid ? "#1e2a44" : "#2a2a3e") : (isVoid ? "#131c33" : "#1e1e2e");
              else if (tile.type === "water") color = isVoid ? "#165e85" : "#1e3a5f";
              else if (tile.type === "lava") color = isVoid ? "#7f1d3f" : "#5f1e0a";

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

          {smartPlanner &&
            activeStep &&
            overlayPath.map((p, i) => {
              if (i === 0) return null; // player tile
              return (
                <div
                  key={`route-${p.x}-${p.y}-${i}`}
                  className="absolute rounded-sm"
                  style={{
                    left: p.x * scale + 1,
                    top: p.y * scale + 1,
                    width: Math.max(1, scale - 2),
                    height: Math.max(1, scale - 2),
                    backgroundColor: "rgba(250, 204, 21, 0.95)",
                  }}
                />
              );
            })}

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

          {smartPlanner && activeStep && routeGoalInCurrentRoom && (
            <div
              className="absolute border border-yellow-300"
              style={{
                left: routeGoalInCurrentRoom.x * scale - 1,
                top: routeGoalInCurrentRoom.y * scale - 1,
                width: scale + 2,
                height: scale + 2,
                boxShadow: "0 0 8px rgba(250, 204, 21, 0.65)",
              }}
            />
          )}

          {smartPlanner && activeStep && !routeGoalInCurrentRoom && nextHopExit && (
            <div
              className="absolute border border-yellow-300 rounded-sm"
              style={{
                left: nextHopExit.x * scale - 1,
                top: nextHopExit.y * scale - 1,
                width: scale + 2,
                height: scale + 2,
                boxShadow: "0 0 8px rgba(250, 204, 21, 0.65)",
              }}
            />
          )}

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

      {smartPlanner && activeStep && (
        <div className="px-3 py-2 border-t border-white/5 bg-black/20">
          <div className="text-[8px] font-ui text-white/50 mb-1">
            Planner route
          </div>
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1">
            {roomRoute.length === 0 && (
              <span className="text-[8px] font-ui text-white/30">
                No room path
              </span>
            )}
            {roomRoute.map((id, i) => (
              <React.Fragment key={`${id}-${i}`}>
                <span
                  className={`text-[8px] font-ui px-1.5 py-0.5 rounded border ${
                    id === currentRoomId
                      ? "text-cyan-200 border-cyan-400/50 bg-cyan-900/20"
                      : id === targetRoomId
                        ? "text-yellow-200 border-yellow-400/60 bg-yellow-900/20"
                        : "text-white/60 border-white/15 bg-white/5"
                  }`}
                >
                  {id}
                </span>
                {i < roomRoute.length - 1 && (
                  <span className="text-[8px] text-white/30">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          {targetLocation && (
            <div className="text-[8px] font-ui text-white/35">
              Target tile: ({targetLocation.x}, {targetLocation.y})
              {hasCrossRoomRoute ? " after room hops" : ""}
            </div>
          )}
        </div>
      )}

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
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
            Plan path
          </span>
        </div>
      </div>
    </div>
  );
}
