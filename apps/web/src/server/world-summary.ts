import {
  HASH_ALGORITHM,
  type RunRuleSnapshot,
  type SimulationIdentity,
  type Sprint1RunSession,
  type WorldDate,
} from "@shared-world/simulation-core";
import type { RunInitializationSnapshot } from "./run-init.js";

export type WorldDateView = {
  year: number;
  month: number;
  week: number;
};

export type SpecVersionView = {
  specSetId: string;
  version: string;
};

export type WorldSummaryView = {
  simulationId: string;
  seed: number;
  initialProfileId: string;
  initialWorldConfigHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  nameDataVersion: string;
  nameDataHash: string;
  simulationIdentitySchemaVersion: "0.5.0";
  specVersions: SpecVersionView[];
  rngAlgorithmVersion: string;
  canonicalJsonVersion: string;
  battleProfileAdapterVersion: string;
  matchIdGeneratorVersion: string;
  initialMatchIdGeneratorStateHash: string;
  defaultBattleStrategyVersion: string;
  hashAlgorithm: "SHA-256";
  worldCalendarConfigHash: string;
  yearStartProcessorManifestHash: string;
  simulationIdentityHash: string;
  runRuleSnapshotSchemaVersion: "0.5.0";
  runRuleSnapshotHash: string;
  worldYearStartMonth: number;
  worldDate: WorldDateView;
  elapsedWeeks: number;
  personCount: number;
};

export function toWorldDateView(date: WorldDate): WorldDateView {
  return {
    year: date.year,
    month: date.month,
    week: date.weekOfMonth,
  };
}

export function buildWorldSummaryView(input: {
  runInitializationSnapshot: RunInitializationSnapshot;
  runtime: Sprint1RunSession;
}): WorldSummaryView {
  const snap = input.runInitializationSnapshot;
  const identity: SimulationIdentity = snap.simulationIdentity;
  const rules: RunRuleSnapshot = snap.runRuleSnapshot;
  const runtimeId = input.runtime.context.simulationId;
  if (runtimeId !== rules.simulationId) {
    throw new Error("WorldSummary simulationId cross-reference failure");
  }
  if (snap.simulationIdentityHash !== input.runtime.context.simulationIdentityHash) {
    throw new Error("WorldSummary simulationIdentityHash cross-reference failure");
  }
  if (snap.runRuleSnapshotHash !== input.runtime.context.runRuleSnapshotHash) {
    throw new Error("WorldSummary runRuleSnapshotHash cross-reference failure");
  }
  if (identity.schemaVersion !== "0.5.0") {
    throw new Error("simulationIdentitySchemaVersion must be 0.5.0");
  }
  if (rules.schemaVersion !== "0.5.0") {
    throw new Error("runRuleSnapshotSchemaVersion must be 0.5.0");
  }
  const worldDate = input.runtime.runtimeState.worldState.worldDate;
  const personCount = input.runtime.runtimeState.worldState.persons.length;
  return {
    simulationId: runtimeId,
    seed: snap.seed,
    initialProfileId: snap.initialWorldConfig.profileId,
    initialWorldConfigHash: snap.initialWorldConfigHash,
    sprint1ConfigVersion: rules.sprint1ConfigVersion,
    sprint1ConfigHash: rules.sprint1ConfigHash,
    techniqueCatalogDataVersion: rules.techniqueCatalogDataVersion,
    techniqueCatalogHash: rules.techniqueCatalogHash,
    nameDataVersion: snap.nameDataVersion,
    nameDataHash: snap.nameDataHash,
    simulationIdentitySchemaVersion: "0.5.0",
    specVersions: identity.specVersions.map((entry) => ({
      specSetId: entry.specSetId,
      version: entry.version,
    })),
    rngAlgorithmVersion: identity.rngAlgorithmVersion,
    canonicalJsonVersion: identity.canonicalJsonVersion,
    battleProfileAdapterVersion: identity.battleProfileAdapterVersion,
    matchIdGeneratorVersion: identity.matchIdGeneratorVersion,
    initialMatchIdGeneratorStateHash: identity.initialMatchIdGeneratorStateHash,
    defaultBattleStrategyVersion: identity.defaultBattleStrategyVersion,
    hashAlgorithm: HASH_ALGORITHM,
    worldCalendarConfigHash: identity.worldCalendarConfigHash,
    yearStartProcessorManifestHash: identity.yearStartProcessorManifestHash,
    simulationIdentityHash: snap.simulationIdentityHash,
    runRuleSnapshotSchemaVersion: "0.5.0",
    runRuleSnapshotHash: snap.runRuleSnapshotHash,
    worldYearStartMonth: rules.worldCalendar.worldYearStartMonth,
    worldDate: toWorldDateView(worldDate),
    elapsedWeeks: worldDate.absoluteWeek,
    personCount,
  };
}

