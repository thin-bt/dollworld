import type { InitialWorldConfig } from "../config/types.js";
import type { PersonId } from "../ids.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { RANK_ORDER } from "../enums.js";
import { allocateByLargestRemainder } from "../config/validate-config.js";
import { RNG_LABELS } from "./constants.js";
import type { InitialWorldDraftState } from "./draft.js";
import { livingDrafts } from "./draft.js";
import { InitialWorldGenerationError } from "./errors.js";

export function assignActiveRanks(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  const ranksRng = rngFactory(deriveSeed(seed, RNG_LABELS.ranksActive));
  const activeCompetitors = livingDrafts(state)
    .filter((p) => p.careerStatus === "active_competitor")
    .map((p) => p.personId)
    .sort((a, b) => a.localeCompare(b));

  const shuffled = ranksRng.shuffle(activeCompetitors);
  let index = 0;

  for (const rank of RANK_ORDER) {
    const count = config.population.activeRankDistribution[rank];
    for (let i = 0; i < count; i += 1) {
      const personId = shuffled[index];
      if (personId === undefined) {
        break;
      }
      const person = state.persons.find((p) => p.personId === personId)!;
      person.currentRank = rank;
      person.highestRank = rank;
      index += 1;
    }
  }
}

export function assignRetiredRanksAndQualifiedMasters(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  const ranksRng = rngFactory(deriveSeed(seed, RNG_LABELS.ranksRetired));
  const retiredLiving = livingDrafts(state).filter((p) => p.careerStatus === "retired");
  const allocation = allocateByLargestRemainder(
    config.population.activeRankDistribution,
    retiredLiving.length,
  );

  const shuffledRetired = ranksRng.shuffle(
    retiredLiving.map((p) => p.personId).sort((a, b) => a.localeCompare(b)),
  );
  let index = 0;

  for (const rank of RANK_ORDER) {
    const count = allocation[rank];
    for (let i = 0; i < count; i += 1) {
      const personId = shuffledRetired[index];
      if (personId === undefined) {
        break;
      }
      const person = state.persons.find((p) => p.personId === personId)!;
      person.retirementRank = rank;
      person.highestRank = rank;
      index += 1;
    }
  }

  const cOrHigherRanks = new Set(["C", "B", "A", "S"]);
  const qualifiedCandidates = retiredLiving
    .filter((p) => p.highestRank !== undefined && cOrHigherRanks.has(p.highestRank))
    .map((p) => p.personId)
    .sort((a, b) => a.localeCompare(b));

  const requiredQualified = config.lineages.initialQualifiedMasters;
  if (qualifiedCandidates.length < requiredQualified) {
    throw new InitialWorldGenerationError("insufficient C-or-higher qualified master candidates", {
      required: requiredQualified,
      available: qualifiedCandidates.length,
    });
  }

  const shuffledQualified = ranksRng.shuffle(qualifiedCandidates);

  for (let i = 0; i < requiredQualified; i += 1) {
    const personId = shuffledQualified[i]!;
    const person = state.persons.find((p) => p.personId === personId)!;
    person.qualifiedMaster = true;
  }

  for (let i = requiredQualified; i < shuffledQualified.length; i += 1) {
    const person = state.persons.find((p) => p.personId === shuffledQualified[i]!)!;
    person.qualifiedMaster = false;
  }
}

export function assignMasterRelationshipsAndLineages(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  const masterRng = rngFactory(deriveSeed(seed, RNG_LABELS.relationshipsMaster));
  const qualifiedMasters = livingDrafts(state)
    .filter((p) => p.careerStatus === "retired" && p.qualifiedMaster)
    .map((p) => p.personId)
    .sort((a, b) => a.localeCompare(b));

  const shuffledMasters = masterRng.shuffle(qualifiedMasters);
  const lineageIds = state.lineages.map((l) => l.lineageId);

  for (let i = 0; i < shuffledMasters.length; i += 1) {
    const masterId = shuffledMasters[i]!;
    const lineageId = lineageIds[i % lineageIds.length]!;
    const master = state.persons.find((p) => p.personId === masterId)!;
    master.lineageId = lineageId;
  }

  if (!config.history.createExistingRelationships) {
    state.masterRelationships = [];
    return;
  }

  const discipleCandidates = livingDrafts(state)
    .filter((p) => p.currentAge !== undefined && p.currentAge >= 8 && p.currentAge <= 41)
    .map((p) => p.personId)
    .sort((a, b) => a.localeCompare(b));

  const discipleTarget = Math.floor(
    discipleCandidates.length * config.relationships.formalMasterCoverageAge8To41,
  );
  const shuffledDisciples = masterRng.shuffle(discipleCandidates).slice(0, discipleTarget);

  const masterRelationships: { masterId: PersonId; discipleId: PersonId }[] = [];

  for (const discipleId of shuffledDisciples) {
    const candidates = qualifiedMasters
      .filter((id) => id !== discipleId)
      .sort((a, b) => a.localeCompare(b));
    const shuffledCandidates = masterRng.shuffle(candidates);
    const masterId = shuffledCandidates[0];
    if (masterId === undefined) {
      state.warnings.push(`skipped master assignment for ${discipleId}: no qualified master`);
      continue;
    }
    const disciple = state.persons.find((p) => p.personId === discipleId)!;
    const master = state.persons.find((p) => p.personId === masterId)!;
    if (master.lineageId === undefined) {
      state.warnings.push(`skipped master assignment for ${discipleId}: master has no lineage`);
      continue;
    }
    masterRelationships.push({ masterId, discipleId });
    disciple.lineageId = master.lineageId;
  }

  if (masterRelationships.length < discipleTarget) {
    state.warnings.push(
      `master relationships below target: ${String(masterRelationships.length)}/${String(discipleTarget)}`,
    );
  }

  state.masterRelationships = masterRelationships;
}
