/**
 * Battle participant source validation, eligibility, and the frozen
 * `BattleParticipantSnapshot` produced at battle start (11 mini-spec §4.3 / §5 / §6
 * / §7 / §12, 08 §6.1, S01-005).
 *
 * Nothing here consumes randomness: every value is a pure function of the
 * participant source, the world date, and the Sprint 1 config.
 */
import { ABILITY_KEYS, APTITUDE_KEYS } from "../abilities.js";
import type { AbilityScores, AptitudeScores } from "../abilities.js";
import { computeCurrentAge } from "../age-status.js";
import { compareUnicodeCodePoints, toCanonicalJson } from "../canonical-json.js";
import type { CareerStatus, LifeStatus, ParticipationStatus } from "../enums.js";
import { asPersonId, asTechniqueId } from "../ids.js";
import type { PersonId, TechniqueId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import type { WorldDate } from "../world-date.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";
import { adaptBattleProfile, validateBattleDecisionProfile } from "./battle-decision-profile.js";
import type { BattleDecisionProfile } from "./battle-decision-profile.js";
import { BATTLE_SIDES, isBattleKind, isBattleSide } from "./battle-enums.js";
import type { BattleKind, BattleSide } from "./battle-enums.js";
import { deriveMaxMental } from "./max-mental.js";
import { validatePersonTemporaryCondition } from "./person-temporary-condition.js";
import type { PersonTemporaryCondition } from "./person-temporary-condition.js";
import {
  SHA256_HEX_PATTERN,
  assertNoAccessors,
  childPath,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireBoolean,
  requireInteger,
  requireIntegerInRange,
  requireLiteralString,
  requireNonEmptyTrimmedString,
  requireNullableIntegerAtLeast,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import { SPRINT1_PERSON_STATE_SCHEMA_VERSION } from "./sprint1-person-state.js";
import type { Sprint1PersonState } from "./sprint1-person-state.js";
import type { PersonTechniqueState, Sprint1Config } from "./types.js";
import {
  parseStatValueTripleMap,
  validateWeeklyTrainingPerson,
} from "./weekly-person-structure.js";
import type { ParsedWeeklyTrainingPerson } from "./weekly-person-structure.js";

const CAREER_STATUS_VALUES: readonly CareerStatus[] = [
  "child",
  "trainee",
  "active_competitor",
  "retired",
];

/** 11 §5: age windows per battle kind and career status. */
export const OFFICIAL_BATTLE_MINIMUM_AGE = 16;
export const OFFICIAL_BATTLE_MAXIMUM_AGE = 41;
export const MOCK_BATTLE_TRAINEE_MINIMUM_AGE = 8;
export const MOCK_BATTLE_TRAINEE_MAXIMUM_AGE = 15;

/** 08 §6.1: durability baseline before condition/fatigue/injury adjustment. */
export const BASE_MAX_DURABILITY_OFFSET = 100;

/** Basis-points scale of the start-durability percent term (percent × 10000). */
export const START_DURABILITY_PERCENT_SCALE = BASIS_POINTS_SCALE;
export const START_DURABILITY_FULL_PERCENT_BASIS_POINTS = 100 * BASIS_POINTS_SCALE;

export const BATTLE_PARTICIPANT_SOURCE_KEYS = ["person", "temporaryCondition"] as const;

/**
 * Standard World-path battle input (11 §4.3). Profile / injuryProneness are never
 * caller-supplied here: the fixed neutral adapter fills them internally.
 */
export type BattleParticipantSource = {
  person: import("../domain.js").Person;
  temporaryCondition: PersonTemporaryCondition;
};

export const BATTLE_PARTICIPANT_SNAPSHOT_KEYS = [
  "side",
  "personId",
  "lifeStatus",
  "participationStatus",
  "careerStatus",
  "birthYear",
  "ageAtBattle",
  "sourceSnapshotHash",
  "sprint1StateSchemaVersion",
  "stats",
  "aptitudes",
  "techniques",
  "fatigue",
  "injury",
  "condition",
  "confidence",
  "injuryProneness",
  "battleDecisionProfile",
  "baseMaxDurability",
  "startDurabilityPercentBasisPoints",
  "maxDurability",
  "currentDurability",
  "maxMental",
  "currentMental",
  "guarding",
  "evading",
  "canAct",
  "surrendered",
  "unableToContinue",
  "nextHitModifier",
  "nextActivationModifier",
  "damageDealt",
  "damageReceived",
  "attemptedHits",
  "successfulHits",
  "successfulDefenses",
  "successfulEvasions",
  "successfulCounters",
  "passiveActionCount",
  "invalidActionCount",
  "advantageTurnCount",
  "inBattleConsumption",
] as const;

export type BattleParticipantSnapshot = {
  side: BattleSide;
  personId: PersonId;
  lifeStatus: LifeStatus;
  participationStatus: ParticipationStatus;
  careerStatus: CareerStatus;
  birthYear: number;
  ageAtBattle: number;
  sourceSnapshotHash: string;
  sprint1StateSchemaVersion: Sprint1PersonState["sprint1StateSchemaVersion"];
  stats: AbilityScores;
  aptitudes: AptitudeScores;
  techniques: readonly PersonTechniqueState[];
  fatigue: number;
  injury: number;
  condition: number;
  confidence: number;
  injuryProneness: number;
  battleDecisionProfile: BattleDecisionProfile;
  baseMaxDurability: number;
  startDurabilityPercentBasisPoints: number;
  maxDurability: number;
  currentDurability: number;
  maxMental: number;
  currentMental: number;
  guarding: boolean;
  evading: boolean;
  canAct: boolean;
  surrendered: boolean;
  unableToContinue: boolean;
  nextHitModifier: number;
  nextActivationModifier: number;
  damageDealt: number;
  damageReceived: number;
  attemptedHits: number;
  successfulHits: number;
  successfulDefenses: number;
  successfulEvasions: number;
  successfulCounters: number;
  passiveActionCount: number;
  invalidActionCount: number;
  advantageTurnCount: number;
  inBattleConsumption: number;
};

export type BattleParticipantContext = {
  side: BattleSide;
  battleKind: BattleKind;
  worldDate: WorldDate;
  config: Sprint1Config;
  knownTechniqueIds: ReadonlySet<string>;
};

/** 08 §6.1: `100 + stamina.surfaceValue`. */
export function deriveBaseMaxDurability(staminaSurfaceValue: number): ValidationResult<number> {
  if (
    typeof staminaSurfaceValue !== "number" ||
    !Number.isInteger(staminaSurfaceValue) ||
    Object.is(staminaSurfaceValue, -0) ||
    staminaSurfaceValue < 0 ||
    staminaSurfaceValue > 100
  ) {
    return failure([
      {
        path: "/abilities/stamina/surfaceValue",
        message: "stamina.surfaceValue must be an integer in 0..100",
        actual: staminaSurfaceValue,
        expected: "integer 0..100",
      },
    ]);
  }
  return success(BASE_MAX_DURABILITY_OFFSET + staminaSurfaceValue);
}

/**
 * 11 §6: `clamp(minimumPercent × 10000, 100 × 10000, 100 × 10000 +
 * condition × conditionBp − fatigue × fatigueBp − injury × injuryBp)`.
 * All terms are integers, so the result is exact.
 */
export function deriveStartDurabilityPercentBasisPoints(
  startDurability: Sprint1Config["battle"]["startDurability"],
  condition: number,
  fatigue: number,
  injury: number,
): number {
  const raw =
    START_DURABILITY_FULL_PERCENT_BASIS_POINTS +
    condition * startDurability.conditionPercentPerPoint -
    fatigue * startDurability.fatiguePercentPerPoint -
    injury * startDurability.injuryPercentPerPoint;
  const minimum = startDurability.minimumPercent * BASIS_POINTS_SCALE;
  if (raw < minimum) {
    return minimum;
  }
  if (raw > START_DURABILITY_FULL_PERCENT_BASIS_POINTS) {
    return START_DURABILITY_FULL_PERCENT_BASIS_POINTS;
  }
  return raw;
}

/**
 * 11 §6: `max(1, floor(maxDurability × percentBasisPoints / 1000000))`.
 * The divisor is `100 × BASIS_POINTS_SCALE` because the numerator carries both
 * the percent and the basis-point scale.
 */
export function deriveStartCurrentDurability(
  maxDurability: number,
  startDurabilityPercentBasisPoints: number,
): number {
  const scaled = Math.floor(
    (maxDurability * startDurabilityPercentBasisPoints) / (100 * BASIS_POINTS_SCALE),
  );
  return scaled < 1 ? 1 : scaled;
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

/**
 * Structural read of the per-side battle input (11 §4.3). The standard World
 * path accepts only a full Person union plus temporaryCondition; profile axes
 * are never caller-injected.
 */
export function validateBattleParticipantSource(input: unknown): ValidationResult<{
  person: ParsedWeeklyTrainingPerson;
  temporaryCondition: PersonTemporaryCondition;
}> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "battle participant source must be a plain object",
              actual: input,
              expected: "{ person, temporaryCondition }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_PARTICIPANT_SOURCE_KEYS, "", issues);

  let person: ParsedWeeklyTrainingPerson | undefined;
  if (!hasOwn(object, "person")) {
    issues.push({
      path: "/person",
      message: "required key is missing",
      expected: "Person",
    });
  } else {
    const result = validateWeeklyTrainingPerson(object["person"]);
    if (result.ok) {
      person = result.value;
    } else {
      issues.push(...prefixIssues(result.issues, "/person"));
    }
  }

  let temporaryCondition: PersonTemporaryCondition | undefined;
  if (!hasOwn(object, "temporaryCondition")) {
    issues.push({
      path: "/temporaryCondition",
      message: "required key is missing",
      expected: "PersonTemporaryCondition",
    });
  } else {
    const result = validatePersonTemporaryCondition(object["temporaryCondition"]);
    if (result.ok) {
      temporaryCondition = result.value;
    } else {
      issues.push(...prefixIssues(result.issues, "/temporaryCondition"));
    }
  }

  if (person === undefined || temporaryCondition === undefined || issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      person,
      temporaryCondition,
    }),
  );
}

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${prefix}${issue.path}` }));
}

/** 11 §5 career/age window per battle kind. */
export function isEligibleForBattleKind(
  battleKind: BattleKind,
  careerStatus: CareerStatus,
  age: number,
): boolean {
  if (careerStatus === "active_competitor") {
    return age >= OFFICIAL_BATTLE_MINIMUM_AGE && age <= OFFICIAL_BATTLE_MAXIMUM_AGE;
  }
  if (battleKind === "mock" && careerStatus === "trainee") {
    return age >= MOCK_BATTLE_TRAINEE_MINIMUM_AGE && age <= MOCK_BATTLE_TRAINEE_MAXIMUM_AGE;
  }
  return false;
}

/**
 * 11 §12: `sourceSnapshotHash` covers only the participant source material —
 * never derived battle counters and never the hash itself.
 */
export function computeBattleParticipantSourceSnapshotHash(
  source: {
    personId: PersonId;
    lifeStatus: LifeStatus;
    participationStatus: ParticipationStatus;
    careerStatus: CareerStatus;
    birthYear: number;
    ageAtBattle: number;
    stats: AbilityScores;
    aptitudes: AptitudeScores;
    techniques: readonly PersonTechniqueState[];
    fatigue: number;
    injury: number;
    condition: number;
    confidence: number;
    battleDecisionProfile: BattleDecisionProfile;
    injuryProneness: number;
    sprint1StateSchemaVersion: Sprint1PersonState["sprint1StateSchemaVersion"];
    currentMental: number;
  },
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson({
      personId: source.personId,
      lifeStatus: source.lifeStatus,
      participationStatus: source.participationStatus,
      careerStatus: source.careerStatus,
      birthYear: source.birthYear,
      ageAtBattle: source.ageAtBattle,
      stats: source.stats,
      aptitudes: source.aptitudes,
      techniques: source.techniques,
      fatigue: source.fatigue,
      injury: source.injury,
      condition: source.condition,
      confidence: source.confidence,
      battleDecisionProfile: source.battleDecisionProfile,
      injuryProneness: source.injuryProneness,
      sprint1StateSchemaVersion: source.sprint1StateSchemaVersion,
      currentMental: source.currentMental,
    }),
    "/sourceSnapshotHash",
  );
}

/**
 * Structure / eligibility / derived battle counters without sourceSnapshotHash
 * (S01-005 Phase 1). Never calls Sha256Provider.
 */
export type PreflightBattleParticipantSnapshot = Omit<
  BattleParticipantSnapshot,
  "sourceSnapshotHash"
>;

export function preflightBattleParticipant(
  input: unknown,
  context: BattleParticipantContext,
): ValidationResult<PreflightBattleParticipantSnapshot> {
  if (!isBattleSide(context.side)) {
    return failure([
      {
        path: "/side",
        message: "side must be one of the fixed BattleSide values",
        actual: context.side,
        expected: BATTLE_SIDES.join(" | "),
      },
    ]);
  }
  if (!isBattleKind(context.battleKind)) {
    return failure([
      {
        path: "/battleKind",
        message: "battleKind must be one of the fixed BattleKind values",
        actual: context.battleKind,
        expected: "official | mock",
      },
    ]);
  }

  const sourceResult = validateBattleParticipantSource(input);
  if (!sourceResult.ok) {
    return failure(sourceResult.issues);
  }
  const { person, temporaryCondition } = sourceResult.value;
  const view = person.view;
  const issues: ValidationIssue[] = [];

  if (view.lifeStatus !== "living") {
    issues.push({
      path: "/person/lifeStatus",
      message: "a deceased person cannot enter a battle",
      actual: view.lifeStatus,
      expected: "living",
    });
  }
  if (view.participationStatus !== "active") {
    issues.push({
      path: "/person/participationStatus",
      message: "only an active person can enter a battle",
      actual: view.participationStatus,
      expected: "active",
    });
  }
  if (view.currentAge === null) {
    issues.push({
      path: "/person/currentAge",
      message: "a living person must carry currentAge",
      actual: view.currentAge,
      expected: "non-null integer age",
    });
  }
  if (view.participationStatus === null) {
    issues.push({
      path: "/person/participationStatus",
      message: "a living person must carry participationStatus",
      actual: view.participationStatus,
      expected: "ParticipationStatus",
    });
  }

  const birthYear = person.person.birthYear;
  let ageAtBattle: number | undefined;
  try {
    ageAtBattle = computeCurrentAge(context.worldDate.year, birthYear);
  } catch (error) {
    issues.push({
      path: "/person/birthYear",
      message:
        error instanceof Error ? error.message : "age could not be derived from the world date",
      actual: birthYear,
      expected: "birthYear <= worldDate.year",
    });
  }

  if (ageAtBattle !== undefined && view.currentAge !== null && ageAtBattle !== view.currentAge) {
    issues.push({
      path: "/person/currentAge",
      message: "currentAge must equal the age derived from worldDate.year and birthYear",
      actual: view.currentAge,
      expected: String(ageAtBattle),
    });
  }

  if (
    ageAtBattle !== undefined &&
    !isEligibleForBattleKind(context.battleKind, view.careerStatus, ageAtBattle)
  ) {
    issues.push({
      path: "/person/careerStatus",
      message: `career status and age are not eligible for a ${context.battleKind} battle`,
      actual: `${view.careerStatus}@${String(ageAtBattle)}`,
      expected:
        context.battleKind === "official"
          ? "active_competitor aged 16..41"
          : "trainee aged 8..15 or active_competitor aged 16..41",
    });
  }

  const unableToContinueThreshold = context.config.battle.injury.unableToContinueThreshold;
  if (temporaryCondition.injury >= unableToContinueThreshold) {
    issues.push({
      path: "/temporaryCondition/injury",
      message: "injury has reached the battle unable-to-continue threshold",
      actual: temporaryCondition.injury,
      expected: `< ${String(unableToContinueThreshold)}`,
    });
  }

  for (let index = 0; index < view.sprint1State.techniqueStates.length; index += 1) {
    const techniqueId: TechniqueId = view.sprint1State.techniqueStates[index]!.techniqueId;
    if (!context.knownTechniqueIds.has(techniqueId)) {
      issues.push({
        path: `/person/sprint1State/techniqueStates/${String(index)}/techniqueId`,
        message: "techniqueId is not present in the run technique catalog",
        actual: techniqueId,
        expected: "TechniqueId defined by the run rule snapshot",
      });
    }
  }

  const baseMaxDurabilityResult = deriveBaseMaxDurability(view.abilities.stamina.surfaceValue);
  if (!baseMaxDurabilityResult.ok) {
    issues.push(...baseMaxDurabilityResult.issues);
  }
  const maxMentalResult = deriveMaxMental(view.abilities.spirit.surfaceValue);
  if (!maxMentalResult.ok) {
    issues.push(...maxMentalResult.issues);
  }

  // Standard World path: never accept caller profile / injuryProneness. Always
  // use the fixed neutral adapter (11 §4.5).
  const profileResult = adaptBattleProfile(undefined);
  if (!profileResult.ok) {
    issues.push(...prefixIssues(profileResult.issues, "/battleDecisionProfile"));
  }

  if (
    ageAtBattle === undefined ||
    view.currentAge === null ||
    view.participationStatus === null ||
    !baseMaxDurabilityResult.ok ||
    !maxMentalResult.ok ||
    !profileResult.ok ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const maxMental = maxMentalResult.value;
  const currentMental = view.sprint1State.currentMental;
  if (!Number.isInteger(currentMental) || currentMental < 0 || currentMental > maxMental) {
    return failure([
      {
        path: "/person/sprint1State/currentMental",
        message: "currentMental must be an integer in 0..maxMental",
        actual: currentMental,
        expected: `integer 0..${String(maxMental)}`,
      },
    ]);
  }

  const baseMaxDurability = baseMaxDurabilityResult.value;
  const startDurabilityPercentBasisPoints = deriveStartDurabilityPercentBasisPoints(
    context.config.battle.startDurability,
    temporaryCondition.condition,
    temporaryCondition.fatigue,
    temporaryCondition.injury,
  );
  const maxDurability = baseMaxDurability;
  const currentDurability = deriveStartCurrentDurability(
    maxDurability,
    startDurabilityPercentBasisPoints,
  );

  const snapshot: PreflightBattleParticipantSnapshot = {
    side: context.side,
    personId: view.personId,
    lifeStatus: view.lifeStatus,
    participationStatus: view.participationStatus,
    careerStatus: view.careerStatus,
    birthYear,
    ageAtBattle,
    sprint1StateSchemaVersion: view.sprint1State.sprint1StateSchemaVersion,
    stats: view.abilities,
    aptitudes: view.aptitudes,
    techniques: view.sprint1State.techniqueStates,
    fatigue: temporaryCondition.fatigue,
    injury: temporaryCondition.injury,
    condition: temporaryCondition.condition,
    confidence: temporaryCondition.confidence,
    injuryProneness: profileResult.value.injuryProneness,
    battleDecisionProfile: profileResult.value.battleDecisionProfile,
    baseMaxDurability,
    startDurabilityPercentBasisPoints,
    maxDurability,
    currentDurability,
    maxMental,
    currentMental,
    guarding: false,
    evading: false,
    canAct: true,
    surrendered: false,
    unableToContinue: false,
    nextHitModifier: 0,
    nextActivationModifier: 0,
    damageDealt: 0,
    damageReceived: 0,
    attemptedHits: 0,
    successfulHits: 0,
    successfulDefenses: 0,
    successfulEvasions: 0,
    successfulCounters: 0,
    passiveActionCount: 0,
    invalidActionCount: 0,
    advantageTurnCount: 0,
    inBattleConsumption: 0,
  };

  return success(snapshot);
}

/**
 * Attach sourceSnapshotHash after Phase 1 succeeded (S01-005 Phase 2).
 */
export function sealBattleParticipantWithSourceHash(
  preflight: PreflightBattleParticipantSnapshot,
  provider: Sha256Provider,
): ValidationResult<BattleParticipantSnapshot> {
  const sourceSnapshotHashResult = computeBattleParticipantSourceSnapshotHash(
    {
      personId: preflight.personId,
      lifeStatus: preflight.lifeStatus,
      participationStatus: preflight.participationStatus,
      careerStatus: preflight.careerStatus,
      birthYear: preflight.birthYear,
      ageAtBattle: preflight.ageAtBattle,
      stats: preflight.stats,
      aptitudes: preflight.aptitudes,
      techniques: preflight.techniques,
      fatigue: preflight.fatigue,
      injury: preflight.injury,
      condition: preflight.condition,
      confidence: preflight.confidence,
      battleDecisionProfile: preflight.battleDecisionProfile,
      injuryProneness: preflight.injuryProneness,
      sprint1StateSchemaVersion: preflight.sprint1StateSchemaVersion,
      currentMental: preflight.currentMental,
    },
    provider,
  );
  if (!sourceSnapshotHashResult.ok) {
    return failure(sourceSnapshotHashResult.issues);
  }

  const snapshot: BattleParticipantSnapshot = {
    ...preflight,
    sourceSnapshotHash: sourceSnapshotHashResult.value,
  };
  return success(deepFreezePlainJson(snapshot));
}

/**
 * Validates one battle side end-to-end and returns the frozen snapshot
 * (11 §4.3 / §5 / §6 / §7). Pure: no RNG, no mutation of `input`.
 */
export function validateBattleParticipant(
  input: unknown,
  context: BattleParticipantContext,
  provider: Sha256Provider,
): ValidationResult<BattleParticipantSnapshot> {
  const preflight = preflightBattleParticipant(input, context);
  if (!preflight.ok) {
    return failure(preflight.issues);
  }
  return sealBattleParticipantWithSourceHash(preflight.value, provider);
}

const PARTICIPANT_COUNTER_KEYS = [
  "damageDealt",
  "damageReceived",
  "attemptedHits",
  "successfulHits",
  "successfulDefenses",
  "successfulEvasions",
  "successfulCounters",
  "passiveActionCount",
  "invalidActionCount",
  "advantageTurnCount",
] as const;

const PARTICIPANT_FLAG_KEYS = [
  "guarding",
  "evading",
  "canAct",
  "surrendered",
  "unableToContinue",
] as const;

/**
 * Structural + invariant read of an already-built snapshot (11 §7 / §16). Used by
 * `validateBattleState`; the expected side is supplied by the caller so that a
 * swapped `participantA` / `participantB` pair is rejected.
 */
export function validateBattleParticipantSnapshot(
  input: unknown,
  expectedSide: BattleSide,
  provider: Sha256Provider,
): ValidationResult<BattleParticipantSnapshot> {
  const structure = preflightBattleParticipantSnapshotStructure(input, expectedSide);
  if (!structure.ok) {
    return failure(structure.issues);
  }
  return verifyBattleParticipantSnapshotHash(structure.value, provider);
}

/**
 * Structure / invariants only — `sourceSnapshotHash` format is accepted, never
 * recomputed (S01-005 Phase 1).
 */
export function preflightBattleParticipantSnapshotStructure(
  input: unknown,
  expectedSide: BattleSide,
): ValidationResult<BattleParticipantSnapshot> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleParticipantSnapshot must be a plain object",
              actual: input,
              expected: "BattleParticipantSnapshot",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_PARTICIPANT_SNAPSHOT_KEYS, "", issues);

  const side = requireEnumValue<BattleSide>(object, "side", "", BATTLE_SIDES, issues);
  if (side !== undefined && side !== expectedSide) {
    issues.push({
      path: "/side",
      message: "participant snapshot is stored on the wrong side of the battle state",
      actual: side,
      expected: expectedSide,
    });
  }

  const personIdText = requireNonEmptyTrimmedString(object, "personId", "", issues);
  const lifeStatus = requireEnumValue<LifeStatus>(object, "lifeStatus", "", ["living"], issues);
  const participationStatus = requireEnumValue<ParticipationStatus>(
    object,
    "participationStatus",
    "",
    ["active"],
    issues,
  );
  const careerStatus = requireEnumValue<CareerStatus>(
    object,
    "careerStatus",
    "",
    CAREER_STATUS_VALUES,
    issues,
  );
  const birthYear = requireSafeIntegerAtLeast(object, "birthYear", "", 1, issues);
  const ageAtBattle = requireIntegerInRange(object, "ageAtBattle", "", 0, 200, issues);
  const sourceSnapshotHash = requireNonEmptyTrimmedString(object, "sourceSnapshotHash", "", issues);
  if (sourceSnapshotHash !== undefined && !SHA256_HEX_PATTERN.test(sourceSnapshotHash)) {
    issues.push({
      path: "/sourceSnapshotHash",
      message: "sourceSnapshotHash must be a 64 lowercase hex character SHA-256 digest",
      actual: sourceSnapshotHash,
      expected: "64 lowercase hex chars",
    });
  }
  const sprint1StateSchemaVersion = requireLiteralString(
    object,
    "sprint1StateSchemaVersion",
    "",
    SPRINT1_PERSON_STATE_SCHEMA_VERSION,
    issues,
  );

  const stats = parseStatValueTripleMap(object["stats"], ABILITY_KEYS, "/stats", issues);
  const aptitudes = parseStatValueTripleMap(
    object["aptitudes"],
    APTITUDE_KEYS,
    "/aptitudes",
    issues,
  );
  const techniques = parseTechniqueStates(object["techniques"], issues);

  const fatigue = requireIntegerInRange(object, "fatigue", "", 0, 100, issues);
  const injury = requireIntegerInRange(object, "injury", "", 0, 100, issues);
  const condition = requireIntegerInRange(object, "condition", "", -20, 20, issues);
  const confidence = requireIntegerInRange(object, "confidence", "", -20, 20, issues);
  const injuryProneness = requireIntegerInRange(object, "injuryProneness", "", 0, 100, issues);
  const inBattleConsumption = requireIntegerInRange(
    object,
    "inBattleConsumption",
    "",
    0,
    100,
    issues,
  );

  let battleDecisionProfile: BattleDecisionProfile | undefined;
  const profileResult = validateBattleDecisionProfile(object["battleDecisionProfile"]);
  if (profileResult.ok) {
    battleDecisionProfile = profileResult.value;
  } else {
    issues.push(...prefixIssues(profileResult.issues, "/battleDecisionProfile"));
  }

  const baseMaxDurability = requireIntegerInRange(object, "baseMaxDurability", "", 1, 200, issues);
  const startDurabilityPercentBasisPoints = requireIntegerInRange(
    object,
    "startDurabilityPercentBasisPoints",
    "",
    0,
    START_DURABILITY_FULL_PERCENT_BASIS_POINTS,
    issues,
  );
  const maxDurability = requireIntegerInRange(object, "maxDurability", "", 1, 200, issues);
  const maxMental = requireIntegerInRange(object, "maxMental", "", 50, 150, issues);
  const currentDurability =
    maxDurability === undefined
      ? undefined
      : requireIntegerInRange(object, "currentDurability", "", 0, maxDurability, issues);
  const currentMental =
    maxMental === undefined
      ? undefined
      : requireIntegerInRange(object, "currentMental", "", 0, maxMental, issues);

  const nextHitModifier = requireInteger(object, "nextHitModifier", "", issues);
  const nextActivationModifier = requireInteger(object, "nextActivationModifier", "", issues);

  const flags = {} as Record<(typeof PARTICIPANT_FLAG_KEYS)[number], boolean>;
  let flagsOk = true;
  for (const key of PARTICIPANT_FLAG_KEYS) {
    const value = requireBoolean(object, key, "", issues);
    if (value === undefined) {
      flagsOk = false;
      continue;
    }
    flags[key] = value;
  }

  const counters = {} as Record<(typeof PARTICIPANT_COUNTER_KEYS)[number], number>;
  let countersOk = true;
  for (const key of PARTICIPANT_COUNTER_KEYS) {
    const value = requireIntegerInRange(object, key, "", 0, Number.MAX_SAFE_INTEGER, issues);
    if (value === undefined) {
      countersOk = false;
      continue;
    }
    counters[key] = value;
  }

  if (flagsOk && flags.unableToContinue && flags.canAct) {
    issues.push({
      path: "/canAct",
      message: "canAct must be false once unableToContinue is true",
      actual: true,
      expected: "false",
    });
  }

  if (
    side === undefined ||
    personIdText === undefined ||
    lifeStatus === undefined ||
    participationStatus === undefined ||
    careerStatus === undefined ||
    birthYear === undefined ||
    ageAtBattle === undefined ||
    sourceSnapshotHash === undefined ||
    sprint1StateSchemaVersion === undefined ||
    stats === undefined ||
    aptitudes === undefined ||
    techniques === undefined ||
    fatigue === undefined ||
    injury === undefined ||
    condition === undefined ||
    confidence === undefined ||
    injuryProneness === undefined ||
    inBattleConsumption === undefined ||
    battleDecisionProfile === undefined ||
    baseMaxDurability === undefined ||
    startDurabilityPercentBasisPoints === undefined ||
    maxDurability === undefined ||
    maxMental === undefined ||
    currentDurability === undefined ||
    currentMental === undefined ||
    nextHitModifier === undefined ||
    nextActivationModifier === undefined ||
    !flagsOk ||
    !countersOk ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (baseMaxDurability !== BASE_MAX_DURABILITY_OFFSET + stats.stamina.surfaceValue) {
    issues.push({
      path: "/baseMaxDurability",
      message: "baseMaxDurability must equal 100 + stats.stamina.surfaceValue",
      actual: baseMaxDurability,
      expected: String(BASE_MAX_DURABILITY_OFFSET + stats.stamina.surfaceValue),
    });
  }
  if (maxMental !== 50 + stats.spirit.surfaceValue) {
    issues.push({
      path: "/maxMental",
      message: "maxMental must equal 50 + stats.spirit.surfaceValue",
      actual: maxMental,
      expected: String(50 + stats.spirit.surfaceValue),
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      side,
      personId: asPersonId(personIdText),
      lifeStatus,
      participationStatus,
      careerStatus,
      birthYear,
      ageAtBattle,
      sourceSnapshotHash,
      sprint1StateSchemaVersion,
      stats,
      aptitudes,
      techniques,
      fatigue,
      injury,
      condition,
      confidence,
      injuryProneness,
      battleDecisionProfile,
      baseMaxDurability,
      startDurabilityPercentBasisPoints,
      maxDurability,
      currentDurability,
      maxMental,
      currentMental,
      guarding: flags.guarding,
      evading: flags.evading,
      canAct: flags.canAct,
      surrendered: flags.surrendered,
      unableToContinue: flags.unableToContinue,
      nextHitModifier,
      nextActivationModifier,
      damageDealt: counters.damageDealt,
      damageReceived: counters.damageReceived,
      attemptedHits: counters.attemptedHits,
      successfulHits: counters.successfulHits,
      successfulDefenses: counters.successfulDefenses,
      successfulEvasions: counters.successfulEvasions,
      successfulCounters: counters.successfulCounters,
      passiveActionCount: counters.passiveActionCount,
      invalidActionCount: counters.invalidActionCount,
      advantageTurnCount: counters.advantageTurnCount,
      inBattleConsumption,
    }),
  );
}

/** Recompute and verify `sourceSnapshotHash` after structure preflight succeeded. */
export function verifyBattleParticipantSnapshotHash(
  snapshot: BattleParticipantSnapshot,
  provider: Sha256Provider,
): ValidationResult<BattleParticipantSnapshot> {
  const recomputedHash = computeBattleParticipantSourceSnapshotHash(
    {
      personId: snapshot.personId,
      lifeStatus: snapshot.lifeStatus,
      participationStatus: snapshot.participationStatus,
      careerStatus: snapshot.careerStatus,
      birthYear: snapshot.birthYear,
      ageAtBattle: snapshot.ageAtBattle,
      stats: snapshot.stats,
      aptitudes: snapshot.aptitudes,
      techniques: snapshot.techniques,
      fatigue: snapshot.fatigue,
      injury: snapshot.injury,
      condition: snapshot.condition,
      confidence: snapshot.confidence,
      battleDecisionProfile: snapshot.battleDecisionProfile,
      injuryProneness: snapshot.injuryProneness,
      sprint1StateSchemaVersion: snapshot.sprint1StateSchemaVersion,
      currentMental: snapshot.currentMental,
    },
    provider,
  );
  if (!recomputedHash.ok) {
    return failure(recomputedHash.issues);
  }
  if (recomputedHash.value !== snapshot.sourceSnapshotHash) {
    return failure([
      {
        path: "/sourceSnapshotHash",
        message: "sourceSnapshotHash must equal SHA-256 of the canonical source hash input",
        actual: snapshot.sourceSnapshotHash,
        expected: recomputedHash.value,
      },
    ]);
  }
  return success(snapshot);
}

const PERSON_TECHNIQUE_STATE_KEYS = [
  "techniqueId",
  "learningProgressTenths",
  "masteryHundredths",
  "successfulUseCount",
  "attemptedUseCount",
  "lastPracticedAbsoluteWeek",
  "acquiredAbsoluteWeek",
] as const;

function parseTechniqueStates(
  value: unknown,
  issues: ValidationIssue[],
): PersonTechniqueState[] | undefined {
  const items = snapshotDenseArrayOrFail(value, "/techniques", issues);
  if (items === undefined) {
    return undefined;
  }
  const rebuilt: PersonTechniqueState[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const path = `/techniques/${String(index)}`;
    const entry = snapshotPlainObjectOrFail(items[index], path, issues);
    if (entry === undefined) {
      ok = false;
      continue;
    }
    assertNoAccessors(entry, path, issues);
    rejectUnknownKeys(entry, PERSON_TECHNIQUE_STATE_KEYS, path, issues);
    const techniqueIdText = requireNonEmptyTrimmedString(entry, "techniqueId", path, issues);
    const learningProgressTenths = requireIntegerInRange(
      entry,
      "learningProgressTenths",
      path,
      0,
      1000,
      issues,
    );
    const masteryHundredths = requireIntegerInRange(
      entry,
      "masteryHundredths",
      path,
      0,
      10000,
      issues,
    );
    const successfulUseCount = requireIntegerInRange(
      entry,
      "successfulUseCount",
      path,
      0,
      Number.MAX_SAFE_INTEGER,
      issues,
    );
    const attemptedUseCount = requireIntegerInRange(
      entry,
      "attemptedUseCount",
      path,
      0,
      Number.MAX_SAFE_INTEGER,
      issues,
    );
    const lastPracticedAbsoluteWeek = requireNullableIntegerAtLeast(
      entry,
      "lastPracticedAbsoluteWeek",
      path,
      0,
      issues,
    );
    const acquiredAbsoluteWeek = requireNullableIntegerAtLeast(
      entry,
      "acquiredAbsoluteWeek",
      path,
      0,
      issues,
    );
    if (
      techniqueIdText === undefined ||
      learningProgressTenths === undefined ||
      masteryHundredths === undefined ||
      successfulUseCount === undefined ||
      attemptedUseCount === undefined ||
      lastPracticedAbsoluteWeek === undefined ||
      acquiredAbsoluteWeek === undefined
    ) {
      ok = false;
      continue;
    }
    rebuilt.push({
      techniqueId: asTechniqueId(techniqueIdText),
      learningProgressTenths,
      masteryHundredths,
      successfulUseCount,
      attemptedUseCount,
      lastPracticedAbsoluteWeek,
      acquiredAbsoluteWeek,
    });
  }
  if (!ok) {
    return undefined;
  }
  for (let index = 1; index < rebuilt.length; index += 1) {
    const order = compareUnicodeCodePoints(
      rebuilt[index - 1]!.techniqueId,
      rebuilt[index]!.techniqueId,
    );
    if (order === 0) {
      issues.push({
        path: "/techniques",
        message: "techniques must not contain duplicate TechniqueIds",
        actual: rebuilt[index]!.techniqueId,
        expected: "unique TechniqueId values",
      });
      return undefined;
    }
    if (order > 0) {
      issues.push({
        path: "/techniques",
        message: "techniques must be sorted by TechniqueId ascending",
        actual: `${rebuilt[index - 1]!.techniqueId} before ${rebuilt[index]!.techniqueId}`,
        expected: "TechniqueId ascending",
      });
      return undefined;
    }
  }
  return rebuilt;
}
