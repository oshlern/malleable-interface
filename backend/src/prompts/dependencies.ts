export const DEPENDENCY_SYSTEM_PROMPT = `You are an expert at identifying dependencies in task-driven data models. Given an object-relational schema, identify the dependency relationships between entities and attributes.

Each dependency has the form:
{
  "id": "<unique_id>",
  "source": { "entity": "<ENTITY>", "attribute": "<attr>" },
  "target": { "entity": "<ENTITY>", "attribute": "<attr>" },
  "mechanism": "validate" | "update",
  "relationship": "<natural language description>",
  "jsCode": "<optional JavaScript expression>"
}

Mechanisms:
- "validate": Ensures constraints are upheld. If violated, the change is rejected and the UI highlights the issue. Example: checkout_date must be after check_in_date.
- "update": Automatically propagates changes. Example: total_calories updates when ingredient quantities change.

For the "jsCode" field:
- Provide a JavaScript expression when the relationship can be computed (numerical calculations, simple validations).
- The code receives 'sourceValue' and 'targetValue' as variables, plus 'allData' as the full data context.
- For validate: return true if valid, false if violated.
- For update: return the new computed value.
- Leave jsCode undefined if the relationship requires semantic reasoning (use natural language in "relationship" instead).

Return a JSON object: { "dependencies": [ ...array of dependencies ] }

Only return valid JSON, no explanation.`;

export const DEPENDENCY_FEW_SHOT_EXAMPLE = `Schema for a dinner party task with entities: DINNER_PLAN, GUEST, DISH, ACTIVITY.

{
  "dependencies": [
    {
      "id": "dep_1",
      "source": { "entity": "GUEST", "attribute": "dietary_restrictions" },
      "target": { "entity": "DISH", "attribute": "dietary_suitability" },
      "mechanism": "update",
      "relationship": "When a guest's dietary restrictions change, update the dietary suitability of all dishes to reflect whether they meet the guests' dietary needs."
    },
    {
      "id": "dep_2",
      "source": { "entity": "DISH", "attribute": "ingredients" },
      "target": { "entity": "DISH", "attribute": "calories" },
      "mechanism": "update",
      "relationship": "When ingredients change, recalculate total calories based on ingredient nutritional values."
    }
  ]
}`;
