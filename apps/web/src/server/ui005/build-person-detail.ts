/**
 * Build PersonDetailView 0.2.0 exact25 from fixed UiReadSnapshot sources (API-008).
 */

import {
  TECHNIQUE_DEFINITION_KEYS,
  toCanonicalJson,
  type Person,
  type Relationship,
  type Sprint1EventEnvelope,
  type Sprint1RunSession,
  type TechniqueDefinition,
  validatePersonTemporaryCondition,
  validateSprint1PersonState,
} from "@shared-world/simulation-core";
import { mapPersonDetailDirect } from "./person-detail-direct-map.js";
import { projectRelationships } from "./relationship-projection.js";
import { fail, ok, type PureResult } from "./result.js";
import { aggregateStatHistory, type StatGrowthEventSource } from "./stat-history-aggregate.js";
import { mapTechniquesView, type TechniqueCatalogEntry } from "./technique-view-map.js";
import {
  aggregateTrainingHistory,
  type TrainingEventSource,
} from "./training-history-aggregate.js";
import type { PersonDetailDirectFields, TechniqueView, TrainingHistoryView } from "./types.js";
import type { StatHistoryView } from "./types.js";

export const PERSON_DETAIL_VIEW_KEYS = [
  "personId",
  "displayName",
  "sex",
  "lifeStatus",
  "participationStatus",
  "careerStatus",
  "birthYear",
  "age",
  "deathYear",
  "ageAtDeath",
  "familyId",
  "lineageId",
  "currentRank",
  "highestRank",
  "retirementRank",
  "qualifiedMaster",
  "parentPersonIds",
  "formalMasterPersonIds",
  "stats",
  "aptitudes",
  "temporaryCondition",
  "currentMental",
  "learningFocusTechniqueId",
  "statHistory",
  "techniques",
  "trainingHistory",
] as const;

export type PersonDetailView = {
  personId: string;
  displayName: string;
  sex: "male" | "female";
  lifeStatus: "living" | "deceased";
  participationStatus: "waiting" | "active" | "stopped" | null;
  careerStatus: "child" | "trainee" | "active_competitor" | "retired";
  birthYear: number;
  age: number | null;
  deathYear: number | null;
  ageAtDeath: number | null;
  familyId: string;
  lineageId: string | null;
  currentRank: string | null;
  highestRank: string | null;
  retirementRank: string | null;
  qualifiedMaster: boolean;
  parentPersonIds: string[];
  formalMasterPersonIds: string[];
  stats: PersonDetailDirectFields["stats"];
  aptitudes: PersonDetailDirectFields["aptitudes"];
  temporaryCondition: PersonDetailDirectFields["temporaryCondition"];
  currentMental: number;
  learningFocusTechniqueId: string | null;
  statHistory: StatHistoryView;
  techniques: TechniqueView[];
  trainingHistory: TrainingHistoryView;
};

/** Canonical PersonId lexical form (generator: person_ + 6 digits). */
export const PERSON_ID_LEXICAL = /^person_[0-9]{6}$/;

function definitionToWire(definition: TechniqueDefinition): Record<string, unknown> {
  const raw = JSON.parse(toCanonicalJson(definition)) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of TECHNIQUE_DEFINITION_KEYS) {
    out[key] = raw[key];
  }
  return out;
}

function buildCatalogMap(
  session: Sprint1RunSession,
): PureResult<Map<string, TechniqueCatalogEntry>> {
  const catalog = session.context.techniqueCatalog;
  const map = new Map<string, TechniqueCatalogEntry>();
  for (const definition of catalog.definitions) {
    map.set(definition.techniqueId, {
      techniqueId: definition.techniqueId,
      learningProgressRequired: definition.learningProgressRequired,
      definition: definitionToWire(definition),
    });
  }
  return ok(map);
}

function findSidecarTemporaryCondition(
  session: Sprint1RunSession,
  personId: string,
): PureResult<{ fatigue: number; injury: number; condition: number; confidence: number }> {
  const entry = session.runtimeState.weeklyTrainingSidecars.entries.find(
    (row) => row.personId === personId,
  );
  if (entry === undefined) {
    return fail("temporaryCondition sidecar missing for person");
  }
  const validated = validatePersonTemporaryCondition(entry.temporaryCondition);
  if (!validated.ok) {
    return fail("temporaryCondition invalid");
  }
  return ok(validated.value);
}

