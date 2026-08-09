/**
 * BattlePostProcessContext validation and hash (13 §7–§8 / S01-007).
 */
import { toCanonicalJson } from "../canonical-json.js";
import { asPersonId } from "../ids.js";
import type { PersonId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { computeCurrentAge } from "../age-status.js";
import type { WorldDate } from "../world-date.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireIntegerInRange,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import type {
  BattlePostProcessContext,
  BattlePostProcessParticipantContext,
} from "./battle-result-types.js";

export const BATTLE_POST_PROCESS_CONTEXT_KEYS = ["participantA", "participantB"] as const;
export const BATTLE_POST_PROCESS_PARTICIPANT_KEYS = [
  "personId",
  "matchesCompletedThisWorldWeekBeforeBattle",
] as const;

export type ConsecutiveMatchKey = "firstMatch" | "secondMatch" | "thirdOrLater";

export function consecutiveMatchKeyFromCount(matchesCompleted: number): ConsecutiveMatchKey {
  if (matchesCompleted === 0) return "firstMatch";
  if (matchesCompleted === 1) return "secondMatch";
  return "thirdOrLater";
}

function parseParticipant(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattlePostProcessParticipantContext | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) return undefined;
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, BATTLE_POST_PROCESS_PARTICIPANT_KEYS, path, issues);

  let personId: PersonId | undefined;
  if (!hasOwn(object, "personId") || typeof object["personId"] !== "string") {
    issues.push({
      path: `${path}/personId`,
      message: "personId must be a non-empty string PersonId",
      actual: object["personId"],
    });
  } else {
    personId = asPersonId(object["personId"]);
  }

  const matches = requireIntegerInRange(
    object,
    "matchesCompletedThisWorldWeekBeforeBattle",
    path,
    0,
    Number.MAX_SAFE_INTEGER,
    issues,
  );

  if (personId === undefined || matches === undefined) return undefined;
  return { personId, matchesCompletedThisWorldWeekBeforeBattle: matches };
}

export function validateBattlePostProcessContext(
  input: unknown,
  expected: {
    participantAId: PersonId;
    participantBId: PersonId;
    ageAtBattleA: number;
    ageAtBattleB: number;
    worldDate: WorldDate;
    birthYearA: number;
    birthYearB: number;
  },
): ValidationResult<BattlePostProcessContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0 ? issues : [{ path: "", message: "postProcessContext required" }],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_POST_PROCESS_CONTEXT_KEYS, "", issues);

  const participantA = parseParticipant(object["participantA"], "/participantA", issues);
  const participantB = parseParticipant(object["participantB"], "/participantB", issues);
  if (participantA === undefined || participantB === undefined) {
    return failure(issues);
  }

  if (participantA.personId !== expected.participantAId) {
    issues.push({
      path: "/participantA/personId",
      message: "participantA.personId must match BattleParticipantSnapshot.personId",
      actual: participantA.personId,
      expected: expected.participantAId,
    });
  }
  if (participantB.personId !== expected.participantBId) {
    issues.push({
      path: "/participantB/personId",
      message: "participantB.personId must match BattleParticipantSnapshot.personId",
      actual: participantB.personId,
      expected: expected.participantBId,
    });
  }

  const ageA = computeCurrentAge(expected.worldDate.year, expected.birthYearA);
  const ageB = computeCurrentAge(expected.worldDate.year, expected.birthYearB);
  if (ageA !== expected.ageAtBattleA) {
    issues.push({
      path: "/participantA",
      message: "ageAtBattle must equal computeCurrentAge(worldDate.year, birthYear)",
      actual: expected.ageAtBattleA,
      expected: String(ageA),
    });
  }
  if (ageB !== expected.ageAtBattleB) {
    issues.push({
      path: "/participantB",
      message: "ageAtBattle must equal computeCurrentAge(worldDate.year, birthYear)",
      actual: expected.ageAtBattleB,
      expected: String(ageB),
    });
  }

  if (issues.length > 0) return failure(issues);
  return success(
    deepFreezePlainJson({
      participantA,
      participantB,
    }),
  );
}

export function computePostProcessContextHash(
  context: BattlePostProcessContext,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(context), "/postProcessContextHash");
}
