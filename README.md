# Malleable Interface

Explorations in generative, adaptive user interfaces that reshape themselves around the user's task.

## `jelly/` — Paper Implementation

Implementation of the CHI '25 paper [*"Generative and Malleable User Interfaces with Generative and Evolving Task-Driven Data Model"*](https://doi.org/10.1145/3706598.3713285) by Cao, Jiang, and Xia (UCSD).

The system takes a natural language prompt (e.g., "I am hosting a dinner party"), generates a task-driven data model (object-relational schema + dependency graph), and renders a structured, customizable UI from it. Users can modify the interface through follow-up prompts or direct manipulation.

Key concepts from the paper:
- **Task-driven data model** as the intermediate representation between prompt and UI
- **Object-relational schema** with typed attributes (SVAL, DICT, PNTR, ARRY)
- **UI specification** annotations that map schema elements to widgets
- **Continuous prompting** for incremental model/UI evolution
- **Traceable history** — every chat message snapshots the model state

Stack: TypeScript, React, Hono, Zustand, Tailwind, GPT-4o.

---

## Next Iterations

### Stylized, task-native UI

The Jelly implementation renders a generic panel-based interface — every task looks roughly the same (cards, lists, tables). The next iteration should produce interfaces that feel *designed for the task*, not generated from a template. A dinner party planner should look and feel different from a research literature review. This means moving beyond uniform widget rendering toward task-aware layout, typography, color, and interaction patterns.

### Predictive action completion

Inspired by how Cursor's tab-complete works for code editing — where 1-2 keystrokes are enough to predict and execute the intended edit — but generalized beyond text to *any UI action*. The system should observe partial user intent (a click target, a drag direction, a few typed characters, a hover pattern) and surface the most likely next action as a ghost/preview that the user can accept with Tab.

Examples:
- User starts typing "veg" in a dietary field → predict "Vegetarian", show ghost text, Tab accepts
- User hovers over a dish then moves toward the delete zone → ghost the deletion, Tab confirms
- User selects two guests → predict "compare schedules" or "create subgroup", show action pill, Tab executes
- User drags an item near a category boundary → predict reclassification, Tab commits
- After adding a budget attribute → predict "add total row" as a follow-up action

This is autocomplete for interaction, not just text. The prediction model needs access to the schema, current data, recent action history, and cursor/pointer position to rank likely next actions.

### Game interfaces

The Jelly paper scopes to *information tasks* — planning, research, decision-making. But malleable interfaces are just as relevant for games, where the "task" is play and the data model describes game state rather than information entities.

A game-oriented malleable interface would need to handle things the paper's model doesn't:
- **Real-time state** — game state changes continuously, not just in response to user prompts. Timers, physics, AI opponents, animations.
- **Spatial/visual layout as core** — in information tasks, layout is presentation. In games, the spatial arrangement *is* the game (a board, a map, a hand of cards). The rendering layer can't be generic widgets.
- **Rules as first-class** — the paper's dependency graph handles simple validate/update relationships. Game rules are richer: turn order, win conditions, resource constraints, conditional triggers. The "dependency graph" becomes a rule engine.
- **Multiplayer** — information tasks are single-user. Games often involve multiple players with hidden information, turn-taking, or real-time competition.
- **Fun over efficiency** — information UIs optimize for clarity and speed. Game UIs optimize for engagement, surprise, and aesthetic pleasure.

The interesting question: can the same generate-from-prompt → data-model → render-UI pipeline work if the intermediate representation is a *game state model* instead of an information schema? "I want a card game where you collect animals" → game rules + state schema + visual board.
