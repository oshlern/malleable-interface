import React from "react";
import type { Entity } from "@jelly/shared";
import { MapPin } from "lucide-react";

interface MapViewProps {
  entityName: string;
  entity: Entity;
  instances: Record<string, unknown>[];
}

export function MapView({ entityName, entity, instances }: MapViewProps) {
  const locationAttr = Object.entries(entity.attributes).find(
    ([, attr]) => attr.type === "SVAL" && attr.render === "location",
  );

  const publicIdAttr = Object.entries(entity.attributes).find(
    ([, attr]) => "function" in attr && attr.function === "publicIdentifier",
  );

  return (
    <div className="space-y-2">
      <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center text-gray-400 text-sm border border-gray-200">
        <div className="text-center">
          <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
          <p>Map view</p>
          <p className="text-xs text-gray-300 mt-1">
            {instances.length} locations
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {instances.map((inst) => {
          const id = inst.id as string;
          const name = publicIdAttr
            ? String(inst[publicIdAttr[0]] || "")
            : id;
          const location = locationAttr
            ? String(inst[locationAttr[0]] || "")
            : "";

          return (
            <div
              key={id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
            >
              <MapPin size={14} className="text-indigo-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {name}
                </div>
                {location && (
                  <div className="text-xs text-gray-500 truncate">
                    {location}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
