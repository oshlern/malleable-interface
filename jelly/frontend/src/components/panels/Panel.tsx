import React from "react";
import { X, ChevronRight } from "lucide-react";
import { useStore } from "../../store";
import { EntityRenderer } from "../renderers/EntityRenderer";
import { ViewSwitcher } from "../views/ViewSwitcher";

interface PanelProps {
  panelId: string;
  entityName: string;
  title: string;
  isHome?: boolean;
}

export function Panel({ panelId, entityName, title, isHome }: PanelProps) {
  const closePanel = useStore((s) => s.closePanel);
  const model = useStore((s) => s.model);

  if (!model) return null;

  const entity = model.schema.entities[entityName];
  if (!entity) return null;

  const instances = model.data[entityName] || [];
  const isCollection = instances.length > 1 || !isHome;

  const displayTitle =
    isHome && instances.length > 0 && instances[0].title
      ? String(instances[0].title)
      : title.replace(/_/g, " ");

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 min-w-[360px] max-w-[480px] h-fit max-h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          {isHome && (
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
          <h3 className="text-sm font-semibold text-gray-800 capitalize">
            {displayTitle}
          </h3>
          {instances.length > 1 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {instances.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isCollection && <ViewSwitcher entityName={entityName} />}
          {!isHome && (
            <button
              onClick={() => closePanel(panelId)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        <EntityRenderer
          entityName={entityName}
          instances={instances}
          isHome={isHome}
        />
      </div>
    </div>
  );
}
