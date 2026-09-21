/**
 * Production `commitRunBattlePlan` — atomic RunBattleCommitPlan apply (12 §23.2 / 10 §1.3 / S01-008).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Person } from "../domain.js";
import type { PersonId, TechniqueId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { cloneWorldEngineState } from "../world-engine/clone.js";
import { WorldEngineError } from "../world-engine/errors.js";
import { cloneRuntimeState } from "../world-engine/processor-runtime.js";
import type { WorldEngineState } from "../world-engine/types.js";
import {
  appendCommittedBattleResultToRuntimeStores,
  assertBattleResultMatchIdNotInStore,
  assertBattleResultsWeekSuffixInvariant,
} from "./battle-result-store.js";
import {
  assertBattleResultMatchIdNotInWeekState,
  countCompletedMatchesForPersonThisWorldWeek,
  type BattleResultWeekState,
} from "./battle-result-week-state.js";
import type {
  BattleDevelopmentEffects,
  BattleParticipantDevelopmentEffects,
  BattleResult,
} from "./battle-result-types.js";
import type { BattleKind } from "./battle-enums.js";
import type { BattleSide } from "./battle-enums.js";
import { validateBattleParticipant } from "./battle-participant.js";
import { clampInteger } from "./battle-turn-math.js";
import { allocateBattleEventCandidates } from "./event-envelope-sprint1.js";
import type { InitialWeeklyTrainingSidecarEntry } from "./initial-weekly-training-sidecar.js";
import { collectKnownTechniqueIdsForBattle } from "../sprint3/generated-technique-battle-catalog.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  snapshotPlainJsonValueOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import {
  computeRunBattleCommitPlanHash,
  validateRunBattleCommitPlanStructure,
  type RunBattleCommitPlan,
} from "./run-battle-to-completion.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import {
  assertBattleResultWeekMatchesWorldDate,
  type Sprint1RunRuntimeState,
  type Sprint1RunSession,
} from "./sprint1-run-session.js";
import { validateSprint1RunSession } from "./validate-sprint1-run-session.js";
import { validateStartBattleRuntimeTransitionAgainst } from "./start-battle-runtime-transition.js";
import { validateBattleResult } from "./validate-battle-result.js";
import type { WeeklyTrainingSidecarState } from "./weekly-training-sidecar-state.js";
import { validateWeeklyTrainingPersonRecord } from "./weekly-training-types.js";
import { applyOriginalTechniqueFirstUseMatchIdAfterBattleCommit } from "../sprint3/persist-original-technique-first-use-match-id.js";

export type CommitRunBattlePlanInput = {
  session: Sprint1RunSession;
  commitPlan: RunBattleCommitPlan;
};

/**
 * Creates the only commit-plan instance that preflight and apply may inspect.
 * The descriptor-based snapshot never invokes caller-owned getters.
 */
function snapshotCommitPlan(value: unknown): ValidationResult<RunBattleCommitPlan> {
  const issues: ValidationIssue[] = [];
  const plan = snapshotPlainObjectOrFail(value, "/commitPlan", issues);
  if (plan === undefined) {
    return failure(issues);
  }
  assertNoAccessors(value as object, "/commitPlan", issues);

  const storedStructuralValidation = plan["structuralValidation"];
  if (
    storedStructuralValidation !== null &&
    typeof storedStructuralValidation === "object" &&
    !Array.isArray(storedStructuralValidation)
  ) {
    assertNoAccessors(storedStructuralValidation, "/commitPlan/structuralValidation", issues);
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const plainSnapshot = snapshotPlainJsonValueOrFail(value, "/commitPlan", issues);
  if (plainSnapshot === undefined || issues.length > 0) {
    return failure(issues);
  }

  try {
    return success(
      deepFreezePlainJson(cloneValidatedPlainJson(plainSnapshot) as unknown as RunBattleCommitPlan),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      {
        path: "/commitPlan",
        message: `commit plan snapshot freeze failed: ${detail}`,
        actual: detail,
        expected: "cloneable plain JSON RunBattleCommitPlan",
      },
    ]);
  }
}

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? prefix : `${prefix}${issue.path}`,
  }));
}

