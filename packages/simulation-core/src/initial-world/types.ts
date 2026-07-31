import type { InitialWorldConfig } from "../config/types.js";
import type { Person, Family, Lineage, Relationship } from "../domain.js";
import type { CareerStatus, Rank } from "../enums.js";
import type { EventEnvelope } from "../events/types.js";
import type { SimulationId, WorldId } from "../ids.js";
import type { ValidatedNameData } from "../names/types.js";
import type { SeededRngFactory } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import type { WorldDate } from "../world-date.js";
import type { RNG_ALGORITHM_VERSION } from "../rng.js";

export type InitialWorldGenerationInput = {
  config: InitialWorldConfig;
  configHash: string;
  seed: number;
  nameData: ValidatedNameData;
  nameDataHash: string;
  rngFactory: SeededRngFactory;
  sha256Provider: Sha256Provider;
};

export type TargetActualPair = {
  target: number;
  actual: number;
};

export type TargetActualRate = {
  target: number;
  actual: number;
};

export type InitialGenerationSummary = {
  livingCount: TargetActualPair;
  deceasedCount: TargetActualPair;
  ageBands: readonly TargetActualPair[];
  sex: { male: TargetActualPair; female: TargetActualPair };
  careerStatus: { readonly [K in CareerStatus]: TargetActualPair };
  activeRanks: { readonly [K in Rank]: TargetActualPair };
  retiredRanks: { readonly [K in Rank]: TargetActualPair };
  families: TargetActualPair;
  lineages: TargetActualPair;
  qualifiedMasters: TargetActualPair;
  parentRelationships: TargetActualPair;
  knownParentPeople: TargetActualPair;
  knownParentCoverage: TargetActualRate;
  twoKnownParentPeople: TargetActualPair;
  twoKnownParentsAmongCovered: TargetActualRate;
  marriagePeople: TargetActualPair;
  marriagePairs: TargetActualPair;
  formalMasterRelationships: TargetActualPair;
  formalMasterCoverage: TargetActualRate;
  brokenReferenceCount: number;
  selfReferenceCount: number;
  parentCycleCount: number;
  masterCycleCount: number;
  warnings: string[];
};

export type InitialWorldSnapshot = {
  schemaVersion: string;
  simulationSpecVersion: string;
  nameDataVersion: string;
  simulationId: SimulationId;
  worldId: WorldId;
  worldDate: WorldDate;
  configProfileId: string;
  configHash: string;
  seed: number;
  rngAlgorithm: typeof RNG_ALGORITHM_VERSION;
  persons: Person[];
  families: Family[];
  lineages: Lineage[];
  relationships: Relationship[];
  generationSummary: InitialGenerationSummary;
};

export type InitialWorldValidationSummary = {
  passed: boolean;
  brokenReferenceCount: number;
  selfReferenceCount: number;
  parentCycleCount: number;
  masterCycleCount: number;
  warnings: string[];
};

export type InitialWorldGenerationResult = {
  snapshot: InitialWorldSnapshot;
  initialEvents: EventEnvelope[];
  validationSummary: InitialWorldValidationSummary;
};

export type AgeBandKey = `age-${number}-${number}`;

export type SexCounts = { male: number; female: number };

export type PersonDraftCounts = {
  living: number;
  deceased: number;
  byAgeBand: Map<AgeBandKey, number>;
  bySex: SexCounts;
  byCareerStatus: { readonly [K in CareerStatus]: number };
};
