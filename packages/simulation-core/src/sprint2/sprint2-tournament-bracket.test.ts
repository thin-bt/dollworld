import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { asMatchId, asPersonId, asTournamentId } from "../ids.js";
import { DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import { commitSchedulePlan } from "./tournament-schedule-state.js";
import { buildTournamentScheduleReadModel } from "./tournament-schedule-read-model.js";
import { createInitialTournamentIdGeneratorState } from "./tournament-id-registry.js";
import type { EntrantCandidateFacts, Sprint2Config } from "./types.js";
import {
  buildPlannedParticipantList,
  computeParticipantListHash,
  computeScheduleLifecycleIdentity,
  createNeutralEntryChoicePolicy,
} from "./tournament-entry-selection.js";
import type { InjectedStructuralPolicyInput } from "./tournament-bracket-policy.js";
import {
  buildStructuralBracketDefinition,
  computeBracketDefinitionHash,
  createInitialBracketRuntimeSlotState,
} from "./tournament-bracket-definition.js";

const provider = createNodeSha256Provider();
const simulationId = "simulation_0000000000000001";
const runSeed = 42;

function tinyScheduleConfig(): Sprint2Config {
  const base = createDefaultSprint2ConfigInput();
  return {
    ...base,
    configVersion: "sprint2-bracket-test",
    schedule: {
      normalMonthOffsetsByRank: { F: [0], E: [0], D: [0], C: [0], B: [0] },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
      weekByKind: { normal: 1, open: 1, limited: 2, promotion: 3 },
    },
  };
}

function activeCompetitor(
  overrides: Partial<EntrantCandidateFacts> & Pick<EntrantCandidateFacts, "personId">,
): EntrantCandidateFacts {
  return {
    currentAge: 20,
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "active_competitor",
    currentRank: "F",
    ...overrides,
  };
}

function commitTinySchedule() {
  const config = tinyScheduleConfig();
  const initial = createInitialTournamentIdGeneratorState();
  expect(initial.ok).toBe(true);
  if (!initial.ok) {
    throw new Error("generator init failed");
  }
  const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
  expect(committed.kind).toBe("success");
  if (committed.kind !== "success") {
    throw new Error("schedule commit failed");
  }
  return { schedule: buildTournamentScheduleReadModel(committed.scheduleState), config };
}

function basePolicy(
  overrides?: Partial<InjectedStructuralPolicyInput>,
): InjectedStructuralPolicyInput {
  return {
    formatSelection: {
      formatKind: "round_robin",
      policyIdentity: {
        policyVersion: "format-selection-test-0.1.0",
        configVersion: "format-selection-config-a",
      },
    },
    knockoutSeedByePolicyIdentity: {
      policyVersion: "knockout-seed-bye-test-0.1.0",
      configVersion: "knockout-seed-bye-config-a",
    },
    standingsTieBreakPolicyIdentity: {
      policyVersion: "standings-tie-break-test-0.1.0",
      configVersion: "standings-tie-break-config-a",
    },
    ...overrides,
  };
}

function buildParticipantFixture(personIds: string[] = ["person_a", "person_b", "person_c"]) {
  const { schedule, config } = commitTinySchedule();
  const tournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F")!;
  const policy = createNeutralEntryChoicePolicy(config);
  const facts = new Map(
    personIds.map((id) => [
      asPersonId(id),
      activeCompetitor({ personId: asPersonId(id), currentRank: "F" }),
    ]),
  );
  const list = buildPlannedParticipantList({
    tournamentId: tournament.tournamentId,
    scheduleEntries: schedule,
    candidateFactsByPersonId: facts,
    policy,
    config,
    simulationId,
    runSeed,
    provider,
  });
  expect(list.ok).toBe(true);
  if (!list.ok || list.value === null) {
    throw new Error("participant list build failed");
  }
  const lifecycle = computeScheduleLifecycleIdentity(tournament, provider);
  expect(lifecycle.ok).toBe(true);
  if (!lifecycle.ok) {
    throw new Error("lifecycle identity failed");
  }
  return {
    tournament,
    list: list.value,
    lifecycle: lifecycle.value,
    policy,
    config,
    schedule,
  };
}

describe("S02-004 policy-injected structural framework", () => {
  it("BRK-001 fails closed when Decision A/B/C policy inputs are missing", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b"]);
    const incompletePolicy = {
      formatSelection: {
        formatKind: "round_robin" as const,
        policyIdentity: { policyVersion: "", configVersion: "x" },
      },
      knockoutSeedByePolicyIdentity: {
        policyVersion: "knockout-seed-bye-test-0.1.0",
        configVersion: "knockout-seed-bye-config-a",
      },
      standingsTieBreakPolicyIdentity: {
        policyVersion: "standings-tie-break-test-0.1.0",
        configVersion: "standings-tie-break-config-a",
      },
    };
    const result = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: incompletePolicy,
      },
      provider,
    );
    expect(result.ok).toBe(false);

    const knockoutPolicy = basePolicy({
      formatSelection: {
        formatKind: "knockout",
        policyIdentity: {
          policyVersion: "format-selection-test-0.1.0",
          configVersion: "format-selection-config-a",
        },
      },
    });
    const knockoutMissingB = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: knockoutPolicy,
      },
      provider,
    );
    expect(knockoutMissingB.ok).toBe(false);
  });

  it("BRK-002 does not silently choose format/seed/BYE/tie-break defaults", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b", "person_c"]);
    const result = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.definition.formatKind).toBe("round_robin");
    expect(result.value.definition.policyIdentities.formatSelection.configVersion).toBe(
      "format-selection-config-a",
    );
    expect(result.value.definition.knockoutSlots).toEqual([]);
  });

  it("BRK-003 rejects duplicate PersonId", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b"]);
    const duplicateIds = [asPersonId("person_a"), asPersonId("person_a")];
    const result = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: duplicateIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(result.ok).toBe(false);
  });

  it("BRK-004 rejects stale, cancelled, and mismatched source identity", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b"]);
    const stale = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        expectedScheduleLifecycleIdentity: {
          ...fixture.lifecycle,
          identityHash: "b".repeat(64),
        },
        policy: basePolicy(),
      },
      provider,
    );
    expect(stale.ok).toBe(false);

    const cancelledLifecycle = {
      ...fixture.lifecycle,
      lifecycleState: "cancelled" as const,
    };
    const cancelled = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: cancelledLifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(cancelled.ok).toBe(false);

    const mismatchedTournament = buildStructuralBracketDefinition(
      {
        tournamentId: asTournamentId("tournament_000000000099"),
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(mismatchedTournament.ok).toBe(false);
  });

  it("BRK-005 reproduces canonical bracket identity for same frozen inputs", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b", "person_c"]);
    const input = {
      tournamentId: fixture.tournament.tournamentId,
      orderedPersonIds: fixture.list.selectedPersonIds,
      participantListHash: fixture.list.participantListHash,
      scheduleLifecycleIdentity: fixture.lifecycle,
      entryChoicePolicyIdentity: fixture.policy.identity,
      policy: basePolicy(),
    };
    const first = buildStructuralBracketDefinition(input, provider);
    const second = buildStructuralBracketDefinition(input, provider);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.value.definition.bracketDefinitionHash).toBe(
      second.value.definition.bracketDefinitionHash,
    );
  });

  it("BRK-006 changes canonical identity when participant ordering or policy identity is material", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b", "person_c"]);
    const orderingA = [
      asPersonId("person_a"),
      asPersonId("person_b"),
      asPersonId("person_c"),
    ] as const;
    const orderingB = [
      asPersonId("person_c"),
      asPersonId("person_b"),
      asPersonId("person_a"),
    ] as const;
    const hashA = computeParticipantListHash(
      {
        tournamentId: fixture.tournament.tournamentId,
        scheduleLifecycleIdentityHash: fixture.lifecycle.identityHash,
        selectedPersonIds: orderingA,
        policyIdentity: fixture.policy.identity,
      },
      provider,
    );
    const hashB = computeParticipantListHash(
      {
        tournamentId: fixture.tournament.tournamentId,
        scheduleLifecycleIdentityHash: fixture.lifecycle.identityHash,
        selectedPersonIds: orderingB,
        policyIdentity: fixture.policy.identity,
      },
      provider,
    );
    expect(hashA.ok && hashB.ok).toBe(true);
    if (!hashA.ok || !hashB.ok) {
      return;
    }
    const orderedA = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: orderingA,
        participantListHash: hashA.value,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    const orderedB = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: orderingB,
        participantListHash: hashB.value,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(orderedA.ok && orderedB.ok).toBe(true);
    if (!orderedA.ok || !orderedB.ok) {
      return;
    }
    expect(orderedA.value.definition.bracketDefinitionHash).not.toBe(
      orderedB.value.definition.bracketDefinitionHash,
    );

    const policyVariant = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: orderingA,
        participantListHash: hashA.value,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy({
          formatSelection: {
            formatKind: "round_robin",
            policyIdentity: {
              policyVersion: "format-selection-test-0.1.0",
              configVersion: "format-selection-config-b",
            },
          },
        }),
      },
      provider,
    );
    expect(policyVariant.ok).toBe(true);
    if (!policyVariant.ok) {
      return;
    }
    expect(policyVariant.value.definition.bracketDefinitionHash).not.toBe(
      orderedA.value.definition.bracketDefinitionHash,
    );
  });

  it("BRK-007 round-robin enumerates every unordered pair exactly once", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b", "person_c", "person_d"]);
    const result = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.definition.roundRobinPairs).toHaveLength(6);
    const pairKeys = result.value.definition.roundRobinPairs.map(
      (pair) => `${pair.personIdA}|${pair.personIdB}`,
    );
    expect(new Set(pairKeys).size).toBe(6);
    for (const pair of result.value.definition.roundRobinPairs) {
      expect(pair.personIdA < pair.personIdB).toBe(true);
    }
  });

  it("BRK-008 validates caller-supplied group membership deterministically", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b", "person_c", "person_d"]);
    const groups = [
      [asPersonId("person_b"), asPersonId("person_a")],
      [asPersonId("person_d"), asPersonId("person_c")],
    ];
    const result = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy({
          formatSelection: {
            formatKind: "group_round_robin_knockout",
            policyIdentity: {
              policyVersion: "format-selection-test-0.1.0",
              configVersion: "format-selection-config-group",
            },
            groups,
          },
          knockoutSeedByeMapping: {
            policyIdentity: {
              policyVersion: "knockout-seed-bye-test-0.1.0",
              configVersion: "knockout-seed-bye-config-a",
            },
            slots: [
              {
                slotId: "final",
                roundIndex: 1,
                slotIndex: 0,
                feedsFromSlotIds: ["semi_a", "semi_b"],
              },
              {
                slotId: "semi_a",
                roundIndex: 0,
                slotIndex: 0,
                participantPersonId: asPersonId("person_a"),
                seedRank: 1,
              },
              {
                slotId: "semi_b",
                roundIndex: 0,
                slotIndex: 1,
                participantPersonId: asPersonId("person_c"),
                seedRank: 2,
              },
            ],
          },
        }),
      },
      provider,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.definition.groupMemberships[0]?.personIds).toEqual([
      asPersonId("person_a"),
      asPersonId("person_b"),
    ]);
    expect(result.value.definition.groupRoundRobinPairs).toHaveLength(2);

    const duplicateGroupMember = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy({
          formatSelection: {
            formatKind: "group_round_robin_knockout",
            policyIdentity: {
              policyVersion: "format-selection-test-0.1.0",
              configVersion: "format-selection-config-group",
            },
            groups: [
              [asPersonId("person_a"), asPersonId("person_b")],
              [asPersonId("person_b"), asPersonId("person_c")],
            ],
          },
          knockoutSeedByeMapping: {
            policyIdentity: {
              policyVersion: "knockout-seed-bye-test-0.1.0",
              configVersion: "knockout-seed-bye-config-a",
            },
            slots: [
              {
                slotId: "s1",
                roundIndex: 0,
                slotIndex: 0,
                participantPersonId: asPersonId("person_a"),
              },
            ],
          },
        }),
      },
      provider,
    );
    expect(duplicateGroupMember.ok).toBe(false);
  });

  it("BRK-009 builds acyclic knockout mapping and rejects malformed graphs", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b", "person_c"]);
    const valid = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy({
          formatSelection: {
            formatKind: "knockout",
            policyIdentity: {
              policyVersion: "format-selection-test-0.1.0",
              configVersion: "format-selection-config-ko",
            },
          },
          knockoutSeedByeMapping: {
            policyIdentity: {
              policyVersion: "knockout-seed-bye-test-0.1.0",
              configVersion: "knockout-seed-bye-config-a",
            },
            slots: [
              {
                slotId: "final",
                roundIndex: 1,
                slotIndex: 0,
                feedsFromSlotIds: ["semi_a", "semi_b"],
              },
              {
                slotId: "semi_a",
                roundIndex: 0,
                slotIndex: 0,
                participantPersonId: asPersonId("person_a"),
                isByeAdvancement: false,
              },
              {
                slotId: "semi_b",
                roundIndex: 0,
                slotIndex: 1,
                participantPersonId: asPersonId("person_b"),
                isByeAdvancement: true,
              },
            ],
          },
        }),
      },
      provider,
    );
    expect(valid.ok).toBe(true);
    if (!valid.ok) {
      return;
    }
    expect(
      valid.value.definition.knockoutSlots.some((slot) => slot.isByeAdvancement === true),
    ).toBe(true);

    const cyclic = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy({
          formatSelection: {
            formatKind: "knockout",
            policyIdentity: {
              policyVersion: "format-selection-test-0.1.0",
              configVersion: "format-selection-config-ko",
            },
          },
          knockoutSeedByeMapping: {
            policyIdentity: {
              policyVersion: "knockout-seed-bye-test-0.1.0",
              configVersion: "knockout-seed-bye-config-a",
            },
            slots: [
              { slotId: "a", roundIndex: 0, slotIndex: 0, feedsFromSlotIds: ["b"] },
              { slotId: "b", roundIndex: 0, slotIndex: 1, feedsFromSlotIds: ["a"] },
            ],
          },
        }),
      },
      provider,
    );
    expect(cyclic.ok).toBe(false);
  });

  it("BRK-010 pure bracket build emits no MatchId and consumes zero RNG", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b"]);
    const result = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy(),
      },
      provider,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const serialized = JSON.stringify(result.value);
    expect(serialized.includes("match_")).toBe(false);
    expect(asMatchId("match_000000000001")).toMatch(/^match_/);
    expect(result.value.definition.bracketDefinitionHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("BRK-011 keeps immutable definition separate from mutable runtime slot state", () => {
    const fixture = buildParticipantFixture(["person_a", "person_b"]);
    const built = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: fixture.list.selectedPersonIds,
        participantListHash: fixture.list.participantListHash,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy: basePolicy({
          formatSelection: {
            formatKind: "knockout",
            policyIdentity: {
              policyVersion: "format-selection-test-0.1.0",
              configVersion: "format-selection-config-ko",
            },
          },
          knockoutSeedByeMapping: {
            policyIdentity: {
              policyVersion: "knockout-seed-bye-test-0.1.0",
              configVersion: "knockout-seed-bye-config-a",
            },
            slots: [
              {
                slotId: "final",
                roundIndex: 1,
                slotIndex: 0,
                feedsFromSlotIds: ["semi_a", "semi_b"],
              },
              {
                slotId: "semi_a",
                roundIndex: 0,
                slotIndex: 0,
                participantPersonId: asPersonId("person_a"),
              },
              {
                slotId: "semi_b",
                roundIndex: 0,
                slotIndex: 1,
                participantPersonId: asPersonId("person_b"),
              },
            ],
          },
        }),
      },
      provider,
    );
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    const originalHash = built.value.definition.bracketDefinitionHash;
    const runtime = createInitialBracketRuntimeSlotState(built.value.definition);
    runtime.slotStates[0]!.resolvedParticipantPersonId = asPersonId("person_c");
    const hashAfterMutation = computeBracketDefinitionHash(
      {
        tournamentId: built.value.definition.tournamentId,
        participantListHash: built.value.definition.participantListHash,
        orderedPersonIds: built.value.definition.orderedPersonIds,
        scheduleLifecycleIdentityHash: built.value.definition.scheduleLifecycleIdentityHash,
        formatKind: built.value.definition.formatKind,
        roundRobinPairs: built.value.definition.roundRobinPairs,
        groupMemberships: built.value.definition.groupMemberships,
        groupRoundRobinPairs: built.value.definition.groupRoundRobinPairs,
        knockoutSlots: built.value.definition.knockoutSlots,
        policyIdentities: built.value.definition.policyIdentities,
      },
      provider,
    );
    expect(hashAfterMutation.ok).toBe(true);
    if (!hashAfterMutation.ok) {
      return;
    }
    expect(hashAfterMutation.value).toBe(originalHash);
  });
});

describe("S02-004 import boundary", () => {
  it("Sprint1 modules do not import sprint2 bracket paths", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint1Dir = join(process.cwd(), "packages/simulation-core/src/sprint1");
    const forbidden = ["tournament-bracket-definition", "tournament-bracket-policy"];
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          const content = await readFile(full, "utf8");
          for (const fragment of forbidden) {
            expect(content.includes(fragment), `${full} must not import ${fragment}`).toBe(false);
          }
        }
      }
    }
    await walk(sprint1Dir);
  });
});
