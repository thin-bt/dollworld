/**
 * S02-009 deterministic detailed-log retention planning from Sprint2Config + world year.
 */
import type { BattleKind } from "../sprint1/battle-enums.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { Sha256Provider } from "../sha256-provider.js";
import type { Sprint2Config } from "./types.js";
import {
  withStoredBattleResultRetentionStatus,
  type ImportantBattleMarker,
  type StoredBattleResultRecord,
} from "./stored-battle-result.js";

export type RetentionPolicyClass = "mock_exempt" | "important" | "normal";

export function classifyRetentionPolicy(
  battleKind: BattleKind,
  marker: ImportantBattleMarker | undefined,
): ValidationResult<RetentionPolicyClass> {
  if (battleKind === "mock") {
    return success("mock_exempt");
  }
  if (marker !== undefined && marker.reasons.length > 0) {
    return success("important");
  }
  if (battleKind === "official") {
    return success("normal");
  }
  return failure([
    {
      path: "/battleKind",
      message: "unsupported battle kind for Sprint2 detailed log retention",
      actual: battleKind,
      expected: "official|mock",
    },
  ]);
}

export function resolveDetailedLogRetentionYears(
  config: Sprint2Config,
  policyClass: RetentionPolicyClass,
): ValidationResult<number | "exempt"> {
  switch (policyClass) {
    case "mock_exempt":
      return success("exempt");
    case "important":
      if (config.battleLogRetention.importantDetailedLogWorldYears !== 100) {
        return failure([
          {
            path: "/battleLogRetention/importantDetailedLogWorldYears",
            message: "important detailed log retention must equal fixed literal 100",
            actual: config.battleLogRetention.importantDetailedLogWorldYears,
            expected: "100",
          },
        ]);
      }
      return success(100);
    case "normal":
      return success(config.battleLogRetention.normalDetailedLogWorldYears);
    default: {
      const _exhaustive: never = policyClass;
      return failure([
        {
          path: "/retentionPolicyClass",
          message: "unknown retention policy class",
          actual: _exhaustive,
        },
      ]);
    }
  }
}

export function shouldPruneDetailedLogRecord(
  record: StoredBattleResultRecord,
  currentWorldYear: number,
  config: Sprint2Config,
  battleKind: BattleKind,
): ValidationResult<boolean> {
  if (record.detailedLogRetentionStatus === "pruned") {
    return success(false);
  }
  const policy = classifyRetentionPolicy(battleKind, record.importantBattleMarker);
  if (!policy.ok) {
    return policy;
  }
  const years = resolveDetailedLogRetentionYears(config, policy.value);
  if (!years.ok) {
    return years;
  }
  if (years.value === "exempt") {
    return success(false);
  }
  const resultWorldYear = record.resultWorldDate.year;
  const pruneThresholdYear = currentWorldYear - years.value;
  return success(resultWorldYear < pruneThresholdYear);
}

export function planRetentionPruneUpdates(
  records: readonly StoredBattleResultRecord[],
  currentWorldYear: number,
  config: Sprint2Config,
  battleKindByMatchId: Readonly<Partial<Record<string, BattleKind>>>,
): ValidationResult<readonly { matchId: StoredBattleResultRecord["matchId"]; shouldPrune: boolean }[]> {
  const plan: { matchId: StoredBattleResultRecord["matchId"]; shouldPrune: boolean }[] = [];
  for (const record of records) {
    const battleKind = battleKindByMatchId[record.matchId];
    if (battleKind === undefined) {
      return failure([
        {
          path: `/records/${record.matchId}`,
          message: "missing battle kind binding for retention planning",
          actual: record.matchId,
          expected: "official|mock battle kind",
        },
      ]);
    }
    const shouldPrune = shouldPruneDetailedLogRecord(
      record,
      currentWorldYear,
      config,
      battleKind,
    );
    if (!shouldPrune.ok) {
      return shouldPrune;
    }
    plan.push({ matchId: record.matchId, shouldPrune: shouldPrune.value });
  }
  return success(Object.freeze(plan));
}

export function applyRetentionPrunePlan(
  records: readonly StoredBattleResultRecord[],
  currentWorldYear: number,
  config: Sprint2Config,
  battleKindByMatchId: Readonly<Partial<Record<string, BattleKind>>>,
  provider: Sha256Provider,
): ValidationResult<readonly StoredBattleResultRecord[]> {
  const plan = planRetentionPruneUpdates(
    records,
    currentWorldYear,
    config,
    battleKindByMatchId,
  );
  if (!plan.ok) {
    return plan;
  }
  const next: StoredBattleResultRecord[] = [];
  for (const record of records) {
    const entry = plan.value.find((item) => item.matchId === record.matchId);
    if (entry === undefined || !entry.shouldPrune) {
      next.push(record);
      continue;
    }
    const pruned = withStoredBattleResultRetentionStatus(record, "pruned", provider);
    if (!pruned.ok) {
      return pruned;
    }
    next.push(pruned.value);
  }
  return success(Object.freeze(next));
}

export function isSummaryOrResultPermanent(_record: StoredBattleResultRecord): true {
  // Official result/summary identity (battleResultHash) is never age-pruned; only detailedLog status changes.
  return true;
}
