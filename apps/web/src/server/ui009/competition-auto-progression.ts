import type { Sha256Provider, Sprint1RunSession } from "@shared-world/simulation-core";
import {
  runCompetitionProgressionStep,
  type CompetitionEngineOutcome,
} from "./competition-engine.js";
import { finalizeRoundRobinCompetitionStore } from "./competition-round-robin-finalize.js";
import {
  findUi009PlayableScheduleSlot,
  resolveUi009PlayableScheduleLifecycleIdentity,
  ui009PlayableSlotMatchesWorldWeek,
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
      return { kind: "ok", store: current, progressed };
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

  return { kind: "ok", store: current, progressed };
}

/**
 * Runs accepted UI009 competition work for the current world week without mutating
 * session uiRevision / lastOperation.
 *
 * Wired from simulation start, reset, and weekly step so ordinary week progression
 * can reach persisted tournament results and ranking state without manual competition stepping.
 */
export function syncCompetitionAutoProgressionForWeek(
  sessionId: string,
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
): void {
  const worldYear = worldSession.runtimeState.worldState.worldDate.year;
  const slot = findUi009PlayableScheduleSlot(worldYear);
  if (slot === null || !ui009PlayableSlotMatchesWorldWeek(worldSession, slot)) {
    return;
  }

  const lifecycle = resolveUi009PlayableScheduleLifecycleIdentity(slot, provider);
  if (lifecycle === null) {
    return;
  }

  const store = getCompetitionStore(sessionId);
  if (store.state !== null) {
    if (store.state.scheduleLifecycleIdentityHash !== lifecycle.identityHash) {
      return;
    }
    if (store.state.phase === "finished") {
      return;
    }
  }

  const outcome = runCompetitionThroughFinish(store, worldSession, provider);
  if (outcome.kind === "ok" && outcome.progressed) {
    setCompetitionStore(sessionId, outcome.store);
  }
}
