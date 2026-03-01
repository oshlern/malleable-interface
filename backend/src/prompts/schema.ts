export const SCHEMA_SYSTEM_PROMPT = `You are an expert data modeler. Given a user's task description, generate an object-relational schema that models the essential entities, attributes, and relationships needed to accomplish the task.

The schema must follow this exact JSON structure:

{
  "taskEntity": "<NAME_OF_ROOT_TASK_ENTITY>",
  "entities": {
    "<ENTITY_NAME>": {
      "name": "<ENTITY_NAME>",
      "attributes": {
        "<attr_name>": {
          "name": "<attr_name>",
          "type": "SVAL" | "DICT" | "PNTR" | "ARRY",
          ...type-specific fields
        }
      }
    }
  }
}

Attribute types:
- SVAL: A singular data value. Fields: { type: "SVAL", dataType: "string"|"number", function: "privateIdentifier"|"publicIdentifier"|"display", render: "shortText"|"paragraph"|"number"|"url"|"time"|"location"|"category"|"hidden", editable: boolean, categories?: string[] }
- DICT: A dictionary of key-value pairs. Fields: { type: "DICT", fields: { <key>: <SvalAttribute> } }
- PNTR: A reference to another entity. Fields: { type: "PNTR", entityRef: "<ENTITY_NAME>", function: "display", thumbnail: ["attr1"], editable: boolean }
- ARRY: A collection of items. Fields: { type: "ARRY", function: "display", render: "expanded"|"summary", editable: boolean, item: { type: "string"|"number"|"__<ENTITY_NAME>__", thumbnail?: ["attr1","attr2"] }, summary?: { name: "<summary_label>", derived: { field: "<attr>", operation: "SUM"|"AVG"|"COUNT" } } }

Rules:
1. Every entity MUST have an "id" attribute of type SVAL with function "privateIdentifier" and render "hidden".
2. Every entity MUST have at least one attribute with function "publicIdentifier" (e.g., name, title).
3. The first entity listed should be the task entity (the root).
4. Use PNTR when an attribute references a single instance of another entity.
5. Use ARRY with item.type = "__<ENTITY_NAME>__" when referencing a list of entity instances.
6. Arrays of DICT are not allowed—extract them into separate entities with PNTR references.
7. Entity names should be UPPER_SNAKE_CASE.

Return ONLY valid JSON, no explanation.`;

export const SCHEMA_FEW_SHOT_EXAMPLE = `User task: "I am hosting a dinner party"

{
  "taskEntity": "DINNER_PLAN",
  "entities": {
    "DINNER_PLAN": {
      "name": "DINNER_PLAN",
      "attributes": {
        "id": { "name": "id", "type": "SVAL", "dataType": "string", "function": "privateIdentifier", "render": "hidden", "editable": false },
        "title": { "name": "title", "type": "SVAL", "dataType": "string", "function": "publicIdentifier", "render": "shortText", "editable": true },
        "date": { "name": "date", "type": "SVAL", "dataType": "string", "function": "display", "render": "time", "editable": true },
        "location": { "name": "location", "type": "SVAL", "dataType": "string", "function": "display", "render": "location", "editable": true },
        "guest_list": { "name": "guest_list", "type": "ARRY", "function": "display", "render": "expanded", "editable": true, "item": { "type": "__GUEST__", "thumbnail": ["name", "phone"] } },
        "menu": { "name": "menu", "type": "ARRY", "function": "display", "render": "expanded", "editable": true, "item": { "type": "__DISH__", "thumbnail": ["name", "cuisine_type"] } },
        "activities": { "name": "activities", "type": "ARRY", "function": "display", "render": "expanded", "editable": true, "item": { "type": "__ACTIVITY__", "thumbnail": ["name"] } }
      }
    },
    "GUEST": {
      "name": "GUEST",
      "attributes": {
        "id": { "name": "id", "type": "SVAL", "dataType": "string", "function": "privateIdentifier", "render": "hidden", "editable": false },
        "name": { "name": "name", "type": "SVAL", "dataType": "string", "function": "publicIdentifier", "render": "shortText", "editable": true },
        "email": { "name": "email", "type": "SVAL", "dataType": "string", "function": "display", "render": "url", "editable": true },
        "phone": { "name": "phone", "type": "SVAL", "dataType": "string", "function": "display", "render": "shortText", "editable": true },
        "dietary_restrictions": { "name": "dietary_restrictions", "type": "SVAL", "dataType": "string", "function": "display", "render": "shortText", "editable": true }
      }
    },
    "DISH": {
      "name": "DISH",
      "attributes": {
        "id": { "name": "id", "type": "SVAL", "dataType": "string", "function": "privateIdentifier", "render": "hidden", "editable": false },
        "name": { "name": "name", "type": "SVAL", "dataType": "string", "function": "publicIdentifier", "render": "shortText", "editable": true },
        "cuisine_type": { "name": "cuisine_type", "type": "SVAL", "dataType": "string", "function": "display", "render": "category", "editable": true, "categories": ["American", "Italian", "Chinese", "Japanese", "French", "Mexican", "Indian", "Other"] },
        "ingredients": { "name": "ingredients", "type": "ARRY", "function": "display", "render": "expanded", "editable": true, "item": { "type": "string" } },
        "calories": { "name": "calories", "type": "SVAL", "dataType": "number", "function": "display", "render": "number", "editable": true },
        "prep_time": { "name": "prep_time", "type": "SVAL", "dataType": "string", "function": "display", "render": "shortText", "editable": true },
        "dietary_suitability": { "name": "dietary_suitability", "type": "SVAL", "dataType": "string", "function": "display", "render": "shortText", "editable": false }
      }
    },
    "ACTIVITY": {
      "name": "ACTIVITY",
      "attributes": {
        "id": { "name": "id", "type": "SVAL", "dataType": "string", "function": "privateIdentifier", "render": "hidden", "editable": false },
        "name": { "name": "name", "type": "SVAL", "dataType": "string", "function": "publicIdentifier", "render": "shortText", "editable": true },
        "description": { "name": "description", "type": "SVAL", "dataType": "string", "function": "display", "render": "paragraph", "editable": true },
        "duration": { "name": "duration", "type": "SVAL", "dataType": "string", "function": "display", "render": "shortText", "editable": true }
      }
    }
  }
}`;
