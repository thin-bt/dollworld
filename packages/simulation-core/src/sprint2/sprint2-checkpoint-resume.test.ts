/**
 * S02-010 checkpoint publish/resume acceptance (CHK-001..011).
 */
import { describe, expect, it } from "vitest";
import {
  createEmptyBattleDetailedLog,
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
} from "../index.js";
import { asMatchId, asPersonId, asSimulationId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  buildFreshCheckpointRunContext,
  expectOk,
} from "../test-fixtures/sprint2-checkpoint.fixture.js";
import {
  buildSprint2CheckpointBundle,
  validateSprint2CheckpointBundle,
} from "./checkpoint-bundle.js";
import {
  beginCheckpointTransaction,
  publishSprint2Checkpoint,
  Sprint2CheckpointPublicationStore,
} from "./checkpoint-publish.js";
import {
  rejectUnsupportedDraftCheckpointBundle,
  restoreSprint2CheckpointRunContextFromBundle,
  resumeSprint2CheckpointFromStore,
} from "./checkpoint-resume.js";
import {
  computeDetailedLogPayloadHash,
  createEmptyDetailedLogPayloadStore,
  putDetailedLogPayloadIfAbsent,
} from "./detailed-log-payload-store.js";
import { runWeeks, runYears } from "./run-weeks.js";
import { canonicalizeSprint2CheckpointRunContext } from "./sprint2-checkpoint-context.js";
import {
  buildDetailedLogLogicalPath,
  validateDetailedLogLogicalPath,
} from "./checkpoint-manifest.js";
import {
  computeStoredRecordHash,
  type StoredBattleResultRecord,
} from "./stored-battle-result.js";
import { STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION } from "./constants.js";

const provider = createNodeSha256Provider();

function buildRetainedRecord(
  simulationId: ReturnType<typeof asSimulationId>,
  detailedLogHash: string,
): StoredBattleResultRecord {
  const base = {
    schemaVersion: STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION,
    simulationId,
    matchId: asMatchId("match_000000000001"),
    resultWorldDate: createWorldDate({ year: 1, month: 1, weekOfMonth: 1 }, DEFAULT_WORLD_CALENDAR_CONFIG),
    participantAId: asPersonId("person_000000000001"),
    participantBId: asPersonId("person_000000000002"),
    winnerPersonId: asPersonId("person_000000000001"),
    loserPersonId: asPersonId("person_000000000002"),
    resultKind: "completed" as const,
    competitionRuleHash: "a".repeat(64),
    detailedLogHash,
    detailedLogRetentionStatus: "retained" as const,
    battleResultHash: "c".repeat(64),
  };
  return {
    ...base,
    storedRecordHash: expectOk(computeStoredRecordHash(base, provider)),
  };
}

function publishContext(
  store: Sprint2CheckpointPublicationStore,
  context: ReturnType<typeof buildFreshCheckpointRunContext>,
  form: "pending" | "completed",
  checkpointId: string,
) {
  const outcome = publishSprint2Checkpoint(
    store,
    { context, checkpointId, form },
    provider,
  );
  expect(outcome.kind).toBe("published");
  if (outcome.kind !== "published") {
    throw new Error("expected published checkpoint");
  }
  return outcome;
}

