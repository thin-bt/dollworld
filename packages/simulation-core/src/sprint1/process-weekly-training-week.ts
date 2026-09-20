/**
 * Weekly training / learning processor entry point (10 mini-spec §7, §8, §9, §10, §11).
 *
 * Everything is validated before a single RNG call happens, the RNG is imported into
 * a private instance so the caller's `SeededRngState` object is never mutated, and a
 * hard failure anywhere in the week returns `failure` with no partial result: the
 * caller keeps its previous WorldState, RNG state, and ProcessorRuntimeState (10 §10).
 *
 * No `eventId` / `simulationId` / `sequence` is produced here; the WorldEngine append
 * layer wraps the returned ordered candidates (10 §11).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { importSeededRng } from "../rng.js";
import type { SeededRng } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import type { Sprint1PersonState } from "./sprint1-person-state.js";
import { validateTechniqueCatalog } from "./technique-catalog.js";
import type { TechniqueCatalog } from "./technique-catalog.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import { validateSprint1PersonTechniqueSemantics } from "./technique-person-semantics.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";
import {
  TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
  validateTrainingProcessorRuntimeState,
} from "./training-processor-runtime-state.js";
import type {
  TrainingProcessorActionCountKey,
  TrainingProcessorRuntimeState,
} from "./training-processor-runtime-state.js";
import type { Sprint1Config } from "./types.js";
import { validateNormalizedSprint1Config } from "./validate-sprint1-config.js";
import { selectWeeklyAction } from "./weekly-action-scores.js";
import type { WeeklyActionCandidateAvailability } from "./weekly-action-scores.js";
import { WEEKLY_TRAINING_EVENT_TYPES } from "./weekly-training-effects.js";
import {
  applyLearnTechniqueAcquirable,
  applyLearnTechniqueProgressing,
  applyPractice,
  applyRest,
  applyTrainStat,
  createWeeklyTrainingDraft,
  draftRemainderCollection,
} from "./weekly-training-effects.js";
import type { WeeklyEffectOutcome, WeeklyTrainingDraft } from "./weekly-training-effects.js";
import {
  buildLearningTechniqueCandidates,
  buildPracticeTechniqueCandidates,
  buildTrainingStatCandidates,
  normalizeWeeklyLearningFocus,
  selectLearningTechniqueTarget,
  selectPracticeTechniqueTarget,
  selectTrainingStatTarget,
} from "./weekly-target-selection.js";
import { validateWeeklyTrainingPersonRecord } from "./weekly-training-types.js";
import type {
  WeeklyTrainingEventCandidate,
  WeeklyTrainingPersonRecord,
  WeeklyTrainingPersonView,
  WeeklyTrainingResult,
} from "./weekly-training-types.js";
import { isWeeklyActionPipelineEligible } from "./weekly-update-eligibility.js";
import { validateWeeklyTrainingSprint3ConfigBinding } from "../sprint3/resolve-weekly-parent-temporary-guidance.js";
import type { Sprint3Config } from "../sprint3/types.js";

export type WeeklyTrainingProcessorDependencies = {
  sha256Provider?: Sha256Provider;
};

export const PROCESS_WEEKLY_TRAINING_WEEK_INPUT_KEYS = [
  "absoluteWeek",
  "personRecords",
  "config",
  "catalog",
  "runtimeState",
  "rngState",
  "sprint3Config",
] as const;

type ValidatedInput = {
  absoluteWeek: number;
  entries: readonly { record: WeeklyTrainingPersonRecord; view: WeeklyTrainingPersonView }[];
  config: Sprint1Config;
  catalog: TechniqueCatalog;
  provider: Sha256Provider;
  runtimeState: TrainingProcessorRuntimeState;
  rng: SeededRng;
  sprint3Config?: Sprint3Config;
};

type WeekTotals = {
  actionCounts: Record<TrainingProcessorActionCountKey, number>;
  processedPersonCount: number;
  totalStatGainMilliPoints: number;
  totalLearningProgressGainTenths: number;
  totalMasteryGainHundredths: number;
  forcedRestCount: number;
};

function emptyWeekTotals(): WeekTotals {
  return {
    actionCounts: { train_stat: 0, learn_technique: 0, practice_technique: 0, rest: 0 },
    processedPersonCount: 0,
    totalStatGainMilliPoints: 0,
    totalLearningProgressGainTenths: 0,
    totalMasteryGainHundredths: 0,
    forcedRestCount: 0,
  };
}

/**
 * 10 §12: a missing or malformed RNG state is unrecoverable. The state is snapshotted
 * from data descriptors and rebuilt as a plain object *before* `importSeededRng` sees
 * it, so an accessor or Proxy input can neither be observed twice nor throw out of the
 * processor.
 */
