/**
 * Year-start / normal-week event pair classification (CAL-JAN-027).
 * Production validator only — not a RunRuleSnapshot field / second manifest.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldDate } from "../world-date.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";
import type { WorldYearStartReceipt } from "./world-year-start-runtime-state.js";

export type YearStartProvenanceEvent = {
  sequence: number;
  eventType: string;
  sourceProcessor: string;
  worldDate: WorldDate;
};

export type YearStartEventPairPhase = "year-start" | "normal-week";

export type YearStartEventPairClassification = {
  phase: YearStartEventPairPhase;
  processorId: string;
  slot: string;
  processorVersion: string;
  sourceProcessor: string;
  eventType: string;
};

const YEAR_START_PAIRS: readonly YearStartEventPairClassification[] = [
  {
    phase: "year-start",
    processorId: "previous-year-finalize",
    slot: "previous_year_finalize",
    processorVersion: "0.1.0",
    sourceProcessor: "world-calendar",
    eventType: "world.year_stats_finalized",
  },
  {
    phase: "year-start",
    processorId: "world-year-start coordinator",
    slot: "coordinator",
    processorVersion: "0.1.0",
    sourceProcessor: "world-calendar",
    eventType: "world.year_started",
  },
  {
    phase: "year-start",
    processorId: "mass-aging",
    slot: "mass_aging",
    processorVersion: "0.1.0",
    sourceProcessor: "world-calendar",
    eventType: "person.aged",
  },
  {
    phase: "year-start",
    processorId: "age-qualification",
    slot: "age_qualification",
    processorVersion: "0.1.0",
    sourceProcessor: "world-calendar",
    eventType: "person.career_status_changed",
  },
  {
    phase: "year-start",
    processorId: "age-qualification",
    slot: "age_qualification",
    processorVersion: "0.1.0",
    sourceProcessor: "world-calendar",
    eventType: "person.debuted",
  },
  {
    phase: "year-start",
    processorId: "age-qualification",
    slot: "age_qualification",
    processorVersion: "0.1.0",
    sourceProcessor: "world-calendar",
    eventType: "person.force_retired",
  },
];

const NORMAL_WEEK_EVENT_TYPES = [
  "training.action_selected",
  "training.stat_growth_applied",
  "training.condition_updated",
  "training.forced_rest_applied",
  "training.rest_applied",
  "technique.learning_progressed",
  "technique.acquired",
  "technique.mastery_increased",
] as const;

const NORMAL_WEEK_PAIRS: readonly YearStartEventPairClassification[] = NORMAL_WEEK_EVENT_TYPES.map(
  (eventType) => ({
    phase: "normal-week" as const,
    processorId: "weekly-training",
    slot: "normal_week",
    processorVersion: "existing Sprint1 version",
    sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
    eventType,
  }),
);

function pairKey(sourceProcessor: string, eventType: string): string {
  return `${sourceProcessor}\u0000${eventType}`;
}

const YEAR_START_PAIR_KEYS = new Set(
  YEAR_START_PAIRS.map((pair) => pairKey(pair.sourceProcessor, pair.eventType)),
);
const NORMAL_WEEK_PAIR_KEYS = new Set(
  NORMAL_WEEK_PAIRS.map((pair) => pairKey(pair.sourceProcessor, pair.eventType)),
);

export function listYearStartEventPairClassifications(): readonly YearStartEventPairClassification[] {
  return [...YEAR_START_PAIRS, ...NORMAL_WEEK_PAIRS];
}

export function classifyYearStartEventPair(
  sourceProcessor: string,
  eventType: string,
): ValidationResult<YearStartEventPairClassification> {
  const key = pairKey(sourceProcessor, eventType);
  if (YEAR_START_PAIR_KEYS.has(key) && NORMAL_WEEK_PAIR_KEYS.has(key)) {
    return failure([
      {
        path: "/eventPair",
        message: "year-start and normal-week pair sets must not overlap",
        actual: key,
      },
    ]);
  }
  const yearStart = YEAR_START_PAIRS.find(
    (pair) => pair.sourceProcessor === sourceProcessor && pair.eventType === eventType,
  );
  if (yearStart !== undefined) {
    return success(yearStart);
  }
  const normal = NORMAL_WEEK_PAIRS.find(
    (pair) => pair.sourceProcessor === sourceProcessor && pair.eventType === eventType,
  );
  if (normal !== undefined) {
    return success(normal);
  }
  return failure([
    {
      path: "/eventPair",
      message: "unknown/unclassified sourceProcessor+eventType pair",
      actual: { sourceProcessor, eventType },
    },
  ]);
}

function worldDatesEqual(a: WorldDate, b: WorldDate): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.weekOfMonth === b.weekOfMonth &&
    a.absoluteWeek === b.absoluteWeek
  );
}

function mismatch(
  path: string,
  message: string,
  actual?: unknown,
  expected?: unknown,
): ValidationIssue {
  return {
    path,
    message,
    ...(actual !== undefined ? { actual } : {}),
    ...(expected !== undefined ? { expected: String(expected) } : {}),
  };
}

/**
 * Validate receipt range is an exact contiguous year-start prefix for its worldDate,
 * with previous_year_finalize → year_started → other year-start groups, then normal-week only.
 */