describe("S02-010 checkpoint publish/resume", () => {
  it("CHK-001: pending checkpoint resume equivalence with fresh run", () => {
    const store = new Sprint2CheckpointPublicationStore();
    const initial = buildFreshCheckpointRunContext(93001, provider);
    publishContext(store, initial, "pending", "pending-001");
    const fresh = expectOk(runWeeks(initial, 2, provider));
    const restored = expectOk(resumeSprint2CheckpointFromStore(store, { checkpointId: "pending-001" }, provider));
    const resumed = expectOk(runWeeks(restored, 2, provider));
    expect(canonicalizeSprint2CheckpointRunContext(resumed)).toBe(
      canonicalizeSprint2CheckpointRunContext(fresh),
    );
  });

  it("CHK-002: completed checkpoint resume avoids double-processing", () => {
    const store = new Sprint2CheckpointPublicationStore();
    const initial = buildFreshCheckpointRunContext(93002, provider);
    const afterOne = expectOk(runWeeks(initial, 1, provider));
    publishContext(store, afterOne, "completed", "completed-002");
    const freshTwo = expectOk(runWeeks(initial, 2, provider));
    const restored = expectOk(
      resumeSprint2CheckpointFromStore(store, { checkpointId: "completed-002" }, provider),
    );
    const resumed = expectOk(runWeeks(restored, 1, provider));
    expect(canonicalizeSprint2CheckpointRunContext(resumed)).toBe(
      canonicalizeSprint2CheckpointRunContext(freshTwo),
    );
  });

  it("CHK-003: missing retained payload rejects resume", () => {
    const initial = buildFreshCheckpointRunContext(93003, provider);
    const detailedLog = createEmptyBattleDetailedLog();
    const hash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const put = expectOk(putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider));
    const withRetention = {
      ...initial,
      payloadStore: put.store,
      retainedRecords: [buildRetainedRecord(initial.session.context.simulationId, hash)],
    };
    const bundle = expectOk(buildSprint2CheckpointBundle(withRetention, provider));
    const missingPayloadBundle = {
      ...bundle,
      payloadStore: { schemaVersion: bundle.payloadStore.schemaVersion, entries: [] },
    };
    const restored = restoreSprint2CheckpointRunContextFromBundle(missingPayloadBundle, provider);
    expect(restored.ok).toBe(false);
  });

  it("CHK-004: tampered payload bytes reject resume", () => {
    const initial = buildFreshCheckpointRunContext(93004, provider);
    const detailedLog = createEmptyBattleDetailedLog();
    const hash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const put = expectOk(putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider));
    const withRetention = {
      ...initial,
      payloadStore: put.store,
      retainedRecords: [buildRetainedRecord(initial.session.context.simulationId, hash)],
    };
    const bundle = expectOk(buildSprint2CheckpointBundle(withRetention, provider));
    const tampered = {
      ...bundle,
      payloadStore: {
        ...bundle.payloadStore,
        entries: [{ detailedLogHash: hash, canonicalUtf8Bytes: '{"tampered":true}' }],
      },
    };
    const restored = restoreSprint2CheckpointRunContextFromBundle(tampered, provider);
    expect(restored.ok).toBe(false);
  });

  it("CHK-005: manifest missing/extra entry rejects resume", () => {
    const initial = buildFreshCheckpointRunContext(93005, provider);
    const detailedLog = createEmptyBattleDetailedLog();
    const hash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const put = expectOk(putDetailedLogPayloadIfAbsent(createEmptyDetailedLogPayloadStore(), detailedLog, provider));
    const withRetention = {
      ...initial,
      payloadStore: put.store,
      retainedRecords: [buildRetainedRecord(initial.session.context.simulationId, hash)],
    };
    const bundle = expectOk(buildSprint2CheckpointBundle(withRetention, provider));
    const extraEntry = {
      detailedLogHash: "d".repeat(64),
      logicalPath: `detailed-logs/payloads/dd/${"d".repeat(64)}.json`,
    };
    const tampered = {
      ...bundle,
      manifest: {
        ...bundle.manifest,
        entries: [...bundle.manifest.entries, extraEntry],
      },
    };
    const validated = validateSprint2CheckpointBundle(tampered, provider);
    expect(validated.ok).toBe(false);
  });

  it("CHK-006: swapped bundleRef rejects resume", () => {
    const initial = buildFreshCheckpointRunContext(93006, provider);
    const bundle = expectOk(buildSprint2CheckpointBundle(initial, provider));
    const swappedRef = {
      ...bundle.bundleRef,
      bundleHash: "f".repeat(64),
    };
    const restored = restoreSprint2CheckpointRunContextFromBundle(bundle, provider, swappedRef);
    expect(restored.ok).toBe(false);
  });

  it("CHK-007: path traversal and invalid hash path reject", () => {
    expect(validateDetailedLogLogicalPath("../escape.json").ok).toBe(false);
    expect(validateDetailedLogLogicalPath("detailed-logs/payloads/ZZ/hash.json").ok).toBe(false);
    const hash = "a".repeat(64);
    expect(buildDetailedLogLogicalPath(hash).ok).toBe(true);
    expect(buildDetailedLogLogicalPath("UPPER").ok).toBe(false);
  });

  it("CHK-008: transaction-open publish produces zero completed paths", () => {
    const store = new Sprint2CheckpointPublicationStore();
    const initial = buildFreshCheckpointRunContext(93008, provider);
    const open = expectOk(beginCheckpointTransaction(initial));
    const before = store.listCompletedCheckpointIds().length;
    const outcome = publishSprint2Checkpoint(
      store,
      { context: open, checkpointId: "blocked", form: "pending" },
      provider,
    );
    expect(outcome.kind).toBe("refused_transaction_open");
    expect(store.listCompletedCheckpointIds().length).toBe(before);
  });

  it("CHK-009: resume at world101 start pending then one week", () => {
    const store = new Sprint2CheckpointPublicationStore();
    const initial = buildFreshCheckpointRunContext(93009, provider);
    const atBoundary = expectOk(runYears(initial, 100, provider));
    publishContext(store, atBoundary, "pending", "world101-pending");
    const fresh = expectOk(runWeeks(atBoundary, 1, provider));
    const restored = expectOk(
      resumeSprint2CheckpointFromStore(store, { checkpointId: "world101-pending" }, provider),
    );
    const resumed = expectOk(runWeeks(restored, 1, provider));
    expect(canonicalizeSprint2CheckpointRunContext(resumed)).toBe(
      canonicalizeSprint2CheckpointRunContext(fresh),
    );
  }, 360_000);

  it("CHK-010: old draft checkpoint schema rejects", () => {
    const rejected = rejectUnsupportedDraftCheckpointBundle({ schemaVersion: "0.0.1-draft" });
    expect(rejected.ok).toBe(false);
  });

  it("CHK-011: after pending/completed resume runWeeks(0) is unchanged", () => {
    const store = new Sprint2CheckpointPublicationStore();
    const initial = buildFreshCheckpointRunContext(93011, provider);
    const afterOne = expectOk(runWeeks(initial, 1, provider));
    publishContext(store, initial, "pending", "pending-011");
    publishContext(store, afterOne, "completed", "completed-011");
    for (const id of ["pending-011", "completed-011"]) {
      const restored = expectOk(resumeSprint2CheckpointFromStore(store, { checkpointId: id }, provider));
      const before = canonicalizeSprint2CheckpointRunContext(restored);
      const after = expectOk(runWeeks(restored, 0, provider));
      expect(canonicalizeSprint2CheckpointRunContext(after)).toBe(before);
    }
  });
});