function parseRngState(value: unknown, issues: ValidationIssue[]): SeededRng | undefined {
  const stateResult = validateSeededRngState(value);
  if (!stateResult.ok) {
    for (const issue of stateResult.issues) {
      issues.push({ ...issue, path: `/rngState${issue.path}` });
    }
    return undefined;
  }
  const state = stateResult.value;
  try {
    return importSeededRng({
      algorithmVersion: state.algorithmVersion,
      s0: state.s0,
      s1: state.s1,
      s2: state.s2,
      s3: state.s3,
    });
  } catch (error) {
    issues.push({
      path: "/rngState",
      message: error instanceof Error ? error.message : "rngState could not be imported",
      actual: value,
      expected: "SeededRngState",
    });
    return undefined;
  }
}

function validateInput(
  input: unknown,
  dependencies: WeeklyTrainingProcessorDependencies | undefined,
): ValidationResult<ValidatedInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "processWeeklyTrainingWeek input must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, PROCESS_WEEKLY_TRAINING_WEEK_INPUT_KEYS, "", issues);

  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", "", 0, issues);

  const configResult = validateNormalizedSprint1Config(object["config"]);
  if (!configResult.ok) {
    for (const issue of configResult.issues) {
      issues.push({ ...issue, path: `/config${issue.path}` });
    }
  }

  const provider = dependencies?.sha256Provider;
  let catalog: TechniqueCatalog | undefined;
  if (provider === undefined) {
    issues.push({
      path: "/catalog",
      message:
        "a Sha256Provider dependency is required to verify catalogHash; the check is never skipped",
      expected: "dependencies.sha256Provider",
    });
  } else {
    const catalogResult = validateTechniqueCatalog(object["catalog"], provider);
    if (!catalogResult.ok) {
      for (const issue of catalogResult.issues) {
        issues.push({ ...issue, path: `/catalog${issue.path}` });
      }
    } else {
      catalog = catalogResult.value;
    }
  }

  const runtimeStateResult = validateTrainingProcessorRuntimeState(object["runtimeState"]);
  if (!runtimeStateResult.ok) {
    for (const issue of runtimeStateResult.issues) {
      issues.push({ ...issue, path: `/runtimeState${issue.path}` });
    }
  }

  const sprint3Binding = validateWeeklyTrainingSprint3ConfigBinding(object["sprint3Config"]);
  if (!sprint3Binding.ok) {
    for (const issue of sprint3Binding.issues) {
      issues.push(issue);
    }
  }

  const rawRecords = snapshotDenseArrayOrFail(object["personRecords"], "/personRecords", issues);
  const entries: { record: WeeklyTrainingPersonRecord; view: WeeklyTrainingPersonView }[] = [];
  if (rawRecords !== undefined) {
    for (let index = 0; index < rawRecords.length; index += 1) {
      const recordResult = validateWeeklyTrainingPersonRecord(rawRecords[index]);
      if (!recordResult.ok) {
        for (const issue of recordResult.issues) {
          issues.push({ ...issue, path: `/personRecords/${String(index)}${issue.path}` });
        }
        continue;
      }
      const entry = recordResult.value;
      // 09 §6.1 catalog semantics run for every person, inactive ones included: an
      // untouched person must still hold a state the catalog can explain (10 §13).
      if (catalog !== undefined && provider !== undefined) {
        const semantics = validateSprint1PersonTechniqueSemantics(
          entry.view.sprint1State,
          catalog,
          { spiritSurfaceValue: entry.view.abilities.spirit.surfaceValue },
          provider,
        );
        if (!semantics.ok) {
          for (const issue of semantics.issues) {
            issues.push({
              ...issue,
              path: `/personRecords/${String(index)}/person/sprint1State${issue.path}`,
            });
          }
          continue;
        }
      }
      entries.push(entry);
    }
  }

  if (
    absoluteWeek === undefined ||
    !configResult.ok ||
    catalog === undefined ||
    provider === undefined ||
    !runtimeStateResult.ok ||
    !sprint3Binding.ok ||
    rawRecords === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  entries.sort((a, b) => compareUnicodeCodePoints(a.view.personId, b.view.personId));
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1]!.view.personId === entries[index]!.view.personId) {
      return failure([
        {
          path: "/personRecords",
          message: "personRecords must not contain duplicate PersonId (10 §7)",
          actual: entries[index]!.view.personId,
          expected: "unique PersonId",
        },
      ]);
    }
  }

  const runtimeState = runtimeStateResult.value;
  if (runtimeState.lastProcessedAbsoluteWeek !== null) {
    if (absoluteWeek === runtimeState.lastProcessedAbsoluteWeek) {
      return failure([
        {
          path: "/absoluteWeek",
          message: "the same absoluteWeek must not be processed twice (10 §9, §12)",
          actual: absoluteWeek,
          expected: `> ${String(runtimeState.lastProcessedAbsoluteWeek)}`,
        },
      ]);
    }
    if (absoluteWeek < runtimeState.lastProcessedAbsoluteWeek) {
      return failure([
        {
          path: "/absoluteWeek",
          message: "absoluteWeek must increase monotonically (10 §9 forbids going backwards)",
          actual: absoluteWeek,
          expected: `> ${String(runtimeState.lastProcessedAbsoluteWeek)}`,
        },
      ]);
    }
  }

  const rng = parseRngState(object["rngState"], issues);
  if (rng === undefined) {
    return failure(issues);
  }

  return success({
    absoluteWeek,
    entries,
    config: configResult.value,
    catalog,
    provider,
    runtimeState,
    rng,
    ...(sprint3Binding.value === undefined ? {} : { sprint3Config: sprint3Binding.value }),
  });
}

