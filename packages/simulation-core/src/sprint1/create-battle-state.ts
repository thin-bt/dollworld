/**
 * Internal stage 1 of the battle start transaction: turn a validated
 * `CreateBattleRequest` plus an already reserved MatchId and battle seed into a
 * `ready` `BattleState` (11 mini-spec §4 / §9 / §10 / S01-005).
 *
 * Not exported from the package root. It receives neither the world RNG nor the
 * MatchId generator state and therefore cannot advance either (11 §10).
 */
import { createSeededRng } from "../rng.js";
import type { SeededRngState } from "../rng.js";
import { asSimulationId } from "../ids.js";
import type { MatchId, SimulationId, TechniqueId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldDate } from "../world-date.js";
import { validateBattleActionSourceIdentity } from "./battle-action-source-identity.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import { isBattleKind } from "./battle-enums.js";
import type { BattleKind } from "./battle-enums.js";
import {
  preflightBattleParticipant,
  sealBattleParticipantWithSourceHash,
} from "./battle-participant.js";
import type {
  BattleParticipantSnapshot,
  PreflightBattleParticipantSnapshot,
} from "./battle-participant.js";
import { createBattleRulesSnapshotRef } from "./battle-rules-snapshot-ref.js";
import type { BattleRulesSnapshotRef } from "./battle-rules-snapshot-ref.js";
import {
  computeBattleInputHash,
  createEmptyBattleDetailedLog,
  parseWorldDate,
  validateBattleState,
  validateInitialReadyBattleState,
} from "./battle-state.js";
import type { BattleState } from "./battle-state.js";
import { BATTLE_STATE_SCHEMA_VERSION } from "./constants.js";
import { isMatchIdText } from "./match-id-generator.js";
import {
  assertNoAccessors,
  hasOwn,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireNonEmptyTrimmedString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import {
  preflightRunRuleSnapshotStructure,
  verifyRunRuleSnapshotHashes,
} from "./run-rule-snapshot.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import { BATTLE_RANGES } from "./types.js";
import type { BattleRange } from "./types.js";
import { collectKnownTechniqueIdsForBattle } from "../sprint3/generated-technique-battle-catalog.js";
import type { GeneratedTechniqueCatalogOverlay } from "../sprint3/generated-technique-catalog-overlay.js";
import { readOptionalGeneratedTechniqueCatalogOverlay } from "../sprint3/generated-technique-battle-catalog.js";

export const CREATE_BATTLE_REQUEST_KEYS = [
  "simulationId",
  "worldDate",
  "battleKind",
  "participantA",
  "participantB",
  "participantAActionSourceIdentity",
  "participantBActionSourceIdentity",
  "runRuleSnapshot",
  "initialRange",
  "generatedTechniqueCatalogOverlay",
] as const;

export type CreateBattleRequest = {
  simulationId: SimulationId;
  worldDate: WorldDate;
  battleKind: BattleKind;
  participantA: unknown;
  participantB: unknown;
  participantAActionSourceIdentity: unknown;
  participantBActionSourceIdentity: unknown;
  runRuleSnapshot: unknown;
  initialRange?: BattleRange;
};

export type ValidatedCreateBattleRequest = {
  simulationId: SimulationId;
  worldDate: WorldDate;
  battleKind: BattleKind;
  participantA: BattleParticipantSnapshot;
  participantB: BattleParticipantSnapshot;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  runRuleSnapshot: RunRuleSnapshot;
  initialRange: BattleRange;
  battleRulesSnapshotRef: BattleRulesSnapshotRef;
};

/** Phase 1 intake: structure / semantics / refs with no Sha256Provider calls. */
export type PreflightCreateBattleRequest = {
  simulationId: SimulationId;
  worldDate: WorldDate;
  battleKind: BattleKind;
  participantA: PreflightBattleParticipantSnapshot;
  participantB: PreflightBattleParticipantSnapshot;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  runRuleSnapshot: RunRuleSnapshot;
  initialRange: BattleRange;
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay;
};

export type InternalCreateBattleStateInput = {
  createBattleRequest: ValidatedCreateBattleRequest;
  reservedMatchId: MatchId;
  battleSeed: number;
};

const UINT32_MAXIMUM = 4294967295;

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

/**
 * Bind a `default_strategy` action source to the run's strategy version and
 * Sprint1Config hash (11 §4.2). `scripted_actions` is left to structural
 * validation only. Declared values only — hash authenticity is Phase 2.
 */
function bindDefaultStrategyToRunRuleSnapshot(
  identity: BattleActionSourceIdentity,
  runRuleSnapshot: RunRuleSnapshot,
  pathPrefix: string,
): ValidationResult<true> {
  if (identity.kind !== "default_strategy") {
    return success(true);
  }
  const issues: ValidationIssue[] = [];
  if (identity.strategyVersion !== runRuleSnapshot.defaultBattleStrategyVersion) {
    issues.push({
      path: `${pathPrefix}/strategyVersion`,
      message:
        "default_strategy strategyVersion must equal RunRuleSnapshot.defaultBattleStrategyVersion",
      actual: identity.strategyVersion,
      expected: runRuleSnapshot.defaultBattleStrategyVersion,
    });
  }
  if (identity.strategyConfigHash !== runRuleSnapshot.sprint1ConfigHash) {
    issues.push({
      path: `${pathPrefix}/strategyConfigHash`,
      message: "default_strategy strategyConfigHash must equal RunRuleSnapshot.sprint1ConfigHash",
      actual: identity.strategyConfigHash,
      expected: runRuleSnapshot.sprint1ConfigHash,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(true);
}

/**
 * Phase 1 CreateBattleRequest intake: no Sha256Provider calls.
 */
export function preflightCreateBattleRequest(
  input: unknown,
): ValidationResult<PreflightCreateBattleRequest> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "CreateBattleRequest must be a plain object",
              actual: input,
              expected: "CreateBattleRequest",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, CREATE_BATTLE_REQUEST_KEYS, "", issues);

  const simulationIdText = requireNonEmptyTrimmedString(object, "simulationId", "", issues);
  const worldDate = parseWorldDate(object["worldDate"], "/worldDate", issues);

  let battleKind: BattleKind | undefined;
  if (!isBattleKind(object["battleKind"])) {
    issues.push({
      path: "/battleKind",
      message: "battleKind must be one of the fixed BattleKind values",
      actual: object["battleKind"],
      expected: "official | mock",
    });
  } else {
    battleKind = object["battleKind"];
  }

  let initialRange: BattleRange | undefined;
  let initialRangeProvided = false;
  if (hasOwn(object, "initialRange") && object["initialRange"] !== undefined) {
    initialRangeProvided = true;
    const value = object["initialRange"];
    if (typeof value !== "string" || !(BATTLE_RANGES as readonly string[]).includes(value)) {
      issues.push({
        path: "/initialRange",
        message: "initialRange must be one of the fixed BattleRange values",
        actual: value,
        expected: BATTLE_RANGES.join(" | "),
      });
    } else {
      initialRange = value as BattleRange;
    }
  }

  let runRuleSnapshot: RunRuleSnapshot | undefined;
  const snapshotResult = preflightRunRuleSnapshotStructure(object["runRuleSnapshot"]);
  if (snapshotResult.ok) {
    runRuleSnapshot = snapshotResult.value;
  } else {
    issues.push(...prefix(snapshotResult.issues, "/runRuleSnapshot"));
  }

  const identities: Partial<
    Record<
      "participantAActionSourceIdentity" | "participantBActionSourceIdentity",
      BattleActionSourceIdentity
    >
  > = {};
  for (const key of [
    "participantAActionSourceIdentity",
    "participantBActionSourceIdentity",
  ] as const) {
    const result = validateBattleActionSourceIdentity(object[key]);
    if (result.ok) {
      identities[key] = result.value;
    } else {
      issues.push(...prefix(result.issues, `/${key}`));
    }
  }

  if (
    simulationIdText === undefined ||
    worldDate === undefined ||
    battleKind === undefined ||
    runRuleSnapshot === undefined ||
    (initialRangeProvided && initialRange === undefined) ||
    identities.participantAActionSourceIdentity === undefined ||
    identities.participantBActionSourceIdentity === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const simulationId = asSimulationId(simulationIdText);
  if (simulationId !== runRuleSnapshot.simulationId) {
    return failure([
      {
        path: "/simulationId",
        message: "simulationId must match the RunRuleSnapshot the battle runs under",
        actual: simulationId,
        expected: runRuleSnapshot.simulationId,
      },
    ]);
  }

  for (const [key, identity] of [
    ["participantAActionSourceIdentity", identities.participantAActionSourceIdentity],
    ["participantBActionSourceIdentity", identities.participantBActionSourceIdentity],
  ] as const) {
    const binding = bindDefaultStrategyToRunRuleSnapshot(identity, runRuleSnapshot, `/${key}`);
    if (!binding.ok) {
      return failure(binding.issues);
    }
  }

  const resolvedInitialRange =
    initialRange ?? runRuleSnapshot.sprint1Config.battle.defaultInitialRange;

  const generatedTechniqueCatalogOverlay = readOptionalGeneratedTechniqueCatalogOverlay(
    object,
    "",
    issues,
  );

  const knownTechniqueIds = collectKnownTechniqueIdsForBattle(
    runRuleSnapshot.techniqueDefinitions,
    generatedTechniqueCatalogOverlay,
  );

  const participants: Partial<
    Record<"participantA" | "participantB", PreflightBattleParticipantSnapshot>
  > = {};
  for (const [key, side] of [
    ["participantA", "sideA"],
    ["participantB", "sideB"],
  ] as const) {
    const result = preflightBattleParticipant(object[key], {
      side,
      battleKind,
      worldDate,
      config: runRuleSnapshot.sprint1Config,
      knownTechniqueIds,
    });
    if (result.ok) {
      participants[key] = result.value;
    } else {
      issues.push(...prefix(result.issues, `/${key}`));
    }
  }

  if (
    participants.participantA === undefined ||
    participants.participantB === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (participants.participantA.personId === participants.participantB.personId) {
    return failure([
      {
        path: "/participantB/personId",
        message: "the two battle participants must be different persons",
        actual: participants.participantB.personId,
        expected: `!= ${participants.participantA.personId}`,
      },
    ]);
  }

  return success({
    simulationId,
    worldDate,
    battleKind,
    participantA: participants.participantA,
    participantB: participants.participantB,
    participantAActionSourceIdentity: identities.participantAActionSourceIdentity,
    participantBActionSourceIdentity: identities.participantBActionSourceIdentity,
    runRuleSnapshot,
    initialRange: resolvedInitialRange,
    ...(generatedTechniqueCatalogOverlay === undefined
      ? {}
      : { generatedTechniqueCatalogOverlay }),
  });
}

/**
 * Phase 2: recompute RunRuleSnapshot / participant / BattleRulesSnapshotRef hashes.
 */
export function verifyCreateBattleRequestHashes(
  preflight: PreflightCreateBattleRequest,
  provider: Sha256Provider,
): ValidationResult<ValidatedCreateBattleRequest> {
  const runRuleSnapshot = verifyRunRuleSnapshotHashes(preflight.runRuleSnapshot, provider);
  if (!runRuleSnapshot.ok) {
    return failure(prefix(runRuleSnapshot.issues, "/runRuleSnapshot"));
  }

  const participantA = sealBattleParticipantWithSourceHash(preflight.participantA, provider);
  if (!participantA.ok) {
    return failure(prefix(participantA.issues, "/participantA"));
  }
  const participantB = sealBattleParticipantWithSourceHash(preflight.participantB, provider);
  if (!participantB.ok) {
    return failure(prefix(participantB.issues, "/participantB"));
  }

  // 11 §8: relevantTechniqueIds are the acquired-technique union only.
  const relevantTechniqueIds: TechniqueId[] = [
    ...participantA.value.techniques
      .filter((state) => state.acquiredAbsoluteWeek !== null)
      .map((state) => state.techniqueId),
    ...participantB.value.techniques
      .filter((state) => state.acquiredAbsoluteWeek !== null)
      .map((state) => state.techniqueId),
  ];
  const refResult = createBattleRulesSnapshotRef(
    runRuleSnapshot.value,
    relevantTechniqueIds,
    provider,
  );
  if (!refResult.ok) {
    return failure(prefix(refResult.issues, "/battleRulesSnapshotRef"));
  }

  return success({
    simulationId: preflight.simulationId,
    worldDate: preflight.worldDate,
    battleKind: preflight.battleKind,
    participantA: participantA.value,
    participantB: participantB.value,
    participantAActionSourceIdentity: preflight.participantAActionSourceIdentity,
    participantBActionSourceIdentity: preflight.participantBActionSourceIdentity,
    runRuleSnapshot: runRuleSnapshot.value,
    initialRange: preflight.initialRange,
    battleRulesSnapshotRef: refResult.value,
  });
}

/**
 * Full request intake (11 §14). Also derives the per-battle
 * `BattleRulesSnapshotRef` because it needs the same validated run snapshot and
 * the union of both participants' acquired TechniqueIds.
 */
export function validateCreateBattleRequest(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<ValidatedCreateBattleRequest> {
  const preflight = preflightCreateBattleRequest(input);
  if (!preflight.ok) {
    return failure(preflight.issues);
  }
  return verifyCreateBattleRequestHashes(preflight.value, provider);
}

/** Internal stage: validated request + reserved MatchId + battle seed → `ready` BattleState. */
export function createBattleState(
  input: InternalCreateBattleStateInput,
  provider: Sha256Provider,
): ValidationResult<BattleState> {
  if (!isMatchIdText(input.reservedMatchId)) {
    return failure([
      {
        path: "/reservedMatchId",
        message: "reservedMatchId must be a match-id-generator-0.1.0 MatchId",
        actual: input.reservedMatchId,
        expected: "^match_[0-9]{12}$ with numeric part 1..999999999999",
      },
    ]);
  }

  const seedIssues: ValidationIssue[] = [];
  const battleSeed = requireIntegerInRange(
    { battleSeed: input.battleSeed },
    "battleSeed",
    "",
    0,
    UINT32_MAXIMUM,
    seedIssues,
  );
  if (battleSeed === undefined) {
    return failure(seedIssues);
  }

  const validated = input.createBattleRequest;

  const battleInputHashResult = computeBattleInputHash(
    {
      matchId: input.reservedMatchId,
      simulationId: validated.simulationId,
      worldDate: validated.worldDate,
      battleKind: validated.battleKind,
      initialRange: validated.initialRange,
      participantASourceSnapshotHash: validated.participantA.sourceSnapshotHash,
      participantBSourceSnapshotHash: validated.participantB.sourceSnapshotHash,
      battleRulesRefHash: validated.battleRulesSnapshotRef.battleRulesRefHash,
      runRuleSnapshotHash: validated.runRuleSnapshot.runRuleSnapshotHash,
      participantAActionSourceIdentity: validated.participantAActionSourceIdentity,
      participantBActionSourceIdentity: validated.participantBActionSourceIdentity,
      battleSeed,
    },
    provider,
  );
  if (!battleInputHashResult.ok) {
    return failure(battleInputHashResult.issues);
  }
  const battleInputHash = battleInputHashResult.value;

  const rngState: SeededRngState = createSeededRng(battleSeed).exportState();

  const candidate = {
    schemaVersion: BATTLE_STATE_SCHEMA_VERSION,
    matchId: input.reservedMatchId,
    simulationId: validated.simulationId,
    battleKind: validated.battleKind,
    worldDate: validated.worldDate,
    participantAActionSourceIdentity: validated.participantAActionSourceIdentity,
    participantBActionSourceIdentity: validated.participantBActionSourceIdentity,
    sprint1ConfigVersion: validated.runRuleSnapshot.sprint1ConfigVersion,
    battleRulesSnapshotRef: validated.battleRulesSnapshotRef,
    battleRulesRefHash: validated.battleRulesSnapshotRef.battleRulesRefHash,
    runRuleSnapshotHash: validated.runRuleSnapshot.runRuleSnapshotHash,
    battleInputHash,
    battleSeed,
    rngState,
    maxTurns: validated.runRuleSnapshot.sprint1Config.battle.maxTurns,
    turnNumber: 0,
    initialRange: validated.initialRange,
    range: validated.initialRange,
    participantA: validated.participantA,
    participantB: validated.participantB,
    status: "ready" as const,
    terminalReason: null,
    failure: null,
    actionSequence: 0,
    detailedLog: createEmptyBattleDetailedLog(),
  };

  const state = validateBattleState(candidate, provider);
  if (!state.ok) {
    return failure(state.issues);
  }
  return validateInitialReadyBattleState(state.value);
}
