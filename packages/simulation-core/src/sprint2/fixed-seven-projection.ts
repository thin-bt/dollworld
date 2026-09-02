/**
 * S02-011 Sprint2 initial-world / final-world fixed-seven projections.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { RunId, SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { InitialWorldSnapshot } from "../initial-world/types.js";
import { EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1 } from "../sprint1/event-envelope-sprint1.js";
import type { AnnualEarningsLedger } from "./annual-earnings.js";
import { projectAnnualRanking } from "./annual-ranking.js";
import type { AnnualRankingHistoryStore } from "./annual-ranking-history.js";
import type { CompetitiveRecord } from "./competitive-record-update.js";
import {
  FIXED_SEVEN_OUTPUT_FILE_NAMES,
  SPRINT2_FINAL_WORLD_DOCUMENT_SCHEMA_VERSION,
  SPRINT2_INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION,
  SPRINT2_PERFORMANCE_DOCUMENT_SCHEMA_VERSION,
  SPRINT2_RUN_METADATA_DOCUMENT_SCHEMA_VERSION,
  SPRINT2_VALIDATION_REPORT_DOCUMENT_SCHEMA_VERSION,
  WORLD_WEEK_EXECUTION_PHASES,
} from "./constants.js";
import type { DetailedLogPayloadStore } from "./detailed-log-payload-store.js";
import {
  materializeStoredBattleResultView,
  rejectPrunedDetailedLogProjection,
  type MaterializedBattleResultView,
} from "./stored-battle-result-materialization.js";
import type { StoredBattleResultRecord } from "./stored-battle-result.js";
import type { Sprint2CheckpointRunContext } from "./sprint2-checkpoint-context.js";
import type { CommittedPromotionRegistry } from "./rank-promotion-result.js";
import type { SQualificationHistory } from "./s-qualification-history.js";
import type { PersonRankHistory } from "./person-rank-history.js";
import type { TournamentFinalResult } from "./tournament-final-result.js";
import type { TournamentScheduleState } from "./types.js";
import type { Sprint2EventEnvelope } from "./tournament-event-envelope-sprint2.js";
import { sprint2EventsToJsonl } from "./tournament-event-envelope-sprint2.js";
import { measureUtf8Bytes } from "./fixed-seven-serializer.js";

export type Sprint2InitialWorldDocument = {
  schemaVersion: typeof SPRINT2_INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION;
  simulationSpecVersion: string;
  nameDataVersion: string;
  simulationId: SimulationId;
  worldCalendarConfigHash: string;
  sprint2ConfigHash: string;
  executionPhase: (typeof WORLD_WEEK_EXECUTION_PHASES)[number];
  initialWorldSnapshot: InitialWorldSnapshot;
  tournamentScheduleState: TournamentScheduleState | null;
};

export type Sprint2FinalWorldMaterializedBattleResult = {
  matchId: MaterializedBattleResultView["storedRecord"]["matchId"];
  storedRecord: StoredBattleResultRecord;
  detailedLog: MaterializedBattleResultView["detailedLog"];
};

export type Sprint2FinalWorldDocument = {
  schemaVersion: typeof SPRINT2_FINAL_WORLD_DOCUMENT_SCHEMA_VERSION;
  simulationId: SimulationId;
  executionPhase: (typeof WORLD_WEEK_EXECUTION_PHASES)[number];
  tournamentFinalResults: readonly TournamentFinalResult[];
  competitiveRecords: readonly CompetitiveRecord[];
  rankPromotionResults: CommittedPromotionRegistry;
  personRankHistories: readonly PersonRankHistory[];
  sQualificationHistory: SQualificationHistory;
  materializedBattleResults: readonly Sprint2FinalWorldMaterializedBattleResult[];
  finalEventSequence: number | null;
};

export type Sprint2RunMetadataDocument = {
  schemaVersion: typeof SPRINT2_RUN_METADATA_DOCUMENT_SCHEMA_VERSION;
  runId: RunId;
  simulationId: SimulationId;
  eventEnvelopeSchemaVersion: typeof EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1;
  outputFiles: readonly { fileName: string; relativePath: string }[];
  termination: { kind: "completed" } | { kind: "failed"; reason: string };
};

export type Sprint2ValidationReportDocument = {
  schemaVersion: typeof SPRINT2_VALIDATION_REPORT_DOCUMENT_SCHEMA_VERSION;
  overallPassed: boolean;
  checks: readonly { name: string; passed: boolean; detail?: string }[];
};

export type Sprint2PerformanceDocument = {
  schemaVersion: typeof SPRINT2_PERFORMANCE_DOCUMENT_SCHEMA_VERSION;
  eventCount: number;
  storedBattleResultCount: number;
  outputFileCount: number;
  totalOutputBytes: number;
};

export type Sprint2FixedSevenProjectionInput = {
  runId: RunId;
  context: Sprint2CheckpointRunContext;
  initialWorldSnapshot: InitialWorldSnapshot;
  tournamentScheduleState: TournamentScheduleState | null;
  tournamentFinalResults: readonly TournamentFinalResult[];
  competitiveRecords: readonly CompetitiveRecord[];
  rankPromotionResults: CommittedPromotionRegistry;
  personRankHistories: readonly PersonRankHistory[];
  sQualificationHistory: SQualificationHistory;
  events: readonly Sprint2EventEnvelope[];
  earningsLedger: AnnualEarningsLedger;
  annualRankingHistoryStore: AnnualRankingHistoryStore;
  worldYear: number;
};

export type FixedSevenRunOutput = Record<
  (typeof FIXED_SEVEN_OUTPUT_FILE_NAMES)[number],
  string
>;

export function projectSprint2InitialWorldDocument(
  input: Pick<
    Sprint2FixedSevenProjectionInput,
    "context" | "initialWorldSnapshot" | "tournamentScheduleState"
  >,
): Sprint2InitialWorldDocument {
  const session = input.context.session;
  return deepFreezePlainJson({
    schemaVersion: SPRINT2_INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION,
    simulationSpecVersion: session.runtimeState.worldState.simulationSpecVersion,
    nameDataVersion: session.runtimeState.worldState.nameDataVersion,
    simulationId: session.context.simulationId,
    worldCalendarConfigHash: session.context.simulationIdentity.worldCalendarConfigHash,
    sprint2ConfigHash: session.context.simulationIdentity.sprint2ConfigHash,
    executionPhase: input.context.executionState.phase,
    initialWorldSnapshot: input.initialWorldSnapshot,
    tournamentScheduleState: input.tournamentScheduleState,
  });
}

export function materializeFinalWorldBattleResults(
  records: readonly StoredBattleResultRecord[],
  payloadStore: DetailedLogPayloadStore,
  provider: Sha256Provider,
): ValidationResult<readonly Sprint2FinalWorldMaterializedBattleResult[]> {
  const materialized: Sprint2FinalWorldMaterializedBattleResult[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const view = materializeStoredBattleResultView(records[index]!, payloadStore, provider);
    if (!view.ok) {
      return failure(
        view.issues.map((issue) => ({
          ...issue,
          path: issue.path === "" ? `/materializedBattleResults/${String(index)}` : `/materializedBattleResults/${String(index)}${issue.path}`,
        })),
      );
    }
    const prunedCheck = rejectPrunedDetailedLogProjection(view.value);
    if (!prunedCheck.ok) {
      return failure(
        prunedCheck.issues.map((issue) => ({
          ...issue,
          path: `/materializedBattleResults/${String(index)}${issue.path}`,
        })),
      );
    }
    materialized.push({
      matchId: view.value.storedRecord.matchId,
      storedRecord: view.value.storedRecord,
      detailedLog: view.value.detailedLog,
    });
  }
  return success(deepFreezePlainJson(materialized));
}

export function projectSprint2FinalWorldDocument(
  input: Pick<
    Sprint2FixedSevenProjectionInput,
    | "context"
    | "tournamentFinalResults"
    | "competitiveRecords"
    | "rankPromotionResults"
    | "personRankHistories"
    | "sQualificationHistory"
    | "events"
  >,
  materializedBattleResults: readonly Sprint2FinalWorldMaterializedBattleResult[],
): Sprint2FinalWorldDocument {
  const finalEventSequence =
    input.events.length === 0 ? null : input.events[input.events.length - 1]!.sequence;
  return deepFreezePlainJson({
    schemaVersion: SPRINT2_FINAL_WORLD_DOCUMENT_SCHEMA_VERSION,
    simulationId: input.context.session.context.simulationId,
    executionPhase: input.context.executionState.phase,
    tournamentFinalResults: input.tournamentFinalResults,
    competitiveRecords: input.competitiveRecords,
    rankPromotionResults: input.rankPromotionResults,
    personRankHistories: input.personRankHistories,
    sQualificationHistory: input.sQualificationHistory,
    materializedBattleResults,
    finalEventSequence,
  });
}

function buildYearlyStatisticsCsv(input: Sprint2FixedSevenProjectionInput): string {
  const ranking = projectAnnualRanking({
    worldYear: input.worldYear,
    ledger: input.earningsLedger,
    competitiveRecords: new Map(input.competitiveRecords.map((record) => [record.personId, record])),
  });
  if (!ranking.ok) {
    throw new Error(`annual ranking projection failed: ${JSON.stringify(ranking.issues)}`);
  }
  const header = [
    "worldYear",
    "personId",
    "annualRank",
    "yearlyCumulativeEarnings",
    "currentRank",
    "tournamentAppearances",
    "tournamentWins",
    "officialWins",
    "officialLosses",
  ];
  const rows = ranking.value.map((row) =>
    [
      String(row.worldYear),
      row.personId,
      String(row.annualRank),
      String(row.yearlyCumulativeEarnings),
      row.currentRank,
      String(row.tournamentAppearances),
      String(row.tournamentWins),
      String(row.officialWins),
      String(row.officialLosses),
    ].join(","),
  );
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

export function buildSprint2FixedSevenRunOutput(
  input: Sprint2FixedSevenProjectionInput,
  provider: Sha256Provider,
): ValidationResult<FixedSevenRunOutput> {
  const materialized = materializeFinalWorldBattleResults(
    input.context.retainedRecords,
    input.context.payloadStore,
    provider,
  );
  if (!materialized.ok) {
    return materialized as ValidationResult<FixedSevenRunOutput>;
  }

  const initialWorld = projectSprint2InitialWorldDocument(input);
  const finalWorld = projectSprint2FinalWorldDocument(input, materialized.value);
  const eventsJsonl = sprint2EventsToJsonl(input.events);
  const yearlyStatistics = buildYearlyStatisticsCsv(input);

  const runMetadata: Sprint2RunMetadataDocument = {
    schemaVersion: SPRINT2_RUN_METADATA_DOCUMENT_SCHEMA_VERSION,
    runId: input.runId,
    simulationId: input.context.session.context.simulationId,
    eventEnvelopeSchemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
    outputFiles: FIXED_SEVEN_OUTPUT_FILE_NAMES.map((fileName) => ({
      fileName,
      relativePath: fileName,
    })),
    termination: { kind: "completed" },
  };

  const validationReport: Sprint2ValidationReportDocument = {
    schemaVersion: SPRINT2_VALIDATION_REPORT_DOCUMENT_SCHEMA_VERSION,
    overallPassed: true,
    checks: [{ name: "fixed-seven-projection", passed: true }],
  };

  const otherContents = {
    "run-metadata.json": `${toCanonicalJson(runMetadata)}\n`,
    "initial-world.json": `${toCanonicalJson(initialWorld)}\n`,
    "final-world.json": `${toCanonicalJson(finalWorld)}\n`,
    "yearly-statistics.csv": yearlyStatistics,
    "events.jsonl": eventsJsonl,
    "validation-report.json": `${toCanonicalJson(validationReport)}\n`,
  } as const;

  const totalOutputBytes = Object.values(otherContents).reduce(
    (sum, text) => sum + measureUtf8Bytes(text),
    0,
  );

  const performance: Sprint2PerformanceDocument = {
    schemaVersion: SPRINT2_PERFORMANCE_DOCUMENT_SCHEMA_VERSION,
    eventCount: input.events.length,
    storedBattleResultCount: input.context.retainedRecords.length,
    outputFileCount: FIXED_SEVEN_OUTPUT_FILE_NAMES.length,
    totalOutputBytes,
  };

  const performanceText = `${toCanonicalJson({ ...performance, totalOutputBytes: totalOutputBytes + measureUtf8Bytes(toCanonicalJson(performance)) })}\n`;

  return success({
    ...otherContents,
    "performance.json": performanceText,
  });
}

export type ProjectionMutationGuardInput = {
  beforeRecords: readonly StoredBattleResultRecord[];
  afterRecords: readonly StoredBattleResultRecord[];
};

export function rejectFixedSevenProjectionMutation(
  input: ProjectionMutationGuardInput,
): ValidationResult<true> {
  const issues: ValidationIssue[] = [];
  if (input.beforeRecords.length !== input.afterRecords.length) {
    issues.push({
      path: "/retainedRecords",
      message: "serializer must not mutate retained record count",
      actual: input.afterRecords.length,
      expected: String(input.beforeRecords.length),
    });
  }
  for (let index = 0; index < input.beforeRecords.length; index += 1) {
    const before = input.beforeRecords[index]!;
    const after = input.afterRecords[index];
    if (after === undefined) {
      continue;
    }
    if (before.detailedLogRetentionStatus !== after.detailedLogRetentionStatus) {
      issues.push({
        path: `/retainedRecords/${String(index)}/detailedLogRetentionStatus`,
        message: "serializer must not mutate retention status",
        actual: after.detailedLogRetentionStatus,
        expected: before.detailedLogRetentionStatus,
      });
    }
    if (before.storedRecordHash !== after.storedRecordHash) {
      issues.push({
        path: `/retainedRecords/${String(index)}/storedRecordHash`,
        message: "serializer must not mutate stored record identity",
        actual: after.storedRecordHash,
        expected: before.storedRecordHash,
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(true);
}
