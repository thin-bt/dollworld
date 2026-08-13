import { ABILITY_KEYS, APTITUDE_KEYS } from "../abilities.js";
import { toCanonicalJson } from "../canonical-json.js";
import type { Person } from "../domain.js";
import { RANK_ORDER, type Rank } from "../enums.js";
import {
  FIXED_WORLD_ID,
  INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION,
  SIMULATION_SPEC_VERSION,
} from "../initial-world/constants.js";
import { RNG_ALGORITHM_VERSION } from "../rng.js";
import { DEFAULT_WORLD_CALENDAR_CONFIG, validateWorldDate, type WorldDate } from "../world-date.js";
import { WorldEngineError } from "./errors.js";
import { isTrustedDeepFrozen } from "./freeze.js";
import type { WorldEngineState } from "./types.js";
import { assertWorldEngineDataShape } from "./validate-data.js";

const SIMULATION_ID_PATTERN = /^simulation_[0-9a-f]{16}$/;
const CONFIG_HASH_PATTERN = /^[0-9a-f]{64}$/;
const UINT32_MAX = 4294967295;
const SEXES = ["male", "female"] as const;
const LIFE_STATUSES = ["living", "deceased"] as const;
const PARTICIPATION_STATUSES = ["waiting", "active", "stopped"] as const;
const CAREER_STATUSES = ["child", "trainee", "active_competitor", "retired"] as const;
const FAMILY_STATUSES = ["active", "at_risk", "extinct", "revived"] as const;
const LINEAGE_FOCUSES = ["unarmed", "sword", "magic", "mixed"] as const;
const LINEAGE_STATUSES = ["active", "extinct", "revived"] as const;
const RELATIONSHIP_KINDS = ["parent_child", "marriage", "master_disciple"] as const;
const PARENT_ROLES = ["father", "mother"] as const;
const QUALIFIED_MASTER_MIN_RANK_INDEX = RANK_ORDER.indexOf("C");

type UnknownRecord = Record<string, unknown>;

function fail(message: string, field?: string, detail?: string): never {
  throw new WorldEngineError(message, {
    ...(field !== undefined ? { field } : {}),
    ...(detail !== undefined ? { detail } : {}),
  });
}

