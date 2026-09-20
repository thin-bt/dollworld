/**
 * Fixed Sprint 3 common-contract version registry (S3-SPEC-0.3.0-draft / S03-001).
 */
export const SPRINT3_CONFIG_SCHEMA_VERSION = "0.1.0" as const;
export const SPRINT3_CONFIG_VERSION_DEFAULT = "sprint3-balance-0.1.0" as const;

/** S03-001 legacy policy: no eligibility thresholds (sprint3-balance-0.1.0 only). */
export const MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED =
  "master-qualification-deferred-0.1.0" as const;

/** S03-002 config-driven rank/record thresholds (docs/SPEC.md §師匠資格). */
export const MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS =
  "master-qualification-rank-and-records-0.1.0" as const;

export const SPRINT3_CONFIG_VERSION_QUALIFICATION = "sprint3-balance-0.2.0" as const;

/** S03-003 enrollment assignment AI enabled (same balance body as 0.2.0 + feature gate). */
export const SPRINT3_CONFIG_VERSION_ENROLLMENT = "sprint3-balance-0.3.0" as const;

/** S03-004 per-master autonomous intake limit policy enabled. */
export const SPRINT3_CONFIG_VERSION_INTAKE = "sprint3-balance-0.4.0" as const;

/** S03-001 legacy: no autonomous intake limit formula (sprint3-balance-0.1.0..0.3.0). */
export const MASTER_INTAKE_EVALUATION_POLICY_DEFERRED = "master-intake-deferred-0.1.0" as const;

/** S03-004 config-driven autonomous per-master disciple cap (not world-global). */
export const MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT =
  "master-intake-autonomous-limit-0.1.0" as const;

/** Pure enrollment processor contract id (world step 4 wiring in later slices). */
export const ENROLLMENT_ASSIGNMENT_PROCESSOR_ID = "sprint3-enrollment-assignment-0.1.0" as const;

/** Pure master intake decision processor contract id (world step 4 / enrollment boundary). */
export const MASTER_INTAKE_EVALUATION_PROCESSOR_ID = "sprint3-master-intake-0.1.0" as const;
