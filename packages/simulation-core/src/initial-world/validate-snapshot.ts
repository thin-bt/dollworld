import { ABILITY_KEYS, APTITUDE_KEYS, type StatValueTriple } from "../abilities.js";
import { toCanonicalJson } from "../canonical-json.js";
import type { InitialWorldConfig } from "../config/types.js";
import { allocateByLargestRemainder } from "../config/validate-config.js";
import type { Family, Lineage, Person, Relationship } from "../domain.js";
import {
  MINIMUM_RANK,
  RANK_ORDER,
  type CareerStatus,
  type ParentRole,
  type Rank,
  type Sex,
} from "../enums.js";
import { computeCurrentAge } from "../age-status.js";
import { RNG_ALGORITHM_VERSION } from "../rng.js";
import { createInitialWorldDate, isSameWorldDate } from "../world-date.js";
import {
  FIXED_WORLD_ID,
  FOCUS_KEYS,
  INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION,
  LINEAGE_NAME_SUFFIX,
  SIMULATION_SPEC_VERSION,
} from "./constants.js";
import { InitialWorldGenerationError } from "./errors.js";
import { allocateByLargestRemainderOrdered } from "./largest-remainder.js";
import {
  buildParentMaps,
  countMasterCycles,
  countParentCycles,
  isMarriageProhibited,
} from "./kinship.js";
import { buildGenerationSummary, buildValidationSummary, computeSexTargets } from "./summary.js";
import type { InitialGenerationSummary, InitialWorldSnapshot } from "./types.js";

const CURRENT_WORLD_YEAR = 1;
const SIMULATION_ID_PATTERN = /^simulation_[0-9a-f]{16}$/;
const CONFIG_HASH_PATTERN = /^[0-9a-f]{64}$/;
const C_RANK_INDEX = RANK_ORDER.indexOf("C");

const CAREER_STATUSES = [
  "child",
  "trainee",
  "active_competitor",
  "retired",
] as const satisfies readonly CareerStatus[];
const SEX_VALUES = ["male", "female"] as const satisfies readonly Sex[];
const LIFE_STATUSES = ["living", "deceased"] as const;
const PARTICIPATION_STATUSES = ["waiting", "active", "stopped"] as const;
const RELATIONSHIP_KINDS = ["parent_child", "marriage", "master_disciple"] as const;
const PARENT_ROLES = ["father", "mother"] as const satisfies readonly ParentRole[];