describe("S02-010 S02-009 retention regression via checkpoint seam", () => {
  it("LOG-016 class payload hash mismatch refuses bundle generation", () => {
    const initial = buildFreshCheckpointRunContext(93012, provider);
    const detailedLog = createEmptyBattleDetailedLog();
    const hash = expectOk(computeDetailedLogPayloadHash(detailedLog, provider));
    const tamperedStore = {
      schemaVersion: createEmptyDetailedLogPayloadStore().schemaVersion,
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
    const withRetention = {
      ...initial,
      payloadStore: tamperedStore,
      retainedRecords: [buildRetainedRecord(initial.session.context.simulationId, hash)],
    };
    const bundle = buildSprint2CheckpointBundle(withRetention, provider);
    expect(bundle.ok).toBe(false);
  });
});

describe("S02-010 completed checkpoint form", () => {
  it("publish completed form marks execution phase completed", () => {
    const store = new Sprint2CheckpointPublicationStore();
    const initial = buildFreshCheckpointRunContext(93013, provider);
    const afterOne = expectOk(runWeeks(initial, 1, provider));
    const outcome = publishSprint2Checkpoint(
      store,
      { context: afterOne, checkpointId: "completed-form", form: "completed" },
      provider,
    );
    expect(outcome.kind).toBe("published");
    if (outcome.kind === "published") {
      expect(outcome.bundle.executionState.phase).toBe("completed");
    }
  });
});
