import { describe, expect, it } from "vitest";
import {
  asPersonId,
  buildStructuralBracketDefinition,
  computeParticipantListHash,
} from "@shared-world/simulation-core";
import {
  buildTournamentBattleParticipantFixture,
  tournamentBattleBasePolicy,
  tournamentBattleFixtureProvider,
} from "../../../../../packages/simulation-core/src/sprint2/tournament-battle-atomic.fixture.js";
import { buildUi009SingleEliminationKnockoutMapping } from "./competition-knockout-seed-mapping.js";
import { buildUi009StructuralPolicy } from "./competition-structural-policy.js";
import { selectUi009TournamentFormat } from "./competition-format-selection.js";
import { createDefaultSprint2ConfigInput } from "@shared-world/simulation-core";

const provider = tournamentBattleFixtureProvider;

describe("UI009 knockout seed mapping", () => {
  it("builds accepted structural bracket for five-person single elimination", () => {
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
    const format = selectUi009TournamentFormat(5, "normal", config.format);
    expect(format?.acceptedFormat).toBe("single_elimination");
    const policy = buildUi009StructuralPolicy(format!, personIds, config);
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
    expect(built.value.definition.formatKind).toBe("knockout");
    expect(built.value.definition.knockoutSlots.length).toBeGreaterThan(0);
    expect(buildUi009SingleEliminationKnockoutMapping(personIds).slots.length).toBeGreaterThan(0);
  });

  it("round-robin policy still builds for four participants", () => {
    const personIds = ["p0", "p1", "p2", "p3"].map((id) => asPersonId(id));
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
    const format = selectUi009TournamentFormat(4, "normal", config.format);
    const policy = buildUi009StructuralPolicy(format!, personIds, config);
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
    expect(built.value.definition.formatKind).toBe("round_robin");
    expect(tournamentBattleBasePolicy).toBeDefined();
  });
});
