/**
 * S02-007 committed rank promotion result with atomic rank-history append.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Rank } from "../enums.js";
import type { PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepClonePlainJson } from "../plain-json-snapshot.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type { WorldDate } from "../world-date.js";
import { RANK_PROMOTION_RESULT_SCHEMA_VERSION } from "./constants.js";
import {
  appendPersonRankHistoryEntry,
  buildPersonRankHistoryEntry,
  isExactlyOneRankStepUp,
  type PersonRankHistory,
} from "./person-rank-history.js";

export type RankPromotionResult = {
  schemaVersion: typeof RANK_PROMOTION_RESULT_SCHEMA_VERSION;
  personId: PersonId;
  previousRank: Rank;
  newRank: Rank;
  worldDate: WorldDate;
  sourceTournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourceFinalResultHash: string;
  promotionResultHash: string;
};

export type BuildRankPromotionResultInput = {
  personId: PersonId;
  previousRank: Rank;
  newRank: Rank;
  worldDate: WorldDate;
  sourceTournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourceFinalResultHash: string;
};

export type CommittedPromotionRegistry = {
  results: readonly RankPromotionResult[];
};

function buildPromotionResultHashMaterial(
  result: Omit<RankPromotionResult, "promotionResultHash">,
): Record<string, unknown> {
  return {
    schemaVersion: result.schemaVersion,
    personId: result.personId,
    previousRank: result.previousRank,
    newRank: result.newRank,
    worldDate: result.worldDate,
    sourceTournamentId: result.sourceTournamentId,
    sourceQualificationReferenceHash: result.sourceQualificationReferenceHash,
    sourceFinalResultHash: result.sourceFinalResultHash,
  };
}

export function computeRankPromotionResultHash(
  result: Omit<RankPromotionResult, "promotionResultHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildPromotionResultHashMaterial(result)),
    "/promotionResultHash",
  );
}

export function buildRankPromotionResult(
  input: BuildRankPromotionResultInput,
  provider: Sha256Provider,
): ValidationResult<RankPromotionResult> {
  if (!isExactlyOneRankStepUp(input.previousRank, input.newRank)) {
    return failure([
      {
        path: "/newRank",
        message: "promotion must advance exactly one rank step with no skip or demotion",
        actual: `${input.previousRank}->${input.newRank}`,
      },
    ]);
  }

  const withoutHash = {
    schemaVersion: RANK_PROMOTION_RESULT_SCHEMA_VERSION,
    personId: input.personId,
    previousRank: input.previousRank,
    newRank: input.newRank,
    worldDate: input.worldDate,
    sourceTournamentId: input.sourceTournamentId,
    sourceQualificationReferenceHash: input.sourceQualificationReferenceHash,
    sourceFinalResultHash: input.sourceFinalResultHash,
  } satisfies Omit<RankPromotionResult, "promotionResultHash">;

  const hash = computeRankPromotionResultHash(withoutHash, provider);
  if (!hash.ok) {
    return hash;
  }

  return success(
    deepFreezePlainJson({
      ...withoutHash,
      promotionResultHash: hash.value,
    }),
  );
}

export function findCommittedPromotionResult(
  registry: CommittedPromotionRegistry,
  promotionResultHash: string,
): RankPromotionResult | undefined {
  return registry.results.find((r) => r.promotionResultHash === promotionResultHash);
}

export type PromotionAtomicCommitGate = {
  beforeCommit?: () => ValidationResult<void>;
};

export type CommitPromotionWithRankHistoryInput = {
  promotionInput: BuildRankPromotionResultInput;
  rankHistory: PersonRankHistory;
  committedPromotions: CommittedPromotionRegistry;
  expectedCurrentRank: Rank;
  commitGate?: PromotionAtomicCommitGate;
};

export type CommitPromotionWithRankHistorySuccess = {
  kind: "committed";
  promotionResult: RankPromotionResult;
  rankHistory: PersonRankHistory;
  committedPromotions: CommittedPromotionRegistry;
};

export type CommitPromotionWithRankHistoryIdempotent = {
  kind: "idempotent_replay";
  promotionResult: RankPromotionResult;
  rankHistory: PersonRankHistory;
};

export type CommitPromotionWithRankHistoryFailure = {
  kind: "validation_failure" | "atomic_failure";
  issues: readonly ValidationIssue[];
};

export type CommitPromotionWithRankHistoryOutput =
  | CommitPromotionWithRankHistorySuccess
  | CommitPromotionWithRankHistoryIdempotent
  | CommitPromotionWithRankHistoryFailure;

type AtomicWorkingState = {
  committedPromotions: CommittedPromotionRegistry;
  rankHistory: PersonRankHistory;
};

function snapshotAtomicWorkingState(state: AtomicWorkingState): AtomicWorkingState {
  return {
    committedPromotions: deepClonePlainJson(
      state.committedPromotions,
    ) as CommittedPromotionRegistry,
    rankHistory: deepClonePlainJson(state.rankHistory) as PersonRankHistory,
  };
}

function canonicalAtomicSnapshot(state: AtomicWorkingState): string {
  return toCanonicalJson({
    committedPromotions: state.committedPromotions,
    rankHistory: state.rankHistory,
  });
}

export function commitPromotionWithRankHistory(
  input: CommitPromotionWithRankHistoryInput,
  provider: Sha256Provider,
): CommitPromotionWithRankHistoryOutput {
  const built = buildRankPromotionResult(input.promotionInput, provider);
  if (!built.ok) {
    return { kind: "validation_failure", issues: built.issues };
  }

  const existing = findCommittedPromotionResult(
    input.committedPromotions,
    built.value.promotionResultHash,
  );
  if (existing !== undefined) {
    const replayEntry = buildPersonRankHistoryEntry(
      {
        personId: input.promotionInput.personId,
        worldDate: existing.worldDate,
        previousRank: existing.previousRank,
        newRank: existing.newRank,
        sourceTournamentId: existing.sourceTournamentId,
        sourceQualificationReferenceHash: existing.sourceQualificationReferenceHash,
        sourcePromotionResultHash: existing.promotionResultHash,
      },
      provider,
    );
    if (!replayEntry.ok) {
      return { kind: "validation_failure", issues: replayEntry.issues };
    }
    const append = appendPersonRankHistoryEntry(
      input.rankHistory,
      replayEntry.value,
      input.expectedCurrentRank,
    );
    if (append.kind === "validation_failure") {
      return { kind: "validation_failure", issues: append.issues };
    }
    return {
      kind: "idempotent_replay",
      promotionResult: existing,
      rankHistory: append.history,
    };
  }

  const baseline: AtomicWorkingState = {
    committedPromotions: input.committedPromotions,
    rankHistory: input.rankHistory,
  };
  const baselineCanonical = canonicalAtomicSnapshot(baseline);
  const working = snapshotAtomicWorkingState(baseline);

  const historyEntry = buildPersonRankHistoryEntry(
    {
      personId: input.promotionInput.personId,
      worldDate: input.promotionInput.worldDate,
      previousRank: input.promotionInput.previousRank,
      newRank: input.promotionInput.newRank,
      sourceTournamentId: input.promotionInput.sourceTournamentId,
      sourceQualificationReferenceHash: input.promotionInput.sourceQualificationReferenceHash,
      sourcePromotionResultHash: built.value.promotionResultHash,
    },
    provider,
  );
  if (!historyEntry.ok) {
    return { kind: "validation_failure", issues: historyEntry.issues };
  }

  const append = appendPersonRankHistoryEntry(
    working.rankHistory,
    historyEntry.value,
    input.expectedCurrentRank,
  );
  if (append.kind === "validation_failure") {
    return { kind: "validation_failure", issues: append.issues };
  }
  if (append.kind === "duplicate") {
    return {
      kind: "idempotent_replay",
      promotionResult: built.value,
      rankHistory: append.history,
    };
  }
  working.rankHistory = append.history;

  if (input.commitGate?.beforeCommit !== undefined) {
    const gate = input.commitGate.beforeCommit();
    if (!gate.ok) {
      if (canonicalAtomicSnapshot(baseline) !== baselineCanonical) {
        return {
          kind: "atomic_failure",
          issues: [
            {
              path: "",
              message: "atomic commit invariant violated: baseline mutated on gate failure",
            },
          ],
        };
      }
      return { kind: "atomic_failure", issues: gate.issues };
    }
  }

  working.committedPromotions = deepFreezePlainJson({
    results: [...working.committedPromotions.results, built.value],
  });

  if (canonicalAtomicSnapshot(baseline) !== baselineCanonical) {
    return {
      kind: "atomic_failure",
      issues: [
        {
          path: "",
          message: "atomic commit invariant violated: caller-visible baseline mutated",
        },
      ],
    };
  }

  return {
    kind: "committed",
    promotionResult: built.value,
    rankHistory: working.rankHistory,
    committedPromotions: working.committedPromotions,
  };
}

export function snapshotPromotionAtomicBaseline(state: {
  committedPromotions: CommittedPromotionRegistry;
  rankHistory: PersonRankHistory;
}): string {
  return canonicalAtomicSnapshot({
    committedPromotions: state.committedPromotions,
    rankHistory: state.rankHistory,
  });
}
