import {
  compareUnicodeCodePoints,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
  computeNameDataHash,
  commitRunBattlePlan,
  createDefaultStrategyActionSourceIdentity,
  createSprint1RunSession,
  createWorldDate,
  isEligibleForBattleKind,
  runBattleToCompletion,
  runSprint1WeeklyStep,
  toCanonicalJson,
  validateBattleParticipantSource,
  validateBattlePostProcessContext,
  validateDefaultBattleStrategySource,
  validateSprint1RunSession,
  WEEKLY_TRAINING_EVENT_TYPES,
  WEEKLY_TRAINING_PROCESSOR_ID,
  type Person,
  type PersonId,
  type PersonTechniqueState,
  type Sha256Provider,
  type Sprint1EventEnvelope,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { loadValidatedNameData } from "../file-loader.js";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { buildAndWriteSprint1RunOutput } from "../output/build-sprint1-run-output.js";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";
import { createNodeFsOps } from "../output/fs-ops.js";
import { createRunIdGenerator } from "../output/run-id.js";
import { evaluateReferenceIntegrity } from "../output/world-integrity.js";
import { compareSameSeedFixedSeven } from "./compare-fixed7.js";
import { SPRINT1_BASE_SEED, SPRINT1_VERIFICATION_OUTPUT_DIR } from "./constants.js";
import { loadTinySprint1Fixtures } from "./fixtures.js";
import type { IntegratedScenarioSection, VerificationIssue } from "./types.js";

const TECHNIQUE_UPDATE_TYPES = new Set<string>([
  WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
  WEEKLY_TRAINING_EVENT_TYPES.techniqueAcquired,
  WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
]);

function expectOk<T>(
  result: { ok: true; value: T } | { ok: false; issues: unknown },
  label: string,
): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function officialEligiblePersons(session: Sprint1RunSession): Person[] {
  const eligible = session.runtimeState.worldState.persons.filter((person) => {
    if (person.lifeStatus !== "living" || person.currentAge === null) return false;
    if (person.participationStatus !== "active") return false;
    return isEligibleForBattleKind("official", person.careerStatus, person.currentAge);
  });
  return [...eligible].sort((a, b) => compareUnicodeCodePoints(a.personId, b.personId));
}

function learningTechniqueState(techniqueId: string): PersonTechniqueState {
  return {
    techniqueId: techniqueId as PersonTechniqueState["techniqueId"],
    learningProgressTenths: 0,
    masteryHundredths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: null,
  };
}

/**
 * Verification-only preparation so week-1 produces a technique update on an
 * official-eligible actor (tiny fixture has empty techniqueTargetContexts).
 */
export function prepareIntegratedLearningSession(session: Sprint1RunSession): {
  session: Sprint1RunSession;
  techniqueActorPersonId: PersonId;
  battleParticipantIds: readonly [PersonId, PersonId];
} {
  const eligible = officialEligiblePersons(session);
  if (eligible.length < 2) {
    throw new Error(
      `integrated fixture failure: need ≥2 official-eligible persons, got ${String(eligible.length)}`,
    );
  }
  const first = eligible[0]!;
  const second = eligible[1]!;
  const actorId = first.personId;
  const techniqueId = "technique_alpha";

  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.personId !== actorId) return person;
    if (person.sprint1State === undefined) {
      throw new Error(`actor ${actorId} missing sprint1State`);
    }
    return {
      ...person,
      sprint1State: {
        ...person.sprint1State,
        techniqueStates: [learningTechniqueState(techniqueId)],
        learningFocusTechniqueId: null,
      },
    };
  });

  const sidecarEntries = session.runtimeState.weeklyTrainingSidecars.entries.map((entry) => {
    if (entry.personId !== actorId) return entry;
    return {
      ...entry,
      plannerContext: {
        byAction: {
          ...entry.plannerContext.byAction,
          learn_technique: {
            ...entry.plannerContext.byAction.learn_technique,
            personality: 20,
          },
          train_stat: {
            ...entry.plannerContext.byAction.train_stat,
            personality: -20,
          },
          practice_technique: {
            ...entry.plannerContext.byAction.practice_technique,
            personality: -20,
          },
          rest: {
            ...entry.plannerContext.byAction.rest,
            personality: -20,
          },
        },
      },
      techniqueTargetContexts: [
        {
          techniqueId: techniqueId as PersonTechniqueState["techniqueId"],
          styleMatch: 50,
          teacherPriority: 0,
          learningTrait: 50,
          teachingAbility: 50,
          compatibility: 50,
          teacherCanTeachContext: {
            activeMentorshipExists: true,
            masterLifeStatus: "living" as const,
            masterParticipationStatus: "active" as const,
            masterCareerStatus: "active_competitor" as const,
            masterTechniqueState: {
              techniqueId: techniqueId as PersonTechniqueState["techniqueId"],
              learningProgressTenths: 1000,
              masteryHundredths: 5000,
              successfulUseCount: 0,
              attemptedUseCount: 0,
              lastPracticedAbsoluteWeek: null,
              acquiredAbsoluteWeek: 1,
            },
          },
        },
      ],
    };
  });

  return {
    session: {
      ...session,
      runtimeState: {
        ...session.runtimeState,
        worldState: {
          ...session.runtimeState.worldState,
          persons,
        },
        weeklyTrainingSidecars: {
          ...session.runtimeState.weeklyTrainingSidecars,
          entries: sidecarEntries,
        },
      },
    },
    techniqueActorPersonId: actorId,
    battleParticipantIds: [first.personId, second.personId],
  };
}

