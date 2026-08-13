import {
  buildWeeklyTrainingPersonRecords,
  computeInitialWeeklyTrainingSidecarHash,
  computeSimulationIdentityHash,
  createSimulationIdFromIdentity,
  toCanonicalJson,
  validateBattleResultsStore,
  validateEventEnvelope,
  validateEventSequence,
  validateInitialWeeklyTrainingSidecarSnapshot,
  validateSimulationIdentity,
  validateSprint1PersonTechniqueSemantics,
  validateWeeklyTrainingSidecarState,
  type Sha256Provider,
  type EventEnvelope,
  type Sprint1InitialWorldDocumentSnapshot,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import type { RunOutputContents } from "./atomic-write.js";
import { FIXED_OUTPUT_FILE_NAMES } from "./fixed-files.js";
import { verifySprint1EventsJsonl } from "./sprint1-events-jsonl.js";
import type {
  Sprint1FinalWorldDocument,
  Sprint1RunMetadataDocument,
  ValidationReportDocument,
} from "./types.js";
import { YEARLY_STATISTICS_COLUMNS } from "./yearly-statistics.js";

function assertLfWithTrailingNewline(text: string, label: string): void {
  if (text.includes("\r")) {
    throw new Error(`${label} must use LF only (CR found)`);
  }
  if (!text.endsWith("\n")) {
    throw new Error(`${label} must end with a trailing LF`);
  }
}

function verifyJsonFile(text: string, label: string): void {
  assertLfWithTrailingNewline(text, label);
  JSON.parse(text);
}

function verifyYearlyStatisticsCsv(text: string): void {
  assertLfWithTrailingNewline(text, "yearly-statistics.csv");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length < 1) {
    throw new Error("yearly-statistics.csv is missing a header row");
  }
  const header = lines[0]!.split(",");
  if (header.length !== YEARLY_STATISTICS_COLUMNS.length) {
    throw new Error(
      `yearly-statistics.csv header column count mismatch: expected ${String(YEARLY_STATISTICS_COLUMNS.length)}, got ${String(header.length)}`,
    );
  }
  for (let i = 0; i < YEARLY_STATISTICS_COLUMNS.length; i += 1) {
    if (header[i] !== YEARLY_STATISTICS_COLUMNS[i]) {
      throw new Error(
        `yearly-statistics.csv header mismatch at column ${String(i)}: expected ${YEARLY_STATISTICS_COLUMNS[i]}, got ${header[i] ?? ""}`,
      );
    }
  }
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const cols = lines[rowIndex]!.split(",");
    if (cols.length !== header.length) {
      throw new Error(
        `yearly-statistics.csv row ${String(rowIndex)} column count mismatch: expected ${String(header.length)}, got ${String(cols.length)}`,
      );
    }
  }
}

function verifyEventsJsonl(text: string): void {
  if (text === "") {
    validateEventSequence([], { expectedStartSequence: 0 });
    return;
  }
  if (text === "\n") {
    throw new Error("events.jsonl must not contain an empty line");
  }
  assertLfWithTrailingNewline(text, "events.jsonl");
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) {
    throw new Error("events.jsonl must not contain empty lines");
  }
  const events: EventEnvelope[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[i]!);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`events.jsonl line ${String(i)} is not valid JSON: ${detail}`, {
        cause: error,
      });
    }
    const event = parsed as EventEnvelope;
    validateEventEnvelope(event);
    events.push(event);
  }
  validateEventSequence(events, { expectedStartSequence: 0 });
  for (let i = 0; i < events.length; i += 1) {
    if (events[i]!.sequence !== i) {
      throw new Error(
        `events.jsonl sequence must be contiguous without gaps/duplicates (expected ${String(i)}, got ${String(events[i]!.sequence)})`,
      );
    }
  }
}

/**
 * Re-validate reloaded fixed-7 contents before atomic rename.
 */
export function verifyReloadedRunOutputContents(contents: RunOutputContents): void {
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    if (typeof contents[name] !== "string") {
      throw new Error(`missing reloaded content for ${name}`);
    }
  }
  verifyJsonFile(contents["run-metadata.json"], "run-metadata.json");
  verifyJsonFile(contents["initial-world.json"], "initial-world.json");
  verifyJsonFile(contents["final-world.json"], "final-world.json");
  verifyJsonFile(contents["validation-report.json"], "validation-report.json");
  verifyJsonFile(contents["performance.json"], "performance.json");
  verifyYearlyStatisticsCsv(contents["yearly-statistics.csv"]);
  verifyEventsJsonl(contents["events.jsonl"]);
}

export type Sprint1ReloadVerifierDependencies = {
  provider: Sha256Provider;
  session: Sprint1RunSession;
  expectedContents: RunOutputContents;
  expectedRunMetadata: Sprint1RunMetadataDocument;
  expectedFinalWorld: Sprint1FinalWorldDocument;
  expectedValidationReport: ValidationReportDocument;
  initialWorldSnapshot: Sprint1InitialWorldDocumentSnapshot;
};

