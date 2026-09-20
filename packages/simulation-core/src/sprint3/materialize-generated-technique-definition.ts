/**
 * S03-010 deterministic generated TechniqueDefinition materialization (pure processor).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { asPersonId, asTechniqueId } from "../ids.js";
import type { TechniqueId } from "../ids.js";
import { validateTechniqueDefinition } from "../sprint1/technique-definition.js";
import {
  LEARNING_PROGRESS_STANDARD_BY_TIER,
  TECHNIQUE_DEFINITION_SCHEMA_VERSION,
} from "../sprint1/technique-enums.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { ABILITY_KEYS } from "../abilities.js";
import type { AbilityKey } from "../abilities.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  GENERATED_TECHNIQUE_MATERIALIZATION_EVALUATION_POLICY,
  SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION,
} from "./constants.js";
import type {
  GeneratedTechniqueMaterializationRequest,
  GeneratedTechniqueStatSynthesisStep,
  GeneratedTechniqueTierMaterializationPolicy,
  OriginalTechniqueResearchTier,
  Sprint3Config,
  Sprint3GeneratedTechniqueMaterializationConfig,
} from "./types.js";

const PRIMARY_STAT_ORDER: readonly AbilityKey[] = ABILITY_KEYS;

function sortTechniqueIds(ids: readonly string[]): TechniqueId[] {
  return [...ids]
    .map((id) => asTechniqueId(id))
    .sort((a, b) => compareUnicodeCodePoints(a, b));
}

function synthesizeIntegerStat(
  sources: readonly TechniqueDefinition[],
  pick: (definition: TechniqueDefinition) => number,
  step: GeneratedTechniqueStatSynthesisStep,
): number {
  if (sources.length === 0) {
    return Math.max(0, step.tradeoffDelta);
  }
  const sum = sources.reduce((acc, definition) => acc + pick(definition), 0);
  const average = Math.floor(sum / sources.length);
  const weighted = Math.floor((average * step.averageWeightPercent) / 100);
  return Math.max(0, weighted + step.tradeoffDelta);
}

function mergePrimaryStats(sources: readonly TechniqueDefinition[]): AbilityKey[] {
  const seen = new Set<AbilityKey>();
  for (const definition of sources) {
    for (const stat of definition.primaryStats) {
      seen.add(stat);
    }
  }
  return PRIMARY_STAT_ORDER.filter((key) => seen.has(key));
}

function mergeTags(
  sources: readonly TechniqueDefinition[],
  generatedTag: string,
): string[] {
  const seen = new Set<string>();
  for (const definition of sources) {
    for (const tag of definition.tags) {
      seen.add(tag);
    }
  }
  seen.add(generatedTag);
  return [...seen].sort((a, b) => compareUnicodeCodePoints(a, b));
}

function expectedSourceCountForTier(tier: OriginalTechniqueResearchTier): number | "at_least_one" {
  switch (tier) {
    case "derived_technique":
      return 1;
    case "composite_technique":
      return 2;
    case "full_original_technique":
      return "at_least_one";
  }
}

export function isGeneratedTechniqueRegistrationEnabled(config: Sprint3Config): boolean {
  return (
    config.configVersion === SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION &&
    config.mentorshipFeatures.generatedTechniqueRegistrationEnabled === true &&
    config.generatedTechniqueMaterialization !== undefined
  );
}

function resolveMaterializationPolicy(
  config: Sprint3Config,
  issues: ValidationIssue[],
): Sprint3GeneratedTechniqueMaterializationConfig | undefined {
  if (!isGeneratedTechniqueRegistrationEnabled(config)) {
    issues.push({
      path: "/mentorshipFeatures/generatedTechniqueRegistrationEnabled",
      message: "generated technique registration is not enabled for this configVersion",
      actual: config.mentorshipFeatures.generatedTechniqueRegistrationEnabled,
      expected: `true on ${SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION}`,
    });
    return undefined;
  }
  const policy = config.generatedTechniqueMaterialization!;
  if (policy.evaluationPolicyVersion !== GENERATED_TECHNIQUE_MATERIALIZATION_EVALUATION_POLICY) {
    issues.push({
      path: "/generatedTechniqueMaterialization/evaluationPolicyVersion",
      message: "unsupported generatedTechniqueMaterialization evaluation policy",
      actual: policy.evaluationPolicyVersion,
      expected: GENERATED_TECHNIQUE_MATERIALIZATION_EVALUATION_POLICY,
    });
    return undefined;
  }
  return policy;
}

export function materializeGeneratedTechniqueDefinition(input: {
  config: Sprint3Config;
  request: GeneratedTechniqueMaterializationRequest;
  baseTechniqueDefinitionsById: ReadonlyMap<string, TechniqueDefinition>;
}): ValidationResult<TechniqueDefinition> {
  const issues: ValidationIssue[] = [];
  const materializationPolicy = resolveMaterializationPolicy(input.config, issues);
  if (materializationPolicy === undefined || issues.length > 0) {
    return failure(issues);
  }

  const { foundingHistory, displayName } = input.request;
  const canonicalSourceIds = sortTechniqueIds(foundingHistory.sourceTechniqueIds);

  const tierPolicy =
    materializationPolicy.byResearchTier[foundingHistory.researchTier];
  if (tierPolicy === undefined) {
    issues.push({
      path: "/generatedTechniqueMaterialization/byResearchTier",
      message: "missing tier materialization policy for founding researchTier",
      actual: foundingHistory.researchTier,
      expected: "configured tier policy",
    });
    return failure(issues);
  }

  const expectedCount = expectedSourceCountForTier(foundingHistory.researchTier);
  if (expectedCount === 1 && canonicalSourceIds.length !== 1) {
    issues.push({
      path: "/request/foundingHistory/sourceTechniqueIds",
      message: "derived_technique requires exactly one source technique",
      actual: canonicalSourceIds.length,
      expected: "1",
    });
  }
  if (expectedCount === 2 && canonicalSourceIds.length !== 2) {
    issues.push({
      path: "/request/foundingHistory/sourceTechniqueIds",
      message: "composite_technique requires exactly two source techniques",
      actual: canonicalSourceIds.length,
      expected: "2",
    });
  }
  if (expectedCount === "at_least_one" && canonicalSourceIds.length < 1) {
    issues.push({
      path: "/request/foundingHistory/sourceTechniqueIds",
      message: "full_original_technique requires at least one source technique",
      actual: canonicalSourceIds.length,
      expected: ">= 1",
    });
  }

  const sourceDefinitions: TechniqueDefinition[] = [];
  for (const sourceId of canonicalSourceIds) {
    const definition = input.baseTechniqueDefinitionsById.get(sourceId);
    if (definition === undefined) {
      issues.push({
        path: `/request/foundingHistory/sourceTechniqueIds/${sourceId}`,
        message: "source TechniqueDefinition not found in base catalog lookup",
        actual: undefined,
        expected: sourceId,
      });
      continue;
    }
    sourceDefinitions.push(definition);
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const primarySource = sourceDefinitions[0]!;
  const power = synthesizeIntegerStat(sourceDefinitions, (def) => def.power, tierPolicy.power);
  const maxSourcePower = Math.max(...sourceDefinitions.map((def) => def.power));
  const boundedPower = power >= maxSourcePower ? maxSourcePower - 1 : power;

  const rawDefinition: Record<string, unknown> = {
    techniqueId: foundingHistory.newTechniqueId,
    schemaVersion: TECHNIQUE_DEFINITION_SCHEMA_VERSION,
    dataVersion: materializationPolicy.generatedDefinitionDataVersion,
    name: displayName,
    category: primarySource.category,
    primaryStats: mergePrimaryStats(sourceDefinitions),
    requiredAptitude: primarySource.requiredAptitude,
    requiredStats: { ...primarySource.requiredStats },
    prerequisiteTechniqueMastery: [],
    mentalCost: synthesizeIntegerStat(
      sourceDefinitions,
      (def) => def.mentalCost,
      tierPolicy.mentalCost,
    ),
    difficulty: synthesizeIntegerStat(
      sourceDefinitions,
      (def) => def.difficulty,
      tierPolicy.difficulty,
    ),
    learningTier: tierPolicy.learningTier,
    consumptionClass: tierPolicy.consumptionClass,
    learningProgressRequired: LEARNING_PROGRESS_STANDARD_BY_TIER[tierPolicy.learningTier],
    learningProgressOverrideReason: null,
    teachingProficiencyRequired: primarySource.teachingProficiencyRequired,
    secrecy: primarySource.secrecy,
    power: Math.max(1, boundedPower),
    accuracy: synthesizeIntegerStat(
      sourceDefinitions,
      (def) => def.accuracy,
      tierPolicy.accuracy,
    ),
    activationDifficulty: synthesizeIntegerStat(
      sourceDefinitions,
      (def) => def.activationDifficulty,
      tierPolicy.activationDifficulty,
    ),
    prerequisiteTechniqueIds: canonicalSourceIds,
    originPersonId: asPersonId(foundingHistory.founderPersonId),
    sourceTechniqueIds: canonicalSourceIds,
    tags: mergeTags(sourceDefinitions, tierPolicy.generatedTag),
    usableRanges: [...primarySource.usableRanges],
    preferredRanges: [...primarySource.preferredRanges],
    rangeShiftAfterUse: primarySource.rangeShiftAfterUse,
    priority: primarySource.priority,
    speedModifier: primarySource.speedModifier,
    injuryModifier: primarySource.injuryModifier,
    actionTraits: { ...primarySource.actionTraits },
  };

  return validateTechniqueDefinition(rawDefinition);
}

export function tierMaterializationPolicyForTests(
  overrides: Partial<GeneratedTechniqueTierMaterializationPolicy> = {},
): GeneratedTechniqueTierMaterializationPolicy {
  return {
    power: { averageWeightPercent: 100, tradeoffDelta: -2 },
    accuracy: { averageWeightPercent: 100, tradeoffDelta: 3 },
    mentalCost: { averageWeightPercent: 100, tradeoffDelta: 2 },
    activationDifficulty: { averageWeightPercent: 100, tradeoffDelta: 1 },
    difficulty: { averageWeightPercent: 100, tradeoffDelta: 5 },
    learningTier: "standard",
    consumptionClass: "medium",
    generatedTag: "generated",
    ...overrides,
  };
}