function isPlainObject(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isOneOf(value: unknown, values: readonly string[]): value is string {
  return typeof value === "string" && values.includes(value);
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (!isNonEmptyString(value)) {
    fail(`${field} must be a non-empty string`, field);
  }
}

function assertRank(value: unknown, field: string): asserts value is Rank {
  if (!isOneOf(value, RANK_ORDER)) {
    fail(`${field} must be a valid rank`, field);
  }
}

function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

function assertStatTriple(value: unknown, field: string): void {
  if (!isPlainObject(value)) {
    fail(`${field} must be a plain object`, field);
  }
  for (const part of ["surfaceValue", "expressedGeneticValue", "latentGeneticValue"] as const) {
    const partValue = value[part];
    if (!isSafeInteger(partValue) || partValue < 0 || partValue > 100) {
      fail(`${field}.${part} must be a safe integer in 0..100`, `${field}.${part}`);
    }
  }
}

function assertHighestAtLeast(higher: Rank, lower: Rank, field: string, label: string): void {
  if (rankIndex(higher) < rankIndex(lower)) {
    fail(
      `${label}.${field} must be at least as high as the current/retirement rank`,
      `${label}.${field}`,
    );
  }
}

function assertActiveCareerForAge(careerStatus: string, age: number, label: string): void {
  let expected: string | readonly string[];
  if (age <= 7) {
    expected = "child";
  } else if (age <= 15) {
    expected = "trainee";
  } else if (age <= 17) {
    expected = "active_competitor";
  } else if (age <= 41) {
    expected = ["active_competitor", "retired"];
  } else {
    expected = "retired";
  }

  const ok =
    typeof expected === "string" ? careerStatus === expected : expected.includes(careerStatus);
  if (!ok) {
    fail(
      `${label} active participant careerStatus is inconsistent with currentAge`,
      `${label}.careerStatus`,
      `age=${String(age)} careerStatus=${careerStatus}`,
    );
  }
}

function assertQualifiedMaster(value: UnknownRecord, label: string, lineageIds: Set<string>): void {
  if (value.qualifiedMaster !== true) {
    return;
  }
  if (value.lifeStatus !== "living") {
    fail(`${label} qualifiedMaster requires lifeStatus=living`, `${label}.qualifiedMaster`);
  }
  if (value.careerStatus !== "retired") {
    fail(`${label} qualifiedMaster requires careerStatus=retired`, `${label}.qualifiedMaster`);
  }
  if (!isNonEmptyString(value.lineageId) || !lineageIds.has(value.lineageId)) {
    fail(`${label} qualifiedMaster requires a valid lineageId`, `${label}.lineageId`);
  }
  assertRank(value.retirementRank, `${label}.retirementRank`);
  if (rankIndex(value.retirementRank) < QUALIFIED_MASTER_MIN_RANK_INDEX) {
    fail(
      `${label} qualifiedMaster requires retirementRank of C or higher`,
      `${label}.retirementRank`,
    );
  }
}

function assertPersonDynamicInvariants(
  value: UnknownRecord,
  index: number,
  worldYear: number,
  lineageIds: Set<string>,
): void {
  const label = `persons[${String(index)}]`;
  if (value.lifeStatus === "living") {
    if (!isSafeInteger(value.currentAge) || value.currentAge < 0) {
      fail(`${label}.currentAge must be a non-negative safe integer`, `${label}.currentAge`);
    }
    if (!isSafeInteger(value.birthYear)) {
      fail(`${label}.birthYear must be a safe integer`, `${label}.birthYear`);
    }
    const calendarAge = worldYear - value.birthYear;
    if (!isSafeInteger(calendarAge) || calendarAge < 0) {
      fail(`${label}.birthYear is invalid for worldDate.year`, `${label}.birthYear`);
    }
    if (value.participationStatus === "active") {
      if (value.currentAge !== calendarAge) {
        fail(
          `${label}.currentAge does not match worldDate.year - birthYear`,
          `${label}.currentAge`,
        );
      }
      assertActiveCareerForAge(String(value.careerStatus), value.currentAge, label);
    } else if (value.participationStatus === "waiting" || value.participationStatus === "stopped") {
      if (value.currentAge > calendarAge) {
        fail(
          `${label}.currentAge must not exceed worldDate.year - birthYear`,
          `${label}.currentAge`,
        );
      }
    }

    if (
      value.careerStatus === "child" &&
      value.currentAge >= 0 &&
      value.currentAge <= 7 &&
      hasOwn(value, "lineageId")
    ) {
      fail(`${label} child aged 0-7 must not own lineageId`, `${label}.lineageId`);
    }
  }

  if (value.careerStatus === "active_competitor") {
    assertRank(value.currentRank, `${label}.currentRank`);
    assertRank(value.highestRank, `${label}.highestRank`);
    assertHighestAtLeast(value.highestRank, value.currentRank, "highestRank", label);
  }
  if (value.careerStatus === "retired") {
    assertRank(value.retirementRank, `${label}.retirementRank`);
    assertRank(value.highestRank, `${label}.highestRank`);
    assertHighestAtLeast(value.highestRank, value.retirementRank, "highestRank", label);
  }
  assertQualifiedMaster(value, label, lineageIds);
}

function assertPerson(
  value: unknown,
  index: number,
  worldYear: number,
  lineageIds: Set<string>,
): void {
  const label = `persons[${String(index)}]`;
  if (!isPlainObject(value)) {
    fail(`${label} must be a plain object`, label);
  }
  for (const field of [
    "personId",
    "givenName",
    "familyName",
    "displayName",
    "nameDataVersion",
    "familyId",
  ] as const) {
    assertNonEmptyString(value[field], `${label}.${field}`);
  }
  if (hasOwn(value, "lineageId")) {
    if (value.lineageId === undefined) {
      fail(`${label}.lineageId must not be undefined`, `${label}.lineageId`);
    }
    assertNonEmptyString(value.lineageId, `${label}.lineageId`);
  }
  if (!isOneOf(value.sex, SEXES)) {
    fail(`${label}.sex is invalid`, `${label}.sex`);
  }
  if (!isSafeInteger(value.birthYear)) {
    fail(`${label}.birthYear must be a safe integer`, `${label}.birthYear`);
  }
  if (!isOneOf(value.lifeStatus, LIFE_STATUSES)) {
    fail(`${label}.lifeStatus is invalid`, `${label}.lifeStatus`);
  }
  if (!isOneOf(value.careerStatus, CAREER_STATUSES)) {
    fail(`${label}.careerStatus is invalid`, `${label}.careerStatus`);
  }
  if (typeof value.qualifiedMaster !== "boolean") {
    fail(`${label}.qualifiedMaster must be boolean`, `${label}.qualifiedMaster`);
  }

  if (!isPlainObject(value.abilities)) {
    fail(`${label}.abilities must be a plain object`, `${label}.abilities`);
  }
  for (const key of ABILITY_KEYS) {
    assertStatTriple(value.abilities[key], `${label}.abilities.${key}`);
  }
  if (!isPlainObject(value.aptitudes)) {
    fail(`${label}.aptitudes must be a plain object`, `${label}.aptitudes`);
  }
  for (const key of APTITUDE_KEYS) {
    assertStatTriple(value.aptitudes[key], `${label}.aptitudes.${key}`);
  }

  if (value.lifeStatus === "living") {
    if (!isOneOf(value.participationStatus, PARTICIPATION_STATUSES)) {
      fail(`${label}.participationStatus is invalid`, `${label}.participationStatus`);
    }
    if (hasOwn(value, "deathYear") || hasOwn(value, "ageAtDeath")) {
      fail(`${label} living person must omit death fields`, label);
    }
  } else {
    if (hasOwn(value, "participationStatus") || hasOwn(value, "currentAge")) {
      fail(`${label} deceased person must omit living fields`, label);
    }
    if (!isSafeInteger(value.deathYear)) {
      fail(`${label}.deathYear must be a safe integer`, `${label}.deathYear`);
    }
    if (!isSafeInteger(value.ageAtDeath) || value.ageAtDeath < 0) {
      fail(`${label}.ageAtDeath must be a non-negative safe integer`, `${label}.ageAtDeath`);
    }
    if (value.ageAtDeath !== value.deathYear - value.birthYear) {
      fail(`${label}.ageAtDeath does not match deathYear - birthYear`, `${label}.ageAtDeath`);
    }
    if (hasOwn(value, "currentRank")) {
      fail(`${label} deceased person must omit currentRank`, `${label}.currentRank`);
    }
  }

  switch (value.careerStatus) {
    case "child":
    case "trainee":
      if (
        hasOwn(value, "currentRank") ||
        hasOwn(value, "highestRank") ||
        hasOwn(value, "retirementRank")
      ) {
        fail(`${label} child/trainee must omit rank fields`, label);
      }
      if (value.qualifiedMaster !== false) {
        fail(`${label} child/trainee cannot be a qualified master`, `${label}.qualifiedMaster`);
      }
      break;
    case "active_competitor":
      assertRank(value.currentRank, `${label}.currentRank`);
      assertRank(value.highestRank, `${label}.highestRank`);
      if (hasOwn(value, "retirementRank")) {
        fail(`${label} active competitor must omit retirementRank`, `${label}.retirementRank`);
      }
      if (value.qualifiedMaster !== false) {
        fail(`${label} active competitor cannot be a qualified master`, `${label}.qualifiedMaster`);
      }
      break;
    case "retired":
      if (hasOwn(value, "currentRank")) {
        fail(`${label} retired person must omit currentRank`, `${label}.currentRank`);
      }
      assertRank(value.highestRank, `${label}.highestRank`);
      assertRank(value.retirementRank, `${label}.retirementRank`);
      break;
  }

  assertPersonDynamicInvariants(value, index, worldYear, lineageIds);
}

function assertFamily(value: unknown, index: number): void {
  const label = `families[${String(index)}]`;
  if (!isPlainObject(value)) {
    fail(`${label} must be a plain object`, label);
  }
  assertNonEmptyString(value.familyId, `${label}.familyId`);
  assertNonEmptyString(value.familyName, `${label}.familyName`);
  if (!isOneOf(value.status, FAMILY_STATUSES)) {
    fail(`${label}.status is invalid`, `${label}.status`);
  }
  if (!isFiniteNumber(value.baseBirthRate) || value.baseBirthRate < 0 || value.baseBirthRate > 1) {
    fail(`${label}.baseBirthRate must be a finite number in 0..1`, `${label}.baseBirthRate`);
  }
  if (typeof value.initialHistory !== "boolean") {
    fail(`${label}.initialHistory must be boolean`, `${label}.initialHistory`);
  }
}

function assertLineage(value: unknown, index: number): void {
  const label = `lineages[${String(index)}]`;
  if (!isPlainObject(value)) {
    fail(`${label} must be a plain object`, label);
  }
  for (const field of ["lineageId", "lineageName", "founderPersonId", "founderFamilyId"] as const) {
    assertNonEmptyString(value[field], `${label}.${field}`);
  }
  if (!isOneOf(value.focus, LINEAGE_FOCUSES)) {
    fail(`${label}.focus is invalid`, `${label}.focus`);
  }
  if (!isOneOf(value.status, LINEAGE_STATUSES)) {
    fail(`${label}.status is invalid`, `${label}.status`);
  }
}

function assertRelationship(value: unknown, index: number): void {
  const label = `relationships[${String(index)}]`;
  if (!isPlainObject(value)) {
    fail(`${label} must be a plain object`, label);
  }
  assertNonEmptyString(value.relationshipId, `${label}.relationshipId`);
  if (!isOneOf(value.kind, RELATIONSHIP_KINDS)) {
    fail(`${label}.kind is invalid`, `${label}.kind`);
  }
  if (value.kind === "parent_child") {
    assertNonEmptyString(value.parentId, `${label}.parentId`);
    assertNonEmptyString(value.childId, `${label}.childId`);
    if (!isOneOf(value.parentRole, PARENT_ROLES)) {
      fail(`${label}.parentRole is invalid`, `${label}.parentRole`);
    }
    if (value.parentId === value.childId) {
      fail(`${label} must not self-reference`, label);
    }
  } else if (value.kind === "marriage") {
    assertNonEmptyString(value.personAId, `${label}.personAId`);
    assertNonEmptyString(value.personBId, `${label}.personBId`);
    if (value.personAId === value.personBId) {
      fail(`${label} must not self-reference`, label);
    }
  } else {
    assertNonEmptyString(value.masterId, `${label}.masterId`);
    assertNonEmptyString(value.discipleId, `${label}.discipleId`);
    if (value.masterId === value.discipleId) {
      fail(`${label} must not self-reference`, label);
    }
  }
}

function assertCountPair(value: unknown, field: string): void {
  if (
    !isPlainObject(value) ||
    !isSafeInteger(value.target) ||
    value.target < 0 ||
    !isSafeInteger(value.actual) ||
    value.actual < 0
  ) {
    fail(`${field} must contain non-negative safe integer target and actual`, field);
  }
}

function assertRatePair(value: unknown, field: string): void {
  if (
    !isPlainObject(value) ||
    !isFiniteNumber(value.target) ||
    value.target < 0 ||
    value.target > 1 ||
    !isFiniteNumber(value.actual) ||
    value.actual < 0 ||
    value.actual > 1
  ) {
    fail(`${field} must contain finite target and actual rates in 0..1`, field);
  }
}

function assertGenerationSummary(value: unknown): void {
  const label = "generationSummary";
  if (!isPlainObject(value)) {
    fail(`${label} must be a plain object`, label);
  }
  for (const field of [
    "livingCount",
    "deceasedCount",
    "families",
    "lineages",
    "qualifiedMasters",
    "parentRelationships",
    "knownParentPeople",
    "twoKnownParentPeople",
    "marriagePeople",
    "marriagePairs",
    "formalMasterRelationships",
  ] as const) {
    assertCountPair(value[field], `${label}.${field}`);
  }
  for (const field of [
    "knownParentCoverage",
    "twoKnownParentsAmongCovered",
    "formalMasterCoverage",
  ] as const) {
    assertRatePair(value[field], `${label}.${field}`);
  }
  if (!Array.isArray(value.ageBands)) {
    fail(`${label}.ageBands must be an array`, `${label}.ageBands`);
  }
  value.ageBands.forEach((pair, index) =>
    assertCountPair(pair, `${label}.ageBands[${String(index)}]`),
  );
  if (!isPlainObject(value.sex)) {
    fail(`${label}.sex must be a plain object`, `${label}.sex`);
  }
  assertCountPair(value.sex.male, `${label}.sex.male`);
  assertCountPair(value.sex.female, `${label}.sex.female`);
  if (!isPlainObject(value.careerStatus)) {
    fail(`${label}.careerStatus must be a plain object`, `${label}.careerStatus`);
  }
  for (const status of CAREER_STATUSES) {
    assertCountPair(value.careerStatus[status], `${label}.careerStatus.${status}`);
  }
  for (const tableName of ["activeRanks", "retiredRanks"] as const) {
    const table = value[tableName];
    if (!isPlainObject(table)) {
      fail(`${label}.${tableName} must be a plain object`, `${label}.${tableName}`);
    }
    for (const rank of RANK_ORDER) {
      assertCountPair(table[rank], `${label}.${tableName}.${rank}`);
    }
  }
  for (const field of [
    "brokenReferenceCount",
    "selfReferenceCount",
    "parentCycleCount",
    "masterCycleCount",
  ] as const) {
    if (!isSafeInteger(value[field]) || value[field] < 0) {
      fail(`${label}.${field} must be a non-negative safe integer`, `${label}.${field}`);
    }
  }
  if (
    !Array.isArray(value.warnings) ||
    value.warnings.some((warning) => typeof warning !== "string")
  ) {
    fail(`${label}.warnings must be a string array`, `${label}.warnings`);
  }
}

function assertUniqueIds(entries: readonly unknown[], idField: string, label: string): Set<string> {
  const ids = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!isPlainObject(entry) || !isNonEmptyString(entry[idField])) {
      fail(`${label}[${String(index)}].${idField} must be a non-empty string`, label);
    }
    const id = entry[idField];
    if (ids.has(id)) {
      fail(`${label} contains duplicate ${idField}`, label, id);
    }
    ids.add(id);
  }
  return ids;
}

