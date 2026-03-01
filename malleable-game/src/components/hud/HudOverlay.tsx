import React from "react";
import { useGameStore } from "../../state/store";
import { InventoryPanel } from "./InventoryPanel";
import { StatsPanel } from "./StatsPanel";
import { QuestPanel } from "./QuestPanel";
import { LogPanel } from "./LogPanel";
import { MiniMap } from "./MiniMap";
import { PlanPanel } from "./PlanPanel";
import { Package, User, Scroll, Map, MessageSquare, Brain } from "lucide-react";
import type { HudPanel } from "../../engine/types";

const PANEL_MAP: Record<HudPanel, React.ComponentType> = {
  inventory: InventoryPanel,
  stats: StatsPanel,
  quests: QuestPanel,
  map: MiniMap,
  log: LogPanel,
  plan: PlanPanel,
};

const PANEL_ICONS: Record<HudPanel, React.ReactNode> = {
  inventory: <Package size={14} />,
  stats: <User size={14} />,
  quests: <Scroll size={14} />,
  map: <Map size={14} />,
  log: <MessageSquare size={14} />,
  plan: <Brain size={14} />,
};

const PANEL_KEYS: Record<HudPanel, string> = {
  inventory: "I",
  stats: "C",
  quests: "J",
  map: "M",
  log: "",
  plan: "G",
};

const LEFT_PANELS: HudPanel[] = ["log", "plan"];
const RIGHT_PANELS: HudPanel[] = ["inventory", "stats", "quests", "map"];

export function HudOverlay() {
  const activePanels = useGameStore((s) => s.activePanels);
  const togglePanel = useGameStore((s) => s.togglePanel);

  const allPanels: HudPanel[] = [...LEFT_PANELS, ...RIGHT_PANELS];
  const activeLeft = activePanels.filter((p) => LEFT_PANELS.includes(p));
  const activeRight = activePanels.filter((p) => RIGHT_PANELS.includes(p));

  return (
    <>
      <div className="absolute top-14 left-12 w-[220px] space-y-2 z-10">
        {activeLeft.map((panelId) => {
          const Panel = PANEL_MAP[panelId];
          return Panel ? <Panel key={panelId} /> : null;
        })}
      </div>

      <div className="absolute top-14 right-3 w-[220px] space-y-2 z-10">
        {activeRight.map((panelId) => {
          const Panel = PANEL_MAP[panelId];
          return Panel ? <Panel key={panelId} /> : null;
        })}
      </div>

      <div className="absolute top-14 left-3 flex flex-col gap-1 z-10">
        {allPanels.map((panel) => {
          const isActive = activePanels.includes(panel);
          return (
            <button
              key={panel}
              onClick={() => togglePanel(panel)}
              title={`${panel} (${PANEL_KEYS[panel] || "-"})`}
              className={`relative p-2 rounded-lg border transition-all ${
                isActive
                  ? "bg-arcane-500/20 border-arcane-500/40 text-arcane-400"
                  : "bg-abyss/80 border-white/5 text-white/30 hover:text-white/60 hover:border-white/10"
              }`}
            >
              {PANEL_ICONS[panel]}
              {PANEL_KEYS[panel] && (
                <span className="absolute -top-1 -right-1 text-[7px] font-game bg-abyss/90 px-0.5 rounded text-white/20">
                  {PANEL_KEYS[panel]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
