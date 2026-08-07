/**
 * ScriptedActionSource binding checks (S1-SPEC-0.1.14).
 * Pure structure/hash contracts — no turn resolution.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import {
  computeActionScriptHash,
  validateCanonicalBattleActionScriptString,
} from "./battle-action-script.js";
import { BATTLE_ACTION_SCRIPT_FORMAT_VERSION } from "./constants.js";

export type ScriptedSourceBindingInput = {
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  /** Shared canonical script string when both sides are scripted. */
  canonicalScript: string;
  expectedMaxTurns: number;
};

/**
 * Enforce both-side scripted mode with identical identity hashes and canonical script.
 * Mixed default/scripted → failure. Hash / format / script body mismatch → failure.
 */
export function validateScriptedBothSideBinding(
  input: ScriptedSourceBindingInput,
  provider: Sha256Provider,
): ValidationResult<true> {
  const a = input.participantAActionSourceIdentity;
  const b = input.participantBActionSourceIdentity;

  if (a.kind === "default_strategy" && b.kind === "default_strategy") {
    return success(true);
  }

  if (a.kind !== "scripted_actions" || b.kind !== "scripted_actions") {
    return failure([
      {
        path: "/actionSourceIdentity",
        message:
          "scripted mode requires both sides to be scripted_actions with the same full-match script; mixed default_strategy/scripted_actions is rejected",
        actual: { a: a.kind, b: b.kind },
        expected: "both default_strategy OR both scripted_actions",
      },
    ]);
  }

  if (
    a.scriptFormatVersion !== BATTLE_ACTION_SCRIPT_FORMAT_VERSION ||
    b.scriptFormatVersion !== BATTLE_ACTION_SCRIPT_FORMAT_VERSION
  ) {
    return failure([
      {
        path: "/scriptFormatVersion",
        message: "scriptFormatVersion must equal battle-action-script-0.1.0 on both sides",
        actual: { a: a.scriptFormatVersion, b: b.scriptFormatVersion },
        expected: BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
      },
    ]);
  }

  if (a.actionScriptHash !== b.actionScriptHash) {
    return failure([
      {
        path: "/actionScriptHash",
        message: "both scripted sides must declare the same actionScriptHash",
        actual: { a: a.actionScriptHash, b: b.actionScriptHash },
        expected: "identical hashes",
      },
    ]);
  }

  const parsed = validateCanonicalBattleActionScriptString(
    input.canonicalScript,
    input.expectedMaxTurns,
  );
  if (!parsed.ok) {
    return failure(parsed.issues);
  }

  const computed = computeActionScriptHash(parsed.value.canonicalScript, provider);
  if (!computed.ok) {
    return failure(computed.issues);
  }
  if (computed.value !== a.actionScriptHash) {
    return failure([
      {
        path: "/actionScriptHash",
        message:
          "actionScriptHash must equal SHA-256(UTF-8 bytes of canonicalScript) and match both identities",
        actual: a.actionScriptHash,
        expected: computed.value,
      },
    ]);
  }

  return success(true);
}
