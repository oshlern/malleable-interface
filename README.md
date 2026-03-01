# Jelly — Generative and Malleable User Interfaces

Implementation of the CHI '25 paper *"Generative and Malleable User Interfaces with Generative and Evolving Task-Driven Data Model"* by Cao, Jiang, and Xia (UCSD).

Jelly takes natural language prompts describing information tasks and generates customizable, structured user interfaces powered by task-driven data models.

## Architecture

- **Backend**: Hono (TypeScript) — LLM pipeline for schema/dependency/data/UI-spec generation
- **Frontend**: React + Vite + Tailwind CSS + Zustand — panel-based malleable UI
- **Shared**: TypeScript types for the data model, used by both backend and frontend
- **LLMs**: GPT-4o (schema, dependencies, data, updates) + Claude (UI specification)

## Setup

```bash
# Install dependencies
npm install

# Copy env and add your API keys
cp .env.example .env

# Run both backend and frontend
npm run dev
```

The frontend runs at `http://localhost:5173`, the backend at `http://localhost:3001`.

## Key Concepts from the Paper

- **Task-Driven Data Model**: Object-relational schema + dependency graph + structured data
- **Object-Relational Schema**: Entities with SVAL, DICT, PNTR, ARRY attribute types
- **Dependency Graph**: Validate/update relationships between attributes (JS code or natural language)
- **UI Specification**: Annotations on attributes (function, render type, editable) that map to widgets
- **Continuous Prompting**: Follow-up prompts update the model incrementally via operations
- **Direct Manipulation**: Inline editing, add/delete instances, auto-complete, attribute deletion
- **View Management**: List, table, and map views per entity, switchable at runtime
- **Synchronized Highlighting**: Hover over an entity instance to highlight it across all panels
- **Traceable History**: Every chat message snapshots the model state for undo/restore