function parseJson<T>(text: string, label: string): T {
  verifyJsonFile(text, label);
  return JSON.parse(text) as T;
}

function requireEqual(actual: unknown, expected: unknown, label: string): void {
  if (toCanonicalJson(actual) !== toCanonicalJson(expected)) {
    throw new Error(`${label} must canonically equal the expected Sprint1 projection`);
  }
}

/** Create a Sprint 1 reload verifier bound to its producing session and SHA-256 provider. */
export function createSprint1ReloadedRunOutputVerifier(
  deps: Sprint1ReloadVerifierDependencies,
): (contents: RunOutputContents) => void {
  return (contents) => verifyReloadedSprint1RunOutputContents(contents, deps);
}

/** Re-validate reloaded Sprint 1 fixed-7 contents before atomic rename. */
export function verifyReloadedSprint1RunOutputContents(
  contents: RunOutputContents,
  deps: Sprint1ReloadVerifierDependencies,
): void {
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    if (typeof contents[name] !== "string") {
      throw new Error(`missing reloaded content for ${name}`);
    }
    if (contents[name] !== deps.expectedContents[name]) {
      throw new Error(`${name} must exactly equal produced expectedContents`);
    }
  }
  const metadata = parseJson<Record<string, unknown>>(
    contents["run-metadata.json"],
    "run-metadata.json",
  );
  const initialWorld = parseJson<Record<string, unknown>>(
    contents["initial-world.json"],
    "initial-world.json",
  );
  const finalWorld = parseJson<Record<string, unknown>>(
    contents["final-world.json"],
    "final-world.json",
  );
  const validationReport = parseJson<ValidationReportDocument>(
    contents["validation-report.json"],
    "validation-report.json",
  );
  verifyJsonFile(contents["performance.json"], "performance.json");
  verifyYearlyStatisticsCsv(contents["yearly-statistics.csv"]);
  verifySprint1EventsJsonl(contents["events.jsonl"]);

  if (metadata["schemaVersion"] !== "0.5.0") {
    throw new Error("run-metadata.json schemaVersion must be 0.5.0");
  }
  if (metadata["eventEnvelopeSchemaVersion"] !== "0.2.0") {
    throw new Error("run-metadata.json eventEnvelopeSchemaVersion must be 0.2.0");
  }
  const identity = validateSimulationIdentity(metadata["simulationIdentity"]);
  if (!identity.ok) {
    throw new Error(`run-metadata simulationIdentity invalid: ${JSON.stringify(identity.issues)}`);
  }
  const identityHash = computeSimulationIdentityHash(identity.value, deps.provider);
  if (!identityHash.ok || metadata["simulationIdentityHash"] !== identityHash.value) {
    throw new Error("run-metadata simulationIdentityHash must bind canonical SimulationIdentity");
  }
  const derivedSimulationId = createSimulationIdFromIdentity(identity.value, deps.provider);
  if (!derivedSimulationId.ok || metadata["simulationId"] !== derivedSimulationId.value) {
    throw new Error("run-metadata simulationId must derive from SimulationIdentity");
  }
  if (metadata["simulationId"] !== deps.session.context.simulationId) {
    throw new Error("run-metadata simulationId must equal expected context simulationId");
  }
  requireEqual(
    identity.value,
    deps.session.context.simulationIdentity,
    "run-metadata simulationIdentity",
  );

  if (initialWorld["schemaVersion"] !== "0.5.0") {
    throw new Error("initial-world.json schemaVersion must be 0.5.0");
  }
  if (initialWorld["simulationId"] !== metadata["simulationId"]) {
    throw new Error("initial-world simulationId must equal run-metadata simulationId");
  }
  requireEqual(
    initialWorld["runRuleSnapshot"],
    deps.session.context.runRuleSnapshot,
    "initial-world runRuleSnapshot",
  );
  if (initialWorld["runRuleSnapshotHash"] !== deps.session.context.runRuleSnapshotHash) {
    throw new Error("initial-world runRuleSnapshotHash must equal expected context hash");
  }
  const initialSidecars = validateInitialWeeklyTrainingSidecarSnapshot(
    initialWorld["initialWeeklyTrainingSidecarSnapshot"],
  );
  if (!initialSidecars.ok) {
    throw new Error(`initial-world sidecar invalid: ${JSON.stringify(initialSidecars.issues)}`);
  }
  const initialSidecarHash = computeInitialWeeklyTrainingSidecarHash(
    initialSidecars.value,
    deps.provider,
  );
  if (
    !initialSidecarHash.ok ||
    initialSidecarHash.value !==
      deps.session.context.simulationIdentity.initialWeeklyTrainingSidecarHash
  ) {
    throw new Error("initial-world sidecar must bind SimulationIdentity sidecar hash");
  }
  const initialPersons = initialWorld["persons"];
  if (
    !Array.isArray(initialPersons) ||
    initialPersons.length !== initialSidecars.value.entries.length
  ) {
    throw new Error("initial-world persons and sidecar entries must be exact 1:1");
  }
  const initialIds = new Set(
    initialPersons.map((person) => (person as { personId?: unknown }).personId),
  );
  if (initialSidecars.value.entries.some((entry) => !initialIds.has(entry.personId))) {
    throw new Error("initial-world sidecar entries must all reference a person");
  }
  requireEqual(
    initialSidecars.value,
    deps.initialWorldSnapshot.initialWeeklyTrainingSidecarSnapshot,
    "initial-world sidecar",
  );
  requireEqual(initialWorld, deps.initialWorldSnapshot, "initial-world");

  if (finalWorld["schemaVersion"] !== "0.3.0") {
    throw new Error("final-world.json schemaVersion must be 0.3.0");
  }
  if (finalWorld["simulationId"] !== metadata["simulationId"]) {
    throw new Error("final-world simulationId must equal run-metadata simulationId");
  }
  for (const key of [
    "worldRngState",
    "matchIdGeneratorState",
    "processorRuntimeStates",
    "eventAllocationState",
    "battleResultWeekState",
    "eventStream",
  ]) {
    if (Object.prototype.hasOwnProperty.call(finalWorld, key)) {
      throw new Error(`final-world.json must not persist checkpoint key ${key}`);
    }
  }
  const finalSidecars = validateWeeklyTrainingSidecarState(finalWorld["weeklyTrainingSidecars"]);
  if (!finalSidecars.ok) {
    throw new Error(`final-world sidecars invalid: ${JSON.stringify(finalSidecars.issues)}`);
  }
  requireEqual(
    finalSidecars.value,
    deps.session.runtimeState.weeklyTrainingSidecars,
    "final-world sidecars",
  );
  const persons = finalWorld["persons"];
  if (!Array.isArray(persons)) {
    throw new Error("final-world persons must be an array");
  }
  const records = buildWeeklyTrainingPersonRecords(
    {
      ...deps.session.runtimeState.worldState,
      persons,
    } as Sprint1RunSession["runtimeState"]["worldState"],
    finalSidecars.value,
  );
  if (!records.ok) {
    throw new Error(
      `final-world person/sidecar relation invalid: ${JSON.stringify(records.issues)}`,
    );
  }
  for (const person of persons) {
    const value = person as Sprint1RunSession["runtimeState"]["worldState"]["persons"][number];
    if (value.sprint1State === undefined) {
      throw new Error("every final-world person must have sprint1State");
    }
    const semantic = validateSprint1PersonTechniqueSemantics(
      value.sprint1State,
      deps.session.context.techniqueCatalog,
      { spiritSurfaceValue: value.abilities.spirit.surfaceValue },
      deps.provider,
    );
    if (!semantic.ok) {
      throw new Error(
        `final-world person sprint1State invalid: ${JSON.stringify(semantic.issues)}`,
      );
    }
  }
  const battleResults = validateBattleResultsStore(
    finalWorld["battleResults"],
    deps.session.context.runRuleSnapshot,
    deps.provider,
    {
      simulationId: deps.session.context.simulationId,
      runRuleSnapshotHash: deps.session.context.runRuleSnapshotHash,
    },
  );
  if (!battleResults.ok) {
    throw new Error(`final-world battleResults invalid: ${JSON.stringify(battleResults.issues)}`);
  }
  requireEqual(
    battleResults.value,
    deps.session.runtimeState.battleResults,
    "final-world battleResults",
  );
  for (const key of [
    "simulationSpecVersion",
    "nameDataVersion",
    "simulationId",
    "worldId",
    "worldDate",
    "configProfileId",
    "configHash",
    "seed",
    "rngAlgorithm",
    "persons",
    "families",
    "lineages",
    "relationships",
    "generationSummary",
  ] as const) {
    requireEqual(finalWorld[key], deps.session.runtimeState.worldState[key], `final-world ${key}`);
  }
  requireEqual(
    finalWorld["referenceIntegrity"],
    deps.expectedFinalWorld.referenceIntegrity,
    "final-world referenceIntegrity",
  );
  requireEqual(finalWorld, deps.expectedFinalWorld, "final-world");

  const eventLines =
    contents["events.jsonl"] === ""
      ? []
      : contents["events.jsonl"]
          .slice(0, -1)
          .split("\n")
          .map((line) => JSON.parse(line) as EventEnvelope);
  for (const event of eventLines) {
    if ((event as { simulationId?: unknown }).simulationId !== metadata["simulationId"]) {
      throw new Error("every Sprint1 event simulationId must equal run-metadata simulationId");
    }
  }
  const lastSequence = eventLines.length === 0 ? null : eventLines[eventLines.length - 1]!.sequence;
  if (finalWorld["finalEventSequence"] !== lastSequence) {
    throw new Error("final-world finalEventSequence must equal the last event sequence");
  }
  requireEqual(eventLines, deps.session.runtimeState.eventStream, "events.jsonl");
  requireEqual(metadata, deps.expectedRunMetadata, "run-metadata");
  requireEqual(validationReport, deps.expectedValidationReport, "validation-report");
}
