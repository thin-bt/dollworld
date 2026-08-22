/**
 * ValidationResult -> ValidationResultViewItem (§10A / ACC-133 / FIX-034/069).
 * DB-013: generic ValidationResult ok/issues[path,message] only — no invented code fields.
 */

import { fail, ok, type PureResult } from "../result.js";
import {
  PAGED_LIST_DATA_KEYS,
  VALIDATION_ISSUE_VIEW_KEYS,
  VALIDATION_RESULT_VIEW_ITEM_KEYS,
  type PagedListDataView,
  type ValidationIssueView,
  type ValidationQuery,
  type ValidationResultViewItem,
  type ValidationNextPosition,
} from "../types.js";
import { pageExclusiveSlice } from "../../ui004/shared/page-boundary.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Validate stored canonical ValidationResult and map to view item.
 * Corrupt issue schema → INTERNAL_ERROR (FI-065); never invent code/sourceProcessor/canContinue.
 */
export function mapValidationViewItem(
  validationOccurrence: number,
  result: unknown,
): PureResult<ValidationResultViewItem> {
  if (!Number.isSafeInteger(validationOccurrence) || validationOccurrence < 1) {
    return fail("validationOccurrence must be positive safe integer");
  }
  if (!isPlainObject(result) || typeof result.ok !== "boolean") {
    return fail("ValidationResult must be plain object with ok discriminant");
  }

  if (result.ok === true) {
    if ("issues" in result) {
      return fail("success ValidationResult must not include issues");
    }
    const item: ValidationResultViewItem = {
      validationOccurrence,
      status: "success",
      issueCount: 0,
      issues: [],
      result: structuredClone(result),
    };
    if (Object.keys(item).length !== VALIDATION_RESULT_VIEW_ITEM_KEYS.length) {
      return fail("ValidationResultViewItem must be exact5");
    }
    return ok(item);
  }

  if (!Array.isArray(result.issues)) {
    return fail("failure ValidationResult.issues must be an array");
  }
  const issues: ValidationIssueView[] = [];
  for (let i = 0; i < result.issues.length; i += 1) {
    const rawIssue = result.issues[i];
    if (!isPlainObject(rawIssue)) {
      return fail(`issues[${i}] must be a plain object`);
    }
    if (typeof rawIssue.path !== "string" || typeof rawIssue.message !== "string") {
      return fail(`issues[${i}] must have path and message strings`);
    }
    const view: ValidationIssueView = {
      path: rawIssue.path,
      message: rawIssue.message,
    };
    if (Object.keys(view).length !== VALIDATION_ISSUE_VIEW_KEYS.length) {
      return fail("ValidationIssueView must be exact2");
    }
    issues.push(view);
  }

  const item: ValidationResultViewItem = {
    validationOccurrence,
    status: "failure",
    issueCount: issues.length,
    issues,
    result: structuredClone(result),
  };
  if (Object.keys(item).length !== VALIDATION_RESULT_VIEW_ITEM_KEYS.length) {
    return fail("ValidationResultViewItem must be exact5");
  }
  for (const forbidden of ["code", "sourceProcessor", "canContinue"] as const) {
    if (Object.prototype.hasOwnProperty.call(item, forbidden)) {
      return fail(`forbidden convenience field: ${forbidden}`);
    }
  }
  return ok(item);
}

export function filterValidationItems(
  items: readonly ValidationResultViewItem[],
  status: ValidationQuery["status"],
): ValidationResultViewItem[] {
  if (status === null) {
    return [...items];
  }
  return items.filter((item) => item.status === status);
}

export type ValidationPageResult = {
  items: ValidationResultViewItem[];
  totalCount: number;
  nextPosition: ValidationNextPosition | null;
};

export function buildValidationPage(input: {
  items: readonly ValidationResultViewItem[];
  query: ValidationQuery;
  cursorNextPosition: ValidationNextPosition | null;
}): PureResult<ValidationPageResult> {
  const filtered = filterValidationItems(input.items, input.query.status);
  for (let i = 1; i < filtered.length; i += 1) {
    if (filtered[i]!.validationOccurrence < filtered[i - 1]!.validationOccurrence) {
      return fail("validationOccurrence not ascending");
    }
  }

  let startIndex = 0;
  if (input.cursorNextPosition !== null) {
    const idx = filtered.findIndex(
      (item) => item.validationOccurrence === input.cursorNextPosition!.validationOccurrence,
    );
    if (idx < 0) {
      return fail("cursor validationOccurrence not found", "STALE_CURSOR");
    }
    startIndex = idx + 1;
  }

  const sliced = pageExclusiveSlice({
    sortedFiltered: filtered,
    limit: input.query.limit,
    startIndex,
  });
  const last = sliced.items[sliced.items.length - 1];
  return ok({
    items: [...sliced.items],
    totalCount: sliced.totalCount,
    nextPosition:
      sliced.hasNext && last !== undefined
        ? { validationOccurrence: last.validationOccurrence }
        : null,
  });
}

export function mapPagedListDataView(input: {
  items: unknown[];
  totalCount: number;
  nextCursor: string | null;
}): PureResult<PagedListDataView> {
  const view: PagedListDataView = {
    items: input.items,
    totalCount: input.totalCount,
    nextCursor: input.nextCursor,
  };
  if (Object.keys(view).length !== PAGED_LIST_DATA_KEYS.length) {
    return fail("paged list data must be exact3");
  }
  return ok(view);
}
