import {
  toCanonicalJson,
  type EventEnvelope,
  type ProcessorRuntimeState,
} from "@shared-world/simulation-core";
import type { Sprint0RunArtifacts } from "./execute-run.js";

export type DeterminismDifference = {
  subject: string;
  path: string;
  expected: string;
  actual: string;
};

export type DeterminismComparisonResult = {
  passed: boolean;
  differences: DeterminismDifference[];
};

function pushDiff(
  differences: DeterminismDifference[],
  subject: string,
  path: string,
  expected: unknown,
  actual: unknown,
): void {
  const expectedText = typeof expected === "string" ? expected : toCanonicalJson(expected);
  const actualText = typeof actual === "string" ? actual : toCanonicalJson(actual);
  if (expectedText !== actualText) {
    differences.push({
      subject,
      path,
      expected: expectedText.slice(0, 500),
      actual: actualText.slice(0, 500),
    });
  }
}

function compareProcessorRuntime(
  a: ProcessorRuntimeState,
  b: ProcessorRuntimeState,
  differences: DeterminismDifference[],
): void {
  pushDiff(
    differences,
    "processorRuntimeState.processorOrder",
    "processorOrder",
    a.processorOrder,
    b.processorOrder,
  );
  pushDiff(differences, "processorRuntimeState.rngStates", "rngStates", a.rngStates, b.rngStates);
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return toCanonicalJson(left) === toCanonicalJson(right);
}

/**
 * Deterministic world content used for different-seed comparison.
 * Excludes simulationId, runId, real timestamps, performance, paths, and OS metadata.
 */
export type DeterministicWorldEntities = {
  persons: unknown;
  families: unknown;
  lineages: unknown;
  relationships: unknown;
};

export type NormalizedInitialEvent = {
  schemaVersion: unknown;
  sequence: unknown;
  eventType: unknown;
  importance: unknown;
  worldDate: unknown;
  origin: unknown;
  sourceProcessor: unknown;
  entities: unknown;
  payload: unknown;
};

export type DifferentSeedWorldBundle = {
  simulationId: string;
  initial: DeterministicWorldEntities & { initialEvents: NormalizedInitialEvent[] };
  final: DeterministicWorldEntities;
};

/**
 * Keep only semantic event content for different-seed comparison.
 * eventId is derived from simulationId + sequence, so both it and simulationId
 * must be dropped or identical worlds would look different for seed-derived ids alone.
 */
export function normalizeInitialEventForComparison(event: EventEnvelope): NormalizedInitialEvent {
  return {
    schemaVersion: event.schemaVersion,
    sequence: event.sequence,
    eventType: event.eventType,
    importance: event.importance,
    worldDate: event.worldDate,
    origin: event.origin,
    sourceProcessor: event.sourceProcessor,
    entities: event.entities,
    payload: event.payload,
  };
}

/**
 * Extract substantive deterministic world content from a run.
 */
export function extractDifferentSeedWorldBundle(
  artifacts: Sprint0RunArtifacts,
): DifferentSeedWorldBundle {
  return {
    simulationId: artifacts.simulation.finalState.simulationId,
    initial: {
      persons: artifacts.initialSnapshot.persons,
      families: artifacts.initialSnapshot.families,
      lineages: artifacts.initialSnapshot.lineages,
      relationships: artifacts.initialSnapshot.relationships,
      initialEvents: artifacts.initialEvents.map(normalizeInitialEventForComparison),
    },
    final: {
      persons: artifacts.finalWorld.persons,
      families: artifacts.finalWorld.families,
      lineages: artifacts.finalWorld.lineages,
      relationships: artifacts.finalWorld.relationships,
    },
  };
}

/**
 * Compare two same-condition runs for deterministic outputs.
 * Explicitly excludes runId, real timestamps, performance/environment values, and paths.
 */