function cloneSprint1RuntimeDraft(
  runtimeState: Sprint1RunRuntimeState,
): ValidationResult<Sprint1RunRuntimeState> {
  try {
    return success({
      worldState: cloneWorldEngineState(runtimeState.worldState),
      worldRngState: cloneValidatedPlainJson(runtimeState.worldRngState),
      matchIdGeneratorState: cloneValidatedPlainJson(runtimeState.matchIdGeneratorState),
      weeklyTrainingSidecars: cloneValidatedPlainJson(runtimeState.weeklyTrainingSidecars),
      processorRuntimeStates: cloneRuntimeState(runtimeState.processorRuntimeStates),
      eventStream: runtimeState.eventStream.map((event) => cloneValidatedPlainJson(event)),
      eventAllocationState: cloneValidatedPlainJson(runtimeState.eventAllocationState),
      battleResults: runtimeState.battleResults.map((result) => cloneValidatedPlainJson(result)),
      battleResultWeekState: cloneValidatedPlainJson(runtimeState.battleResultWeekState),
      ...(runtimeState.originalTechniqueLifecycleRuntime === undefined
        ? {}
        : {
            originalTechniqueLifecycleRuntime: cloneValidatedPlainJson(
              runtimeState.originalTechniqueLifecycleRuntime,
            ),
          }),
      ...(runtimeState.mentorshipEntrypointRuntime === undefined
        ? {}
        : {
            mentorshipEntrypointRuntime: cloneValidatedPlainJson(
              runtimeState.mentorshipEntrypointRuntime,
            ),
          }),
      ...(runtimeState.techniqueTeachingSelectionRuntime === undefined
        ? {}
        : {
            techniqueTeachingSelectionRuntime: cloneValidatedPlainJson(
              runtimeState.techniqueTeachingSelectionRuntime,
            ),
          }),
      ...(runtimeState.generatedTechniqueCatalogOverlay === undefined
        ? {}
        : {
            generatedTechniqueCatalogOverlay: cloneValidatedPlainJson(
              runtimeState.generatedTechniqueCatalogOverlay,
            ),
          }),
    });
  } catch (error) {
    const detail =
      error instanceof WorldEngineError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return failure([
      {
        path: "/runtimeState/worldState",
        message: `runtime draft clone failed: ${detail}`,
        actual: detail,
        expected: "cloneable Sprint1RunRuntimeState",
      },
    ]);
  }
}

/** SHA-256 of canonical WorldEngineState (12 §23.2 expectedWorldStateHash material). */
export function computeExpectedWorldStateHash(
  worldState: WorldEngineState,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(worldState), "/expectedWorldStateHash");
}

/** Week-registry completed-match count helper (10 §1.3.3). */
export function computeMatchesCompletedThisWorldWeekBeforeBattle(
  weekState: BattleResultWeekState,
  personId: PersonId | string,
): number {
  return countCompletedMatchesForPersonThisWorldWeek(weekState, personId);
}

function findWorldPerson(
  worldState: WorldEngineState,
  personId: PersonId,
): ValidationResult<Person> {
  const person = worldState.persons.find((entry) => entry.personId === personId);
  if (person === undefined) {
    return failure([
      {
        path: "/worldState/persons",
        message: "world person not found for battle participant",
        actual: personId,
        expected: "matching PersonId in worldState.persons",
      },
    ]);
  }
  return success(person);
}

function findSidecarEntry(
  sidecars: WeeklyTrainingSidecarState,
  personId: PersonId,
): ValidationResult<InitialWeeklyTrainingSidecarEntry> {
  const entry = sidecars.entries.find((candidate) => candidate.personId === personId);
  if (entry === undefined) {
    return failure([
      {
        path: "/weeklyTrainingSidecars/entries",
        message: "missing sidecar entry for battle participant",
        actual: personId,
        expected: "matching PersonId in weeklyTrainingSidecars.entries",
      },
    ]);
  }
  return success(entry);
}

