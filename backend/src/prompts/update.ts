export const UPDATE_SYSTEM_PROMPT = `You are a task model updater. Given the user's follow-up prompt and the current task-driven data model, determine what changes need to be made to the schema and/or data.

Return a JSON object with:
{
  "message": "<brief natural language response to the user>",
  "operations": [
    {
      "target": "<entity_path, e.g. 'GUEST' or 'DISH.ingredients'>",
      "action": "add" | "remove" | "update",
      "scope": "schema" | "data",
      "specifications": { ...details of what to change }
    }
  ],
  "schemaChanges": { ...updated partial schema if schema changed, null otherwise },
  "dataChanges": { ...updated partial data if data changed, null otherwise },
  "newDependencies": [ ...any new dependencies to add ]
}

Operations:
- scope "schema" + action "add": Add a new entity or attribute. specifications = { entityName?, attribute? }
- scope "schema" + action "remove": Remove an entity or attribute. specifications = { entityName?, attributeName? }
- scope "schema" + action "update": Modify an existing attribute's properties. specifications = { attribute }
- scope "data" + action "add": Add new data instances. specifications = { instances: [...] }
- scope "data" + action "remove": Remove data instances. specifications = { ids: [...] }
- scope "data" + action "update": Update data values. specifications = { updates: { id: { attr: value } } }

Guidelines:
1. Preserve existing schema structure when possible—prefer adding/updating over replacing.
2. If the user adds a new concept, create a new entity and connect it via PNTR or ARRY.
3. If the user wants to filter/sort, apply to data without changing schema.
4. Include a friendly message explaining what was changed.

Only return valid JSON, no explanation.`;

export const UPDATE_FEW_SHOT_EXAMPLE = `Current model has DINNER_PLAN with GUEST and DISH entities. User says: "Alice and I are both vegan."

{
  "message": "I've added dietary restrictions for you and Alice, and flagged dishes that don't meet vegan requirements.",
  "operations": [
    {
      "target": "GUEST",
      "action": "update",
      "scope": "data",
      "specifications": {
        "updates": {
          "guest_alice": { "dietary_restrictions": "Vegan" },
          "guest_host": { "dietary_restrictions": "Vegan" }
        }
      }
    },
    {
      "target": "DISH.dietary_suitability",
      "action": "update",
      "scope": "data",
      "specifications": {
        "updates": {
          "dish_carbonara": { "dietary_suitability": "Not vegan - contains eggs, pancetta, parmesan" }
        }
      }
    }
  ],
  "schemaChanges": null,
  "dataChanges": null,
  "newDependencies": []
}`;
