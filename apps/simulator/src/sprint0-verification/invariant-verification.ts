import {
  isLivingPerson,
  validateEventEnvelope,
  validateEventSequence,
  validateInitialWorldSnapshot,
  validateWorldEngineState,
  type InitialWorldConfig,
} from "@shared-world/simulation-core";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";
import { finalWorldToEngineState } from "../output/final-world.js";
import {
  parseYearlyStatisticsCsv,
  YEARLY_STATISTICS_COLUMNS,
} from "../output/yearly-statistics.js";
import { verifyReloadedRunOutputContents } from "../output/verify-run-output.js";
import type { ReferenceIntegrityResult } from "../output/types.js";
import type { Sprint0RunArtifacts } from "./execute-run.js";
import { verifyFixedSevenFilesOnDisk } from "./fixed-seven-files.js";

export type InvariantIssue = {
  name: string;
  targetIds: string[];
  reason: string;
  severity: "error";
  canContinue: boolean;
};

export type InvariantVerificationResult = {
  passed: boolean;
  issues: InvariantIssue[];
};

function issue(name: string, reason: string, targetIds: string[] = []): InvariantIssue {
  return { name, reason, targetIds, severity: "error", canContinue: false };
}

function uniqueOrFail(values: readonly string[], label: string, issues: InvariantIssue[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (value.length === 0) {
      issues.push(issue(`${label}.empty`, `${label} contains empty id`));
      continue;
    }
    if (seen.has(value)) {
      issues.push(issue(`${label}.unique`, `duplicate ${label}`, [value]));
    }
    seen.add(value);
  }
}

function assertCsvLivingInvariants(
  row: Record<string, string>,
  issues: InvariantIssue[],
  year: number,
): void {
  const num = (key: string): number => Number(row[key]);
  const living = num("livingCount");
  const ageSum =
    num("age0To7") + num("age8To15") + num("age16To17") + num("age18To41") + num("age42Plus");
  const careerSum =
    num("childCount") + num("traineeCount") + num("activeCompetitorCount") + num("retiredCount");
  const rankSum =
    num("rankNone") +
    num("rankF") +
    num("rankE") +
    num("rankD") +
    num("rankC") +
    num("rankB") +
    num("rankA") +
    num("rankS");
  if (ageSum !== living) {
    issues.push(issue("csv.ageSum", `year ${String(year)} age bands != livingCount`));
  }
  if (careerSum !== living) {
    issues.push(issue("csv.careerSum", `year ${String(year)} career counts != livingCount`));
  }
  if (rankSum !== living) {
    issues.push(issue("csv.rankSum", `year ${String(year)} rank counts != livingCount`));
  }
}

function verifyIntegrityZero(
  integrity: ReferenceIntegrityResult,
  label: string,
  issues: InvariantIssue[],
): void {
  if (integrity.brokenReferenceCount !== 0) {
    issues.push(
      issue(
        `${label}.brokenReferences`,
        `brokenReferenceCount=${String(integrity.brokenReferenceCount)}`,
        integrity.brokenReferences.flatMap((v) => v.targetIds),
      ),
    );
  }
  if (integrity.invariantViolationCount !== 0) {
    issues.push(
      issue(
        `${label}.invariants`,
        `invariantViolationCount=${String(integrity.invariantViolationCount)}`,
      ),
    );
  }
}

/**
 * Apply Sprint 0 integrated invariant checks to a completed run's artifacts.
 */
