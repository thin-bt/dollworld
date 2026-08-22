/**
 * Shared plain-JSON structural helpers for Sprint 1 validators (14 mini-spec §1, §8).
 * Every Sprint1 validator must reject Proxy TOCTOU, accessors, Symbol keys, and sparse
 * arrays before any semantic check runs, and must never mutate the raw input it reads.
 */
import type { ValidationIssue } from "../validation.js";

/**
 * Accept only dictionary objects: `Object.prototype` or `null` prototype.
 * Rejects class instances, Date, Map, Set, arrays, and other exotic objects.
 * Fully safe: every reflection call is guarded, so a revoked Proxy or a hostile
 * `Array.isArray`/`getPrototypeOf` trap can never throw out of this function.
 * `snapshotPlainObjectOrFail` does not call this helper because it needs to
 * report which specific reflection step failed; this boolean form is kept only
 * for callers that need a plain yes/no check.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    return false;
  }
  if (isArray) {
    return false;
  }

  let proto: object | null;
  try {
    proto = Object.getPrototypeOf(value);
  } catch {
    return false;
  }
  return proto === Object.prototype || proto === null;
}

export function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function childPath(parentPath: string, key: string | number): string {
  const segment = typeof key === "number" ? String(key) : key;
  return parentPath === "" ? `/${segment}` : `${parentPath}/${segment}`;
}

/**
 * Own-key enumeration used by every structural check below. Symbol keys are reported
 * as issues (never thrown) and excluded from the returned string-key list.
 * Reflection trap exceptions become validation issues (no throw out of the validator).
 */
export function collectOwnStringKeys(
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

export function rejectUnknownKeys(
  value: object,
  allowedKeys: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void {
  const allowed = new Set<string>(allowedKeys);
  const keys = collectOwnStringKeys(value, path, issues);
  if (keys === undefined) {
    return;
  }
  for (const key of keys) {
    if (!allowed.has(key)) {
      issues.push({
        path: childPath(path, key),
        message: "unknown key is not allowed",
        actual: key,
        expected: `one of: ${allowedKeys.join(", ")}`,
      });
    }
  }
}

/**
 * Snapshot a plain object from data descriptors only.
 * Never invokes getters. Reflection failures become validation issues (no throw).
 */
export function snapshotPlainObjectOrFail(
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

    if (descriptor === undefined) {
      issues.push({
        path: childPath(path, key),
        message: "own property descriptor is missing",
        expected: "data property",
      });
      failed = true;
      continue;
    }

    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      issues.push({
        path: childPath(path, key),
        message: "accessor properties are not allowed; value must be a plain data property",
        expected: "data property",
      });
      failed = true;
      continue;
    }

    if (!("value" in descriptor)) {
      issues.push({
        path: childPath(path, key),
        message: "property must be a data property with a value",
        expected: "data property",
      });
      failed = true;
      continue;
    }

    snapshot[key] = descriptor.value;
  }

  return failed ? undefined : snapshot;
}

/** For each own string key, the descriptor must carry a plain `value` (no get/set). */
export function assertNoAccessors(value: object, path: string, issues: ValidationIssue[]): void {
  const keys = collectOwnStringKeys(value, path, issues);
  if (keys === undefined) {
    return;
  }
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
      continue;
    }
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      issues.push({
        path: childPath(path, key),
        message: "accessor properties are not allowed; value must be a plain data property",
        expected: "data property",
      });
    }
  }
}

/**
 * Dense array structural check: contiguous 0..length-1 indexes present.
 * Fully safe: reflection traps return false instead of throwing.
 * Does not itself reject extra own properties — use assertDenseArrayOwnKeys for that.
 */
export function isDenseArray(value: unknown): value is unknown[] {
  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    return false;
  }
  if (!isArray) {
    return false;
  }
  let length: number;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      typeof descriptor.value !== "number" ||
      !Number.isInteger(descriptor.value) ||
      descriptor.value < 0
    ) {
      return false;
    }
    length = descriptor.value;
  } catch {
    return false;
  }
  for (let index = 0; index < length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      return false;
    }
  }
  return true;
}

/**
 * Safely snapshot an array's `length` own property exactly once, from its data
 * descriptor only. Never reads the live `.length` accessor afterwards. Reflection
 * trap failures, missing/accessor descriptors, and non-integer or negative values
 * become validation issues (no throw).
 */
