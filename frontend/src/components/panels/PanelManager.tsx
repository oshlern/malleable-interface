import React from "react";
import { useStore } from "../../store";
import { Panel } from "./Panel";

export function PanelManager() {
  const panels = useStore((s) => s.panels);
  const model = useStore((s) => s.model);

  if (!model || panels.length === 0) return null;

  return (
    <div className="flex gap-4 p-4 overflow-x-auto flex-1 items-start">
      {panels.map((panel, idx) => (
        <Panel
          key={panel.id}
          panelId={panel.id}
          entityName={panel.entityName}
          title={panel.title}
          isHome={idx === 0}
        />
      ))}
    </div>
  );
}
