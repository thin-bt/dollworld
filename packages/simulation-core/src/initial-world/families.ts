import type { InitialWorldConfig } from "../config/types.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { RNG_LABELS } from "./constants.js";
import type { FamilyDraft, InitialWorldDraftState, PersonDraft } from "./draft.js";
import { livingDrafts, sortPersonIds } from "./draft.js";
import { InitialWorldGenerationError } from "./errors.js";
import { formatFamilyId } from "./ids.js";

function pickBaseBirthRate(rng: SeededRng, min: number, max: number): number {
  if (min === max) {
    return min;
  }
  const v = rng.nextFloat();
  const rate = min + (max - min) * v;
  if (rate < min) {
    return min;
  }
  if (rate > max) {
    return max;
  }
  return rate;
}

export function generateFamilies(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
  shuffledFamilyNames: readonly string[],
): void {
  const { families: familiesConfig } = config;
  const familyCount = familiesConfig.initialFamilyCount;

  if (shuffledFamilyNames.length < familyCount) {
    throw new InitialWorldGenerationError("insufficient family name candidates", {
      required: familyCount,
      available: shuffledFamilyNames.length,
    });
  }

  const familiesRng = rngFactory(deriveSeed(seed, RNG_LABELS.families));

  const families: FamilyDraft[] = [];
  for (let i = 1; i <= familyCount; i += 1) {
    const familyName = shuffledFamilyNames[i - 1];
    if (familyName === undefined) {
      throw new InitialWorldGenerationError("insufficient family name candidates", {
        required: familyCount,
        available: shuffledFamilyNames.length,
      });
    }
    families.push({
      familyId: formatFamilyId(i),
      familyName,
      status: "active",
      baseBirthRate: pickBaseBirthRate(
        familiesRng,
        familiesConfig.baseBirthRateRange.min,
        familiesConfig.baseBirthRateRange.max,
      ),
      initialHistory: true,
      memberIds: [],
      livingMemberIds: [],
    });
  }

  assignFamilyMembership(state, families, config, familiesRng);
  state.families = families;

  for (const person of state.persons) {
    const family = families.find((f) => f.familyId === person.familyId);
    if (family === undefined) {
      throw new InitialWorldGenerationError("person assigned to unknown family", {
        personId: person.personId,
        familyId: person.familyId,
      });
    }
    family.memberIds.push(person.personId);
    if (person.lifeStatus === "living") {
      family.livingMemberIds.push(person.personId);
    }
  }
}

function assignFamilyMembership(
  state: InitialWorldDraftState,
  families: FamilyDraft[],
  config: InitialWorldConfig,
  familiesRng: SeededRng,
): void {
  const { minimumMembersPerFamily, maximumMembersPerFamily } = config.families;
  const living = livingDrafts(state);
  const deceased = state.persons.filter((p) => p.lifeStatus === "deceased");
  const shuffledLivingIds = familiesRng.shuffle(living.map((p) => p.personId));

  const memberCounts = new Map(families.map((f) => [f.familyId, 0]));

  for (let i = 0; i < families.length; i += 1) {
    const personId = shuffledLivingIds[i];
    const family = families[i];
    if (personId === undefined || family === undefined) {
      throw new InitialWorldGenerationError(
        "insufficient living persons for one-per-family assignment",
        {
          familyIndex: i,
          livingCount: shuffledLivingIds.length,
          familyCount: families.length,
        },
      );
    }
    assignPersonToFamily(state, personId, family.familyId);
    memberCounts.set(family.familyId, 1);
  }

  const remainingLiving = shuffledLivingIds.slice(families.length);
  const queue = [...remainingLiving, ...sortPersonIds(deceased.map((p) => p.personId))];

  for (const personId of queue) {
    const underMin = families
      .filter((f) => (memberCounts.get(f.familyId) ?? 0) < minimumMembersPerFamily)
      .map((f) => f.familyId);
    const candidates = (
      underMin.length > 0
        ? underMin
        : families
            .filter((f) => (memberCounts.get(f.familyId) ?? 0) < maximumMembersPerFamily)
            .map((f) => f.familyId)
    ).sort((a, b) => a.localeCompare(b));

    if (candidates.length === 0) {
      throw new InitialWorldGenerationError("no family has capacity for remaining person", {
        personId,
        maximumMembersPerFamily,
      });
    }

    const chosen = familiesRng.choose(candidates);
    assignPersonToFamily(state, personId, chosen);
    memberCounts.set(chosen, (memberCounts.get(chosen) ?? 0) + 1);
  }

  for (const family of families) {
    const count = memberCounts.get(family.familyId) ?? 0;
    if (count < minimumMembersPerFamily) {
      throw new InitialWorldGenerationError("family below minimum member count", {
        familyId: family.familyId,
        count,
        minimumMembersPerFamily,
      });
    }
  }

  for (const family of families) {
    const livingCount = state.persons.filter(
      (p) => p.familyId === family.familyId && p.lifeStatus === "living",
    ).length;
    if (livingCount < 1) {
      throw new InitialWorldGenerationError("family has no living members", {
        familyId: family.familyId,
      });
    }
  }
}

function assignPersonToFamily(
  state: InitialWorldDraftState,
  personId: PersonDraft["personId"],
  familyId: PersonDraft["familyId"],
): void {
  const person = state.persons.find((p) => p.personId === personId);
  if (person === undefined) {
    throw new Error(`person not found: ${personId}`);
  }
  person.familyId = familyId;
}
