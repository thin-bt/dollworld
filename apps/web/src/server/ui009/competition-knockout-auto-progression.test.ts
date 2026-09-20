import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../presets.js";
import {
  prepareTournamentBattleSession,
  tournamentBattleFixtureProvider,
} from "@shared-world/simulation-core";
import { projectUi009CompetitionPlanningSession } from "./competition-integration-session.js";
import { buildAcceptedCompetitionParticipantPlan } from "./competition-participant-preview.js";
import { runCompetitionProgressionStep } from "./competition-engine.js";
import { finalizeRoundRobinCompetitionStore } from "./competition-round-robin-finalize.js";
import { runCompetitionThroughFinish } from "./competition-auto-progression.js";
import {
  COMPETITION_STORE_SCHEMA_VERSION,
  type CompetitionSessionStore,
} from "./competition-store.js";

describe("UI009 knockout auto progression (source-level)", () => {
  it("selects single elimination for five-person roster and finishes via progression loop", () => {
    const provider = tournamentBattleFixtureProvider;
    const { session: baseSession } = prepareTournamentBattleSession(7002);
    const session = projectUi009CompetitionPlanningSession(baseSession);
    const plan = buildAcceptedCompetitionParticipantPlan(session, provider);
    expect(plan).not.toBeNull();
    expect(plan!.plan.selectedPersonIds.length).toBeGreaterThanOrEqual(4);

    if (plan!.plan.selectedPersonIds.length >= 5) {
      const store = { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state: null };
      const finished = runCompetitionThroughFinish(store, session, provider);
      expect(finished.kind).toBe("ok");
      if (finished.kind !== "ok") {
        return;
      }
      expect(finished.store.state?.phase).toBe("finished");
      expect(finished.store.state?.finalResult).not.toBeNull();
      const bracket = finished.store.state?.bracketDefinition as
        { formatKind?: string } | undefined;
      expect(bracket?.formatKind).toBe("knockout");
      return;
    }

    let store: CompetitionSessionStore = {
      schemaVersion: COMPETITION_STORE_SCHEMA_VERSION,
      state: null,
    };
    for (let step = 0; step < 64; step += 1) {
      const outcome = runCompetitionProgressionStep(store, session, createNodeSha256Provider());
      expect(outcome.kind).toBe("ok");
      if (outcome.kind !== "ok") {
        return;
      }
      store = outcome.store;
      if (store.state?.phase === "round_robin_complete") {
        break;
      }
    }
    const finalized = finalizeRoundRobinCompetitionStore(store, provider);
    expect(finalized.kind).toBe("ok");
  }, 120_000);
});
