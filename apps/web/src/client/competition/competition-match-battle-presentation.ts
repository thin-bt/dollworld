import type { MockBattleView } from "../mock-battle/ui006-views.js";
import { MOCK_BATTLE_VIEW_KEYS } from "../mock-battle/ui006-views.js";
import type { BattleLogItemView } from "../battle-log/ui007-views.js";
import type {
  CompetitionBattleLogSummaryView,
  CompetitionMatchDetailView,
} from "./ui009-views.js";

export function mockBattleViewFromCompetitionSummary(
  summary: CompetitionBattleLogSummaryView,
): MockBattleView {
  const base = Object.fromEntries(
    MOCK_BATTLE_VIEW_KEYS.map((key) => [key, null]),
  ) as MockBattleView;
  const endReasonIsJudgeDecision = summary.endReason === "judge_decision";
  return {
    ...base,
    resultUiRevision: 0,
    sourceWorldUiRevision: 0,
    battleResultSchemaVersion: "0.5.0",
    matchId: summary.matchId,
    simulationId: summary.simulationId,
    battleKind: "mock",
    participantAPersonId: summary.participantAPersonId,
    participantBPersonId: summary.participantBPersonId,
    participantAActionSourceIdentity: {},
    participantBActionSourceIdentity: {},
    participantSourceSnapshotHashes: { participantA: "", participantB: "" },
    sourceWorldDate: { year: 0, month: 1, week: 1 },
    battleSeed: 0,
    resultKind: summary.resultKind,
    winnerPersonId: summary.winnerPersonId,
    loserPersonId: summary.loserPersonId,
    endReason: summary.endReason,
    endReasonIsJudgeDecision,
    judgementApplied: endReasonIsJudgeDecision,
    judgeScore: summary.judgeScore,
    turnsExecuted: summary.logTotalCount,
    battleInputHash: "",
    runRuleSnapshotHash: "",
    sprint1ConfigVersion: "",
    sprint1ConfigHash: "",
    techniqueCatalogDataVersion: "",
    techniqueCatalogHash: "",
    finalState: summary.finalState,
    finalRngState: { counter: 0 },
    failure: summary.resultKind === "failed" ? { code: "unknown", severity: "error", targetIds: [], reason: "", canContinue: false } : null,
    eventCandidates: [],
    validation: { overallPassed: summary.resultKind !== "failed" },
    logTotalCount: summary.logTotalCount,
    replayAvailable: true,
  };
}

export function battleLogItemsFromDetail(
  detail: CompetitionMatchDetailView,
): readonly BattleLogItemView[] {
  return detail.logItems as BattleLogItemView[];
}
