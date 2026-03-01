import type {
  TaskDrivenDataModel,
  UpdateOperation,
  Dependency,
  ObjectRelationalSchema,
} from "@jelly/shared";
import { getOpenAI } from "../llm/index.js";
import {
  UPDATE_SYSTEM_PROMPT,
  UPDATE_FEW_SHOT_EXAMPLE,
} from "../prompts/update.js";
import { generateUISpec } from "./ui-spec-gen.js";

interface UpdateGenResult {
  message: string;
  operations: UpdateOperation[];
  schemaChanges: Partial<ObjectRelationalSchema> | null;
  dataChanges: Record<string, Record<string, unknown>[]> | null;
  newDependencies: Dependency[];
}

export async function processUpdate(
  prompt: string,
  currentModel: TaskDrivenDataModel,
): Promise<{
  model: TaskDrivenDataModel;
  message: string;
  operations: UpdateOperation[];
}> {
  const llm = getOpenAI();

  const fewShotParts = UPDATE_FEW_SHOT_EXAMPLE.split("\n\n");
  const fewShotPrompt = fewShotParts[0];
  const fewShotResponse = fewShotParts.slice(1).join("\n\n");

  const result = await llm.generateJson<UpdateGenResult>({
    messages: [
      { role: "system", content: UPDATE_SYSTEM_PROMPT },
      { role: "user", content: fewShotPrompt },
      { role: "assistant", content: fewShotResponse },
      {
        role: "user",
        content: `Current model:\n${JSON.stringify(currentModel, null, 2)}\n\nUser's follow-up request: "${prompt}"`,
      },
    ],
    temperature: 0.7,
    maxTokens: 8192,
  });

  let updatedSchema = { ...currentModel.schema };
  let updatedData = { ...currentModel.data };
  let updatedDeps = [...currentModel.dependencies];

  if (result.schemaChanges) {
    updatedSchema = mergeSchema(updatedSchema, result.schemaChanges);
  }

  if (result.dataChanges) {
    updatedData = mergeData(updatedData, result.dataChanges);
  }

  for (const op of result.operations) {
    if (op.scope === "data" && op.action === "update" && op.specifications?.updates) {
      const updates = op.specifications.updates as Record<
        string,
        Record<string, unknown>
      >;
      for (const [id, changes] of Object.entries(updates)) {
        const entityName = op.target.split(".")[0];
        const instances = updatedData[entityName];
        if (instances) {
          const instance = instances.find((inst) => inst.id === id);
          if (instance) {
            Object.assign(instance, changes);
          }
        }
      }
    }

    if (op.scope === "data" && op.action === "remove" && op.specifications?.ids) {
      const ids = op.specifications.ids as string[];
      const entityName = op.target.split(".")[0];
      if (updatedData[entityName]) {
        updatedData[entityName] = updatedData[entityName].filter(
          (inst) => !ids.includes(inst.id as string),
        );
      }
    }
  }

  if (result.newDependencies?.length) {
    updatedDeps = [...updatedDeps, ...result.newDependencies];
  }

  const uiSpec = await generateUISpec(updatedSchema);

  return {
    model: {
      schema: updatedSchema,
      dependencies: updatedDeps,
      data: updatedData,
      uiSpec,
    },
    message: result.message,
    operations: result.operations,
  };
}

function mergeSchema(
  current: ObjectRelationalSchema,
  changes: Partial<ObjectRelationalSchema>,
): ObjectRelationalSchema {
  const merged = { ...current };
  if (changes.entities) {
    merged.entities = { ...current.entities };
    for (const [name, entity] of Object.entries(changes.entities)) {
      if (merged.entities[name]) {
        merged.entities[name] = {
          ...merged.entities[name],
          attributes: {
            ...merged.entities[name].attributes,
            ...entity.attributes,
          },
        };
      } else {
        merged.entities[name] = entity;
      }
    }
  }
  if (changes.taskEntity) {
    merged.taskEntity = changes.taskEntity;
  }
  return merged;
}

function mergeData(
  current: Record<string, Record<string, unknown>[]>,
  changes: Record<string, Record<string, unknown>[]>,
): Record<string, Record<string, unknown>[]> {
  const merged = { ...current };
  for (const [entityName, instances] of Object.entries(changes)) {
    if (!merged[entityName]) {
      merged[entityName] = instances;
    } else {
      const existingIds = new Set(merged[entityName].map((i) => i.id));
      for (const inst of instances) {
        if (existingIds.has(inst.id)) {
          const idx = merged[entityName].findIndex((i) => i.id === inst.id);
          if (idx >= 0) merged[entityName][idx] = { ...merged[entityName][idx], ...inst };
        } else {
          merged[entityName].push(inst);
        }
      }
    }
  }
  return merged;
}
