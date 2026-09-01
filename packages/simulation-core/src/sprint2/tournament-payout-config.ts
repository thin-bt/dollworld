/**
 * S02-008 configurable tournament payout lookup (externalized prize amounts).
 * Ranking consumes awarded amounts from this seam; no payout literals in ranking logic.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  TOURNAMENT_AWARD_TIERS,
  TOURNAMENT_KINDS,
  TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION,
  type TournamentAwardTier,
  type TournamentKind,
} from "./constants.js";

export type TournamentPayoutTable = Record<TournamentKind, Record<TournamentAwardTier, number>>;

export type TournamentPayoutConfig = {
  schemaVersion: typeof TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION;
  configVersion: string;
  payouts: TournamentPayoutTable;
  configHash: string;
};

export const TOURNAMENT_PAYOUT_CONFIG_VERSION_DEFAULT = "tournament-payout-0.1.0-provisional" as const;

export function createDefaultTournamentPayoutTable(): TournamentPayoutTable {
  return {
    normal: {
      champion: 100_000,
      runner_up: 50_000,
      top_four: 25_000,
      completed: 10_000,
    },
    open: {
      champion: 150_000,
      runner_up: 75_000,
      top_four: 35_000,
      completed: 15_000,
    },
    limited: {
      champion: 80_000,
      runner_up: 40_000,
      top_four: 20_000,
      completed: 8_000,
    },
    promotion: {
      champion: 20_000,
      runner_up: 10_000,
      top_four: 5_000,
      completed: 2_000,
    },
  };
}

function buildConfigHashMaterial(
  config: Omit<TournamentPayoutConfig, "configHash">,
): Record<string, unknown> {
  return {
    schemaVersion: config.schemaVersion,
    configVersion: config.configVersion,
    payouts: config.payouts,
  };
}

export function computeTournamentPayoutConfigHash(
  config: Omit<TournamentPayoutConfig, "configHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildConfigHashMaterial(config)), "/configHash");
}

export function createDefaultTournamentPayoutConfig(
  provider: Sha256Provider,
): ValidationResult<TournamentPayoutConfig> {
  const withoutHash = {
    schemaVersion: TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION,
    configVersion: TOURNAMENT_PAYOUT_CONFIG_VERSION_DEFAULT,
    payouts: createDefaultTournamentPayoutTable(),
  } satisfies Omit<TournamentPayoutConfig, "configHash">;
  const hash = computeTournamentPayoutConfigHash(withoutHash, provider);
  if (!hash.ok) {
    return hash;
  }
  return success(
    deepFreezePlainJson({
      ...withoutHash,
      configHash: hash.value,
    }),
  );
}

export function validateTournamentPayoutConfig(
  config: TournamentPayoutConfig,
  provider: Sha256Provider,
): ValidationResult<TournamentPayoutConfig> {
  const issues: ValidationIssue[] = [];
  if (config.schemaVersion !== TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "tournament payout config schemaVersion mismatch",
      actual: config.schemaVersion,
      expected: TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION,
    });
  }

  for (const kind of TOURNAMENT_KINDS) {
    const row = config.payouts[kind];
    if (row === undefined) {
      issues.push({
        path: `/payouts/${kind}`,
        message: "missing payout row for tournament kind",
        expected: "TournamentPayoutTable row",
      });
      continue;
    }
    for (const tier of TOURNAMENT_AWARD_TIERS) {
      const amount = row[tier];
      if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
        issues.push({
          path: `/payouts/${kind}/${tier}`,
          message: "payout amount must be a safe non-negative integer",
          actual: amount,
        });
      }
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const { configHash, ...withoutHash } = config;
  const expected = computeTournamentPayoutConfigHash(withoutHash, provider);
  if (!expected.ok) {
    return expected;
  }
  if (expected.value !== configHash) {
    return failure([
      {
        path: "/configHash",
        message: "tournament payout config hash mismatch",
        actual: configHash,
        expected: expected.value,
      },
    ]);
  }

  return success(config);
}

export type LookupTournamentPayoutInput = {
  config: TournamentPayoutConfig;
  tournamentKind: TournamentKind;
  awardTier: TournamentAwardTier;
};

export function lookupTournamentPayoutAmount(
  input: LookupTournamentPayoutInput,
): ValidationResult<number> {
  const row = input.config.payouts[input.tournamentKind];
  if (row === undefined) {
    return failure([
      {
        path: "/payouts",
        message: "missing configured payout row for tournament kind",
        actual: input.tournamentKind,
      },
    ]);
  }
  const amount = row[input.awardTier];
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
    return failure([
      {
        path: `/payouts/${input.tournamentKind}/${input.awardTier}`,
        message: "invalid or missing configured payout amount",
        actual: amount,
      },
    ]);
  }
  return success(amount);
}

export function buildTournamentPayoutConfigForTest(
  overrides: Partial<TournamentPayoutTable>,
  provider: Sha256Provider,
): ValidationResult<TournamentPayoutConfig> {
  const base = createDefaultTournamentPayoutTable();
  const merged: TournamentPayoutTable = {
    normal: { ...base.normal, ...(overrides.normal ?? {}) },
    open: { ...base.open, ...(overrides.open ?? {}) },
    limited: { ...base.limited, ...(overrides.limited ?? {}) },
    promotion: { ...base.promotion, ...(overrides.promotion ?? {}) },
  };
  const withoutHash = {
    schemaVersion: TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION,
    configVersion: "tournament-payout-test-override",
    payouts: merged,
  } satisfies Omit<TournamentPayoutConfig, "configHash">;
  const hash = computeTournamentPayoutConfigHash(withoutHash, provider);
  if (!hash.ok) {
    return hash;
  }
  return success(
    deepFreezePlainJson({
      ...withoutHash,
      configHash: hash.value,
    }),
  );
}
