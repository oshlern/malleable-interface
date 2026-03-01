import type {
  ObjectRelationalSchema,
  UISpecification,
  ViewType,
} from "@jelly/shared";
import { getOpenAI } from "../llm/index.js";
import {
  UI_SPEC_SYSTEM_PROMPT,
  UI_SPEC_FEW_SHOT_EXAMPLE,
} from "../prompts/ui-spec.js";

interface ViewGenResult {
  defaultViews: Record<string, ViewType>;
}

export async function generateUISpec(
  schema: ObjectRelationalSchema,
): Promise<UISpecification> {
  const llm = getOpenAI();

  const entityList = Object.entries(schema.entities)
    .map(([name, entity]) => {
      const attrs = Object.entries(entity.attributes)
        .map(([attrName, attr]) => `${attrName}(${attr.type})`)
        .join(", ");
      return `${name}: [${attrs}]`;
    })
    .join("\n");

  const fewShotParts = UI_SPEC_FEW_SHOT_EXAMPLE.split("\n\n");
  const fewShotPrompt = fewShotParts[0];
  const fewShotResponse = fewShotParts.slice(1).join("\n\n");

  const result = await llm.generateJson<ViewGenResult>({
    messages: [
      { role: "system", content: UI_SPEC_SYSTEM_PROMPT },
      { role: "user", content: fewShotPrompt },
      { role: "assistant", content: fewShotResponse },
      {
        role: "user",
        content: `Schema entities (task entity = ${schema.taskEntity}):\n${entityList}\n\nDetermine the default view type for each entity.`,
      },
    ],
    temperature: 0.3,
  });

  const defaultViews: Record<string, ViewType> = {};
  for (const entityName of Object.keys(schema.entities)) {
    if (entityName === schema.taskEntity) continue;
    defaultViews[entityName] = result.defaultViews[entityName] || inferViewType(schema, entityName);
  }

  return { schema, defaultViews };
}

function inferViewType(
  schema: ObjectRelationalSchema,
  entityName: string,
): ViewType {
  const entity = schema.entities[entityName];
  if (!entity) return "list";

  const hasLocation = Object.values(entity.attributes).some(
    (a) => a.type === "SVAL" && a.render === "location",
  );
  if (hasLocation) return "map";

  const numericCount = Object.values(entity.attributes).filter(
    (a) => a.type === "SVAL" && a.dataType === "number",
  ).length;
  if (numericCount >= 3) return "table";

  return "list";
}
