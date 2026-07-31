/**
 * Allowed own keys and data-property helpers for WorldEngineState trees.
 */
import { ABILITY_KEYS, APTITUDE_KEYS } from "../abilities.js";
import { RANK_ORDER } from "../enums.js";
import { WorldEngineError } from "./errors.js";

const CAREER_STATUS_KEYS = ["child", "trainee", "active_competitor", "retired"] as const;

type UnknownRecord = Record<string, unknown>;

function fail(message: string, field?: string, detail?: string): never {
  throw new WorldEngineError(message, {
    ...(field !== undefined ? { field } : {}),
    ...(detail !== undefined ? { detail } : {}),
  });
}

export const WORLD_ENGINE_STATE_KEYS = [
  "schemaVersion",
  "simulationSpecVersion",
  "nameDataVersion",
  "simulationId",
  "worldId",
  "worldDate",
  "configProfileId",
  "configHash",
  "seed",
  "rngAlgorithm",
  "persons",
  "families",
  "lineages",
  "relationships",
  "generationSummary",
] as const;

export const WORLD_DATE_KEYS = ["year", "month", "weekOfMonth", "absoluteWeek"] as const;

export const STAT_TRIPLE_KEYS = [
  "surfaceValue",
  "expressedGeneticValue",
  "latentGeneticValue",
] as const;

export const FAMILY_KEYS = [
  "familyId",
  "familyName",
  "status",
  "baseBirthRate",
  "initialHistory",
] as const;

export const LINEAGE_KEYS = [
  "lineageId",
  "lineageName",
  "focus",
  "founderPersonId",
  "founderFamilyId",
  "status",
] as const;

export const PAIR_KEYS = ["target", "actual"] as const;

export const GENERATION_SUMMARY_KEYS = [
  "livingCount",
  "deceasedCount",
  "ageBands",
  "sex",
  "careerStatus",
  "activeRanks",
  "retiredRanks",
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
  "brokenReferenceCount",
  "selfReferenceCount",
  "parentCycleCount",
  "masterCycleCount",
  "warnings",
] as const;

const PERSON_CORE_KEYS = [
  "personId",
  "givenName",
  "familyName",
  "displayName",
  "nameDataVersion",
  "sex",
  "birthYear",
  "familyId",
  "abilities",
  "aptitudes",
  "lifeStatus",
  "careerStatus",
  "qualifiedMaster",
] as const;

export function isPlainObject(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertEnumerableDataDescriptor(descriptor: PropertyDescriptor, field: string): void {
  if (descriptor.get !== undefined || descriptor.set !== undefined) {
    fail(`${field} must be a data property (accessor forbidden)`, field);
  }
  if (descriptor.enumerable !== true) {
    fail(`${field} must be enumerable`, field);
  }
}

/**
 * Valid ArrayIndex per ECMAScript: ToString(ToUint32(P)) === P and ToUint32(P) !== 2^32-1.
 */
export function isValidArrayIndexKey(key: string): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) {
    return false;
  }
  const asUint32 = Number(key) >>> 0;
  if (asUint32 === 0xffffffff) {
    return false;
  }
  return String(asUint32) === key;
}

export function assertDataRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  field: string,
): asserts value is UnknownRecord {
  if (!isPlainObject(value)) {
    fail(`${field} must be a plain object`, field);
  }
  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key === "symbol") {
      fail(`${field} must not have Symbol keys`, field, String(key));
    }
    if (!allowedKeys.has(key)) {
      fail(`${field} has unknown property '${key}'`, field, key);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      fail(`${field}.${key} descriptor is missing`, `${field}.${key}`);
    }
    assertEnumerableDataDescriptor(descriptor, `${field}.${key}`);
  }
}

export function dataValue(record: object, key: string, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) {
    fail(`${field}.${key} is required`, `${field}.${key}`);
  }
  assertEnumerableDataDescriptor(descriptor, `${field}.${key}`);
  return descriptor.value;
}

export function optionalDataValue(record: object, key: string, field: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    return undefined;
  }
  return dataValue(record, key, field);
}

export function assertDataArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    fail(`${field} must be an array`, field);
  }
  const length = value.length;
  if (!Number.isSafeInteger(length) || length < 0) {
    fail(`${field}.length must be a non-negative safe integer`, `${field}.length`);
  }
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      fail(`${field} must be a dense array (missing index ${key})`, field, key);
    }
    assertEnumerableDataDescriptor(descriptor, `${field}[${key}]`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      fail(`${field} must not have Symbol keys`, field, String(key));
    }
    if (key === "length") {
      continue;
    }
    if (!isValidArrayIndexKey(key)) {
      fail(`${field} has invalid array index or non-index own property '${key}'`, field, key);
    }
    const index = Number(key);
    if (index >= length) {
      fail(`${field} has own property beyond length`, field, key);
    }
  }
}

export const ALL_PERSON_KEYS: ReadonlySet<string> = new Set([
  "personId",
  "givenName",
  "familyName",
  "displayName",
  "nameDataVersion",
  "sex",
  "birthYear",
  "familyId",
  "abilities",
  "aptitudes",
  "lifeStatus",
  "careerStatus",
  "qualifiedMaster",
  "lineageId",
  "participationStatus",
  "currentAge",
  "deathYear",
  "ageAtDeath",
  "currentRank",
  "highestRank",
  "retirementRank",
]);

export function allowedPersonKeys(lifeStatus: string, careerStatus: string): ReadonlySet<string> {
  const keys = new Set<string>(PERSON_CORE_KEYS);
  if (lifeStatus === "living") {
    keys.add("participationStatus");
    keys.add("currentAge");
  } else if (lifeStatus === "deceased") {
    keys.add("deathYear");
    keys.add("ageAtDeath");
  }

  switch (careerStatus) {
    case "child":
    case "trainee":
      break;
    case "active_competitor":
      keys.add("currentRank");
      keys.add("highestRank");
      break;
    case "retired":
      keys.add("retirementRank");
      keys.add("highestRank");
      break;
  }

  // lineageId is optional except living child (forbidden later by age rule).
  if (!(lifeStatus === "living" && careerStatus === "child")) {
    keys.add("lineageId");
  }

  return keys;
}

export function abilityKeysSet(): ReadonlySet<string> {
  return new Set(ABILITY_KEYS);
}

export function aptitudeKeysSet(): ReadonlySet<string> {
  return new Set(APTITUDE_KEYS);
}

export function setFrom(keys: readonly string[]): ReadonlySet<string> {
  return new Set(keys);
}

export function sexTableKeys(): ReadonlySet<string> {
  return new Set(["male", "female"]);
}

export function careerTableKeys(): ReadonlySet<string> {
  return new Set(CAREER_STATUS_KEYS);
}

export function rankTableKeys(): ReadonlySet<string> {
  return new Set(RANK_ORDER);
}
