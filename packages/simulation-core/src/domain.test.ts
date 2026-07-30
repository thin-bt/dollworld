import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  asFamilyId,
  asPersonId,
  type AbilityScores,
  type AptitudeScores,
  type DeceasedActiveCompetitorPerson,
  type DeceasedChildPerson,
  type DeceasedPerson,
  type DeceasedRetiredPerson,
  type FamilyId,
  type LivingActiveCompetitorPerson,
  type LivingChildPerson,
  type LivingRetiredPerson,
  type LivingTraineePerson,
  type PersonId,
} from "./index.js";

const emptyTriple = {
  surfaceValue: 10,
  expressedGeneticValue: 10,
  latentGeneticValue: 10,
};

const abilities: AbilityScores = {
  stamina: emptyTriple,
  strength: emptyTriple,
  skill: emptyTriple,
  speed: emptyTriple,
  spirit: emptyTriple,
  magic: emptyTriple,
};

const aptitudes: AptitudeScores = {
  unarmed: emptyTriple,
  sword: emptyTriple,
  magic: emptyTriple,
};

const livingChildFields = {
  personId: asPersonId("person_000001"),
  givenName: "Arden",
  familyName: "Ashford",
  displayName: "Arden・Ashford",
  nameDataVersion: "NAMES-0.1.2",
  sex: "male" as const,
  lifeStatus: "living" as const,
  participationStatus: "active" as const,
  careerStatus: "child" as const,
  birthYear: 1,
  currentAge: 0,
  familyId: asFamilyId("family_000001"),
  qualifiedMaster: false as const,
  abilities,
  aptitudes,
};

const deceasedRetiredFields = {
  personId: asPersonId("person_000002"),
  givenName: "Bryn",
  familyName: "Ashford",
  displayName: "Bryn・Ashford",
  nameDataVersion: "NAMES-0.1.2",
  sex: "female" as const,
  lifeStatus: "deceased" as const,
  careerStatus: "retired" as const,
  birthYear: -40,
  deathYear: -5,
  ageAtDeath: 35,
  familyId: asFamilyId("family_000001"),
  qualifiedMaster: false as const,
  highestRank: "C" as const,
  retirementRank: "C" as const,
  abilities,
  aptitudes,
};

describe("domain person unions", () => {
  it("builds a living person without death fields", () => {
    const living: LivingChildPerson = { ...livingChildFields };

    expect(living.lifeStatus).toBe("living");
    expect(living.currentAge).toBe(0);
    expect("deathYear" in living).toBe(false);
    expect("ageAtDeath" in living).toBe(false);
  });

  it("builds a deceased retired person without participationStatus or currentAge", () => {
    const deceased: DeceasedRetiredPerson = { ...deceasedRetiredFields };

    expect(deceased.lifeStatus).toBe("deceased");
    expect(deceased.careerStatus).toBe("retired");
    expect(deceased.highestRank).toBe("C");
    expect(deceased.retirementRank).toBe("C");
    expect(deceased.ageAtDeath).toBe(35);
    expect("participationStatus" in deceased).toBe(false);
    expect("currentAge" in deceased).toBe(false);
  });

  it("gives currentRank only to active competitors and retirementRank to retirees", () => {
    const active: LivingActiveCompetitorPerson = {
      personId: asPersonId("person_000003"),
      givenName: "Cade",
      familyName: "Ashford",
      displayName: "Cade・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male",
      lifeStatus: "living",
      participationStatus: "active",
      careerStatus: "active_competitor",
      birthYear: -20,
      currentAge: 21,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      currentRank: "D",
      highestRank: "D",
      abilities,
      aptitudes,
    };

    const retired: LivingRetiredPerson = {
      personId: asPersonId("person_000004"),
      givenName: "Dara",
      familyName: "Ashford",
      displayName: "Dara・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "living",
      participationStatus: "active",
      careerStatus: "retired",
      birthYear: -50,
      currentAge: 51,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: true,
      retirementRank: "B",
      highestRank: "B",
      abilities,
      aptitudes,
    };

    expect(active.currentRank).toBe("D");
    expect("retirementRank" in active).toBe(false);
    expect(retired.retirementRank).toBe("B");
    expect("currentRank" in retired).toBe(false);
  });
});

