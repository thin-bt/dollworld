import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { failure } from "../validation.js";
import { asPersonId, asSimulationId, asTournamentId } from "../ids.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import {
  applyTournamentFinalResultToCompetitiveRecord,
  createEmptyCompetitiveRecord,
} from "./competitive-record-update.js";
import {
  appendPersonRankHistoryEntry,
  buildPersonRankHistoryEntry,
  createEmptyPersonRankHistory,
  validatePersonRankHistoryContinuity,
} from "./person-rank-history.js";
import {
  buildRankPromotionResult,
  commitPromotionWithRankHistory,
  snapshotPromotionAtomicBaseline,
  type CommittedPromotionRegistry,
} from "./rank-promotion-result.js";
import {
  buildSQualificationHistoryEntry,
  commitSQualificationHistoryEntry,
  createEmptySQualificationHistory,
} from "./s-qualification-history.js";
import {
  buildTournamentFinalResult,
  validateTournamentFinalResult,
  validateTournamentFinalResultSource,
  type TournamentFinalPlacement,
} from "./tournament-final-result.js";

const provider = createNodeSha256Provider();

const simulationId = asSimulationId("sim_s02_007");
const tournamentId = asTournamentId("tournament_000000000001");
const personA = asPersonId("person_a");
const personB = asPersonId("person_b");
const personC = asPersonId("person_c");

const structuralHash = "structural_source_identity_hash_v1";
const completionHash = "completion_application_identity_hash_v1";
const qualificationRefHash = "qualification_reference_hash_v1";

const worldDate = createWorldDate(
  { year: 1, month: 6, weekOfMonth: 2 },
  DEFAULT_WORLD_CALENDAR_CONFIG,
);

function winnerDeterminedPlacements(): readonly TournamentFinalPlacement[] {
  return [
    {
      personId: personA,
      placementOrdinal: 1,
      awardTier: "champion",
      placementBandKind: "champion",
      placementBandOrdinal: 1,
    },
    {
      personId: personB,
      placementOrdinal: 2,
      awardTier: "runner_up",
      placementBandKind: "runner_up",
      placementBandOrdinal: 1,
    },
    {
      personId: personC,
      placementOrdinal: 3,
      awardTier: "top_four",
      placementBandKind: "semifinal",
      placementBandOrdinal: 1,
    },
  ];
}

function buildFinalResultInput(placements: readonly TournamentFinalPlacement[]) {
  return {
    simulationId,
    tournamentId,
    structuralSourceIdentityHash: structuralHash,
    completionApplicationIdentityHash: completionHash,
    completionKind: "winner_determined" as const,
    placements,
  };
}

describe("S02-007 tournament final result", () => {
  it("builds deterministic result identity with winner equal to placement #1", () => {
    const first = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    const second = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.value.resultHash).toBe(second.value.resultHash);
    expect(first.value.winnerPersonId).toBe(personA);
    expect(first.value.placements[0]!.personId).toBe(personA);
  });

  it("rejects duplicate participant placements", () => {
    const placements = winnerDeterminedPlacements().map((p, i) =>
      i === 2 ? { ...p, personId: personA, placementOrdinal: 3 } : p,
    );
    const result = buildTournamentFinalResult(buildFinalResultInput(placements), provider);
    expect(result.ok).toBe(false);
  });

  it("rejects missing canonical placement order", () => {
    const placements = winnerDeterminedPlacements().map((p, i) => ({
      ...p,
      placementOrdinal: i === 1 ? 3 : p.placementOrdinal,
    }));
    const result = buildTournamentFinalResult(buildFinalResultInput(placements), provider);
    expect(result.ok).toBe(false);
  });

  it("rejects stale tournament source identity", () => {
    const built = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    const stale = validateTournamentFinalResultSource(built.value, {
      tournamentId,
      structuralSourceIdentityHash: "stale_structural_hash",
      completionApplicationIdentityHash: completionHash,
    });
    expect(stale.ok).toBe(false);
  });

  it("validates stored result hash integrity", () => {
    const built = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    const tampered = { ...built.value, resultHash: "tampered_hash" };
    const validated = validateTournamentFinalResult(tampered, provider);
    expect(validated.ok).toBe(false);
  });
});

