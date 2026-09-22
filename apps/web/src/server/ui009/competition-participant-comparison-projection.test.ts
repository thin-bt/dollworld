import {
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type Person,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { describe, expect, it } from "vitest";
import { enrichParticipantLinks } from "./competition-wireframe-observation.js";
import type { CompetitionParticipantLinkView } from "./types.js";

function surface(value: number) {
  return { surfaceValue: value };
}

function minimalPerson(
  personId: string,
  displayName: string,
  birthYear: number,
  statBase = 11,
  aptitudeBase = 21,
): Person {
  return {
    personId,
    displayName,
    familyId: "fam_test",
    lifeStatus: "living",
    careerStatus: "active_competitor",
    birthYear,
    currentAge: 20,
    participationStatus: "active",
    sex: "male",
    abilities: {
      stamina: surface(statBase),
      strength: surface(statBase + 1),
      skill: surface(statBase + 2),
      speed: surface(statBase + 3),
      spirit: surface(statBase + 4),
      magic: surface(statBase + 5),
    },
    aptitudes: {
      unarmed: surface(aptitudeBase),
      sword: surface(aptitudeBase + 1),
      magic: surface(aptitudeBase + 2),
    },
    currentRank: "F",
    highestRank: "F",
  } as unknown as Person;
}

function sessionWithPersons(persons: Person[], worldYear = 21): Sprint1RunSession {
  const worldDate = createWorldDate(
    { year: worldYear, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  return {
    runtimeState: {
      worldState: {
        worldDate,
        persons,
      },
    },
  } as unknown as Sprint1RunSession;
}

describe("competition participant comparison projection (WF-5)", () => {
  it("maps all six stats and three aptitudes to the matching participant", () => {
    const alpha = minimalPerson("person_alpha", "Alpha", worldYearBirth(21, 20));
    const beta = minimalPerson("person_beta", "Beta", worldYearBirth(21, 22), 1, 7);

    const links: CompetitionParticipantLinkView[] = [
      { personId: alpha.personId, displayName: alpha.displayName },
      { personId: beta.personId, displayName: beta.displayName },
    ];
    const enriched = enrichParticipantLinks(sessionWithPersons([alpha, beta]), links);

    expect(enriched).toHaveLength(2);

    const alphaRow = enriched.find((row) => row.personId === "person_alpha");
    const betaRow = enriched.find((row) => row.personId === "person_beta");
    expect(alphaRow).toBeDefined();
    expect(betaRow).toBeDefined();

    expect(alphaRow?.stats).toEqual({
      stamina: 11,
      strength: 12,
      skill: 13,
      speed: 14,
      spirit: 15,
      magic: 16,
    });
    expect(betaRow?.stats).toEqual({
      stamina: 1,
      strength: 2,
      skill: 3,
      speed: 4,
      spirit: 5,
      magic: 6,
    });
    expect(alphaRow?.aptitudes).toEqual({ unarmed: 21, sword: 22, magic: 23 });
    expect(betaRow?.aptitudes).toEqual({ unarmed: 7, sword: 8, magic: 9 });

    expect(alphaRow?.stats?.stamina).not.toBe(betaRow?.stats?.stamina);
    expect(alphaRow?.aptitudes?.unarmed).not.toBe(betaRow?.aptitudes?.unarmed);
  });

  it("preserves rank, age, official record, and person-detail identity fields", () => {
    const person = minimalPerson("person_keep", "Keeper", worldYearBirth(21, 18));
    const links: CompetitionParticipantLinkView[] = [
      { personId: person.personId, displayName: person.displayName },
    ];
    const enriched = enrichParticipantLinks(sessionWithPersons([person]), links, {
      person_keep: {
        officialWins: 3,
        officialLosses: 1,
        currentRank: "E",
      },
    });

    expect(enriched[0]?.personId).toBe("person_keep");
    expect(enriched[0]?.displayName).toBe("Keeper");
    expect(enriched[0]?.currentRankLabel).toBeTruthy();
    expect(enriched[0]?.ageLabel).toBe("18歳");
    expect(enriched[0]?.officialRecordLabel).toBe("3勝1敗");
    expect(enriched[0]?.stats?.magic).toBe(16);
    expect(enriched[0]?.aptitudes?.sword).toBe(22);
  });
});

function worldYearBirth(worldYear: number, age: number): number {
  return worldYear - age;
}
