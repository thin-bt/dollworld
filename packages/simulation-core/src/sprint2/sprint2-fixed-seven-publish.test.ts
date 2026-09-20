import { describe, expect, it } from "vitest";
import {
  asRunId,
  computeConfigHash,
  computeNameDataHash,
  createEmptyBattleDetailedLog,
  createSeededRng,
  generateInitialWorld,
  validateInitialWorldConfig,
} from "../index.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "../test-fixtures/name-data-loader.fixture.js";
import {
  buildFreshCheckpointRunContext,
  createSmallCheckpointTestConfig,
  expectOk,
} from "../test-fixtures/sprint2-checkpoint.fixture.js";
import { asMatchId, asPersonId, asSimulationId } from "../ids.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import { createEmptyAnnualEarningsLedger } from "./annual-earnings.js";
import { createEmptyAnnualRankingHistoryStore } from "./annual-ranking-history.js";
import { FIXED_SEVEN_OUTPUT_FILE_NAMES } from "./constants.js";
import {
  buildSprint2FixedSevenRunOutput,
  materializeFinalWorldBattleResults,
  rejectFixedSevenProjectionMutation,
  type Sprint2FixedSevenProjectionInput,
} from "./fixed-seven-projection.js";
import {
  listCompletedFixedSevenRuns,
  listStagingFixedSevenRuns,
  publishSprint2FixedSevenRun,
  Sprint2FixedSevenPublicationStore,
  validateFixedSevenStagingMembership,
} from "./fixed-seven-publish.js";
import {
  assertFixedSevenStreamingEqualsReference,
  reassembleFixedSevenFromStreaming,
  serializeFixedSevenStreaming,
  serializeFixedSevenToMemoryReference,
} from "./fixed-seven-serializer.js";
import { buildEvt002RoundTournamentCompleteSequence } from "./fixtures/sprint2-fixed-seven.fixture.js";
import { createEmptyPersonRankHistory } from "./person-rank-history.js";
import { createEmptySQualificationHistory } from "./s-qualification-history.js";
import {
  computeDetailedLogPayloadHash,
  createEmptyDetailedLogPayloadStore,
  putDetailedLogPayloadIfAbsent,
  type DetailedLogPayloadStore,
} from "./detailed-log-payload-store.js";
import { computeStoredRecordHash, type StoredBattleResultRecord } from "./stored-battle-result.js";
import { STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION } from "./constants.js";
import { beginCheckpointTransaction } from "./checkpoint-publish.js";

const provider = createNodeSha256Provider();

function worldDate(year: number) {
  return createWorldDate({ year, month: 1, weekOfMonth: 1 }, DEFAULT_WORLD_CALENDAR_CONFIG);
}

function buildTestRecord(
  overrides: Partial<Omit<StoredBattleResultRecord, "storedRecordHash">> = {},
): StoredBattleResultRecord {
  const base: Omit<StoredBattleResultRecord, "storedRecordHash"> = {
    schemaVersion: STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION,
    simulationId: asSimulationId("simulation_0000000000000001"),
    matchId: asMatchId("match_000000000001"),
    resultWorldDate: worldDate(2),
    participantAId: asPersonId("person_000000000001"),
    participantBId: asPersonId("person_000000000002"),
    winnerPersonId: asPersonId("person_000000000001"),
    loserPersonId: asPersonId("person_000000000002"),
    resultKind: "completed",
    competitionRuleHash: "a".repeat(64),
    detailedLogHash: "b".repeat(64),
    detailedLogRetentionStatus: "retained",
    battleResultHash: "c".repeat(64),
    ...overrides,
  };
  const hash = expectOk(computeStoredRecordHash(base, provider));
  return { ...base, storedRecordHash: hash };
}

function buildInitialWorldSnapshot() {
  const config = expectOk(validateInitialWorldConfig(createSmallCheckpointTestConfig()));
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  return generateInitialWorld({
    config,
    configHash: computeConfigHash(config, provider),
    seed: 91011,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, provider),
    rngFactory: createSeededRng,
    sha256Provider: provider,
  }).snapshot;
}

function buildProjectionInput(
  records: readonly StoredBattleResultRecord[],
  payloadStore: DetailedLogPayloadStore,
): Sprint2FixedSevenProjectionInput {
  const context = buildFreshCheckpointRunContext(91011, provider);
  return {
    runId: asRunId("run_s02_011_fixture"),
    context: {
      ...context,
      retainedRecords: records,
      payloadStore,
    },
    initialWorldSnapshot: buildInitialWorldSnapshot(),
    tournamentScheduleState: null,
    tournamentFinalResults: [],
    competitiveRecords: [],
    rankPromotionResults: { results: [] },
    personRankHistories: [createEmptyPersonRankHistory(asPersonId("person_000000000001"))],
    sQualificationHistory: createEmptySQualificationHistory(),
    events: buildEvt002RoundTournamentCompleteSequence(),
    earningsLedger: createEmptyAnnualEarningsLedger(),
    annualRankingHistoryStore: createEmptyAnnualRankingHistoryStore(),
    worldYear: 1,
  };
}

