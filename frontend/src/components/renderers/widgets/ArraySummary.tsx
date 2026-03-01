import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ArryAttribute } from "@jelly/shared";
import { useStore } from "../../../store";

interface ArraySummaryProps {
  attribute: ArryAttribute;
  items: unknown[];
  entityName: string;
}

export function ArraySummary({
  attribute,
  items,
  entityName,
}: ArraySummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const model = useStore((s) => s.model);

  const summary = attribute.summary;
  let summaryText = `${items.length} items`;

  if (summary && model) {
    const isEntityRef =
      attribute.item.type.startsWith("__") &&
      attribute.item.type.endsWith("__");
    const refEntityName = isEntityRef
      ? attribute.item.type.slice(2, -2)
      : null;

    if (refEntityName) {
      const refInstances = model.data[refEntityName] || [];
      const refIds = items as string[];
      const matchedInstances = refInstances.filter((inst) =>
        refIds.includes(inst.id as string),
      );

      const field = summary.derived.field;
      const values = matchedInstances
        .map((inst) => Number(inst[field]))
        .filter((v) => !isNaN(v));

      let computedValue: number | string = 0;
      switch (summary.derived.operation) {
        case "SUM":
          computedValue = values.reduce((a, b) => a + b, 0);
          break;
        case "AVG":
          computedValue =
            values.length > 0
              ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
              : 0;
          break;
        case "MIN":
          computedValue = Math.min(...values);
          break;
        case "MAX":
          computedValue = Math.max(...values);
          break;
        case "COUNT":
          computedValue = matchedInstances.length;
          break;
        default:
          computedValue = matchedInstances.length;
      }

      summaryText = `${summary.name.replace(/_/g, " ")}: ${computedValue.toLocaleString()}`;
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full text-left"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span className="text-gray-700 font-medium">{summaryText}</span>
      </button>

      {expanded && (
        <div className="mt-2 pl-2 space-y-1 border-l-2 border-gray-200">
          {(items as string[]).map((item, i) => (
            <div key={i} className="text-sm text-gray-600 py-0.5">
              {String(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