function snapshotArrayLengthOrFail(
  value: unknown[],
  path: string,
  issues: ValidationIssue[],
): number | undefined {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch {
    issues.push({
      path,
      message: "array length descriptor reflection failed",
      expected: "stable length data property",
    });
    return undefined;
  }

  if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
    issues.push({
      path,
      message: "array length must be a plain data property (no accessors)",
      expected: "length data property",
    });
    return undefined;
  }

  const length = descriptor.value;
  if (typeof length !== "number" || !Number.isInteger(length) || length < 0) {
    issues.push({
      path,
      message: "array length must be a non-negative integer",
      actual: length,
      expected: "non-negative integer",
    });
    return undefined;
  }

  return length;
}

/**
 * Array own-key contract: only dense indexes `0..length-1` and `length`.
 * Rejects sparse holes, symbol keys, accessor indexes, and extra string properties
 * (including non-enumerable extras). Reflection failures become validation issues.
 * `length` must be a snapshot already taken via `snapshotArrayLengthOrFail` (or an
 * otherwise trusted value) — this function never re-reads the live `.length`.
 */
export function assertDenseArrayOwnKeys(
  value: unknown[],
  path: string,
  issues: ValidationIssue[],
  length: number,
): boolean {
  let ownKeys: PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(value);
  } catch {
    issues.push({
      path,
      message: "array ownKeys reflection failed",
      expected: "stable dense array",
    });
    return false;
  }

  let ok = true;
  const seenIndexes = new Set<number>();

  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      issues.push({
        path,
        message: "Symbol keys are not allowed",
        actual: String(key),
        expected: "string keys only",
      });
      ok = false;
      continue;
    }

    if (key === "length") {
      continue;
    }

    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) {
      issues.push({
        path: childPath(path, String(key)),
        message: "extra own properties are not allowed on arrays",
        actual: String(key),
        expected: "only dense indexes and length",
      });
      ok = false;
      continue;
    }

    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= length) {
      issues.push({
        path: childPath(path, index),
        message: "array index is outside dense length",
        actual: key,
        expected: `0..${String(length - 1)}`,
      });
      ok = false;
      continue;
    }

    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      issues.push({
        path: childPath(path, index),
        message: "array property descriptor reflection failed",
        expected: "stable data property",
      });
      ok = false;
      continue;
    }

    if (descriptor === undefined) {
      issues.push({
        path: childPath(path, index),
        message: "array index own property is missing (sparse arrays are not allowed)",
        expected: "dense data index",
      });
      ok = false;
      continue;
    }

    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      issues.push({
        path: childPath(path, index),
        message: "accessor properties are not allowed; value must be a plain data property",
        expected: "data property",
      });
      ok = false;
      continue;
    }

    seenIndexes.add(index);
  }

  for (let index = 0; index < length; index += 1) {
    if (!seenIndexes.has(index)) {
      issues.push({
        path: childPath(path, index),
        message: "sparse arrays are not allowed",
        expected: "dense array",
      });
      ok = false;
    }
  }

  return ok;
}

/**
 * Snapshot a dense array from index data descriptors only (no live index re-reads).
 * `Array.isArray` and the `length` own property are each read exactly once, guarded
 * against throwing reflection traps; every index value comes from its own data
 * descriptor snapshot, never from a live `value[index]` read.
 */
