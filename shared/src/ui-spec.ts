import type { ObjectRelationalSchema } from "./schema.js";
import type { Dependency } from "./dependency.js";

export type ViewType = "list" | "table" | "map";

export interface UISpecification {
  schema: ObjectRelationalSchema;
  defaultViews: Record<string, ViewType>;
}

export interface TaskDrivenDataModel {
  schema: ObjectRelationalSchema;
  dependencies: Dependency[];
  data: Record<string, Record<string, unknown>[]>;
  uiSpec: UISpecification;
}

export interface GenerateRequest {
  prompt: string;
}

export interface GenerateResponse {
  model: TaskDrivenDataModel;
  message: string;
}

export interface UpdateRequest {
  prompt: string;
  currentModel: TaskDrivenDataModel;
}

export interface UpdateResponse {
  model: TaskDrivenDataModel;
  message: string;
  operations: UpdateOperation[];
}

export interface AutocompleteRequest {
  entityName: string;
  instanceId: string;
  knownValues: Record<string, unknown>;
  currentModel: TaskDrivenDataModel;
  userHint?: string;
}

export interface AutocompleteResponse {
  completedValues: Record<string, unknown>;
}

export interface UpdateOperation {
  target: string;
  action: "add" | "remove" | "update" | "filter" | "sort" | "cluster";
  scope: "schema" | "data";
  specifications: Record<string, unknown>;
}
