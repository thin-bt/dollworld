/**
 * Structural `Person` validation for the weekly training processor (10 mini-spec §7,
 * 08 §6.2 / S01-004).
 *
 * Mirrors the Sprint 0 `Person` shape (`domain.ts`) and the *structural* half of the
 * WorldEngine person rules: the allowed key set per `lifeStatus` / `careerStatus`,
 * the required core fields, and the forbidden-field contract. Dynamic world
 * invariants that need a world year or a lineage table (`currentAge` vs `worldYear`,
 * lineage membership, `qualifiedMaster` eligibility) stay in the WorldEngine and are
 * never re-derived here.
 *
 * `sprint1State` is mandatory for every person handed to the weekly processor,
 * including inactive ones: 08 §6.2 attaches it once and 10 §13 forbids implicit
 * initialization, so a missing state is an input error rather than a silent default.
 *
 * The rebuilt person is a real `Person` value (data properties only, deep-frozen);
 * no `as unknown as Person` cast is used anywhere in this module.
 */
import { ABILITY_KEYS, APTITUDE_KEYS } from "../abilities.js";
import type { AbilityScores, AptitudeScores, StatValueTriple } from "../abilities.js";
import type { Person } from "../domain.js";
import { RANK_ORDER } from "../enums.js";
import type { CareerStatus, LifeStatus, ParticipationStatus, Rank, Sex } from "../enums.js";
import { asFamilyId, asLineageId, asPersonId } from "../ids.js";
import type { FamilyId, LineageId, PersonId } from "../ids.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { failure, success } from "../validation.js";
import {
  assertNoAccessors,
  childPath,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireBoolean,
  requireIntegerInRange,
  requireSafeIntegerAtLeast,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validateSprint1PersonState } from "./sprint1-person-state.js";
import type { Sprint1PersonState } from "./sprint1-person-state.js";

const LIFE_STATUS_VALUES: readonly LifeStatus[] = ["living", "deceased"];
const PARTICIPATION_STATUS_VALUES: readonly ParticipationStatus[] = [
  "waiting",
  "active",
  "stopped",
];
const CAREER_STATUS_VALUES: readonly CareerStatus[] = [
  "child",
  "trainee",
  "active_competitor",
  "retired",
];
const SEX_VALUES: readonly Sex[] = ["male", "female"];

/** Keys every person carries, regardless of life or career status. */
export const WEEKLY_PERSON_CORE_KEYS = [
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
  "sprint1State",
] as const;

/** Superset used only when `lifeStatus` / `careerStatus` are themselves invalid. */
const ALL_WEEKLY_PERSON_KEYS: readonly string[] = [
  ...WEEKLY_PERSON_CORE_KEYS,
  "participationStatus",
  "currentAge",
  "deathYear",
  "ageAtDeath",
  "currentRank",
  "highestRank",
  "retirementRank",
];

/**
 * Allowed own keys for one life/career combination. Anything outside the set is a
 * forbidden field: a living person carrying `deathYear`, a deceased person carrying
 * `currentAge` / `currentRank`, or a trainee carrying rank fields are all rejected.
 */
function allowedWeeklyPersonKeys(
  lifeStatus: LifeStatus,
  careerStatus: CareerStatus,
): readonly string[] {
  const keys = new Set<string>(WEEKLY_PERSON_CORE_KEYS);
  if (lifeStatus === "living") {
    keys.add("participationStatus");
    keys.add("currentAge");
  } else {
    keys.add("deathYear");
    keys.add("ageAtDeath");
  }

  switch (careerStatus) {
    case "child":
    case "trainee":
      break;
    case "active_competitor":
      if (lifeStatus === "living") {
        keys.add("currentRank");
      }
      keys.add("highestRank");
      break;
    case "retired":
      keys.add("highestRank");
      keys.add("retirementRank");
      break;
  }

  return [...keys];
}

