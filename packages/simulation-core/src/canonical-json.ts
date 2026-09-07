/**
 * Build canonical JSON per 02 mini-spec:
 * - object keys sorted by Unicode code point order (recursive)
 * - array order preserved
 * - no extra whitespace
 * - only finite numbers; -0 normalized to 0
 *
 * Hash material must use `toCanonicalJson`, which builds the JSON text directly.
 * Do not rely on `JSON.stringify(canonicalize(...))`: JavaScript reorders
 * integer-index-form keys during ordinary object enumeration.
 */

import type { Sha256Provider } from "./sha256-provider.js";

export type CanonicalJsonSink = (chunk: string) => void;

/**
 * Serialize `value` to canonical JSON text.
 * This is the contract used for configHash / nameDataHash inputs.
 */
export function toCanonicalJson(value: unknown): string {
  return serializeCanonical(value);
}

/**
 * Append canonical JSON text to `append` without building the full payload in one
 * allocation. Used for bounded-memory hashing of large aggregates.
 */
export function appendCanonicalJson(value: unknown, append: CanonicalJsonSink): void {
  if (value === null) {
    append("null");
    return;
  }

  switch (typeof value) {
    case "boolean":
      append(value ? "true" : "false");
      return;
    case "string":
      append(JSON.stringify(value));
      return;
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`canonical JSON rejects non-finite number: ${String(value)}`);
      }
      append(JSON.stringify(Object.is(value, -0) ? 0 : value));
      return;
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw new Error(`canonical JSON rejects value of type ${typeof value}`);
    case "object":
      break;
    default:
      throw new Error(`canonical JSON rejects value of type ${typeof value}`);
  }

  if (Array.isArray(value)) {
    append("[");
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) {
        append(",");
      }
      appendCanonicalJson(value[index], append);
    }
    append("]");
    return;
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort(compareUnicodeCodePoints);
  append("{");
  for (let index = 0; index < sortedKeys.length; index += 1) {
    if (index > 0) {
      append(",");
    }
    const key = sortedKeys[index]!;
    append(JSON.stringify(key));
    append(":");
    appendCanonicalJson(record[key], append);
  }
  append("}");
}

/**
 * Hash canonical JSON bytes without materializing the full UTF-8 string when the
 * provider exposes an incremental hasher.
 */
export function hashCanonicalValueUtf8(provider: Sha256Provider, value: unknown): string {
  const hasher = provider.createUtf8Hasher?.();
  if (hasher) {
    appendCanonicalJson(value, (chunk) => hasher.update(chunk));
    return hasher.digestHex();
  }
  return provider.hashUtf8(toCanonicalJson(value));
}

/**
 * Return a deep-normalized value tree.
 *
 * Uses a null-prototype object so a `"__proto__"` key is preserved as data.
 * Enumeration order of integer-form keys on the returned object is NOT guaranteed
 * by JavaScript; callers that need a stable textual form must use `toCanonicalJson`.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`canonical JSON rejects non-finite number: ${String(value)}`);
      }
      return Object.is(value, -0) ? 0 : value;
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw new Error(`canonical JSON rejects value of type ${typeof value}`);
    case "object":
      break;
    default:
      throw new Error(`canonical JSON rejects value of type ${typeof value}`);
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort(compareUnicodeCodePoints);
  // Null prototype keeps "__proto__" as a normal own property.
  const normalized = Object.create(null) as Record<string, unknown>;
  for (const key of sortedKeys) {
    Object.defineProperty(normalized, key, {
      value: canonicalize(record[key]),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return normalized;
}

function serializeCanonical(value: unknown): string {
  const parts: string[] = [];
  appendCanonicalJson(value, (chunk) => parts.push(chunk));
  return parts.join("");
}

export function compareUnicodeCodePoints(a: string, b: string): number {
  const aPoints = [...a];
  const bPoints = [...b];
  const length = Math.min(aPoints.length, bPoints.length);
  for (let i = 0; i < length; i += 1) {
    const aCode = aPoints[i]!.codePointAt(0)!;
    const bCode = bPoints[i]!.codePointAt(0)!;
    if (aCode !== bCode) {
      return aCode - bCode;
    }
  }
  return aPoints.length - bPoints.length;
}
