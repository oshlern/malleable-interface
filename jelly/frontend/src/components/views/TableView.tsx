import React from "react";
import type { Entity } from "@jelly/shared";
import { useStore } from "../../store";
import { useHighlight } from "../shared/HighlightProvider";
import { Trash2 } from "lucide-react";
import { AttributeRenderer } from "../renderers/AttributeRenderer";

interface TableViewProps {
  entityName: string;
  entity: Entity;
  instances: Record<string, unknown>[];
}

export function TableView({ entityName, entity, instances }: TableViewProps) {
  const removeInstance = useStore((s) => s.removeInstance);
  const { setHighlight, isHighlighted } = useHighlight();

  const visibleAttrs = Object.entries(entity.attributes).filter(
    ([, attr]) => {
      if (attr.type === "SVAL" && attr.render === "hidden") return false;
      if (attr.type === "SVAL" && attr.function === "privateIdentifier")
        return false;
      if (attr.type === "ARRY" || attr.type === "DICT") return false;
      return true;
    },
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {visibleAttrs.map(([name]) => (
              <th
                key={name}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                {name.replace(/_/g, " ")}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {instances.map((inst) => {
            const id = inst.id as string;
            const highlighted = isHighlighted(id);

            return (
              <tr
                key={id}
                className={`border-b border-gray-50 transition-colors ${
                  highlighted ? "bg-indigo-50" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setHighlight(id)}
                onMouseLeave={() => setHighlight(null)}
              >
                {visibleAttrs.map(([attrName, attr]) => (
                  <td key={attrName} className="px-3 py-2">
                    <AttributeRenderer
                      attribute={attr}
                      value={inst[attrName]}
                      entityName={entityName}
                      instanceId={id}
                      attributeName={attrName}
                    />
                  </td>
                ))}
                <td className="px-1 py-2">
                  <button
                    onClick={() => removeInstance(entityName, id)}
                    className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
