# SPRINT3-S03-008-ORIGINAL-TECHNIQUE-LIFECYCLE-A-20260920-R1

state: READY
terminal: SPRINT3_S03_008_ORIGINAL_TECHNIQUE_LIFECYCLE_PUBLISHED
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T22:05:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: (pending push)
product-commit-sha: (pending commit)
predecessor: SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Implemented Sprint3 S03-008 **独自技研究・生成・失伝** lifecycle contract on `sprint3-balance-0.9.0`: config-held research thresholds 180/320/550, generation success probability clamped 20..80%, failed generation retains 80% research with 24-week cooldown, deterministic RNG roll, founding history payload per SPEC event table, and technique loss when no living practitioners or successor practitioners remain. Preserved published `sprint3-balance-0.8.0` teaching-selection behavior (TS regression on 0.9.0).

## Product commits

| Field | Value |
|-------|--------|
| Product message | Implement S03-008 original-technique lifecycle policy and processor. |
| Config version | `sprint3-balance-0.9.0` |
| Processor id | `sprint3-original-technique-lifecycle-0.1.0` |

## Changed files (product)

| Path | Role |
|------|------|
| `packages/simulation-core/src/sprint3/evaluate-original-technique-lifecycle.ts` | Generation, history, loss pure processor |
| `packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts` | OTL-001〜009 |
| `packages/simulation-core/src/sprint3/constants.ts` | 0.9.0 version + policy ids |
| `packages/simulation-core/src/sprint3/types.ts` | Lifecycle config + boundary types |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `createSprint3Balance090ConfigInput` |
| `packages/simulation-core/src/sprint3/validate-sprint3-config.ts` | CFG validation + registry |
| `packages/simulation-core/src/sprint3/evaluate-explicit-weekly-teach.ts` | 0.9.0 gate |
| `packages/simulation-core/src/sprint3/evaluate-technique-teaching-selection.ts` | 0.9.0 teaching-selection gate |
| `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts` | 0.9.0 weekly bindings |
| `packages/simulation-core/src/sprint3/sprint3-config.test.ts` | CFG-014 |
| `packages/simulation-core/src/index.ts` | Public exports |
| `docs/SPRINT_3_BACKLOG.md` | S03-008 lifecycle slice published; wiring gaps noted |

## Commands / results

```text
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts
```

| Check | Result |
|-------|--------|
| Vitest Sprint3 focused bundle | **PASS** — **93/93** |
| Vitest OTL-001〜009 + CFG-014 | **PASS** — **10/10** (within bundle) |
| Vitest TS-001〜010 regression | **PASS** — **10/10** (within bundle) |
| `npm run build` (`packages/simulation-core`) | **PASS** |
| Root `npm run check` | **FAIL (pre-existing)** — `prettier --check` warnings across repo (unrelated to this slice) |

## Acceptance matrix

| ID | Requirement | Evidence |
|----|-------------|----------|
| OTL-001 | CFG-014 `sprint3-balance-0.9.0` validates | `sprint3-config.test.ts` |
| OTL-002 | Research thresholds 180/320/550 boundaries | `OTL-002` |
| OTL-003 | Success probability clamp 20..80% | `OTL-003` |
| OTL-004 | Deterministic RNG roll | `OTL-004` |
| OTL-005 | Failure retains 80% + 24-week cooldown | `OTL-005` |
| OTL-006 | Cooldown blocks attempt | `OTL-006` |
| OTL-007 | Success emits founding history | `OTL-007` |
| OTL-008 | Loss when no practitioners/successors | `OTL-008` |
| OTL-009 | Teaching selection regression on 0.9.0 | `OTL-009` |
| CFG-013 | 0.8.0 teaching selection unchanged | bundle pass |

## Remaining Sprint3 gaps

- Weekly-action research accumulation and world-step wiring for original-technique lifecycle
- Generated technique stat synthesis, school registration, first-match persistence
- Sprint4+ scope explicitly not started

**READY** — S03-008 original-technique lifecycle product slice complete; lane A returned to IDLE. No Cursor B2 control files edited.
