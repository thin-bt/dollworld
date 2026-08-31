import { describe, expect, it } from "vitest";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG, toCanonicalJson } from "../index.js";
import { createEmptyBattleDetailedLog } from "../sprint1/battle-state.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { asMatchId, asPersonId, asSimulationId } from "../ids.js";
import {
  computeDetailedLogPayloadHash,
  createEmptyDetailedLogPayloadStore,
  getDetailedLogPayloadBytes,
  putDetailedLogPayloadIfAbsent,
} from "./detailed-log-payload-store.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import { validateNormalizedSprint2Config } from "./validate-sprint2-config.js";
import {
  applyRetentionPrunePlan,
  classifyRetentionPolicy,
  resolveDetailedLogRetentionYears,
  shouldPruneDetailedLogRecord,
} from "./battle-log-retention.js";
import {
  buildImportantBattleMarker,
  computeStoredRecordHash,
  publishStoredBattleResult,
  rejectRetroactiveImportantBattleMarker,
  validateStoredBattleResultRecord,
  type StoredBattleResultRecord,
} from "./stored-battle-result.js";
import {
  materializeStoredBattleResultView,
  rejectPrunedDetailedLogProjection,
  verifyRetainedDetailedLogPayloadIdentity,
} from "./stored-battle-result-materialization.js";
import {
  executeDetailedLogPayloadGc,
  logicalPruneSurvivesGcFailure,
  planDetailedLogPayloadGc,
  retainedOwnerCountForPayload,
} from "./stored-battle-result-gc.js";
import { STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION } from "./constants.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: boolean; value?: T; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value as T;
}

function worldDate(year: number) {
  return createWorldDate({ year, month: 1, weekOfMonth: 1 }, DEFAULT_WORLD_CALENDAR_CONFIG);
}

function buildTestRecord(
  overrides: Partial<Omit<StoredBattleResultRecord, "storedRecordHash">> & {
    storedRecordHash?: string;
  } = {},
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
  if (overrides.storedRecordHash !== undefined) {
    return { ...base, storedRecordHash: overrides.storedRecordHash };
  }
  const hash = expectOk(computeStoredRecordHash(base, provider));
  return { ...base, storedRecordHash: hash };
}

describe("S02-009 detailed log payload store", () => {
  it("LOG-002 identical detailedLog yields identical payload hash and idempotent put", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    const hashA = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const hashB = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    expect(hashA).toBe(hashB);

    let store = createEmptyDetailedLogPayloadStore();
    const first = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider));
    expect(first.outcome.kind).toBe("inserted");
    store = first.store;

    const second = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider));
    expect(second.outcome.kind).toBe("already_present");
    expect(second.store.entries.size).toBe(1);
  });

  it("LOG-003 same hash with different bytes fails integrity closed", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    const put = expectOk(
      putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider),
    );
    const hash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const tamperedStore = {
      ...put.store,
      entries: new Map([
        [
          hash,
          {
            detailedLogHash: hash,
            canonicalUtf8Bytes: '{"turnOrderLogs":[],"actionLogs":[{"unexpected":true}]}',
          },
        ],
      ]),
    };
    const retry = expectOk(putDetailedLogPayloadIfAbsent(tamperedStore, detailedLog, provider));
    expect(retry.outcome.kind).toBe("integrity_failure");
  });
});