function rebuildParticipantSourceSnapshotHash(input: {
  worldState: WorldEngineState;
  sidecars: WeeklyTrainingSidecarState;
  personId: PersonId;
  side: BattleSide;
  battleKind: BattleKind;
  config: Sprint1RunSession["context"]["sprint1Config"];
  knownTechniqueIds: ReadonlySet<string>;
  provider: Sha256Provider;
}): ValidationResult<string> {
  const person = findWorldPerson(input.worldState, input.personId);
  if (!person.ok) {
    return failure(prefixIssues(person.issues, "/participantRebuild"));
  }
  const sidecarEntry = findSidecarEntry(input.sidecars, input.personId);
  if (!sidecarEntry.ok) {
    return failure(prefixIssues(sidecarEntry.issues, "/participantRebuild"));
  }

  const source = {
    person: person.value,
    temporaryCondition: sidecarEntry.value.temporaryCondition,
  };
  const participant = validateBattleParticipant(
    source,
    {
      side: input.side,
      battleKind: input.battleKind,
      worldDate: input.worldState.worldDate,
      config: input.config,
      knownTechniqueIds: input.knownTechniqueIds,
    },
    input.provider,
  );
  if (!participant.ok) {
    return failure(prefixIssues(participant.issues, `/participantRebuild/${input.personId}`));
  }
  return success(participant.value.sourceSnapshotHash);
}

