/**
 * Narrow S03-009/S03-008 generation success → S03-010 registration adapter (pure).
 */
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { GENERATED_TECHNIQUE_REGISTRATION_ADAPTER_ID } from "./constants.js";
import {
  createEmptyGeneratedTechniqueCatalogOverlay,
  registerGeneratedTechniqueInOverlay,
  type GeneratedTechniqueCatalogOverlay,
} from "./generated-technique-catalog-overlay.js";
import { materializeGeneratedTechniqueDefinition } from "./materialize-generated-technique-definition.js";
import type {
  GeneratedTechniqueMaterializationRequest,
  OriginalTechniqueGenerationOutcome,
  Sprint3Config,
} from "./types.js";

export type GeneratedTechniqueRegistrationAdapterResult = {
  adapterId: typeof GENERATED_TECHNIQUE_REGISTRATION_ADAPTER_ID;
  definition: TechniqueDefinition;
  overlay: GeneratedTechniqueCatalogOverlay;
};

export function buildMaterializationRequestFromGenerationSuccess(input: {
  outcome: OriginalTechniqueGenerationOutcome;
  displayName: string;
}): ValidationResult<GeneratedTechniqueMaterializationRequest> {
  if (input.outcome.kind !== "generation_succeeded") {
    return failure([
      {
        path: "/outcome/kind",
        message: "adapter requires generation_succeeded outcome",
        actual: input.outcome.kind,
        expected: "generation_succeeded",
      },
    ]);
  }
  if (input.outcome.foundingHistory === undefined) {
    return failure([
      {
        path: "/outcome/foundingHistory",
        message: "generation_succeeded requires foundingHistory",
        actual: undefined,
        expected: "OriginalTechniqueFoundingHistoryRecord",
      },
    ]);
  }
  return success({
    displayName: input.displayName,
    foundingHistory: input.outcome.foundingHistory,
  });
}

export function registerGeneratedTechniqueFromGenerationSuccess(input: {
  config: Sprint3Config;
  baseCatalog: TechniqueCatalog;
  overlay?: GeneratedTechniqueCatalogOverlay;
  outcome: OriginalTechniqueGenerationOutcome;
  displayName: string;
}): ValidationResult<GeneratedTechniqueRegistrationAdapterResult> {
  const requestResult = buildMaterializationRequestFromGenerationSuccess({
    outcome: input.outcome,
    displayName: input.displayName,
  });
  if (!requestResult.ok) {
    return requestResult;
  }

  const baseTechniqueDefinitionsById = new Map<string, TechniqueDefinition>();
  for (const definition of input.baseCatalog.definitions) {
    baseTechniqueDefinitionsById.set(definition.techniqueId, definition);
  }

  const materialized = materializeGeneratedTechniqueDefinition({
    config: input.config,
    request: requestResult.value,
    baseTechniqueDefinitionsById,
  });
  if (!materialized.ok) {
    return materialized;
  }

  const overlay = input.overlay ?? createEmptyGeneratedTechniqueCatalogOverlay();
  const registered = registerGeneratedTechniqueInOverlay({
    baseCatalog: input.baseCatalog,
    overlay,
    definition: materialized.value,
  });
  if (!registered.ok) {
    return registered;
  }

  return success({
    adapterId: GENERATED_TECHNIQUE_REGISTRATION_ADAPTER_ID,
    definition: materialized.value,
    overlay: registered.value,
  });
}
