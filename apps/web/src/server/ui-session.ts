import type { Sprint1RunSession } from "@shared-world/simulation-core";
import type { RunInitializationSnapshot } from "./run-init.js";
import type { CommittedValidationViewStore } from "./validation-store.js";

export type CommittedLifecycle = "empty" | "ready";

export type OperationKind =
  | "start"
  | "step"
  | "reset"
  | "mock_battle"
  | "mock_battle_replay"
  | "competition_step";

export const MOCK_BATTLE_STORE_SCHEMA_VERSION = "0.2.0" as const;
export const MOCK_BATTLE_REPLAY_SNAPSHOT_SCHEMA_VERSION = "0.2.0" as const;

/** S1.5-SPEC-0.1.15 §13A.1 MockBattleReplaySnapshot 0.2.0 (adapter-internal, never on wire). */
export type MockBattleReplaySnapshot = {
  readonly schemaVersion: typeof MOCK_BATTLE_REPLAY_SNAPSHOT_SCHEMA_VERSION;
  readonly sourceWorldUiRevision: number;
  readonly runtimeCheckpoint: Record<string, unknown>;
  readonly participantAId: string;
  readonly participantBId: string;
  readonly battleKind: "mock";
  readonly participantAActionSourceIdentity: Record<string, unknown>;
  readonly participantBActionSourceIdentity: Record<string, unknown>;
  readonly replaySnapshotHash: string;
};

/** S1.5-SPEC-0.1.15 §13A.1 MockBattleLatestRecord 0.2.0. */
export type MockBattleLatestRecord = {
  readonly resultUiRevision: number;
  readonly battleResult: Record<string, unknown>;
  readonly eventCandidates: readonly Record<string, unknown>[];
  readonly replaySnapshot: MockBattleReplaySnapshot;
  readonly latestRecordHash: string;
};

export type MockBattleSessionStore = {
  readonly schemaVersion: typeof MOCK_BATTLE_STORE_SCHEMA_VERSION;
  readonly latest: MockBattleLatestRecord | null;
};

export type { RunInitializationSnapshot, CommittedValidationViewStore };

export type RequestJournalRecord =
  | {
      status: "running";
      requestId: string;
      operationKind: OperationKind;
      fingerprint: string;
      acceptedUiRevision: number;
      committedWeeks: number;
      completedUiRevision: number;
      requestedWeeks: number;
    }
  | {
      status: "completed";
      requestId: string;
      operationKind: OperationKind;
      fingerprint: string;
      httpStatus: number;
      responseBody: string;
      acceptedUiRevision: number;
      committedWeeks: number;
      completedUiRevision: number;
      requestedWeeks: number;
    };

export type UiReadSnapshot = {
  committedLifecycle: CommittedLifecycle;
  uiRevision: number;
  worldEngineRuntime: Sprint1RunSession | null;
  runInitializationSnapshot: RunInitializationSnapshot | null;
  committedValidationStore: CommittedValidationViewStore | null;
  mockBattleStore: MockBattleSessionStore;
  lastOperationRequestId: string | null;
};

export type UpdateControl = {
  requestId: string;
  operationKind: OperationKind;
  operationStartReadSnapshot: UiReadSnapshot;
};

export type UiSession = {
  sessionId: string;
  csrfToken: string;
  committedLifecycle: CommittedLifecycle;
  uiRevision: number;
  worldEngineRuntime: Sprint1RunSession | null;
  runInitializationSnapshot: RunInitializationSnapshot | null;
  committedValidationStore: CommittedValidationViewStore | null;
  mockBattleStore: MockBattleSessionStore;
  requestJournal: Map<string, RequestJournalRecord>;
  lastOperationRequestId: string | null;
  updateControl: UpdateControl | null;
};

export class UiSessionIntegrityError extends Error {
  public override readonly name = "UiSessionIntegrityError";
}

export function createEmptyMockBattleStore(): MockBattleSessionStore {
  return { schemaVersion: MOCK_BATTLE_STORE_SCHEMA_VERSION, latest: null };
}

/**
 * Latest records are immutable once committed, so the store clone keeps the same
 * record reference and only re-creates the container (ACC-025 / §13A.5 fixed read).
 */
export function cloneMockBattleStore(store: MockBattleSessionStore): MockBattleSessionStore {
  return { schemaVersion: store.schemaVersion, latest: store.latest };
}

export function createEmptyUiReadSnapshot(): UiReadSnapshot {
  return {
    committedLifecycle: "empty",
    uiRevision: 0,
    worldEngineRuntime: null,
    runInitializationSnapshot: null,
    committedValidationStore: null,
    mockBattleStore: createEmptyMockBattleStore(),
    lastOperationRequestId: null,
  };
}

export function createEmptyUiSession(input: { sessionId: string; csrfToken: string }): UiSession {
  return {
    sessionId: input.sessionId,
    csrfToken: input.csrfToken,
    committedLifecycle: "empty",
    uiRevision: 0,
    worldEngineRuntime: null,
    runInitializationSnapshot: null,
    committedValidationStore: null,
    mockBattleStore: createEmptyMockBattleStore(),
    requestJournal: new Map(),
    lastOperationRequestId: null,
    updateControl: null,
  };
}

