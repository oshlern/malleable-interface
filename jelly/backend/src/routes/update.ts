import { Hono } from "hono";
import type { UpdateRequest, UpdateResponse } from "@jelly/shared";
import { processUpdate } from "../pipeline/updater.js";

const update = new Hono();

update.post("/", async (c) => {
  const body = await c.req.json<UpdateRequest>();

  if (!body.prompt?.trim()) {
    return c.json({ error: "Prompt is required" }, 400);
  }
  if (!body.currentModel) {
    return c.json({ error: "Current model is required" }, 400);
  }

  try {
    const result = await processUpdate(body.prompt, body.currentModel);

    const response: UpdateResponse = {
      model: result.model,
      message: result.message,
      operations: result.operations,
    };

    return c.json(response);
  } catch (err) {
    console.error("Update error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      500,
    );
  }
});

export default update;