export function snapshotDenseArrayOrFail(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  expectedLength?: number,
): unknown[] | undefined {
  const expectedDescription =
    expectedLength === undefined ? "array" : `array of length ${String(expectedLength)}`;

  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    issues.push({
      path,
      message: "array reflection failed",
      expected: expectedDescription,
    });
    return undefined;
  }

  if (!isArray) {
    issues.push({
      path,
      message: "value must be an array",
      actual: value === null ? null : typeof value,
      expected: expectedDescription,
    });
    return undefined;
  }

  const arrayValue = value as unknown[];
  const length = snapshotArrayLengthOrFail(arrayValue, path, issues);
  if (length === undefined) {
    return undefined;
  }

  if (expectedLength !== undefined && length !== expectedLength) {
    issues.push({
      path,
      message: `array length must be ${String(expectedLength)}`,
      actual: length,
      expected: String(expectedLength),
    });
    return undefined;
  }

  if (!assertDenseArrayOwnKeys(arrayValue, path, issues, length)) {
    return undefined;
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

export {
  cloneValidatedPlainJson,
  deepClonePlainJson,
  snapshotPlainJsonValueOrFail,
  snapshotPlainJsonValueOrThrow,
} from "../plain-json-snapshot.js";

export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Recursively validates and freezes an already-semantically-validated plain JSON tree.
 * Even when a node is already frozen, nested objects/arrays are still inspected and frozen.
 * The final `Object.freeze` on an already-frozen node may be skipped.
 * Rejects Symbol keys, accessors, sparse arrays, extra array properties, and cycles.
 */
export function deepFreezePlainJson<T>(value: T): T {
  freezeRecursive(value, new WeakSet<object>());
  return value;
}

function freezeRecursive(value: unknown, visiting: WeakSet<object>): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  if (visiting.has(value)) {
    throw new Error("deepFreezePlainJson rejects circular references");
  }

  visiting.add(value);
  try {
    let isArray: boolean;
    try {
      isArray = Array.isArray(value);
    } catch (error) {
      throw new Error(
        `deepFreezePlainJson array reflection failed: ${error instanceof Error ? error.message : String(error)}`,
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
          `deepFreezePlainJson array length descriptor reflection failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      if (
        lengthDescriptor === undefined ||
        lengthDescriptor.get !== undefined ||
        lengthDescriptor.set !== undefined ||
        typeof lengthDescriptor.value !== "number" ||
        !Number.isInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        throw new Error("deepFreezePlainJson rejects arrays with an invalid length descriptor");
      }
      const length = lengthDescriptor.value;

      const arrayIssues: ValidationIssue[] = [];
      if (!assertDenseArrayOwnKeys(arrayValue, "", arrayIssues, length)) {
        throw new Error(arrayIssues[0]?.message ?? "deepFreezePlainJson rejects invalid arrays");
      }
      for (let index = 0; index < length; index += 1) {
        let descriptor: PropertyDescriptor | undefined;
        try {
          descriptor = Object.getOwnPropertyDescriptor(arrayValue, index);
        } catch (error) {
          throw new Error(
            `deepFreezePlainJson property descriptor reflection failed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined
        ) {
          throw new Error("deepFreezePlainJson rejects accessor or sparse array indexes");
        }
        freezeRecursive(descriptor.value, visiting);
      }
    } else {
      let proto: object | null;
      try {
        proto = Object.getPrototypeOf(value);
      } catch (error) {
        throw new Error(
          `deepFreezePlainJson getPrototypeOf reflection failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      if (proto !== Object.prototype && proto !== null) {
        throw new Error("deepFreezePlainJson rejects non-plain object prototypes");
      }

      let ownKeys: PropertyKey[];
      try {
        ownKeys = Reflect.ownKeys(value);
      } catch (error) {
        throw new Error(
          `deepFreezePlainJson ownKeys reflection failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      for (const key of ownKeys) {
        if (typeof key === "symbol") {
          throw new Error("deepFreezePlainJson rejects Symbol keys");
        }
        let descriptor: PropertyDescriptor | undefined;
        try {
          descriptor = Object.getOwnPropertyDescriptor(value, key);
        } catch (error) {
          throw new Error(
            `deepFreezePlainJson property descriptor reflection failed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
        if (descriptor === undefined) {
          throw new Error("deepFreezePlainJson rejects missing property descriptors");
        }
        if (descriptor.get !== undefined || descriptor.set !== undefined) {
          throw new Error("deepFreezePlainJson rejects accessor properties");
        }
        freezeRecursive(descriptor.value, visiting);
      }
    }
  } finally {
    visiting.delete(value);
  }

  if (!Object.isFrozen(value)) {
    Object.freeze(value);
  }
}

export function requireString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "string" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string") {
    issues.push({ path, message: "value must be a string", actual: value, expected: "string" });
    return undefined;
  }
  return value;
}

export function requireNonEmptyString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = requireString(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value.length === 0) {
    issues.push({
      path: childPath(parentPath, key),
      message: "string must be non-empty",
      actual: value,
      expected: "non-empty string",
    });
    return undefined;
  }
  return value;
}

export function requireNonEmptyTrimmedString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = requireString(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  const path = childPath(parentPath, key);
  if (value.length === 0 || value !== value.trim()) {
    issues.push({
      path,
      message: "string must be non-empty and must not have leading or trailing whitespace",
      actual: value,
      expected: "trimmed non-empty string",
    });
    return undefined;
  }
  return value;
}

export function requireLiteralString<const L extends string>(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  literal: L,
  issues: ValidationIssue[],
): L | undefined {
  const value = requireString(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value !== literal) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must equal fixed literal "${literal}"`,
      actual: value,
      expected: literal,
    });
    return undefined;
  }
  return literal;
}

export function requireBoolean(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): boolean | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "boolean" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "boolean") {
    issues.push({ path, message: "value must be a boolean", actual: value, expected: "boolean" });
    return undefined;
  }
  return value;
}

export function requireLiteralBoolean(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  literal: boolean,
  issues: ValidationIssue[],
): boolean | undefined {
  const value = requireBoolean(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value !== literal) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must equal fixed literal ${String(literal)}`,
      actual: value,
      expected: String(literal),
    });
    return undefined;
  }
  return literal;
}

export function requireFiniteNumber(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "finite number" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({
      path,
      message: "value must be a finite number",
      actual: value,
      expected: "finite number",
    });
    return undefined;
  }
  return Object.is(value, -0) ? 0 : value;
}

export function requireNonNegativeFiniteNumber(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireFiniteNumber(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value < 0) {
    issues.push({
      path: childPath(parentPath, key),
      message: "penalty/reduction magnitude must be stored as a non-negative number",
      actual: value,
      expected: ">= 0",
    });
    return undefined;
  }
  return value;
}

export function requireNumberInRange(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  maximum: number,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireFiniteNumber(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value < minimum || value > maximum) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must be within ${String(minimum)}..${String(maximum)}`,
      actual: value,
      expected: `${String(minimum)}..${String(maximum)}`,
    });
    return undefined;
  }
  return value;
}