function requireEnumValue<T extends string>(
  object: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): T | undefined {
  const keyPath = childPath(path, key);
  if (!hasOwn(object, key)) {
    issues.push({
      path: keyPath,
      message: "required key is missing",
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    issues.push({
      path: keyPath,
      message: `${key} must be one of the fixed enum values`,
      actual: value,
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  return value as T;
}

function requirePersonString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  const keyPath = childPath(path, key);
  if (!hasOwn(object, key)) {
    issues.push({
      path: keyPath,
      message: "required key is missing",
      expected: "non-empty string",
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({
      path: keyPath,
      message: `${key} must be a non-empty string`,
      actual: value,
      expected: "non-empty string",
    });
    return undefined;
  }
  return value;
}

function requireSafeIntegerValue(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): number | undefined {
  const keyPath = childPath(path, key);
  if (!hasOwn(object, key)) {
    issues.push({ path: keyPath, message: "required key is missing", expected: "safe integer" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push({
      path: keyPath,
      message: `${key} must be a safe integer`,
      actual: value,
      expected: "safe integer",
    });
    return undefined;
  }
  return value;
}

function requireRank(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): Rank | undefined {
  return requireEnumValue<Rank>(object, key, path, RANK_ORDER, issues);
}

/**
 * Structural read of an ability/aptitude score map: every enum key must be present
 * with an integer `surfaceValue` in 0..100. Genetic values are copied unchanged and
 * are never used as a growth input (08 §2.3).
 */
export function parseStatValueTripleMap<K extends string>(
  value: unknown,
  keys: readonly K[],
  path: string,
  issues: ValidationIssue[],
): Record<K, StatValueTriple> | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, keys, path, issues);

  const rebuilt = {} as Record<K, StatValueTriple>;
  let ok = true;
  for (const key of keys) {
    const entryPath = childPath(path, key);
    const entry = snapshotPlainObjectOrFail(object[key], entryPath, issues);
    if (entry === undefined) {
      ok = false;
      continue;
    }
    assertNoAccessors(entry, entryPath, issues);
    rejectUnknownKeys(
      entry,
      ["surfaceValue", "expressedGeneticValue", "latentGeneticValue"],
      entryPath,
      issues,
    );
    const surfaceValue = requireIntegerInRange(entry, "surfaceValue", entryPath, 0, 100, issues);
    const expressedGeneticValue = requireIntegerInRange(
      entry,
      "expressedGeneticValue",
      entryPath,
      0,
      100,
      issues,
    );
    const latentGeneticValue = requireIntegerInRange(
      entry,
      "latentGeneticValue",
      entryPath,
      0,
      100,
      issues,
    );
    if (
      surfaceValue === undefined ||
      expressedGeneticValue === undefined ||
      latentGeneticValue === undefined
    ) {
      ok = false;
      continue;
    }
    rebuilt[key] = { surfaceValue, expressedGeneticValue, latentGeneticValue };
  }
  return ok ? rebuilt : undefined;
}

/**
 * Derived read-only view of a validated person. Built once per week from the
 * weekStart snapshot so scoring/selection never re-reads a mutable draft (10 §2.1).
 */
export type WeeklyTrainingPersonView = {
  personId: PersonId;
  lifeStatus: LifeStatus;
  participationStatus: ParticipationStatus | null;
  careerStatus: CareerStatus;
  currentAge: number | null;
  abilities: AbilityScores;
  aptitudes: AptitudeScores;
  sprint1State: Sprint1PersonState;
};

export type ParsedWeeklyTrainingPerson = {
  person: Person;
  view: WeeklyTrainingPersonView;
};

type CommonPersonFields = {
  personId: PersonId;
  givenName: string;
  familyName: string;
  displayName: string;
  nameDataVersion: string;
  sex: Sex;
  birthYear: number;
  familyId: FamilyId;
  abilities: AbilityScores;
  aptitudes: AptitudeScores;
  sprint1State: Sprint1PersonState;
  lineageId?: LineageId;
};

function buildPerson(
  common: CommonPersonFields,
  lifeStatus: LifeStatus,
  careerStatus: CareerStatus,
  status: {
    participationStatus: ParticipationStatus | null;
    currentAge: number | null;
    deathYear: number | null;
    ageAtDeath: number | null;
    currentRank: Rank | null;
    highestRank: Rank | null;
    retirementRank: Rank | null;
    qualifiedMaster: boolean;
  },
): Person | undefined {
  if (lifeStatus === "living") {
    if (status.participationStatus === null || status.currentAge === null) {
      return undefined;
    }
    const living = {
      ...common,
      lifeStatus: "living" as const,
      participationStatus: status.participationStatus,
      currentAge: status.currentAge,
    };
    switch (careerStatus) {
      case "child":
        return { ...living, careerStatus: "child", qualifiedMaster: false };
      case "trainee":
        return { ...living, careerStatus: "trainee", qualifiedMaster: false };
      case "active_competitor":
        if (status.currentRank === null || status.highestRank === null) {
          return undefined;
        }
        return {
          ...living,
          careerStatus: "active_competitor",
          currentRank: status.currentRank,
          highestRank: status.highestRank,
          qualifiedMaster: false,
        };
      case "retired":
        if (status.highestRank === null || status.retirementRank === null) {
          return undefined;
        }
        return {
          ...living,
          careerStatus: "retired",
          highestRank: status.highestRank,
          retirementRank: status.retirementRank,
          qualifiedMaster: status.qualifiedMaster,
        };
    }
  }

  if (status.deathYear === null || status.ageAtDeath === null) {
    return undefined;
  }
  const deceased = {
    ...common,
    lifeStatus: "deceased" as const,
    deathYear: status.deathYear,
    ageAtDeath: status.ageAtDeath,
  };
  switch (careerStatus) {
    case "child":
      return { ...deceased, careerStatus: "child", qualifiedMaster: false };
    case "trainee":
      return { ...deceased, careerStatus: "trainee", qualifiedMaster: false };
    case "active_competitor":
      if (status.highestRank === null) {
        return undefined;
      }
      return {
        ...deceased,
        careerStatus: "active_competitor",
        highestRank: status.highestRank,
        qualifiedMaster: false,
      };
    case "retired":
      if (status.highestRank === null || status.retirementRank === null) {
        return undefined;
      }
      return {
        ...deceased,
        careerStatus: "retired",
        highestRank: status.highestRank,
        retirementRank: status.retirementRank,
        qualifiedMaster: status.qualifiedMaster,
      };
  }
}

/**
 * Validate one `Person` from untrusted input and rebuild it as a frozen plain value.
 * Every issue is reported through `issues`; `undefined` means "do not continue".
 */
export function parseWeeklyTrainingPerson(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ParsedWeeklyTrainingPerson | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);

  const lifeStatus = requireEnumValue<LifeStatus>(
    object,
    "lifeStatus",
    path,
    LIFE_STATUS_VALUES,
    issues,
  );
  const careerStatus = requireEnumValue<CareerStatus>(
    object,
    "careerStatus",
    path,
    CAREER_STATUS_VALUES,
    issues,
  );
  if (lifeStatus === undefined || careerStatus === undefined) {
    rejectUnknownKeys(object, ALL_WEEKLY_PERSON_KEYS, path, issues);
    return undefined;
  }
  rejectUnknownKeys(object, allowedWeeklyPersonKeys(lifeStatus, careerStatus), path, issues);

  const personId = requirePersonString(object, "personId", path, issues);
  const givenName = requirePersonString(object, "givenName", path, issues);
  const familyName = requirePersonString(object, "familyName", path, issues);
  const displayName = requirePersonString(object, "displayName", path, issues);
  const nameDataVersion = requirePersonString(object, "nameDataVersion", path, issues);
  const familyId = requirePersonString(object, "familyId", path, issues);
  const sex = requireEnumValue<Sex>(object, "sex", path, SEX_VALUES, issues);
  const birthYear = requireSafeIntegerValue(object, "birthYear", path, issues);

  let lineageId: string | undefined;
  if (hasOwn(object, "lineageId")) {
    lineageId = requirePersonString(object, "lineageId", path, issues);
  }

  const abilities = parseStatValueTripleMap(
    object["abilities"],
    ABILITY_KEYS,
    childPath(path, "abilities"),
    issues,
  );
  const aptitudes = parseStatValueTripleMap(
    object["aptitudes"],
    APTITUDE_KEYS,
    childPath(path, "aptitudes"),
    issues,
  );

  const qualifiedMaster = requireBoolean(object, "qualifiedMaster", path, issues);

  let participationStatus: ParticipationStatus | null = null;
  let currentAge: number | null = null;
  let deathYear: number | null = null;
  let ageAtDeath: number | null = null;
  if (lifeStatus === "living") {
    participationStatus =
      requireEnumValue<ParticipationStatus>(
        object,
        "participationStatus",
        path,
        PARTICIPATION_STATUS_VALUES,
        issues,
      ) ?? null;
    currentAge = requireSafeIntegerAtLeast(object, "currentAge", path, 0, issues) ?? null;
  } else {
    deathYear = requireSafeIntegerValue(object, "deathYear", path, issues) ?? null;
    ageAtDeath = requireSafeIntegerAtLeast(object, "ageAtDeath", path, 0, issues) ?? null;
    if (deathYear !== null && ageAtDeath !== null && birthYear !== undefined) {
      if (ageAtDeath !== deathYear - birthYear) {
        issues.push({
          path: childPath(path, "ageAtDeath"),
          message: "ageAtDeath must equal deathYear - birthYear",
          actual: ageAtDeath,
          expected: String(deathYear - birthYear),
        });
      }
    }
  }

  let currentRank: Rank | null = null;
  let highestRank: Rank | null = null;
  let retirementRank: Rank | null = null;
  switch (careerStatus) {
    case "child":
    case "trainee":
      if (qualifiedMaster === true) {
        issues.push({
          path: childPath(path, "qualifiedMaster"),
          message: "a child or trainee cannot be a qualified master",
          actual: qualifiedMaster,
          expected: "false",
        });
      }
      break;
    case "active_competitor":
      if (lifeStatus === "living") {
        currentRank = requireRank(object, "currentRank", path, issues) ?? null;
      }
      highestRank = requireRank(object, "highestRank", path, issues) ?? null;
      if (qualifiedMaster === true) {
        issues.push({
          path: childPath(path, "qualifiedMaster"),
          message: "an active competitor cannot be a qualified master",
          actual: qualifiedMaster,
          expected: "false",
        });
      }
      break;
    case "retired":
      highestRank = requireRank(object, "highestRank", path, issues) ?? null;
      retirementRank = requireRank(object, "retirementRank", path, issues) ?? null;
      break;
  }

  let sprint1State: Sprint1PersonState | undefined;
  if (!hasOwn(object, "sprint1State") || object["sprint1State"] === undefined) {
    issues.push({
      path: childPath(path, "sprint1State"),
      message:
        "sprint1State is required for every person handed to the weekly processor, including inactive ones (08 §6.2; no implicit initialization)",
      expected: "Sprint1PersonState",
    });
  } else if (abilities !== undefined) {
    const stateResult = validateSprint1PersonState(object["sprint1State"], {
      spiritSurfaceValue: abilities.spirit.surfaceValue,
    });
    if (!stateResult.ok) {
      for (const issue of stateResult.issues) {
        issues.push({ ...issue, path: `${childPath(path, "sprint1State")}${issue.path}` });
      }
    } else {
      sprint1State = stateResult.value;
    }
  } else {
    // Ability failure already reported; Sprint1PersonState needs spirit to validate.
    issues.push({
      path: childPath(path, "sprint1State"),
      message: "sprint1State cannot be validated because abilities.spirit is invalid",
      expected: "valid abilities",
    });
  }

  if (
    personId === undefined ||
    givenName === undefined ||
    familyName === undefined ||
    displayName === undefined ||
    nameDataVersion === undefined ||
    familyId === undefined ||
    sex === undefined ||
    birthYear === undefined ||
    abilities === undefined ||
    aptitudes === undefined ||
    qualifiedMaster === undefined ||
    sprint1State === undefined ||
    issues.length > 0
  ) {
    return undefined;
  }

  const common: CommonPersonFields = {
    personId: asPersonId(personId),
    givenName,
    familyName,
    displayName,
    nameDataVersion,
    sex,
    birthYear,
    familyId: asFamilyId(familyId),
    abilities,
    aptitudes,
    sprint1State,
    ...(lineageId === undefined ? {} : { lineageId: asLineageId(lineageId) }),
  };

  const person = buildPerson(common, lifeStatus, careerStatus, {
    participationStatus,
    currentAge,
    deathYear,
    ageAtDeath,
    currentRank,
    highestRank,
    retirementRank,
    qualifiedMaster,
  });
  if (person === undefined) {
    issues.push({
      path,
      message: "person is missing a field required by its lifeStatus / careerStatus combination",
      expected: `${lifeStatus} ${careerStatus} Person`,
    });
    return undefined;
  }

  return {
    person: deepFreezePlainJson(person),
    view: deepFreezePlainJson({
      personId: common.personId,
      lifeStatus,
      participationStatus,
      careerStatus,
      currentAge,
      abilities,
      aptitudes,
      sprint1State,
    }),
  };
}

/** Standalone entry point (same rules as the record-level person check). */
export function validateWeeklyTrainingPerson(
  input: unknown,
): ValidationResult<ParsedWeeklyTrainingPerson> {
  const issues: ValidationIssue[] = [];
  const parsed = parseWeeklyTrainingPerson(input, "", issues);
  if (parsed === undefined || issues.length > 0) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "Person must be a plain object",
              actual: input,
              expected: "Person",
            },
          ],
    );
  }
  return success(parsed);
}