export function validateYearStartReceiptEventProvenance(input: {
  receipt: WorldYearStartReceipt;
  eventStream: readonly {
    sequence: number;
    eventType: string;
    sourceProcessor: string;
    worldDate: WorldDate;
  }[];
}): ValidationResult<void> {
  const issues: ValidationIssue[] = [];
  const { receipt, eventStream } = input;
  const { firstEventSequence, eventCount, worldDate } = receipt;

  if (!Number.isSafeInteger(firstEventSequence) || firstEventSequence < 0) {
    return failure([
      mismatch(
        "/receipt/firstEventSequence",
        "must be a non-negative safe integer",
        firstEventSequence,
      ),
    ]);
  }
  if (!Number.isSafeInteger(eventCount) || eventCount < 1) {
    return failure([mismatch("/receipt/eventCount", "must be a safe integer >= 1", eventCount)]);
  }
  const lastSequence = firstEventSequence + eventCount - 1;
  if (!Number.isSafeInteger(lastSequence) || lastSequence < firstEventSequence) {
    return failure([
      mismatch("/receipt/eventCount", "firstEventSequence + eventCount overflow", lastSequence),
    ]);
  }

  const prefix: YearStartProvenanceEvent[] = [];
  for (let sequence = firstEventSequence; sequence <= lastSequence; sequence += 1) {
    const event = eventStream.find((candidate) => candidate.sequence === sequence);
    if (event === undefined) {
      issues.push(
        mismatch(
          `/eventStream/${String(sequence)}`,
          "missing event for receipt sequence",
          sequence,
        ),
      );
      continue;
    }
    if (event.sequence !== firstEventSequence + prefix.length) {
      issues.push(
        mismatch(
          `/eventStream/${String(sequence)}/sequence`,
          "receipt range must be sequence-contiguous",
          event.sequence,
          firstEventSequence + prefix.length,
        ),
      );
    }
    if (!worldDatesEqual(event.worldDate, worldDate)) {
      issues.push(
        mismatch(
          `/eventStream/${String(sequence)}/worldDate`,
          "receipt-range event worldDate must equal receipt.worldDate",
          event.worldDate,
          JSON.stringify(worldDate),
        ),
      );
    }
    const classified = classifyYearStartEventPair(event.sourceProcessor, event.eventType);
    if (!classified.ok) {
      issues.push(...classified.issues);
      continue;
    }
    if (classified.value.phase !== "year-start") {
      issues.push(
        mismatch(
          `/eventStream/${String(sequence)}/pair`,
          "receipt range may include only year-start pairs",
          { sourceProcessor: event.sourceProcessor, eventType: event.eventType },
        ),
      );
    }
    prefix.push(event);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  // Group order: previous_year_finalize → exactly one year_started → other year-start
  let sawYearStarted = false;
  let yearStartedCount = 0;
  let sawPostYearStarted = false;
  for (const event of prefix) {
    const classified = classifyYearStartEventPair(event.sourceProcessor, event.eventType);
    if (!classified.ok) {
      return classified;
    }
    const slot = classified.value.slot;
    if (slot === "previous_year_finalize") {
      if (sawYearStarted || sawPostYearStarted) {
        issues.push(
          mismatch(
            `/eventStream/${String(event.sequence)}`,
            "previous_year_finalize must precede world.year_started",
            event.eventType,
          ),
        );
      }
      continue;
    }
    if (slot === "coordinator") {
      yearStartedCount += 1;
      if (yearStartedCount > 1) {
        issues.push(
          mismatch(
            `/eventStream/${String(event.sequence)}`,
            "receipt range must contain exactly one world.year_started",
            yearStartedCount,
            "1",
          ),
        );
      }
      sawYearStarted = true;
      continue;
    }
    // other year-start groups
    if (!sawYearStarted) {
      issues.push(
        mismatch(
          `/eventStream/${String(event.sequence)}`,
          "world.year_started must precede other enabled year-start event groups",
          event.eventType,
        ),
      );
    }
    sawPostYearStarted = true;
  }
  if (yearStartedCount !== 1) {
    issues.push(
      mismatch(
        "/receipt/year_started",
        "receipt range must contain exactly one world.year_started",
        yearStartedCount,
        "1",
      ),
    );
  }

  // Events immediately after receipt on same worldDate must be normal-week pairs only.
  for (const event of eventStream) {
    if (event.sequence <= lastSequence) {
      continue;
    }
    if (!worldDatesEqual(event.worldDate, worldDate)) {
      break;
    }
    const classified = classifyYearStartEventPair(event.sourceProcessor, event.eventType);
    if (!classified.ok) {
      issues.push(...classified.issues);
      continue;
    }
    if (classified.value.phase !== "normal-week") {
      issues.push(
        mismatch(
          `/eventStream/${String(event.sequence)}/pair`,
          "events immediately after receipt range on same worldDate must be normal-week pairs only",
          { sourceProcessor: event.sourceProcessor, eventType: event.eventType },
        ),
      );
    }
  }

  // Non-overlap / unknown already enforced by classify.
  for (const key of YEAR_START_PAIR_KEYS) {
    if (NORMAL_WEEK_PAIR_KEYS.has(key)) {
      issues.push(mismatch("/pairSets", "year-start and normal-week pair sets overlap", key));
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(undefined);
}
