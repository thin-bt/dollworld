import type { InitialWorldConfig } from "../config/types.js";
import type { ValidatedNameData } from "../names/types.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { RNG_LABELS } from "./constants.js";
import type { InitialWorldDraftState } from "./draft.js";
import { InitialWorldGenerationError } from "./errors.js";

export function shuffleFamilyNameCandidates(
  nameData: ValidatedNameData,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): string[] {
  const rng = rngFactory(deriveSeed(seed, RNG_LABELS.namesFamily));
  return rng.shuffle([...nameData.familyNames.names]);
}

function buildDisplayName(format: string, givenName: string, familyName: string): string {
  return format.replace("{givenName}", givenName).replace("{familyName}", familyName);
}

function sexGivenNamePool(nameData: ValidatedNameData, sex: "male" | "female"): readonly string[] {
  return sex === "male" ? nameData.maleGivenNames.names : nameData.femaleGivenNames.names;
}

function pickGivenName(
  personRng: SeededRng,
  nameData: ValidatedNameData,
  config: InitialWorldConfig,
  sex: "male" | "female",
  familyName: string,
  usedLivingDisplayNames: Set<string>,
  avoidDuplicate: boolean,
): string {
  const useNeutral = personRng.chance(config.nameData.neutralGivenNameProbability);
  const pool = useNeutral ? nameData.neutralGivenNames.names : sexGivenNamePool(nameData, sex);

  if (pool.length === 0) {
    throw new InitialWorldGenerationError("no usable given name candidate", {
      sex,
      familyName,
      avoidDuplicate: String(avoidDuplicate),
      pool: useNeutral ? "neutral" : sex,
    });
  }

  const startIndex = personRng.nextInt(0, pool.length);
  for (let offset = 0; offset < pool.length; offset += 1) {
    const givenName = pool[(startIndex + offset) % pool.length]!;
    const displayName = buildDisplayName(config.nameData.displayFormat, givenName, familyName);
    if (avoidDuplicate && usedLivingDisplayNames.has(displayName)) {
      continue;
    }
    return givenName;
  }

  throw new InitialWorldGenerationError("no usable given name candidate", {
    sex,
    familyName,
    avoidDuplicate: String(avoidDuplicate),
    pool: useNeutral ? "neutral" : sex,
  });
}

export function assignPersonNames(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  nameData: ValidatedNameData,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  const personRng = rngFactory(deriveSeed(seed, RNG_LABELS.namesPerson));
  const avoidDuplicate = config.nameData.avoidDuplicateLivingFullNameWithinFamily;
  const nameDataVersion = nameData.manifest.nameDataVersion;
  const familyNameById = new Map(state.families.map((f) => [f.familyId, f.familyName]));

  const livingByFamily = new Map<string, Set<string>>();
  for (const family of state.families) {
    livingByFamily.set(family.familyId, new Set());
  }

  const sortedPersons = [...state.persons].sort((a, b) => a.personId.localeCompare(b.personId));

  for (const person of sortedPersons) {
    const familyName = familyNameById.get(person.familyId);
    if (familyName === undefined) {
      throw new InitialWorldGenerationError("family name missing for person", {
        personId: person.personId,
        familyId: person.familyId,
      });
    }

    const usedDisplayNames = livingByFamily.get(person.familyId) ?? new Set<string>();
    const givenName = pickGivenName(
      personRng,
      nameData,
      config,
      person.sex,
      familyName,
      usedDisplayNames,
      avoidDuplicate && person.lifeStatus === "living",
    );
    const displayName = buildDisplayName(config.nameData.displayFormat, givenName, familyName);

    person.givenName = givenName;
    person.familyName = familyName;
    person.displayName = displayName;
    person.nameDataVersion = nameDataVersion;

    if (person.lifeStatus === "living") {
      usedDisplayNames.add(displayName);
      livingByFamily.set(person.familyId, usedDisplayNames);
    }
  }
}
