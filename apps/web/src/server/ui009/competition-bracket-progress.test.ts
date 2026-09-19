import { describe, expect, it } from "vitest";
import {
  asPersonId,
  buildStructuralBracketDefinition,
  computeParticipantListHash,
  createDefaultSprint2ConfigInput,
} from "@shared-world/simulation-core";
import {
  buildTournamentBattleParticipantFixture,
  tournamentBattleFixtureProvider,
} from "../../../../../packages/simulation-core/src/sprint2/tournament-battle-atomic.fixture.js";
import { resolveKnockoutByeAdvancements } from "./competition-bracket-runtime.js";
import { buildUi009StructuralPolicy } from "./competition-structural-policy.js";
import { selectUi009TournamentFormat } from "./competition-format-selection.js";
import { isBracketStructurallyComplete, projectBracketProgress } from "./competition-bracket-progress.js";

const provider = tournamentBattleFixtureProvider;

describe("competition bracket progress", () => {
  it("does not treat zero-match brackets as structurally complete", () => {
    expect(
      isBracketStructurallyComplete({
        nextStructuralSlot: null,
        matchesCompleted: 0,
        matchesTotal: 0,
        groupPhaseComplete: true,
        knockoutPhaseComplete: true,
      }),
    ).toBe(false);
  });

  it("finds first knockout battle on fresh five-person bracket", () => {
    const personIds = ["p0", "p1", "p2", "p3", "p4"].map((id) => asPersonId(id));
    const fixture = buildTournamentBattleParticipantFixture(personIds);
    const participantListHash = computeParticipantListHash(
      {
        tournamentId: fixture.tournament.tournamentId,
        scheduleLifecycleIdentityHash: fixture.lifecycle.identityHash,
        selectedPersonIds: personIds,
        policyIdentity: fixture.policy.identity,
      },
      provider,
    );
    expect(participantListHash.ok).toBe(true);
    if (!participantListHash.ok) {
      return;
    }
    const config = createDefaultSprint2ConfigInput();
    const format = selectUi009TournamentFormat(5, "normal", config.format)!;
    const policy = buildUi009StructuralPolicy(format, personIds, config);
    const built = buildStructuralBracketDefinition(
      {
        tournamentId: fixture.tournament.tournamentId,
        orderedPersonIds: personIds,
        participantListHash: participantListHash.value,
        scheduleLifecycleIdentity: fixture.lifecycle,
        entryChoicePolicyIdentity: fixture.policy.identity,
        policy,
      },
      provider,
    );
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }
    const runtime = resolveKnockoutByeAdvancements(built.value.definition, built.value.runtimeState);
    const progress = projectBracketProgress({
      bracketDefinition: built.value.definition,
      bracketRuntimeState: runtime,
      storedRecords: [],
      slotBindings: [],
    });
    expect(progress.nextStructuralSlot).not.toBeNull();
    expect(progress.nextStructuralSlot?.kind).toBe("knockout");
  });
});
