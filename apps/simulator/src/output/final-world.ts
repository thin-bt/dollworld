import type { FinalWorldDocument } from "./types.js";
import type { WorldEngineState } from "@shared-world/simulation-core";

/** Project final-world.json down to a WorldEngineState shape for public validators. */
export function finalWorldToEngineState(document: FinalWorldDocument): WorldEngineState {
  return {
    schemaVersion: document.schemaVersion,
    simulationSpecVersion: document.simulationSpecVersion,
    nameDataVersion: document.nameDataVersion,
    simulationId: document.simulationId,
    worldId: document.worldId,
    worldDate: document.worldDate,
    configProfileId: document.configProfileId,
    configHash: document.configHash,
    seed: document.seed,
    rngAlgorithm: document.rngAlgorithm,
    persons: document.persons,
    families: document.families,
    lineages: document.lineages,
    relationships: document.relationships,
    generationSummary: document.generationSummary,
  };
}
