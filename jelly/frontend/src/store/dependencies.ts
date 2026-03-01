import type { Dependency, TaskDrivenDataModel } from "@jelly/shared";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function executeDependency(
  dependency: Dependency,
  sourceValue: unknown,
  targetValue: unknown,
  allData: Record<string, Record<string, unknown>[]>,
): { result: unknown; valid: boolean; message?: string } {
  if (dependency.jsCode) {
    return executeJsCode(dependency, sourceValue, targetValue, allData);
  }
  return { result: targetValue, valid: true };
}

function executeJsCode(
  dependency: Dependency,
  sourceValue: unknown,
  targetValue: unknown,
  allData: Record<string, Record<string, unknown>[]>,
): { result: unknown; valid: boolean; message?: string } {
  try {
    const fn = new Function(
      "sourceValue",
      "targetValue",
      "allData",
      `"use strict"; return (${dependency.jsCode});`,
    );
    const result = fn(sourceValue, targetValue, allData);

    if (dependency.mechanism === "validate") {
      return {
        result: targetValue,
        valid: Boolean(result),
        message: result ? undefined : dependency.relationship,
      };
    }

    return { result, valid: true };
  } catch (err) {
    console.warn(`Dependency ${dependency.id} execution failed:`, err);
    return { result: targetValue, valid: true };
  }
}

export function getAffectedDependencies(
  dependencies: Dependency[],
  entityName: string,
  attributeName: string,
): Dependency[] {
  return dependencies.filter(
    (dep) =>
      dep.source.entity === entityName &&
      dep.source.attribute === attributeName,
  );
}

export function runDependencyChain(
  model: TaskDrivenDataModel,
  changedEntity: string,
  changedAttribute: string,
  newValue: unknown,
): {
  updatedData: Record<string, Record<string, unknown>[]>;
  violations: { dependency: Dependency; message: string }[];
} {
  const violations: { dependency: Dependency; message: string }[] = [];
  const data = JSON.parse(JSON.stringify(model.data));

  const affected = getAffectedDependencies(
    model.dependencies,
    changedEntity,
    changedAttribute,
  );

  for (const dep of affected) {
    const targetInstances = data[dep.target.entity] || [];

    for (const instance of targetInstances) {
      const { result, valid, message } = executeDependency(
        dep,
        newValue,
        instance[dep.target.attribute],
        data,
      );

      if (dep.mechanism === "validate" && !valid) {
        violations.push({
          dependency: dep,
          message: message || dep.relationship,
        });
      } else if (dep.mechanism === "update") {
        instance[dep.target.attribute] = result;
      }
    }
  }

  return { updatedData: data, violations };
}
