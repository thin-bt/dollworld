/**
 * S02-004 policy-injected structural seams (Decisions A/B/C).
 * Production code must not choose format thresholds, seed/BYE placement, or tie-break rules.
 */
import type { PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";

export const STRUCTURAL_FORMAT_KINDS = [
  "round_robin",
  "knockout",
  "group_round_robin_knockout",
] as const;
export type StructuralFormatKind = (typeof STRUCTURAL_FORMAT_KINDS)[number];

export type FormatSelectionPolicyIdentity = {
  policyVersion: string;
  configVersion: string;
};

export type FormatSelectionResult = {
  formatKind: StructuralFormatKind;
  policyIdentity: FormatSelectionPolicyIdentity;
  /** Required when formatKind is group_round_robin_knockout. Caller supplies all group membership. */
  groups?: readonly (readonly PersonId[])[];
};

export type KnockoutSeedByePolicyIdentity = {
  policyVersion: string;
  configVersion: string;
};

export type KnockoutStructuralSlot = {
  slotId: string;
  roundIndex: number;
  slotIndex: number;
  /** Initial participant placement; absent when filled only by upstream advancement. */
  participantPersonId?: PersonId;
  seedRank?: number;
  /** Structural BYE advancement without MatchId or battle result. */
  isByeAdvancement?: boolean;
  /** Upstream slot identities feeding this slot; must reference existing slots only. */
  feedsFromSlotIds?: readonly string[];
};

export type KnockoutSeedByeMapping = {
  policyIdentity: KnockoutSeedByePolicyIdentity;
  slots: readonly KnockoutStructuralSlot[];
};

export type StandingsTieBreakPolicyIdentity = {
  policyVersion: string;
  configVersion: string;
};

/** Caller-supplied A/B/C policy bundle; no hidden defaults. */
export type InjectedStructuralPolicyInput = {
  formatSelection: FormatSelectionResult;
  knockoutSeedByePolicyIdentity: KnockoutSeedByePolicyIdentity;
  knockoutSeedByeMapping?: KnockoutSeedByeMapping;
  standingsTieBreakPolicyIdentity: StandingsTieBreakPolicyIdentity;
};

function isStructuralFormatKind(value: unknown): value is StructuralFormatKind {
  return (
    typeof value === "string" && (STRUCTURAL_FORMAT_KINDS as readonly string[]).includes(value)
  );
}

export function validateFormatSelectionResult(
  value: FormatSelectionResult,
): ValidationResult<FormatSelectionResult> {
  const issues: ValidationIssue[] = [];
  if (!isStructuralFormatKind(value.formatKind)) {
    issues.push({
      path: "/formatSelection/formatKind",
      message: "unknown structural format kind",
      actual: value.formatKind,
      expected: STRUCTURAL_FORMAT_KINDS.join("|"),
    });
  }
  if (
    typeof value.policyIdentity?.policyVersion !== "string" ||
    value.policyIdentity.policyVersion.length === 0
  ) {
    issues.push({
      path: "/formatSelection/policyIdentity/policyVersion",
      message: "format selection policyVersion is required",
      actual: value.policyIdentity?.policyVersion,
      expected: "non-empty string",
    });
  }
  if (
    typeof value.policyIdentity?.configVersion !== "string" ||
    value.policyIdentity.configVersion.length === 0
  ) {
    issues.push({
      path: "/formatSelection/policyIdentity/configVersion",
      message: "format selection configVersion is required",
      actual: value.policyIdentity?.configVersion,
      expected: "non-empty string",
    });
  }
  if (value.formatKind === "group_round_robin_knockout") {
    if (value.groups === undefined || value.groups.length === 0) {
      issues.push({
        path: "/formatSelection/groups",
        message: "group composition is required for group_round_robin_knockout",
        actual: value.groups,
        expected: "non-empty group membership arrays",
      });
    }
  }
  return issues.length === 0 ? success(value) : failure(issues);
}

export function validateInjectedStructuralPolicyInput(
  policy: InjectedStructuralPolicyInput,
): ValidationResult<InjectedStructuralPolicyInput> {
  const issues: ValidationIssue[] = [];

  const format = validateFormatSelectionResult(policy.formatSelection);
  if (!format.ok) {
    issues.push(...format.issues);
  }

  if (
    typeof policy.knockoutSeedByePolicyIdentity?.policyVersion !== "string" ||
    policy.knockoutSeedByePolicyIdentity.policyVersion.length === 0
  ) {
    issues.push({
      path: "/knockoutSeedByePolicyIdentity/policyVersion",
      message: "knockout seed/BYE policyVersion is required (Decision B)",
      actual: policy.knockoutSeedByePolicyIdentity?.policyVersion,
      expected: "non-empty string",
    });
  }
  if (
    typeof policy.knockoutSeedByePolicyIdentity?.configVersion !== "string" ||
    policy.knockoutSeedByePolicyIdentity.configVersion.length === 0
  ) {
    issues.push({
      path: "/knockoutSeedByePolicyIdentity/configVersion",
      message: "knockout seed/BYE configVersion is required (Decision B)",
      actual: policy.knockoutSeedByePolicyIdentity?.configVersion,
      expected: "non-empty string",
    });
  }

  if (
    typeof policy.standingsTieBreakPolicyIdentity?.policyVersion !== "string" ||
    policy.standingsTieBreakPolicyIdentity.policyVersion.length === 0
  ) {
    issues.push({
      path: "/standingsTieBreakPolicyIdentity/policyVersion",
      message: "standings tie-break policyVersion is required (Decision C)",
      actual: policy.standingsTieBreakPolicyIdentity?.policyVersion,
      expected: "non-empty string",
    });
  }
  if (
    typeof policy.standingsTieBreakPolicyIdentity?.configVersion !== "string" ||
    policy.standingsTieBreakPolicyIdentity.configVersion.length === 0
  ) {
    issues.push({
      path: "/standingsTieBreakPolicyIdentity/configVersion",
      message: "standings tie-break configVersion is required (Decision C)",
      actual: policy.standingsTieBreakPolicyIdentity?.configVersion,
      expected: "non-empty string",
    });
  }

  const needsKnockoutMapping =
    policy.formatSelection.formatKind === "knockout" ||
    policy.formatSelection.formatKind === "group_round_robin_knockout";
  if (needsKnockoutMapping && policy.knockoutSeedByeMapping === undefined) {
    issues.push({
      path: "/knockoutSeedByeMapping",
      message: "caller-supplied knockout seed/BYE mapping is required for knockout formats",
      actual: undefined,
      expected: "KnockoutSeedByeMapping",
    });
  }

  if (policy.knockoutSeedByeMapping !== undefined) {
    if (
      policy.knockoutSeedByeMapping.policyIdentity.policyVersion !==
        policy.knockoutSeedByePolicyIdentity.policyVersion ||
      policy.knockoutSeedByeMapping.policyIdentity.configVersion !==
        policy.knockoutSeedByePolicyIdentity.configVersion
    ) {
      issues.push({
        path: "/knockoutSeedByeMapping/policyIdentity",
        message: "knockout mapping policy identity must match knockoutSeedByePolicyIdentity",
        actual: JSON.stringify(policy.knockoutSeedByeMapping.policyIdentity),
        expected: JSON.stringify(policy.knockoutSeedByePolicyIdentity),
      });
    }
  }

  return issues.length === 0 ? success(policy) : failure(issues);
}
