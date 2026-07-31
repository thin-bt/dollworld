/**
 * Strict data-property / allowed-key shape checks for WorldEngineState.
 * Accessors and unknown keys are rejected before any getter evaluation.
 */
import { ABILITY_KEYS, APTITUDE_KEYS } from "../abilities.js";
import { RANK_ORDER } from "../enums.js";
import { WorldEngineError } from "./errors.js";
import { isTrustedDeepFrozen } from "./freeze.js";
import {
  FAMILY_KEYS,
  GENERATION_SUMMARY_KEYS,
  LINEAGE_KEYS,
  PAIR_KEYS,
  STAT_TRIPLE_KEYS,
  WORLD_DATE_KEYS,
  WORLD_ENGINE_STATE_KEYS,
  ALL_PERSON_KEYS,
  abilityKeysSet,
  allowedPersonKeys,
  aptitudeKeysSet,
  assertDataArray,
  assertDataRecord,
  careerTableKeys,
  dataValue,
  isPlainObject,
  optionalDataValue,
  rankTableKeys,
  setFrom,
  sexTableKeys,
} from "./schema.js";

function fail(message: string, field?: string, detail?: string): never {
  throw new WorldEngineError(message, {
    ...(field !== undefined ? { field } : {}),
    ...(detail !== undefined ? { detail } : {}),
  });
}

function assertCanonicalLeaf(value: unknown, field: string): void {
  if (value === null) {
    return;
  }
  switch (typeof value) {
    case "string":
    case "boolean":
      return;
    case "number":
      if (!Number.isFinite(value)) {
        fail(`${field} must be a finite number`, field, String(value));
      }
      return;
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      fail(`${field} has forbidden value type ${typeof value}`, field);
      return;
    case "object":
      fail(`${field} has unexpected nested object`, field);
      return;
    default:
      fail(`${field} has forbidden value type ${typeof value}`, field);
  }
}

function assertStatTripleShape(value: unknown, field: string): void {
  assertDataRecord(value, setFrom(STAT_TRIPLE_KEYS), field);
  for (const key of STAT_TRIPLE_KEYS) {
    assertCanonicalLeaf(dataValue(value, key, field), `${field}.${key}`);
  }
}

function assertAbilitiesShape(value: unknown, field: string): void {
  assertDataRecord(value, abilityKeysSet(), field);
  for (const key of ABILITY_KEYS) {
    assertStatTripleShape(dataValue(value, key, field), `${field}.${key}`);
  }
}

function assertAptitudesShape(value: unknown, field: string): void {
  assertDataRecord(value, aptitudeKeysSet(), field);
  for (const key of APTITUDE_KEYS) {
    assertStatTripleShape(dataValue(value, key, field), `${field}.${key}`);
  }
}

function assertPersonShape(value: unknown, field: string): void {
  if (!isPlainObject(value)) {
    fail(`${field} must be a plain object`, field);
  }
  // Reject accessors/symbols before evaluating life/career.
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      fail(`${field} must not have Symbol keys`, field, String(key));
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      fail(`${field}.${String(key)} descriptor is missing`, field);
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      fail(
        `${field}.${String(key)} must be a data property (accessor forbidden)`,
        `${field}.${String(key)}`,
      );
    }
    if (descriptor.enumerable !== true) {
      fail(`${field}.${String(key)} must be enumerable`, `${field}.${String(key)}`);
    }
  }

  const lifeStatus = optionalDataValue(value, "lifeStatus", field);
  const careerStatus = optionalDataValue(value, "careerStatus", field);
  if (typeof lifeStatus === "string" && typeof careerStatus === "string") {
    assertDataRecord(value, allowedPersonKeys(lifeStatus, careerStatus), field);
  } else {
    assertDataRecord(value, ALL_PERSON_KEYS, field);
  }
  if (Object.prototype.hasOwnProperty.call(value, "abilities")) {
    assertAbilitiesShape(dataValue(value, "abilities", field), `${field}.abilities`);
  }
  if (Object.prototype.hasOwnProperty.call(value, "aptitudes")) {
    assertAptitudesShape(dataValue(value, "aptitudes", field), `${field}.aptitudes`);
  }
}

function assertFamilyShape(value: unknown, field: string): void {
  assertDataRecord(value, setFrom(FAMILY_KEYS), field);
}

function assertLineageShape(value: unknown, field: string): void {
  assertDataRecord(value, setFrom(LINEAGE_KEYS), field);
}

function assertRelationshipShape(value: unknown, field: string): void {
  if (!isPlainObject(value)) {
    fail(`${field} must be a plain object`, field);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      fail(`${field} must not have Symbol keys`, field, String(key));
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      fail(`${field}.${String(key)} must be a data property`, `${field}.${String(key)}`);
    }
    if (descriptor.enumerable !== true) {
      fail(`${field}.${String(key)} must be enumerable`, `${field}.${String(key)}`);
    }
  }
  const kind = optionalDataValue(value, "kind", field);
  let allowed: ReadonlySet<string>;
  if (kind === "parent_child") {
    allowed = setFrom(["relationshipId", "kind", "parentId", "childId", "parentRole"]);
  } else if (kind === "marriage") {
    allowed = setFrom(["relationshipId", "kind", "personAId", "personBId"]);
  } else if (kind === "master_disciple") {
    allowed = setFrom(["relationshipId", "kind", "masterId", "discipleId"]);
  } else {
    allowed = setFrom(["relationshipId", "kind"]);
  }
  assertDataRecord(value, allowed, field);
}

