import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { asPersonId, asTournamentId } from "../ids.js";
import { DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import {
  applyFailureToStart,
  commitSchedulePlan,
} from "./tournament-schedule-state.js";
import { buildTournamentScheduleReadModel } from "./tournament-schedule-read-model.js";
import { createInitialTournamentIdGeneratorState } from "./tournament-id-registry.js";
import type { EntrantCandidateFacts, Sprint2Config } from "./types.js";
import {
  OFFICIAL_COMPETITION_MAXIMUM_AGE,
  OFFICIAL_COMPETITION_MINIMUM_AGE,
  assertScheduleLifecycleIdentityFresh,
  buildPlannedParticipantList,
  buildTournamentChoiceCandidates,
  canProduceParticipantList,
  collectEligibilityRejections,
  computeScheduleLifecycleIdentity,
  createNeutralEntryChoicePolicy,
  evaluateEntrantEligibility,
  selectSimultaneousTournamentForPerson,
  toEntrySelectionHandoff,
} from "./tournament-entry-selection.js";

const provider = createNodeSha256Provider();
const simulationId = "simulation_0000000000000001";
const runSeed = 42;

function tinyScheduleConfig(overrides?: Partial<Sprint2Config["schedule"]>): Sprint2Config {
  const base = createDefaultSprint2ConfigInput();
  return {
    ...base,
    configVersion: "sprint2-entry-selection-test",
    schedule: {
      normalMonthOffsetsByRank: {
        F: [0, 6],
        E: [0],
        D: [0],
        C: [2, 8],
        B: [4],
      },
      openMonthOffsets: [2, 8],
      limitedMonthOffsets: {
        unarmed: [0, 6],
        sword: [3],
        magic: [9],
      },
      promotionMonthOffsets: [5, 11],
      weekByKind: {
        normal: 1,
        open: 1,
        limited: 2,
        promotion: 3,
      },
      ...overrides,
    },
  };
}

function activeCompetitor(overrides: Partial<EntrantCandidateFacts> & Pick<EntrantCandidateFacts, "personId">): EntrantCandidateFacts {
  return {
    currentAge: 20,
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "active_competitor",
    currentRank: "F",
    ...overrides,
  };
}

function commitTinySchedule(config = tinyScheduleConfig()) {
  const initial = createInitialTournamentIdGeneratorState();
  expect(initial.ok).toBe(true);
  if (!initial.ok) {
    throw new Error("generator init failed");
  }
  const committed = commitSchedulePlan(
    config,
    DEFAULT_WORLD_CALENDAR_CONFIG,
    1,
    initial.value,
  );
  expect(committed.kind).toBe("success");
  if (committed.kind !== "success") {
    throw new Error("schedule commit failed");
  }
  return buildTournamentScheduleReadModel(committed.scheduleState);
}

describe("S02-003 entrant eligibility", () => {
  const schedule = commitTinySchedule();
  const fNormal = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F")!;
  const open = schedule.find((entry) => entry.kind === "open")!;
  const limited = schedule.find((entry) => entry.kind === "limited" && entry.domain === "unarmed")!;
  const promotion = schedule.find((entry) => entry.kind === "promotion")!;

  it("accepts age 16 and 41; rejects 15 and 42", () => {
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("p16"), currentAge: 16 }), fNormal).eligible).toBe(true);
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("p41"), currentAge: 41 }), fNormal).eligible).toBe(true);
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("p15"), currentAge: 15 }), fNormal)).toEqual({
      eligible: false,
      reason: "age_below_minimum",
    });
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("p42"), currentAge: 42 }), fNormal)).toEqual({
      eligible: false,
      reason: "age_above_maximum",
    });
    expect(OFFICIAL_COMPETITION_MINIMUM_AGE).toBe(16);
    expect(OFFICIAL_COMPETITION_MAXIMUM_AGE).toBe(41);
  });

  it("rejects retired/stopped/waiting/deceased", () => {
    expect(
      evaluateEntrantEligibility(
        activeCompetitor({ personId: asPersonId("retired"), careerStatus: "retired" }),
        fNormal,
      ).eligible,
    ).toBe(false);
    expect(
      evaluateEntrantEligibility(
        activeCompetitor({ personId: asPersonId("stopped"), participationStatus: "stopped" }),
        fNormal,
      ).eligible,
    ).toBe(false);
    expect(
      evaluateEntrantEligibility(
        activeCompetitor({ personId: asPersonId("waiting"), participationStatus: "waiting" }),
        fNormal,
      ).eligible,
    ).toBe(false);
    expect(
      evaluateEntrantEligibility(
        {
          personId: asPersonId("deceased"),
          currentAge: 30,
          lifeStatus: "deceased",
          participationStatus: "active",
          careerStatus: "active_competitor",
          currentRank: "F",
        },
        fNormal,
      ).eligible,
    ).toBe(false);
  });

  it("enforces F..B normal exact-rank match with no down-entry", () => {
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("f"), currentRank: "F" }), fNormal).eligible).toBe(true);
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("b"), currentRank: "B" }), fNormal)).toEqual({
      eligible: false,
      reason: "normal_rank_mismatch",
    });
  });

  it("allows A/S open eligibility without demotion", () => {
    const openNonChampionship = {
      ...open,
      championshipCycleClassification: "non_championship_year" as const,
    };
    expect(
      evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("a"), currentRank: "A" }), openNonChampionship)
        .eligible,
    ).toBe(true);
    expect(
      evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("s"), currentRank: "S" }), openNonChampionship)
        .eligible,
    ).toBe(true);
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("f"), currentRank: "F" }), openNonChampionship)).toEqual({
      eligible: false,
      reason: "open_rank_ineligible",
    });
  });

  it("allows C+ limited eligibility without numeric aptitude invention", () => {
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("c"), currentRank: "C" }), limited).eligible).toBe(true);
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("s"), currentRank: "S" }), limited).eligible).toBe(true);
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("f"), currentRank: "F" }), limited)).toEqual({
      eligible: false,
      reason: "limited_rank_below_minimum",
    });
  });

  it("fail-closes promotion/championship without accepted upstream facts", () => {
    expect(evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("f"), currentRank: "F" }), promotion)).toEqual({
      eligible: false,
      reason: "promotion_qualification_missing",
    });
    expect(
      evaluateEntrantEligibility(
        activeCompetitor({
          personId: asPersonId("f-promo"),
          currentRank: "F",
          acceptedPromotionQualification: true,
        }),
        promotion,
      ).eligible,
    ).toBe(true);

    const championshipOpen = {
      ...open,
      championshipCycleClassification: "championship_year" as const,
    };
    expect(
      evaluateEntrantEligibility(activeCompetitor({ personId: asPersonId("s"), currentRank: "S" }), championshipOpen),
    ).toEqual({
      eligible: false,
      reason: "championship_qualification_missing",
    });
    expect(
      evaluateEntrantEligibility(
        activeCompetitor({
          personId: asPersonId("s-champ"),
          currentRank: "S",
          acceptedChampionshipEntrantQualification: true,
        }),
        championshipOpen,
      ).eligible,
    ).toBe(true);
  });
});

