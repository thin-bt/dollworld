import type {
  Sha256Provider,
  Sprint1RunSession,
  TournamentScheduleReadModelEntry,
} from "@shared-world/simulation-core";
import {
  initializeCompetitionStateForTournament,
  runCompetitionProgressionStep,
  type CompetitionEngineOutcome,
} from "./competition-engine.js";
import { finalizeRoundRobinCompetitionStore } from "./competition-round-robin-finalize.js";
import {
  listUi009DueUnprocessedScheduleSlots,
  resolveUi009PlayableScheduleLifecycleIdentity,
} from "./competition-schedule-slot.js";
import { getCompetitionStore, setCompetitionStore } from "./competition-session-registry.js";
import type { CompetitionSessionStore } from "./competition-store.js";

const MAX_MATCH_STEPS = 512;

export type CompetitionThroughFinishOutcome =
  | { kind: "ok"; store: CompetitionSessionStore; progressed: boolean }
  | Exclude<CompetitionEngineOutcome, { kind: "ok" }>
  | { kind: "finalize_failure"; issues: readonly { path: string; message: string }[] };

export function runCompetitionThroughFinish(
  store: CompetitionSessionStore,
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
): CompetitionThroughFinishOutcome {
  let current = store;
  let progressed = false;

  for (let stepIndex = 0; stepIndex < MAX_MATCH_STEPS; stepIndex += 1) {
    if (current.state?.phase === "finished") {
      return { kind: "ok", store: current, progressed: progressed || true };
    }
    if (current.state?.phase === "round_robin_complete") {
      const finalized = finalizeRoundRobinCompetitionStore(current, provider);
      if (finalized.kind === "not_ready") {
        return { kind: "ok", store: current, progressed };
      }
      if (finalized.kind !== "ok") {
        if (finalized.kind === "domain_failure") {
          return { kind: "finalize_failure", issues: finalized.issues };
        }
        return { kind: "corrupt" };
      }
      return { kind: "ok", store: finalized.store, progressed: true };
    }

    const outcome = runCompetitionProgressionStep(current, worldSession, provider);
    if (outcome.kind !== "ok") {
      return outcome;
    }
    if (outcome.stepKind !== "already_finished" || current.state !== outcome.store.state) {
      progressed = true;
    }
    current = outcome.store;

    if (outcome.stepKind === "already_finished" && current.state?.phase === "awaiting_match") {
      break;
    }
  }

  if (current.state?.phase === "round_robin_complete") {
    const finalized = finalizeRoundRobinCompetitionStore(current, provider);
    if (finalized.kind === "ok") {
      return { kind: "ok", store: finalized.store, progressed: true };
    }
    if (finalized.kind === "domain_failure") {
      return { kind: "finalize_failure", issues: finalized.issues };
    }
  }

  if (current.state?.phase === "finished") {
    return { kind: "ok", store: current, progressed: progressed || true };
  }

  return { kind: "ok", store: current, progressed };
}

function storeMatchesScheduleLifecycle(
  store: CompetitionSessionStore,
  lifecycleIdentityHash: string,
): boolean {
  return (
    store.state !== null && store.state.scheduleLifecycleIdentityHash === lifecycleIdentityHash
  );
}

function ensureStoreReadyForSlot(
  store: CompetitionSessionStore,
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
  slot: TournamentScheduleReadModelEntry,
): CompetitionThroughFinishOutcome | { kind: "ready"; store: CompetitionSessionStore } {
  const lifecycle = resolveUi009PlayableScheduleLifecycleIdentity(slot, provider);
  if (lifecycle === null) {
    return { kind: "ready", store };
  }

  if (store.state !== null && storeMatchesScheduleLifecycle(store, lifecycle.identityHash)) {
    return { kind: "ready", store };
  }

  if (store.state !== null && store.state.phase !== "finished") {
    return { kind: "ready", store };
  }

  const initialized = initializeCompetitionStateForTournament(worldSession, provider, slot, store);
  if (initialized.kind !== "ok" || initialized.store.state === null) {
    if (initialized.kind === "ok") {
      return { kind: "corrupt" };
    }
    return initialized;
  }
  return { kind: "ready", store: initialized.store };
}

/**
 * Runs accepted UI009 competition work for the current world week without mutating
 * session uiRevision / lastOperation.
 *
 * Wired from ordinary weekly simulation step only. Start/reset must not auto-finish
 * competitions; reopen scope is week progression without manual competition-step.
 */
export function syncCompetitionAutoProgressionForWeek(
  sessionId: string,
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
): void {
  let store = getCompetitionStore(sessionId);
  const dueSlots = listUi009DueUnprocessedScheduleSlots(worldSession, store);
  if (dueSlots.length === 0) {
    return;
  }

  for (const slot of dueSlots) {
    const prepared = ensureStoreReadyForSlot(store, worldSession, provider, slot);
    if (prepared.kind !== "ready") {
      return;
    }
    store = prepared.store;
    if (store.state === null || store.state.phase === "finished") {
      continue;
    }

    const outcome = runCompetitionThroughFinish(store, worldSession, provider);
    if (outcome.kind !== "ok") {
      return;
    }
    setCompetitionStore(sessionId, outcome.store);
    store = outcome.store;
  }
}
