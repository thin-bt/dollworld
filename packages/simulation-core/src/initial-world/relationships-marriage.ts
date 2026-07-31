import type { InitialWorldConfig } from "../config/types.js";
import type { PersonId } from "../ids.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { RNG_LABELS } from "./constants.js";
import type { InitialWorldDraftState, MarriageRelationshipDraft } from "./draft.js";
import { livingDrafts } from "./draft.js";
import { buildParentMaps, isMarriageProhibited } from "./kinship.js";
import { roundDownToEven } from "./relationships-parents.js";

export function generateMarriageRelationships(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  if (!config.history.createExistingRelationships) {
    state.marriageRelationships = [];
    return;
  }

  const marriageRng = rngFactory(deriveSeed(seed, RNG_LABELS.relationshipsMarriage));
  const retiredLiving = livingDrafts(state).filter((p) => p.careerStatus === "retired");
  const peopleTarget = roundDownToEven(
    Math.floor(retiredLiving.length * config.relationships.retiredSpouseCoverage),
  );
  const pairTarget = peopleTarget / 2;

  const parentMaps = buildParentMaps(state.parentRelationships);
  const retiredIds = retiredLiving.map((p) => p.personId).sort((a, b) => a.localeCompare(b));

  const candidatePairs: MarriageRelationshipDraft[] = [];
  for (let i = 0; i < retiredIds.length; i += 1) {
    for (let j = i + 1; j < retiredIds.length; j += 1) {
      const personAId = retiredIds[i]!;
      const personBId = retiredIds[j]!;
      if (!isMarriageProhibited(personAId, personBId, state.parentRelationships, parentMaps)) {
        candidatePairs.push({ personAId, personBId });
      }
    }
  }

  const shuffledPairs = marriageRng.shuffle(candidatePairs);
  const used = new Set<PersonId>();
  const marriages: MarriageRelationshipDraft[] = [];

  for (const pair of shuffledPairs) {
    if (marriages.length >= pairTarget) {
      break;
    }
    if (used.has(pair.personAId) || used.has(pair.personBId)) {
      continue;
    }
    marriages.push(pair);
    used.add(pair.personAId);
    used.add(pair.personBId);
  }

  if (marriages.length < pairTarget) {
    state.warnings.push(
      `marriage pairs below target: ${String(marriages.length)}/${String(pairTarget)}`,
    );
  }

  state.marriageRelationships = marriages;
}
