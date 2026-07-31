import type { InitialWorldConfig } from "../config/types.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { FOCUS_KEYS, LINEAGE_NAME_SUFFIX, RNG_LABELS } from "./constants.js";
import { expandAllocationToList, allocateByLargestRemainderOrdered } from "./largest-remainder.js";
import type { InitialWorldDraftState, LineageDraft, PersonDraft } from "./draft.js";
import { InitialWorldGenerationError } from "./errors.js";
import { formatLineageId } from "./ids.js";

function isFounderCandidate(person: PersonDraft): boolean {
  return person.lifeStatus === "deceased" || person.careerStatus === "retired";
}

export function generateLineages(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  const lineageCount = config.lineages.initialLineageCount;
  const lineagesRng = rngFactory(deriveSeed(seed, RNG_LABELS.lineages));

  const eligibleFamilies = state.families
    .filter((family) => {
      const members = state.persons.filter((p) => p.familyId === family.familyId);
      return members.some(isFounderCandidate);
    })
    .map((f) => f.familyId)
    .sort((a, b) => a.localeCompare(b));

  if (eligibleFamilies.length < lineageCount) {
    throw new InitialWorldGenerationError("insufficient founder families for lineages", {
      required: lineageCount,
      eligible: eligibleFamilies.length,
    });
  }

  const founderFamilies = lineagesRng.shuffle(eligibleFamilies).slice(0, lineageCount);

  const focusAllocation = allocateByLargestRemainderOrdered(
    config.lineages.techniqueFocusWeights,
    lineageCount,
    FOCUS_KEYS,
  );
  const focusList = lineagesRng.shuffle(expandAllocationToList(focusAllocation, FOCUS_KEYS));

  const lineages: LineageDraft[] = [];
  for (let i = 0; i < lineageCount; i += 1) {
    const lineageId = formatLineageId(i + 1);
    const founderFamilyId = founderFamilies[i]!;
    const family = state.families.find((f) => f.familyId === founderFamilyId);
    if (family === undefined) {
      throw new InitialWorldGenerationError("founder family not found", { founderFamilyId });
    }

    const founderCandidates = state.persons
      .filter((p) => p.familyId === founderFamilyId && isFounderCandidate(p))
      .map((p) => p.personId)
      .sort((a, b) => a.localeCompare(b));

    if (founderCandidates.length === 0) {
      throw new InitialWorldGenerationError("founder candidate missing in selected family", {
        founderFamilyId,
      });
    }
    const founderPersonId = lineagesRng.choose(founderCandidates);

    const focus = focusList[i]!;
    const lineageName = `${family.familyName}${LINEAGE_NAME_SUFFIX[focus]}`;

    lineages.push({
      lineageId,
      lineageName,
      focus,
      founderPersonId,
      founderFamilyId,
      status: "active",
    });
  }

  state.lineages = lineages;
}
