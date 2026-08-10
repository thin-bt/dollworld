/**
 * Sprint-neutral descriptor-safe plain JSON deep snapshot / clone helpers.
 * Used by WorldEngine and other Sprint 0 foundations — must not import from sprint1/.
 */
import type { ValidationIssue } from "./validation.js";

function childPath(parentPath: string, key: string | number): string {
  const segment = typeof key === "number" ? String(key) : key;
  return parentPath === "" ? `/${segment}` : `${parentPath}/${segment}`;
}

function collectOwnStringKeys(
  value: object,
  path: string,
  issues: ValidationIssue[],
): string[] | undefined {
  let ownKeys: PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(value);
  } catch {
    issues.push({
      path,
      message: "object ownKeys reflection failed",
      expected: "stable plain object or array",
    });
    return undefined;
  }

  const keys: string[] = [];
  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    issues.push({
      path,
      message: "array reflection failed",
      expected: "stable plain object or array",
    });
    return undefined;
  }
  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      issues.push({
        path,
        message: "Symbol keys are not allowed",
        actual: String(key),
        expected: "string keys only",
      });
      continue;
    }
    if (isArray && key === "length") {
      continue;
    }
    keys.push(String(key));
  }
  return keys;
}

function snapshotPlainObjectShallowOrFail(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) {
    issues.push({
      path,
      message: "value must be a plain object",
      actual: value === null ? null : typeof value,
      expected: "plain object",
    });
    return undefined;
  }

  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    issues.push({
      path,
      message: "array reflection failed",
      expected: "plain object",
    });
    return undefined;
  }
  if (isArray) {
    issues.push({
      path,
      message: "value must be a plain object, not an array",
      actual: "array",
      expected: "plain object",
    });
    return undefined;
  }

  let proto: object | null;
  try {
    proto = Object.getPrototypeOf(value);
  } catch {
    issues.push({
      path,
      message: "getPrototypeOf reflection failed",
      expected: "plain object",
    });
    return undefined;
  }
  if (proto !== Object.prototype && proto !== null) {
    issues.push({
      path,
      message: "value must be a plain object (Object.prototype or null prototype only)",
      expected: "plain object",
    });
    return undefined;
  }

  const keys = collectOwnStringKeys(value, path, issues);
  if (keys === undefined) {
    return undefined;
  }

  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  let failed = false;
  for (const key of keys) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      issues.push({
        path: childPath(path, key),
        message: "object property descriptor reflection failed",
        expected: "stable data property",
      });
      failed = true;
      continue;
    }
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor)
    ) {
      issues.push({
        path: childPath(path, key),
        message: "accessor properties are not allowed; value must be a plain data property",
        expected: "data property",
      });
      failed = true;
      continue;
    }
    snapshot[key] = descriptor.value;
  }
  return failed ? undefined : snapshot;
}

function snapshotDenseArrayShallowOrFail(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): unknown[] | undefined {
  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    issues.push({
      path,
      message: "array reflection failed",
      expected: "array",
    });
    return undefined;
  }
  if (!isArray) {
    issues.push({
      path,
      message: "value must be an array",
      actual: value === null ? null : typeof value,
      expected: "array",
    });
    return undefined;
  }

  const arrayValue = value as unknown[];
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    lengthDescriptor = Object.getOwnPropertyDescriptor(arrayValue, "length");
  } catch {
    issues.push({
      path,
      message: "array length descriptor reflection failed",
      expected: "stable length data property",
    });
    return undefined;
  }
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    issues.push({
      path,
      message: "array length must be a plain non-negative integer data property",
      expected: "length data property",
    });
    return undefined;
  }
  const length = lengthDescriptor.value;

  let ownKeys: PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(arrayValue);
  } catch {
    issues.push({
      path,
      message: "array ownKeys reflection failed",
      expected: "stable dense array",
    });
    return undefined;
  }

  const expectedKeys = new Set<string>(["length"]);
  for (let index = 0; index < length; index += 1) {
    expectedKeys.add(String(index));
  }
  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      issues.push({
        path,
        message: "Symbol keys are not allowed",
        actual: String(key),
        expected: "string keys only",
      });
      return undefined;
    }
    if (!expectedKeys.has(String(key))) {
      issues.push({
        path,
        message: "sparse arrays / extra array properties are not allowed",
        actual: String(key),
        expected: "dense indexes 0..length-1 and length",
      });
      return undefined;
    }
  }

  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(arrayValue, index);
    } catch {
      issues.push({
        path: childPath(path, index),
        message: "array property descriptor reflection failed",
        expected: "stable data property",
      });
      return undefined;
    }
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor)
    ) {
      issues.push({
        path: childPath(path, index),
        message: "sparse arrays are not allowed",
        expected: "dense data index",
      });
      return undefined;
    }
    snapshot.push(descriptor.value);
  }
  return snapshot;
}

/**
 * Descriptor-safe deep snapshot of a plain JSON value.
 * Never invokes getters/setters/`toJSON`/`JSON.stringify`/`structuredClone`.
 */
