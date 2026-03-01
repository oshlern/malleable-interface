import React from "react";
import type { ViewType } from "@jelly/shared";
import { useStore } from "../../store";
import { AttributeRenderer } from "./AttributeRenderer";
import { ListView } from "../views/ListView";
import { TableView } from "../views/TableView";
import { MapView } from "../views/MapView";
import { X } from "lucide-react";

interface EntityRendererProps {
  entityName: string;
  instances: Record<string, unknown>[];
  isHome?: boolean;
}

export function EntityRenderer({
  entityName,
  instances,
  isHome,
}: EntityRendererProps) {
  const model = useStore((s) => s.model);
  const viewOverrides = useStore((s) => s.viewOverrides);
  const deleteAttribute = useStore((s) => s.deleteAttribute);

  if (!model) return null;

  const entity = model.schema.entities[entityName];
  if (!entity) return null;

  if (isHome && instances.length > 0) {
    const instance = instances[0];
    const id = instance.id as string;

    return (
      <div className="space-y-3">
        {Object.entries(entity.attributes).map(([attrName, attr]) => {
          if (attr.type === "SVAL" && attr.function === "privateIdentifier")
            return null;
          if (attr.type === "SVAL" && attr.render === "hidden") return null;

          const isTitle =
            attr.type === "SVAL" && attr.function === "publicIdentifier";

          return (
            <div key={attrName} className={isTitle ? "mb-2" : ""}>
              {!isTitle && (
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {attrName.replace(/_/g, " ")}
                  </label>
                  <button
                    onClick={() => deleteAttribute(entityName, attrName)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all"
                    title="Remove attribute"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <AttributeRenderer
                attribute={attr}
                value={instance[attrName]}
                entityName={entityName}
                instanceId={id}
                attributeName={attrName}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const viewType: ViewType =
    viewOverrides[entityName] ||
    model.uiSpec.defaultViews[entityName] ||
    "list";

  switch (viewType) {
    case "table":
      return (
        <TableView
          entityName={entityName}
          entity={entity}
          instances={instances}
        />
      );
    case "map":
      return (
        <MapView
          entityName={entityName}
          entity={entity}
          instances={instances}
        />
      );
    case "list":
    default:
      return (
        <ListView
          entityName={entityName}
          entity={entity}
          instances={instances}
        />
      );
  }
}
