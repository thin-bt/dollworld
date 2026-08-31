/**
 * S02-006 tournament battle atomic adapter — outer all-or-nothing composition of
 * S02-005 battle handoff + S02-009 durable publication + minimal application fact.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleActionsSource } from "../sprint1/battle-actions-source.js";
import type { BattleActionSourceIdentity } from "../sprint1/battle-action-source-identity.js";
import type { Sprint1RunSession } from "../sprint1/sprint1-run-session.js";
import { deepClonePlainJson } from "../plain-json-snapshot.js";
import { TOURNAMENT_BATTLE_APPLICATION_FACT_SCHEMA_VERSION } from "./constants.js";
import type { DetailedLogPayloadStore } from "./detailed-log-payload-store.js";
import {
  publishStoredBattleResult,
  type StoredBattleResultRecord,
} from "./stored-battle-result.js";
import {
  buildStoredBattleResultRef,
  type StoredBattleResultRef,
  type TournamentBattleSlotIdentity,
  validateTournamentBattleSlotIdentity,
} from "./stored-battle-result-ref.js";
import {
  executeTournamentBattleHandoff,
  type TournamentBattleHandoffInput,
  type TournamentBattleHandoffResult,
} from "./tournament-battle-handoff.js";
import type {
  TournamentMatchPlan,
  TournamentSlotMatchBinding,
} from "./tournament-match-plan.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";

export type TournamentBattleApplicationFact = {
  schemaVersion: typeof TOURNAMENT_BATTLE_APPLICATION_FACT_SCHEMA_VERSION;
  handoffResult: TournamentBattleHandoffResult;
  storedBattleResultRef: StoredBattleResultRef;
  applicationFactHash: string;
};

export type TournamentBattleAtomicPublicationGate = {
  /** Simulates downstream apply/record commit failure after payload put (RBK-003). */
  afterPayloadPut?: (context: {
    payloadStore: DetailedLogPayloadStore;
    storedRecords: readonly StoredBattleResultRecord[];
  }) => ValidationResult<void>;
  /** Simulates downstream tournament apply failure before finalize (RBK-001). */
  beforeFinalize?: () => ValidationResult<void>;
};

export type ExecuteTournamentBattleAtomicInput = {
  handoff: TournamentBattleHandoffInput;
  matchPlan: TournamentMatchPlan;
  slotIdentity: TournamentBattleSlotIdentity;
  competitionRuleHash: string;
  payloadStore: DetailedLogPayloadStore;
  storedRecords: readonly StoredBattleResultRecord[];
  publicationGate?: TournamentBattleAtomicPublicationGate;
};

export type ExecuteTournamentBattleAtomicSuccess = {
  kind: "completed";
  session: Sprint1RunSession;
  applicationFact: TournamentBattleApplicationFact;
  storedRecord: StoredBattleResultRecord;
  storedBattleResultRef: StoredBattleResultRef;
  payloadStore: DetailedLogPayloadStore;
  storedRecords: readonly StoredBattleResultRecord[];
  slotBindings: readonly TournamentSlotMatchBinding[];
};

export type ExecuteTournamentBattleAtomicOutput =
  | ExecuteTournamentBattleAtomicSuccess
  | Extract<
      ReturnType<typeof executeTournamentBattleHandoff>,
      { kind: "pre_start_failure" | "plan_validation_failure" | "commit_failure" }
    >
  | {
      kind: "publication_failure";
      issues: readonly ValidationIssue[];
    }
  | {
      kind: "ref_construction_failure";
      issues: readonly ValidationIssue[];
    }
  | {
      kind: "finalize_failure";
      issues: readonly ValidationIssue[];
    };

function buildApplicationFactHashMaterial(
  fact: Omit<TournamentBattleApplicationFact, "applicationFactHash">,
): Record<string, unknown> {
  return {
    schemaVersion: fact.schemaVersion,
    handoffResult: {
      schemaVersion: fact.handoffResult.schemaVersion,
      tournamentId: fact.handoffResult.tournamentId,
      bracketDefinitionHash: fact.handoffResult.bracketDefinitionHash,
      structuralSlotKey: fact.handoffResult.structuralSlotKey,
      matchId: fact.handoffResult.matchId,
      battleResultFinalStateHash: fact.handoffResult.battleResultFinalStateHash,
      winnerPersonId: fact.handoffResult.winnerPersonId,
      loserPersonId: fact.handoffResult.loserPersonId,
      executionPlanIdentityHash: fact.handoffResult.executionPlanIdentityHash,
      matchPlanIdentityHash: fact.handoffResult.matchPlanIdentityHash,
    },
    storedBattleResultRef: {
      schemaVersion: fact.storedBattleResultRef.schemaVersion,
      simulationId: fact.storedBattleResultRef.simulationId,
      tournamentId: fact.storedBattleResultRef.tournamentId,
      slotId: fact.storedBattleResultRef.slotId,
      matchOrdinal: fact.storedBattleResultRef.matchOrdinal,
      matchId: fact.storedBattleResultRef.matchId,
      battleResultHash: fact.storedBattleResultRef.battleResultHash,
      refHash: fact.storedBattleResultRef.refHash,
    },
  };
}