function eventActorPersonId(event: Sprint1EventEnvelope): PersonId | null {
  const ids = event.entities.personIds;
  if (!Array.isArray(ids) || ids.length !== 1) return null;
  const id = ids[0];
  return typeof id === "string" ? (id as PersonId) : null;
}

function digestCheckpoint(
  session: Sprint1RunSession,
  sha256Provider: Sha256Provider,
): Record<string, string> {
  const runtime = session.runtimeState;
  const hash = (label: string, value: unknown): string => {
    const digest = sha256Provider.hashUtf8(toCanonicalJson(value));
    return digest;
  };
  return {
    worldState: hash("worldState", runtime.worldState),
    worldRngState: hash("worldRngState", runtime.worldRngState),
    matchIdGeneratorState: hash("matchIdGeneratorState", runtime.matchIdGeneratorState),
    weeklyTrainingSidecars: hash("weeklyTrainingSidecars", runtime.weeklyTrainingSidecars),
    processorRuntimeStates: hash("processorRuntimeStates", runtime.processorRuntimeStates),
    eventStream: hash("eventStream", runtime.eventStream),
    eventAllocationState: hash("eventAllocationState", runtime.eventAllocationState),
    battleResults: hash("battleResults", runtime.battleResults),
    battleResultWeekState: hash("battleResultWeekState", runtime.battleResultWeekState),
    simulationId: hash("simulationId", session.context.simulationId),
    simulationIdentityHash: hash("simulationIdentityHash", session.context.simulationIdentityHash),
    runRuleSnapshotHash: hash("runRuleSnapshotHash", session.context.runRuleSnapshotHash),
  };
}

function normalizeOfficialBattleCalendar(
  session: Sprint1RunSession,
  participantIds: readonly [PersonId, PersonId],
): Sprint1RunSession {
  // Tiny fixture startYear=1 yields birthYear<1 for ages 16–41. Battle contracts
  // require birthYear>=1 and age=worldYear-birthYear. Verification-only temporal
  // normalization keeps personIds/technique actor bind and official ages intact.
  const targetYear = 50;
  const worldDate = createWorldDate({
    year: targetYear,
    month: session.runtimeState.worldState.worldDate.month,
    weekOfMonth: session.runtimeState.worldState.worldDate.weekOfMonth,
  });
  const persons = session.runtimeState.worldState.persons.map((person) => {
    const age = person.currentAge;
    if (person.lifeStatus !== "living" || age === null || age === undefined) {
      return person;
    }
    return {
      ...person,
      birthYear: targetYear - age,
      currentAge: age,
    } as Person;
  });
  void participantIds;
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: {
        ...session.runtimeState.worldState,
        worldDate,
        persons,
      },
      battleResultWeekState: {
        ...session.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
        results: session.runtimeState.battleResultWeekState.results,
      },
    },
  };
}