function findDefinition(
  catalog: TechniqueCatalog,
  techniqueId: string,
): TechniqueDefinition | undefined {
  return catalog.definitions.find((definition) => definition.techniqueId === techniqueId);
}

/**
 * Rebuild an output record from the mutated draft; unrelated record fields are copied.
 * The result is deliberately untyped plain data: it only becomes a
 * `WeeklyTrainingPersonRecord` after `validateProcessedWeeklyPersonRecord` accepts it.
 */
function rebuildRecord(
  record: WeeklyTrainingPersonRecord,
  draft: WeeklyTrainingDraft,
): Record<string, unknown> {
  return {
    ...record,
    person: {
      ...record.person,
      abilities: draft.abilities,
      sprint1State: {
        ...record.person.sprint1State,
        currentMental: draft.currentMental,
        techniqueStates: draft.techniqueStates,
        learningFocusTechniqueId: draft.learningFocusTechniqueId,
      },
    },
    statGrowthRemainders: draftRemainderCollection(draft),
    temporaryCondition: {
      fatigue: draft.fatigue,
      injury: draft.injury,
      condition: draft.condition,
      confidence: draft.confidence,
    },
  };
}

/**
 * Post-update gate (10 §10): the record produced by this week's effects must satisfy
 * every input invariant again before it can be committed. Running the record
 * validator re-checks the full `Person` structure, `PersonTemporaryCondition`, the
 * `StatGrowthRemainderCollection`, and `Sprint1PersonState`; the catalog semantics
 * check adds membership and the `learningProgressRequired` cap.
 *
 * The parameter is `unknown` on purpose: post-effect data is re-validated from
 * scratch instead of being trusted through a cast.
 */
