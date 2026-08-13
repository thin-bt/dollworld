import type { Person, Relationship, WorldEngineState } from "@shared-world/simulation-core";
import { isLivingPerson } from "@shared-world/simulation-core";
import type { ReferenceIntegrityResult } from "./types.js";

export const YEARLY_STATISTICS_COLUMNS = [
  "worldYear",
  "absoluteWeek",
  "livingCount",
  "deceasedRecordCount",
  "age0To7",
  "age8To15",
  "age16To17",
  "age18To41",
  "age42Plus",
  "childCount",
  "traineeCount",
  "activeCompetitorCount",
  "retiredCount",
  "waitingCount",
  "stoppedCount",
  "rankNone",
  "rankF",
  "rankE",
  "rankD",
  "rankC",
  "rankB",
  "rankA",
  "rankS",
  "familyCount",
  "lineageCount",
  "parentChildRelationshipCount",
  "marriageCount",
  "masterDiscipleRelationshipCount",
  "qualifiedMasterCount",
  "mastersWithDisciplesCount",
  "averageDiscipleCount",
  "maximumDiscipleCount",
  "eventCountThisYear",
  "eventCountCumulative",
  "brokenReferenceCount",
  "invariantViolationCount",
] as const;

export type YearlyStatisticsColumn = (typeof YEARLY_STATISTICS_COLUMNS)[number];

export type YearlyStatisticsRow = {
  worldYear: number;
  /** Target-year terminal week (= worldYear * 48 - 1). Event worldDate stays next-year start. */
  absoluteWeek: number;
  livingCount: number;
  deceasedRecordCount: number;
  age0To7: number;
  age8To15: number;
  age16To17: number;
  age18To41: number;
  age42Plus: number;
  childCount: number;
  traineeCount: number;
  activeCompetitorCount: number;
  retiredCount: number;
  waitingCount: number;
  stoppedCount: number;
  rankNone: number;
  rankF: number;
  rankE: number;
  rankD: number;
  rankC: number;
  rankB: number;
  rankA: number;
  rankS: number;
  familyCount: number;
  lineageCount: number;
  parentChildRelationshipCount: number;
  marriageCount: number;
  masterDiscipleRelationshipCount: number;
  qualifiedMasterCount: number;
  mastersWithDisciplesCount: number;
  averageDiscipleCount: number;
  maximumDiscipleCount: number;
  eventCountThisYear: number;
  eventCountCumulative: number;
  brokenReferenceCount: number;
  invariantViolationCount: number;
};

const WEEKS_PER_YEAR = 48;

function formatCsvNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`CSV number must be finite, got ${String(value)}`);
  }
  if (Object.is(value, -0)) {
    return "0";
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  // Avoid exponential notation for typical average counts.
  const text = value.toFixed(12).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function countRelationships(relationships: readonly Relationship[]): {
  parentChildRelationshipCount: number;
  marriageCount: number;
  masterDiscipleRelationshipCount: number;
} {
  let parentChildRelationshipCount = 0;
  let marriageCount = 0;
  let masterDiscipleRelationshipCount = 0;
  for (const rel of relationships) {
    if (rel.kind === "parent_child") {
      parentChildRelationshipCount += 1;
    } else if (rel.kind === "marriage") {
      marriageCount += 1;
    } else {
      masterDiscipleRelationshipCount += 1;
    }
  }
  return {
    parentChildRelationshipCount,
    marriageCount,
    masterDiscipleRelationshipCount,
  };
}

function computeMasterStats(persons: readonly Person[], relationships: readonly Relationship[]) {
  const discipleCountByMaster = new Map<string, number>();
  for (const rel of relationships) {
    if (rel.kind === "master_disciple") {
      discipleCountByMaster.set(rel.masterId, (discipleCountByMaster.get(rel.masterId) ?? 0) + 1);
    }
  }

  let qualifiedMasterCount = 0;
  let mastersWithDisciplesCount = 0;
  let totalDisciplesAmongQualified = 0;
  let maximumDiscipleCount = 0;

  for (const person of persons) {
    if (!person.qualifiedMaster) {
      continue;
    }
    qualifiedMasterCount += 1;
    const disciples = discipleCountByMaster.get(person.personId) ?? 0;
    if (disciples > 0) {
      mastersWithDisciplesCount += 1;
    }
    totalDisciplesAmongQualified += disciples;
    if (disciples > maximumDiscipleCount) {
      maximumDiscipleCount = disciples;
    }
  }

  const averageDiscipleCount =
    qualifiedMasterCount === 0 ? 0 : totalDisciplesAmongQualified / qualifiedMasterCount;

  return {
    qualifiedMasterCount,
    mastersWithDisciplesCount,
    averageDiscipleCount,
    maximumDiscipleCount,
  };
}

export function aggregateYearlyStatisticsRow(input: {
  yearEndState: WorldEngineState;
  integrity: ReferenceIntegrityResult;
  eventCountThisYear: number;
  eventCountCumulative: number;
}): YearlyStatisticsRow {
  const { yearEndState, integrity, eventCountThisYear, eventCountCumulative } = input;
  const worldYear = yearEndState.worldDate.year;

  let livingCount = 0;
  let deceasedRecordCount = 0;
  let age0To7 = 0;
  let age8To15 = 0;
  let age16To17 = 0;
  let age18To41 = 0;
  let age42Plus = 0;
  let childCount = 0;
  let traineeCount = 0;
  let activeCompetitorCount = 0;
  let retiredCount = 0;
  let waitingCount = 0;
  let stoppedCount = 0;
  let rankNone = 0;
  let rankF = 0;
  let rankE = 0;
  let rankD = 0;
  let rankC = 0;
  let rankB = 0;
  let rankA = 0;
  let rankS = 0;

  for (const person of yearEndState.persons) {
    if (!isLivingPerson(person)) {
      deceasedRecordCount += 1;
      continue;
    }
    livingCount += 1;
    const age = person.currentAge;
    if (age <= 7) {
      age0To7 += 1;
    } else if (age <= 15) {
      age8To15 += 1;
    } else if (age <= 17) {
      age16To17 += 1;
    } else if (age <= 41) {
      age18To41 += 1;
    } else {
      age42Plus += 1;
    }

    if (person.careerStatus === "child") {
      childCount += 1;
    } else if (person.careerStatus === "trainee") {
      traineeCount += 1;
    } else if (person.careerStatus === "active_competitor") {
      activeCompetitorCount += 1;
    } else {
      retiredCount += 1;
    }

    if (person.participationStatus === "waiting") {
      waitingCount += 1;
    } else if (person.participationStatus === "stopped") {
      stoppedCount += 1;
    }

    if (person.careerStatus === "active_competitor") {
      // Defensive: if currentRank is somehow missing, count as rankNone so totals match livingCount.
      const rankField = person as { currentRank?: typeof person.currentRank };
      const currentRank = rankField.currentRank;
      if (currentRank === undefined) {
        rankNone += 1;
      } else if (currentRank === "F") {
        rankF += 1;
      } else if (currentRank === "E") {
        rankE += 1;
      } else if (currentRank === "D") {
        rankD += 1;
      } else if (currentRank === "C") {
        rankC += 1;
      } else if (currentRank === "B") {
        rankB += 1;
      } else if (currentRank === "A") {
        rankA += 1;
      } else if (currentRank === "S") {
        rankS += 1;
      } else {
        rankNone += 1;
      }
    } else {
      rankNone += 1;
    }
  }

  const relCounts = countRelationships(yearEndState.relationships);
  const masterStats = computeMasterStats(yearEndState.persons, yearEndState.relationships);

  return {
    worldYear,
    // Target-year terminal week (CAL-JAN-029): Y * weeksPerWorldYear - 1.
    // year_stats_finalized EventEnvelope worldDate remains next-year start.
    absoluteWeek: worldYear * WEEKS_PER_YEAR - 1,
    livingCount,
    deceasedRecordCount,
    age0To7,
    age8To15,
    age16To17,
    age18To41,
    age42Plus,
    childCount,
    traineeCount,
    activeCompetitorCount,
    retiredCount,
    waitingCount,
    stoppedCount,
    rankNone,
    rankF,
    rankE,
    rankD,
    rankC,
    rankB,
    rankA,
    rankS,
    familyCount: yearEndState.families.length,
    lineageCount: yearEndState.lineages.length,
    ...relCounts,
    ...masterStats,
    eventCountThisYear,
    eventCountCumulative,
    brokenReferenceCount: integrity.brokenReferenceCount,
    invariantViolationCount: integrity.invariantViolationCount,
  };
}

export function yearlyStatisticsToCsv(rows: readonly YearlyStatisticsRow[]): string {
  const header = YEARLY_STATISTICS_COLUMNS.join(",");
  if (rows.length === 0) {
    return `${header}\n`;
  }
  const lines = rows.map((row) =>
    YEARLY_STATISTICS_COLUMNS.map((column) => escapeCsvField(formatCsvNumber(row[column]))).join(
      ",",
    ),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function parseYearlyStatisticsCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.endsWith("\n")) {
    throw new Error("yearly-statistics.csv must end with LF");
  }
  const lines = normalized.slice(0, -1).split("\n");
  if (lines.length === 0) {
    throw new Error("yearly-statistics.csv is empty");
  }
  const headers = lines[0]!.split(",");
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",");
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      const key = headers[i];
      if (key === undefined) {
        continue;
      }
      record[key] = values[i] ?? "";
    }
    return record;
  });
  return { headers, rows };
}
