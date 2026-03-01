import React from "react";
import type { DictAttribute } from "@jelly/shared";
import { AttributeRenderer } from "../AttributeRenderer";

interface DictWidgetProps {
  attribute: DictAttribute;
  value: Record<string, unknown>;
  entityName: string;
  instanceId: string;
}

export function DictWidget({
  attribute,
  value,
  entityName,
  instanceId,
}: DictWidgetProps) {
  const fields = attribute.fields || {};

  return (
    <div className="space-y-1.5 pl-3 border-l-2 border-gray-200">
      {Object.entries(fields).map(([fieldName, fieldAttr]) => (
        <div key={fieldName}>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {fieldName.replace(/_/g, " ")}
          </label>
          <AttributeRenderer
            attribute={fieldAttr}
            value={value?.[fieldName]}
            entityName={entityName}
            instanceId={instanceId}
            attributeName={fieldName}
          />
        </div>
      ))}
    </div>
  );
}
