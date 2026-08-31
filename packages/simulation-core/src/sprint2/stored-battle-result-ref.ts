/**
 * S02-006 StoredBattleResultRef construction (Sprint2-owned; S02-005 owns integrity-on-apply).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { MatchId, SimulationId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { STORED_BATTLE_RESULT_REF_SCHEMA_VERSION } from "./constants.js";
import type { StoredBattleResultRecord } from "./stored-battle-result.js";

export type TournamentBattleSlotIdentity = {
  slotId: string;
  matchOrdinal: number;
};

export type StoredBattleResultRef = {
  schemaVersion: typeof STORED_BATTLE_RESULT_REF_SCHEMA_VERSION;
  simulationId: SimulationId;
  tournamentId: TournamentId;
  slotId: string;
  matchOrdinal: number;
  matchId: MatchId;
  battleResultHash: string;
  refHash: string;
};

const SLOT_ID_PATTERN = /^slot-[0-9]{6}$/;

export function formatTournamentSlotId(matchOrdinal: number): string {
  if (!Number.isInteger(matchOrdinal) || matchOrdinal < 0) {
    throw new Error("matchOrdinal must be a non-negative integer");
  }
  return `slot-${String(matchOrdinal).padStart(6, "0")}`;
}

export function validateTournamentBattleSlotIdentity(
  identity: TournamentBattleSlotIdentity,
): ValidationResult<TournamentBattleSlotIdentity> {
  const issues: ValidationIssue[] = [];
  if (!SLOT_ID_PATTERN.test(identity.slotId)) {
    issues.push({
      path: "/slotId",
      message: "slotId must follow slot-XXXXXX format",
      actual: identity.slotId,
      expected: SLOT_ID_PATTERN.source,
    });
  }
  if (!Number.isInteger(identity.matchOrdinal) || identity.matchOrdinal < 0) {
    issues.push({
      path: "/matchOrdinal",
      message: "matchOrdinal must be a non-negative integer",
      actual: identity.matchOrdinal,
      expected: "non-negative integer",
    });
  }
  if (issues.length === 0 && identity.slotId !== formatTournamentSlotId(identity.matchOrdinal)) {
    issues.push({
      path: "/slotId",
      message: "slotId must match canonical derivation from matchOrdinal",
      actual: identity.slotId,
      expected: formatTournamentSlotId(identity.matchOrdinal),
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(identity);
}

function buildRefHashMaterial(
  ref: Omit<StoredBattleResultRef, "refHash">,
): Record<string, unknown> {
  return {
    schemaVersion: ref.schemaVersion,
    simulationId: ref.simulationId,
    tournamentId: ref.tournamentId,
    slotId: ref.slotId,
    matchOrdinal: ref.matchOrdinal,
    matchId: ref.matchId,
    battleResultHash: ref.battleResultHash,
  };
}

export function computeStoredBattleResultRefHash(
  ref: Omit<StoredBattleResultRef, "refHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildRefHashMaterial(ref)), "/refHash");
}

export function validateStoredBattleResultRef(
  ref: StoredBattleResultRef,
  provider: Sha256Provider,
): ValidationResult<StoredBattleResultRef> {
  const issues: ValidationIssue[] = [];
  if (ref.schemaVersion !== STORED_BATTLE_RESULT_REF_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "stored battle result ref schemaVersion mismatch",
      actual: ref.schemaVersion,
      expected: STORED_BATTLE_RESULT_REF_SCHEMA_VERSION,
    });
  }
  const slot = validateTournamentBattleSlotIdentity({
    slotId: ref.slotId,
    matchOrdinal: ref.matchOrdinal,
  });
  if (!slot.ok) {
    issues.push(...slot.issues);
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  const { refHash, ...withoutHash } = ref;
  const expected = computeStoredBattleResultRefHash(withoutHash, provider);
  if (!expected.ok) {
    return expected;
  }
  if (refHash !== expected.value) {
    return failure([
      {
        path: "/refHash",
        message: "stored battle result ref hash tamper detected",
        actual: refHash,
        expected: expected.value,
      },
    ]);
  }
  return success(deepFreezePlainJson(ref));
}

export type BuildStoredBattleResultRefInput = {
  record: StoredBattleResultRecord;
  tournamentId: TournamentId;
  slotIdentity: TournamentBattleSlotIdentity;
};

export function buildStoredBattleResultRef(
  input: BuildStoredBattleResultRefInput,
  provider: Sha256Provider,
): ValidationResult<StoredBattleResultRef> {
  const slot = validateTournamentBattleSlotIdentity(input.slotIdentity);
  if (!slot.ok) {
    return slot;
  }
  if (input.record.tournamentId !== undefined && input.record.tournamentId !== input.tournamentId) {
    return failure([
      {
        path: "/record/tournamentId",
        message: "stored battle result record tournamentId mismatch",
        actual: input.record.tournamentId,
        expected: input.tournamentId,
      },
    ]);
  }
  const withoutHash: Omit<StoredBattleResultRef, "refHash"> = {
    schemaVersion: STORED_BATTLE_RESULT_REF_SCHEMA_VERSION,
    simulationId: input.record.simulationId,
    tournamentId: input.tournamentId,
    slotId: input.slotIdentity.slotId,
    matchOrdinal: input.slotIdentity.matchOrdinal,
    matchId: input.record.matchId,
    battleResultHash: input.record.battleResultHash,
  };
  const refHash = computeStoredBattleResultRefHash(withoutHash, provider);
  if (!refHash.ok) {
    return refHash;
  }
  return validateStoredBattleResultRef(
    {
      ...withoutHash,
      refHash: refHash.value,
    },
    provider,
  );
}