describe("S02-009 retention planning", () => {
  const config = expectOk(validateNormalizedSprint2Config(createDefaultSprint2ConfigInput()));

  it("LOG-004 normal retention=4 keeps resultYear=2 when currentYear=6", () => {
    const record = buildTestRecord({ resultWorldDate: worldDate(2) });
    expect(
      expectOk(shouldPruneDetailedLogRecord(record, 6, config, "official")),
    ).toBe(false);
  });

  it("LOG-005 normal retention=4 prunes resultYear=1 when currentYear=6", () => {
    const record = buildTestRecord({ resultWorldDate: worldDate(1) });
    expect(
      expectOk(shouldPruneDetailedLogRecord(record, 6, config, "official")),
    ).toBe(true);
  });

  it("LOG-006 important retention uses 100y boundary", () => {
    const marker = expectOk(
      buildImportantBattleMarker(
        ["tournament_final"],
        { tournament_final: "d".repeat(64) },
        provider,
      ),
    );
    const record = buildTestRecord({
      resultWorldDate: worldDate(10),
      importantBattleMarker: marker,
    });
    expect(
      expectOk(shouldPruneDetailedLogRecord(record, 109, config, "official")),
    ).toBe(false);
    expect(
      expectOk(shouldPruneDetailedLogRecord(record, 111, config, "official")),
    ).toBe(true);
  });

  it("LOG-007 mock battles remain retention exempt", () => {
    const record = buildTestRecord({ resultWorldDate: worldDate(1) });
    expect(
      expectOk(shouldPruneDetailedLogRecord(record, 999, config, "mock")),
    ).toBe(false);
    expect(expectOk(classifyRetentionPolicy("mock", undefined))).toBe("mock_exempt");
  });

  it("normal retention respects configurable 1..10 boundaries", () => {
    const custom = expectOk(
      validateNormalizedSprint2Config({
        ...createDefaultSprint2ConfigInput(),
        configVersion: "sprint2-retention-test-1",
        battleLogRetention: {
          normalDetailedLogWorldYears: 1,
          importantDetailedLogWorldYears: 100,
        },
      }),
    );
    const record = buildTestRecord({ resultWorldDate: worldDate(4) });
    expect(
      expectOk(shouldPruneDetailedLogRecord(record, 6, custom, "official")),
    ).toBe(true);
    expect(expectOk(resolveDetailedLogRetentionYears(custom, "normal"))).toBe(1);
  });
});

describe("S02-009 stored record prune and GC", () => {
  const config = expectOk(validateNormalizedSprint2Config(createDefaultSprint2ConfigInput()));

  it("LOG-010 prune changes storedRecordHash but not battleResultHash", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    let store = createEmptyDetailedLogPayloadStore();
    store = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider)).store;
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));

    const retained = buildTestRecord({ detailedLogHash, resultWorldDate: worldDate(1) });
    const prunedRecords = expectOk(
      applyRetentionPrunePlan(
        [retained],
        6,
        config,
        { [retained.matchId]: "official" },
        provider,
      ),
    );
    const pruned = prunedRecords[0]!;
    expect(pruned.detailedLogRetentionStatus).toBe("pruned");
    expect(pruned.battleResultHash).toBe(retained.battleResultHash);
    expect(pruned.storedRecordHash).not.toBe(retained.storedRecordHash);
  });

  it("LOG-011 shared payload survives single-owner prune", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    let store = createEmptyDetailedLogPayloadStore();
    store = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider)).store;
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const recordA = buildTestRecord({
      matchId: asMatchId("match_000000000001"),
      detailedLogHash,
      resultWorldDate: worldDate(1),
    });
    const recordB = buildTestRecord({
      matchId: asMatchId("match_000000000002"),
      detailedLogHash,
      resultWorldDate: worldDate(2),
    });
    const prunedA = expectOk(
      applyRetentionPrunePlan(
        [recordA, recordB],
        6,
        config,
        {
          [recordA.matchId]: "official",
          [recordB.matchId]: "official",
        },
        provider,
      ),
    );
    expect(getDetailedLogPayloadBytes(store, detailedLogHash)).toBeDefined();
    expect(retainedOwnerCountForPayload(detailedLogHash, prunedA)).toBe(1);
    expect(planDetailedLogPayloadGc(prunedA, store).eligibleHashes).not.toContain(
      detailedLogHash,
    );
  });

  it("LOG-012 last retained owner prune makes payload GC eligible", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    let store = createEmptyDetailedLogPayloadStore();
    store = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider)).store;
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const record = buildTestRecord({ detailedLogHash, resultWorldDate: worldDate(1) });
    const pruned = expectOk(
      applyRetentionPrunePlan(
        [record],
        6,
        config,
        { [record.matchId]: "official" },
        provider,
      ),
    );
    const plan = planDetailedLogPayloadGc(pruned, store);
    expect(plan.eligibleHashes).toContain(detailedLogHash);
    const gc = executeDetailedLogPayloadGc(plan, store);
    expect(gc.kind).toBe("success");
    if (gc.kind === "success") {
      expect(getDetailedLogPayloadBytes(gc.store, detailedLogHash)).toBeUndefined();
    }
  });

  it("LOG-013 GC failure leaves logical prune intact", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    let store = createEmptyDetailedLogPayloadStore();
    store = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider)).store;
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const record = buildTestRecord({ detailedLogHash, resultWorldDate: worldDate(1) });
    const pruned = expectOk(
      applyRetentionPrunePlan(
        [record],
        6,
        config,
        { [record.matchId]: "official" },
        provider,
      ),
    );
    const prunedBeforeGc = pruned[0]!;
    const plan = planDetailedLogPayloadGc(pruned, store);
    const gc = executeDetailedLogPayloadGc(plan, store, {
      deletePayload: () => ({ ok: false, error: "injected gc failure" }),
    });
    expect(gc.kind).toBe("failure");
    expect(logicalPruneSurvivesGcFailure(pruned, pruned)).toBe(true);
    expect(prunedBeforeGc.storedRecordHash).toBe(pruned[0]!.storedRecordHash);
    expect(getDetailedLogPayloadBytes(store, detailedLogHash)).toBeDefined();
  });
});

