import type { TaskDrivenDataModel } from "@jelly/shared";
import { getOpenAI } from "../llm/index.js";

export async function autocompleteEntity(
  entityName: string,
  knownValues: Record<string, unknown>,
  currentModel: TaskDrivenDataModel,
  userHint?: string,
): Promise<Record<string, unknown>> {
  const llm = getOpenAI();

  const entity = currentModel.schema.entities[entityName];
  if (!entity) {
    throw new Error(`Entity "${entityName}" not found in schema`);
  }

  const missingAttrs = Object.keys(entity.attributes).filter(
    (attr) =>
      !(attr in knownValues) ||
      knownValues[attr] === null ||
      knownValues[attr] === undefined ||
      knownValues[attr] === "",
  );

  if (missingAttrs.length === 0) return knownValues;

  const result = await llm.generateJson<Record<string, unknown>>({
    messages: [
      {
        role: "system",
        content: `You are a data completion assistant. Given an entity schema, known attribute values, and optionally a user hint, generate plausible values for the missing attributes.

Return a JSON object with ONLY the missing attributes and their generated values. Match the expected data types from the schema.`,
      },
      {
        role: "user",
        content: `Entity: ${entityName}
Schema: ${JSON.stringify(entity.attributes, null, 2)}
Known values: ${JSON.stringify(knownValues, null, 2)}
Missing attributes: ${missingAttrs.join(", ")}
${userHint ? `User hint: ${userHint}` : ""}

Generate values for the missing attributes.`,
      },
    ],
    temperature: 0.7,
  });

  return { ...knownValues, ...result };
}