describe("domain type compile-time guards", () => {
  it("rejects forbidden properties on direct object literals", () => {
    const assertLivingChild = (person: LivingChildPerson): void => {
      void person;
    };
    const assertDeceasedRetired = (person: DeceasedRetiredPerson): void => {
      void person;
    };
    const assertRetired = (person: LivingRetiredPerson): void => {
      void person;
    };

    assertLivingChild({
      ...livingChildFields,
      // @ts-expect-error living persons must not declare deathYear
      deathYear: -1,
    });

    assertDeceasedRetired({
      ...deceasedRetiredFields,
      // @ts-expect-error deceased persons must not declare participationStatus
      participationStatus: "active",
    });

    assertRetired({
      personId: asPersonId("person_000012"),
      givenName: "Gwen",
      familyName: "Ashford",
      displayName: "Gwen・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "living",
      participationStatus: "active",
      careerStatus: "retired",
      birthYear: -50,
      currentAge: 51,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: true,
      // @ts-expect-error retired living persons must not declare currentRank
      currentRank: "A",
      retirementRank: "A",
      highestRank: "A",
      abilities,
      aptitudes,
    });
  });

  it("rejects forbidden properties even when passed through a variable", () => {
    const livingWithDeathYear = {
      ...livingChildFields,
      deathYear: -1,
    };
    // @ts-expect-error deathYear?: never blocks variable assignment onto living persons
    const _living: LivingChildPerson = livingWithDeathYear;
    void _living;

    const deceasedWithCurrentAge = {
      ...deceasedRetiredFields,
      currentAge: 35,
    };
    // @ts-expect-error currentAge?: never blocks variable assignment onto deceased persons
    const _deceased: DeceasedRetiredPerson = deceasedWithCurrentAge;
    void _deceased;

    const childWithRank = {
      ...livingChildFields,
      currentRank: "F" as const,
    };
    // @ts-expect-error child must not carry currentRank
    const _childRank: LivingChildPerson = childWithRank;
    void _childRank;
  });

  it("rejects qualifiedMaster true for child, trainee, and active competitor", () => {
    const childMaster = {
      ...livingChildFields,
      qualifiedMaster: true as const,
    };
    // @ts-expect-error child qualifiedMaster must be false
    const _child: LivingChildPerson = childMaster;
    void _child;

    const traineeMaster = {
      ...livingChildFields,
      careerStatus: "trainee" as const,
      currentAge: 10,
      birthYear: -9,
      qualifiedMaster: true as const,
    };
    // @ts-expect-error trainee qualifiedMaster must be false
    const _trainee: LivingTraineePerson = traineeMaster;
    void _trainee;

    const activeMaster = {
      personId: asPersonId("person_000014"),
      givenName: "Ivy",
      familyName: "Ashford",
      displayName: "Ivy・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female" as const,
      lifeStatus: "living" as const,
      participationStatus: "active" as const,
      careerStatus: "active_competitor" as const,
      birthYear: -20,
      currentAge: 21,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: true as const,
      currentRank: "C" as const,
      highestRank: "C" as const,
      abilities,
      aptitudes,
    };
    // @ts-expect-error active competitor qualifiedMaster must be false
    const _active: LivingActiveCompetitorPerson = activeMaster;
    void _active;
  });

  it("enforces deceased careerStatus unions for ranks and qualifiedMaster", () => {
    const retired: DeceasedRetiredPerson = { ...deceasedRetiredFields };
    expect(retired.highestRank).toBe("C");
    expect(retired.retirementRank).toBe("C");

    const retiredMissingRanks = {
      personId: asPersonId("person_000019"),
      givenName: "Iris",
      familyName: "Ashford",
      displayName: "Iris・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female" as const,
      lifeStatus: "deceased" as const,
      careerStatus: "retired" as const,
      birthYear: -40,
      deathYear: -5,
      ageAtDeath: 35,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false as const,
      abilities,
      aptitudes,
    };
    // @ts-expect-error deceased retired requires highestRank and retirementRank
    const _retiredMissing: DeceasedRetiredPerson = retiredMissingRanks;
    void _retiredMissing;

    const activeMissingHighest = {
      personId: asPersonId("person_000018"),
      givenName: "Hera",
      familyName: "Ashford",
      displayName: "Hera・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female" as const,
      lifeStatus: "deceased" as const,
      careerStatus: "active_competitor" as const,
      birthYear: -25,
      deathYear: -5,
      ageAtDeath: 20,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false as const,
      abilities,
      aptitudes,
    };
    // @ts-expect-error deceased active competitor requires highestRank
    const _activeMissing: DeceasedActiveCompetitorPerson = activeMissingHighest;
    void _activeMissing;

    const assertDeceasedChild = (person: DeceasedChildPerson): void => {
      void person;
    };
    const assertDeceasedActive = (person: DeceasedActiveCompetitorPerson): void => {
      void person;
    };

    assertDeceasedChild({
      personId: asPersonId("person_000020"),
      givenName: "Jules",
      familyName: "Ashford",
      displayName: "Jules・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male",
      lifeStatus: "deceased",
      careerStatus: "child",
      birthYear: -5,
      deathYear: -1,
      ageAtDeath: 4,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      abilities,
      aptitudes,
      // @ts-expect-error deceased child must not declare highestRank
      highestRank: "F",
    });

    assertDeceasedChild({
      personId: asPersonId("person_000021"),
      givenName: "Kara",
      familyName: "Ashford",
      displayName: "Kara・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "deceased",
      careerStatus: "child",
      birthYear: -5,
      deathYear: -1,
      ageAtDeath: 4,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      abilities,
      aptitudes,
      // @ts-expect-error deceased child must not declare retirementRank
      retirementRank: "F",
    });

    assertDeceasedChild({
      personId: asPersonId("person_000022"),
      givenName: "Liam",
      familyName: "Ashford",
      displayName: "Liam・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male",
      lifeStatus: "deceased",
      careerStatus: "child",
      birthYear: -5,
      deathYear: -1,
      ageAtDeath: 4,
      familyId: asFamilyId("family_000001"),
      // @ts-expect-error deceased child qualifiedMaster must be false
      qualifiedMaster: true,
      abilities,
      aptitudes,
    });

    assertDeceasedActive({
      personId: asPersonId("person_000023"),
      givenName: "Mira",
      familyName: "Ashford",
      displayName: "Mira・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "deceased",
      careerStatus: "active_competitor",
      birthYear: -25,
      deathYear: -5,
      ageAtDeath: 20,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      highestRank: "D",
      abilities,
      aptitudes,
      // @ts-expect-error deceased active competitor must not declare retirementRank
      retirementRank: "D",
    });

    const deceasedChildWithHighestRank = {
      personId: asPersonId("person_000024"),
      givenName: "Noel",
      familyName: "Ashford",
      displayName: "Noel・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male" as const,
      lifeStatus: "deceased" as const,
      careerStatus: "child" as const,
      birthYear: -5,
      deathYear: -1,
      ageAtDeath: 4,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false as const,
      highestRank: "F" as const,
      abilities,
      aptitudes,
    };
    // @ts-expect-error variable assignment cannot add highestRank to deceased child
    const _deceasedChildRank: DeceasedChildPerson = deceasedChildWithHighestRank;
    void _deceasedChildRank;

    const deceasedChildMaster = {
      personId: asPersonId("person_000025"),
      givenName: "Owen",
      familyName: "Ashford",
      displayName: "Owen・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male" as const,
      lifeStatus: "deceased" as const,
      careerStatus: "child" as const,
      birthYear: -5,
      deathYear: -1,
      ageAtDeath: 4,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: true as const,
      abilities,
      aptitudes,
    };
    // @ts-expect-error variable assignment cannot set qualifiedMaster true on deceased child
    const _deceasedChildMaster: DeceasedChildPerson = deceasedChildMaster;
    void _deceasedChildMaster;

    const deceasedActiveWithRetirement = {
      personId: asPersonId("person_000026"),
      givenName: "Pia",
      familyName: "Ashford",
      displayName: "Pia・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female" as const,
      lifeStatus: "deceased" as const,
      careerStatus: "active_competitor" as const,
      birthYear: -25,
      deathYear: -5,
      ageAtDeath: 20,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false as const,
      highestRank: "D" as const,
      retirementRank: "D" as const,
      abilities,
      aptitudes,
    };
    // @ts-expect-error variable assignment cannot add retirementRank to deceased active competitor
    const _deceasedActive: DeceasedActiveCompetitorPerson = deceasedActiveWithRetirement;
    void _deceasedActive;

    // highestRank is required for deceased active competitors
    assertDeceasedActive({
      personId: asPersonId("person_000027"),
      givenName: "Quinn",
      familyName: "Ashford",
      displayName: "Quinn・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male",
      lifeStatus: "deceased",
      careerStatus: "active_competitor",
      birthYear: -25,
      deathYear: -5,
      ageAtDeath: 20,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      highestRank: "E",
      abilities,
      aptitudes,
    });

    // DeceasedPerson union still accepts the retired variant
    const asUnion: DeceasedPerson = retired;
    expect(asUnion.careerStatus).toBe("retired");
  });

  it("keeps PersonId distinct from FamilyId", () => {
    const personId: PersonId = asPersonId("person_000001");
    const acceptFamilyId = (id: FamilyId): FamilyId => id;
    // @ts-expect-error PersonId must not be accepted where FamilyId is required
    acceptFamilyId(personId);
  });

  it("keeps ability and aptitude key sets fixed and distinct", () => {
    expect(ABILITY_KEYS).toEqual(["stamina", "strength", "skill", "speed", "spirit", "magic"]);
    expect(APTITUDE_KEYS).toEqual(["unarmed", "sword", "magic"]);

    type AbilityHasUnarmed = "unarmed" extends keyof AbilityScores ? true : false;
    type AptitudeHasStamina = "stamina" extends keyof AptitudeScores ? true : false;
    const abilityHasUnarmed: AbilityHasUnarmed = false;
    const aptitudeHasStamina: AptitudeHasStamina = false;
    expect(abilityHasUnarmed).toBe(false);
    expect(aptitudeHasStamina).toBe(false);
  });
});
