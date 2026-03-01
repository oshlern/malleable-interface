import React, { useState } from "react";
import { ChevronDown, ChevronRight, Box, ExternalLink } from "lucide-react";
import type { Entity } from "@jelly/shared";
import { useStore } from "../../store";
import { AttributeNode } from "./AttributeNode";

interface EntityNodeProps {
  name: string;
  entity: Entity;
  isTask?: boolean;
}

export function EntityNode({ name, entity, isTask }: EntityNodeProps) {
  const [expanded, setExpanded] = useState(isTask ?? false);
  const openPanel = useStore((s) => s.openPanel);

  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-gray-100 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <Box
          size={12}
          className={isTask ? "text-indigo-500" : "text-gray-400"}
        />
        <span
          className={`text-xs font-medium flex-1 ${
            isTask ? "text-indigo-700" : "text-gray-700"
          }`}
        >
          {name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openPanel(name);
          }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 text-gray-400"
          title="Open panel"
        >
          <ExternalLink size={10} />
        </button>
      </div>

      {expanded && (
        <div className="ml-5 pl-2 border-l border-gray-200">
          {Object.entries(entity.attributes).map(([attrName, attr]) => (
            <AttributeNode key={attrName} name={attrName} attribute={attr} />
          ))}
        </div>
      )}
    </div>
  );
}