describe("S02-007 competitive record source facts", () => {
  it("applies tournament placement facts without annual ranking calculation", () => {
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    if (!finalResult.ok) {
      return;
    }

    const empty = createEmptyCompetitiveRecord(personA, "B", provider);
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      return;
    }
    const pointsBefore = empty.value.annualRankingPoints;

    const applied = applyTournamentFinalResultToCompetitiveRecord(
      {
        record: empty.value,
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
      },
      provider,
    );
    expect(applied.kind).toBe("applied");
    if (applied.kind !== "applied") {
      return;
    }
    expect(applied.record.tournamentTitles).toBe(1);
    expect(applied.record.tournamentEntries).toBe(1);
    expect(applied.record.annualRankingPoints).toBe(pointsBefore);
    expect(applied.record.appliedContributionKeys).toContain(`${tournamentId}:placement`);
  });

  it("rejects missing participant and skips duplicate contribution idempotently", () => {
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    if (!finalResult.ok) {
      return;
    }
    const missingPerson = asPersonId("person_missing");
    const empty = createEmptyCompetitiveRecord(missingPerson, "B", provider);
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      return;
    }
    const rejected = applyTournamentFinalResultToCompetitiveRecord(
      {
        record: empty.value,
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
      },
      provider,
    );
    expect(rejected.kind).toBe("validation_failure");

    const champion = createEmptyCompetitiveRecord(personA, "A", provider);
    expect(champion.ok).toBe(true);
    if (!champion.ok) {
      return;
    }
    const first = applyTournamentFinalResultToCompetitiveRecord(
      {
        record: champion.value,
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
      },
      provider,
    );
    expect(first.kind).toBe("applied");
    if (first.kind !== "applied") {
      return;
    }
    const second = applyTournamentFinalResultToCompetitiveRecord(
      {
        record: first.record,
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
      },
      provider,
    );
    expect(second.kind).toBe("idempotent_skip");
  });
});

describe("S02-007 promotion result and rank history atomicity", () => {
  const promotionInput = {
    personId: personA,
    previousRank: "B" as const,
    newRank: "A" as const,
    worldDate,
    sourceTournamentId: tournamentId,
    sourceQualificationReferenceHash: qualificationRefHash,
    sourceFinalResultHash: "final_result_hash_v1",
  };

  it("commits promotion and rank history atomically with deterministic identity", () => {
    const baseline = snapshotPromotionAtomicBaseline({
      committedPromotions: { results: [] },
      rankHistory: createEmptyPersonRankHistory(personA),
    });

    const first = commitPromotionWithRankHistory(
      {
        promotionInput,
        rankHistory: createEmptyPersonRankHistory(personA),
        committedPromotions: { results: [] },
        expectedCurrentRank: "B",
      },
      provider,
    );
    expect(first.kind).toBe("committed");
    if (first.kind !== "committed") {
      return;
    }
    expect(first.rankHistory.entries).toHaveLength(1);
    expect(first.committedPromotions.results).toHaveLength(1);
    expect(first.promotionResult.promotionResultHash).toBe(
      first.rankHistory.entries[0]!.sourcePromotionResultHash,
    );

    const second = commitPromotionWithRankHistory(
      {
        promotionInput,
        rankHistory: first.rankHistory,
        committedPromotions: first.committedPromotions,
        expectedCurrentRank: "B",
      },
      provider,
    );
    expect(second.kind).toBe("idempotent_replay");
    if (second.kind !== "idempotent_replay") {
      return;
    }
    expect(second.promotionResult.promotionResultHash).toBe(
      first.promotionResult.promotionResultHash,
    );

    expect(
      snapshotPromotionAtomicBaseline({
        committedPromotions: { results: [] },
        rankHistory: createEmptyPersonRankHistory(personA),
      }),
    ).toBe(baseline);
  });

  it("atomic gate failure leaves promotion registry and rank history unchanged", () => {
    const registry: CommittedPromotionRegistry = { results: [] };
    const history = createEmptyPersonRankHistory(personA);
    const baseline = snapshotPromotionAtomicBaseline({
      committedPromotions: registry,
      rankHistory: history,
    });

    const result = commitPromotionWithRankHistory(
      {
        promotionInput,
        rankHistory: history,
        committedPromotions: registry,
        expectedCurrentRank: "B",
        commitGate: {
          beforeCommit: () =>
            failure([
              {
                path: "",
                message: "simulated downstream commit failure",
              },
            ]),
        },
      },
      provider,
    );
    expect(result.kind).toBe("atomic_failure");
    expect(
      snapshotPromotionAtomicBaseline({ committedPromotions: registry, rankHistory: history }),
    ).toBe(baseline);
    expect(registry.results).toHaveLength(0);
    expect(history.entries).toHaveLength(0);
  });

  it("rejects rank skip and preserves append-only continuity", () => {
    const skip = buildRankPromotionResult(
      {
        ...promotionInput,
        previousRank: "B",
        newRank: "S",
      },
      provider,
    );
    expect(skip.ok).toBe(false);

    const entry = buildPersonRankHistoryEntry(
      {
        personId: personA,
        worldDate,
        previousRank: "B",
        newRank: "A",
        sourceTournamentId: tournamentId,
        sourceQualificationReferenceHash: qualificationRefHash,
        sourcePromotionResultHash: "promotion_hash_v1",
      },
      provider,
    );
    expect(entry.ok).toBe(true);
    if (!entry.ok) {
      return;
    }
    const history = createEmptyPersonRankHistory(personA);
    const appended = appendPersonRankHistoryEntry(history, entry.value, "B");
    expect(appended.kind).toBe("appended");
    if (appended.kind !== "appended") {
      return;
    }
    const breakContinuity = appendPersonRankHistoryEntry(
      appended.history,
      {
        ...entry.value,
        previousRank: "B",
        newRank: "A",
        entryIdentityHash: "different_identity",
        entryHash: "different_hash",
      },
      "B",
    );
    expect(breakContinuity.kind).toBe("validation_failure");

    const continuity = validatePersonRankHistoryContinuity(appended.history, "B");
    expect(continuity.ok).toBe(true);
    if (!continuity.ok) {
      return;
    }
    expect(continuity.value.entries[0]!.newRank).toBe("A");
  });
});