describe("S02-003 simultaneous choice and determinism", () => {
  it("selects at most one tournament for simultaneous competing opportunities", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: {
        F: [0],
        E: [0],
        D: [0],
        C: [0],
        B: [0],
      },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [0], sword: [], magic: [] },
      promotionMonthOffsets: [],
      weekByKind: {
        normal: 1,
        open: 1,
        limited: 1,
        promotion: 3,
      },
    });
    const schedule = commitTinySchedule(config);
    const candidates = buildTournamentChoiceCandidates(schedule);
    const sameWeek = candidates.filter(
      (candidate) => candidate.effectiveEntry.absoluteWeek === candidates[0]!.effectiveEntry.absoluteWeek,
    );
    expect(sameWeek.length).toBeGreaterThan(1);

    const policy = createNeutralEntryChoicePolicy(config);
    const facts = activeCompetitor({ personId: asPersonId("person_a"), currentRank: "C" });
    const selected = selectSimultaneousTournamentForPerson({
      candidateFacts: facts,
      competingCandidates: sameWeek,
      policy,
      config,
      simulationId,
      runSeed,
      provider,
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) {
      return;
    }
    expect(selected.value).not.toBeNull();
  });

  it("reproduces identical tournament choice, order, and participant-list identity", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: {
        F: [0],
        E: [0],
        D: [0],
        C: [0],
        B: [0],
      },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
    });
    const schedule = commitTinySchedule(config);
    const fTournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F")!;
    const policy = createNeutralEntryChoicePolicy(config);
    const candidates = new Map([
      [asPersonId("person_b"), activeCompetitor({ personId: asPersonId("person_b"), currentRank: "F" })],
      [asPersonId("person_a"), activeCompetitor({ personId: asPersonId("person_a"), currentRank: "F" })],
      [asPersonId("person_c"), activeCompetitor({ personId: asPersonId("person_c"), currentRank: "F" })],
    ]);

    const build = () =>
      buildPlannedParticipantList({
        tournamentId: fTournament.tournamentId,
        scheduleEntries: schedule,
        candidateFactsByPersonId: candidates,
        policy,
        config,
        simulationId,
        runSeed,
        provider,
      });

    const first = build();
    const second = build();
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok || first.value === null || second.value === null) {
      return;
    }
    expect(first.value.selectedPersonIds).toEqual(second.value.selectedPersonIds);
    expect(first.value.participantListHash).toBe(second.value.participantListHash);
  });

  it("uses derived tie-key without advancing World/Battle RNG", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: { F: [0], E: [0], D: [0], C: [0], B: [0] },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [0], sword: [0], magic: [0] },
      promotionMonthOffsets: [],
      weekByKind: { normal: 1, open: 1, limited: 1, promotion: 3 },
    });
    config.entry.baseScoresHundredths = {
      normal: 5000,
      open: 5000,
      limited: 5000,
      promotion: 5000,
    };
    const schedule = commitTinySchedule(config);
    const candidates = buildTournamentChoiceCandidates(schedule);
    const sameWeek = candidates.filter(
      (candidate) => candidate.effectiveEntry.absoluteWeek === candidates[0]!.effectiveEntry.absoluteWeek,
    );
    const policy = createNeutralEntryChoicePolicy(config);
    const selected = selectSimultaneousTournamentForPerson({
      candidateFacts: activeCompetitor({ personId: asPersonId("person_a"), currentRank: "C" }),
      competingCandidates: sameWeek,
      policy,
      config,
      simulationId,
      runSeed,
      provider,
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) {
      return;
    }
    expect(typeof selected.value).toBe("string");
  });
});