function commitOfficialBattle(
  session: Sprint1RunSession,
  participantIds: readonly [PersonId, PersonId],
  sha256Provider: Sha256Provider,
): Sprint1RunSession {
  const [idA, idB] = participantIds;
  const participantSource = (personId: PersonId) => {
    const person = session.runtimeState.worldState.persons.find(
      (entry) => entry.personId === personId,
    );
    const sidecar = session.runtimeState.weeklyTrainingSidecars.entries.find(
      (entry) => entry.personId === personId,
    );
    if (person === undefined || sidecar === undefined) {
      throw new Error(`missing battle source for ${personId}`);
    }
    const source = { person, temporaryCondition: sidecar.temporaryCondition };
    expectOk(
      validateBattleParticipantSource(source),
      `validateBattleParticipantSource(${personId})`,
    );
    return source;
  };

  const identity = expectOk(
    createDefaultStrategyActionSourceIdentity({
      strategyVersion: session.context.runRuleSnapshot.defaultBattleStrategyVersion,
      strategyConfigHash: session.context.runRuleSnapshot.sprint1ConfigHash,
    }),
    "createDefaultStrategyActionSourceIdentity",
  );
  expectOk(
    validateDefaultBattleStrategySource({ identity }),
    "validateDefaultBattleStrategySource",
  );

  const week = session.runtimeState.battleResultWeekState;
  const personA = session.runtimeState.worldState.persons.find((entry) => entry.personId === idA);
  const personB = session.runtimeState.worldState.persons.find((entry) => entry.personId === idB);
  const ageA = personA?.currentAge;
  const ageB = personB?.currentAge;
  if (
    personA === undefined ||
    personB === undefined ||
    ageA === null ||
    ageA === undefined ||
    ageB === null ||
    ageB === undefined
  ) {
    throw new Error("battle participants missing or lack currentAge");
  }
  const postProcessContext = {
    participantA: {
      personId: idA,
      matchesCompletedThisWorldWeekBeforeBattle: computeMatchesCompletedThisWorldWeekBeforeBattle(
        week,
        idA,
      ),
    },
    participantB: {
      personId: idB,
      matchesCompletedThisWorldWeekBeforeBattle: computeMatchesCompletedThisWorldWeekBeforeBattle(
        week,
        idB,
      ),
    },
  };
  expectOk(
    validateBattlePostProcessContext(postProcessContext, {
      participantAId: idA,
      participantBId: idB,
      ageAtBattleA: ageA,
      ageAtBattleB: ageB,
      worldDate: session.runtimeState.worldState.worldDate,
      birthYearA: personA.birthYear,
      birthYearB: personB.birthYear,
    }),
    "validateBattlePostProcessContext",
  );

  const run = runBattleToCompletion(
    {
      expectedWorldStateHash: expectOk(
        computeExpectedWorldStateHash(session.runtimeState.worldState, sha256Provider),
        "computeExpectedWorldStateHash",
      ),
      startBattleInput: {
        createBattleRequest: {
          simulationId: session.context.simulationId,
          worldDate: session.runtimeState.worldState.worldDate,
          battleKind: "official",
          participantA: participantSource(idA),
          participantB: participantSource(idB),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot: session.context.runRuleSnapshot,
        },
        worldRngState: session.runtimeState.worldRngState,
        matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: { identity },
      participantBActionsSource: { identity },
      postProcessContext,
    },
    sha256Provider,
  );
  if (run.kind !== "completed") {
    throw new Error(`expected completed battle, got ${JSON.stringify(run)}`);
  }
  return expectOk(
    commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider),
    "commitRunBattlePlan",
  );
}

