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

/** S03-005 weekly training disciple-count teachingEfficiency binding enabled. */
export const SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY = "sprint3-balance-0.5.0" as const;

/** S03-006 parent temporary guidance teacher factor at weekly training boundary. */
export const SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE = "sprint3-balance-0.6.0" as const;

/** S03-007 explicit weekly `teach` action, refusal, and allocation policy enabled. */
export const SPRINT3_CONFIG_VERSION_WEEKLY_TEACH = "sprint3-balance-0.7.0" as const;

/** S03-008 deterministic technique teaching-selection / re-evaluation contract enabled. */
export const SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION = "sprint3-balance-0.8.0" as const;

/** S03-008 original-technique research/generation/loss lifecycle contract enabled. */
export const SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE = "sprint3-balance-0.9.0" as const;

/** S03-010 generated-technique materialization and runtime catalog overlay registration. */
export const SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION =
  "sprint3-balance-0.10.0" as const;

/** Pure explicit weekly teach processor contract id (weekly adapter wiring in later slices). */
export const EXPLICIT_WEEKLY_TEACH_ACTION_PROCESSOR_ID =
  "sprint3-explicit-weekly-teach-0.1.0" as const;

/** Config-held refusal / allocation policy for S03-007. */
export const WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT =
  "weekly-teach-action-explicit-0.1.0" as const;

/** Pure technique teaching-selection processor contract id (world wiring in later slices). */
export const TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID =
  "sprint3-technique-teaching-selection-0.1.0" as const;

/** Config-held candidate scoring / tier thresholds for S03-008. */
export const TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY =
  "technique-teaching-selection-0.1.0" as const;

/** Pure original-technique lifecycle processor contract id (S03-009 world weekly wiring). */
export const ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID =
  "sprint3-original-technique-lifecycle-0.1.0" as const;

/** Fresh original-technique lifecycle weekly RNG deriveSeed label (S03-009). */
export const ORIGINAL_TECHNIQUE_LIFECYCLE_RNG_SEED_LABEL =
  "processor/sprint3-original-technique-lifecycle" as const;

/** Config-held research/generation/loss policy for S03-008 original-technique lifecycle. */
export const ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY =
  "original-technique-lifecycle-0.1.0" as const;

/** Config-held stat synthesis / registration policy for S03-010 (explicit numeric tradeoffs). */
export const GENERATED_TECHNIQUE_MATERIALIZATION_EVALUATION_POLICY =
  "generated-technique-materialization-0.1.0" as const;

export const GENERATED_TECHNIQUE_CATALOG_OVERLAY_SCHEMA_VERSION = "0.1.0" as const;

/** Narrow adapter id for S03-009 generation success → S03-010 registration boundary. */
export const GENERATED_TECHNIQUE_REGISTRATION_ADAPTER_ID =
  "sprint3-generated-technique-registration-0.1.0" as const;

/** Sprint3 → Sprint1 weekly training disciple-count factor binding (S03-005). */
export const WEEKLY_TRAINING_DISCIPLE_COUNT_TEACHING_EFFICIENCY_BINDING_ID =
  "sprint3-weekly-training-disciple-count-0.1.0" as const;

/** Sprint3 → Sprint1 weekly training parent temporary guidance teacher factor (S03-006). */
export const WEEKLY_TRAINING_PARENT_TEMPORARY_GUIDANCE_BINDING_ID =
  "sprint3-weekly-training-parent-temporary-guidance-0.1.0" as const;

/** S03-001 legacy: no autonomous intake limit formula (sprint3-balance-0.1.0..0.3.0). */
export const MASTER_INTAKE_EVALUATION_POLICY_DEFERRED = "master-intake-deferred-0.1.0" as const;

/** S03-004 config-driven autonomous per-master disciple cap (not world-global). */
export const MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT =
  "master-intake-autonomous-limit-0.1.0" as const;

/** Pure enrollment processor contract id (world step 4 wiring in later slices). */
export const ENROLLMENT_ASSIGNMENT_PROCESSOR_ID = "sprint3-enrollment-assignment-0.1.0" as const;

/** Pure master intake decision processor contract id (world step 4 / enrollment boundary). */
export const MASTER_INTAKE_EVALUATION_PROCESSOR_ID = "sprint3-master-intake-0.1.0" as const;

/** S03-012 persisted enrollment / intake / explicit-teach entrypoint outcomes (Sprint1RunRuntimeState). */
export const SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID =
  "sprint3-mentorship-entrypoint-0.1.0" as const;

/** S03-013 live-world pending queue materialization before entrypoint processors. */
export const SPRINT3_LIVE_MENTORSHIP_QUEUE_MATERIALIZATION_PROCESSOR_ID =
  "sprint3-live-mentorship-queue-materialization-0.1.0" as const;
