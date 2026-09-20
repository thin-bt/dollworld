import { describe, expect, it } from "vitest";
import { toCanonicalJson } from "../index.js";
import { failure } from "../validation.js";
import { asPersonId } from "../ids.js";
import {
  createEmptyDetailedLogPayloadStore,
  computeDetailedLogPayloadHash,
} from "./detailed-log-payload-store.js";
import { formatTournamentSlotId } from "./stored-battle-result-ref.js";
import { buildTournamentMatchPlan } from "./tournament-match-plan.js";
import {
  executeTournamentBattleAtomic,
  snapshotTournamentBattleAtomicBaseline,
} from "./tournament-battle-atomic-adapter.js";
import { executeTournamentBattleHandoff } from "./tournament-battle-handoff.js";
import {
  buildRoundRobinBracketForPersons,
  defaultCompetitionRuleHash,
  defaultTournamentBattleActionIdentity,
  defaultTournamentBattleActionsSource,
  prepareTournamentBattleSession,
  tournamentBattleFixtureProvider,
} from "./tournament-battle-atomic.fixture.js";

const provider = tournamentBattleFixtureProvider;

function buildAtomicInputs(seed = 6001) {
  const { session, personA, personB } = prepareTournamentBattleSession(seed);
  const bracket = buildRoundRobinBracketForPersons(personA, personB);
  const plan = buildTournamentMatchPlan(
    {
      tournamentId: bracket.tournament.tournamentId,
      bracketDefinition: bracket.built.definition,
      runtimeState: bracket.built.runtimeState,
      structuralSlot: { kind: "round_robin", pairIndex: 0 },
      scheduleLifecycleIdentity: bracket.lifecycle,
      slotBindings: [],
      matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
    },
    provider,
  );
  if (!plan.ok) {
    throw new Error(JSON.stringify(plan.issues));
  }
  const actionIdentity = defaultTournamentBattleActionIdentity(session);
  return {
    session,
    bracket,
    plan: plan.value,
    actionIdentity,
    slotIdentity: {
      slotId: formatTournamentSlotId(0),
      matchOrdinal: 0,
    },
    payloadStore: createEmptyDetailedLogPayloadStore(),
    storedRecords: [] as const,
    competitionRuleHash: defaultCompetitionRuleHash(session),
  };
}