export function verifyRunInvariants(
  artifacts: Sprint0RunArtifacts,
  config: InitialWorldConfig,
): InvariantVerificationResult {
  const issues: InvariantIssue[] = [];
  const state = artifacts.simulation.finalState;
  const years = artifacts.years;

  uniqueOrFail(
    state.persons.map((p) => p.personId),
    "personId",
    issues,
  );
  uniqueOrFail(
    state.families.map((f) => f.familyId),
    "familyId",
    issues,
  );
  uniqueOrFail(
    state.lineages.map((l) => l.lineageId),
    "lineageId",
    issues,
  );
  uniqueOrFail(
    state.relationships.map((r) => r.relationshipId),
    "relationshipId",
    issues,
  );
  uniqueOrFail(
    artifacts.allEvents.map((e) => e.eventId),
    "eventId",
    issues,
  );

  try {
    validateEventSequence(artifacts.allEvents, { expectedStartSequence: 0 });
  } catch (error) {
    issues.push(issue("events.sequence", error instanceof Error ? error.message : String(error)));
  }
  for (const event of artifacts.allEvents) {
    try {
      validateEventEnvelope(event);
    } catch (error) {
      issues.push(
        issue("events.envelope", error instanceof Error ? error.message : String(error), [
          event.eventId,
        ]),
      );
    }
  }
  for (let i = 0; i < artifacts.allEvents.length; i += 1) {
    if (artifacts.allEvents[i]!.sequence !== i) {
      issues.push(
        issue("events.contiguous", `sequence gap/duplicate at ${String(i)}`, [
          artifacts.allEvents[i]!.eventId,
        ]),
      );
    }
  }

  verifyIntegrityZero(artifacts.simulation.finalIntegrity, "final", issues);
  for (const yearEnd of artifacts.simulation.yearEnds) {
    verifyIntegrityZero(yearEnd.integrity, `yearEnd.${String(yearEnd.worldYear)}`, issues);
  }

  for (const person of state.persons) {
    if (isLivingPerson(person)) {
      const expectedAge = state.worldDate.year - person.birthYear;
      if (person.currentAge !== expectedAge) {
        issues.push(issue("age.currentAge", `currentAge mismatch`, [person.personId]));
      }
    }
  }

  if (artifacts.simulation.weeksExecuted !== years * 48) {
    issues.push(
      issue(
        "calendar.weeksExecuted",
        `expected ${String(years * 48)}, got ${String(artifacts.simulation.weeksExecuted)}`,
      ),
    );
  }
  if (
    state.worldDate.year !== years + 1 ||
    state.worldDate.month !== 4 ||
    state.worldDate.weekOfMonth !== 1 ||
    state.worldDate.absoluteWeek !== years * 48
  ) {
    issues.push(
      issue("calendar.finalDate", `final date mismatch: ${toCanonicalDate(state.worldDate)}`),
    );
  }

  try {
    validateInitialWorldSnapshot(config, artifacts.initialSnapshot);
  } catch (error) {
    issues.push(
      issue("initialWorld.validate", error instanceof Error ? error.message : String(error)),
    );
  }
  try {
    validateWorldEngineState(finalWorldToEngineState(artifacts.finalWorld));
  } catch (error) {
    issues.push(
      issue("finalWorld.validate", error instanceof Error ? error.message : String(error)),
    );
  }

  try {
    verifyReloadedRunOutputContents(artifacts.fileTexts);
  } catch (error) {
    issues.push(issue("sevenFiles.reload", error instanceof Error ? error.message : String(error)));
  }

  const names = Object.keys(artifacts.fileTexts).sort();
  if (JSON.stringify(names) !== JSON.stringify([...FIXED_OUTPUT_FILE_NAMES].sort())) {
    issues.push(issue("sevenFiles.names", `unexpected file set: ${names.join(",")}`));
  }
  const onDisk = verifyFixedSevenFilesOnDisk(artifacts.runDirectory);
  if (!onDisk.passed) {
    issues.push(...onDisk.issues);
  }

  if (artifacts.validationReport.overallPassed !== true) {
    issues.push(issue("validationReport.overallPassed", "expected overallPassed=true"));
  }
  if (artifacts.runMetadata.termination.kind !== "completed") {
    issues.push(issue("runMetadata.termination", "expected termination.kind=completed"));
  }

  const csv = parseYearlyStatisticsCsv(artifacts.fileTexts["yearly-statistics.csv"]!);
  if (csv.headers.join(",") !== YEARLY_STATISTICS_COLUMNS.join(",")) {
    issues.push(issue("csv.headers", "CSV headers mismatch"));
  }
  if (csv.rows.length !== years) {
    issues.push(
      issue("csv.rowCount", `expected ${String(years)} rows, got ${String(csv.rows.length)}`),
    );
  }
  let previousCumulative = 0;
  for (let i = 0; i < csv.rows.length; i += 1) {
    const row = csv.rows[i]!;
    const worldYear = Number(row["worldYear"]);
    const absoluteWeek = Number(row["absoluteWeek"]);
    if (worldYear !== i + 1) {
      issues.push(issue("csv.worldYear", `expected continuous worldYear at row ${String(i)}`));
    }
    if (absoluteWeek !== (i + 1) * 48) {
      issues.push(issue("csv.absoluteWeek", `absoluteWeek mismatch at year ${String(worldYear)}`));
    }
    assertCsvLivingInvariants(row, issues, worldYear);
    const cumulative = Number(row["eventCountCumulative"]);
    if (cumulative < previousCumulative) {
      issues.push(issue("csv.eventCountCumulative", `not monotonic at year ${String(worldYear)}`));
    }
    previousCumulative = cumulative;
    if (Number(row["brokenReferenceCount"]) !== 0) {
      issues.push(issue("csv.brokenReferenceCount", `non-zero at year ${String(worldYear)}`));
    }
    if (Number(row["invariantViolationCount"]) !== 0) {
      issues.push(issue("csv.invariantViolationCount", `non-zero at year ${String(worldYear)}`));
    }
    const yearEnd = artifacts.simulation.yearEnds[i];
    if (yearEnd !== undefined) {
      if (Number(row["brokenReferenceCount"]) !== yearEnd.integrity.brokenReferenceCount) {
        issues.push(issue("csv.brokenReferenceCount.match", `mismatch year ${String(worldYear)}`));
      }
      if (Number(row["invariantViolationCount"]) !== yearEnd.integrity.invariantViolationCount) {
        issues.push(
          issue("csv.invariantViolationCount.match", `mismatch year ${String(worldYear)}`),
        );
      }
      if (Number(row["familyCount"]) !== yearEnd.state.families.length) {
        issues.push(issue("csv.familyCount", `mismatch year ${String(worldYear)}`));
      }
      if (Number(row["lineageCount"]) !== yearEnd.state.lineages.length) {
        issues.push(issue("csv.lineageCount", `mismatch year ${String(worldYear)}`));
      }
    }
  }
  if (csv.rows.length > 0) {
    const last = csv.rows[csv.rows.length - 1]!;
    if (Number(last["eventCountCumulative"]) !== artifacts.allEvents.length) {
      issues.push(
        issue(
          "csv.finalEventCount",
          `cumulative ${last["eventCountCumulative"] ?? ""} != events ${String(artifacts.allEvents.length)}`,
        ),
      );
    }
  }

  if (artifacts.finalWorld.finalEventSequence !== null) {
    const last = artifacts.allEvents[artifacts.allEvents.length - 1];
    if (last === undefined || artifacts.finalWorld.finalEventSequence !== last.sequence) {
      issues.push(issue("finalEventSequence", "finalEventSequence mismatch vs events.jsonl"));
    }
  } else if (artifacts.allEvents.length !== 0) {
    issues.push(issue("finalEventSequence", "finalEventSequence null but events exist"));
  }

  // Recompute disciple stats for final year-end if present
  const lastYear = artifacts.simulation.yearEnds[artifacts.simulation.yearEnds.length - 1];
  if (lastYear !== undefined) {
    const recomputed = recomputeMasterStats(lastYear.state);
    if (recomputed.qualifiedMasterCount !== lastYear.row.qualifiedMasterCount) {
      issues.push(issue("master.qualifiedMasterCount", "mismatch vs recomputation"));
    }
    if (recomputed.mastersWithDisciplesCount !== lastYear.row.mastersWithDisciplesCount) {
      issues.push(issue("master.mastersWithDisciplesCount", "mismatch vs recomputation"));
    }
    if (recomputed.maximumDiscipleCount !== lastYear.row.maximumDiscipleCount) {
      issues.push(issue("master.maximumDiscipleCount", "mismatch vs recomputation"));
    }
  }

  return { passed: issues.length === 0, issues };
}

