import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  createSprint3Balance100ConfigInput,
  validateSprint1RunSession,
  validateSprint3Config,
  type Sha256Provider,
  type Sprint1RunSession,
  type Sprint3ConfigInput,
  type ValidationResult,
} from "@shared-world/simulation-core";

/** Canonical accepted production Sprint3 balance (S03-010 generated-technique registration live). */
export function createAcceptedProductionSprint3ConfigInput(): Sprint3ConfigInput {
  return createSprint3Balance100ConfigInput();
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
