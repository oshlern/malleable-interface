export type AttributeType = "SVAL" | "DICT" | "PNTR" | "ARRY";

export type SvalRenderType =
  | "shortText"
  | "paragraph"
  | "number"
  | "url"
  | "time"
  | "location"
  | "category"
  | "hidden";

export type ArrayRenderType = "summary" | "expanded";

export type AttributeFunction =
  | "privateIdentifier"
  | "publicIdentifier"
  | "display";

export interface SummarySpec {
  name: string;
  derived: {
    field: string;
    operation: "SUM" | "AVG" | "MIN" | "MAX" | "COUNT" | "FILTER";
  };
}

export interface ArrayItemSpec {
  type: string;
  thumbnail?: string[];
}

export interface BaseAttribute {
  name: string;
  type: AttributeType;
}

export interface SvalAttribute extends BaseAttribute {
  type: "SVAL";
  dataType: "string" | "number";
  function: AttributeFunction;
  render: SvalRenderType;
  editable: boolean;
  categories?: string[];
}

export interface DictAttribute extends BaseAttribute {
  type: "DICT";
  fields: Record<string, SvalAttribute>;
}

export interface PntrAttribute extends BaseAttribute {
  type: "PNTR";
  entityRef: string;
  function: AttributeFunction;
  thumbnail: string[];
  editable: boolean;
}

export interface ArryAttribute extends BaseAttribute {
  type: "ARRY";
  function: AttributeFunction;
  render: ArrayRenderType;
  editable: boolean;
  item: ArrayItemSpec;
  summary?: SummarySpec;
}

export type Attribute =
  | SvalAttribute
  | DictAttribute
  | PntrAttribute
  | ArryAttribute;

export interface Entity {
  name: string;
  attributes: Record<string, Attribute>;
}

export interface ObjectRelationalSchema {
  taskEntity: string;
  entities: Record<string, Entity>;
}
