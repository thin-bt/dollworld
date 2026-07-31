import type { InitialWorldConfig } from "../config/types.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { MINIMUM_RANK } from "../enums.js";
import type { CareerStatus } from "../enums.js";
import { RNG_LABELS } from "./constants.js";
import type { PersonDraft } from "./draft.js";
import { InitialWorldGenerationError } from "./errors.js";
import { formatFamilyId, formatPersonId } from "./ids.js";
import { createEmptyAbilities, createEmptyAptitudes } from "./abilities.js";

const CURRENT_WORLD_YEAR = 1;

function careerStatusForAge(age: number): CareerStatus {
  if (age <= 7) {
    return "child";
  }
  if (age <= 15) {
    return "trainee";
  }
  if (age <= 41) {
    return "active_competitor";
  }
  return "retired";
}

function createDeceasedDraft(
  personIndex: number,
  sex: PersonDraft["sex"],
  ageAtDeath: number,
  deathYear: number,
  nameDataVersion: string,
): PersonDraft {
  const birthYear = deathYear - ageAtDeath;
  return {
    personId: formatPersonId(personIndex),
    sex,
    birthYear,
    familyId: formatFamilyId(1),
    lifeStatus: "deceased",
    givenName: "",
    familyName: "",
    displayName: "",
    nameDataVersion,
    abilities: createEmptyAbilities(),
    aptitudes: createEmptyAptitudes(),
    careerStatus: "retired",
    highestRank: MINIMUM_RANK,
    retirementRank: MINIMUM_RANK,
    qualifiedMaster: false,
    deathYear,
    ageAtDeath,
  };
}

function createLivingDraft(
  personIndex: number,
  sex: PersonDraft["sex"],
  age: number,
  nameDataVersion: string,
): PersonDraft {
  const birthYear = CURRENT_WORLD_YEAR - age;
  const careerStatus = careerStatusForAge(age);
  const draft: PersonDraft = {
    personId: formatPersonId(personIndex),
    sex,
    birthYear,
    familyId: formatFamilyId(1),
    lifeStatus: "living",
    givenName: "",
    familyName: "",
    displayName: "",
    nameDataVersion,
    abilities: createEmptyAbilities(),
    aptitudes: createEmptyAptitudes(),
    participationStatus: "active",
    currentAge: age,
    careerStatus,
    qualifiedMaster: false,
  };

  if (careerStatus === "retired") {
    draft.highestRank = MINIMUM_RANK;
    draft.retirementRank = MINIMUM_RANK;
  }

  return draft;
}

function buildSexAssignment(
  count: number,
  maleCount: number,
  rng: SeededRng,
): PersonDraft["sex"][] {
  const sexes: PersonDraft["sex"][] = [];
  for (let i = 0; i < maleCount; i += 1) {
    sexes.push("male");
  }
  for (let i = maleCount; i < count; i += 1) {
    sexes.push("female");
  }
  return rng.shuffle(sexes);
}

function livingBandLabel(minAge: number, maxAge: number): string {
  if (minAge === 0 && maxAge === 7) {
    return RNG_LABELS.livingAge07;
  }
  if (minAge === 8 && maxAge === 15) {
    return RNG_LABELS.livingAge815;
  }
  if (minAge === 16 && maxAge === 41) {
    return RNG_LABELS.livingAge1641;
  }
  if (minAge === 42 && maxAge === 70) {
    return RNG_LABELS.livingAge4270;
  }
  return `initial-world/persons/living/age-${String(minAge)}-${String(maxAge)}`;
}

export function generatePersonDrafts(
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
  nameDataVersion: string,
): PersonDraft[] {
  const { history, population } = config;
  const deceasedCount = history.initialDeceasedAncestors;
  const deceasedRng = rngFactory(deriveSeed(seed, RNG_LABELS.deceased));

  const maleDeceased = Math.floor(deceasedCount * population.sexRatioMale);
  const deceasedSexes = buildSexAssignment(deceasedCount, maleDeceased, deceasedRng);

  const persons: PersonDraft[] = [];
  let personIndex = 1;

  for (let i = 0; i < deceasedCount; i += 1) {
    const ageAtDeath = deceasedRng.nextInt(
      history.minimumAgeAtDeath,
      history.maximumAgeAtDeath + 1,
    );
    const minDeathYear = history.earliestHistoricalYear + ageAtDeath;
    if (minDeathYear > 0) {
      throw new InitialWorldGenerationError(
        "deceased ancestor deathYear range is empty for generated ageAtDeath",
        {
          ageAtDeath,
          earliestHistoricalYear: history.earliestHistoricalYear,
          minimumAgeAtDeath: history.minimumAgeAtDeath,
          maximumAgeAtDeath: history.maximumAgeAtDeath,
        },
      );
    }
    const deathYear = deceasedRng.nextInt(minDeathYear, 1);
    persons.push(
      createDeceasedDraft(personIndex, deceasedSexes[i]!, ageAtDeath, deathYear, nameDataVersion),
    );
    personIndex += 1;
  }

  for (const band of population.ageBands) {
    const bandRng = rngFactory(deriveSeed(seed, livingBandLabel(band.minAge, band.maxAge)));
    const maleCount = Math.floor(band.count * population.sexRatioMale);
    const sexes = buildSexAssignment(band.count, maleCount, bandRng);

    for (let i = 0; i < band.count; i += 1) {
      const age = bandRng.nextInt(band.minAge, band.maxAge + 1);
      persons.push(createLivingDraft(personIndex, sexes[i]!, age, nameDataVersion));
      personIndex += 1;
    }
  }

  const expectedLiving = population.totalLiving;
  const actualLiving = persons.filter((p) => p.lifeStatus === "living").length;
  if (actualLiving !== expectedLiving) {
    throw new InitialWorldGenerationError("living person count mismatch after generation", {
      expectedLiving,
      actualLiving,
    });
  }

  if (persons.length !== deceasedCount + expectedLiving) {
    throw new InitialWorldGenerationError("total person count mismatch after generation", {
      expected: deceasedCount + expectedLiving,
      actual: persons.length,
    });
  }

  return persons;
}