export function compareSameSeedRuns(
  left: Sprint0RunArtifacts,
  right: Sprint0RunArtifacts,
): DeterminismComparisonResult {
  const differences: DeterminismDifference[] = [];

  pushDiff(
    differences,
    "simulationId",
    "simulationId",
    left.simulation.finalState.simulationId,
    right.simulation.finalState.simulationId,
  );
  pushDiff(
    differences,
    "initial-world.json",
    "initial-world.json",
    left.fileTexts["initial-world.json"],
    right.fileTexts["initial-world.json"],
  );
  pushDiff(
    differences,
    "final-world.json",
    "final-world.json",
    left.fileTexts["final-world.json"],
    right.fileTexts["final-world.json"],
  );
  pushDiff(
    differences,
    "yearly-statistics.csv",
    "yearly-statistics.csv",
    left.fileTexts["yearly-statistics.csv"],
    right.fileTexts["yearly-statistics.csv"],
  );
  pushDiff(
    differences,
    "events.jsonl",
    "events.jsonl",
    left.fileTexts["events.jsonl"],
    right.fileTexts["events.jsonl"],
  );
  pushDiff(
    differences,
    "finalWorldState",
    "simulation.finalState",
    left.simulation.finalState,
    right.simulation.finalState,
  );
  pushDiff(
    differences,
    "nextSequence",
    "simulation.nextSequence",
    left.simulation.nextSequence,
    right.simulation.nextSequence,
  );

  for (let i = 0; i < left.simulation.yearEnds.length; i += 1) {
    const l = left.simulation.yearEnds[i];
    const r = right.simulation.yearEnds[i];
    if (l === undefined || r === undefined) {
      differences.push({
        subject: "yearlyStatistics",
        path: `yearEnds[${String(i)}]`,
        expected: l === undefined ? "missing" : "present",
        actual: r === undefined ? "missing" : "present",
      });
      continue;
    }
    pushDiff(differences, "yearlyStatistics.row", `yearEnds[${String(i)}].row`, l.row, r.row);
  }

  compareProcessorRuntime(left.processorRuntimeState, right.processorRuntimeState, differences);

  if (left.allEvents.length !== right.allEvents.length) {
    differences.push({
      subject: "events.length",
      path: "allEvents.length",
      expected: String(left.allEvents.length),
      actual: String(right.allEvents.length),
    });
  } else {
    for (let i = 0; i < left.allEvents.length; i += 1) {
      pushDiff(
        differences,
        "event.sequence",
        `allEvents[${String(i)}].sequence`,
        left.allEvents[i]!.sequence,
        right.allEvents[i]!.sequence,
      );
      pushDiff(
        differences,
        "event.eventId",
        `allEvents[${String(i)}].eventId`,
        left.allEvents[i]!.eventId,
        right.allEvents[i]!.eventId,
      );
    }
  }

  return {
    passed: differences.length === 0,
    differences,
  };
}

export type DifferentSeedComparisonResult = {
  passed: boolean;
  simulationIdsDiffer: boolean;
  initialWorldDiffers: boolean;
  finalWorldDiffers: boolean;
  detail: string;
};

/**
 * Compare extracted world bundles for different-seed requirements.
 * simulationId difference is required independently of entity content.
 * Entity content must differ in initial and/or final deterministic slices
 * (persons / families / lineages / relationships / initial events).
 */
export function compareDifferentSeedWorldBundles(
  left: DifferentSeedWorldBundle,
  right: DifferentSeedWorldBundle,
): DifferentSeedComparisonResult {
  const simulationIdsDiffer = left.simulationId !== right.simulationId;
  const initialWorldDiffers = !canonicalEqual(left.initial, right.initial);
  const finalWorldDiffers = !canonicalEqual(left.final, right.final);
  const substantiveDiffers = initialWorldDiffers || finalWorldDiffers;
  const passed = simulationIdsDiffer && substantiveDiffers;

  let detail: string;
  if (passed) {
    detail =
      "different seeds produced different simulationId and substantive deterministic world content";
  } else if (!simulationIdsDiffer && !substantiveDiffers) {
    detail = "simulationId and substantive world content are identical";
  } else if (!simulationIdsDiffer) {
    detail = "simulationId did not differ";
  } else {
    detail =
      "simulationId differed but persons/families/lineages/relationships/initialEvents were identical";
  }

  return {
    passed,
    simulationIdsDiffer,
    initialWorldDiffers,
    finalWorldDiffers,
    detail,
  };
}

/**
 * Different seeds must produce different simulationId and different substantive worlds.
 * Full-file diffs of initial-world.json / final-world.json are not used, because those
 * documents also embed simulationId and other non-entity fields.
 */
export function compareDifferentSeedRuns(
  left: Sprint0RunArtifacts,
  right: Sprint0RunArtifacts,
): DifferentSeedComparisonResult {
  return compareDifferentSeedWorldBundles(
    extractDifferentSeedWorldBundle(left),
    extractDifferentSeedWorldBundle(right),
  );
}
