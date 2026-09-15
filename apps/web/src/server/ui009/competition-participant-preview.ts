import {
  buildPlannedParticipantList,
  buildTournamentScheduleReadModel,
  commitSchedulePlan,
  computeScheduleLifecycleIdentity,
  createInitialTournamentIdGeneratorState,
  createNeutralEntryChoicePolicy,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  isEligibleForBattleKind,
  type EntrantCandidateFacts,
  type Person,
  type PersonId,
  type ParticipationStatus,
  type Rank,
  type Sha256Provider,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { tinyScheduleConfig } from "./competition-engine-schedule-config.js";
import {
  selectUi009IntegrationFallbackParticipantIds,
  UI009_INTEGRATION_ROUND_ROBIN_MAX,
} from "./competition-participant-integration-fallback.js";
import { projectUi009CompetitionPlanningSession } from "./competition-integration-session.js";

function supplementTwoPersonRoundRobinRoster(
  session: Sprint1RunSession,
  selectedPersonIds: readonly PersonId[],
): readonly PersonId[] {
  if (selectedPersonIds.length !== 2) {
    return selectedPersonIds;
  }
  const targetRank = "F";
  const roster = [...selectedPersonIds];
  const seen = new Set(roster);
  const candidates = session.runtimeState.worldState.persons
    .filter((rawPerson) => {
      const person = rawPerson as Person;
      if (person.lifeStatus !== "living" || person.participationStatus !== "active") {
        return false;
      }
      if (person.careerStatus !== "active_competitor") {
        return false;
      }
      if (person.currentRank !== targetRank) {
        return false;
      }
      return isEligibleForBattleKind("official", person.careerStatus, person.currentAge);
    })
    .map((person) => person.personId as PersonId)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const personId of candidates) {
    if (seen.has(personId)) {
      continue;
    }
    seen.add(personId);
    roster.push(personId);
    if (roster.length >= UI009_INTEGRATION_ROUND_ROBIN_MAX) {
      break;
    }
  }
  return roster;
}

function entrantFacts(person: Person, worldYear: number): EntrantCandidateFacts {
  const currentAge =
    person.lifeStatus === "living" ? person.currentAge : worldYear - person.birthYear;
  const participationStatus: ParticipationStatus =
    person.lifeStatus === "living" ? person.participationStatus : "stopped";
  const currentRank: Rank =
    person.careerStatus === "active_competitor" ? (person.currentRank as Rank) : "F";
  return {
    personId: person.personId,
    currentAge,
    lifeStatus: person.lifeStatus,
    participationStatus,
    careerStatus: person.careerStatus,
    currentRank,
  };
}

/**
 * Accepted Sprint2 participant-planning result for the currently exposed
 * F-rank normal tournament. This is shared by preview and production execution
 * so UI009 cannot silently regress to a different two-person selection path.
 */
function buildAcceptedCompetitionParticipantPlanOnSession(
  session: Sprint1RunSession,
  provider: Sha256Provider,
) {
  const config = tinyScheduleConfig();
  const generator = createInitialTournamentIdGeneratorState();
  if (!generator.ok) {
    return null;
  }
  const committed = commitSchedulePlan(
    config,
    DEFAULT_WORLD_CALENDAR_CONFIG,
    session.runtimeState.worldState.worldDate.year,
    generator.value,
  );
  if (committed.kind !== "success") {
    return null;
  }
  const schedule = buildTournamentScheduleReadModel(committed.scheduleState);
  const tournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F");
  if (tournament === undefined) {
    return null;
  }
  const lifecycle = computeScheduleLifecycleIdentity(tournament, provider);
  if (!lifecycle.ok) {
    return null;
  }
  const facts = new Map<PersonId, EntrantCandidateFacts>();
  for (const rawPerson of session.runtimeState.worldState.persons) {
    const person = rawPerson as Person;
    facts.set(person.personId, entrantFacts(person, session.runtimeState.worldState.worldDate.year));
  }
  const policy = createNeutralEntryChoicePolicy(config);
  const list = buildPlannedParticipantList({
    tournamentId: tournament.tournamentId,
    scheduleEntries: schedule,
    candidateFactsByPersonId: facts,
    policy,
    config,
    simulationId: session.context.simulationId,
    runSeed: session.context.simulationIdentity.seed,
    provider,
    expectedScheduleLifecycleIdentity: lifecycle.value,
  });
  let selectedPersonIds: readonly PersonId[];
  if (list.ok && list.value !== null && list.value.selectedPersonIds.length >= 2) {
    selectedPersonIds = list.value.selectedPersonIds;
  } else {
    if (!list.ok) {
      return null;
    }
    const fallback = selectUi009IntegrationFallbackParticipantIds(session);
    if (fallback.length < 2) {
      return null;
    }
    selectedPersonIds = fallback;
  }

  selectedPersonIds = supplementTwoPersonRoundRobinRoster(session, selectedPersonIds);
  return {
    config,
    schedule,
    tournament,
    lifecycle: lifecycle.value,
    policy,
    selectedPersonIds,
  };
}

function resolveUi009PlanningSession(
  session: Sprint1RunSession,
  provider: Sha256Provider,
): Sprint1RunSession {
  const direct = buildAcceptedCompetitionParticipantPlanOnSession(session, provider);
  if (direct !== null && direct.selectedPersonIds.length > 2) {
    return session;
  }
  return projectUi009CompetitionPlanningSession(session);
}

export function buildAcceptedCompetitionParticipantPlan(
  session: Sprint1RunSession,
  provider: Sha256Provider,
) {
  const planningSession = resolveUi009PlanningSession(session, provider);
  const plan = buildAcceptedCompetitionParticipantPlanOnSession(planningSession, provider);
  if (plan === null) {
    return null;
  }
  return { planningSession, plan };
}

/**
 * Player-facing participant preview derived from the exact accepted Sprint2
 * participant plan used by production competition execution.
 */
export function plannedCompetitionParticipantIdsForPreview(
  session: Sprint1RunSession,
  provider: Sha256Provider,
): readonly PersonId[] {
  return buildAcceptedCompetitionParticipantPlan(session, provider)?.plan.selectedPersonIds ?? [];
}
