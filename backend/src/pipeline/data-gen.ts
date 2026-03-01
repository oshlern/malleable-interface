import type { ObjectRelationalSchema, Dependency } from "@jelly/shared";
import { getOpenAI } from "../llm/index.js";
import {
  DATA_SYSTEM_PROMPT,
  DATA_FEW_SHOT_EXAMPLE,
} from "../prompts/data.js";

export async function generateData(
  schema: ObjectRelationalSchema,
  dependencies: Dependency[],
): Promise<Record<string, Record<string, unknown>[]>> {
  const llm = getOpenAI();

  const fewShotParts = DATA_FEW_SHOT_EXAMPLE.split("\n\n");
  const fewShotPrompt = fewShotParts[0];
  const fewShotResponse = fewShotParts.slice(1).join("\n\n");

  const depDescription =
    dependencies.length > 0
      ? `\n\nDependencies to respect:\n${dependencies.map((d) => `- ${d.source.entity}.${d.source.attribute} → ${d.target.entity}.${d.target.attribute}: ${d.relationship}`).join("\n")}`
      : "";

  const data = await llm.generateJson<
    Record<string, Record<string, unknown>[]>
  >({
    messages: [
      { role: "system", content: DATA_SYSTEM_PROMPT },
      { role: "user", content: fewShotPrompt },
      { role: "assistant", content: fewShotResponse },
      {
        role: "user",
        content: `Schema:\n${JSON.stringify(schema, null, 2)}${depDescription}\n\nGenerate realistic sample data for all entities.`,
      },
    ],
    temperature: 0.8,
    maxTokens: 8192,
  });

  for (const [entityName, instances] of Object.entries(data)) {
    if (!Array.isArray(instances)) continue;
    for (const instance of instances) {
      if (!instance.id) {
        instance.id = `${entityName.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
      }
    }
  }

  return data;
}
