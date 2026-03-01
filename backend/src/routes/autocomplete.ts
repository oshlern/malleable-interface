import { Hono } from "hono";
import type { AutocompleteRequest, AutocompleteResponse } from "@jelly/shared";
import { autocompleteEntity } from "../pipeline/autocomplete.js";

const autocomplete = new Hono();

autocomplete.post("/", async (c) => {
  const body = await c.req.json<AutocompleteRequest>();

  if (!body.entityName || !body.currentModel) {
    return c.json({ error: "entityName and currentModel are required" }, 400);
  }

  try {
    const completedValues = await autocompleteEntity(
      body.entityName,
      body.knownValues || {},
      body.currentModel,
      body.userHint,
    );

    const response: AutocompleteResponse = { completedValues };
    return c.json(response);
  } catch (err) {
    console.error("Autocomplete error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Autocomplete failed" },
      500,
    );
  }
});

export default autocomplete;