export function snapshotPlainJsonValueOrFail(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  visiting: WeakSet<object> = new WeakSet<object>(),
): unknown | undefined {
  if (value === null) {
    return null;
  }

  const valueType = typeof value;
  if (valueType === "boolean" || valueType === "string") {
    return value;
  }
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      issues.push({
        path,
        message: "number must be a finite JSON number",
        actual: value,
        expected: "finite number (not NaN / Infinity / -Infinity)",
      });
      return undefined;
    }
    return value;
  }
  if (
    valueType === "undefined" ||
    valueType === "function" ||
    valueType === "symbol" ||
    valueType === "bigint"
  ) {
    issues.push({
      path,
      message: "value must be plain JSON (null/boolean/string/finite number/array/plain object)",
      actual: valueType,
      expected: "plain JSON value",
    });
    return undefined;
  }
  if (valueType !== "object") {
    issues.push({
      path,
      message: "value must be plain JSON",
      actual: valueType,
      expected: "plain JSON value",
    });
    return undefined;
  }

  const objectValue = value as object;
  if (visiting.has(objectValue)) {
    issues.push({
      path,
      message: "circular references are not allowed",
      expected: "acyclic plain JSON",
    });
    return undefined;
  }

  visiting.add(objectValue);
  try {
    let isArray: boolean;
    try {
      isArray = Array.isArray(objectValue);
    } catch {
      issues.push({
        path,
        message: "array reflection failed",
        expected: "plain JSON array or object",
      });
      return undefined;
    }

    if (isArray) {
      const shallow = snapshotDenseArrayShallowOrFail(objectValue, path, issues);
      if (shallow === undefined) {
        return undefined;
      }
      const deep: unknown[] = [];
      for (let index = 0; index < shallow.length; index += 1) {
        const child = snapshotPlainJsonValueOrFail(
          shallow[index],
          childPath(path, index),
          issues,
          visiting,
        );
        if (child === undefined && issues.length > 0) {
          return undefined;
        }
        deep.push(child);
      }
      return deep;
    }

    const shallow = snapshotPlainObjectShallowOrFail(objectValue, path, issues);
    if (shallow === undefined) {
      return undefined;
    }
    const deep: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(shallow)) {
      const child = snapshotPlainJsonValueOrFail(
        shallow[key],
        childPath(path, key),
        issues,
        visiting,
      );
      if (child === undefined && issues.length > 0) {
        return undefined;
      }
      deep[key] = child;
    }
    return deep;
  } finally {
    visiting.delete(objectValue);
  }
}

export function snapshotPlainJsonValueOrThrow(value: unknown, path = ""): unknown {
  const issues: ValidationIssue[] = [];
  const snapshot = snapshotPlainJsonValueOrFail(value, path, issues);
  if (snapshot === undefined || issues.length > 0) {
    const first = issues[0];
    throw new Error(
      first === undefined
        ? `snapshotPlainJsonValueOrThrow failed at ${path || "/"}`
        : `${first.message} (${first.path})`,
    );
  }
  return snapshot;
}

/**
 * Deep clone of an already-validated plain JSON value (descriptor-safe; no getters).
 */
export function cloneValidatedPlainJson<T>(value: T): T {
  return cloneValidatedRecursive(value, new WeakSet<object>()) as T;
}

/** Backward-compatible alias. */
export const deepClonePlainJson = cloneValidatedPlainJson;

function cloneValidatedRecursive(value: unknown, visiting: WeakSet<object>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (visiting.has(value)) {
    throw new Error("cloneValidatedPlainJson rejects circular references");
  }

  visiting.add(value);
  try {
    let isArray: boolean;
    try {
      isArray = Array.isArray(value);
    } catch (error) {
      throw new Error(
        `cloneValidatedPlainJson array reflection failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    if (isArray) {
      const arrayValue = value as unknown[];
      let lengthDescriptor: PropertyDescriptor | undefined;
      try {
        lengthDescriptor = Object.getOwnPropertyDescriptor(arrayValue, "length");
      } catch (error) {
        throw new Error(
          `cloneValidatedPlainJson array length descriptor reflection failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      const length = lengthDescriptor?.value;
      if (typeof length !== "number" || !Number.isInteger(length) || length < 0) {
        throw new Error("cloneValidatedPlainJson rejects arrays with an invalid length");
      }

      const cloned: unknown[] = new Array<unknown>(length);
      for (let index = 0; index < length; index += 1) {
        let descriptor: PropertyDescriptor | undefined;
        try {
          descriptor = Object.getOwnPropertyDescriptor(arrayValue, index);
        } catch (error) {
          throw new Error(
            `cloneValidatedPlainJson property descriptor reflection failed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
        cloned[index] = cloneValidatedRecursive(descriptor?.value, visiting);
      }
      return cloned;
    }

    let ownKeys: PropertyKey[];
    try {
      ownKeys = Reflect.ownKeys(value);
    } catch (error) {
      throw new Error(
        `cloneValidatedPlainJson ownKeys reflection failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    const cloned: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys) {
      if (typeof key === "symbol") {
        throw new Error("cloneValidatedPlainJson rejects Symbol keys");
      }
      let descriptor: PropertyDescriptor | undefined;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch (error) {
        throw new Error(
          `cloneValidatedPlainJson property descriptor reflection failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      cloned[key] = cloneValidatedRecursive(descriptor?.value, visiting);
    }
    return cloned;
  } finally {
    visiting.delete(value);
  }
}
