import React from "react";
import type { Attribute } from "@jelly/shared";
import { useStore } from "../../store";
import { ShortText } from "./widgets/ShortText";
import { Paragraph } from "./widgets/Paragraph";
import { NumberWidget } from "./widgets/NumberWidget";
import { TimeWidget } from "./widgets/TimeWidget";
import { LocationWidget } from "./widgets/LocationWidget";
import { CategoryWidget } from "./widgets/CategoryWidget";
import { UrlWidget } from "./widgets/UrlWidget";
import { ArrayExpanded } from "./widgets/ArrayExpanded";
import { ArraySummary } from "./widgets/ArraySummary";
import { PointerWidget } from "./widgets/PointerWidget";
import { DictWidget } from "./widgets/DictWidget";

interface AttributeRendererProps {
  attribute: Attribute;
  value: unknown;
  entityName: string;
  instanceId: string;
  attributeName: string;
}

export function AttributeRenderer({
  attribute,
  value,
  entityName,
  instanceId,
  attributeName,
}: AttributeRendererProps) {
  const updateDataValue = useStore((s) => s.updateDataValue);

  const handleChange = (newValue: unknown) => {
    updateDataValue(entityName, instanceId, attributeName, newValue);
  };

  switch (attribute.type) {
    case "SVAL": {
      if (attribute.render === "hidden") return null;

      switch (attribute.render) {
        case "shortText":
          return (
            <ShortText
              value={String(value ?? "")}
              editable={attribute.editable}
              isTitle={attribute.function === "publicIdentifier"}
              onChange={(v) => handleChange(v)}
            />
          );
        case "paragraph":
          return (
            <Paragraph
              value={String(value ?? "")}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
        case "number":
          return (
            <NumberWidget
              value={Number(value ?? 0)}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
        case "time":
          return (
            <TimeWidget
              value={String(value ?? "")}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
        case "location":
          return (
            <LocationWidget
              value={String(value ?? "")}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
        case "category":
          return (
            <CategoryWidget
              value={String(value ?? "")}
              categories={attribute.categories || []}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
        case "url":
          return (
            <UrlWidget
              value={String(value ?? "")}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
        default:
          return (
            <ShortText
              value={String(value ?? "")}
              editable={attribute.editable}
              onChange={(v) => handleChange(v)}
            />
          );
      }
    }

    case "DICT":
      return (
        <DictWidget
          attribute={attribute}
          value={(value as Record<string, unknown>) || {}}
          entityName={entityName}
          instanceId={instanceId}
        />
      );

    case "PNTR":
      return (
        <PointerWidget
          attribute={attribute}
          value={String(value ?? "")}
        />
      );

    case "ARRY": {
      const items = Array.isArray(value) ? value : [];

      if (attribute.render === "summary") {
        return (
          <ArraySummary
            attribute={attribute}
            items={items}
            entityName={entityName}
          />
        );
      }

      return (
        <ArrayExpanded
          attribute={attribute}
          items={items}
          entityName={entityName}
          instanceId={instanceId}
          attributeName={attributeName}
        />
      );
    }

    default:
      return (
        <span className="text-sm text-gray-500">
          {String(value ?? "")}
        </span>
      );
  }
}