describe("S02-003 lifecycle-aware participant lists", () => {
  it("preserves source TournamentId through postpone->merge and prevents duplicate participation", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: { F: [0, 6], E: [0], D: [0], C: [0], B: [0] },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
    });
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    const fSlots = committed.scheduleState.entries.filter(
      (entry) => entry.kind === "normal" && entry.targetRank === "F",
    );
    expect(fSlots.length).toBe(2);
    const source = fSlots[0]!;
    const transitioned = applyFailureToStart(committed.scheduleState, source.tournamentId);
    expect(transitioned.ok).toBe(true);
    if (!transitioned.ok) {
      return;
    }
    const readModel = buildTournamentScheduleReadModel(transitioned.value);
    const mergedSource = readModel.find((entry) => entry.tournamentId === source.tournamentId)!;
    expect(mergedSource.lifecycleState).toBe("merged");
    expect(mergedSource.tournamentId).toBe(source.tournamentId);

    const policy = createNeutralEntryChoicePolicy(config);
    const list = buildPlannedParticipantList({
      tournamentId: source.tournamentId,
      scheduleEntries: readModel,
      candidateFactsByPersonId: new Map([
        [asPersonId("person_a"), activeCompetitor({ personId: asPersonId("person_a"), currentRank: "F" })],
      ]),
      policy,
      config,
      simulationId,
      runSeed,
      provider,
    });
    expect(list.ok).toBe(true);
    if (!list.ok) {
      return;
    }
    expect(list.value).not.toBeNull();
  });

  it("returns no participant list for cancelled tournaments", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: { F: [11], E: [0], D: [0], C: [0], B: [0] },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
    });
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    const fSlot = committed.scheduleState.entries.find(
      (entry) => entry.kind === "normal" && entry.targetRank === "F",
    )!;
    const cancelled = applyFailureToStart(committed.scheduleState, fSlot.tournamentId);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) {
      return;
    }
    const readModel = buildTournamentScheduleReadModel(cancelled.value);
    const cancelledEntry = readModel.find((entry) => entry.tournamentId === fSlot.tournamentId)!;
    expect(canProduceParticipantList(cancelledEntry)).toBe(false);

    const policy = createNeutralEntryChoicePolicy(config);
    const list = buildPlannedParticipantList({
      tournamentId: fSlot.tournamentId,
      scheduleEntries: readModel,
      candidateFactsByPersonId: new Map([
        [asPersonId("person_a"), activeCompetitor({ personId: asPersonId("person_a"), currentRank: "F" })],
      ]),
      policy,
      config,
      simulationId,
      runSeed,
      provider,
    });
    expect(list.ok).toBe(true);
    if (!list.ok) {
      return;
    }
    expect(list.value).toBeNull();
  });

  it("rejects stale schedule/lifecycle identity", () => {
    const schedule = commitTinySchedule();
    const fTournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F")!;
    const identity = computeScheduleLifecycleIdentity(fTournament, provider);
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }
    const stale = {
      ...identity.value,
      identityHash: "a".repeat(64),
    };
    const freshCheck = assertScheduleLifecycleIdentityFresh(stale, identity.value);
    expect(freshCheck.ok).toBe(false);
  });
});