function assertPairShape(value: unknown, field: string): void {
  assertDataRecord(value, setFrom(PAIR_KEYS), field);
  assertCanonicalLeaf(dataValue(value, "target", field), `${field}.target`);
  assertCanonicalLeaf(dataValue(value, "actual", field), `${field}.actual`);
}

function assertGenerationSummaryShape(value: unknown, field: string): void {
  assertDataRecord(value, setFrom(GENERATION_SUMMARY_KEYS), field);
  for (const key of [
    "livingCount",
    "deceasedCount",
    "families",
    "lineages",
    "qualifiedMasters",
    "parentRelationships",
    "knownParentPeople",
    "knownParentCoverage",
    "twoKnownParentPeople",
    "twoKnownParentsAmongCovered",
    "marriagePeople",
    "marriagePairs",
    "formalMasterRelationships",
    "formalMasterCoverage",
  ] as const) {
    assertPairShape(dataValue(value, key, field), `${field}.${key}`);
  }
  const ageBands = dataValue(value, "ageBands", field);
  assertDataArray(ageBands, `${field}.ageBands`);
  ageBands.forEach((pair, index) => assertPairShape(pair, `${field}.ageBands[${String(index)}]`));

  const sex = dataValue(value, "sex", field);
  assertDataRecord(sex, sexTableKeys(), `${field}.sex`);
  assertPairShape(dataValue(sex, "male", `${field}.sex`), `${field}.sex.male`);
  assertPairShape(dataValue(sex, "female", `${field}.sex`), `${field}.sex.female`);

  const careerStatus = dataValue(value, "careerStatus", field);
  assertDataRecord(careerStatus, careerTableKeys(), `${field}.careerStatus`);
  for (const status of ["child", "trainee", "active_competitor", "retired"] as const) {
    assertPairShape(
      dataValue(careerStatus, status, `${field}.careerStatus`),
      `${field}.careerStatus.${status}`,
    );
  }

  for (const tableName of ["activeRanks", "retiredRanks"] as const) {
    const table = dataValue(value, tableName, field);
    assertDataRecord(table, rankTableKeys(), `${field}.${tableName}`);
    for (const rank of RANK_ORDER) {
      assertPairShape(
        dataValue(table, rank, `${field}.${tableName}`),
        `${field}.${tableName}.${rank}`,
      );
    }
  }

  for (const key of [
    "brokenReferenceCount",
    "selfReferenceCount",
    "parentCycleCount",
    "masterCycleCount",
  ] as const) {
    assertCanonicalLeaf(dataValue(value, key, field), `${field}.${key}`);
  }

  const warnings = dataValue(value, "warnings", field);
  assertDataArray(warnings, `${field}.warnings`);
  warnings.forEach((warning, index) =>
    assertCanonicalLeaf(warning, `${field}.warnings[${String(index)}]`),
  );
}

/**
 * Reject accessors, Symbol keys, and schema-extra own properties before semantic validation.
 */
export function assertWorldEngineDataShape(state: unknown): void {
  assertDataRecord(state, setFrom(WORLD_ENGINE_STATE_KEYS), "state");
  assertDataRecord(dataValue(state, "worldDate", "state"), setFrom(WORLD_DATE_KEYS), "worldDate");

  const persons = dataValue(state, "persons", "state");
  assertDataArray(persons, "persons");
  persons.forEach((person, index) => {
    if (typeof person === "object" && person !== null && isTrustedDeepFrozen(person)) {
      return;
    }
    assertPersonShape(person, `persons[${String(index)}]`);
  });

  const families = dataValue(state, "families", "state");
  if (!(typeof families === "object" && families !== null && isTrustedDeepFrozen(families))) {
    assertDataArray(families, "families");
    families.forEach((family, index) => assertFamilyShape(family, `families[${String(index)}]`));
  }

  const lineages = dataValue(state, "lineages", "state");
  if (!(typeof lineages === "object" && lineages !== null && isTrustedDeepFrozen(lineages))) {
    assertDataArray(lineages, "lineages");
    lineages.forEach((lineage, index) => assertLineageShape(lineage, `lineages[${String(index)}]`));
  }

  const relationships = dataValue(state, "relationships", "state");
  if (!(
    typeof relationships === "object" &&
    relationships !== null &&
    isTrustedDeepFrozen(relationships)
  )) {
    assertDataArray(relationships, "relationships");
    relationships.forEach((relationship, index) =>
      assertRelationshipShape(relationship, `relationships[${String(index)}]`),
    );
  }

  const generationSummary = dataValue(state, "generationSummary", "state");
  if (!(
    typeof generationSummary === "object" &&
    generationSummary !== null &&
    isTrustedDeepFrozen(generationSummary)
  )) {
    assertGenerationSummaryShape(generationSummary, "generationSummary");
  }
  for (const key of [
    "schemaVersion",
    "simulationSpecVersion",
    "nameDataVersion",
    "simulationId",
    "worldId",
    "configProfileId",
    "configHash",
    "seed",
    "rngAlgorithm",
  ] as const) {
    assertCanonicalLeaf(dataValue(state, key, "state"), key);
  }
}
