import type { Dependency, ObjectRelationalSchema } from "@jelly/shared";
import { getOpenAI } from "../llm/index.js";
import {
  DEPENDENCY_SYSTEM_PROMPT,
  DEPENDENCY_FEW_SHOT_EXAMPLE,
} from "../prompts/dependencies.js";

interface DependencyGenResult {
  dependencies: Dependency[];
}

export async function generateDependencies(
  schema: ObjectRelationalSchema,
): Promise<Dependency[]> {
  const llm = getOpenAI();

  const schemaDescription = Object.entries(schema.entities)
    .map(([name, entity]) => {
      const attrs = Object.keys(entity.attributes).join(", ");
      return `${name}: [${attrs}]`;
    })
    .join("\n");

  const fewShotParts = DEPENDENCY_FEW_SHOT_EXAMPLE.split("\n\n");
  const fewShotPrompt = fewShotParts[0];
  const fewShotResponse = fewShotParts.slice(1).join("\n\n");

  const result = await llm.generateJson<DependencyGenResult>({
    messages: [
      { role: "system", content: DEPENDENCY_SYSTEM_PROMPT },
      { role: "user", content: fewShotPrompt },
      { role: "assistant", content: fewShotResponse },
      {
        role: "user",
        content: `Schema:\n${schemaDescription}\n\nFull schema:\n${JSON.stringify(schema, null, 2)}\n\nGenerate the dependency graph for this schema.`,
      },
    ],
    temperature: 0.5,
    maxTokens: 4096,
  });

  return result.dependencies.map((dep, i) => ({
    ...dep,
    id: dep.id || `dep_${i + 1}`,
  }));
}
