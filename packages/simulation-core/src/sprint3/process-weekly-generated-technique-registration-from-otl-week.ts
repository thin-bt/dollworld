/**
 * S03-010 weekly production integration: OTL founding histories → generated-technique overlay.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { registerGeneratedTechniqueFromGenerationSuccess } from "./adapt-original-technique-generation-registration.js";
import {
  createEmptyGeneratedTechniqueCatalogOverlay,
  type GeneratedTechniqueCatalogOverlay,
} from "./generated-technique-catalog-overlay.js";
import { isGeneratedTechniqueRegistrationEnabled } from "./materialize-generated-technique-definition.js";
import type { OriginalTechniqueLifecycleRuntimeState } from "./original-technique-lifecycle-runtime-state.js";
import type {
  OriginalTechniqueFoundingHistoryRecord,
  OriginalTechniqueGenerationOutcome,
  Sprint3Config,
} from "./types.js";

export type ProcessWeeklyGeneratedTechniqueRegistrationFromOtlWeekInput = {
  sprint3Config?: Sprint3Config;
  techniqueCatalog: TechniqueCatalog;
  originalTechniqueLifecycleRuntime?: OriginalTechniqueLifecycleRuntimeState;
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay;
};

export type ProcessWeeklyGeneratedTechniqueRegistrationFromOtlWeekResult = {
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay;
};

function resolveGeneratedTechniqueRegistrationDisplayName(
  foundingHistory: OriginalTechniqueFoundingHistoryRecord,
): string {
  return foundingHistory.newTechniqueId;
}

function overlayHasTechniqueId(
  overlay: GeneratedTechniqueCatalogOverlay | undefined,
  techniqueId: string,
): boolean {
  return overlay?.definitions.some((definition) => definition.techniqueId === techniqueId) ?? false;
}

function foundingHistoryRegistrationOrder(
  histories: readonly OriginalTechniqueFoundingHistoryRecord[],
): OriginalTechniqueFoundingHistoryRecord[] {
  return [...histories].sort((left, right) => {
    const weekDelta = left.worldWeekIndex - right.worldWeekIndex;
    if (weekDelta !== 0) {
      return weekDelta;
    }
    return compareUnicodeCodePoints(left.newTechniqueId, right.newTechniqueId);
  });
}

/**
 * Materialize any OTL founding histories missing from the generated-technique overlay (exactly-once).
 * No-op when registration is disabled or there are no pending founding histories.
 */
export function processWeeklyGeneratedTechniqueRegistrationFromOtlWeek(
  input: ProcessWeeklyGeneratedTechniqueRegistrationFromOtlWeekInput,
): ValidationResult<ProcessWeeklyGeneratedTechniqueRegistrationFromOtlWeekResult> {
  if (
    input.sprint3Config === undefined ||
    !isGeneratedTechniqueRegistrationEnabled(input.sprint3Config)
  ) {
    return success({
      ...(input.generatedTechniqueCatalogOverlay === undefined
        ? {}
        : { generatedTechniqueCatalogOverlay: input.generatedTechniqueCatalogOverlay }),
    });
  }

  const runtime = input.originalTechniqueLifecycleRuntime;
  if (runtime === undefined || runtime.foundingHistories.length === 0) {
    return success({
      ...(input.generatedTechniqueCatalogOverlay === undefined
        ? {}
        : { generatedTechniqueCatalogOverlay: input.generatedTechniqueCatalogOverlay }),
    });
  }

  let overlay =
    input.generatedTechniqueCatalogOverlay ?? createEmptyGeneratedTechniqueCatalogOverlay();
  const issues: ValidationIssue[] = [];

  for (const foundingHistory of foundingHistoryRegistrationOrder(runtime.foundingHistories)) {
    if (overlayHasTechniqueId(overlay, foundingHistory.newTechniqueId)) {
      continue;
    }
    const outcome: OriginalTechniqueGenerationOutcome = {
      kind: "generation_succeeded",
      foundingHistory,
      reasons: ["original_technique_founded"],
    };
    const registered = registerGeneratedTechniqueFromGenerationSuccess({
      config: input.sprint3Config,
      baseCatalog: input.techniqueCatalog,
      overlay,
      outcome,
      displayName: resolveGeneratedTechniqueRegistrationDisplayName(foundingHistory),
    });
    if (!registered.ok) {
      issues.push(
        ...registered.issues.map((issue) => ({
          ...issue,
          path: `/generatedTechniqueRegistration/${foundingHistory.newTechniqueId}${issue.path}`,
        })),
      );
      continue;
    }
    overlay = registered.value.overlay;
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success({
    ...(overlay.definitions.length === 0 && input.generatedTechniqueCatalogOverlay === undefined
      ? {}
      : { generatedTechniqueCatalogOverlay: overlay }),
  });
}
