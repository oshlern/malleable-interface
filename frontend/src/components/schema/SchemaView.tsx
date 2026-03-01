import React from "react";
import { useStore } from "../../store";
import { EntityNode } from "./EntityNode";
import { Database } from "lucide-react";

export function SchemaView() {
  const model = useStore((s) => s.model);

  if (!model) {
    return (
      <div className="p-4 text-center">
        <Database size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-xs text-gray-400">
          Schema will appear here once you create a task.
        </p>
      </div>
    );
  }

  const { schema } = model;
  const taskEntity = schema.entities[schema.taskEntity];
  const otherEntities = Object.entries(schema.entities).filter(
    ([name]) => name !== schema.taskEntity,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-700">Schema</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {taskEntity && (
          <EntityNode
            name={schema.taskEntity}
            entity={taskEntity}
            isTask
          />
        )}

        {otherEntities.length > 0 && (
          <>
            <div className="my-2 px-1.5">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                Entities
              </span>
            </div>
            {otherEntities.map(([name, entity]) => (
              <EntityNode key={name} name={name} entity={entity} />
            ))}
          </>
        )}

        {model.dependencies.length > 0 && (
          <>
            <div className="my-2 px-1.5">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                Dependencies ({model.dependencies.length})
              </span>
            </div>
            <div className="space-y-1 px-1.5">
              {model.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="text-[10px] text-gray-500 py-0.5 flex items-center gap-1"
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      dep.mechanism === "validate"
                        ? "bg-amber-400"
                        : "bg-green-400"
                    }`}
                  />
                  <span className="truncate">
                    {dep.source.entity}.{dep.source.attribute} →{" "}
                    {dep.target.entity}.{dep.target.attribute}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
