import { toCanonicalJson, type ValidationResult } from "@shared-world/simulation-core";

export const COMMITTED_VALIDATION_VIEW_STORE_SCHEMA_VERSION = "0.1.0" as const;

export type CanonicalValidationResult = Record<string, unknown>;

export type CommittedValidationViewItem = {
  readonly validationOccurrence: number;
  readonly result: CanonicalValidationResult;
};

export type CommittedValidationViewStore = {
  readonly schemaVersion: typeof COMMITTED_VALIDATION_VIEW_STORE_SCHEMA_VERSION;
  readonly simulationId: string;
  readonly items: readonly CommittedValidationViewItem[];
  readonly nextValidationOccurrence: number;
};

export type ValidationStoreHooks = {
  beforeCommit?: () => void;
};

export function canonicalCloneValidationResult(
  result: ValidationResult<unknown>,
): CanonicalValidationResult {
  if (result.ok) {
    // Success values from create/step facades are not store material; only discriminant.
    return JSON.parse(toCanonicalJson({ ok: true })) as CanonicalValidationResult;
  }
  const issues = result.issues.map((issue) => {
    const row: Record<string, unknown> = {
      path: issue.path,
      message: issue.message,
    };
    if (issue.actual !== undefined) {
      try {
        JSON.parse(toCanonicalJson(issue.actual));
        row.actual = issue.actual;
      } catch {
        row.actual = String(issue.actual);
      }
    }
    if (issue.expected !== undefined) {
      row.expected = issue.expected;
    }
    return row;
  });
  return JSON.parse(toCanonicalJson({ ok: false, issues })) as CanonicalValidationResult;
}

export function createEmptyValidationStore(simulationId: string): CommittedValidationViewStore {
  return {
    schemaVersion: COMMITTED_VALIDATION_VIEW_STORE_SCHEMA_VERSION,
    simulationId,
    items: [],
    nextValidationOccurrence: 1,
  };
}

/** start/reset: replace store from initialization ValidationResult collection (may be empty). */
export function createValidationStoreFromInitialization(input: {
  simulationId: string;
  results: readonly ValidationResult<unknown>[];
  hooks?: ValidationStoreHooks | undefined;
}): CommittedValidationViewStore {
  input.hooks?.beforeCommit?.();
  const items: CommittedValidationViewItem[] = input.results.map((result, index) => ({
    validationOccurrence: index + 1,
    result: canonicalCloneValidationResult(result),
  }));
  return {
    schemaVersion: COMMITTED_VALIDATION_VIEW_STORE_SCHEMA_VERSION,
    simulationId: input.simulationId,
    items,
    nextValidationOccurrence: items.length === 0 ? 1 : items.length + 1,
  };
}

export function appendValidationResults(input: {
  store: CommittedValidationViewStore;
  results: readonly ValidationResult<unknown>[];
  hooks?: ValidationStoreHooks;
}): CommittedValidationViewStore {
  input.hooks?.beforeCommit?.();
  if (input.results.length === 0) {
    return input.store;
  }
  let next = input.store.nextValidationOccurrence;
  const appended: CommittedValidationViewItem[] = input.results.map((result) => {
    const item = {
      validationOccurrence: next,
      result: canonicalCloneValidationResult(result),
    };
    next += 1;
    return item;
  });
  return {
    schemaVersion: COMMITTED_VALIDATION_VIEW_STORE_SCHEMA_VERSION,
    simulationId: input.store.simulationId,
    items: [...input.store.items, ...appended],
    nextValidationOccurrence: next,
  };
}

export function assertValidationStoreInvariants(store: CommittedValidationViewStore): void {
  if (store.items.length === 0) {
    if (store.nextValidationOccurrence !== 1) {
      throw new Error("empty validation store nextValidationOccurrence must be 1");
    }
    return;
  }
  for (let i = 0; i < store.items.length; i += 1) {
    const expected = i + 1;
    if (store.items[i]!.validationOccurrence !== expected) {
      throw new Error("validationOccurrence gap or disorder");
    }
  }
  const last = store.items[store.items.length - 1]!.validationOccurrence;
  if (store.nextValidationOccurrence !== last + 1) {
    throw new Error("nextValidationOccurrence mismatch");
  }
}