export function requireInteger(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "integer" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.push({ path, message: "value must be an integer", actual: value, expected: "integer" });
    return undefined;
  }
  return value;
}

export function requireIntegerInRange(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  maximum: number,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireInteger(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value < minimum || value > maximum) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must be an integer within ${String(minimum)}..${String(maximum)}`,
      actual: value,
      expected: `${String(minimum)}..${String(maximum)}`,
    });
    return undefined;
  }
  return value;
}

export function requireIntegerAtLeast(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireInteger(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value < minimum) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must be an integer >= ${String(minimum)}`,
      actual: value,
      expected: `>= ${String(minimum)}`,
    });
    return undefined;
  }
  return value;
}

/**
 * Required safe integer with no floor (e.g. Person `birthYear`, which may be <= 0
 * under calendar rule birthYear = 1 - initialAge).
 */
export function requireSafeInteger(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "safe integer" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push({
      path,
      message: "value must be a safe integer",
      actual: value,
      expected: "safe integer",
    });
    return undefined;
  }
  return value;
}

/**
 * Like `requireIntegerAtLeast`, but additionally requires `Number.isSafeInteger`.
 * Use for fields whose contract is "safe integer >= minimum" (e.g. TechniqueDefinition
 * `mentalCost`). Does not change the contract of `requireInteger` /
 * `requireIntegerAtLeast` callers.
 */
export function requireSafeIntegerAtLeast(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  issues: ValidationIssue[],
): number | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "safe integer" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push({
      path,
      message: "value must be a safe integer",
      actual: value,
      expected: "safe integer",
    });
    return undefined;
  }
  if (value < minimum) {
    issues.push({
      path,
      message: `value must be a safe integer >= ${String(minimum)}`,
      actual: value,
      expected: `>= ${String(minimum)}`,
    });
    return undefined;
  }
  return value;
}

export function requireLiteralInteger(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  literal: number,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireInteger(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  if (value !== literal) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must equal fixed literal ${String(literal)}`,
      actual: value,
      expected: String(literal),
    });
    return undefined;
  }
  return literal;
}

/** `null` OR integer >= minimum. Returns `undefined` only when the value is invalid. */
export function requireNullableIntegerAtLeast(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  issues: ValidationIssue[],
): number | null | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({
      path,
      message: "required key is missing",
      expected: `null or integer >= ${String(minimum)}`,
    });
    return undefined;
  }
  const value = object[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    issues.push({
      path,
      message: `value must be null or an integer >= ${String(minimum)}`,
      actual: value,
      expected: `null or >= ${String(minimum)}`,
    });
    return undefined;
  }
  return value;
}

export function assertExactKeys(
  object: Record<string, unknown>,
  path: string,
  expectedKeys: readonly string[],
  issues: ValidationIssue[],
): boolean {
  const expected = new Set<string>(expectedKeys);
  let ok = true;

  for (const key of expectedKeys) {
    if (!hasOwn(object, key)) {
      issues.push({
        path: childPath(path, key),
        message: "required key is missing",
        expected: key,
      });
      ok = false;
    }
  }

  const keys = collectOwnStringKeys(object, path, issues);
  if (keys === undefined) {
    return false;
  }
  for (const key of keys) {
    if (!expected.has(key)) {
      issues.push({
        path: childPath(path, key),
        message: "unknown key is not allowed",
        actual: key,
      });
      ok = false;
    }
  }

  return ok;
}