export function validateProcessedWeeklyPersonRecord(
  record: unknown,
  catalog: TechniqueCatalog,
  provider: Sha256Provider,
): ValidationResult<WeeklyTrainingPersonRecord> {
  const validated = validateWeeklyTrainingPersonRecord(record);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  const semantics = validateSprint1PersonTechniqueSemantics(
    validated.value.view.sprint1State,
    catalog,
    { spiritSurfaceValue: validated.value.view.abilities.spirit.surfaceValue },
    provider,
  );
  if (!semantics.ok) {
    return failure(
      semantics.issues.map((issue) => ({
        ...issue,
        path: `/person/sprint1State${issue.path}`,
      })),
    );
  }
  return success(validated.value.record);
}

/** Week-start focus release (10 §6.2): rebuild the record with `focus = null`. */
function withReleasedLearningFocus(
  record: WeeklyTrainingPersonRecord,
  sprint1State: Sprint1PersonState,
): WeeklyTrainingPersonRecord {
  return {
    ...record,
    person: {
      ...record.person,
      sprint1State: { ...sprint1State, learningFocusTechniqueId: null },
    },
  };
}

type PersonWeekOutcome = {
  record: WeeklyTrainingPersonRecord;
  events: readonly WeeklyTrainingEventCandidate[];
  actionCountKey: TrainingProcessorActionCountKey | null;
  forced: boolean;
  effect: WeeklyEffectOutcome["totals"] | null;
};