describe("S02-009 materialization and integrity", () => {
  it("LOG-014 pruned record materializes null even if payload bytes remain", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    let store = createEmptyDetailedLogPayloadStore();
    store = expectOk(putDetailedLogPayloadIfAbsent(store, detailedLog, provider)).store;
    const detailedLogHash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const pruned = buildTestRecord({
      detailedLogHash,
      detailedLogRetentionStatus: "pruned",
    });
    const view = expectOk(materializeStoredBattleResultView(pruned, store, provider));
    expect(view.detailedLog).toBeNull();
    expect(getDetailedLogPayloadBytes(store, detailedLogHash)).toBeDefined();
    expect(expectOk(rejectPrunedDetailedLogProjection(view)).detailedLog).toBeNull();
  });

  it("LOG-017 retained missing payload fails closed", () => {
    const record = buildTestRecord({ detailedLogRetentionStatus: "retained" });
    const view = materializeStoredBattleResultView(record, createEmptyDetailedLogPayloadStore(), provider);
    expect(view.ok).toBe(false);
  });

  it("LOG-018 pruned projection with body is rejected", () => {
    const record = buildTestRecord({ detailedLogRetentionStatus: "pruned" });
    const rejected = rejectPrunedDetailedLogProjection({
      schemaVersion: "0.1.0",
      storedRecord: record,
      detailedLog: createEmptyBattleDetailedLog(),
    });
    expect(rejected.ok).toBe(false);
  });

  it("retained payload identity verification accepts matching detailedLog", () => {
    const detailedLog = createEmptyBattleDetailedLog();
    const hash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    expect(expectOk(verifyRetainedDetailedLogPayloadIdentity(detailedLog, hash, provider))).toBe(
      hash,
    );
  });

  it("record hash tamper is rejected", () => {
    const record = buildTestRecord();
    const tampered = { ...record, storedRecordHash: "f".repeat(64) };
    expect(validateStoredBattleResultRecord(tampered, provider).ok).toBe(false);
  });
});

describe("S02-009 importance marker", () => {
  it("LOG-009 rejects retroactive marker assignment", () => {
    const record = buildTestRecord();
    const marker = expectOk(
      buildImportantBattleMarker(
        ["tournament_final"],
        { tournament_final: "e".repeat(64) },
        provider,
      ),
    );
    expect(rejectRetroactiveImportantBattleMarker(record, marker).ok).toBe(false);
  });

  it("LOG-015 rejects marker without proof hash", () => {
    const marker = {
      schemaVersion: "0.1.0" as const,
      reasons: ["tournament_final"] as const,
      reasonProofHashesByReason: {},
      markerHash: "f".repeat(64),
    };
    expect(buildImportantBattleMarker(marker.reasons, marker.reasonProofHashesByReason, provider).ok).toBe(
      false,
    );
  });

  it("publishStoredBattleResult rejects invalid battle result closed", () => {
    const outcome = publishStoredBattleResult(
      {
        battleResult: { invalid: true } as never,
        runRuleSnapshot: {},
        competitionRuleHash: "a".repeat(64),
      },
      createEmptyDetailedLogPayloadStore(),
      provider,
    );
    expect(outcome.kind).toBe("validation_failure");
  });
});

describe("S02-009 determinism", () => {
  it("retention/GC planning consumes no gameplay RNG or IDs", () => {
    const config = expectOk(validateNormalizedSprint2Config(createDefaultSprint2ConfigInput()));
    const record = buildTestRecord({ resultWorldDate: worldDate(1) });
    const planA = expectOk(
      applyRetentionPrunePlan([record], 6, config, { [record.matchId]: "official" }, provider),
    );
    const planB = expectOk(
      applyRetentionPrunePlan([record], 6, config, { [record.matchId]: "official" }, provider),
    );
    expect(toCanonicalJson(planA)).toBe(toCanonicalJson(planB));
  });
});