function toTrainingEvents(stream: readonly Sprint1EventEnvelope[]): TrainingEventSource[] {
  return stream.map((event) => ({
    sequence: event.sequence,
    eventType: event.eventType,
    sourceProcessor: event.sourceProcessor,
    absoluteWeek: event.worldDate.absoluteWeek,
    worldDate: {
      year: event.worldDate.year,
      month: event.worldDate.month,
      week: event.worldDate.weekOfMonth,
    },
    personIds: event.entities.personIds as readonly string[],
    payload: { ...event.payload },
  }));
}

function toStatGrowthEvents(stream: readonly Sprint1EventEnvelope[]): StatGrowthEventSource[] {
  const out: StatGrowthEventSource[] = [];
  for (const event of stream) {
    if (event.eventType !== "training.stat_growth_applied") {
      continue;
    }
    const targetStat = event.payload.targetStat;
    const before = event.payload.before;
    const after = event.payload.after;
    if (typeof targetStat !== "string" || typeof before !== "number" || typeof after !== "number") {
      // Leave structural validation to aggregateStatHistory fail path via incomplete payload
      out.push({
        sequence: event.sequence,
        eventType: event.eventType,
        sourceProcessor: event.sourceProcessor,
        absoluteWeek: event.worldDate.absoluteWeek,
        personIds: event.entities.personIds as readonly string[],
        payload: {
          targetStat: String(targetStat ?? ""),
          before: typeof before === "number" ? before : -1,
          after: typeof after === "number" ? after : -1,
        },
      });
      continue;
    }
    out.push({
      sequence: event.sequence,
      eventType: event.eventType,
      sourceProcessor: event.sourceProcessor,
      absoluteWeek: event.worldDate.absoluteWeek,
      personIds: event.entities.personIds as readonly string[],
      payload: { targetStat, before, after },
    });
  }
  return out;
}

/**
 * FI-039/040: broken counterpart refs among relationships involving this person → fail.
 * Duplicate handled in projectRelationships. Parent-child mutual cycle involving person → fail.
 */
function assertRelationshipIntegrity(input: {
  personId: string;
  relationships: readonly Relationship[];
  personIds: ReadonlySet<string>;
  parentPersonIds: readonly string[];
  formalMasterPersonIds: readonly string[];
}): PureResult<void> {
  for (const id of input.parentPersonIds) {
    if (!input.personIds.has(id)) {
      return fail(`broken parent reference: ${id}`);
    }
  }
  for (const id of input.formalMasterPersonIds) {
    if (!input.personIds.has(id)) {
      return fail(`broken master reference: ${id}`);
    }
  }
  // Cycle: A is parent of B and B is parent of A (involving this person)
  const childToParents = new Map<string, string[]>();
  for (const rel of input.relationships) {
    if (rel.kind !== "parent_child") {
      continue;
    }
    const list = childToParents.get(rel.childId) ?? [];
    list.push(rel.parentId);
    childToParents.set(rel.childId, list);
  }
  const parentsOfSelf = childToParents.get(input.personId) ?? [];
  for (const parentId of parentsOfSelf) {
    const parentsOfParent = childToParents.get(parentId) ?? [];
    if (parentsOfParent.includes(input.personId)) {
      return fail("parent_child cycle involving person");
    }
  }
  if (parentsOfSelf.includes(input.personId)) {
    return fail("self parent cycle");
  }
  return ok(undefined);
}

