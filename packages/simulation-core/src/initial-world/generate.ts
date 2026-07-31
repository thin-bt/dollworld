import type { AbilityKey, AptitudeKey } from "../abilities.js";
import { validateInitialWorldConfig } from "../config/validate-config.js";
import { validateNameData } from "../names/validate-name-data.js";
import { computeConfigHash, computeNameDataHash } from "../sha256-provider.js";
import { createInitialWorldDate } from "../world-date.js";
import {
  deriveSeed,
  RNG_ALGORITHM_VERSION,
  type SeededRng,
  type SeededRngFactory,
} from "../rng.js";
import { asWorldId } from "../ids.js";
import {
  INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION,
  FIXED_WORLD_ID,
  RNG_LABELS,
  SIMULATION_SPEC_VERSION,
} from "./constants.js";
import { InitialWorldGenerationError } from "./errors.js";
import { createSimulationId } from "./simulation-id.js";
import { generatePersonDrafts } from "./persons.js";
import { shuffleFamilyNameCandidates, assignPersonNames } from "./names.js";
import { generateFamilies } from "./families.js";
import { generateLineages } from "./lineages.js";
import { generateParentRelationships } from "./relationships-parents.js";
import { generateMarriageRelationships } from "./relationships-marriage.js";
import {
  assignActiveRanks,
  assignRetiredRanksAndQualifiedMasters,
  assignMasterRelationshipsAndLineages,
} from "./ranks.js";
import { generateAbilitiesForAllPersons } from "./abilities.js";
import { assembleFamilies, assembleLineages, assemblePersons } from "./assemble.js";
import { assembleRelationships } from "./assemble-relationships.js";
import { buildGenerationSummary, buildValidationSummary } from "./summary.js";
import { validateInitialWorldSnapshot } from "./validate-snapshot.js";
import { buildInitialEvents } from "./events.js";
import type { InitialWorldDraftState } from "./draft.js";
import type { InitialWorldConfig } from "../config/types.js";
import type {
  InitialWorldGenerationInput,
  InitialWorldGenerationResult,
  InitialWorldSnapshot,
} from "./types.js";
import { formatFamilyId } from "./ids.js";

const UINT32_MAX = 4294967295;

function wrapRngFactory(factory: SeededRngFactory): SeededRngFactory {
  return (seed: number): SeededRng => {
    const rng = factory(seed);
    const state = rng.exportState();
    if (state.algorithmVersion !== RNG_ALGORITHM_VERSION) {
      throw new InitialWorldGenerationError("RNG algorithmVersion mismatch", {
        expected: RNG_ALGORITHM_VERSION,
        actual: String(state.algorithmVersion),
      });
    }
    return rng;
  };
}

function assertSeedUint32(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new InitialWorldGenerationError("seed must be a uint32", { seed });
  }
}

const ID_DIGIT_MAX = 999_999;
/** Conservative upper bound covering parent + marriage + master relationships. */
const RELATIONSHIP_UPPER_BOUND_PER_PERSON = 4;

function assertIdDigitCapacity(config: InitialWorldConfig): void {
  const totalPersons = config.population.totalLiving + config.history.initialDeceasedAncestors;
  const familyCount = config.families.initialFamilyCount;
  const lineageCount = config.lineages.initialLineageCount;
  const relationshipUpperBound = totalPersons * RELATIONSHIP_UPPER_BOUND_PER_PERSON;

  if (
    totalPersons > ID_DIGIT_MAX ||
    familyCount > ID_DIGIT_MAX ||
    lineageCount > ID_DIGIT_MAX ||
    relationshipUpperBound > ID_DIGIT_MAX
  ) {
    throw new InitialWorldGenerationError("entity count exceeds 6-digit ID capacity", {
      totalPersons,
      familyCount,
      lineageCount,
      relationshipUpperBound,
      max: ID_DIGIT_MAX,
    });
  }
}

function assertFamilyCapacityFeasible(config: InitialWorldConfig): void {
  const totalLiving = config.population.totalLiving;
  const totalPersons = totalLiving + config.history.initialDeceasedAncestors;
  const familyCount = config.families.initialFamilyCount;
  const { minimumMembersPerFamily, maximumMembersPerFamily } = config.families;

  if (totalLiving < familyCount) {
    throw new InitialWorldGenerationError("totalLiving less than initialFamilyCount", {
      totalLiving,
      initialFamilyCount: familyCount,
    });
  }
  if (totalPersons < familyCount * minimumMembersPerFamily) {
    throw new InitialWorldGenerationError("totalPersons below minimum family capacity", {
      totalPersons,
      required: familyCount * minimumMembersPerFamily,
      minimumMembersPerFamily,
      initialFamilyCount: familyCount,
    });
  }
  if (totalPersons > familyCount * maximumMembersPerFamily) {
    throw new InitialWorldGenerationError("totalPersons above maximum family capacity", {
      totalPersons,
      capacity: familyCount * maximumMembersPerFamily,
      maximumMembersPerFamily,
      initialFamilyCount: familyCount,
    });
  }
}