describe("S02-007 A→S qualification history", () => {
  it("commits immutable qualification history with idempotent retry", () => {
    const history = createEmptySQualificationHistory();
    const input = {
      personId: personA,
      worldDate,
      sourceTournamentId: tournamentId,
      sourceQualificationReferenceHash: qualificationRefHash,
      sourceFinalResultHash: "open_final_result_hash_v1",
    };
    const source = {
      tournamentId,
      sourceQualificationReferenceHash: qualificationRefHash,
      sourceFinalResultHash: "open_final_result_hash_v1",
    };

    const first = commitSQualificationHistoryEntry(history, input, source, provider);
    expect(first.kind).toBe("committed");
    if (first.kind !== "committed") {
      return;
    }
    expect(first.history.entries).toHaveLength(1);

    const built = buildSQualificationHistoryEntry(input, provider);
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    expect(first.entry.entryHash).toBe(built.value.entryHash);

    const second = commitSQualificationHistoryEntry(first.history, input, source, provider);
    expect(second.kind).toBe("idempotent_replay");
  });

  it("rejects stale qualification source proof", () => {
    const history = createEmptySQualificationHistory();
    const input = {
      personId: personA,
      worldDate,
      sourceTournamentId: tournamentId,
      sourceQualificationReferenceHash: qualificationRefHash,
      sourceFinalResultHash: "open_final_result_hash_v1",
    };
    const stale = commitSQualificationHistoryEntry(
      history,
      input,
      {
        tournamentId,
        sourceQualificationReferenceHash: "stale_qualification_ref",
        sourceFinalResultHash: "open_final_result_hash_v1",
      },
      provider,
    );
    expect(stale.kind).toBe("validation_failure");
  });
});

describe("S02-007 import boundary", () => {
  it("Sprint1 modules do not import new S02-007 result/promotion modules", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint1Dir = join(process.cwd(), "packages/simulation-core/src/sprint1");
    const forbidden = [
      "tournament-final-result",
      "competitive-record-update",
      "rank-promotion-result",
      "person-rank-history",
      "s-qualification-history",
    ];
    const files: string[] = [];
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          files.push(full);
        }
      }
    }
    await walk(sprint1Dir);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const token of forbidden) {
        expect(content.includes(token), `${file} must not reference ${token}`).toBe(false);
      }
    }
  });

  it("S02-006 battle atomic adapter does not import S02-007 result/promotion modules", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint2Dir = join(process.cwd(), "packages/simulation-core/src/sprint2");
    const forbidden = [
      "tournament-final-result",
      "competitive-record-update",
      "rank-promotion-result",
      "person-rank-history",
      "s-qualification-history",
    ];
    const targets = ["tournament-battle-atomic-adapter.ts", "stored-battle-result-ref.ts"];
    for (const file of targets) {
      const text = await readFile(join(sprint2Dir, file), "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${file} must not reference ${token}`).toBe(false);
      }
    }
  });
});

describe("S02-007 zero gameplay drift guard", () => {
  it("result/promotion modules do not allocate MatchId or reference battle RNG", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint2Dir = join(process.cwd(), "packages/simulation-core/src/sprint2");
    const targets = [
      "tournament-final-result.ts",
      "competitive-record-update.ts",
      "rank-promotion-result.ts",
      "person-rank-history.ts",
      "s-qualification-history.ts",
    ];
    const forbidden = ["Math.random", "allocateMatchId", "issueMatchId", "executeTournamentBattle"];
    for (const file of targets) {
      const text = await readFile(join(sprint2Dir, file), "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${file} must not reference ${token}`).toBe(false);
      }
    }
  });
});