function processPerson(
  entry: { record: WeeklyTrainingPersonRecord; view: WeeklyTrainingPersonView },
  input: ValidatedInput,
): ValidationResult<PersonWeekOutcome> {
  const { absoluteWeek, catalog, config, provider, rng, sprint3Config } = input;

  // 10 §6.2: the focus lifecycle is resolved from the weekStart snapshot before any
  // candidate is built, so a released focus is already `null` for every action path.
  const normalizedFocus = normalizeWeeklyLearningFocus(
    entry.view.sprint1State,
    catalog,
    entry.record.techniqueTargetContexts,
    entry.view.abilities,
    entry.view.aptitudes,
  );
  if (!normalizedFocus.ok) {
    return failure(normalizedFocus.issues);
  }
  const record = normalizedFocus.value.released
    ? withReleasedLearningFocus(entry.record, entry.view.sprint1State)
    : entry.record;

  const availabilityCandidates = {
    train_stat: buildTrainingStatCandidates(record, config),
    learn_technique: buildLearningTechniqueCandidates(record, catalog, config),
    practice_technique: buildPracticeTechniqueCandidates(record, catalog, config, absoluteWeek),
  };
  if (!availabilityCandidates.train_stat.ok) {
    return failure(availabilityCandidates.train_stat.issues);
  }
  if (!availabilityCandidates.learn_technique.ok) {
    return failure(availabilityCandidates.learn_technique.issues);
  }
  if (!availabilityCandidates.practice_technique.ok) {
    return failure(availabilityCandidates.practice_technique.issues);
  }
  const availability: WeeklyActionCandidateAvailability = {
    train_stat: availabilityCandidates.train_stat.value.length > 0,
    learn_technique: availabilityCandidates.learn_technique.value.length > 0,
    practice_technique: availabilityCandidates.practice_technique.value.length > 0,
  };

  const selection = selectWeeklyAction(record, config, availability, rng);
  if (!selection.ok) {
    return failure(selection.issues);
  }

  const draftResult = createWeeklyTrainingDraft(record);
  if (!draftResult.ok) {
    return failure(draftResult.issues);
  }
  const draft = draftResult.value;

  let targetStat: string | null = null;
  let targetTechniqueId: string | null = null;
  let effect: WeeklyEffectOutcome;

  switch (selection.value.action) {
    case "train_stat": {
      const target = selectTrainingStatTarget(
        record,
        config,
        rng,
        availabilityCandidates.train_stat.value,
      );
      if (!target.ok) {
        return failure(target.issues);
      }
      if (target.value === null) {
        return failure([
          {
            path: "/personRecords",
            message: "train_stat was selected but no trainable ability remained",
            actual: null,
            expected: "StatTargetSelection",
          },
        ]);
      }
      targetStat = target.value.targetStat;
      const applied = applyTrainStat(
        draft,
        record,
        catalog,
        config,
        target.value.targetStat,
        absoluteWeek,
        rng,
        sprint3Config,
      );
      if (!applied.ok) {
        return failure(applied.issues);
      }
      effect = applied.value;
      break;
    }
    case "learn_technique": {
      const target = selectLearningTechniqueTarget(
        record,
        catalog,
        config,
        rng,
        availabilityCandidates.learn_technique.value,
      );
      if (!target.ok) {
        return failure(target.issues);
      }
      if (target.value === null) {
        return failure([
          {
            path: "/personRecords",
            message: "learn_technique was selected but no learning candidate remained",
            actual: null,
            expected: "LearningTargetSelection",
          },
        ]);
      }
      targetTechniqueId = target.value.targetTechniqueId;
      const definition = findDefinition(catalog, target.value.targetTechniqueId);
      if (definition === undefined) {
        return failure([
          {
            path: "/catalog/definitions",
            message: "selected learning target is missing from the TechniqueCatalog",
            actual: target.value.targetTechniqueId,
            expected: "TechniqueId present in catalog.definitions",
          },
        ]);
      }
      const context = record.techniqueTargetContexts.find(
        (entryContext) => entryContext.techniqueId === definition.techniqueId,
      );
      const applied =
        target.value.derivedStatus === "acquirable"
          ? applyLearnTechniqueAcquirable(draft, definition, config, absoluteWeek)
          : applyLearnTechniqueProgressing(
              draft,
              record,
              definition,
              context,
              config,
              absoluteWeek,
              rng,
              sprint3Config,
            );
      if (!applied.ok) {
        return failure(applied.issues);
      }
      effect = applied.value;
      break;
    }
    case "practice_technique": {
      const target = selectPracticeTechniqueTarget(
        record,
        catalog,
        config,
        absoluteWeek,
        rng,
        availabilityCandidates.practice_technique.value,
      );
      if (!target.ok) {
        return failure(target.issues);
      }
      if (target.value === null) {
        return failure([
          {
            path: "/personRecords",
            message: "practice_technique was selected but no acquired technique remained",
            actual: null,
            expected: "PracticeTargetSelection",
          },
        ]);
      }
      targetTechniqueId = target.value.targetTechniqueId;
      const applied = applyPractice(
        draft,
        config,
        target.value.targetTechniqueId,
        absoluteWeek,
        rng,
      );
      if (!applied.ok) {
        return failure(applied.issues);
      }
      effect = applied.value;
      break;
    }
    case "rest": {
      const applied = applyRest(draft, config, absoluteWeek, selection.value.forcedReason);
      if (!applied.ok) {
        return failure(applied.issues);
      }
      effect = applied.value;
      break;
    }
    default:
      return failure([
        {
          path: "/personRecords",
          message: "unsupported weekly action for an active person",
          actual: selection.value.action,
          expected: "train_stat | learn_technique | practice_technique | rest",
        },
      ]);
  }

  const actionSelectedEvent: WeeklyTrainingEventCandidate = deepFreezePlainJson({
    eventType: WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
    personId: entry.view.personId,
    absoluteWeek,
    payload: {
      personId: entry.view.personId,
      action: selection.value.action,
      targetStat,
      targetTechniqueId,
      candidateScores: selection.value.candidateScores.map((score) => ({
        action: score.action,
        scoreHundredths: score.scoreHundredths,
      })),
      forced: selection.value.forced,
      forcedReason: selection.value.forcedReason,
      fallbackReasons: [...selection.value.fallbackReasons],
    },
  });

  const processed = validateProcessedWeeklyPersonRecord(
    rebuildRecord(record, draft),
    catalog,
    provider,
  );
  if (!processed.ok) {
    return failure(processed.issues);
  }

  return success({
    record: processed.value,
    events: [actionSelectedEvent, ...effect.events],
    actionCountKey: selection.value.action as TrainingProcessorActionCountKey,
    forced: selection.value.forced,
    effect: effect.totals,
  });
}

