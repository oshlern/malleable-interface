import type { ObjectRelationalSchema } from "@jelly/shared";
import { getOpenAI } from "../llm/index.js";
import {
  SCHEMA_SYSTEM_PROMPT,
  SCHEMA_FEW_SHOT_EXAMPLE,
} from "../prompts/schema.js";

interface TaskAnalysis {
  goal: string;
  subTasks: string[];
  suggestedEntities: string[];
  taskName: string;
}

export async function generateSchema(
  prompt: string,
  analysis: TaskAnalysis,
): Promise<ObjectRelationalSchema> {
  const llm = getOpenAI();

  const fewShotParts = SCHEMA_FEW_SHOT_EXAMPLE.split("\n\n");
  const fewShotPrompt = fewShotParts[0];
  const fewShotResponse = fewShotParts.slice(1).join("\n\n");

  const schema = await llm.generateJson<ObjectRelationalSchema>({
    messages: [
      { role: "system", content: SCHEMA_SYSTEM_PROMPT },
      { role: "user", content: fewShotPrompt },
      { role: "assistant", content: fewShotResponse },
      {
        role: "user",
        content: `User task: "${prompt}"

Task analysis:
- Goal: ${analysis.goal}
- Sub-tasks: ${analysis.subTasks.join(", ")}
- Suggested entities: ${analysis.suggestedEntities.join(", ")}
- Task name: ${analysis.taskName}

Generate the complete object-relational schema for this task.`,
      },
    ],
    temperature: 0.7,
    maxTokens: 8192,
  });

  validateSchema(schema);
  return schema;
}

function validateSchema(schema: ObjectRelationalSchema): void {
  if (!schema.taskEntity || !schema.entities) {
    throw new Error("Schema missing taskEntity or entities");
  }
  if (!schema.entities[schema.taskEntity]) {
    throw new Error(
      `Task entity "${schema.taskEntity}" not found in entities`,
    );
  }

  for (const [name, entity] of Object.entries(schema.entities)) {
    if (!entity.attributes.id) {
      entity.attributes = {
        id: {
          name: "id",
          type: "SVAL",
          dataType: "string",
          function: "privateIdentifier",
          render: "hidden",
          editable: false,
        },
        ...entity.attributes,
      };
    }

    const hasPublicId = Object.values(entity.attributes).some(
      (a) => "function" in a && a.function === "publicIdentifier",
    );
    if (!hasPublicId) {
      const nameAttr = entity.attributes.name || entity.attributes.title;
      if (nameAttr && "function" in nameAttr) {
        nameAttr.function = "publicIdentifier";
      }
    }

    for (const attr of Object.values(entity.attributes)) {
      attr.name = attr.name || name;
    }
  }
}
