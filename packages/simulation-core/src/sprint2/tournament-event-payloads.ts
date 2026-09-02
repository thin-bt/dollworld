/**
 * S02-011 Sprint2 tournament/promotion EventEnvelope payload types and validation.
 */
import type { MatchId, PersonId, TournamentId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  childPath,
  hasOwn,
  rejectUnknownKeys,
  requireNonEmptyString,
  requireSafeIntegerAtLeast,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import {
  SPRINT2_TOURNAMENT_EVENT_TYPES,
  TOURNAMENT_FINISHED_COMPLETION_KINDS,
  type Sprint2TournamentEventType,
  type TournamentFinishedCompletionKind,
} from "./constants.js";

export const TOURNAMENT_MATCH_RECORDED_EVENT_TYPE = "tournament.match_recorded" as const;
export const TOURNAMENT_MATCH_BYE_EVENT_TYPE = "tournament.match_bye" as const;
export const TOURNAMENT_ROUND_COMPLETED_EVENT_TYPE = "tournament.round_completed" as const;
export const TOURNAMENT_FINISHED_EVENT_TYPE = "tournament.finished" as const;
export const PERSON_PROMOTION_QUALIFIED_EVENT_TYPE = "person.promotion_qualified" as const;
export const PERSON_RANK_PROMOTED_EVENT_TYPE = "person.rank_promoted" as const;
export const PERSON_S_RANK_QUALIFIED_EVENT_TYPE = "person.s_rank_qualified" as const;
export const PERSON_S_RANK_PROMOTED_EVENT_TYPE = "person.s_rank_promoted" as const;

const PAYLOAD_KEY_RULES: Record<
  Sprint2TournamentEventType,
  { required: readonly string[]; optional: readonly string[] }
> = {
  "tournament.match_recorded": {
    required: ["matchId", "tournamentId", "storedBattleResultRefHash"],
    optional: ["winnerPersonId", "loserPersonId"],
  },
  "tournament.match_bye": {
    required: ["matchId", "tournamentId", "advancedPersonId"],
    optional: [],
  },
  "tournament.round_completed": {
    required: ["tournamentId", "roundIndex"],
    optional: [],
  },
  "tournament.finished": {
    required: ["tournamentId", "completionKind", "resultHash"],
    optional: ["winnerPersonId"],
  },
  "person.promotion_qualified": {
    required: ["personId", "tournamentId", "sourceRank", "targetRank", "promotionResultHash"],
    optional: [],
  },
  "person.rank_promoted": {
    required: ["personId", "tournamentId", "previousRank", "newRank", "promotionResultHash"],
    optional: [],
  },
  "person.s_rank_qualified": {
    required: ["personId", "tournamentId", "sourceQualificationReferenceHash", "entryHash"],
    optional: [],
  },
  "person.s_rank_promoted": {
    required: ["personId", "tournamentId", "sourceQualificationReferenceHash", "promotionResultHash"],
    optional: [],
  },
};

export type TournamentMatchRecordedPayload = {
  matchId: MatchId;
  tournamentId: TournamentId;
  storedBattleResultRefHash: string;
  winnerPersonId?: PersonId;
  loserPersonId?: PersonId;
};

export type TournamentMatchByePayload = {
  matchId: MatchId;
  tournamentId: TournamentId;
  advancedPersonId: PersonId;
};

export type TournamentRoundCompletedPayload = {
  tournamentId: TournamentId;
  roundIndex: number;
};

export type TournamentFinishedPayload = {
  tournamentId: TournamentId;
  completionKind: TournamentFinishedCompletionKind;
  resultHash: string;
  winnerPersonId?: PersonId;
};

export function isSprint2TournamentEventType(value: string): value is Sprint2TournamentEventType {
  return (SPRINT2_TOURNAMENT_EVENT_TYPES as readonly string[]).includes(value);
}

export function validateSprint2TournamentEventPayload(
  eventType: Sprint2TournamentEventType,
  payload: unknown,
): ValidationResult<Readonly<Record<string, unknown>>> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(payload, "/payload", issues);
  if (object === undefined) {
    return failure(issues);
  }

  const rules = PAYLOAD_KEY_RULES[eventType];
  const allowedKeys = [...rules.required, ...rules.optional];
  rejectUnknownKeys(object, allowedKeys, "/payload", issues);

  for (const key of rules.required) {
    if (!hasOwn(object, key)) {
      issues.push({
        path: childPath("/payload", key),
        message: `payload.${key} is required for ${eventType}`,
        expected: key,
      });
    }
  }

  for (const key of rules.required) {
    if (key === "roundIndex") {
      requireSafeIntegerAtLeast(object, key, "/payload", 0, issues);
    } else {
      requireNonEmptyString(object, key, "/payload", issues);
    }
  }

  if (eventType === TOURNAMENT_FINISHED_EVENT_TYPE && hasOwn(object, "completionKind")) {
    const kind = object["completionKind"];
    if (
      typeof kind !== "string" ||
      !(TOURNAMENT_FINISHED_COMPLETION_KINDS as readonly string[]).includes(kind)
    ) {
      issues.push({
        path: "/payload/completionKind",
        message: "completionKind must be winner_determined or no_winner",
        actual: kind,
        expected: TOURNAMENT_FINISHED_COMPLETION_KINDS.join("|"),
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(object as Readonly<Record<string, unknown>>);
}
