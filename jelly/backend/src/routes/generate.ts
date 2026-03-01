import { Hono } from "hono";
import type { GenerateRequest, GenerateResponse } from "@jelly/shared";
import { analyzeTask } from "../pipeline/task-analysis.js";
import { generateSchema } from "../pipeline/schema-gen.js";
import { generateDependencies } from "../pipeline/dependency-gen.js";
import { generateUISpec } from "../pipeline/ui-spec-gen.js";
import { generateData } from "../pipeline/data-gen.js";

const generate = new Hono();

generate.post("/", async (c) => {
  const body = await c.req.json<GenerateRequest>();

  if (!body.prompt?.trim()) {
    return c.json({ error: "Prompt is required" }, 400);
  }

  try {
    const analysis = await analyzeTask(body.prompt);

    const schema = await generateSchema(body.prompt, analysis);

    const [dependencies, uiSpec] = await Promise.all([
      generateDependencies(schema),
      generateUISpec(schema),
    ]);

    const data = await generateData(schema, dependencies);

    const response: GenerateResponse = {
      model: { schema, dependencies, data, uiSpec },
      message: `I've created a "${analysis.goal}" workspace for you with ${Object.keys(schema.entities).length} sections. You can explore and customize each section, or tell me what changes you'd like to make.`,
    };

    return c.json(response);
  } catch (err) {
    console.error("Generation error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      500,
    );
  }
});

export default generate;
