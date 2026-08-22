import { toCanonicalJson } from "@shared-world/simulation-core";
import type {
  OperationKind,
  RequestJournalRecord,
  UiSession,
  UpdateControl,
} from "./ui-session.js";
import {
  buildCurrentUiReadSnapshot,
  cloneUiReadSnapshot,
  deriveEnvelopeRevision,
} from "./ui-session.js";

export const REQUEST_ID_UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type RequestFingerprint = {
  method: "POST";
  endpoint: string;
  expectedUiRevision: number;
  canonicalOperationInput: string;
};

export function buildFingerprint(input: {
  endpoint: string;
  expectedUiRevision: number;
  operationInput: Record<string, unknown>;
}): string {
  const fingerprint: RequestFingerprint = {
    method: "POST",
    endpoint: input.endpoint,
    expectedUiRevision: input.expectedUiRevision,
    canonicalOperationInput: toCanonicalJson(input.operationInput),
  };
  return toCanonicalJson(fingerprint);
}

export function checkUiRevisionCapacity(input: {
  acceptedUiRevision: number;
  maxRevisionDelta: number;
}): boolean {
  return input.acceptedUiRevision <= Number.MAX_SAFE_INTEGER - input.maxRevisionDelta;
}

export type JournalLookupOutcome =
  | { kind: "none" }
  | { kind: "replay"; record: Extract<RequestJournalRecord, { status: "completed" }> }
  | { kind: "running_same"; record: Extract<RequestJournalRecord, { status: "running" }> }
  | { kind: "conflict" };

export function lookupJournalFingerprint(
  session: UiSession,
  requestId: string,
  fingerprint: string,
): JournalLookupOutcome {
  const existing = session.requestJournal.get(requestId);
  if (existing === undefined) {
    return { kind: "none" };
  }
  if (existing.fingerprint !== fingerprint) {
    return { kind: "conflict" };
  }
  if (existing.status === "completed") {
    return { kind: "replay", record: existing };
  }
  return { kind: "running_same", record: existing };
}

export function acceptRunningOperation(input: {
  session: UiSession;
  requestId: string;
  operationKind: OperationKind;
  fingerprint: string;
  expectedUiRevision: number;
  requestedWeeks: number;
}): UpdateControl {
  const operationStartReadSnapshot = cloneUiReadSnapshot(buildCurrentUiReadSnapshot(input.session));
  const running: RequestJournalRecord = {
    status: "running",
    requestId: input.requestId,
    operationKind: input.operationKind,
    fingerprint: input.fingerprint,
    acceptedUiRevision: input.expectedUiRevision,
    committedWeeks: 0,
    completedUiRevision: input.expectedUiRevision,
    requestedWeeks: input.requestedWeeks,
  };
  input.session.requestJournal.set(input.requestId, running);
  const updateControl: UpdateControl = {
    requestId: input.requestId,
    operationKind: input.operationKind,
    operationStartReadSnapshot,
  };
  input.session.updateControl = updateControl;
  return updateControl;
}

export function completeJournalRecord(input: {
  session: UiSession;
  requestId: string;
  httpStatus: number;
  responseBody: string;
  committedWeeks: number;
  completedUiRevision: number;
  replaceLastOperation: boolean;
}): void {
  const running = input.session.requestJournal.get(input.requestId);
  if (running === undefined || running.status !== "running") {
    throw new Error("completeJournalRecord requires running record");
  }
  const completed: RequestJournalRecord = {
    status: "completed",
    requestId: input.requestId,
    operationKind: running.operationKind,
    fingerprint: running.fingerprint,
    httpStatus: input.httpStatus,
    responseBody: input.responseBody,
    acceptedUiRevision: running.acceptedUiRevision,
    committedWeeks: input.committedWeeks,
    completedUiRevision: input.completedUiRevision,
    requestedWeeks: running.requestedWeeks,
  };
  input.session.requestJournal.set(input.requestId, completed);
  input.session.updateControl = null;
  if (input.replaceLastOperation) {
    input.session.lastOperationRequestId = input.requestId;
  }
}

export function updateRunningWeekProgress(input: {
  session: UiSession;
  requestId: string;
  committedWeeks: number;
  completedUiRevision: number;
}): void {
  const running = input.session.requestJournal.get(input.requestId);
  if (running === undefined || running.status !== "running") {
    throw new Error("updateRunningWeekProgress requires running record");
  }
  input.session.requestJournal.set(input.requestId, {
    ...running,
    committedWeeks: input.committedWeeks,
    completedUiRevision: input.completedUiRevision,
  });
}

export function clearUpdateControlKeepRunningForbidden(session: UiSession): void {
  session.updateControl = null;
}

export function envelopeMeta(session: UiSession): { uiRevision: number; isUpdating: boolean } {
  return deriveEnvelopeRevision(session);
}

/** ACC-165 / §3C.5: accepted POST final-error bytes are built while own lock is held. */
export function acceptedPostFailureIsUpdating(session: UiSession): boolean {
  return deriveEnvelopeRevision(session).isUpdating;
}

export function requestErrorReference(requestId: string): string {
  return `request:${requestId}`;
}

export function monotonicDurationMs(
  startedAt: bigint,
  endedAt: bigint = process.hrtime.bigint(),
): number {
  const deltaNs = endedAt - startedAt;
  if (deltaNs <= 0n) {
    return 0;
  }
  const ms = Number(deltaNs / 1_000_000n);
  if (!Number.isFinite(ms) || ms < 0) {
    return 0;
  }
  return Math.floor(ms);
}

export async function yieldEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