describe("S02-011 fixed-seven publish OUT-001..008", () => {
  it("OUT-001 successful completed run contains only the fixed seven", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    const put = expectOk(
      putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider),
    );
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const retained = buildTestRecord({ detailedLogHash, detailedLogRetentionStatus: "retained" });
    const input = buildProjectionInput([retained], put.store);
    const output = expectOk(buildSprint2FixedSevenRunOutput(input, provider));
    const store = new Sprint2FixedSevenPublicationStore();
    const published = publishSprint2FixedSevenRun(store, {
      runId: "run_out_001",
      context: input.context,
      output,
    });
    expect(published.kind).toBe("published");
    if (published.kind !== "published") {
      throw new Error("expected publish success");
    }
    expect(listCompletedFixedSevenRuns(store)).toEqual(["run_out_001"]);
    expect(Object.keys(published.output).sort()).toEqual([...FIXED_SEVEN_OUTPUT_FILE_NAMES].sort());
    expect(validateFixedSevenStagingMembership(published.output).ok).toBe(true);
  });

  it("OUT-002 writer fails after 6 files leaves final directory absent", () => {
    const input = buildProjectionInput([], createEmptyDetailedLogPayloadStore());
    const output = expectOk(buildSprint2FixedSevenRunOutput(input, provider));
    const store = new Sprint2FixedSevenPublicationStore();
    const published = publishSprint2FixedSevenRun(store, {
      runId: "run_out_002",
      context: input.context,
      output,
      afterStagingFileWrite: (_runId, filesWritten) => {
        if (filesWritten.length === 6) {
          throw new Error("injected writer failure after 6 files");
        }
      },
    });
    expect(published.kind).toBe("refused_integrity");
    expect(listCompletedFixedSevenRuns(store)).toEqual([]);
    expect(listStagingFixedSevenRuns(store)).toEqual([]);
  });

  it("OUT-003 extra staging entry rejects publish", () => {
    const membership = validateFixedSevenStagingMembership({
      ...(Object.fromEntries(FIXED_SEVEN_OUTPUT_FILE_NAMES.map((name) => [name, "{}"])) as Record<
        (typeof FIXED_SEVEN_OUTPUT_FILE_NAMES)[number],
        string
      >),
      "sidecar.json": "{}",
    });
    expect(membership.ok).toBe(false);
  });

  it("OUT-004 staging directory is not listed as completed run", () => {
    const store = new Sprint2FixedSevenPublicationStore();
    const input = buildProjectionInput([], createEmptyDetailedLogPayloadStore());
    const output = expectOk(buildSprint2FixedSevenRunOutput(input, provider));
    publishSprint2FixedSevenRun(store, {
      runId: "run_out_004",
      context: input.context,
      output,
      afterStagingFileWrite: () => {
        throw new Error("abort before completed publish");
      },
    });
    expect(listCompletedFixedSevenRuns(store)).toEqual([]);
    expect(listStagingFixedSevenRuns(store)).toEqual([]);
  });

  it("OUT-005 retained StoredBattleResult projects detailed body in final-world", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    const put = expectOk(
      putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider),
    );
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const retained = buildTestRecord({ detailedLogHash, detailedLogRetentionStatus: "retained" });
    const materialized = expectOk(
      materializeFinalWorldBattleResults([retained], put.store, provider),
    );
    expect(materialized[0]?.detailedLog).not.toBeNull();
    expect(materialized[0]?.storedRecord.storedRecordHash).toBe(retained.storedRecordHash);
  });

  it("OUT-006 pruned result projects null detailed body and preserves hashes", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    const store = expectOk(
      putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider),
    ).store;
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const pruned = buildTestRecord({ detailedLogHash, detailedLogRetentionStatus: "pruned" });
    const materialized = expectOk(materializeFinalWorldBattleResults([pruned], store, provider));
    expect(materialized[0]?.detailedLog).toBeNull();
    expect(materialized[0]?.storedRecord.detailedLogHash).toBe(detailedLogHash);
    expect(materialized[0]?.storedRecord.storedRecordHash).toBe(pruned.storedRecordHash);
    expect(JSON.stringify(materialized[0])).not.toContain("blob");
  });

  it("OUT-007 streaming bytes equal in-memory reference", () => {
    const input = buildProjectionInput([], createEmptyDetailedLogPayloadStore());
    const output = expectOk(buildSprint2FixedSevenRunOutput(input, provider));
    const reference = serializeFixedSevenToMemoryReference(output);
    const streamed = reassembleFixedSevenFromStreaming(serializeFixedSevenStreaming(reference));
    expect(() => assertFixedSevenStreamingEqualsReference(reference, streamed)).not.toThrow();
  });

  it("OUT-008 serializer/projection mutation attempt fails", () => {
    const retained = buildTestRecord({ detailedLogRetentionStatus: "retained" });
    const mutated: StoredBattleResultRecord = {
      ...retained,
      detailedLogRetentionStatus: "pruned",
    };
    const rejected = rejectFixedSevenProjectionMutation({
      beforeRecords: [retained],
      afterRecords: [mutated],
    });
    expect(rejected.ok).toBe(false);
  });

  it("refuses publish while checkpoint transaction is open", () => {
    const input = buildProjectionInput([], createEmptyDetailedLogPayloadStore());
    const output = expectOk(buildSprint2FixedSevenRunOutput(input, provider));
    const openTxn = expectOk(beginCheckpointTransaction(input.context));
    const store = new Sprint2FixedSevenPublicationStore();
    const published = publishSprint2FixedSevenRun(store, {
      runId: "run_txn_open",
      context: openTxn,
      output,
    });
    expect(published.kind).toBe("refused_transaction_open");
    expect(listCompletedFixedSevenRuns(store)).toEqual([]);
  });
});
