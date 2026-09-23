# SPRINT3-RYUHA-PROVENANCE-SOURCE-MAPPING-ROLE3-20260924-R1

state: READY_NON_LANE
role: Role3
sprint: Sprint3
mode: SPEC_TO_SOURCE_EVIDENCE_MAPPING
date: 2026-09-24
control-authority: GitHub `thin-bt/dollworld` / `master`

## Purpose

Resolve the canonical Sprint3 roadmap/backlog scope contradiction without inventing Sprint4 family-lineage semantics.

Roadmap Sprint3 explicitly names `流派・系譜` and says its objective/dependency intent remains stable. The Sprint3 backlog fixes implementation scope at S03-001..011 and names mentorship, taught-technique selection/provenance, OTL research/materialization, founding history and loss, while explicitly excluding Sprint4 retirement/inheritance/family-lineage schema expansion.

## Required evidence mapping

Fresh-read current `master`, then map each roadmap concept below to exact accepted Sprint3 source contracts and UI/evidence where they exist:

1. 師匠・弟子 relationship persistence and reverse-disciple visibility.
2. 技の教示・継承: persisted teaching selection plus consumption by explicit teach.
3. 独自技: OTL research accumulation, generated-technique materialization/catalog registration, battle consumption, founding MatchId/history, and loss.
4. 流派・系譜: determine whether the combination of mentorship relation + taught-technique provenance + OTL founding/history/loss already provides an observable transmission lineage. Do not infer family ancestry or inheritance.

For each item record exact file paths, symbols/contracts, canonical terminal results, and ordinary UI surfaces. Distinguish implemented data semantics from user-visible presentation.

## Decision rule

- If existing accepted Sprint3 behavior fully accounts for roadmap `流派・系譜`, publish a terminal mapping result suitable for Role1/PM closure accounting and propose the narrow canonical wording that states this mapping.
- If source semantics exist but no ordinary user-facing UI can observe the transmission lineage, identify that as a concrete product/UI gap and write the smallest executable follow-up instruction; do not widen S03-001..011 or import Sprint4 family schema.
- If source semantics themselves cannot represent teacher→student technique provenance/founding lineage, identify the exact missing contract and smallest product slice.

## Constraints

- Do not edit accepted gameplay semantics merely to make prose match.
- Do not reinterpret `流派・系譜` as marriage/parentage/family lineage.
- Preserve live release gate `37d6ed4` unless product bytes change.
- Sprint3 remains `REOPENED_FIX_REQUIRED` until binding control closes it.
- A and B2 currently have PREPARED work; do not overwrite their inboxes.
- No transient scratch directly under `_handoff-artifacts/`.

## Completion

Publish canonical result under `_handoff-artifacts/results/SPRINT3-RYUHA-PROVENANCE-SOURCE-MAPPING-ROLE3-20260924-R1/result.md` with evidence and one of: `ACCOUNTED_BY_EXISTING_PRODUCT`, `UI_GAP`, or `SOURCE_CONTRACT_GAP`.