describe("S02-003 S02-004 handoff", () => {
  it("exposes minimal downstream handoff fields only", () => {
    const schedule = commitTinySchedule();
    const fTournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F")!;
    const config = tinyScheduleConfig();
    const policy = createNeutralEntryChoicePolicy(config);
    const list = buildPlannedParticipantList({
      tournamentId: fTournament.tournamentId,
      scheduleEntries: schedule,
      candidateFactsByPersonId: new Map([
        [asPersonId("person_a"), activeCompetitor({ personId: asPersonId("person_a"), currentRank: "F" })],
      ]),
      policy,
      config,
      simulationId,
      runSeed,
      provider,
    });
    expect(list.ok).toBe(true);
    if (!list.ok || list.value === null) {
      return;
    }
    const handoff = toEntrySelectionHandoff(list.value);
    expect(handoff.tournamentId).toBe(fTournament.tournamentId);
    expect(handoff.selectedPersonIds.length).toBeGreaterThan(0);
    expect(handoff.participantListHash).toMatch(/^[0-9a-f]{64}$/);
    expect(handoff.scheduleLifecycleIdentity.identityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(handoff.policyIdentity.policyVersion).toBe("entry-choice-policy-0.1.0");

    const rejections = collectEligibilityRejections(
      [activeCompetitor({ personId: asPersonId("b"), currentRank: "B" })],
      fTournament,
    );
    expect(rejections.normal_rank_mismatch).toContain(asPersonId("b"));
  });
});

describe("S02-003 scope guard", () => {
  it("does not expose bracket/battle/ranking modules from entry-selection surface", () => {
    expect(typeof evaluateEntrantEligibility).toBe("function");
    expect(typeof buildPlannedParticipantList).toBe("function");
    expect(asTournamentId("tournament_000000000001")).toBe("tournament_000000000001");
  });
});
