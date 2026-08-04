/**
 * Basis-points (×10000) normalization for Sprint1Config factor/ratio/weight fields
 * (14 mini-spec §1 / §8).
 *
 * Raw JSON may carry decimal display units (0.65, 1.15). Validation converts those
 * fields to integer basis points before freeze / canonical JSON / configHash.
 *
 * Conversion is strict: `value * 10000` must already be a safe integer. No
 * Math.round, no epsilon neighborhood, no floor/ceil recovery.
 */
import type { ValidationIssue } from "../validation.js";
import { childPath } from "./plain-data.js";

export const BASIS_POINTS_SCALE = 10000 as const;

declare const basisPointsBrand: unique symbol;

/** Integer basis-points unit (scale 10000). Distinct from counts / percents / scores. */
export type BasisPoints = number & { readonly [basisPointsBrand]: void };

/**
 * Brand a value that has already been verified as a finite safe integer
 * (including after successful `normalizeBasisPoints`). Not for arbitrary numbers.
 */
function brandBasisPoints(value: number): BasisPoints {
  return value as BasisPoints;
}

/**
 * Convert a finite decimal display value to integer basis points.
 *
 * - finite number required
 * - `-0` → `0`
 * - succeeds only when `value * 10000` is already a safe integer
 * - does not Math.round or accept near-miss values
 */
export function normalizeBasisPoints(value: number): BasisPoints | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalizedValue = Object.is(value, -0) ? 0 : value;
  const scaled = normalizedValue * BASIS_POINTS_SCALE;
  if (!Number.isSafeInteger(scaled)) {
    return undefined;
  }
  return brandBasisPoints(scaled === 0 ? 0 : scaled);
}

/**
 * Accept an already-normalized basis-points integer (no ×10000).
 * Rejects non-integers, non-finite, and `-0`.
 */
export function requireNormalizedBasisPointsValue(value: unknown): BasisPoints | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
    return undefined;
  }
  return brandBasisPoints(value === 0 ? 0 : value);
}

export function requireBasisPoints(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): BasisPoints | undefined {
  const path = childPath(parentPath, key);
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({
      path,
      message: "required key is missing",
      expected: "finite number (basis points)",
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({
      path,
      message: "value must be a finite number for basis-points normalization",
      actual: value,
      expected: "finite number whose ×10000 is a safe integer",
    });
    return undefined;
  }
  const bp = normalizeBasisPoints(value);
  if (bp === undefined) {
    issues.push({
      path,
      message: "value cannot be normalized to basis points (value × 10000 must be a safe integer)",
      actual: value,
      expected: "exact 1/10000 step (IEEE: value * 10000 is safe integer)",
    });
    return undefined;
  }
  return bp;
}

export function requireAlreadyNormalizedBasisPoints(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): BasisPoints | undefined {
  const path = childPath(parentPath, key);
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({
      path,
      message: "required key is missing",
      expected: "safe integer basis points",
    });
    return undefined;
  }
  const value = object[key];
  const bp = requireNormalizedBasisPointsValue(value);
  if (bp === undefined) {
    issues.push({
      path,
      message: "normalized basis-points field must be a finite safe integer (no -0)",
      actual: value,
      expected: "safe integer basis points",
    });
    return undefined;
  }
  return bp;
}

export function requireBasisPointsInRawRange(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  rawMinimum: number,
  rawMaximum: number,
  issues: ValidationIssue[],
): BasisPoints | undefined {
  const bp = requireBasisPoints(object, key, parentPath, issues);
  if (bp === undefined) {
    return undefined;
  }
  const minBp = normalizeBasisPoints(rawMinimum);
  const maxBp = normalizeBasisPoints(rawMaximum);
  if (minBp === undefined || maxBp === undefined) {
    issues.push({
      path: childPath(parentPath, key),
      message: "internal basis-points range bounds are invalid",
      expected: "exact 1/10000 step bounds",
    });
    return undefined;
  }
  if (bp < minBp || bp > maxBp) {
    issues.push({
      path: childPath(parentPath, key),
      message: `value must be within ${String(rawMinimum)}..${String(rawMaximum)} (basis points ${String(minBp)}..${String(maxBp)})`,
      actual: bp,
      expected: `${String(minBp)}..${String(maxBp)} basis points`,
    });
    return undefined;
  }
  return bp;
}

export function requireNormalizedBasisPointsInRange(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimumBp: number,
  maximumBp: number,
  issues: ValidationIssue[],
): BasisPoints | undefined {
  const bp = requireAlreadyNormalizedBasisPoints(object, key, parentPath, issues);
  if (bp === undefined) {
    return undefined;
  }
  if (bp < minimumBp || bp > maximumBp) {
    issues.push({
      path: childPath(parentPath, key),
      message: `basis-points value must be within ${String(minimumBp)}..${String(maximumBp)}`,
      actual: bp,
      expected: `${String(minimumBp)}..${String(maximumBp)}`,
    });
    return undefined;
  }
  return bp;
}

export function requireNonNegativeBasisPoints(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): BasisPoints | undefined {
  const bp = requireBasisPoints(object, key, parentPath, issues);
  if (bp === undefined) {
    return undefined;
  }
  if (bp < 0) {
    issues.push({
      path: childPath(parentPath, key),
      message: "basis-points value must be non-negative",
      actual: bp,
      expected: ">= 0",
    });
    return undefined;
  }
  return bp;
}

export function requireNonNegativeNormalizedBasisPoints(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): BasisPoints | undefined {
  const bp = requireAlreadyNormalizedBasisPoints(object, key, parentPath, issues);
  if (bp === undefined) {
    return undefined;
  }
  if (bp < 0) {
    issues.push({
      path: childPath(parentPath, key),
      message: "basis-points value must be non-negative",
      actual: bp,
      expected: ">= 0",
    });
    return undefined;
  }
  return bp;
}

/** Recursively assert every number leaf is a finite safe integer with no -0. */
export function assertAllNumericLeavesAreSafeIntegers(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return true;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value) || Object.is(value, -0)) {
      issues.push({
        path,
        message: "normalized Sprint1Config numeric leaf must be a finite safe integer (no -0)",
        actual: value,
        expected: "safe integer",
      });
      return false;
    }
    return true;
  }
  if (typeof value !== "object") {
    return true;
  }
  if (Array.isArray(value)) {
    let ok = true;
    for (let index = 0; index < value.length; index += 1) {
      if (
        !assertAllNumericLeavesAreSafeIntegers(value[index], `${path}/${String(index)}`, issues)
      ) {
        ok = false;
      }
    }
    return ok;
  }
  let ok = true;
  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key];
    const childPathValue = path === "" ? `/${key}` : `${path}/${key}`;
    if (!assertAllNumericLeavesAreSafeIntegers(child, childPathValue, issues)) {
      ok = false;
    }
  }
  return ok;
}

export function countNumericLeaves(value: unknown): { total: number; nonInteger: number } {
  let total = 0;
  let nonInteger = 0;
  const walk = (node: unknown): void => {
    if (typeof node === "number") {
      total += 1;
      if (!Number.isSafeInteger(node) || Object.is(node, -0)) {
        nonInteger += 1;
      }
      return;
    }
    if (node === null || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    for (const key of Object.keys(node)) {
      walk((node as Record<string, unknown>)[key]);
    }
  };
  walk(value);
  return { total, nonInteger };
}