function techniqueStatesCanonical(person: Person): string {
  return toCanonicalJson(person.sprint1State?.techniqueStates ?? []);
}

type IntegratedSingleRunResult = {
  artifact: { runKey: string; relativeRunDirectory: string };
  absoluteRunDirectory: string;
  techniqueActorPersonId: PersonId;
  battleParticipantIds: readonly [PersonId, PersonId];
  checkpointDigests: {
    fresh: Record<string, string>;
    afterWeekly1: Record<string, string>;
    afterBattle: Record<string, string>;
    afterWeekly2: Record<string, string>;
  };
  weekRegistryReset: boolean;
  globalBattleResultsRetained: boolean;
  yearsExecuted: number;
  weeksExecuted: number;
  csvDataRows: number;
};

function runIntegratedOnce(input: {
  repoRoot: string;
  runKey: string;
  outputRoot: string;
  sha256Provider: Sha256Provider;
}): IntegratedSingleRunResult {
  const fixtures = loadTinySprint1Fixtures(input.repoRoot, input.sha256Provider);
  const nameData = loadValidatedNameData({
    cwd: input.repoRoot,
    manifestPath: fixtures.config.nameData.manifestPath,
    requiredVersion: fixtures.config.nameData.requiredVersion,
    initialFamilyCount: fixtures.config.families.initialFamilyCount,
    sha256Provider: input.sha256Provider,
  });

  const createResult = expectOk(
    createSprint1RunSession(
      {
        seed: SPRINT1_BASE_SEED,
        config: fixtures.config,
        nameData,
        sprint1CliInput: fixtures.sprint1CliInputRaw,
      },
      input.sha256Provider,
    ),
    "createSprint1RunSession",
  );

  const prepared = prepareIntegratedLearningSession(createResult.session);
  const validatedPrepared = expectOk(
    validateSprint1RunSession(prepared.session, input.sha256Provider),
    "validateSprint1RunSession(prepared)",
  );

  const freshDigest = digestCheckpoint(validatedPrepared, input.sha256Provider);

  const actorBefore = validatedPrepared.runtimeState.worldState.persons.find(
    (person) => person.personId === prepared.techniqueActorPersonId,
  );
  if (actorBefore === undefined) {
    throw new Error("technique actor missing before weekly step");
  }
  const techniqueSnapshot = techniqueStatesCanonical(actorBefore);

  const afterWeekly1 = expectOk(
    runSprint1WeeklyStep(validatedPrepared, input.sha256Provider),
    "runSprint1WeeklyStep#1",
  );
  const afterWeekly1Digest = digestCheckpoint(afterWeekly1, input.sha256Provider);

  const weeklyEvents = afterWeekly1.runtimeState.eventStream.filter(
    (event) => event.sourceProcessor === WEEKLY_TRAINING_PROCESSOR_ID,
  );
  const actionSelected = weeklyEvents.filter(
    (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
  );
  const techniqueUpdates = weeklyEvents.filter((event) =>
    TECHNIQUE_UPDATE_TYPES.has(event.eventType),
  );
  if (actionSelected.length < 1) {
    throw new Error("integrated scenario: missing training.action_selected");
  }
  if (techniqueUpdates.length < 1) {
    throw new Error("integrated scenario: missing technique update event");
  }
  for (const event of [...actionSelected, ...techniqueUpdates]) {
    const actor = eventActorPersonId(event);
    if (actor === null) {
      throw new Error(
        `weekly-training event must have entities.personIds exact 1: ${event.eventType}`,
      );
    }
  }
  const techniqueActors = new Set(
    techniqueUpdates
      .map((event) => eventActorPersonId(event))
      .filter((id): id is PersonId => id !== null),
  );
  if (!techniqueActors.has(prepared.techniqueActorPersonId)) {
    throw new Error(
      `technique update actor must include prepared actor ${prepared.techniqueActorPersonId}, got ${JSON.stringify([...techniqueActors])}`,
    );
  }

  const actorAfter = afterWeekly1.runtimeState.worldState.persons.find(
    (person) => person.personId === prepared.techniqueActorPersonId,
  );
  if (actorAfter === undefined) {
    throw new Error("technique actor missing after weekly step");
  }
  if (techniqueStatesCanonical(actorAfter) === techniqueSnapshot) {
    throw new Error("techniqueStates did not change for technique actor after weekly step");
  }

  const eligibleAfter = officialEligiblePersons(afterWeekly1);
  if (eligibleAfter.length < 2) {
    throw new Error("integrated scenario: fewer than 2 official-eligible after weekly");
  }
  const battleIds: [PersonId, PersonId] = [eligibleAfter[0]!.personId, eligibleAfter[1]!.personId];
  if (!battleIds.includes(prepared.techniqueActorPersonId)) {
    throw new Error(
      `technique actor ${prepared.techniqueActorPersonId} not in official battle pair ${battleIds.join(",")}`,
    );
  }

  // Confirm technique actor participant source matches current world techniqueStates.
  const techniqueActorPerson = afterWeekly1.runtimeState.worldState.persons.find(
    (person) => person.personId === prepared.techniqueActorPersonId,
  )!;
  const techniqueActorSidecar = afterWeekly1.runtimeState.weeklyTrainingSidecars.entries.find(
    (entry) => entry.personId === prepared.techniqueActorPersonId,
  )!;
  const sourceCheck = {
    person: techniqueActorPerson,
    temporaryCondition: techniqueActorSidecar.temporaryCondition,
  };
  expectOk(validateBattleParticipantSource(sourceCheck), "technique actor battle source");
  if (
    toCanonicalJson(sourceCheck.person.sprint1State?.techniqueStates ?? []) !==
    toCanonicalJson(techniqueActorPerson.sprint1State?.techniqueStates ?? [])
  ) {
    throw new Error("battle participant techniqueStates must match current world person");
  }

  const battleReady = normalizeOfficialBattleCalendar(afterWeekly1, battleIds);
  const afterBattle = commitOfficialBattle(battleReady, battleIds, input.sha256Provider);
  const afterBattleDigest = digestCheckpoint(afterBattle, input.sha256Provider);

  if (afterBattle.runtimeState.battleResults.length < 1) {
    throw new Error("global battleResults empty after commit");
  }
  if (afterBattle.runtimeState.battleResults[0]?.detailedLog === undefined) {
    throw new Error("BattleResult.detailedLog missing after commit");
  }
  if (afterBattle.runtimeState.battleResultWeekState.results.length < 1) {
    throw new Error("current-week battle registry empty after commit");
  }
  const battleEvents = afterBattle.runtimeState.eventStream.filter(
    (event) => event.eventType === "battle.started" || event.eventType === "battle.finished",
  );
  if (
    !battleEvents.some((event) => event.eventType === "battle.started") ||
    !battleEvents.some((event) => event.eventType === "battle.finished")
  ) {
    throw new Error("missing battle.started/battle.finished events");
  }
  for (const event of battleEvents) {
    if (event.payload["detailedLog"] !== undefined) {
      throw new Error("detailedLog must not be copied into events.jsonl payloads");
    }
  }

  const globalCountAfterBattle = afterBattle.runtimeState.battleResults.length;
  const detailedLogCanonical = toCanonicalJson(
    afterBattle.runtimeState.battleResults[0]?.detailedLog,
  );

  const afterWeekly2 = expectOk(
    runSprint1WeeklyStep(afterBattle, input.sha256Provider),
    "runSprint1WeeklyStep#2",
  );
  const afterWeekly2Digest = digestCheckpoint(afterWeekly2, input.sha256Provider);

  if (afterWeekly2.runtimeState.battleResultWeekState.results.length !== 0) {
    throw new Error("week registry results must reset to [] after second weekly step");
  }
  if (afterWeekly2.runtimeState.battleResults.length !== globalCountAfterBattle) {
    throw new Error("global battleResults must be retained across week reset");
  }
  if (
    toCanonicalJson(afterWeekly2.runtimeState.battleResults[0]?.detailedLog) !==
    detailedLogCanonical
  ) {
    throw new Error("detailedLog must be retained across week reset");
  }

  if (existsSync(input.outputRoot)) {
    rmSync(input.outputRoot, { recursive: true, force: true });
  }
  mkdirSync(input.outputRoot, { recursive: true });

  const clock = () => new Date("2026-08-01T00:00:00.000Z");
  const runId = createRunIdGenerator(clock).next();
  const nameDataHash = computeNameDataHash(nameData.manifest, input.sha256Provider);

  const written = buildAndWriteSprint1RunOutput({
    fs: createNodeFsOps(),
    outputRoot: input.outputRoot,
    runId,
    cwd: input.repoRoot,
    nameDataHash,
    nameDataVersion: nameData.manifest.nameDataVersion,
    configSchemaVersion: fixtures.config.schemaVersion,
    simulationSpecVersion: createResult.initialWorldSnapshotForOutput.simulationSpecVersion,
    performanceTargets: fixtures.config.performanceTargets,
    createResult,
    simulation: {
      finalSession: afterWeekly2,
      events: afterWeekly2.runtimeState.eventStream,
      yearEnds: [],
      weeksExecuted: 2,
      finalIntegrity: evaluateReferenceIntegrity(afterWeekly2.runtimeState.worldState),
    },
    provider: input.sha256Provider,
    realStartedAt: clock(),
    realEndedAt: new Date("2026-08-01T00:00:01.000Z"),
    totalMilliseconds: 1000,
  });

  if (!written.validationReport.overallPassed) {
    throw new Error(`integrated fixed7 validation failed for ${input.runKey}`);
  }

  const runMetadata = JSON.parse(
    readFileSync(join(written.atomic.runDirectory, "run-metadata.json"), "utf8"),
  ) as { yearsExecuted?: unknown; weeksExecuted?: unknown };
  if (runMetadata.yearsExecuted !== 0) {
    throw new Error(`expected yearsExecuted=0, got ${String(runMetadata.yearsExecuted)}`);
  }
  if (runMetadata.weeksExecuted !== 2) {
    throw new Error(`expected weeksExecuted=2, got ${String(runMetadata.weeksExecuted)}`);
  }
  const csv = readFileSync(join(written.atomic.runDirectory, "yearly-statistics.csv"), "utf8");
  const csvLines = csv.replace(/\r\n/g, "\n").split("\n");
  const csvDataRows = csvLines.filter((line, index) => index > 0 && line.trim().length > 0).length;
  if (csvDataRows !== 0) {
    throw new Error(`expected yearly-statistics data rows=0, got ${String(csvDataRows)}`);
  }

  void FIXED_OUTPUT_FILE_NAMES;

  const verificationRoot = join(input.repoRoot, SPRINT1_VERIFICATION_OUTPUT_DIR);
  const relativeRunDirectory = relative(verificationRoot, written.atomic.runDirectory).replace(
    /\\/g,
    "/",
  );

  return {
    artifact: { runKey: input.runKey, relativeRunDirectory },
    absoluteRunDirectory: written.atomic.runDirectory,
    techniqueActorPersonId: prepared.techniqueActorPersonId,
    battleParticipantIds: battleIds,
    checkpointDigests: {
      fresh: freshDigest,
      afterWeekly1: afterWeekly1Digest,
      afterBattle: afterBattleDigest,
      afterWeekly2: afterWeekly2Digest,
    },
    weekRegistryReset: true,
    globalBattleResultsRetained: true,
    yearsExecuted: 0,
    weeksExecuted: 2,
    csvDataRows,
  };
}

function digestsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

export type IntegratedScenarioVerificationResult = {
  section: IntegratedScenarioSection;
  failures: VerificationIssue[];
};

/**
 * Run the weekly + technique + official battle + week-reset + fixed7 scenario twice.
 */
export function verifyIntegratedScenario(input: {
  repoRoot: string;
  runsRoot: string;
}): IntegratedScenarioVerificationResult {
  const sha256Provider = createNodeSha256Provider();
  const failures: VerificationIssue[] = [];

  try {
    const runA = runIntegratedOnce({
      repoRoot: input.repoRoot,
      runKey: "integrated-a",
      outputRoot: join(input.runsRoot, "integrated-a"),
      sha256Provider,
    });
    const runB = runIntegratedOnce({
      repoRoot: input.repoRoot,
      runKey: "integrated-b",
      outputRoot: join(input.runsRoot, "integrated-b"),
      sha256Provider,
    });

    const checkpointDigestsMatch =
      digestsEqual(runA.checkpointDigests.fresh, runB.checkpointDigests.fresh) &&
      digestsEqual(runA.checkpointDigests.afterWeekly1, runB.checkpointDigests.afterWeekly1) &&
      digestsEqual(runA.checkpointDigests.afterBattle, runB.checkpointDigests.afterBattle) &&
      digestsEqual(runA.checkpointDigests.afterWeekly2, runB.checkpointDigests.afterWeekly2);

    const fixed7Compare = compareSameSeedFixedSeven(
      runA.absoluteRunDirectory,
      runB.absoluteRunDirectory,
    );
    const deterministicMatch = checkpointDigestsMatch && fixed7Compare.passed;

    if (!checkpointDigestsMatch) {
      failures.push({
        code: "SPRINT1_INTEGRATED_CHECKPOINT_MISMATCH",
        message: "integrated scenario checkpoint digests differ between independent runs",
        scope: "integratedScenario/checkpoints",
      });
    }
    if (!fixed7Compare.passed) {
      failures.push({
        code: "SPRINT1_INTEGRATED_FIXED7_MISMATCH",
        message: `integrated fixed7 mismatch: ${fixed7Compare.differences.join("; ")}`,
        scope: "integratedScenario/fixed7",
      });
    }
    if (runA.techniqueActorPersonId !== runB.techniqueActorPersonId) {
      failures.push({
        code: "SPRINT1_INTEGRATED_ACTOR_MISMATCH",
        message: "technique actor personId differed across integrated runs",
        scope: "integratedScenario/actor",
      });
    }

    const section: IntegratedScenarioSection = {
      status: failures.length === 0 ? "passed" : "failed",
      seed: SPRINT1_BASE_SEED,
      weeksExecuted: 2,
      yearsExecuted: 0,
      techniqueActorPersonId: runA.techniqueActorPersonId,
      battleParticipants: [...runA.battleParticipantIds],
      battleKind: "official",
      strategy: "default_strategy",
      weekRegistryReset: runA.weekRegistryReset && runB.weekRegistryReset,
      globalBattleResultsRetained:
        runA.globalBattleResultsRetained && runB.globalBattleResultsRetained,
      deterministicMatch,
      runA: runA.artifact,
      runB: runB.artifact,
      checkpointDigestsMatch,
      detail:
        failures.length === 0
          ? "integrated weekly×2 + technique actor bind + official/default_strategy battle + week reset + fixed7 passed"
          : failures.map((item) => item.message).join("; "),
    };
    return { section, failures };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_INTEGRATED_FAILED",
      message,
      scope: "integratedScenario",
    });
    return {
      section: {
        status: "failed",
        seed: SPRINT1_BASE_SEED,
        weeksExecuted: 0,
        yearsExecuted: 0,
        techniqueActorPersonId: null,
        battleParticipants: [],
        battleKind: "official",
        strategy: "default_strategy",
        weekRegistryReset: false,
        globalBattleResultsRetained: false,
        deterministicMatch: false,
        runA: { runKey: "integrated-a", relativeRunDirectory: "runs/integrated-a/(failed)" },
        runB: { runKey: "integrated-b", relativeRunDirectory: "runs/integrated-b/(failed)" },
        checkpointDigestsMatch: false,
        detail: message,
      },
      failures,
    };
  }
}