describe("S02-006 tournament battle atomic adapter", () => {
  it("BAT-001 official battle completes with StoredBattleResultRef and application fact", () => {
    const input = buildAtomicInputs(6001);
    const baseline = snapshotTournamentBattleAtomicBaseline({
      session: input.session,
      payloadStore: input.payloadStore,
      storedRecords: input.storedRecords,
    });
    const result = executeTournamentBattleAtomic(
      {
        handoff: {
          matchPlan: input.plan,
          session: input.session,
          participantAActionSourceIdentity: input.actionIdentity,
          participantBActionSourceIdentity: input.actionIdentity,
          participantAActionsSource: defaultTournamentBattleActionsSource(input.session),
          participantBActionsSource: defaultTournamentBattleActionsSource(input.session),
          slotBindings: [],
        },
        matchPlan: input.plan,
        slotIdentity: input.slotIdentity,
        competitionRuleHash: input.competitionRuleHash,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      },
      provider,
    );
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") {
      return;
    }
    expect(result.storedBattleResultRef.matchId).toBe(input.plan.reservedMatchId);
    expect(result.storedBattleResultRef.tournamentId).toBe(input.plan.tournamentId);
    expect(result.storedBattleResultRef.slotId).toBe("slot-000000");
    expect(result.storedRecords).toHaveLength(1);
    expect(result.applicationFact.handoffResult.matchId).toBe(input.plan.reservedMatchId);
    expect(result.slotBindings).toHaveLength(1);
    expect(
      snapshotTournamentBattleAtomicBaseline({
        session: input.session,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      }),
    ).toBe(baseline);
  });

  it("BAT-008 pre_start_failure leaves baseline unchanged (FI-BAT-001)", () => {
    const input = buildAtomicInputs(6011);
    const baseline = snapshotTournamentBattleAtomicBaseline({
      session: input.session,
      payloadStore: input.payloadStore,
      storedRecords: input.storedRecords,
    });
    const tamperedPlan = {
      ...input.plan,
      participantPersonIdB: asPersonId("person_missing_for_pre_start"),
    };
    const result = executeTournamentBattleAtomic(
      {
        handoff: {
          matchPlan: tamperedPlan,
          session: input.session,
          participantAActionSourceIdentity: input.actionIdentity,
          participantBActionSourceIdentity: input.actionIdentity,
          participantAActionsSource: defaultTournamentBattleActionsSource(input.session),
          participantBActionsSource: defaultTournamentBattleActionsSource(input.session),
          slotBindings: [],
        },
        matchPlan: tamperedPlan,
        slotIdentity: input.slotIdentity,
        competitionRuleHash: input.competitionRuleHash,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      },
      provider,
    );
    expect(result.kind === "pre_start_failure" || result.kind === "plan_validation_failure").toBe(
      true,
    );
    expect(
      snapshotTournamentBattleAtomicBaseline({
        session: input.session,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      }),
    ).toBe(baseline);
    expect(input.storedRecords).toHaveLength(0);
  });

  it("RBK-002 payload integrity failure leaves zero stored records", () => {
    const input = buildAtomicInputs(6001);
    const baseline = snapshotTournamentBattleAtomicBaseline({
      session: input.session,
      payloadStore: input.payloadStore,
      storedRecords: input.storedRecords,
    });
    const previewHandoff = executeTournamentBattleHandoff(
      {
        matchPlan: input.plan,
        session: input.session,
        participantAActionSourceIdentity: input.actionIdentity,
        participantBActionSourceIdentity: input.actionIdentity,
        participantAActionsSource: { identity: input.actionIdentity },
        participantBActionsSource: { identity: input.actionIdentity },
        slotBindings: [],
      },
      provider,
    );
    expect(previewHandoff.kind).toBe("completed");
    if (previewHandoff.kind !== "completed") {
      return;
    }
    const detailedLogHash = computeDetailedLogPayloadHash(
      previewHandoff.commitPlan.battleResult.detailedLog,
      provider,
    );
    expect(detailedLogHash.ok).toBe(true);
    if (!detailedLogHash.ok) {
      return;
    }
    const corruptedStore = {
      schemaVersion: input.payloadStore.schemaVersion,
      entries: new Map([
        [
          detailedLogHash.value,
          {
            detailedLogHash: detailedLogHash.value,
            canonicalUtf8Bytes: '{"turnOrderLogs":[],"actionLogs":[{"unexpected":true}]}',
          },
        ],
      ]),
    };
    const inputAfterPreview = buildAtomicInputs(6001);
    const result = executeTournamentBattleAtomic(
      {
        handoff: {
          matchPlan: inputAfterPreview.plan,
          session: inputAfterPreview.session,
          participantAActionSourceIdentity: inputAfterPreview.actionIdentity,
          participantBActionSourceIdentity: inputAfterPreview.actionIdentity,
          participantAActionsSource: { identity: inputAfterPreview.actionIdentity },
          participantBActionsSource: { identity: inputAfterPreview.actionIdentity },
          slotBindings: [],
        },
        matchPlan: inputAfterPreview.plan,
        slotIdentity: inputAfterPreview.slotIdentity,
        competitionRuleHash: inputAfterPreview.competitionRuleHash,
        payloadStore: corruptedStore,
        storedRecords: inputAfterPreview.storedRecords,
      },
      provider,
    );
    expect(result.kind).toBe("publication_failure");
    expect(
      snapshotTournamentBattleAtomicBaseline({
        session: input.session,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      }),
    ).toBe(baseline);
  });

  it("RBK-003 record commit gate failure leaves canonical unchanged", () => {
    const input = buildAtomicInputs(6001);
    const baseline = snapshotTournamentBattleAtomicBaseline({
      session: input.session,
      payloadStore: input.payloadStore,
      storedRecords: input.storedRecords,
    });
    const result = executeTournamentBattleAtomic(
      {
        handoff: {
          matchPlan: input.plan,
          session: input.session,
          participantAActionSourceIdentity: input.actionIdentity,
          participantBActionSourceIdentity: input.actionIdentity,
          participantAActionsSource: defaultTournamentBattleActionsSource(input.session),
          participantBActionsSource: defaultTournamentBattleActionsSource(input.session),
          slotBindings: [],
        },
        matchPlan: input.plan,
        slotIdentity: input.slotIdentity,
        competitionRuleHash: input.competitionRuleHash,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
        publicationGate: {
          afterPayloadPut: () =>
            failure([
              {
                path: "/storedRecordCommit",
                message: "injected record commit failure",
                expected: "successful record commit",
              },
            ]),
        },
      },
      provider,
    );
    expect(result.kind).toBe("finalize_failure");
    expect(
      snapshotTournamentBattleAtomicBaseline({
        session: input.session,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      }),
    ).toBe(baseline);
  });

  it("RBK-001 downstream apply failure rolls back outer composition", () => {
    const input = buildAtomicInputs(6001);
    const baseline = snapshotTournamentBattleAtomicBaseline({
      session: input.session,
      payloadStore: input.payloadStore,
      storedRecords: input.storedRecords,
    });
    const result = executeTournamentBattleAtomic(
      {
        handoff: {
          matchPlan: input.plan,
          session: input.session,
          participantAActionSourceIdentity: input.actionIdentity,
          participantBActionSourceIdentity: input.actionIdentity,
          participantAActionsSource: defaultTournamentBattleActionsSource(input.session),
          participantBActionsSource: defaultTournamentBattleActionsSource(input.session),
          slotBindings: [],
        },
        matchPlan: input.plan,
        slotIdentity: input.slotIdentity,
        competitionRuleHash: input.competitionRuleHash,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
        publicationGate: {
          beforeFinalize: () =>
            failure([
              {
                path: "/tournamentApply",
                message: "injected tournament apply failure",
                expected: "successful tournament apply",
              },
            ]),
        },
      },
      provider,
    );
    expect(result.kind).toBe("finalize_failure");
    expect(
      snapshotTournamentBattleAtomicBaseline({
        session: input.session,
        payloadStore: input.payloadStore,
        storedRecords: input.storedRecords,
      }),
    ).toBe(baseline);
  });

  it("deterministic retry reproduces the same failure outcome", () => {
    const input = buildAtomicInputs(6011);
    const run = () =>
      executeTournamentBattleAtomic(
        {
          handoff: {
            matchPlan: {
              ...input.plan,
              participantPersonIdB: asPersonId("person_missing_for_pre_start"),
            },
            session: input.session,
            participantAActionSourceIdentity: input.actionIdentity,
            participantBActionSourceIdentity: input.actionIdentity,
            participantAActionsSource: { identity: input.actionIdentity },
            participantBActionsSource: { identity: input.actionIdentity },
            slotBindings: [],
          },
          matchPlan: input.plan,
          slotIdentity: input.slotIdentity,
          competitionRuleHash: input.competitionRuleHash,
          payloadStore: input.payloadStore,
          storedRecords: input.storedRecords,
        },
        provider,
      );
    const first = run();
    const second = run();
    expect(first.kind).toBe(second.kind);
    expect(toCanonicalJson(first)).toBe(toCanonicalJson(second));
  });

  it("deterministic retry reproduces the same success outcome", () => {
    const firstInput = buildAtomicInputs(6001);
    const secondInput = buildAtomicInputs(6001);
    const run = (input: ReturnType<typeof buildAtomicInputs>) =>
      executeTournamentBattleAtomic(
        {
          handoff: {
            matchPlan: input.plan,
            session: input.session,
            participantAActionSourceIdentity: input.actionIdentity,
            participantBActionSourceIdentity: input.actionIdentity,
            participantAActionsSource: { identity: input.actionIdentity },
            participantBActionsSource: { identity: input.actionIdentity },
            slotBindings: [],
          },
          matchPlan: input.plan,
          slotIdentity: input.slotIdentity,
          competitionRuleHash: input.competitionRuleHash,
          payloadStore: input.payloadStore,
          storedRecords: input.storedRecords,
        },
        provider,
      );
    const first = run(firstInput);
    const second = run(secondInput);
    expect(first.kind).toBe("completed");
    expect(second.kind).toBe("completed");
    if (first.kind !== "completed" || second.kind !== "completed") {
      return;
    }
    expect(first.applicationFact.applicationFactHash).toBe(
      second.applicationFact.applicationFactHash,
    );
    expect(first.storedBattleResultRef.refHash).toBe(second.storedBattleResultRef.refHash);
  });
});

describe("S02-006 import boundary", () => {
  it("S02-009 retention modules do not import S02-006 tournament atomic adapter", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint2Dir = join(process.cwd(), "packages/simulation-core/src/sprint2");
    const forbidden = ["tournament-battle-atomic-adapter", "stored-battle-result-ref"];
    const targets = [
      "battle-log-retention.ts",
      "detailed-log-payload-store.ts",
      "stored-battle-result.ts",
      "stored-battle-result-gc.ts",
      "stored-battle-result-materialization.ts",
    ];
    for (const file of targets) {
      const text = await readFile(join(sprint2Dir, file), "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${file} must not reference ${token}`).toBe(false);
      }
    }
  });
});
