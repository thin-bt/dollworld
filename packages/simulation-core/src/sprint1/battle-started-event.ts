/**
 * `battle.started` event candidate (11 mini-spec §15 / S01-005).
 *
 * Like every Sprint 1 processor candidate this carries no `eventId`,
 * `simulationId`, or `sequence`: the shared append layer assigns those once every
 * processor of the week has succeeded (12 §23.2).
 */
import type { MatchId, PersonId } from "../ids.js";
import type { WorldDate } from "../world-date.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import type { BattleKind } from "./battle-enums.js";
import type { BattleState } from "./battle-state.js";
import { deepFreezePlainJson } from "./plain-data.js";
import type { BattleRange } from "./types.js";

export const BATTLE_STARTED_EVENT_TYPE = "battle.started" as const;
export const BATTLE_SIMULATION_SOURCE_PROCESSOR = "battle-simulation" as const;

export type BattleStartedEventPayload = {
  matchId: MatchId;
  battleKind: BattleKind;
  participantAId: PersonId;
  participantBId: PersonId;
  worldDate: WorldDate;
  initialRange: BattleRange;
  battleSeed: number;
  participantSnapshotHashes: { sideA: string; sideB: string };
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  battleRulesRefHash: string;
  runRuleSnapshotHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  battleInputHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  maxTurns: number;
};

export type BattleStartedEventCandidate = {
  eventType: typeof BATTLE_STARTED_EVENT_TYPE;
  sourceProcessor: typeof BATTLE_SIMULATION_SOURCE_PROCESSOR;
  worldDate: WorldDate;
  entities: {
    personIds: readonly PersonId[];
    matchIds: readonly MatchId[];
  };
  payload: BattleStartedEventPayload;
};

/**
 * Built once, at the `ready` → `in_progress` transition. Every value is read back
 * out of the already validated `BattleState`, so the candidate can never drift
 * from the state it describes.
 */
export function createBattleStartedEventCandidate(
  battleState: BattleState,
): BattleStartedEventCandidate {
  const ref = battleState.battleRulesSnapshotRef;
  return deepFreezePlainJson({
    eventType: BATTLE_STARTED_EVENT_TYPE,
    sourceProcessor: BATTLE_SIMULATION_SOURCE_PROCESSOR,
    worldDate: battleState.worldDate,
    entities: {
      personIds: [battleState.participantA.personId, battleState.participantB.personId],
      matchIds: [battleState.matchId],
    },
    payload: {
      matchId: battleState.matchId,
      battleKind: battleState.battleKind,
      participantAId: battleState.participantA.personId,
      participantBId: battleState.participantB.personId,
      worldDate: battleState.worldDate,
      initialRange: battleState.initialRange,
      battleSeed: battleState.battleSeed,
      participantSnapshotHashes: {
        sideA: battleState.participantA.sourceSnapshotHash,
        sideB: battleState.participantB.sourceSnapshotHash,
      },
      participantAActionSourceIdentity: battleState.participantAActionSourceIdentity,
      participantBActionSourceIdentity: battleState.participantBActionSourceIdentity,
      battleRulesRefHash: battleState.battleRulesRefHash,
      runRuleSnapshotHash: battleState.runRuleSnapshotHash,
      sprint1ConfigVersion: ref.sprint1ConfigVersion,
      sprint1ConfigHash: ref.sprint1ConfigHash,
      battleInputHash: battleState.battleInputHash,
      techniqueCatalogDataVersion: ref.techniqueCatalogDataVersion,
      techniqueCatalogHash: ref.techniqueCatalogHash,
      maxTurns: battleState.maxTurns,
    },
  });
}
