import React from "react";
import type { ViewType } from "@jelly/shared";
import { useStore } from "../../store";
import { List, Table, Map } from "lucide-react";

interface ViewSwitcherProps {
  entityName: string;
}

const viewOptions: { type: ViewType; icon: React.ReactNode; label: string }[] =
  [
    { type: "list", icon: <List size={14} />, label: "List" },
    { type: "table", icon: <Table size={14} />, label: "Table" },
    { type: "map", icon: <Map size={14} />, label: "Map" },
  ];

export function ViewSwitcher({ entityName }: ViewSwitcherProps) {
  const viewOverrides = useStore((s) => s.viewOverrides);
  const model = useStore((s) => s.model);
  const setViewType = useStore((s) => s.setViewType);

  const currentView =
    viewOverrides[entityName] ||
    model?.uiSpec.defaultViews[entityName] ||
    "list";

  return (
    <div className="flex items-center bg-gray-100 rounded-md p-0.5">
      {viewOptions.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => setViewType(entityName, type)}
          title={label}
          className={`p-1 rounded transition-colors ${
            currentView === type
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