export type SimulationMutationView = {
  acceptedUiRevision: number;
  completedUiRevision: number;
  operation: "start" | "step" | "reset";
  outcome: "success" | "partial_failure";
  requestedWeeks: number;
  committedWeeks: number;
  failedWeek: null | {
    requestWeekIndex: number;
    worldDateBeforeStep: WorldDateView;
    validation: Record<string, unknown>[];
  };
  eventCount: number;
  statIncreaseCount: number;
  techniqueLearnedCount: number;
  validationResultCount: number;
  mockBattleCount: 0;
  durationMs: number;
  summary: WorldSummaryView;
};

const MUTATION_KEYS = [
  "acceptedUiRevision",
  "completedUiRevision",
  "operation",
  "outcome",
  "requestedWeeks",
  "committedWeeks",
  "failedWeek",
  "eventCount",
  "statIncreaseCount",
  "techniqueLearnedCount",
  "validationResultCount",
  "mockBattleCount",
  "durationMs",
  "summary",
] as const;

export function assertSimulationMutationView(view: SimulationMutationView): void {
  const keys = Object.keys(view);
  if (keys.length !== 14) {
    throw new Error(`SimulationMutationView must have exact14 keys, got ${String(keys.length)}`);
  }
  for (const key of MUTATION_KEYS) {
    if (!(key in view)) {
      throw new Error(`SimulationMutationView missing ${key}`);
    }
  }
  if (view.mockBattleCount !== 0) {
    throw new Error("mockBattleCount must be 0");
  }
  if (view.operation === "start" || view.operation === "reset") {
    if (view.outcome !== "success" || view.requestedWeeks !== 0 || view.committedWeeks !== 0) {
      throw new Error("start/reset mutation invariants violated");
    }
    if (view.failedWeek !== null) {
      throw new Error("start/reset failedWeek must be null");
    }
    if (view.completedUiRevision !== view.acceptedUiRevision + 1) {
      throw new Error("start/reset completedUiRevision mismatch");
    }
  }
  if (view.operation === "step" && view.outcome === "success") {
    if (view.committedWeeks !== view.requestedWeeks || view.failedWeek !== null) {
      throw new Error("step success invariants violated");
    }
    if (view.completedUiRevision !== view.acceptedUiRevision + view.committedWeeks) {
      throw new Error("step success completedUiRevision mismatch");
    }
  }
  if (view.operation === "step" && view.outcome === "partial_failure") {
    if (
      view.requestedWeeks < 2 ||
      view.committedWeeks < 0 ||
      view.committedWeeks >= view.requestedWeeks ||
      view.failedWeek === null
    ) {
      throw new Error("step partial_failure invariants violated");
    }
    if (view.failedWeek.requestWeekIndex !== view.committedWeeks + 1) {
      throw new Error("failedWeek.requestWeekIndex mismatch");
    }
    if (
      view.failedWeek.worldDateBeforeStep.year !== view.summary.worldDate.year ||
      view.failedWeek.worldDateBeforeStep.month !== view.summary.worldDate.month ||
      view.failedWeek.worldDateBeforeStep.week !== view.summary.worldDate.week
    ) {
      throw new Error("failedWeek.worldDateBeforeStep must equal summary.worldDate");
    }
    if (view.completedUiRevision !== view.acceptedUiRevision + view.committedWeeks) {
      throw new Error("partial completedUiRevision mismatch");
    }
  }
}

export function countOperationAggregates(input: {
  events: readonly { eventType: string; payload?: unknown }[];
  validationResultCount: number;
}): {
  eventCount: number;
  statIncreaseCount: number;
  techniqueLearnedCount: number;
  validationResultCount: number;
} {
  let statIncreaseCount = 0;
  let techniqueLearnedCount = 0;
  for (const event of input.events) {
    if (event.eventType === "training.stat_growth_applied") {
      const payload = event.payload as { before?: number; after?: number } | undefined;
      if (
        payload !== undefined &&
        typeof payload.before === "number" &&
        typeof payload.after === "number" &&
        payload.after - payload.before > 0
      ) {
        statIncreaseCount += 1;
      }
    }
    if (event.eventType === "technique.acquired") {
      techniqueLearnedCount += 1;
    }
  }
  return {
    eventCount: input.events.length,
    statIncreaseCount,
    techniqueLearnedCount,
    validationResultCount: input.validationResultCount,
  };
}