function toCanonicalDate(date: {
  year: number;
  month: number;
  weekOfMonth: number;
  absoluteWeek: number;
}): string {
  return `${String(date.year)}-${String(date.month)}-W${String(date.weekOfMonth)}@${String(date.absoluteWeek)}`;
}

function recomputeMasterStats(state: Sprint0RunArtifacts["simulation"]["finalState"]): {
  qualifiedMasterCount: number;
  mastersWithDisciplesCount: number;
  maximumDiscipleCount: number;
} {
  const discipleCountByMaster = new Map<string, number>();
  for (const rel of state.relationships) {
    if (rel.kind === "master_disciple") {
      discipleCountByMaster.set(rel.masterId, (discipleCountByMaster.get(rel.masterId) ?? 0) + 1);
    }
  }
  let qualifiedMasterCount = 0;
  let mastersWithDisciplesCount = 0;
  let maximumDiscipleCount = 0;
  for (const person of state.persons) {
    if (!person.qualifiedMaster) {
      continue;
    }
    qualifiedMasterCount += 1;
    const disciples = discipleCountByMaster.get(person.personId) ?? 0;
    if (disciples > 0) {
      mastersWithDisciplesCount += 1;
    }
    if (disciples > maximumDiscipleCount) {
      maximumDiscipleCount = disciples;
    }
  }
  return { qualifiedMasterCount, mastersWithDisciplesCount, maximumDiscipleCount };
}

export type NegativeCaseResult = {
  name: string;
  failedAsExpected: boolean;
  issues: InvariantIssue[];
};
