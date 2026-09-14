import {
  createDefaultStrategyActionSourceIdentity,
  type BattleActionSourceIdentity,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";

export function defaultTournamentBattleActionIdentity(
  session: Sprint1RunSession,
): BattleActionSourceIdentity {
  const built = createDefaultStrategyActionSourceIdentity({
    strategyVersion: session.context.runRuleSnapshot.defaultBattleStrategyVersion,
    strategyConfigHash: session.context.runRuleSnapshot.sprint1ConfigHash,
  });
  if (!built.ok) {
    throw new Error("default strategy action source identity failed");
  }
  return built.value;
}

export function defaultCompetitionRuleHash(session: Sprint1RunSession): string {
  return session.context.simulationIdentity.competitionDomainRegistryHash;
}