export function buildPersonDetailView(input: {
  session: Sprint1RunSession;
  personId: string;
}): PureResult<PersonDetailView> | { ok: false; code: "NOT_FOUND" } {
  const persons = input.session.runtimeState.worldState.persons as readonly Person[];
  const person = persons.find((p) => p.personId === input.personId);
  if (person === undefined) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const worldYear = input.session.runtimeState.worldState.worldDate.year;
  const W = input.session.runtimeState.worldState.worldDate.absoluteWeek;
  const personIdSet = new Set(persons.map((p) => p.personId as string));

  if (person.sprint1State === undefined) {
    return fail("sprint1State required");
  }
  if (person.sex !== "male" && person.sex !== "female") {
    return fail("person.sex must be male or female");
  }
  const sprint1 = validateSprint1PersonState(person.sprint1State, {
    spiritSurfaceValue: person.abilities.spirit.surfaceValue,
  });
  if (!sprint1.ok) {
    return fail("sprint1State invalid");
  }

  const tc = findSidecarTemporaryCondition(input.session, input.personId);
  if (!tc.ok) {
    return tc;
  }

  const direct = mapPersonDetailDirect({
    person: {
      personId: person.personId,
      familyId: person.familyId,
      ...(Object.prototype.hasOwnProperty.call(person, "lineageId") &&
      person.lineageId !== undefined
        ? { lineageId: person.lineageId }
        : {}),
      lifeStatus: person.lifeStatus,
      careerStatus: person.careerStatus,
      qualifiedMaster: person.qualifiedMaster,
      ...(person.lifeStatus === "living" ? { currentAge: person.currentAge } : {}),
      birthYear: person.birthYear,
      ...(person.lifeStatus === "deceased"
        ? { deathYear: person.deathYear, ageAtDeath: person.ageAtDeath }
        : {}),
      ...("currentRank" in person && person.currentRank !== undefined
        ? { currentRank: person.currentRank }
        : {}),
      ...("highestRank" in person && person.highestRank !== undefined
        ? { highestRank: person.highestRank }
        : {}),
      ...("retirementRank" in person && person.retirementRank !== undefined
        ? { retirementRank: person.retirementRank }
        : {}),
      abilities: person.abilities,
      aptitudes: person.aptitudes,
      sprint1State: {
        currentMental: sprint1.value.currentMental,
        learningFocusTechniqueId: sprint1.value.learningFocusTechniqueId,
      },
    },
    temporaryCondition: tc.value,
    worldYear,
  });
  if (!direct.ok) {
    return direct;
  }

  const relationships = input.session.runtimeState.worldState
    .relationships as readonly Relationship[];
  const rel = projectRelationships({
    personId: input.personId,
    relationships,
  });
  if (!rel.ok) {
    return rel;
  }
  const integrity = assertRelationshipIntegrity({
    personId: input.personId,
    relationships,
    personIds: personIdSet,
    parentPersonIds: rel.value.parentPersonIds,
    formalMasterPersonIds: rel.value.formalMasterPersonIds,
  });
  if (!integrity.ok) {
    return integrity;
  }

  const catalog = buildCatalogMap(input.session);
  if (!catalog.ok) {
    return catalog;
  }
  const techniques = mapTechniquesView({
    techniqueStates: sprint1.value.techniqueStates,
    catalogById: catalog.value,
    learningFocusTechniqueId: sprint1.value.learningFocusTechniqueId,
  });
  if (!techniques.ok) {
    return techniques;
  }

  const stream = input.session.runtimeState.eventStream;
  const training = aggregateTrainingHistory({
    personId: input.personId,
    currentAbsoluteWeek: W,
    events: toTrainingEvents(stream),
  });
  if (!training.ok) {
    return training;
  }

  const statHistory = aggregateStatHistory({
    personId: input.personId,
    currentAbsoluteWeek: W,
    currentStats: direct.value.stats,
    events: toStatGrowthEvents(stream),
  });
  if (!statHistory.ok) {
    return statHistory;
  }

  const participationStatus = person.lifeStatus === "living" ? person.participationStatus : null;

  const view: PersonDetailView = {
    personId: person.personId,
    displayName: person.displayName,
    sex: person.sex,
    lifeStatus: person.lifeStatus,
    participationStatus,
    careerStatus: person.careerStatus,
    birthYear: person.birthYear,
    age: direct.value.age,
    deathYear: direct.value.deathYear,
    ageAtDeath: direct.value.ageAtDeath,
    familyId: direct.value.familyId,
    lineageId: direct.value.lineageId,
    currentRank: direct.value.currentRank,
    highestRank: direct.value.highestRank,
    retirementRank: direct.value.retirementRank,
    qualifiedMaster: direct.value.qualifiedMaster,
    parentPersonIds: rel.value.parentPersonIds,
    formalMasterPersonIds: rel.value.formalMasterPersonIds,
    stats: direct.value.stats,
    aptitudes: direct.value.aptitudes,
    temporaryCondition: direct.value.temporaryCondition,
    currentMental: direct.value.currentMental,
    learningFocusTechniqueId: techniques.value.learningFocusTechniqueId,
    statHistory: statHistory.value,
    techniques: techniques.value.techniques,
    trainingHistory: training.value,
  };

  const keys = Object.keys(view);
  if (
    keys.length !== PERSON_DETAIL_VIEW_KEYS.length ||
    !PERSON_DETAIL_VIEW_KEYS.every((k) => keys.includes(k))
  ) {
    return fail("PersonDetailView key set drift");
  }
  if (view.statHistory === null || view.trainingHistory.available !== true) {
    return fail("ready PersonDetail requires non-null statHistory and available trainingHistory");
  }
  return ok(view);
}