function verifyPostProcessMatchCounts(input: {
  battleResult: BattleResult;
  battleResultWeekState: BattleResultWeekState;
}): ValidationResult<true> {
  const context = input.battleResult.postProcessContext;
  const issues: ValidationIssue[] = [];
  for (const label of ["participantA", "participantB"] as const) {
    const side = context[label];
    const actual = computeMatchesCompletedThisWorldWeekBeforeBattle(
      input.battleResultWeekState,
      side.personId,
    );
    if (actual !== side.matchesCompletedThisWorldWeekBeforeBattle) {
      issues.push({
        path: `/battleResult/postProcessContext/${label}/matchesCompletedThisWorldWeekBeforeBattle`,
        message:
          "matchesCompletedThisWorldWeekBeforeBattle must match the current week registry count",
        actual,
        expected: String(side.matchesCompletedThisWorldWeekBeforeBattle),
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(true);
}

function applyTechniqueStateDeltas(
  person: Person,
  deltas: BattleParticipantDevelopmentEffects["techniqueStateDeltas"],
  personPath: string,
): ValidationResult<Person> {
  const sprint1State = person.sprint1State;
  if (sprint1State === undefined) {
    return failure([
      {
        path: `${personPath}/sprint1State`,
        message: "Person.sprint1State is required to apply techniqueStateDeltas",
        expected: "Sprint1PersonState",
      },
    ]);
  }

  const nextTechniques = sprint1State.techniqueStates.map((technique) => ({
    ...technique,
  }));
  for (const delta of deltas) {
    const index = nextTechniques.findIndex(
      (technique) => technique.techniqueId === delta.techniqueId,
    );
    if (index < 0) {
      return failure([
        {
          path: `${personPath}/sprint1State/techniqueStates`,
          message: "techniqueStateDelta references an unknown technique on the person",
          actual: delta.techniqueId,
          expected: "TechniqueId present on Person.sprint1State.techniqueStates",
        },
      ]);
    }
    const current = nextTechniques[index]!;
    nextTechniques[index] = {
      ...current,
      masteryHundredths: current.masteryHundredths + delta.masteryHundredthsDelta,
      attemptedUseCount: current.attemptedUseCount + delta.attemptedUseCountDelta,
      successfulUseCount: current.successfulUseCount + delta.successfulUseCountDelta,
    };
  }
  return success({
    ...person,
    sprint1State: {
      ...sprint1State,
      techniqueStates: nextTechniques,
    },
  } as Person);
}

function applyParticipantDevelopmentEffects(input: {
  worldState: WorldEngineState;
  sidecars: WeeklyTrainingSidecarState;
  personId: PersonId;
  effects: BattleParticipantDevelopmentEffects;
}): ValidationResult<{ worldState: WorldEngineState; sidecars: WeeklyTrainingSidecarState }> {
  const personIndex = input.worldState.persons.findIndex(
    (person) => person.personId === input.personId,
  );
  if (personIndex < 0) {
    return failure([
      {
        path: "/worldState/persons",
        message: "world person not found for developmentEffects apply",
        actual: input.personId,
      },
    ]);
  }
  const sidecarIndex = input.sidecars.entries.findIndex(
    (entry) => entry.personId === input.personId,
  );
  if (sidecarIndex < 0) {
    return failure([
      {
        path: "/weeklyTrainingSidecars/entries",
        message: "sidecar entry not found for developmentEffects apply",
        actual: input.personId,
      },
    ]);
  }

  const sourcePerson = input.worldState.persons[personIndex]!;
  const sourceSidecar = input.sidecars.entries[sidecarIndex]!;
  const personPath = `/worldState/persons/${String(personIndex)}`;
  const sourceSprint1State = sourcePerson.sprint1State;
  if (sourceSprint1State === undefined) {
    return failure([
      {
        path: `${personPath}/sprint1State`,
        message: "Person.sprint1State is required to apply developmentEffects",
        expected: "Sprint1PersonState",
      },
    ]);
  }

  const participantEffects = input.effects;
  let nextPerson: Person = {
    ...sourcePerson,
    sprint1State: {
      ...sourceSprint1State,
      currentMental: participantEffects.currentMentalAfter,
    },
  };
  const techniqueApplied = applyTechniqueStateDeltas(
    nextPerson,
    participantEffects.techniqueStateDeltas,
    personPath,
  );
  if (!techniqueApplied.ok) {
    return failure(techniqueApplied.issues);
  }
  nextPerson = techniqueApplied.value;

  const nextTemporaryCondition = {
    fatigue: clampInteger(
      sourceSidecar.temporaryCondition.fatigue + participantEffects.persistentFatigueDelta,
      0,
      100,
    ),
    injury: clampInteger(
      sourceSidecar.temporaryCondition.injury + participantEffects.injuryDelta,
      0,
      100,
    ),
    condition: participantEffects.conditionAfter,
    confidence: participantEffects.confidenceAfter,
  };

  const nextSidecarEntry: InitialWeeklyTrainingSidecarEntry = {
    ...sourceSidecar,
    temporaryCondition: nextTemporaryCondition,
  };

  const recordCheck = validateWeeklyTrainingPersonRecord({
    person: nextPerson,
    growthProfile: nextSidecarEntry.growthProfile,
    growthPotential: nextSidecarEntry.growthPotential,
    statGrowthRemainders: nextSidecarEntry.statGrowthRemainders,
    temporaryCondition: nextSidecarEntry.temporaryCondition,
    motivationFactor: nextSidecarEntry.motivationFactor,
    plannerContext: nextSidecarEntry.plannerContext,
    statTargetContext: nextSidecarEntry.statTargetContext,
    techniqueTargetContexts: nextSidecarEntry.techniqueTargetContexts,
    teacherFactorKey: nextSidecarEntry.teacherFactorKey,
    discipleCount: nextSidecarEntry.discipleCount,
  });
  if (!recordCheck.ok) {
    return failure(prefixIssues(recordCheck.issues, `/developmentEffects/${input.personId}`));
  }

  const nextPersons = input.worldState.persons.map((person, index) =>
    index === personIndex ? nextPerson : person,
  );
  const nextEntries = input.sidecars.entries.map((entry, index) =>
    index === sidecarIndex ? nextSidecarEntry : entry,
  );

  return success({
    worldState: {
      ...input.worldState,
      persons: nextPersons,
    },
    sidecars: {
      ...input.sidecars,
      entries: nextEntries,
    },
  });
}

function isStructuredDevelopmentEffects(
  value: BattleResult["developmentEffects"],
): value is BattleDevelopmentEffects {
  return (
    !Array.isArray(value) &&
    value !== null &&
    typeof value === "object" &&
    "participantA" in value &&
    "participantB" in value
  );
}

function applyCompletedDevelopmentEffects(
  draft: Sprint1RunRuntimeState,
  battleResult: BattleResult,
): ValidationResult<Sprint1RunRuntimeState> {
  if (!isStructuredDevelopmentEffects(battleResult.developmentEffects)) {
    return failure([
      {
        path: "/battleResult/developmentEffects",
        message: "completed BattleResult must carry structured developmentEffects",
      },
    ]);
  }
  const effects = battleResult.developmentEffects;
  let worldState = draft.worldState;
  let sidecars = draft.weeklyTrainingSidecars;

  for (const [personId, participantEffects] of [
    [battleResult.participantAId, effects.participantA] as const,
    [battleResult.participantBId, effects.participantB] as const,
  ]) {
    const applied = applyParticipantDevelopmentEffects({
      worldState,
      sidecars,
      personId,
      effects: participantEffects,
    });
    if (!applied.ok) {
      return failure(applied.issues);
    }
    worldState = applied.value.worldState;
    sidecars = applied.value.sidecars;
  }

  return success({
    ...draft,
    worldState,
    weeklyTrainingSidecars: sidecars,
  });
}

function preflightCommitRunBattlePlan(
  input: CommitRunBattlePlanInput,
  provider: Sha256Provider,
): ValidationResult<RunBattleCommitPlan> {
  const { session } = input;
  const sessionValidation = validateSprint1RunSession(session, provider);
  if (!sessionValidation.ok) {
    return failure(prefixIssues(sessionValidation.issues, "/session"));
  }
  const snappedPlan = snapshotCommitPlan(input.commitPlan as unknown);
  if (!snappedPlan.ok) {
    return failure(snappedPlan.issues);
  }
  const plan = snappedPlan.value;
  const { context, runtimeState } = session;
  const issues: ValidationIssue[] = [];

  const {
    commitPlanHash,
    structuralValidation: storedStructuralValidationValue,
    ...structureMaterial
  } = plan;
  if (
    storedStructuralValidationValue === null ||
    typeof storedStructuralValidationValue !== "object" ||
    Array.isArray(storedStructuralValidationValue)
  ) {
    return failure([
      {
        path: "/commitPlan/structuralValidation",
        message: "stored structuralValidation must be a plain object",
        expected: "RunBattleCommitPlanStructuralValidation",
      },
    ]);
  }
  const storedStructuralValidation =
    storedStructuralValidationValue as RunBattleCommitPlan["structuralValidation"];
  const recomputedStructural = validateRunBattleCommitPlanStructure(structureMaterial);
  if (toCanonicalJson(storedStructuralValidation) !== toCanonicalJson(recomputedStructural)) {
    issues.push({
      path: "/commitPlan/structuralValidation",
      message:
        "stored structuralValidation must equal the canonical recomputed structure validation",
      actual: toCanonicalJson(storedStructuralValidation),
      expected: toCanonicalJson(recomputedStructural),
    });
  }
  if (!recomputedStructural.overallPassed) {
    for (const violation of recomputedStructural.violations) {
      issues.push({
        path: "/commitPlan/structuralValidation",
        message: violation.reason,
      });
    }
  }
  if (!storedStructuralValidation.overallPassed) {
    issues.push({
      path: "/commitPlan/structuralValidation/overallPassed",
      message: "stored structuralValidation.overallPassed must be true",
      actual: storedStructuralValidation.overallPassed,
      expected: "true",
    });
  }

  const withoutHash = {
    ...structureMaterial,
    structuralValidation: storedStructuralValidation,
  };
  const hashResult = computeRunBattleCommitPlanHash(withoutHash, provider);
  if (!hashResult.ok) {
    issues.push(...prefixIssues(hashResult.issues, "/commitPlan"));
  } else if (hashResult.value !== commitPlanHash) {
    issues.push({
      path: "/commitPlan/commitPlanHash",
      message: "commitPlanHash must equal the recomputed canonical digest",
      actual: commitPlanHash,
      expected: hashResult.value,
    });
  }

  if (plan.simulationId !== context.simulationId) {
    issues.push({
      path: "/commitPlan/simulationId",
      message: "plan.simulationId must equal run simulationId",
      actual: plan.simulationId,
      expected: context.simulationId,
    });
  }
  if (plan.runRuleSnapshotHash !== context.runRuleSnapshotHash) {
    issues.push({
      path: "/commitPlan/runRuleSnapshotHash",
      message: "plan.runRuleSnapshotHash must equal run runRuleSnapshotHash",
      actual: plan.runRuleSnapshotHash,
      expected: context.runRuleSnapshotHash,
    });
  }

  const worldHash = computeExpectedWorldStateHash(runtimeState.worldState, provider);
  if (!worldHash.ok) {
    issues.push(...prefixIssues(worldHash.issues, "/runtimeState"));
  } else if (worldHash.value !== plan.expectedWorldStateHash) {
    issues.push({
      path: "/commitPlan/expectedWorldStateHash",
      message: "expectedWorldStateHash must match the current world state digest",
      actual: worldHash.value,
      expected: plan.expectedWorldStateHash,
    });
  }

  const transition = validateStartBattleRuntimeTransitionAgainst(
    plan.startRuntimeTransition,
    {
      worldRngState: runtimeState.worldRngState,
      matchIdGeneratorState: runtimeState.matchIdGeneratorState,
    },
    provider,
  );
  if (!transition.ok) {
    issues.push(...prefixIssues(transition.issues, "/commitPlan/startRuntimeTransition"));
  }

  const knownTechniqueIds = collectKnownTechniqueIdsForBattle(
    context.techniqueCatalog.definitions,
    runtimeState.generatedTechniqueCatalogOverlay,
  ) as Set<TechniqueId>;
  const hashA = rebuildParticipantSourceSnapshotHash({
    worldState: runtimeState.worldState,
    sidecars: runtimeState.weeklyTrainingSidecars,
    personId: plan.battleResult.participantAId,
    side: "sideA",
    battleKind: plan.battleResult.battleKind,
    config: context.sprint1Config,
    knownTechniqueIds,
    provider,
  });
  if (!hashA.ok) {
    issues.push(...prefixIssues(hashA.issues, "/commitPlan"));
  } else if (hashA.value !== plan.expectedParticipantASourceSnapshotHash) {
    issues.push({
      path: "/commitPlan/expectedParticipantASourceSnapshotHash",
      message: "rebuilt participant A sourceSnapshotHash does not match the plan",
      actual: hashA.value,
      expected: plan.expectedParticipantASourceSnapshotHash,
    });
  }

  const hashB = rebuildParticipantSourceSnapshotHash({
    worldState: runtimeState.worldState,
    sidecars: runtimeState.weeklyTrainingSidecars,
    personId: plan.battleResult.participantBId,
    side: "sideB",
    battleKind: plan.battleResult.battleKind,
    config: context.sprint1Config,
    knownTechniqueIds,
    provider,
  });
  if (!hashB.ok) {
    issues.push(...prefixIssues(hashB.issues, "/commitPlan"));
  } else if (hashB.value !== plan.expectedParticipantBSourceSnapshotHash) {
    issues.push({
      path: "/commitPlan/expectedParticipantBSourceSnapshotHash",
      message: "rebuilt participant B sourceSnapshotHash does not match the plan",
      actual: hashB.value,
      expected: plan.expectedParticipantBSourceSnapshotHash,
    });
  }

  const weekMatch = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: runtimeState.battleResultWeekState,
    worldState: runtimeState.worldState,
  });
  if (!weekMatch.ok) {
    issues.push(...prefixIssues(weekMatch.issues, "/runtimeState"));
  }

  const matchCounts = verifyPostProcessMatchCounts({
    battleResult: plan.battleResult,
    battleResultWeekState: runtimeState.battleResultWeekState,
  });
  if (!matchCounts.ok) {
    issues.push(...prefixIssues(matchCounts.issues, "/commitPlan"));
  }

  const validatedResult = validateBattleResult(
    plan.battleResult,
    context.runRuleSnapshot,
    provider,
  );
  if (!validatedResult.ok) {
    issues.push(...prefixIssues(validatedResult.issues, "/commitPlan/battleResult"));
  }

  const globalDup = assertBattleResultMatchIdNotInStore(
    runtimeState.battleResults,
    plan.battleResult.matchId,
  );
  if (!globalDup.ok) {
    issues.push(...prefixIssues(globalDup.issues, "/runtimeState"));
  }
  const weekDup = assertBattleResultMatchIdNotInWeekState(
    runtimeState.battleResultWeekState,
    plan.battleResult.matchId,
  );
  if (!weekDup.ok) {
    issues.push(...prefixIssues(weekDup.issues, "/runtimeState"));
  }

  const suffix = assertBattleResultsWeekSuffixInvariant({
    battleResults: runtimeState.battleResults,
    battleResultWeekState: runtimeState.battleResultWeekState,
  });
  if (!suffix.ok) {
    issues.push(...prefixIssues(suffix.issues, "/runtimeState"));
  }

  const isCompleted = plan.battleResult.resultKind === "completed";
  const isResolutionError =
    plan.battleResult.resultKind === "failed" && plan.battleResult.endReason === "resolution_error";
  if (!isCompleted && !isResolutionError) {
    issues.push({
      path: "/commitPlan/battleResult/resultKind",
      message: "commitRunBattlePlan accepts only completed or resolution_error plans",
      actual: `${plan.battleResult.resultKind}/${plan.battleResult.endReason}`,
      expected: "completed/* or failed/resolution_error",
    });
  }
  if (isCompleted && !plan.battleResult.validation.overallPassed) {
    issues.push({
      path: "/commitPlan/battleResult/validation",
      message: "completed BattleResult.validation.overallPassed must be true",
      actual: plan.battleResult.validation.overallPassed,
      expected: "true",
    });
  }
  if (isResolutionError && plan.battleResult.validation.overallPassed) {
    issues.push({
      path: "/commitPlan/battleResult/validation",
      message: "resolution_error BattleResult.validation.overallPassed must be false",
      actual: plan.battleResult.validation.overallPassed,
      expected: "false",
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(plan);
}

/**
 * Validate then atomically apply a RunBattleCommitPlan to the session runtime root.
 * On any failure the input session is returned unchanged.
 */
export function commitRunBattlePlan(
  input: CommitRunBattlePlanInput,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunSession> {
  const validatedInput = validateSprint1RunSession(input.session, provider);
  if (!validatedInput.ok) {
    return failure(prefixIssues(validatedInput.issues, "/session"));
  }
  input = {
    ...input,
    session: validatedInput.value,
  };
  const preflight = preflightCommitRunBattlePlan(input, provider);
  if (!preflight.ok) {
    return failure(preflight.issues);
  }
  const plan = preflight.value;

  const draftResult = cloneSprint1RuntimeDraft(input.session.runtimeState);
  if (!draftResult.ok) {
    return failure(draftResult.issues);
  }
  let draft = draftResult.value;

  draft = {
    ...draft,
    worldRngState: cloneValidatedPlainJson(plan.startRuntimeTransition.nextWorldRngState),
    matchIdGeneratorState: cloneValidatedPlainJson(
      plan.startRuntimeTransition.nextMatchIdGeneratorState,
    ),
  };

  if (plan.battleResult.resultKind === "completed") {
    const applied = applyCompletedDevelopmentEffects(draft, plan.battleResult);
    if (!applied.ok) {
      return failure(applied.issues);
    }
    draft = applied.value;
  }

  const eventAllocation = allocateBattleEventCandidates({
    candidates: plan.eventCandidates,
    startSequence: draft.eventAllocationState.nextSequence,
    simulationId: input.session.context.simulationId,
  });
  if (!eventAllocation.ok) {
    return failure(prefixIssues(eventAllocation.issues, "/eventAllocation"));
  }

  draft = {
    ...draft,
    eventStream: deepFreezePlainJson([...draft.eventStream, ...eventAllocation.value.envelopes]),
    eventAllocationState: deepFreezePlainJson({
      ...draft.eventAllocationState,
      nextSequence: eventAllocation.value.nextSequence,
    }),
  };

  const stores = appendCommittedBattleResultToRuntimeStores({
    battleResults: draft.battleResults,
    battleResultWeekState: draft.battleResultWeekState,
    result: plan.battleResult,
  });
  if (!stores.ok) {
    return failure(prefixIssues(stores.issues, "/runtimeState"));
  }
  draft = {
    ...draft,
    battleResults: [...stores.value.battleResults],
    battleResultWeekState: stores.value.battleResultWeekState,
  };

  const firstUseMatchId = applyOriginalTechniqueFirstUseMatchIdAfterBattleCommit({
    sprint3Config: input.session.context.sprint3Config,
    runtimeState: draft,
    battleResult: plan.battleResult,
  });
  if (!firstUseMatchId.ok) {
    return failure(prefixIssues(firstUseMatchId.issues, "/runtimeState"));
  }
  draft = firstUseMatchId.value;

  const weekMatch = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: draft.battleResultWeekState,
    worldState: draft.worldState,
  });
  if (!weekMatch.ok) {
    return failure(prefixIssues(weekMatch.issues, "/runtimeState"));
  }
  const suffix = assertBattleResultsWeekSuffixInvariant({
    battleResults: draft.battleResults,
    battleResultWeekState: draft.battleResultWeekState,
  });
  if (!suffix.ok) {
    return failure(prefixIssues(suffix.issues, "/runtimeState"));
  }

  const draftSessionValidation = validateSprint1RunSession(
    {
      context: input.session.context,
      runtimeState: draft,
    },
    provider,
  );
  if (!draftSessionValidation.ok) {
    return failure(prefixIssues(draftSessionValidation.issues, "/draft"));
  }

  return success(
    deepFreezePlainJson({
      context: input.session.context,
      runtimeState: deepFreezePlainJson(draft),
    }),
  );
}
