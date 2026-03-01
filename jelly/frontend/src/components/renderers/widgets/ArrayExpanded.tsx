import React, { useState } from "react";
import { ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import type { ArryAttribute } from "@jelly/shared";
import { useStore } from "../../../store";
import { useHighlight } from "../../shared/HighlightProvider";
import { PopupCard } from "../../shared/PopupCard";
import { AttributeRenderer } from "../AttributeRenderer";

interface ArrayExpandedProps {
  attribute: ArryAttribute;
  items: unknown[];
  entityName: string;
  instanceId: string;
  attributeName: string;
}

export function ArrayExpanded({
  attribute,
  items,
  entityName,
  instanceId,
  attributeName,
}: ArrayExpandedProps) {
  const model = useStore((s) => s.model);
  const openPanel = useStore((s) => s.openPanel);
  const removeInstance = useStore((s) => s.removeInstance);
  const addInstance = useStore((s) => s.addInstance);
  const { setHighlight, isHighlighted } = useHighlight();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isEntityRef =
    attribute.item.type.startsWith("__") && attribute.item.type.endsWith("__");
  const refEntityName = isEntityRef
    ? attribute.item.type.slice(2, -2)
    : null;

  if (!isEntityRef) {
    return (
      <div className="space-y-1">
        {(items as string[]).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{String(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  const refEntity = refEntityName ? model?.schema.entities[refEntityName] : null;
  const refInstances = refEntityName ? (model?.data[refEntityName] || []) : [];
  const refIds = items as string[];

  const visibleInstances = refInstances.filter((inst) =>
    refIds.includes(inst.id as string),
  );

  const thumbnailAttrs = attribute.item.thumbnail || [];

  return (
    <div className="space-y-1.5">
      {visibleInstances.map((inst) => {
        const id = inst.id as string;
        const highlighted = isHighlighted(id);

        return (
          <div key={id} className="relative">
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                highlighted
                  ? "border-indigo-300 bg-indigo-50 shadow-sm"
                  : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
              }`}
              onMouseEnter={() => setHighlight(id)}
              onMouseLeave={() => setHighlight(null)}
              onClick={() =>
                setExpandedItem(expandedItem === id ? null : id)
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                {thumbnailAttrs.length > 0 ? (
                  thumbnailAttrs.map((attr) => (
                    <span key={attr} className="text-sm text-gray-700 truncate">
                      {String(inst[attr] || "")}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-700">{id}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {refEntityName && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPanel(refEntityName);
                    }}
                    className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
                    title={`Open ${refEntityName} panel`}
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
                {attribute.editable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (refEntityName) removeInstance(refEntityName, id);
                    }}
                    className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {expandedItem === id && refEntity && (
              <PopupCard
                title={String(
                  inst[
                    Object.keys(refEntity.attributes).find(
                      (k) =>
                        "function" in refEntity.attributes[k] &&
                        refEntity.attributes[k].function === "publicIdentifier",
                    ) || "id"
                  ] || id,
                )}
                onClose={() => setExpandedItem(null)}
              >
                <div className="space-y-2">
                  {Object.entries(refEntity.attributes).map(([attrName, attr]) => {
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
                          entityName={refEntityName!}
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

      {attribute.editable && refEntityName && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              addInstance(refEntityName, {
                id: `${refEntityName.toLowerCase()}_${Date.now()}`,
              });
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <Plus size={12} />
            Add
          </button>
          <button
            onClick={() => {
              openPanel(refEntityName);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <Sparkles size={12} />
            Generate
          </button>
        </div>
      )}
    </div>
  );
}
