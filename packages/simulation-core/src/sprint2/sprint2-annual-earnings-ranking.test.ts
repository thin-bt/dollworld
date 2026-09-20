import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { asPersonId, asSimulationId, asTournamentId } from "../ids.js";
import {
  applyTournamentFinalResultToCompetitiveRecord,
  createEmptyCompetitiveRecord,
  type CompetitiveRecord,
} from "./competitive-record-update.js";
import {
  applyTournamentFinalResultEarnings,
  computeYearlyCumulativeEarnings,
  createEmptyAnnualEarningsLedger,
} from "./annual-earnings.js";
import { projectAnnualRanking, projectAnnualRankingForBrowser } from "./annual-ranking.js";
import {
  createEmptyAnnualRankingHistoryStore,
  finalizeClosedYearHistory,
  toAnnualRankingDisplayFacts,
  upsertAnnualRankingHistoryEntry,
} from "./annual-ranking-history.js";
import { buildPreviousWorldYearEarningsSnapshot } from "./previous-world-year-snapshot.js";
import {
  buildTournamentFinalResult,
  type TournamentFinalPlacement,
  type TournamentFinalResult,
} from "./tournament-final-result.js";
import {
  buildTournamentPayoutConfigForTest,
  createDefaultTournamentPayoutConfig,
  lookupTournamentPayoutAmount,
  validateTournamentPayoutConfig,
} from "./tournament-payout-config.js";

const provider = createNodeSha256Provider();

const simulationId = asSimulationId("sim_s02_008");
const tournamentId = asTournamentId("tournament_000000000001");
const tournamentId2 = asTournamentId("tournament_000000000002");
const personA = asPersonId("person_a");
const personB = asPersonId("person_b");
const personC = asPersonId("person_c");
const personD = asPersonId("person_d");
void personD;

const structuralHash = "structural_source_identity_hash_v1";
const completionHash = "completion_application_identity_hash_v1";

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

function buildFinalResultInput(
  placements: readonly TournamentFinalPlacement[],
  tournament = tournamentId,
) {
  return {
    simulationId,
    tournamentId: tournament,
    structuralSourceIdentityHash: structuralHash,
    completionApplicationIdentityHash: completionHash,
    completionKind: "winner_determined" as const,
    placements,
  };
}

function buildCompetitiveRecordMap(
  personIds: readonly ReturnType<typeof asPersonId>[],
  rank: "B" | "A" | "S" = "B",
): Map<ReturnType<typeof asPersonId>, CompetitiveRecord> {
  const map = new Map<ReturnType<typeof asPersonId>, CompetitiveRecord>();
  for (const personId of personIds) {
    const empty = createEmptyCompetitiveRecord(personId, rank, provider);
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      throw new Error("failed to create competitive record");
    }
    map.set(personId, empty.value);
  }
  return map;
}