function collectLineageIds(lineages: unknown[]): Set<string> {
  return assertUniqueIds(lineages, "lineageId", "lineages");
}

function validateReferences(state: UnknownRecord): void {
  const persons = state.persons;
  const families = state.families;
  const lineages = state.lineages;
  const relationships = state.relationships;
  if (
    !Array.isArray(persons) ||
    !Array.isArray(families) ||
    !Array.isArray(lineages) ||
    !Array.isArray(relationships)
  ) {
    fail("entity collections must be arrays");
  }
  const personIds = assertUniqueIds(persons, "personId", "persons");
  const familyIds = assertUniqueIds(families, "familyId", "families");
  const lineageIds = assertUniqueIds(lineages, "lineageId", "lineages");
  assertUniqueIds(relationships, "relationshipId", "relationships");

  for (const person of persons) {
    if (!isPlainObject(person)) {
      fail("person must be a plain object", "persons");
    }
    if (!isNonEmptyString(person.familyId) || !familyIds.has(person.familyId)) {
      fail("person familyId reference does not exist", "persons.familyId");
    }
    if (
      person.lineageId !== undefined &&
      (!isNonEmptyString(person.lineageId) || !lineageIds.has(person.lineageId))
    ) {
      fail("person lineageId reference does not exist", "persons.lineageId");
    }
  }
  for (const lineage of lineages) {
    if (!isPlainObject(lineage)) {
      fail("lineage must be a plain object", "lineages");
    }
    if (!isNonEmptyString(lineage.founderPersonId) || !personIds.has(lineage.founderPersonId)) {
      fail("lineage founderPersonId reference does not exist", "lineages.founderPersonId");
    }
    if (!isNonEmptyString(lineage.founderFamilyId) || !familyIds.has(lineage.founderFamilyId)) {
      fail("lineage founderFamilyId reference does not exist", "lineages.founderFamilyId");
    }
  }
  for (const relationship of relationships) {
    if (!isPlainObject(relationship)) {
      fail("relationship must be a plain object", "relationships");
    }
    const references =
      relationship.kind === "parent_child"
        ? [relationship.parentId, relationship.childId]
        : relationship.kind === "marriage"
          ? [relationship.personAId, relationship.personBId]
          : [relationship.masterId, relationship.discipleId];
    if (references.some((personId) => !isNonEmptyString(personId) || !personIds.has(personId))) {
      fail("relationship person reference does not exist", "relationships");
    }
  }
}