export function processWeeklyTrainingWeek(
  input: unknown,
  dependencies?: WeeklyTrainingProcessorDependencies,
): ValidationResult<WeeklyTrainingResult> {
  const validated = validateInput(input, dependencies);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  const { absoluteWeek, entries, runtimeState, rng } = validated.value;

  const totals = emptyWeekTotals();
  const personRecords: WeeklyTrainingPersonRecord[] = [];
  const eventCandidates: WeeklyTrainingEventCandidate[] = [];

  for (const entry of entries) {
    // FIX15: skip inactive AND non-actionable (child/retired/age∉8..41) before
    // planner / candidates / selection / rest application / action history.
    if (
      !isWeeklyActionPipelineEligible({
        lifeStatus: entry.view.lifeStatus,
        careerStatus: entry.view.careerStatus,
        ...(entry.view.participationStatus !== null
          ? { participationStatus: entry.view.participationStatus }
          : {}),
        ...(entry.view.currentAge !== null ? { currentAge: entry.view.currentAge } : {}),
      })
    ) {
      personRecords.push(entry.record);
      continue;
    }

    const outcome = processPerson(entry, validated.value);
    if (!outcome.ok) {
      return failure(
        outcome.issues.map((issue) => ({
          ...issue,
          path: `/personRecords/${entry.view.personId}${issue.path}`,
        })),
      );
    }

    personRecords.push(outcome.value.record);
    eventCandidates.push(...outcome.value.events);

    if (outcome.value.actionCountKey !== null) {
      totals.actionCounts[outcome.value.actionCountKey] += 1;
      totals.processedPersonCount += 1;
    }
    if (outcome.value.forced) {
      totals.forcedRestCount += 1;
    }
    if (outcome.value.effect !== null) {
      totals.totalStatGainMilliPoints += outcome.value.effect.statGainMilliPoints;
      totals.totalLearningProgressGainTenths += outcome.value.effect.learningProgressGainTenths;
      totals.totalMasteryGainHundredths += outcome.value.effect.masteryGainHundredths;
    }
  }

  const nextRuntimeState = validateTrainingProcessorRuntimeState({
    schemaVersion: TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
    lastProcessedAbsoluteWeek: absoluteWeek,
    processedPersonCount: runtimeState.processedPersonCount + totals.processedPersonCount,
    actionCounts: {
      train_stat: runtimeState.actionCounts.train_stat + totals.actionCounts.train_stat,
      learn_technique:
        runtimeState.actionCounts.learn_technique + totals.actionCounts.learn_technique,
      practice_technique:
        runtimeState.actionCounts.practice_technique + totals.actionCounts.practice_technique,
      rest: runtimeState.actionCounts.rest + totals.actionCounts.rest,
    },
    totalStatGainMilliPoints:
      runtimeState.totalStatGainMilliPoints + totals.totalStatGainMilliPoints,
    totalLearningProgressGainTenths:
      runtimeState.totalLearningProgressGainTenths + totals.totalLearningProgressGainTenths,
    totalMasteryGainHundredths:
      runtimeState.totalMasteryGainHundredths + totals.totalMasteryGainHundredths,
    forcedRestCount: runtimeState.forcedRestCount + totals.forcedRestCount,
  });
  if (!nextRuntimeState.ok) {
    return failure(nextRuntimeState.issues);
  }

  return success(
    deepFreezePlainJson({
      personRecords,
      runtimeState: nextRuntimeState.value,
      rngState: rng.exportState(),
      eventCandidates,
    }),
  );
}