function fail(message: string, context: Record<string, string | number | boolean> = {}): never {
  throw new InitialWorldGenerationError(message, context);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function hasOwn(value: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function isCOrHigher(rank: Rank): boolean {
  return RANK_ORDER.indexOf(rank) >= C_RANK_INDEX;
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isRank(value: unknown): value is Rank {
  return typeof value === "string" && (RANK_ORDER as readonly string[]).includes(value);
}

function isSex(value: unknown): value is Sex {
  return typeof value === "string" && (SEX_VALUES as readonly string[]).includes(value);
}

function isCareerStatus(value: unknown): value is CareerStatus {
  return typeof value === "string" && (CAREER_STATUSES as readonly string[]).includes(value);
}

function ageBandCount(config: InitialWorldConfig, minAge: number, maxAge: number): number {
  return config.population.ageBands
    .filter((band) => band.minAge >= minAge && band.maxAge <= maxAge)
    .reduce((sum, band) => sum + band.count, 0);
}

function assertStatValueTriple(
  value: unknown,
  personId: string,
  label: string,
): asserts value is StatValueTriple {
  if (!isPlainObject(value)) {
    fail("StatValueTriple must be a plain object", { personId, label });
  }
  for (const field of ["surfaceValue", "expressedGeneticValue", "latentGeneticValue"] as const) {
    if (!hasOwn(value, field)) {
      fail("StatValueTriple missing field", { personId, label, field });
    }
    const fieldValue = value[field];
    if (!isFiniteInteger(fieldValue)) {
      fail("StatValueTriple field must be a finite integer", {
        personId,
        label,
        field,
        value: typeof fieldValue === "number" ? fieldValue : String(fieldValue),
      });
    }
  }
}

function assertAbilities(value: unknown, personId: string): void {
  if (!isPlainObject(value)) {
    fail("person abilities must be a plain object", { personId });
  }
  for (const key of ABILITY_KEYS) {
    if (!hasOwn(value, key)) {
      fail("person abilities missing key", { personId, key });
    }
    assertStatValueTriple(value[key], personId, `ability:${key}`);
  }
}

function assertAptitudes(value: unknown, personId: string): void {
  if (!isPlainObject(value)) {
    fail("person aptitudes must be a plain object", { personId });
  }
  for (const key of APTITUDE_KEYS) {
    if (!hasOwn(value, key)) {
      fail("person aptitudes missing key", { personId, key });
    }
    assertStatValueTriple(value[key], personId, `aptitude:${key}`);
  }
}

function assertPersonStructure(value: unknown, index: number): asserts value is Person {
  if (!isPlainObject(value)) {
    fail("person must be a plain object", { index });
  }
  if (!isNonEmptyString(value.personId)) {
    fail("person.personId must be a non-empty string", { index });
  }
  if (!isNonEmptyString(value.givenName)) {
    fail("person.givenName must be a non-empty string", { personId: value.personId });
  }
  if (!isNonEmptyString(value.familyName)) {
    fail("person.familyName must be a non-empty string", { personId: value.personId });
  }
  if (!isNonEmptyString(value.displayName)) {
    fail("person.displayName must be a non-empty string", { personId: value.personId });
  }
  if (!isNonEmptyString(value.nameDataVersion)) {
    fail("person.nameDataVersion must be a non-empty string", { personId: value.personId });
  }
  if (!isSex(value.sex)) {
    fail("person.sex must be male or female", {
      personId: value.personId,
      sex: typeof value.sex === "string" ? value.sex : String(value.sex),
    });
  }
  if (!isNonEmptyString(value.familyId)) {
    fail("person.familyId must be a non-empty string", { personId: value.personId });
  }
  if (!isFiniteInteger(value.birthYear)) {
    fail("person.birthYear must be a finite integer", { personId: value.personId });
  }
  if (!isCareerStatus(value.careerStatus)) {
    fail("person.careerStatus invalid", {
      personId: value.personId,
      careerStatus:
        typeof value.careerStatus === "string" ? value.careerStatus : String(value.careerStatus),
    });
  }
  if (
    typeof value.lifeStatus !== "string" ||
    !(LIFE_STATUSES as readonly string[]).includes(value.lifeStatus)
  ) {
    fail("person.lifeStatus invalid", {
      personId: value.personId,
      lifeStatus:
        typeof value.lifeStatus === "string" ? value.lifeStatus : String(value.lifeStatus),
    });
  }
  if (typeof value.qualifiedMaster !== "boolean") {
    fail("person.qualifiedMaster must be boolean", { personId: value.personId });
  }
  assertAbilities(value.abilities, value.personId);
  assertAptitudes(value.aptitudes, value.personId);

  if (value.lineageId !== undefined && !isNonEmptyString(value.lineageId)) {
    fail("person.lineageId must be a non-empty string when present", {
      personId: value.personId,
    });
  }
  if (value.currentRank !== undefined && !isRank(value.currentRank)) {
    fail("person.currentRank invalid", {
      personId: value.personId,
      currentRank:
        typeof value.currentRank === "string" ? value.currentRank : String(value.currentRank),
    });
  }
  if (value.highestRank !== undefined && !isRank(value.highestRank)) {
    fail("person.highestRank invalid", {
      personId: value.personId,
      highestRank:
        typeof value.highestRank === "string" ? value.highestRank : String(value.highestRank),
    });
  }
  if (value.retirementRank !== undefined && !isRank(value.retirementRank)) {
    fail("person.retirementRank invalid", {
      personId: value.personId,
      retirementRank:
        typeof value.retirementRank === "string"
          ? value.retirementRank
          : String(value.retirementRank),
    });
  }
  if (value.participationStatus !== undefined) {
    if (
      typeof value.participationStatus !== "string" ||
      !(PARTICIPATION_STATUSES as readonly string[]).includes(value.participationStatus)
    ) {
      fail("person.participationStatus invalid", {
        personId: value.personId,
        participationStatus:
          typeof value.participationStatus === "string"
            ? value.participationStatus
            : String(value.participationStatus),
      });
    }
  }
  if (value.currentAge !== undefined && !isFiniteInteger(value.currentAge)) {
    fail("person.currentAge must be a finite integer", { personId: value.personId });
  }
  if (value.deathYear !== undefined && !isFiniteInteger(value.deathYear)) {
    fail("person.deathYear must be a finite integer", { personId: value.personId });
  }
  if (value.ageAtDeath !== undefined && !isFiniteInteger(value.ageAtDeath)) {
    fail("person.ageAtDeath must be a finite integer", { personId: value.personId });
  }
}

function assertFamilyStructure(value: unknown, index: number): asserts value is Family {
  if (!isPlainObject(value)) {
    fail("family must be a plain object", { index });
  }
  if (!isNonEmptyString(value.familyId)) {
    fail("family.familyId must be a non-empty string", { index });
  }
  if (!isNonEmptyString(value.familyName)) {
    fail("family.familyName must be a non-empty string", { familyId: value.familyId });
  }
  if (typeof value.status !== "string") {
    fail("family.status must be a string", { familyId: value.familyId });
  }
  if (!isFiniteNumber(value.baseBirthRate)) {
    fail("family.baseBirthRate must be a finite number", { familyId: value.familyId });
  }
  if (typeof value.initialHistory !== "boolean") {
    fail("family.initialHistory must be boolean", { familyId: value.familyId });
  }
}

function assertLineageStructure(value: unknown, index: number): asserts value is Lineage {
  if (!isPlainObject(value)) {
    fail("lineage must be a plain object", { index });
  }
  if (!isNonEmptyString(value.lineageId)) {
    fail("lineage.lineageId must be a non-empty string", { index });
  }
  if (!isNonEmptyString(value.lineageName)) {
    fail("lineage.lineageName must be a non-empty string", { lineageId: value.lineageId });
  }
  if (typeof value.focus !== "string") {
    fail("lineage.focus must be a string", { lineageId: value.lineageId });
  }
  if (!isNonEmptyString(value.founderPersonId)) {
    fail("lineage.founderPersonId must be a non-empty string", { lineageId: value.lineageId });
  }
  if (!isNonEmptyString(value.founderFamilyId)) {
    fail("lineage.founderFamilyId must be a non-empty string", { lineageId: value.lineageId });
  }
  if (typeof value.status !== "string") {
    fail("lineage.status must be a string", { lineageId: value.lineageId });
  }
}

function assertRelationshipStructure(value: unknown, index: number): asserts value is Relationship {
  if (!isPlainObject(value)) {
    fail("relationship must be a plain object", { index });
  }
  if (!isNonEmptyString(value.relationshipId)) {
    fail("relationship.relationshipId must be a non-empty string", { index });
  }
  if (
    typeof value.kind !== "string" ||
    !(RELATIONSHIP_KINDS as readonly string[]).includes(value.kind)
  ) {
    fail("relationship.kind invalid", {
      relationshipId: value.relationshipId,
      kind: typeof value.kind === "string" ? value.kind : String(value.kind),
    });
  }
  if (value.kind === "parent_child") {
    if (!isNonEmptyString(value.parentId) || !isNonEmptyString(value.childId)) {
      fail("parent_child requires parentId and childId", {
        relationshipId: value.relationshipId,
      });
    }
    if (
      typeof value.parentRole !== "string" ||
      !(PARENT_ROLES as readonly string[]).includes(value.parentRole)
    ) {
      fail("parentRole must be father or mother", {
        relationshipId: value.relationshipId,
        parentRole:
          typeof value.parentRole === "string" ? value.parentRole : String(value.parentRole),
      });
    }
  } else if (value.kind === "marriage") {
    if (!isNonEmptyString(value.personAId) || !isNonEmptyString(value.personBId)) {
      fail("marriage requires personAId and personBId", {
        relationshipId: value.relationshipId,
      });
    }
  } else if (!isNonEmptyString(value.masterId) || !isNonEmptyString(value.discipleId)) {
    fail("master_disciple requires masterId and discipleId", {
      relationshipId: value.relationshipId,
    });
  }
}

function assertTargetActualPair(value: unknown, label: string): void {
  if (!isPlainObject(value)) {
    fail("generationSummary pair must be a plain object", { label });
  }
  if (!isFiniteNumber(value.target) || !isFiniteNumber(value.actual)) {
    fail("generationSummary pair requires finite target/actual", { label });
  }
}

function assertGenerationSummaryStructure(
  value: unknown,
): asserts value is InitialGenerationSummary {
  if (!isPlainObject(value)) {
    fail("generationSummary must be a plain object");
  }
  for (const key of [
    "livingCount",
    "deceasedCount",
    "families",
    "lineages",
    "qualifiedMasters",
    "parentRelationships",
    "knownParentPeople",
    "knownParentCoverage",
    "twoKnownParentPeople",
    "twoKnownParentsAmongCovered",
    "marriagePeople",
    "marriagePairs",
    "formalMasterRelationships",
    "formalMasterCoverage",
  ] as const) {
    assertTargetActualPair(value[key], key);
  }
  if (!Array.isArray(value.ageBands)) {
    fail("generationSummary.ageBands must be an array");
  }
  for (let i = 0; i < value.ageBands.length; i += 1) {
    assertTargetActualPair(value.ageBands[i], `ageBands[${String(i)}]`);
  }
  if (!isPlainObject(value.sex) || !isPlainObject(value.careerStatus)) {
    fail("generationSummary sex/careerStatus must be plain objects");
  }
  assertTargetActualPair(value.sex.male, "sex.male");
  assertTargetActualPair(value.sex.female, "sex.female");
  for (const status of CAREER_STATUSES) {
    assertTargetActualPair(value.careerStatus[status], `careerStatus.${status}`);
  }
  if (!isPlainObject(value.activeRanks) || !isPlainObject(value.retiredRanks)) {
    fail("generationSummary ranks must be plain objects");
  }
  for (const rank of RANK_ORDER) {
    assertTargetActualPair(value.activeRanks[rank], `activeRanks.${rank}`);
    assertTargetActualPair(value.retiredRanks[rank], `retiredRanks.${rank}`);
  }
  for (const key of [
    "brokenReferenceCount",
    "selfReferenceCount",
    "parentCycleCount",
    "masterCycleCount",
  ] as const) {
    if (!isFiniteInteger(value[key])) {
      fail("generationSummary count fields must be finite integers", { key });
    }
  }
  if (!Array.isArray(value.warnings)) {
    fail("generationSummary.warnings must be an array");
  }
  for (const warning of value.warnings) {
    if (typeof warning !== "string") {
      fail("generationSummary.warnings entries must be strings");
    }
  }
}

function assertSnapshotStructure(snapshot: unknown): asserts snapshot is InitialWorldSnapshot {
  if (!isPlainObject(snapshot)) {
    fail("snapshot must be a plain object");
  }
  if (!isNonEmptyString(snapshot.schemaVersion)) {
    fail("schemaVersion must be a non-empty string");
  }
  if (!isNonEmptyString(snapshot.simulationSpecVersion)) {
    fail("simulationSpecVersion must be a non-empty string");
  }
  if (!isNonEmptyString(snapshot.nameDataVersion)) {
    fail("nameDataVersion must be a non-empty string");
  }
  if (!isNonEmptyString(snapshot.simulationId)) {
    fail("simulationId must be a non-empty string");
  }
  if (!SIMULATION_ID_PATTERN.test(snapshot.simulationId)) {
    fail("simulationId must match simulation_<16hex>", {
      simulationId: snapshot.simulationId,
    });
  }
  if (!isNonEmptyString(snapshot.worldId)) {
    fail("worldId must be a non-empty string");
  }
  if (!isPlainObject(snapshot.worldDate)) {
    fail("worldDate must be a plain object");
  }
  for (const field of ["year", "month", "weekOfMonth", "absoluteWeek"] as const) {
    if (!isSafeInteger(snapshot.worldDate[field])) {
      fail("worldDate fields must be safe integers", { field });
    }
  }
  if (!isNonEmptyString(snapshot.configProfileId)) {
    fail("configProfileId must be a non-empty string");
  }
  if (typeof snapshot.configHash !== "string" || !CONFIG_HASH_PATTERN.test(snapshot.configHash)) {
    fail("configHash must be a lowercase hex digest of length 64", {
      configHash: typeof snapshot.configHash === "string" ? snapshot.configHash : "",
    });
  }
  if (!isSafeInteger(snapshot.seed)) {
    fail("seed must be a safe integer", {
      seed: typeof snapshot.seed === "number" ? snapshot.seed : String(snapshot.seed),
    });
  }
  if (!isNonEmptyString(snapshot.rngAlgorithm)) {
    fail("rngAlgorithm must be a non-empty string");
  }
  if (!Array.isArray(snapshot.persons)) {
    fail("persons must be an array");
  }
  if (!Array.isArray(snapshot.families)) {
    fail("families must be an array");
  }
  if (!Array.isArray(snapshot.lineages)) {
    fail("lineages must be an array");
  }
  if (!Array.isArray(snapshot.relationships)) {
    fail("relationships must be an array");
  }
  assertGenerationSummaryStructure(snapshot.generationSummary);

  for (let i = 0; i < snapshot.persons.length; i += 1) {
    assertPersonStructure(snapshot.persons[i], i);
  }
  for (let i = 0; i < snapshot.families.length; i += 1) {
    assertFamilyStructure(snapshot.families[i], i);
  }
  for (let i = 0; i < snapshot.lineages.length; i += 1) {
    assertLineageStructure(snapshot.lineages[i], i);
  }
  for (let i = 0; i < snapshot.relationships.length; i += 1) {
    assertRelationshipStructure(snapshot.relationships[i], i);
  }
}

function validateSequentialIds(snapshot: InitialWorldSnapshot): void {
  for (let i = 0; i < snapshot.persons.length; i += 1) {
    const expected = `person_${String(i + 1).padStart(6, "0")}`;
    const person = snapshot.persons[i];
    if (person === undefined || person.personId !== expected) {
      fail("person ids must be sequential", {
        index: i,
        expected,
        actual: person?.personId ?? "",
      });
    }
  }
  for (let i = 0; i < snapshot.families.length; i += 1) {
    const expected = `family_${String(i + 1).padStart(6, "0")}`;
    const family = snapshot.families[i];
    if (family === undefined || family.familyId !== expected) {
      fail("family ids must be sequential", {
        index: i,
        expected,
        actual: family?.familyId ?? "",
      });
    }
  }
  for (let i = 0; i < snapshot.lineages.length; i += 1) {
    const expected = `lineage_${String(i + 1).padStart(6, "0")}`;
    const lineage = snapshot.lineages[i];
    if (lineage === undefined || lineage.lineageId !== expected) {
      fail("lineage ids must be sequential", {
        index: i,
        expected,
        actual: lineage?.lineageId ?? "",
      });
    }
  }
  for (let i = 0; i < snapshot.relationships.length; i += 1) {
    const expected = `relationship_${String(i + 1).padStart(6, "0")}`;
    const relationship = snapshot.relationships[i];
    if (relationship === undefined || relationship.relationshipId !== expected) {
      fail("relationship ids must be sequential", {
        index: i,
        expected,
        actual: relationship?.relationshipId ?? "",
      });
    }
  }
}

function validateMeta(config: InitialWorldConfig, snapshot: InitialWorldSnapshot): void {
  if (snapshot.schemaVersion !== INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION) {
    fail("schemaVersion mismatch", {
      expected: INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION,
      actual: snapshot.schemaVersion,
    });
  }
  if (snapshot.simulationSpecVersion !== SIMULATION_SPEC_VERSION) {
    fail("simulationSpecVersion mismatch", {
      expected: SIMULATION_SPEC_VERSION,
      actual: snapshot.simulationSpecVersion,
    });
  }
  if (snapshot.worldId !== FIXED_WORLD_ID) {
    fail("worldId must be world_000001", { actual: snapshot.worldId });
  }
  const expectedDate = createInitialWorldDate(config.worldCalendar);
  if (!isSameWorldDate(snapshot.worldDate, expectedDate)) {
    fail("worldDate must equal yearStartDate(1, config.worldCalendar)", {
      year: snapshot.worldDate.year,
      month: snapshot.worldDate.month,
      weekOfMonth: snapshot.worldDate.weekOfMonth,
    });
  }
  if (snapshot.configProfileId !== config.profileId) {
    fail("configProfileId mismatch", {
      expected: config.profileId,
      actual: snapshot.configProfileId,
    });
  }
  if (snapshot.seed < 0 || snapshot.seed > 4294967295) {
    fail("seed must be a uint32", { seed: snapshot.seed });
  }
  if (snapshot.rngAlgorithm !== RNG_ALGORITHM_VERSION) {
    fail("rngAlgorithm mismatch", {
      expected: RNG_ALGORITHM_VERSION,
      actual: snapshot.rngAlgorithm,
    });
  }
  if (snapshot.nameDataVersion !== config.nameData.requiredVersion) {
    fail("nameDataVersion mismatch", {
      expected: config.nameData.requiredVersion,
      actual: snapshot.nameDataVersion,
    });
  }
  if (!CONFIG_HASH_PATTERN.test(snapshot.configHash)) {
    fail("configHash must be a lowercase hex digest of length 64", {
      configHash: snapshot.configHash,
    });
  }
}

function validateRelationshipCreationFlag(
  config: InitialWorldConfig,
  snapshot: InitialWorldSnapshot,
): void {
  if (config.history.createExistingRelationships) {
    return;
  }
  for (const rel of snapshot.relationships) {
    if (rel.kind === "parent_child" || rel.kind === "marriage" || rel.kind === "master_disciple") {
      fail("createExistingRelationships=false forbids parent/marriage/master relationships", {
        relationshipId: rel.relationshipId,
        kind: rel.kind,
      });
    }
  }
}

function validateOrdering(snapshot: InitialWorldSnapshot): void {
  const kindOrder = { parent_child: 0, marriage: 1, master_disciple: 2 } as const;
  for (let i = 1; i < snapshot.relationships.length; i += 1) {
    const prev = snapshot.relationships[i - 1];
    const curr = snapshot.relationships[i];
    if (prev === undefined || curr === undefined) {
      fail("relationship ordering check missing entry", { index: i });
    }
    const prevKind = kindOrder[prev.kind];
    const currKind = kindOrder[curr.kind];
    if (currKind < prevKind) {
      fail("relationships must be ordered parent, marriage, master", {
        previous: prev.relationshipId,
        current: curr.relationshipId,
      });
    }
    if (currKind > prevKind) {
      continue;
    }
    if (curr.kind === "parent_child" && prev.kind === "parent_child") {
      const childCmp = prev.childId.localeCompare(curr.childId);
      if (childCmp > 0) {
        fail("parent relationships must be sorted by childId", {
          previous: prev.relationshipId,
          current: curr.relationshipId,
        });
      }
      if (childCmp === 0) {
        const roleOrder = { father: 0, mother: 1 } as const;
        if (roleOrder[prev.parentRole] > roleOrder[curr.parentRole]) {
          fail("parent relationships for same child must order father before mother", {
            childId: curr.childId,
          });
        }
      }
    } else if (curr.kind === "marriage" && prev.kind === "marriage") {
      const aCmp = prev.personAId.localeCompare(curr.personAId);
      if (aCmp > 0 || (aCmp === 0 && prev.personBId.localeCompare(curr.personBId) > 0)) {
        fail("marriage relationships must be sorted by personAId then personBId", {
          previous: prev.relationshipId,
          current: curr.relationshipId,
        });
      }
    } else if (curr.kind === "master_disciple" && prev.kind === "master_disciple") {
      const dCmp = prev.discipleId.localeCompare(curr.discipleId);
      if (dCmp > 0 || (dCmp === 0 && prev.masterId.localeCompare(curr.masterId) > 0)) {
        fail("master relationships must be sorted by discipleId then masterId", {
          previous: prev.relationshipId,
          current: curr.relationshipId,
        });
      }
    }
  }
}

function validateStatTriple(
  personId: string,
  label: string,
  triple: StatValueTriple,
  surfaceRange: { min: number; max: number },
  geneticRange: { min: number; max: number },
): void {
  for (const [field, range] of [
    ["surfaceValue", surfaceRange],
    ["expressedGeneticValue", geneticRange],
    ["latentGeneticValue", geneticRange],
  ] as const) {
    const value = triple[field];
    if (!Number.isInteger(value) || !inRange(value, range.min, range.max)) {
      fail("ability/aptitude value out of range", {
        personId,
        label,
        field,
        value,
      });
    }
  }
}

function validateHardPopulationTargets(
  config: InitialWorldConfig,
  snapshot: InitialWorldSnapshot,
): void {
  const living = snapshot.persons.filter((p) => p.lifeStatus === "living");
  const deceased = snapshot.persons.filter((p) => p.lifeStatus === "deceased");

  if (living.length !== config.population.totalLiving) {
    fail("living count invariant failed", {
      expected: config.population.totalLiving,
      actual: living.length,
    });
  }
  if (deceased.length !== config.history.initialDeceasedAncestors) {
    fail("deceased count invariant failed", {
      expected: config.history.initialDeceasedAncestors,
      actual: deceased.length,
    });
  }

  for (const band of config.population.ageBands) {
    const actual = living.filter(
      (p) => p.currentAge >= band.minAge && p.currentAge <= band.maxAge,
    ).length;
    if (actual !== band.count) {
      fail("age band count invariant failed", {
        minAge: band.minAge,
        maxAge: band.maxAge,
        expected: band.count,
        actual,
      });
    }
  }

  const sexTargets = computeSexTargets(config);
  const maleActual = snapshot.persons.filter((p) => p.sex === "male").length;
  const femaleActual = snapshot.persons.filter((p) => p.sex === "female").length;
  if (maleActual !== sexTargets.male || femaleActual !== sexTargets.female) {
    fail("sex count invariant failed", {
      expectedMale: sexTargets.male,
      actualMale: maleActual,
      expectedFemale: sexTargets.female,
      actualFemale: femaleActual,
    });
  }

  const childTarget = ageBandCount(config, 0, 7);
  const traineeTarget = ageBandCount(config, 8, 15);
  const activeTarget = ageBandCount(config, 16, 41);
  const livingRetiredTarget = ageBandCount(config, 42, 70);
  const retiredTarget = livingRetiredTarget + config.history.initialDeceasedAncestors;

  const careerCounts: Record<CareerStatus, number> = {
    child: 0,
    trainee: 0,
    active_competitor: 0,
    retired: 0,
  };
  for (const person of snapshot.persons) {
    careerCounts[person.careerStatus] += 1;
  }
  if (careerCounts.child !== childTarget) {
    fail("careerStatus child count mismatch", {
      expected: childTarget,
      actual: careerCounts.child,
    });
  }
  if (careerCounts.trainee !== traineeTarget) {
    fail("careerStatus trainee count mismatch", {
      expected: traineeTarget,
      actual: careerCounts.trainee,
    });
  }
  if (careerCounts.active_competitor !== activeTarget) {
    fail("careerStatus active_competitor count mismatch", {
      expected: activeTarget,
      actual: careerCounts.active_competitor,
    });
  }
  if (careerCounts.retired !== retiredTarget) {
    fail("careerStatus retired count mismatch", {
      expected: retiredTarget,
      actual: careerCounts.retired,
    });
  }

  for (const rank of RANK_ORDER) {
    const expected = config.population.activeRankDistribution[rank];
    const actual = living.filter(
      (p) => p.careerStatus === "active_competitor" && p.currentRank === rank,
    ).length;
    if (actual !== expected) {
      fail("active rank count invariant failed", { rank, expected, actual });
    }
  }

  const livingRetired = living.filter((p) => p.careerStatus === "retired");
  const expectedRetiredRanks = allocateByLargestRemainder(
    config.population.activeRankDistribution,
    livingRetired.length,
  );
  for (const rank of RANK_ORDER) {
    const actual = livingRetired.filter((p) => p.retirementRank === rank).length;
    if (actual !== expectedRetiredRanks[rank]) {
      fail("living retired retirementRank distribution mismatch", {
        rank,
        expected: expectedRetiredRanks[rank],
        actual,
      });
    }
  }

  if (snapshot.families.length !== config.families.initialFamilyCount) {
    fail("family count invariant failed", {
      expected: config.families.initialFamilyCount,
      actual: snapshot.families.length,
    });
  }
  if (snapshot.lineages.length !== config.lineages.initialLineageCount) {
    fail("lineage count invariant failed", {
      expected: config.lineages.initialLineageCount,
      actual: snapshot.lineages.length,
    });
  }

  const qualifiedMasterCount = living.filter(
    (p) => p.careerStatus === "retired" && p.qualifiedMaster,
  ).length;
  if (qualifiedMasterCount !== config.lineages.initialQualifiedMasters) {
    fail("qualifiedMaster count mismatch", {
      expected: config.lineages.initialQualifiedMasters,
      actual: qualifiedMasterCount,
    });
  }

  const expectedFocus = allocateByLargestRemainderOrdered(
    config.lineages.techniqueFocusWeights,
    config.lineages.initialLineageCount,
    FOCUS_KEYS,
  );
  for (const focus of FOCUS_KEYS) {
    const actual = snapshot.lineages.filter((l) => l.focus === focus).length;
    if (actual !== expectedFocus[focus]) {
      fail("lineage focus distribution mismatch", {
        focus,
        expected: expectedFocus[focus],
        actual,
      });
    }
  }
}

function validatePersons(config: InitialWorldConfig, snapshot: InitialWorldSnapshot): void {
  const familyById = new Map(snapshot.families.map((f) => [f.familyId, f]));
  const lineageIds = new Set(snapshot.lineages.map((l) => l.lineageId));

  const expectedDisplay = (givenName: string, familyName: string) =>
    config.nameData.displayFormat
      .replace("{givenName}", givenName)
      .replace("{familyName}", familyName);

  for (const person of snapshot.persons) {
    if (person.displayName !== expectedDisplay(person.givenName, person.familyName)) {
      fail("displayName does not match format", { personId: person.personId });
    }
    if (person.nameDataVersion !== snapshot.nameDataVersion) {
      fail("person nameDataVersion mismatch", { personId: person.personId });
    }
    const family = familyById.get(person.familyId);
    if (family === undefined) {
      fail("person familyId reference broken", {
        personId: person.personId,
        familyId: person.familyId,
      });
    }
    if (person.familyName !== family.familyName) {
      fail("person.familyName must match Family.familyName", {
        personId: person.personId,
        familyId: person.familyId,
      });
    }
    if (person.lineageId !== undefined && !lineageIds.has(person.lineageId)) {
      fail("person lineageId reference broken", {
        personId: person.personId,
        lineageId: person.lineageId,
      });
    }

    for (const key of ABILITY_KEYS) {
      validateStatTriple(
        person.personId,
        `ability:${key}`,
        person.abilities[key],
        config.abilities.initialSurfaceValueRange,
        config.abilities.initialGeneticValueRange,
      );
    }
    for (const key of APTITUDE_KEYS) {
      validateStatTriple(
        person.personId,
        `aptitude:${key}`,
        person.aptitudes[key],
        config.abilities.initialAptitudeRange,
        config.abilities.initialAptitudeGeneticValueRange,
      );
    }

    for (const field of ["birthWeek", "birthWeekOfApril", "birthMonth", "birthday"] as const) {
      if (hasOwn(person, field)) {
        fail("forbidden person birth field present", {
          personId: person.personId,
          field,
        });
      }
    }

    if (person.lifeStatus === "living") {
      if (!hasOwn(person, "participationStatus")) {
        fail("living person requires participationStatus", { personId: person.personId });
      }
      if (!hasOwn(person, "currentAge")) {
        fail("living person requires currentAge", { personId: person.personId });
      }
      if (hasOwn(person, "deathYear")) {
        fail("living person must not have deathYear", { personId: person.personId });
      }
      if (hasOwn(person, "ageAtDeath")) {
        fail("living person must not have ageAtDeath", { personId: person.personId });
      }
      if (person.participationStatus !== "active") {
        fail("living person participationStatus must be active", {
          personId: person.personId,
        });
      }
      if (person.currentAge !== computeCurrentAge(CURRENT_WORLD_YEAR, person.birthYear)) {
        fail("currentAge cache invalid", { personId: person.personId });
      }
      if (person.currentAge !== CURRENT_WORLD_YEAR - person.birthYear) {
        fail("currentAge must equal 1 - birthYear", { personId: person.personId });
      }

      if (person.currentAge >= 0 && person.currentAge <= 7) {
        if (person.careerStatus !== "child") {
          fail("age 0-7 must be child", { personId: person.personId });
        }
        if (hasOwn(person, "lineageId")) {
          fail("child age 0-7 must not have lineageId", { personId: person.personId });
        }
      } else if (person.currentAge >= 8 && person.currentAge <= 15) {
        if (person.careerStatus !== "trainee") {
          fail("age 8-15 must be trainee", { personId: person.personId });
        }
      } else if (person.currentAge >= 16 && person.currentAge <= 41) {
        if (person.careerStatus !== "active_competitor") {
          fail("age 16-41 must be active_competitor", { personId: person.personId });
        }
      } else if (person.currentAge >= 42 && person.currentAge <= 70) {
        if (person.careerStatus !== "retired") {
          fail("age 42-70 must be retired", { personId: person.personId });
        }
      } else {
        fail("living person age out of supported bands", {
          personId: person.personId,
          currentAge: person.currentAge,
        });
      }

      const livingPersonId = person.personId;

      if (person.careerStatus === "child" || person.careerStatus === "trainee") {
        if (hasOwn(person, "currentRank")) {
          fail("child/trainee must not have currentRank", { personId: livingPersonId });
        }
        if (hasOwn(person, "highestRank")) {
          fail("child/trainee must not have highestRank", { personId: livingPersonId });
        }
        if (hasOwn(person, "retirementRank")) {
          fail("child/trainee must not have retirementRank", { personId: livingPersonId });
        }
        if (person.qualifiedMaster !== false) {
          fail("child/trainee qualifiedMaster must be false", { personId: livingPersonId });
        }
      } else if (person.careerStatus === "active_competitor") {
        if (!hasOwn(person, "currentRank") || person.currentRank === undefined) {
          fail("active_competitor requires currentRank", { personId: livingPersonId });
        }
        if (!hasOwn(person, "highestRank") || person.highestRank === undefined) {
          fail("active_competitor requires highestRank", { personId: livingPersonId });
        }
        if (person.currentRank !== person.highestRank) {
          fail("active_competitor currentRank must equal highestRank", {
            personId: livingPersonId,
          });
        }
        if (hasOwn(person, "retirementRank")) {
          fail("active_competitor must not have retirementRank", {
            personId: livingPersonId,
          });
        }
        if (person.qualifiedMaster !== false) {
          fail("active_competitor qualifiedMaster must be false", {
            personId: livingPersonId,
          });
        }
      } else if (person.careerStatus === "retired") {
        if (hasOwn(person, "currentRank")) {
          fail("retired must not have currentRank", { personId: livingPersonId });
        }
        if (!hasOwn(person, "highestRank") || person.highestRank === undefined) {
          fail("retired requires highestRank", { personId: livingPersonId });
        }
        if (!hasOwn(person, "retirementRank") || person.retirementRank === undefined) {
          fail("retired requires retirementRank", { personId: livingPersonId });
        }
        if (person.highestRank !== person.retirementRank) {
          fail("living retired highestRank must equal retirementRank", {
            personId: livingPersonId,
          });
        }
        if (person.qualifiedMaster) {
          if (!isCOrHigher(person.highestRank)) {
            fail("qualifiedMaster requires C-or-higher rank", {
              personId: livingPersonId,
              rank: person.highestRank,
            });
          }
          if (person.lineageId === undefined) {
            fail("qualifiedMaster must have lineageId", { personId: livingPersonId });
          }
        }
      }
    } else {
      if (hasOwn(person, "participationStatus")) {
        fail("deceased must not have participationStatus", { personId: person.personId });
      }
      if (hasOwn(person, "currentAge")) {
        fail("deceased must not have currentAge", { personId: person.personId });
      }
      if (hasOwn(person, "currentRank")) {
        fail("deceased must not have currentRank", { personId: person.personId });
      }
      if (!hasOwn(person, "deathYear")) {
        fail("deceased requires deathYear", { personId: person.personId });
      }
      if (!hasOwn(person, "ageAtDeath")) {
        fail("deceased requires ageAtDeath", { personId: person.personId });
      }
      if (person.careerStatus !== "retired") {
        fail("deceased must have careerStatus retired", {
          personId: person.personId,
          careerStatus: person.careerStatus,
        });
      }
      if (person.highestRank !== MINIMUM_RANK) {
        fail("deceased highestRank must be MINIMUM_RANK", {
          personId: person.personId,
          highestRank: person.highestRank ?? "",
        });
      }
      if (person.retirementRank !== MINIMUM_RANK) {
        fail("deceased retirementRank must be MINIMUM_RANK", {
          personId: person.personId,
          retirementRank: person.retirementRank ?? "",
        });
      }
      if (person.qualifiedMaster !== false) {
        fail("deceased qualifiedMaster must be false", { personId: person.personId });
      }
      if (!(person.birthYear < person.deathYear && person.deathYear <= 0)) {
        fail("deceased requires birthYear < deathYear <= 0", {
          personId: person.personId,
        });
      }
      if (person.ageAtDeath !== person.deathYear - person.birthYear) {
        fail("ageAtDeath mismatch", { personId: person.personId });
      }
      if (
        !inRange(
          person.ageAtDeath,
          config.history.minimumAgeAtDeath,
          config.history.maximumAgeAtDeath,
        )
      ) {
        fail("ageAtDeath out of configured range", {
          personId: person.personId,
          ageAtDeath: person.ageAtDeath,
        });
      }
      if (person.birthYear < config.history.earliestHistoricalYear) {
        fail("birthYear before earliestHistoricalYear", {
          personId: person.personId,
          birthYear: person.birthYear,
        });
      }
    }
  }

  if (config.nameData.avoidDuplicateLivingFullNameWithinFamily) {
    const livingFullNamesByFamily = new Map<string, Set<string>>();
    for (const person of snapshot.persons) {
      if (person.lifeStatus !== "living") {
        continue;
      }
      const key = `${person.givenName}\0${person.familyName}`;
      const existing = livingFullNamesByFamily.get(person.familyId) ?? new Set<string>();
      if (existing.has(key)) {
        fail("duplicate living full name within family", {
          familyId: person.familyId,
          givenName: person.givenName,
          familyName: person.familyName,
          personId: person.personId,
        });
      }
      existing.add(key);
      livingFullNamesByFamily.set(person.familyId, existing);
    }
  }
}

function validateFamilies(config: InitialWorldConfig, snapshot: InitialWorldSnapshot): void {
  const familyNames = new Set<string>();
  for (const family of snapshot.families) {
    if (family.status !== "active") {
      fail("family must be active initially", { familyId: family.familyId });
    }
    if (family.initialHistory !== true) {
      fail("family initialHistory must be true", { familyId: family.familyId });
    }
    if (familyNames.has(family.familyName)) {
      fail("duplicate family names detected", { familyName: family.familyName });
    }
    familyNames.add(family.familyName);
    if (
      !inRange(
        family.baseBirthRate,
        config.families.baseBirthRateRange.min,
        config.families.baseBirthRateRange.max,
      )
    ) {
      fail("baseBirthRate out of range", {
        familyId: family.familyId,
        baseBirthRate: family.baseBirthRate,
      });
    }

    const members = snapshot.persons.filter((p) => p.familyId === family.familyId);
    if (members.length < config.families.minimumMembersPerFamily) {
      fail("family below minimum member count", {
        familyId: family.familyId,
        count: members.length,
      });
    }
    if (members.length > config.families.maximumMembersPerFamily) {
      fail("family above maximum member count", {
        familyId: family.familyId,
        count: members.length,
      });
    }
    const livingCount = members.filter((p) => p.lifeStatus === "living").length;
    if (livingCount < 1) {
      fail("family without living member", { familyId: family.familyId });
    }
  }
}

function validateLineages(snapshot: InitialWorldSnapshot): void {
  const personById = new Map(snapshot.persons.map((p) => [p.personId, p]));
  const lineageNames = new Set<string>();
  const founderFamilyIds = new Set<string>();

  for (const lineage of snapshot.lineages) {
    if (lineage.status !== "active") {
      fail("lineage must be active initially", { lineageId: lineage.lineageId });
    }
    if (!(FOCUS_KEYS as readonly string[]).includes(lineage.focus)) {
      fail("lineage focus must be unarmed/sword/magic", {
        lineageId: lineage.lineageId,
        focus: lineage.focus,
      });
    }
    if (lineageNames.has(lineage.lineageName)) {
      fail("duplicate lineage names detected", { lineageName: lineage.lineageName });
    }
    lineageNames.add(lineage.lineageName);

    if (founderFamilyIds.has(lineage.founderFamilyId)) {
      fail("founderFamilyId must be unique across lineages", {
        founderFamilyId: lineage.founderFamilyId,
        lineageId: lineage.lineageId,
      });
    }
    founderFamilyIds.add(lineage.founderFamilyId);

    const founder = personById.get(lineage.founderPersonId);
    if (founder === undefined) {
      fail("lineage founderPersonId broken", {
        lineageId: lineage.lineageId,
        founderPersonId: lineage.founderPersonId,
      });
    }
    if (!snapshot.families.some((f) => f.familyId === lineage.founderFamilyId)) {
      fail("lineage founderFamilyId broken", {
        lineageId: lineage.lineageId,
        founderFamilyId: lineage.founderFamilyId,
      });
    }
    if (founder.familyId !== lineage.founderFamilyId) {
      fail("founder familyId must match founderFamilyId", {
        lineageId: lineage.lineageId,
      });
    }
    const founderOk =
      (founder.lifeStatus === "living" && founder.careerStatus === "retired") ||
      founder.lifeStatus === "deceased";
    if (!founderOk) {
      fail("lineage founder must be living retired or deceased", {
        lineageId: lineage.lineageId,
      });
    }

    const suffix = LINEAGE_NAME_SUFFIX[lineage.focus as keyof typeof LINEAGE_NAME_SUFFIX];
    const expectedName = `${founder.familyName}${suffix}`;
    if (lineage.lineageName !== expectedName) {
      fail("lineageName must be founder familyName + focus suffix", {
        lineageId: lineage.lineageId,
        expected: expectedName,
        actual: lineage.lineageName,
      });
    }
  }
}

function ancestorDepth(
  personId: string,
  parentOf: Map<string, string[]>,
  visiting: Set<string> = new Set(),
): number {
  if (visiting.has(personId)) {
    return Number.POSITIVE_INFINITY;
  }
  const parents = parentOf.get(personId) ?? [];
  if (parents.length === 0) {
    return 0;
  }
  visiting.add(personId);
  let maxDepth = 0;
  for (const parentId of parents) {
    maxDepth = Math.max(maxDepth, 1 + ancestorDepth(parentId, parentOf, visiting));
  }
  visiting.delete(personId);
  return maxDepth;
}

function validateParentRelationships(
  config: InitialWorldConfig,
  snapshot: InitialWorldSnapshot,
): void {
  const personById = new Map(snapshot.persons.map((p) => [p.personId, p]));
  const parentRels = snapshot.relationships.filter((r) => r.kind === "parent_child");
  const drafts = parentRels.map((r) => ({
    parentId: r.parentId,
    childId: r.childId,
    parentRole: r.parentRole,
  }));
  const parentOf = new Map<string, string[]>();
  const fathers = new Map<string, string>();
  const mothers = new Map<string, string>();

  for (const rel of parentRels) {
    if (!personById.has(rel.parentId) || !personById.has(rel.childId)) {
      fail("parent relationship broken reference", {
        relationshipId: rel.relationshipId,
      });
    }
    if (rel.parentId === rel.childId) {
      fail("parent relationship self-reference", {
        relationshipId: rel.relationshipId,
      });
    }
    const parent = personById.get(rel.parentId);
    const child = personById.get(rel.childId);
    if (parent === undefined || child === undefined) {
      fail("parent relationship broken reference", {
        relationshipId: rel.relationshipId,
      });
    }
    if (rel.parentRole === "father") {
      if (parent.sex !== "male") {
        fail("father parentRole requires male parent", {
          relationshipId: rel.relationshipId,
        });
      }
      if (fathers.has(rel.childId)) {
        fail("child has more than one father", { childId: rel.childId });
      }
      fathers.set(rel.childId, rel.parentId);
    } else {
      if (parent.sex !== "female") {
        fail("mother parentRole requires female parent", {
          relationshipId: rel.relationshipId,
        });
      }
      if (mothers.has(rel.childId)) {
        fail("child has more than one mother", { childId: rel.childId });
      }
      mothers.set(rel.childId, rel.parentId);
    }

    const parents = parentOf.get(rel.childId) ?? [];
    parents.push(rel.parentId);
    if (parents.length > config.relationships.maximumBiologicalParents) {
      fail("child has too many parents", {
        childId: rel.childId,
        count: parents.length,
      });
    }
    parentOf.set(rel.childId, parents);

    const ageGap = child.birthYear - parent.birthYear;
    if (ageGap < config.relationships.minimumParentAgeAtChildbirth) {
      fail("parent age at childbirth below minimum", {
        relationshipId: rel.relationshipId,
        ageGap,
      });
    }
    if (parent.lifeStatus === "deceased" && parent.deathYear < child.birthYear) {
      fail("deceased parent not alive at child birthYear", {
        relationshipId: rel.relationshipId,
      });
    }
  }

  if (countParentCycles(drafts) > 0) {
    fail("parent cycle detected", { count: countParentCycles(drafts) });
  }

  for (const person of snapshot.persons) {
    const depth = ancestorDepth(person.personId, parentOf);
    if (depth > config.history.maximumGenerationDepth) {
      fail("ancestor depth exceeds maximumGenerationDepth", {
        personId: person.personId,
        depth,
        maximumGenerationDepth: config.history.maximumGenerationDepth,
      });
    }
  }
}

function validateMarriageRelationships(snapshot: InitialWorldSnapshot): void {
  const personById = new Map(snapshot.persons.map((p) => [p.personId, p]));
  const parentRels = snapshot.relationships
    .filter((r) => r.kind === "parent_child")
    .map((r) => ({
      parentId: r.parentId,
      childId: r.childId,
      parentRole: r.parentRole,
    }));
  const maps = buildParentMaps(parentRels);
  const married = new Set<string>();

  for (const rel of snapshot.relationships.filter((r) => r.kind === "marriage")) {
    if (!personById.has(rel.personAId) || !personById.has(rel.personBId)) {
      fail("marriage broken reference", { relationshipId: rel.relationshipId });
    }
    if (rel.personAId === rel.personBId) {
      fail("marriage self-reference", { relationshipId: rel.relationshipId });
    }
    if (rel.personAId >= rel.personBId) {
      fail("marriage requires personAId < personBId", {
        relationshipId: rel.relationshipId,
      });
    }
    if (married.has(rel.personAId) || married.has(rel.personBId)) {
      fail("person has more than one spouse", {
        relationshipId: rel.relationshipId,
      });
    }
    married.add(rel.personAId);
    married.add(rel.personBId);

    const a = personById.get(rel.personAId);
    const b = personById.get(rel.personBId);
    if (a === undefined || b === undefined) {
      fail("marriage broken reference", { relationshipId: rel.relationshipId });
    }
    for (const person of [a, b]) {
      if (person.lifeStatus !== "living" || person.careerStatus !== "retired") {
        fail("marriage partners must be living retired", {
          relationshipId: rel.relationshipId,
          personId: person.personId,
        });
      }
    }

    if (isMarriageProhibited(rel.personAId, rel.personBId, parentRels, maps)) {
      fail("prohibited marriage relationship", {
        relationshipId: rel.relationshipId,
      });
    }
  }
}

function validateMasterRelationships(snapshot: InitialWorldSnapshot): void {
  const personById = new Map(snapshot.persons.map((p) => [p.personId, p]));
  const disciples = new Set<string>();
  const masterRels = snapshot.relationships.filter((r) => r.kind === "master_disciple");

  for (const rel of masterRels) {
    if (!personById.has(rel.masterId) || !personById.has(rel.discipleId)) {
      fail("master relationship broken reference", {
        relationshipId: rel.relationshipId,
      });
    }
    if (rel.masterId === rel.discipleId) {
      fail("master relationship self-reference", {
        relationshipId: rel.relationshipId,
      });
    }
    if (disciples.has(rel.discipleId)) {
      fail("disciple has more than one formal master", {
        discipleId: rel.discipleId,
      });
    }
    disciples.add(rel.discipleId);

    const master = personById.get(rel.masterId);
    const disciple = personById.get(rel.discipleId);
    if (master === undefined || disciple === undefined) {
      fail("master relationship broken reference", {
        relationshipId: rel.relationshipId,
      });
    }

    if (
      master.lifeStatus !== "living" ||
      master.careerStatus !== "retired" ||
      !master.qualifiedMaster
    ) {
      fail("master does not meet formal master conditions", {
        masterId: rel.masterId,
      });
    }
    if (
      !hasOwn(master, "highestRank") ||
      master.highestRank === undefined ||
      !isCOrHigher(master.highestRank)
    ) {
      fail("master must be C-or-higher", { masterId: rel.masterId });
    }
    if (master.lineageId === undefined) {
      fail("master must have lineageId", { masterId: rel.masterId });
    }
    if (
      disciple.lifeStatus !== "living" ||
      disciple.participationStatus !== "active" ||
      disciple.currentAge < 8 ||
      disciple.currentAge > 41
    ) {
      fail("disciple must be living active age 8-41", {
        discipleId: rel.discipleId,
      });
    }
    if (disciple.lineageId !== master.lineageId) {
      fail("disciple lineageId must match master lineageId", {
        discipleId: rel.discipleId,
        masterId: rel.masterId,
      });
    }
  }

  if (
    countMasterCycles(masterRels.map((r) => ({ masterId: r.masterId, discipleId: r.discipleId }))) >
    0
  ) {
    fail("master cycle detected");
  }
}

function validateSummary(config: InitialWorldConfig, snapshot: InitialWorldSnapshot): void {
  const recomputed = buildGenerationSummary(
    config,
    snapshot.persons,
    snapshot.families,
    snapshot.lineages,
    snapshot.relationships,
    snapshot.generationSummary.warnings,
  );

  let recomputedCanonical: string;
  let snapshotCanonical: string;
  try {
    recomputedCanonical = toCanonicalJson(recomputed);
    snapshotCanonical = toCanonicalJson(snapshot.generationSummary);
  } catch (error) {
    fail("generationSummary canonical JSON comparison failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (recomputedCanonical !== snapshotCanonical) {
    fail("generationSummary does not match recomputed summary");
  }

  const validationSummary = buildValidationSummary(snapshot.generationSummary);
  if (!validationSummary.passed) {
    fail("reference or cycle validation failed", {
      brokenReferenceCount: snapshot.generationSummary.brokenReferenceCount,
      selfReferenceCount: snapshot.generationSummary.selfReferenceCount,
      parentCycleCount: snapshot.generationSummary.parentCycleCount,
      masterCycleCount: snapshot.generationSummary.masterCycleCount,
    });
  }
}

export function validateInitialWorldSnapshot(
  config: InitialWorldConfig,
  snapshot: unknown,
): asserts snapshot is InitialWorldSnapshot {
  assertSnapshotStructure(snapshot);
  validateMeta(config, snapshot);
  validateSequentialIds(snapshot);
  validateRelationshipCreationFlag(config, snapshot);
  validateOrdering(snapshot);
  validateHardPopulationTargets(config, snapshot);
  validatePersons(config, snapshot);
  validateFamilies(config, snapshot);
  validateLineages(snapshot);
  validateParentRelationships(config, snapshot);
  validateMarriageRelationships(snapshot);
  validateMasterRelationships(snapshot);
  validateSummary(config, snapshot);
}