function canonical(value: unknown, field: string): string {
  try {
    return toCanonicalJson(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`canonical comparison failed for ${field}`, { field, detail });
  }
}

function assertCanonicalJsonSafe(value: unknown, field: string): void {
  try {
    walkCanonicalSafe(value, new WeakSet<object>(), field);
  } catch (error) {
    if (error instanceof WorldEngineError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`state is not canonical-JSON safe: ${detail}`, {
      field,
      detail,
    });
  }
}

function walkCanonicalSafe(value: unknown, visiting: WeakSet<object>, field: string): void {
  if (value === null) {
    return;
  }
  switch (typeof value) {
    case "string":
    case "boolean":
      return;
    case "number":
      if (!Number.isFinite(value)) {
        fail(`canonical JSON rejects non-finite number`, field, String(value));
      }
      return;
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      fail(`canonical JSON rejects value of type ${typeof value}`, field);
      return;
    case "object":
      break;
    default:
      fail(`canonical JSON rejects value of type ${typeof value}`, field);
      return;
  }
  if (isTrustedDeepFrozen(value)) {
    return;
  }
  if (visiting.has(value)) {
    fail("circular reference is not canonical-JSON safe", field);
  }
  visiting.add(value);
  try {
    if (Array.isArray(value)) {
      for (const key of Reflect.ownKeys(value)) {
        if (typeof key === "symbol") {
          fail("Symbol keys are not canonical-JSON safe", field, String(key));
        }
        if (key === "length") {
          continue;
        }
        if (!/^(0|[1-9]\d*)$/.test(String(key))) {
          fail(`array has non-index own property '${String(key)}'`, field, String(key));
        }
        walkCanonicalSafe(value[Number(key)], visiting, field);
      }
      return;
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        fail("Symbol keys are not canonical-JSON safe", field, String(key));
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      ) {
        fail(`accessor properties are not canonical-JSON safe`, field, String(key));
      }
      walkCanonicalSafe(descriptor.value, visiting, field);
    }
  } finally {
    visiting.delete(value);
  }
}