function buildApplicationFact(
  handoffResult: TournamentBattleHandoffResult,
  storedBattleResultRef: StoredBattleResultRef,
  provider: Sha256Provider,
): ValidationResult<TournamentBattleApplicationFact> {
  const withoutHash = {
    schemaVersion: TOURNAMENT_BATTLE_APPLICATION_FACT_SCHEMA_VERSION,
    handoffResult,
    storedBattleResultRef,
  } satisfies Omit<TournamentBattleApplicationFact, "applicationFactHash">;
  const hash = safeHashUtf8(
    provider,
    toCanonicalJson(buildApplicationFactHashMaterial(withoutHash)),
    "/applicationFactHash",
  );
  if (!hash.ok) {
    return hash;
  }
  return success(
    deepFreezePlainJson({
      ...withoutHash,
      applicationFactHash: hash.value,
    }),
  );
}

type AtomicWorkingState = {
  session: Sprint1RunSession;
  payloadStore: DetailedLogPayloadStore;
  storedRecords: StoredBattleResultRecord[];
};

function clonePayloadStore(store: DetailedLogPayloadStore): DetailedLogPayloadStore {
  return {
    schemaVersion: store.schemaVersion,
    entries: new Map(store.entries),
  };
}

function snapshotAtomicWorkingState(state: AtomicWorkingState): AtomicWorkingState {
  return {
    session: deepClonePlainJson(state.session) as Sprint1RunSession,
    payloadStore: clonePayloadStore(state.payloadStore),
    storedRecords: deepClonePlainJson(state.storedRecords) as StoredBattleResultRecord[],
  };
}

function canonicalAtomicSnapshot(state: AtomicWorkingState): string {
  return toCanonicalJson({
    session: state.session,
    payloadStore: state.payloadStore,
    storedRecords: state.storedRecords,
  });
}

export function executeTournamentBattleAtomic(
  input: ExecuteTournamentBattleAtomicInput,
  provider: Sha256Provider,
): ExecuteTournamentBattleAtomicOutput {
  const slotValidation = validateTournamentBattleSlotIdentity(input.slotIdentity);
  if (!slotValidation.ok) {
    return { kind: "ref_construction_failure", issues: slotValidation.issues };
  }

  const baseline: AtomicWorkingState = {
    session: input.handoff.session,
    payloadStore: input.payloadStore,
    storedRecords: [...input.storedRecords],
  };
  const baselineCanonical = canonicalAtomicSnapshot(baseline);
  const working = snapshotAtomicWorkingState(baseline);

  const handoff = executeTournamentBattleHandoff(
    {
      ...input.handoff,
      session: working.session,
    },
    provider,
  );

  if (handoff.kind !== "completed") {
    return handoff;
  }

  const publication = publishStoredBattleResult(
    {
      battleResult: handoff.commitPlan.battleResult,
      runRuleSnapshot: working.session.context.runRuleSnapshot,
      competitionRuleHash: input.competitionRuleHash,
      tournamentId: input.matchPlan.tournamentId,
    },
    working.payloadStore,
    provider,
  );

  if (publication.kind !== "published") {
    return {
      kind: "publication_failure",
      issues:
        publication.kind === "validation_failure" || publication.kind === "payload_integrity_failure"
          ? publication.issues
          : [],
    };
  }

  working.payloadStore = publication.payloadStore;

  if (input.publicationGate?.afterPayloadPut !== undefined) {
    const gate = input.publicationGate.afterPayloadPut({
      payloadStore: working.payloadStore,
      storedRecords: working.storedRecords,
    });
    if (!gate.ok) {
      return { kind: "finalize_failure", issues: gate.issues };
    }
  }

  const ref = buildStoredBattleResultRef(
    {
      record: publication.record,
      tournamentId: input.matchPlan.tournamentId,
      slotIdentity: input.slotIdentity,
    },
    provider,
  );
  if (!ref.ok) {
    return { kind: "ref_construction_failure", issues: ref.issues };
  }

  working.storedRecords = [...working.storedRecords, publication.record];

  if (input.publicationGate?.beforeFinalize !== undefined) {
    const gate = input.publicationGate.beforeFinalize();
    if (!gate.ok) {
      return { kind: "finalize_failure", issues: gate.issues };
    }
  }

  const applicationFact = buildApplicationFact(handoff.result, ref.value, provider);
  if (!applicationFact.ok) {
    return { kind: "ref_construction_failure", issues: applicationFact.issues };
  }

  if (canonicalAtomicSnapshot(baseline) !== baselineCanonical) {
    return {
      kind: "finalize_failure",
      issues: [
        {
          path: "",
          message: "atomic adapter invariant violated: caller-visible baseline mutated",
          expected: "unchanged canonical baseline",
        },
      ],
    };
  }

  return {
    kind: "completed",
    session: handoff.session,
    applicationFact: applicationFact.value,
    storedRecord: publication.record,
    storedBattleResultRef: ref.value,
    payloadStore: working.payloadStore,
    storedRecords: working.storedRecords,
    slotBindings: handoff.slotBindings,
  };
}

/** Exposed for BAT/RBK deterministic retry tests. */
export function snapshotTournamentBattleAtomicBaseline(state: {
  session: Sprint1RunSession;
  payloadStore: DetailedLogPayloadStore;
  storedRecords: readonly StoredBattleResultRecord[];
}): string {
  return canonicalAtomicSnapshot({
    session: state.session,
    payloadStore: state.payloadStore,
    storedRecords: [...state.storedRecords],
  });
}

export type TournamentBattleAtomicHandoffInput = TournamentBattleHandoffInput & {
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  participantAActionsSource: BattleActionsSource;
  participantBActionsSource: BattleActionsSource;
};
