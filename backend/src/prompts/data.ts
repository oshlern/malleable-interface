export const DATA_SYSTEM_PROMPT = `You are a data generator. Given an object-relational schema and dependency constraints, generate realistic sample data that conforms to the schema.

Rules:
1. Generate data as a JSON object where each key is an entity name and the value is an array of instances.
2. Each instance must include all attributes defined in the entity schema.
3. For SVAL attributes: provide a value matching the dataType (string or number).
4. For PNTR attributes: provide the "id" of the referenced entity instance.
5. For ARRY attributes with item.type = "__<ENTITY>__": provide an array of ids referencing instances of that entity.
6. For ARRY attributes with item.type = "string" or "number": provide an array of primitive values.
7. For DICT attributes: provide an object with keys matching the dict fields.
8. Each instance must have a unique "id" string (use descriptive slugs like "guest_alice", "dish_carbonara").
9. Generate 3-5 instances per entity unless the context suggests otherwise.
10. Respect dependency constraints (e.g., if dietary suitability depends on restrictions, make the data consistent).

Return a JSON object: { "<ENTITY_NAME>": [ { ...instance }, ... ], ... }

Only return valid JSON, no explanation.`;

export const DATA_FEW_SHOT_EXAMPLE = `Schema entities: DINNER_PLAN, GUEST, DISH

{
  "DINNER_PLAN": [
    {
      "id": "dinner_plan_1",
      "title": "Saturday Evening Dinner Party",
      "date": "2025-03-15T18:00:00",
      "location": "123 Main St, San Diego, CA",
      "guest_list": ["guest_alice", "guest_bob", "guest_carol"],
      "menu": ["dish_carbonara", "dish_caesar_salad", "dish_tiramisu"],
      "activities": ["activity_trivia", "activity_karaoke"]
    }
  ],
  "GUEST": [
    {
      "id": "guest_alice",
      "name": "Alice Chen",
      "email": "alice@example.com",
      "phone": "(555) 123-4567",
      "dietary_restrictions": "Vegetarian"
    },
    {
      "id": "guest_bob",
      "name": "Bob Martinez",
      "email": "bob@example.com",
      "phone": "(555) 234-5678",
      "dietary_restrictions": "None"
    },
    {
      "id": "guest_carol",
      "name": "Carol Johnson",
      "email": "carol@example.com",
      "phone": "(555) 345-6789",
      "dietary_restrictions": "Gluten-free"
    }
  ],
  "DISH": [
    {
      "id": "dish_carbonara",
      "name": "Spaghetti Carbonara",
      "cuisine_type": "Italian",
      "ingredients": ["spaghetti", "eggs", "pancetta", "parmesan", "black pepper"],
      "calories": 650,
      "prep_time": "30 minutes",
      "dietary_suitability": "Contains gluten, not vegetarian"
    },
    {
      "id": "dish_caesar_salad",
      "name": "Caesar Salad",
      "cuisine_type": "American",
      "ingredients": ["romaine lettuce", "croutons", "parmesan", "caesar dressing"],
      "calories": 350,
      "prep_time": "15 minutes",
      "dietary_suitability": "Vegetarian, contains gluten"
    }
  ]
}`;
