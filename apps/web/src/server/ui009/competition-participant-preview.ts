import {
  buildPlannedParticipantList,
  buildTournamentScheduleReadModel,
  commitSchedulePlan,
  computeScheduleLifecycleIdentity,
  createInitialTournamentIdGeneratorState,
  createNeutralEntryChoicePolicy,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type EntrantCandidateFacts,
  type Person,
  type PersonId,
  type ParticipationStatus,
  type Rank,
  type Sha256Provider,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { tinyScheduleConfig } from "./competition-engine-schedule-config.js";

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
export function buildAcceptedCompetitionParticipantPlan(
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
  if (!list.ok || list.value === null || list.value.selectedPersonIds.length < 2) {
    return null;
  }
  return {
    config,
    schedule,
    tournament,
    lifecycle: lifecycle.value,
    policy,
    selectedPersonIds: list.value.selectedPersonIds,
  };
}

/**
 * Player-facing participant preview derived from the exact accepted Sprint2
 * participant plan used by production competition execution.
 */
export function plannedCompetitionParticipantIdsForPreview(
  session: Sprint1RunSession,
  provider: Sha256Provider,
): readonly PersonId[] {
  return buildAcceptedCompetitionParticipantPlan(session, provider)?.selectedPersonIds ?? [];
}
