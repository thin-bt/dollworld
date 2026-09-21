import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  createSprint3Balance080ConfigInput,
  ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
  validateSprint1RunSession,
  validateSprint3Config,
  type Sha256Provider,
  type Sprint1RunSession,
  type Sprint3ConfigInput,
  type ValidationResult,
} from "@shared-world/simulation-core";

/** Canonical accepted production Sprint3 balance (matches S03-008..S03-009 weekly closure). */
export function createAcceptedProductionSprint3ConfigInput(): Sprint3ConfigInput {
  const balance080 = createSprint3Balance080ConfigInput();
  return {
    ...balance080,
    configVersion: SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
    mentorshipFeatures: {
      ...balance080.mentorshipFeatures,
      explicitWeeklyTeachActionEnabled: true,
      enrollmentAssignmentAiEnabled: true,
      weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true,
      weeklyTrainingParentTemporaryGuidanceEnabled: true,
      techniqueTeachingSelectionEnabled: true,
      originalTechniqueLifecycleEnabled: true,
    },
    originalTechniqueLifecycle: {
      evaluationPolicyVersion: ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
      researchThresholds: {
        derivedTechnique: 180,
        compositeTechnique: 320,
        fullOriginalTechnique: 550,
      },
      generation: {
        baseSuccessPercent: 50,
        minimumSuccessPercent: 20,
        maximumSuccessPercent: 80,
        failureResearchRetentionPercent: 80,
        regenerationCooldownWeeks: 24,
        initialMasteryHundredthsMinimum: 1000,
        initialMasteryHundredthsMaximum: 2500,
        maximumPositiveSuccessAdjustmentPoints: 30,
        maximumNegativeSuccessAdjustmentPoints: 30,
      },
    },
  };
}

export function bindAcceptedProductionSprint3RunSession(
  session: Sprint1RunSession,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunSession> {
  const sprint3ConfigResult = validateSprint3Config(
    createAcceptedProductionSprint3ConfigInput(),
    provider,
  );
  if (!sprint3ConfigResult.ok) {
    return sprint3ConfigResult;
  }

  const seed = session.context.simulationIdentity.seed;
  const bound: Sprint1RunSession = {
    ...session,
    context: {
      ...session.context,
      sprint3Config: sprint3ConfigResult.value,
    },
    runtimeState: {
      ...session.runtimeState,
      mentorshipEntrypointRuntime:
        session.runtimeState.mentorshipEntrypointRuntime ??
        createInitialSprint3MentorshipEntrypointRuntimeState(),
      originalTechniqueLifecycleRuntime:
        session.runtimeState.originalTechniqueLifecycleRuntime ??
        createInitialOriginalTechniqueLifecycleRuntimeState(seed),
    },
  };

  return validateSprint1RunSession(bound, provider);
}
