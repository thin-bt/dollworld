/**
 * §13A.5 strict read order for MockBattleSessionStore / latest record.
 *
 * 1. store strict schema
 * 2. latestRecordHash recompute
 * 3. replaySnapshotHash recompute
 * 4. runtimeCheckpoint canonical validator
 * 5. BattleResult canonical validator
 * 6. eventCandidates strict validator
 * 7. cross-reference result / snapshot / checkpoint / eventCandidates
 *
 * Any failure is a §13 500 INTERNAL_ERROR; never 404/422/degraded 200.
 */

import {
  toCanonicalJson,
  validateBattleResult,
  validateSprint1RunSession,
  type Sha256Provider,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import {
  MOCK_BATTLE_REPLAY_SNAPSHOT_SCHEMA_VERSION,
  MOCK_BATTLE_STORE_SCHEMA_VERSION,
  type MockBattleLatestRecord,
  type MockBattleReplaySnapshot,
  type MockBattleSessionStore,
} from "../ui-session.js";
import { fail, ok, type PureResult } from "./result.js";
import { computeLatestRecordHash, computeReplaySnapshotHash } from "./store-hashes.js";
import {
  crossRefEventCandidatesToResult,
  validateEventCandidatesPair,
} from "./validate-event-candidates-pair.js";
import { validateAbOrderAcrossArtifacts } from "./ordered-ab.js";
import type { BattleResultSource, EventCandidateSource } from "./types.js";

const REPLAY_SNAPSHOT_KEYS = [
  "schemaVersion",
  "sourceWorldUiRevision",
  "runtimeCheckpoint",
  "participantAId",
  "participantBId",
  "battleKind",
  "participantAActionSourceIdentity",
  "participantBActionSourceIdentity",
  "replaySnapshotHash",
] as const;

const LATEST_RECORD_KEYS = [
  "resultUiRevision",
  "battleResult",
  "eventCandidates",
  "replaySnapshot",
  "latestRecordHash",
] as const;

const SHA256_HEX = /^[0-9a-f]{64}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  if (actual.length !== keys.length) {
    return false;
  }
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

/** §13A.2 hash input: snapshot without its own hash field. */
export function replaySnapshotHashInput(
  snapshot: MockBattleReplaySnapshot,
): Record<string, unknown> {
  return {
    schemaVersion: snapshot.schemaVersion,
    sourceWorldUiRevision: snapshot.sourceWorldUiRevision,
    runtimeCheckpoint: snapshot.runtimeCheckpoint,
    participantAId: snapshot.participantAId,
    participantBId: snapshot.participantBId,
    battleKind: snapshot.battleKind,
    participantAActionSourceIdentity: snapshot.participantAActionSourceIdentity,
    participantBActionSourceIdentity: snapshot.participantBActionSourceIdentity,
  };
}

export function validateReplaySnapshotShape(value: unknown): PureResult<MockBattleReplaySnapshot> {
  if (!isPlainObject(value) || !exactKeys(value, REPLAY_SNAPSHOT_KEYS)) {
    return fail("MockBattleReplaySnapshot key set invalid");
  }
  if (value.schemaVersion !== MOCK_BATTLE_REPLAY_SNAPSHOT_SCHEMA_VERSION) {
    return fail("MockBattleReplaySnapshot schemaVersion must be 0.2.0");
  }
  if (!isNonNegativeSafeInteger(value.sourceWorldUiRevision)) {
    return fail("sourceWorldUiRevision must be a non-negative safe integer");
  }
  if (!isPlainObject(value.runtimeCheckpoint)) {
    return fail("runtimeCheckpoint must be an object");
  }
  if (typeof value.participantAId !== "string" || value.participantAId.length === 0) {
    return fail("participantAId must be a non-empty string");
  }
  if (typeof value.participantBId !== "string" || value.participantBId.length === 0) {
    return fail("participantBId must be a non-empty string");
  }
  if (value.participantAId === value.participantBId) {
    return fail("replaySnapshot participants must differ");
  }
  if (value.battleKind !== "mock") {
    return fail("replaySnapshot battleKind must be mock");
  }
  if (
    !isPlainObject(value.participantAActionSourceIdentity) ||
    !isPlainObject(value.participantBActionSourceIdentity)
  ) {
    return fail("action source identities must be objects");
  }
  if (typeof value.replaySnapshotHash !== "string" || !SHA256_HEX.test(value.replaySnapshotHash)) {
    return fail("replaySnapshotHash must be lowercase 64-hex");
  }
  return ok(value as unknown as MockBattleReplaySnapshot);
}

export function validateLatestRecordShape(value: unknown): PureResult<MockBattleLatestRecord> {
  if (!isPlainObject(value) || !exactKeys(value, LATEST_RECORD_KEYS)) {
    return fail("MockBattleLatestRecord key set invalid");
  }
  if (!isNonNegativeSafeInteger(value.resultUiRevision)) {
    return fail("resultUiRevision must be a non-negative safe integer");
  }
  if (!isPlainObject(value.battleResult)) {
    return fail("battleResult must be an object");
  }
  if (!Array.isArray(value.eventCandidates)) {
    return fail("eventCandidates must be an array");
  }
  if (typeof value.latestRecordHash !== "string" || !SHA256_HEX.test(value.latestRecordHash)) {
    return fail("latestRecordHash must be lowercase 64-hex");
  }
  const snapshot = validateReplaySnapshotShape(value.replaySnapshot);
  if (!snapshot.ok) {
    return snapshot;
  }
  if (snapshot.value.sourceWorldUiRevision > (value.resultUiRevision as number)) {
    return fail("sourceWorldUiRevision must be <= resultUiRevision");
  }
  return ok(value as unknown as MockBattleLatestRecord);
}

export function validateStoreShape(store: unknown): PureResult<MockBattleSessionStore> {
  if (!isPlainObject(store) || !exactKeys(store, ["schemaVersion", "latest"])) {
    return fail("MockBattleSessionStore key set invalid");
  }
  if (store.schemaVersion !== MOCK_BATTLE_STORE_SCHEMA_VERSION) {
    return fail("MockBattleSessionStore schemaVersion must be 0.2.0");
  }
  if (store.latest !== null) {
    const record = validateLatestRecordShape(store.latest);
    if (!record.ok) {
      return record;
    }
  }
  return ok(store as unknown as MockBattleSessionStore);
}

export type ValidatedLatest = {
  record: MockBattleLatestRecord;
  battleResult: BattleResultSource;
  eventCandidates: readonly [EventCandidateSource, EventCandidateSource];
  checkpointSession: Sprint1RunSession;
};

/**
 * Full §13A.5 read order over a fixed read snapshot's store.
 * Callers translate any failure into 500 INTERNAL_ERROR commitState=none.
 */
export function readValidatedLatest(input: {
  store: MockBattleSessionStore;
  provider: Sha256Provider;
}): PureResult<ValidatedLatest> {
  const storeShape = validateStoreShape(input.store);
  if (!storeShape.ok) {
    return storeShape;
  }
  const latest = storeShape.value.latest;
  if (latest === null) {
    return fail("mock battle latest is absent");
  }

  const recordHash = computeLatestRecordHash(
    {
      resultUiRevision: latest.resultUiRevision,
      battleResult: latest.battleResult,
      eventCandidates: latest.eventCandidates,
      replaySnapshot: latest.replaySnapshot,
    },
    input.provider,
  );
  if (recordHash !== latest.latestRecordHash) {
    return fail("latestRecordHash mismatch");
  }

  const snapshotHash = computeReplaySnapshotHash(
    replaySnapshotHashInput(latest.replaySnapshot),
    input.provider,
  );
  if (snapshotHash !== latest.replaySnapshot.replaySnapshotHash) {
    return fail("replaySnapshotHash mismatch");
  }

  const checkpoint = validateSprint1RunSession(
    latest.replaySnapshot.runtimeCheckpoint,
    input.provider,
  );
  if (!checkpoint.ok) {
    return fail("runtimeCheckpoint failed canonical validation");
  }

  const battleResult = validateBattleResult(
    latest.battleResult,
    checkpoint.value.context.runRuleSnapshot,
    input.provider,
  );
  if (!battleResult.ok) {
    return fail("battleResult failed canonical validation");
  }

  const pair = validateEventCandidatesPair(
    latest.eventCandidates as unknown as EventCandidateSource[],
  );
  if (!pair.ok) {
    return pair;
  }

  const source = latest.battleResult as unknown as BattleResultSource;
  const crossRef = crossRefEventCandidatesToResult({
    candidates: pair.value,
    battleResult: source,
  });
  if (!crossRef.ok) {
    return crossRef;
  }

  const abOrder = validateAbOrderAcrossArtifacts({
    participantAId: latest.replaySnapshot.participantAId,
    participantBId: latest.replaySnapshot.participantBId,
    battleResultParticipantAId: source.participantAId,
    battleResultParticipantBId: source.participantBId,
    replaySnapshotParticipantAId: latest.replaySnapshot.participantAId,
    replaySnapshotParticipantBId: latest.replaySnapshot.participantBId,
    eventCandidatePersonIds: pair.value[0].entities?.personIds ?? [],
  });
  if (!abOrder.ok) {
    return abOrder;
  }

  if (
    toCanonicalJson(latest.replaySnapshot.participantAActionSourceIdentity) !==
      toCanonicalJson(source.participantAActionSourceIdentity) ||
    toCanonicalJson(latest.replaySnapshot.participantBActionSourceIdentity) !==
      toCanonicalJson(source.participantBActionSourceIdentity)
  ) {
    return fail("replaySnapshot action source identities mismatch BattleResult");
  }
  if (source.battleKind !== "mock") {
    return fail("battleResult battleKind must be mock");
  }
  if (source.simulationId !== (checkpoint.value.context.simulationId as unknown as string)) {
    return fail("battleResult simulationId mismatch checkpoint");
  }

  return ok({
    record: latest,
    battleResult: source,
    eventCandidates: pair.value,
    checkpointSession: checkpoint.value,
  });
}