export function cloneUiReadSnapshot(snapshot: UiReadSnapshot): UiReadSnapshot {
  return {
    committedLifecycle: snapshot.committedLifecycle,
    uiRevision: snapshot.uiRevision,
    worldEngineRuntime: snapshot.worldEngineRuntime,
    runInitializationSnapshot: snapshot.runInitializationSnapshot,
    committedValidationStore: snapshot.committedValidationStore,
    mockBattleStore: cloneMockBattleStore(snapshot.mockBattleStore),
    lastOperationRequestId: snapshot.lastOperationRequestId,
  };
}

export function buildCurrentUiReadSnapshot(session: UiSession): UiReadSnapshot {
  return {
    committedLifecycle: session.committedLifecycle,
    uiRevision: session.uiRevision,
    worldEngineRuntime: session.worldEngineRuntime,
    runInitializationSnapshot: session.runInitializationSnapshot,
    committedValidationStore: session.committedValidationStore,
    mockBattleStore: cloneMockBattleStore(session.mockBattleStore),
    lastOperationRequestId: session.lastOperationRequestId,
  };
}

export function validateEmptyUiSessionInvariants(session: UiSession): void {
  if (session.committedLifecycle !== "empty") {
    return;
  }
  if (session.uiRevision !== 0) {
    throw new UiSessionIntegrityError("empty session uiRevision must be 0");
  }
  if (session.worldEngineRuntime !== null) {
    throw new UiSessionIntegrityError("empty session worldEngineRuntime must be null");
  }
  if (session.runInitializationSnapshot !== null) {
    throw new UiSessionIntegrityError("empty session runInitializationSnapshot must be null");
  }
  if (session.committedValidationStore !== null) {
    throw new UiSessionIntegrityError("empty session committedValidationStore must be null");
  }
  if (session.lastOperationRequestId !== null) {
    throw new UiSessionIntegrityError("empty session lastOperationRequestId must be null");
  }
  if (session.mockBattleStore.latest !== null) {
    throw new UiSessionIntegrityError("empty session mockBattleStore.latest must be null");
  }
  if (session.updateControl !== null) {
    const running = session.requestJournal.get(session.updateControl.requestId);
    if (running === undefined || running.status !== "running") {
      throw new UiSessionIntegrityError("updateControl requires exactly one running journal");
    }
  }
  let runningCount = 0;
  for (const record of session.requestJournal.values()) {
    if (record.status === "running") {
      runningCount += 1;
    }
  }
  if (session.updateControl === null && runningCount !== 0) {
    throw new UiSessionIntegrityError("running journal without updateControl");
  }
  if (session.updateControl !== null && runningCount !== 1) {
    throw new UiSessionIntegrityError("updating requires exactly one running journal");
  }
}

export function assertUiSessionIntegrity(session: UiSession): void {
  if (typeof session.sessionId !== "string" || session.sessionId.length === 0) {
    throw new UiSessionIntegrityError("sessionId missing");
  }
  if (typeof session.csrfToken !== "string" || session.csrfToken.length === 0) {
    throw new UiSessionIntegrityError("csrfToken missing");
  }
  if (session.committedLifecycle !== "empty" && session.committedLifecycle !== "ready") {
    throw new UiSessionIntegrityError("committedLifecycle invalid");
  }
  if (
    typeof session.uiRevision !== "number" ||
    !Number.isInteger(session.uiRevision) ||
    session.uiRevision < 0 ||
    !Number.isSafeInteger(session.uiRevision)
  ) {
    throw new UiSessionIntegrityError("uiRevision invalid");
  }
  if (session.requestJournal == null || !(session.requestJournal instanceof Map)) {
    throw new UiSessionIntegrityError("requestJournal invalid");
  }
  validateEmptyUiSessionInvariants(session);
  if (session.committedLifecycle === "ready") {
    if (session.worldEngineRuntime === null) {
      throw new UiSessionIntegrityError("ready session requires worldEngineRuntime");
    }
    if (session.runInitializationSnapshot === null) {
      throw new UiSessionIntegrityError("ready session requires runInitializationSnapshot");
    }
    if (session.committedValidationStore === null) {
      throw new UiSessionIntegrityError("ready session requires committedValidationStore");
    }
    if (session.lastOperationRequestId === null) {
      throw new UiSessionIntegrityError("ready session requires lastOperationRequestId");
    }
  }
}

export function deriveSessionWireState(session: UiSession): "empty" | "ready" | "updating" {
  if (session.updateControl !== null) {
    return "updating";
  }
  return session.committedLifecycle;
}

export function deriveEnvelopeRevision(session: UiSession): {
  uiRevision: number;
  isUpdating: boolean;
} {
  if (session.updateControl !== null) {
    return {
      uiRevision: session.updateControl.operationStartReadSnapshot.uiRevision,
      isUpdating: true,
    };
  }
  return { uiRevision: session.uiRevision, isUpdating: false };
}

export type SessionDataView = {
  sessionState: "empty" | "ready" | "updating";
  csrfToken: string;
  activeOperation: null | { kind: OperationKind; requestId: string };
};

export function buildSessionDataView(session: UiSession): SessionDataView {
  const sessionState = deriveSessionWireState(session);
  const activeOperation =
    session.updateControl === null
      ? null
      : {
          kind: session.updateControl.operationKind,
          requestId: session.updateControl.requestId,
        };
  return {
    sessionState,
    csrfToken: session.csrfToken,
    activeOperation,
  };
}
