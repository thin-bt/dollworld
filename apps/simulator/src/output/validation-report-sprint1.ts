import {
  buildWeeklyTrainingPersonRecords,
  computeInitialWeeklyTrainingSidecarHash,
  computeSimulationIdentityHash,
  toCanonicalJson,
  validateBattleResultsStore,
  validateInitialWeeklyTrainingSidecarSnapshot,
  validateSimulationIdentity,
  validateSprint1EventEnvelope,
  validateSprint1PersonTechniqueSemantics,
  validateSprint1RunContext,
  validateWeeklyTrainingSidecarState,
  type Sha256Provider,
  type Sprint1EventEnvelope,
  type Sprint1InitialWorldDocumentSnapshot,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import type {
  ReferenceIntegrityResult,
  Sprint1FinalWorldDocument,
  ValidationCheckResult,
  ValidationReportDocument,
} from "./types.js";
import { buildValidationReport } from "./validation-report.js";

const FINAL_WORLD_FORBIDDEN_TOP_LEVEL_KEYS = [
  "worldRngState",
  "matchIdGeneratorState",
  "processorRuntimeStates",
  "eventAllocationState",
  "battleResultWeekState",
  "eventStream",
] as const;

const PERSON_TEMPORARY_CONDITION_KEYS = ["fatigue", "injury", "condition", "confidence"] as const;

function checkFromValidation(
  name: string,
  passed: boolean,
  issues: { path: string; message: string }[],
): ValidationCheckResult {
  return {
    name,
    status: passed ? "passed" : "failed",
    violationCount: passed ? 0 : issues.length,
    targetIds: issues.map((issue) => issue.path).filter((path) => path.length > 0),
    reasons: issues.map((issue) => `${issue.path}: ${issue.message}`),
    severity: passed ? "none" : "error",
    canContinue: passed,
  };
}

function validateCrossDocumentHashes(input: {
  session: Sprint1RunSession;
  initialWorldSnapshot: Sprint1InitialWorldDocumentSnapshot;
  finalWorld: Sprint1FinalWorldDocument;
  runMetadataIdentityHash: string;
}): ValidationCheckResult {
  const issues: { path: string; message: string }[] = [];
  const { session, initialWorldSnapshot, finalWorld, runMetadataIdentityHash } = input;

  if (initialWorldSnapshot.runRuleSnapshotHash !== session.context.runRuleSnapshotHash) {
    issues.push({
      path: "/initial-world/runRuleSnapshotHash",
      message: "initial-world runRuleSnapshotHash must equal Sprint1RunContext.runRuleSnapshotHash",
    });
  }
  if (initialWorldSnapshot.runRuleSnapshot.simulationIdentityHash !== runMetadataIdentityHash) {
    issues.push({
      path: "/initial-world/runRuleSnapshot/simulationIdentityHash",
      message: "initial-world runRuleSnapshot.simulationIdentityHash must equal run-metadata",
    });
  }
  if (initialWorldSnapshot.simulationId !== session.context.simulationId) {
    issues.push({
      path: "/initial-world/simulationId",
      message: "initial-world simulationId must equal Sprint1RunContext.simulationId",
    });
  }
  if (initialWorldSnapshot.runRuleSnapshot.simulationId !== session.context.simulationId) {
    issues.push({
      path: "/initial-world/runRuleSnapshot/simulationId",
      message:
        "initial-world runRuleSnapshot.simulationId must equal Sprint1RunContext.simulationId",
    });
  }
  if (finalWorld.simulationId !== session.context.simulationId) {
    issues.push({
      path: "/final-world/simulationId",
      message: "final-world simulationId must equal Sprint1RunContext.simulationId",
    });
  }

  return checkFromValidation("cross_document_hashes", issues.length === 0, issues);
}

function validateInitialSidecarSnapshot(
  initialWorldSnapshot: Sprint1InitialWorldDocumentSnapshot,
  session: Sprint1RunSession,
  provider: Sha256Provider,
): ValidationCheckResult {
  const validated = validateInitialWeeklyTrainingSidecarSnapshot(
    initialWorldSnapshot.initialWeeklyTrainingSidecarSnapshot,
  );
  if (!validated.ok) {
    return checkFromValidation("initial_weekly_training_sidecar_snapshot", false, validated.issues);
  }
  const worldPersonIds = initialWorldSnapshot.persons.map((person) => person.personId).sort();
  const sidecarPersonIds = validated.value.entries.map((entry) => entry.personId).sort();
  const issues: { path: string; message: string }[] = [];
  if (worldPersonIds.length !== sidecarPersonIds.length) {
    issues.push({
      path: "/initial-world/initialWeeklyTrainingSidecarSnapshot/entries",
      message: "initial sidecar entries must be 1:1 with initial-world persons",
    });
  }
  for (const personId of worldPersonIds) {
    if (!sidecarPersonIds.includes(personId)) {
      issues.push({
        path: "/initial-world/initialWeeklyTrainingSidecarSnapshot/entries",
        message: `missing initial sidecar entry for person ${personId}`,
      });
    }
  }
  const hash = computeInitialWeeklyTrainingSidecarHash(validated.value, provider);
  if (
    !hash.ok ||
    hash.value !== session.context.simulationIdentity.initialWeeklyTrainingSidecarHash
  ) {
    issues.push({
      path: "/initial-world/initialWeeklyTrainingSidecarSnapshot",
      message:
        "initial sidecar hash must equal SimulationIdentity.initialWeeklyTrainingSidecarHash",
    });
  }
  if (
    toCanonicalJson(validated.value) !==
    toCanonicalJson(session.context.initialWeeklyTrainingSidecarSnapshot)
  ) {
    issues.push({
      path: "/initial-world/initialWeeklyTrainingSidecarSnapshot",
      message: "initial sidecar projection must canonically equal the context snapshot",
    });
  }
  return checkFromValidation("initial_sidecar_person_match", issues.length === 0, issues);
}

function validateFinalWorldSidecarMatch(
  session: Sprint1RunSession,
  finalWorld: Sprint1FinalWorldDocument,
): ValidationCheckResult {
  const sidecarResult = validateWeeklyTrainingSidecarState(finalWorld.weeklyTrainingSidecars);
  if (!sidecarResult.ok) {
    return checkFromValidation("final_weekly_training_sidecar_1_1", false, sidecarResult.issues);
  }

  const worldPersonIds = finalWorld.persons.map((person) => person.personId).sort();
  const sidecarPersonIds = sidecarResult.value.entries.map((entry) => entry.personId).sort();
  const issues: { path: string; message: string }[] = [];

  if (worldPersonIds.length !== sidecarPersonIds.length) {
    issues.push({
      path: "/final-world/weeklyTrainingSidecars/entries",
      message: "world persons and sidecar entries must be exact 1:1",
    });
  }
  for (const personId of worldPersonIds) {
    if (!sidecarPersonIds.includes(personId)) {
      issues.push({
        path: "/final-world/weeklyTrainingSidecars/entries",
        message: `missing sidecar entry for world person ${personId}`,
      });
    }
  }
  for (const personId of sidecarPersonIds) {
    if (!worldPersonIds.includes(personId)) {
      issues.push({
        path: "/final-world/weeklyTrainingSidecars/entries",
        message: `sidecar entry ${personId} has no matching world person`,
      });
    }
  }
  if (
    toCanonicalJson(sidecarResult.value) !==
    toCanonicalJson(session.runtimeState.weeklyTrainingSidecars)
  ) {
    issues.push({
      path: "/final-world/weeklyTrainingSidecars",
      message: "final-world sidecar projection must canonically equal runtime sidecars",
    });
  }
  const records = buildWeeklyTrainingPersonRecords(finalWorld, sidecarResult.value);
  if (!records.ok) {
    issues.push(
      ...records.issues.map((issue) => ({
        path: `/final-world${issue.path}`,
        message: issue.message,
      })),
    );
  }

  return checkFromValidation("final_weekly_training_sidecar_1_1", issues.length === 0, issues);
}

function validateBattleResultsProjection(
  session: Sprint1RunSession,
  finalWorld: Sprint1FinalWorldDocument,
  provider: Sha256Provider,
): ValidationCheckResult {
  const result = validateBattleResultsStore(
    finalWorld.battleResults,
    session.context.runRuleSnapshot,
    provider,
    {
      simulationId: session.context.simulationId,
      runRuleSnapshotHash: session.context.runRuleSnapshotHash,
    },
  );
  if (!result.ok) {
    return checkFromValidation("battle_results", false, result.issues);
  }
  if (toCanonicalJson(result.value) !== toCanonicalJson(session.runtimeState.battleResults)) {
    return checkFromValidation("battle_results", false, [
      {
        path: "/final-world/battleResults",
        message:
          "final-world battleResults projection must canonically equal runtime battleResults",
      },
    ]);
  }
  return checkFromValidation("battle_results", true, []);
}

function validateEventEnvelopeBatch(
  events: readonly Sprint1EventEnvelope[],
  simulationId: string,
): ValidationCheckResult {
  const issues: { path: string; message: string }[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const result = validateSprint1EventEnvelope(events[index]);
    if (!result.ok) {
      for (const issue of result.issues) {
        issues.push({
          path: `/events/${String(index)}${issue.path}`,
          message: issue.message,
        });
      }
    }
  }
  for (let index = 0; index < events.length; index += 1) {
    if (events[index]!.simulationId !== simulationId) {
      issues.push({
        path: `/events/${String(index)}/simulationId`,
        message: "every EventEnvelope.simulationId must equal Sprint1RunContext.simulationId",
      });
    }
  }
  const simulationIds = new Set(events.map((event) => event.simulationId));
  if (simulationIds.size > 1) {
    issues.push({
      path: "/events/simulationId",
      message: "all EventEnvelope.simulationId values must match within a Sprint1 run",
    });
  }
  return checkFromValidation("event_envelope_0_2_0", issues.length === 0, issues);
}

function validateSimulationIdentityProjection(
  session: Sprint1RunSession,
  provider: Sha256Provider,
): ValidationCheckResult {
  const issues: { path: string; message: string }[] = [];
  const identityResult = validateSimulationIdentity(session.context.simulationIdentity);
  if (!identityResult.ok) {
    return checkFromValidation("simulation_identity", false, identityResult.issues);
  }
  const hashResult = computeSimulationIdentityHash(identityResult.value, provider);
  if (!hashResult.ok) {
    return checkFromValidation("simulation_identity", false, hashResult.issues);
  }
  if (hashResult.value !== session.context.simulationIdentityHash) {
    issues.push({
      path: "/simulationIdentityHash",
      message: "simulationIdentityHash must equal canonical SimulationIdentity hash",
    });
  }
  const contextResult = validateSprint1RunContext(
    {
      sprint1Config: session.context.sprint1Config,
      techniqueCatalog: session.context.techniqueCatalog,
      initialWeeklyTrainingSidecarSnapshot: session.context.initialWeeklyTrainingSidecarSnapshot,
      simulationIdentity: session.context.simulationIdentity,
      simulationIdentityHash: session.context.simulationIdentityHash,
      simulationId: session.context.simulationId,
      runRuleSnapshot: session.context.runRuleSnapshot,
      runRuleSnapshotHash: session.context.runRuleSnapshotHash,
    },
    provider,
  );
  if (!contextResult.ok) {
    for (const issue of contextResult.issues) {
      issues.push({ path: issue.path, message: issue.message });
    }
  }
  return checkFromValidation("simulation_identity", issues.length === 0, issues);
}

function validateFinalWorldShape(finalWorld: Sprint1FinalWorldDocument): ValidationCheckResult {
  const issues: { path: string; message: string }[] = [];
  const record = finalWorld as unknown as Record<string, unknown>;
  for (const key of FINAL_WORLD_FORBIDDEN_TOP_LEVEL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      issues.push({
        path: `/final-world/${key}`,
        message: "runtime checkpoint fields must not be persisted in final-world.json",
      });
    }
  }
  for (let index = 0; index < finalWorld.persons.length; index += 1) {
    const person = finalWorld.persons[index] as Record<string, unknown>;
    for (const key of PERSON_TEMPORARY_CONDITION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(person, key)) {
        issues.push({
          path: `/final-world/persons/${String(index)}/${key}`,
          message: "Person must not duplicate weekly sidecar temporaryCondition fields",
        });
      }
    }
  }
  if (finalWorld.schemaVersion !== "0.3.0") {
    issues.push({
      path: "/final-world/schemaVersion",
      message: "Sprint1 final-world schemaVersion must be 0.3.0",
    });
  }
  return checkFromValidation("final_world_shape", issues.length === 0, issues);
}

