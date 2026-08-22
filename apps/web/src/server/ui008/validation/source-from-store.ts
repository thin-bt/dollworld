/**
 * CommittedValidationViewStore → ValidationResultViewItem[] (API-010 / FI-064/065).
 */

import {
  assertValidationStoreInvariants,
  type CommittedValidationViewStore,
} from "../../validation-store.js";
import { fail, ok, type PureResult } from "../result.js";
import type { ValidationResultViewItem } from "../types.js";
import { mapValidationViewItem } from "./map-validation-view-item.js";

export function buildValidationSource(
  store: CommittedValidationViewStore,
  expectedSimulationId: string,
): PureResult<readonly ValidationResultViewItem[]> {
  if (store.simulationId !== expectedSimulationId) {
    return fail("validation store simulationId mismatch");
  }
  try {
    assertValidationStoreInvariants(store);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "validation store invariant failed");
  }

  const items: ValidationResultViewItem[] = [];
  for (const row of store.items) {
    const mapped = mapValidationViewItem(row.validationOccurrence, row.result);
    if (!mapped.ok) {
      return mapped;
    }
    items.push(mapped.value);
  }
  return ok(items);
}
