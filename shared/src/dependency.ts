export type DependencyMechanism = "validate" | "update";

export interface DependencyTarget {
  entity: string;
  attribute: string;
}

export interface Dependency {
  id: string;
  source: DependencyTarget;
  target: DependencyTarget;
  mechanism: DependencyMechanism;
  relationship: string;
  jsCode?: string;
}