function validateFinalWorldPersons(
  session: Sprint1RunSession,
  finalWorld: Sprint1FinalWorldDocument,
  provider: Sha256Provider,
): ValidationCheckResult {
  const issues: { path: string; message: string }[] = [];
  for (let index = 0; index < finalWorld.persons.length; index += 1) {
    const person = finalWorld.persons[index]!;
    if (person.sprint1State === undefined) {
      issues.push({
        path: `/final-world/persons/${String(index)}/sprint1State`,
        message: "Sprint 1 final-world persons require sprint1State",
      });
      continue;
    }
    const result = validateSprint1PersonTechniqueSemantics(
      person.sprint1State,
      session.context.techniqueCatalog,
      { spiritSurfaceValue: person.abilities.spirit.surfaceValue },
      provider,
    );
    if (!result.ok) {
      issues.push(
        ...result.issues.map((issue) => ({
          path: `/final-world/persons/${String(index)}/sprint1State${issue.path}`,
          message: issue.message,
        })),
      );
    }
  }
  return checkFromValidation("final_world_person_sprint1_state", issues.length === 0, issues);
}

export function buildSprint1ValidationReport(input: {
  session: Sprint1RunSession;
  initialWorldSnapshot: Sprint1InitialWorldDocumentSnapshot;
  finalWorld: Sprint1FinalWorldDocument;
  events: readonly Sprint1EventEnvelope[];
  finalIntegrity: ReferenceIntegrityResult;
  provider: Sha256Provider;
}): ValidationReportDocument {
  const base = buildValidationReport({ finalIntegrity: input.finalIntegrity });
  const sprint1Checks: ValidationCheckResult[] = [
    validateSimulationIdentityProjection(input.session, input.provider),
    validateCrossDocumentHashes({
      session: input.session,
      initialWorldSnapshot: input.initialWorldSnapshot,
      finalWorld: input.finalWorld,
      runMetadataIdentityHash: input.session.context.simulationIdentityHash,
    }),
    validateInitialSidecarSnapshot(input.initialWorldSnapshot, input.session, input.provider),
    validateFinalWorldSidecarMatch(input.session, input.finalWorld),
    validateBattleResultsProjection(input.session, input.finalWorld, input.provider),
    validateEventEnvelopeBatch(input.events, input.session.context.simulationId),
    validateFinalWorldShape(input.finalWorld),
    validateFinalWorldPersons(input.session, input.finalWorld, input.provider),
  ];

  const checks = [...base.checks, ...sprint1Checks];
  const overallPassed = checks.every(
    (check) => check.status === "passed" || check.status === "not_performed",
  );

  return {
    ...base,
    overallPassed,
    checks,
  };
}
