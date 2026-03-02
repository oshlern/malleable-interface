import { useGameStore } from "../../state/store";

export interface ThemeColors {
  panelBg: string;
  panelBorder: string;
  headerBg: string;
  accentColor: string;
  accentBg: string;
  textMuted: string;
}

const THEMES: Record<string, ThemeColors> = {
  town: {
    panelBg: "bg-[#1a1a2e]/95",
    panelBorder: "border-amber-500/15",
    headerBg: "border-b border-amber-500/10",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    textMuted: "text-white/40",
  },
  dungeon: {
    panelBg: "bg-[#0f0f18]/95",
    panelBorder: "border-purple-500/15",
    headerBg: "border-b border-purple-500/10",
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10",
    textMuted: "text-white/35",
  },
  cave: {
    panelBg: "bg-[#0a0a14]/95",
    panelBorder: "border-cyan-500/15",
    headerBg: "border-b border-cyan-500/10",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    textMuted: "text-white/30",
  },
  forest: {
    panelBg: "bg-[#0f1a10]/95",
    panelBorder: "border-emerald-500/15",
    headerBg: "border-b border-emerald-500/10",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    textMuted: "text-white/40",
  },
  boss: {
    panelBg: "bg-[#1a0a0a]/95",
    panelBorder: "border-red-500/20",
    headerBg: "border-b border-red-500/15",
    accentColor: "text-red-400",
    accentBg: "bg-red-500/10",
    textMuted: "text-white/35",
  },
  void: {
    panelBg: "bg-[#0a1020]/95",
    panelBorder: "border-cyan-400/20",
    headerBg: "border-b border-cyan-400/15",
    accentColor: "text-cyan-300",
    accentBg: "bg-cyan-400/10",
    textMuted: "text-white/35",
  },
};

export function useAmbianceTheme(): ThemeColors {
  const currentRoomId = useGameStore((s) => s.currentRoomId);
  const rooms = useGameStore((s) => s.rooms);
  const room = rooms[currentRoomId];
  const ambiance = room?.ambiance || "dungeon";
  return THEMES[ambiance] || THEMES.dungeon;
}