function applyCompetitiveRecordsFromFinalResult(
  records: Map<ReturnType<typeof asPersonId>, CompetitiveRecord>,
  finalResult: TournamentFinalResult,
) {
  for (const personId of finalResult.placements.map((p) => p.personId)) {
    const record = records.get(personId)!;
    const applied = applyTournamentFinalResultToCompetitiveRecord(
      {
        record,
        finalResult,
        source: {
          tournamentId: finalResult.tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
      },
      provider,
    );
    expect(applied.kind).toBe("applied");
    if (applied.kind === "applied") {
      records.set(personId, applied.record);
    }
  }
}

describe("S02-008 tournament payout config", () => {
  it("provides externalized configurable payout defaults", () => {
    const config = createDefaultTournamentPayoutConfig(provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const champion = lookupTournamentPayoutAmount({
      config: config.value,
      tournamentKind: "normal",
      awardTier: "champion",
    });
    expect(champion.ok).toBe(true);
    if (!champion.ok) {
      return;
    }
    expect(champion.value).toBe(100_000);
    expect(validateTournamentPayoutConfig(config.value, provider).ok).toBe(true);
  });

  it("fails closed on missing payout row", () => {
    const config = createDefaultTournamentPayoutConfig(provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const broken = {
      ...config.value,
      payouts: {
        ...config.value.payouts,
        normal: undefined as unknown as (typeof config.value.payouts)["normal"],
      },
    };
    const lookup = lookupTournamentPayoutAmount({
      config: broken,
      tournamentKind: "normal",
      awardTier: "champion",
    });
    expect(lookup.ok).toBe(false);
  });
});

describe("S02-008 annual earnings accrual", () => {
  it("awards canonical configured amounts from committed S02-007 final result", () => {
    const payoutConfig = createDefaultTournamentPayoutConfig(provider);
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    expect(payoutConfig.ok).toBe(true);
    if (!finalResult.ok || !payoutConfig.ok) {
      return;
    }

    const applied = applyTournamentFinalResultEarnings(
      {
        ledger: createEmptyAnnualEarningsLedger(),
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "normal",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(applied.kind).toBe("applied");
    if (applied.kind !== "applied") {
      return;
    }
    expect(computeYearlyCumulativeEarnings(applied.ledger, 1, personA)).toBe(100_000);
    expect(computeYearlyCumulativeEarnings(applied.ledger, 1, personB)).toBe(50_000);
    expect(computeYearlyCumulativeEarnings(applied.ledger, 1, personC)).toBe(25_000);
  });

  it("does not duplicate earnings on retry/replay", () => {
    const payoutConfig = createDefaultTournamentPayoutConfig(provider);
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    expect(payoutConfig.ok).toBe(true);
    if (!finalResult.ok || !payoutConfig.ok) {
      return;
    }

    const input = {
      ledger: createEmptyAnnualEarningsLedger(),
      finalResult: finalResult.value,
      source: {
        tournamentId,
        structuralSourceIdentityHash: structuralHash,
        completionApplicationIdentityHash: completionHash,
      },
      worldYear: 1,
      tournamentKind: "normal" as const,
      payoutConfig: payoutConfig.value,
    };

    const first = applyTournamentFinalResultEarnings(input, provider);
    expect(first.kind).toBe("applied");
    if (first.kind !== "applied") {
      return;
    }
    const second = applyTournamentFinalResultEarnings({ ...input, ledger: first.ledger }, provider);
    expect(second.kind).toBe("idempotent_skip");
    if (second.kind !== "idempotent_skip") {
      return;
    }
    expect(second.ledger.applications.length).toBe(first.ledger.applications.length);
  });

  it("aggregates yearly cumulative earnings deterministically across tournaments", () => {
    const payoutConfig = createDefaultTournamentPayoutConfig(provider);
    expect(payoutConfig.ok).toBe(true);
    if (!payoutConfig.ok) {
      return;
    }

    const firstResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements(), tournamentId),
      provider,
    );
    const secondResult = buildTournamentFinalResult(
      buildFinalResultInput(
        [
          {
            personId: personA,
            placementOrdinal: 1,
            awardTier: "champion",
            placementBandKind: "champion",
            placementBandOrdinal: 1,
          },
        ],
        tournamentId2,
      ),
      provider,
    );
    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    if (!firstResult.ok || !secondResult.ok) {
      return;
    }

    let ledger = createEmptyAnnualEarningsLedger();
    const apply1 = applyTournamentFinalResultEarnings(
      {
        ledger,
        finalResult: firstResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "normal",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(apply1.kind).toBe("applied");
    if (apply1.kind !== "applied") {
      return;
    }
    ledger = apply1.ledger;

    const apply2 = applyTournamentFinalResultEarnings(
      {
        ledger,
        finalResult: secondResult.value,
        source: {
          tournamentId: tournamentId2,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "open",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(apply2.kind).toBe("applied");
    if (apply2.kind !== "applied") {
      return;
    }

    expect(computeYearlyCumulativeEarnings(apply2.ledger, 1, personA)).toBe(100_000 + 150_000);
  });
});

describe("S02-008 annual ranking projection", () => {
  it("ranks higher earnings ahead of lower earnings", () => {
    const payoutConfig = createDefaultTournamentPayoutConfig(provider);
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    expect(payoutConfig.ok).toBe(true);
    if (!finalResult.ok || !payoutConfig.ok) {
      return;
    }

    const earnings = applyTournamentFinalResultEarnings(
      {
        ledger: createEmptyAnnualEarningsLedger(),
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "normal",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(earnings.kind).toBe("applied");
    if (earnings.kind !== "applied") {
      return;
    }

    const records = buildCompetitiveRecordMap([personA, personB, personC]);
    applyCompetitiveRecordsFromFinalResult(records, finalResult.value);

    const ranking = projectAnnualRanking({
      worldYear: 1,
      ledger: earnings.ledger,
      competitiveRecords: records,
    });
    expect(ranking.ok).toBe(true);
    if (!ranking.ok) {
      return;
    }
    expect(ranking.value.map((row) => row.personId)).toEqual([personA, personB, personC]);
    expect(ranking.value.map((row) => row.annualRank)).toEqual([1, 2, 3]);
  });

  it("shares annual rank for exact equal earnings and uses person identity only inside tie group", () => {
    const payoutConfig = buildTournamentPayoutConfigForTest(
      {
        normal: {
          champion: 50_000,
          runner_up: 50_000,
          top_four: 10_000,
          completed: 10_000,
        },
      },
      provider,
    );
    expect(payoutConfig.ok).toBe(true);
    if (!payoutConfig.ok) {
      return;
    }

    const placements: readonly TournamentFinalPlacement[] = [
      {
        personId: personB,
        placementOrdinal: 1,
        awardTier: "champion",
        placementBandKind: "champion",
        placementBandOrdinal: 1,
      },
      {
        personId: personA,
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
    const finalResult = buildTournamentFinalResult(buildFinalResultInput(placements), provider);
    expect(finalResult.ok).toBe(true);
    if (!finalResult.ok) {
      return;
    }

    const earnings = applyTournamentFinalResultEarnings(
      {
        ledger: createEmptyAnnualEarningsLedger(),
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "normal",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(earnings.kind).toBe("applied");
    if (earnings.kind !== "applied") {
      return;
    }

    const records = buildCompetitiveRecordMap([personA, personB, personC]);
    applyCompetitiveRecordsFromFinalResult(records, finalResult.value);

    const ranking = projectAnnualRanking({
      worldYear: 1,
      ledger: earnings.ledger,
      competitiveRecords: records,
    });
    expect(ranking.ok).toBe(true);
    if (!ranking.ok) {
      return;
    }

    const tied = ranking.value.filter((row) => row.yearlyCumulativeEarnings === 50_000);
    expect(tied.map((row) => row.annualRank)).toEqual([1, 1]);
    expect(tied.map((row) => row.personId)).toEqual([personA, personB]);
    expect(ranking.value.find((row) => row.personId === personC)?.annualRank).toBe(3);
  });

  it("does not apply rank-based secondary tie-break to equal earnings", () => {
    const payoutConfig = buildTournamentPayoutConfigForTest(
      {
        normal: {
          champion: 40_000,
          runner_up: 40_000,
          top_four: 5_000,
          completed: 5_000,
        },
      },
      provider,
    );
    expect(payoutConfig.ok).toBe(true);
    if (!payoutConfig.ok) {
      return;
    }

    const records = buildCompetitiveRecordMap([personA, personB], "S");
    records.set(personA, { ...records.get(personA)!, currentRank: "S" });
    records.set(personB, { ...records.get(personB)!, currentRank: "F" });

    let ledger = createEmptyAnnualEarningsLedger();
    for (const [personId, tournament] of [
      [personA, tournamentId],
      [personB, tournamentId2],
    ] as const) {
      const finalResult = buildTournamentFinalResult(
        buildFinalResultInput(
          [
            {
              personId,
              placementOrdinal: 1,
              awardTier: "champion",
              placementBandKind: "champion",
              placementBandOrdinal: 1,
            },
          ],
          tournament,
        ),
        provider,
      );
      expect(finalResult.ok).toBe(true);
      if (!finalResult.ok) {
        return;
      }
      const applied = applyTournamentFinalResultEarnings(
        {
          ledger,
          finalResult: finalResult.value,
          source: {
            tournamentId: tournament,
            structuralSourceIdentityHash: structuralHash,
            completionApplicationIdentityHash: completionHash,
          },
          worldYear: 1,
          tournamentKind: "normal",
          payoutConfig: payoutConfig.value,
        },
        provider,
      );
      expect(applied.kind).toBe("applied");
      if (applied.kind !== "applied") {
        return;
      }
      ledger = applied.ledger;
    }

    const ranking = projectAnnualRanking({
      worldYear: 1,
      ledger,
      competitiveRecords: records,
    });
    expect(ranking.ok).toBe(true);
    if (!ranking.ok) {
      return;
    }
    expect(ranking.value.every((row) => row.annualRank === 1)).toBe(true);
    expect(ranking.value.map((row) => row.personId)).toEqual([personA, personB]);
  });

  it("returns valid empty history for zero eligible persons", () => {
    const ranking = projectAnnualRanking({
      worldYear: 1,
      ledger: createEmptyAnnualEarningsLedger(),
      competitiveRecords: new Map(),
    });
    expect(ranking.ok).toBe(true);
    if (!ranking.ok) {
      return;
    }
    expect(ranking.value).toEqual([]);
  });
});

describe("S02-008 annual ranking history", () => {
  it("persists year-selectable closed history with display facts", () => {
    const payoutConfig = createDefaultTournamentPayoutConfig(provider);
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput(winnerDeterminedPlacements()),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    expect(payoutConfig.ok).toBe(true);
    if (!finalResult.ok || !payoutConfig.ok) {
      return;
    }

    const earnings = applyTournamentFinalResultEarnings(
      {
        ledger: createEmptyAnnualEarningsLedger(),
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "normal",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(earnings.kind).toBe("applied");
    if (earnings.kind !== "applied") {
      return;
    }

    const records = buildCompetitiveRecordMap([personA, personB, personC]);
    applyCompetitiveRecordsFromFinalResult(records, finalResult.value);

    let store = createEmptyAnnualRankingHistoryStore();
    const committed = upsertAnnualRankingHistoryEntry(
      store,
      {
        worldYear: 1,
        ledger: earnings.ledger,
        competitiveRecords: records,
      },
      provider,
    );
    expect(committed.kind).toBe("committed");
    if (committed.kind !== "committed") {
      return;
    }
    store = committed.store;

    const finalized = finalizeClosedYearHistory(store, 1, provider);
    expect(finalized.kind).toBe("finalized");
    if (finalized.kind !== "finalized") {
      return;
    }

    const display = toAnnualRankingDisplayFacts(finalized.entry);
    expect(projectAnnualRankingForBrowser(display)).toEqual(display);
    expect(display[0]).toMatchObject({
      worldYear: 1,
      personId: personA,
      annualRank: 1,
      yearlyCumulativeEarnings: 100_000,
      tournamentAppearances: 1,
      tournamentWins: 1,
    });

    const snapshot = buildPreviousWorldYearEarningsSnapshot(1, finalized.entry, provider);
    expect(snapshot.ok).toBe(true);
  });

  it("keeps closed-year history immutable under later current-year changes", () => {
    const payoutConfig = createDefaultTournamentPayoutConfig(provider);
    expect(payoutConfig.ok).toBe(true);
    if (!payoutConfig.ok) {
      return;
    }

    const records = buildCompetitiveRecordMap([personA]);
    let ledger = createEmptyAnnualEarningsLedger();
    const finalResult = buildTournamentFinalResult(
      buildFinalResultInput([
        {
          personId: personA,
          placementOrdinal: 1,
          awardTier: "champion",
          placementBandKind: "champion",
          placementBandOrdinal: 1,
        },
      ]),
      provider,
    );
    expect(finalResult.ok).toBe(true);
    if (!finalResult.ok) {
      return;
    }

    const earnings = applyTournamentFinalResultEarnings(
      {
        ledger,
        finalResult: finalResult.value,
        source: {
          tournamentId,
          structuralSourceIdentityHash: structuralHash,
          completionApplicationIdentityHash: completionHash,
        },
        worldYear: 1,
        tournamentKind: "normal",
        payoutConfig: payoutConfig.value,
      },
      provider,
    );
    expect(earnings.kind).toBe("applied");
    if (earnings.kind !== "applied") {
      return;
    }
    ledger = earnings.ledger;
    applyCompetitiveRecordsFromFinalResult(records, finalResult.value);

    let store = createEmptyAnnualRankingHistoryStore();
    const year1 = upsertAnnualRankingHistoryEntry(
      store,
      { worldYear: 1, ledger, competitiveRecords: records },
      provider,
    );
    expect(year1.kind).toBe("committed");
    if (year1.kind !== "committed") {
      return;
    }
    store = year1.store;
    const closed = finalizeClosedYearHistory(store, 1, provider);
    expect(closed.kind).toBe("finalized");
    if (closed.kind !== "finalized") {
      return;
    }
    store = closed.store;
    const closedHash = closed.entry.historyHash;

    records.set(personA, {
      ...records.get(personA)!,
      currentRank: "A",
      tournamentEntries: 99,
    });
    const blocked = upsertAnnualRankingHistoryEntry(
      store,
      { worldYear: 1, ledger, competitiveRecords: records },
      provider,
    );
    expect(blocked.kind).toBe("validation_failure");

    const year2 = upsertAnnualRankingHistoryEntry(
      store,
      { worldYear: 2, ledger: createEmptyAnnualEarningsLedger(), competitiveRecords: records },
      provider,
    );
    expect(year2.kind).toBe("committed");
    if (year2.kind !== "committed") {
      return;
    }
    expect(findClosedYear(store, 1)?.historyHash).toBe(closedHash);
  });
});

function findClosedYear(
  store: ReturnType<typeof createEmptyAnnualRankingHistoryStore>,
  worldYear: number,
) {
  return store.entries.find((entry) => entry.worldYear === worldYear && entry.isFinalized);
}

describe("S02-008 import boundary", () => {
  it("Sprint1 modules do not import new S02-008 annual earnings/ranking modules", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint1Dir = join(process.cwd(), "packages/simulation-core/src/sprint1");
    const forbidden = [
      "tournament-payout-config",
      "annual-earnings",
      "annual-ranking",
      "annual-ranking-history",
      "previous-world-year-snapshot",
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

  it("S02-007 modules do not import S02-008 annual earnings/ranking modules", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint2Dir = join(process.cwd(), "packages/simulation-core/src/sprint2");
    const forbidden = [
      "tournament-payout-config",
      "annual-earnings",
      "annual-ranking",
      "annual-ranking-history",
      "previous-world-year-snapshot",
    ];
    const targets = [
      "tournament-final-result.ts",
      "competitive-record-update.ts",
      "rank-promotion-result.ts",
      "person-rank-history.ts",
      "s-qualification-history.ts",
    ];
    for (const file of targets) {
      const text = await readFile(join(sprint2Dir, file), "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${file} must not reference ${token}`).toBe(false);
      }
    }
  });
});

describe("S02-008 zero gameplay drift guard", () => {
  it("annual earnings/ranking modules do not allocate MatchId or reference battle RNG", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint2Dir = join(process.cwd(), "packages/simulation-core/src/sprint2");
    const targets = [
      "tournament-payout-config.ts",
      "annual-earnings.ts",
      "annual-ranking.ts",
      "annual-ranking-history.ts",
      "previous-world-year-snapshot.ts",
    ];
    const forbidden = [
      "Math.random",
      "allocateMatchId",
      "issueMatchId",
      "executeTournamentBattle",
      "annualRankingPoints",
      "officialMatchWinPoints",
      "placementBonus",
      "limitedPlacementFactorBasisPoints",
    ];
    for (const file of targets) {
      const text = await readFile(join(sprint2Dir, file), "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${file} must not reference ${token}`).toBe(false);
      }
    }
  });
});