function applyAbilities(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: SeededRngFactory,
): void {
  const abilitiesRng = rngFactory(deriveSeed(seed, RNG_LABELS.abilities));
  const sorted = [...state.persons].sort((a, b) => a.personId.localeCompare(b.personId));

  generateAbilitiesForAllPersons(
    sorted.length,
    (min, max) => abilitiesRng.nextInt(min, max),
    (personIndex, key: AbilityKey, field, value) => {
      const person = sorted[personIndex];
      if (person === undefined) {
        throw new InitialWorldGenerationError("ability assignment person missing", {
          personIndex,
        });
      }
      person.abilities[key][field] = value;
    },
    (personIndex, key: AptitudeKey, field, value) => {
      const person = sorted[personIndex];
      if (person === undefined) {
        throw new InitialWorldGenerationError("aptitude assignment person missing", {
          personIndex,
        });
      }
      person.aptitudes[key][field] = value;
    },
    {
      surface: config.abilities.initialSurfaceValueRange,
      genetic: config.abilities.initialGeneticValueRange,
      aptitudeSurface: config.abilities.initialAptitudeRange,
      aptitudeGenetic: config.abilities.initialAptitudeGeneticValueRange,
    },
  );

  state.persons = sorted;
}

export function generateInitialWorld(
  input: InitialWorldGenerationInput,
): InitialWorldGenerationResult {
  const { configHash, seed, nameDataHash, sha256Provider } = input;

  assertSeedUint32(seed);

  const configResult = validateInitialWorldConfig(input.config);
  if (!configResult.ok) {
    throw new InitialWorldGenerationError("invalid initial world config", {
      issues: JSON.stringify(configResult.issues),
    });
  }
  const config = configResult.value;

  if (config.simulation.rngAlgorithm !== RNG_ALGORITHM_VERSION) {
    throw new InitialWorldGenerationError("config rngAlgorithm must be xoshiro128ss-v1", {
      rngAlgorithm: config.simulation.rngAlgorithm,
    });
  }

  const expectedConfigHash = computeConfigHash(config, sha256Provider);
  if (configHash !== expectedConfigHash) {
    throw new InitialWorldGenerationError("configHash mismatch", {
      expected: expectedConfigHash,
      actual: configHash,
    });
  }

  const nameResult = validateNameData({
    manifest: input.nameData.manifest,
    familyNames: input.nameData.familyNames,
    maleGivenNames: input.nameData.maleGivenNames,
    femaleGivenNames: input.nameData.femaleGivenNames,
    neutralGivenNames: input.nameData.neutralGivenNames,
    requiredVersion: config.nameData.requiredVersion,
    initialFamilyCount: config.families.initialFamilyCount,
    sha256Provider: input.sha256Provider,
  });
  if (!nameResult.ok) {
    throw new InitialWorldGenerationError("invalid name data", {
      issues: JSON.stringify(nameResult.issues),
    });
  }
  const nameData = nameResult.value;

  const expectedNameDataHash = computeNameDataHash(nameData.manifest, sha256Provider);
  if (nameDataHash !== expectedNameDataHash) {
    throw new InitialWorldGenerationError("nameDataHash mismatch", {
      expected: expectedNameDataHash,
      actual: nameDataHash,
    });
  }

  assertIdDigitCapacity(config);
  assertFamilyCapacityFeasible(config);

  const rngFactory = wrapRngFactory(input.rngFactory);
  const simulationId = createSimulationId(configHash, seed, nameDataHash, sha256Provider);

  const persons = generatePersonDrafts(config, seed, rngFactory, nameData.manifest.nameDataVersion);
  for (const person of persons) {
    person.familyId = formatFamilyId(1);
  }

  const state: InitialWorldDraftState = {
    persons,
    families: [],
    lineages: [],
    parentRelationships: [],
    marriageRelationships: [],
    masterRelationships: [],
    warnings: [],
  };

  const shuffledFamilyNames = shuffleFamilyNameCandidates(nameData, seed, rngFactory);
  generateFamilies(state, config, seed, rngFactory, shuffledFamilyNames);
  assignPersonNames(state, config, nameData, seed, rngFactory);
  generateLineages(state, config, seed, rngFactory);
  generateParentRelationships(state, config, seed, rngFactory);
  generateMarriageRelationships(state, config, seed, rngFactory);
  assignActiveRanks(state, config, seed, rngFactory);
  assignRetiredRanksAndQualifiedMasters(state, config, seed, rngFactory);
  assignMasterRelationshipsAndLineages(state, config, seed, rngFactory);
  applyAbilities(state, config, seed, rngFactory);

  const assembledPersons = assemblePersons(state);
  const assembledFamilies = assembleFamilies(state);
  const assembledLineages = assembleLineages(state);
  const relationships = assembleRelationships(state);

  const generationSummary = buildGenerationSummary(
    config,
    assembledPersons,
    assembledFamilies,
    assembledLineages,
    relationships,
    state.warnings,
  );

  const snapshot: InitialWorldSnapshot = {
    schemaVersion: INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION,
    simulationSpecVersion: SIMULATION_SPEC_VERSION,
    nameDataVersion: nameData.manifest.nameDataVersion,
    simulationId,
    worldId: asWorldId(FIXED_WORLD_ID),
    worldDate: createInitialWorldDate(),
    configProfileId: config.profileId,
    configHash,
    seed,
    rngAlgorithm: RNG_ALGORITHM_VERSION,
    persons: assembledPersons,
    families: assembledFamilies,
    lineages: assembledLineages,
    relationships,
    generationSummary,
  };

  validateInitialWorldSnapshot(config, snapshot);

  const validationSummary = buildValidationSummary(generationSummary);
  const initialEvents = buildInitialEvents(
    simulationId,
    assembledFamilies,
    assembledLineages,
    assembledPersons,
    relationships,
  );

  return {
    snapshot,
    initialEvents,
    validationSummary,
  };
}
