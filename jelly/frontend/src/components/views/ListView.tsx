import React, { useState } from "react";
import type { Entity } from "@jelly/shared";
import { useStore } from "../../store";
import { useHighlight } from "../shared/HighlightProvider";
import { PopupCard } from "../shared/PopupCard";
import { AttributeRenderer } from "../renderers/AttributeRenderer";
import { Plus, Sparkles, Trash2 } from "lucide-react";

interface ListViewProps {
  entityName: string;
  entity: Entity;
  instances: Record<string, unknown>[];
}

export function ListView({ entityName, entity, instances }: ListViewProps) {
  const removeInstance = useStore((s) => s.removeInstance);
  const addInstance = useStore((s) => s.addInstance);
  const { setHighlight, isHighlighted } = useHighlight();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const publicIdAttr = Object.entries(entity.attributes).find(
    ([, attr]) => "function" in attr && attr.function === "publicIdentifier",
  );

  const thumbnailAttrs = Object.entries(entity.attributes).filter(
    ([key, attr]) =>
      attr.type === "SVAL" &&
      attr.function !== "privateIdentifier" &&
      attr.render !== "hidden" &&
      key !== publicIdAttr?.[0],
  );

  return (
    <div className="space-y-2">
      {instances.map((inst) => {
        const id = inst.id as string;
        const highlighted = isHighlighted(id);
        const publicIdValue = publicIdAttr
          ? String(inst[publicIdAttr[0]] || "")
          : id;

        return (
          <div key={id} className="relative">
            <div
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                highlighted
                  ? "border-indigo-300 bg-indigo-50 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
              }`}
              onMouseEnter={() => setHighlight(id)}
              onMouseLeave={() => setHighlight(null)}
              onClick={() => setExpandedId(expandedId === id ? null : id)}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {publicIdValue}
                </span>
                {thumbnailAttrs.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {thumbnailAttrs.slice(0, 3).map(([key]) => (
                      <span
                        key={key}
                        className="text-xs text-gray-500 truncate"
                      >
                        {String(inst[key] || "")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeInstance(entityName, id);
                }}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {expandedId === id && (
              <PopupCard
                title={publicIdValue}
                onClose={() => setExpandedId(null)}
              >
                <div className="space-y-2">
                  {Object.entries(entity.attributes).map(([attrName, attr]) => {
                    if (
                      attr.type === "SVAL" &&
                      attr.function === "privateIdentifier"
                    )
                      return null;
                    if (attr.type === "SVAL" && attr.render === "hidden")
                      return null;

                    return (
                      <div key={attrName}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {attrName.replace(/_/g, " ")}
                        </label>
                        <AttributeRenderer
                          attribute={attr}
                          value={inst[attrName]}
                          entityName={entityName}
                          instanceId={id}
                          attributeName={attrName}
                        />
                      </div>
                    );
                  })}
                </div>
              </PopupCard>
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            addInstance(entityName, {
              id: `${entityName.toLowerCase()}_${Date.now()}`,
            });
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-dashed border-gray-200 hover:border-indigo-300"
        >
          <Plus size={12} />
          Add empty
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-dashed border-gray-200 hover:border-indigo-300">
          <Sparkles size={12} />
          Generate
        </button>
      </div>
    </div>
  );
}
