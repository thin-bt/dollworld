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

/**
 * Serialize `value` to canonical JSON text.
 * This is the contract used for configHash / nameDataHash inputs.
 */
export function toCanonicalJson(value: unknown): string {
  return serializeCanonical(value);
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
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`canonical JSON rejects non-finite number: ${String(value)}`);
      }
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
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
    const items = value.map((item) => serializeCanonical(item));
    return `[${items.join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort(compareUnicodeCodePoints);
  const properties: string[] = [];
  for (const key of sortedKeys) {
    properties.push(`${JSON.stringify(key)}:${serializeCanonical(record[key])}`);
  }
  return `{${properties.join(",")}}`;
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