function validateExpectedFixed(state: WorldEngineState, expected: WorldEngineState): void {
  for (const field of [
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
    if (state[field] !== expected[field]) {
      fail(`processor must not change ${field}`, field);
    }
  }
  for (const field of [
    "worldDate",
    "generationSummary",
    "families",
    "lineages",
    "relationships",
  ] as const) {
    if (canonical(state[field], field) !== canonical(expected[field], field)) {
      fail(`processor must not change ${field}`, field);
    }
  }
}

function validateArrayEntries(
  values: unknown[],
  assertEntry: (value: unknown, index: number) => void,
): void {
  if (isTrustedDeepFrozen(values)) {
    return;
  }
  values.forEach(assertEntry);
}

function validateWorldEngineStateInternal(state: unknown): asserts state is WorldEngineState {
  try {
    if (!isPlainObject(state)) {
      fail("state must be a plain object", "state");
    }
    if (!(typeof state === "object" && state !== null && isTrustedDeepFrozen(state))) {
      assertWorldEngineDataShape(state);
    }
    for (const field of [
      "schemaVersion",
      "simulationSpecVersion",
      "nameDataVersion",
      "simulationId",
      "worldId",
      "configProfileId",
      "configHash",
    ] as const) {
      assertNonEmptyString(state[field], field);
    }
    if (state.schemaVersion !== INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION) {
      fail("schemaVersion must match INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION", "schemaVersion");
    }
    if (state.simulationSpecVersion !== SIMULATION_SPEC_VERSION) {
      fail("simulationSpecVersion must match SIMULATION_SPEC_VERSION", "simulationSpecVersion");
    }
    if (state.worldId !== FIXED_WORLD_ID) {
      fail("worldId must match FIXED_WORLD_ID", "worldId");
    }
    const simulationId = state.simulationId;
    const configHash = state.configHash;
    assertNonEmptyString(simulationId, "simulationId");
    assertNonEmptyString(configHash, "configHash");
    if (!SIMULATION_ID_PATTERN.test(simulationId)) {
      fail("simulationId must match simulation_<16hex>", "simulationId");
    }
    if (!CONFIG_HASH_PATTERN.test(configHash)) {
      fail("configHash must be a lowercase 64-character hex digest", "configHash");
    }
    if (!isSafeInteger(state.seed) || state.seed < 0 || state.seed > UINT32_MAX) {
      fail("seed must be a uint32", "seed");
    }
    if (state.rngAlgorithm !== RNG_ALGORITHM_VERSION) {
      fail("rngAlgorithm must be xoshiro128ss-v1", "rngAlgorithm");
    }
    if (!isPlainObject(state.worldDate)) {
      fail("worldDate must be a plain object", "worldDate");
    }
    const date = state.worldDate;
    if (
      !isSafeInteger(date.year) ||
      !isSafeInteger(date.month) ||
      !isSafeInteger(date.weekOfMonth) ||
      !isSafeInteger(date.absoluteWeek)
    ) {
      fail("worldDate fields must be safe integers", "worldDate");
    }
    const worldYear = date.year;
    try {
      validateWorldDate(date as WorldDate, DEFAULT_WORLD_CALENDAR_CONFIG);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError("invalid worldDate", { field: "worldDate", detail });
    }
    const persons = state.persons;
    const families = state.families;
    const lineages = state.lineages;
    const relationships = state.relationships;
    if (!Array.isArray(persons)) {
      fail("persons must be an array", "persons");
    }
    if (!Array.isArray(families)) {
      fail("families must be an array", "families");
    }
    if (!Array.isArray(lineages)) {
      fail("lineages must be an array", "lineages");
    }
    if (!Array.isArray(relationships)) {
      fail("relationships must be an array", "relationships");
    }

    const generationSummary = state.generationSummary;
    if (!(
      typeof generationSummary === "object" &&
      generationSummary !== null &&
      isTrustedDeepFrozen(generationSummary)
    )) {
      assertGenerationSummary(generationSummary);
    }

    const lineageIds = collectLineageIds(lineages);
    for (let index = 0; index < persons.length; index += 1) {
      const person = persons[index];
      if (typeof person === "object" && person !== null && isTrustedDeepFrozen(person)) {
        assertPersonDynamicInvariants(person as UnknownRecord, index, worldYear, lineageIds);
        continue;
      }
      assertPerson(person, index, worldYear, lineageIds);
    }
    validateArrayEntries(families, assertFamily);
    validateArrayEntries(lineages, assertLineage);
    validateArrayEntries(relationships, assertRelationship);
    validateReferences(state);
    // Trusted engine-frozen states already passed canonical safety when first validated.
    if (!isTrustedDeepFrozen(state)) {
      assertCanonicalJsonSafe(state, "state");
    }
  } catch (error) {
    if (error instanceof WorldEngineError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`state validation failed: ${detail}`, { field: "state", detail });
  }
}

/**
 * Public WorldEngineState validator. Never skips validation via expectedFixed bypass.
 */
export function validateWorldEngineState(state: unknown): asserts state is WorldEngineState {
  try {
    validateWorldEngineStateInternal(state);
  } catch (error) {
    if (error instanceof WorldEngineError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`state validation failed: ${detail}`, { field: "state", detail });
  }
}

function isLivingPerson(person: Person): person is Person & {
  lifeStatus: "living";
  participationStatus: "waiting" | "active" | "stopped";
  currentAge: number;
} {
  return person.lifeStatus === "living";
}

/**
 * Reject birthYear mutation and living currentAge regression across a Processor call.
 */
function validatePersonAgeProgression(before: WorldEngineState, after: WorldEngineState): void {
  const beforePersons = before.persons;
  const afterPersons = after.persons;
  if (beforePersons.length !== afterPersons.length) {
    return;
  }
  // Person order is fixed by the engine; compare in array order (personId-aligned).
  for (let index = 0; index < beforePersons.length; index += 1) {
    const prev = beforePersons[index]!;
    const next = afterPersons[index]!;
    if (prev.personId !== next.personId) {
      fail("processor must not reorder persons", "persons", prev.personId);
    }
    if (prev.birthYear !== next.birthYear) {
      fail("processor must not change birthYear", "birthYear", prev.personId);
    }
    if (!isLivingPerson(prev) || !isLivingPerson(next)) {
      continue;
    }
    if (next.currentAge < prev.currentAge) {
      fail("processor must not decrease currentAge", "currentAge", prev.personId);
    }
    if (
      (prev.participationStatus === "stopped" || prev.participationStatus === "waiting") &&
      next.participationStatus === "active"
    ) {
      const calendarAge = after.worldDate.year - next.birthYear;
      if (next.currentAge !== calendarAge) {
        fail(
          "active resume requires currentAge === worldDate.year - birthYear",
          "currentAge",
          prev.personId,
        );
      }
    }
  }
}

/**
 * Validate a Processor return value and enforce fixed-field equality against the pre-call state.
 */
export function validateProcessorReturnedState(
  state: unknown,
  expectedFixed: WorldEngineState,
): asserts state is WorldEngineState {
  // Same object reference: already validated this week; fixed fields cannot have changed.
  // Public validateWorldEngineState never takes this shortcut.
  if (state === expectedFixed) {
    return;
  }
  validateWorldEngineStateInternal(state);
  try {
    validateExpectedFixed(state, expectedFixed);
    validatePersonAgeProgression(expectedFixed, state);
  } catch (error) {
    if (error instanceof WorldEngineError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`processor fixed-field validation failed: ${detail}`, {
      field: "state",
      detail,
    });
  }
}
