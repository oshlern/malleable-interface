import React from "react";
import { ExternalLink } from "lucide-react";
import type { PntrAttribute } from "@jelly/shared";
import { useStore } from "../../../store";
import { useHighlight } from "../../shared/HighlightProvider";

interface PointerWidgetProps {
  attribute: PntrAttribute;
  value: string;
}

export function PointerWidget({ attribute, value }: PointerWidgetProps) {
  const model = useStore((s) => s.model);
  const openPanel = useStore((s) => s.openPanel);
  const { setHighlight, isHighlighted } = useHighlight();

  const refEntity = model?.schema.entities[attribute.entityRef];
  const refInstances = model?.data[attribute.entityRef] || [];
  const instance = refInstances.find((inst) => inst.id === value);

  const highlighted = isHighlighted(value);

  const displayText = instance
    ? attribute.thumbnail
        .map((attr) => String(instance[attr] || ""))
        .filter(Boolean)
        .join(" - ") || String(value)
    : String(value);

  return (
    <button
      onClick={() => openPanel(attribute.entityRef)}
      onMouseEnter={() => setHighlight(value)}
      onMouseLeave={() => setHighlight(null)}
      className={`inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors ${
        highlighted ? "bg-indigo-50 rounded px-1" : ""
      }`}
    >
      {displayText}
      <ExternalLink size={12} />
    </button>
  );
}
