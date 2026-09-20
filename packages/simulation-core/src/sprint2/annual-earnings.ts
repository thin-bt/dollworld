/**
 * S02-008 canonical yearly tournament earnings accrual (no annual-points scoring).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  ANNUAL_EARNINGS_APPLICATION_SCHEMA_VERSION,
  type TournamentAwardTier,
  type TournamentKind,
} from "./constants.js";
import {
  lookupTournamentPayoutAmount,
  type TournamentPayoutConfig,
} from "./tournament-payout-config.js";
import {
  type TournamentFinalResult,
  validateTournamentFinalResultSource,
  type ValidateTournamentFinalResultSource,
} from "./tournament-final-result.js";

export type AnnualEarningsApplication = {
  schemaVersion: typeof ANNUAL_EARNINGS_APPLICATION_SCHEMA_VERSION;
  personId: PersonId;
  worldYear: number;
  tournamentId: TournamentId;
  tournamentKind: TournamentKind;
  awardTier: TournamentAwardTier;
  sourceFinalResultHash: string;
  awardedAmount: number;
  applicationIdentityHash: string;
};

export type AnnualEarningsLedger = {
  applications: readonly AnnualEarningsApplication[];
};

export type ApplyTournamentFinalResultEarningsInput = {
  ledger: AnnualEarningsLedger;
  finalResult: TournamentFinalResult;
  source: ValidateTournamentFinalResultSource;
  worldYear: number;
  tournamentKind: TournamentKind;
  payoutConfig: TournamentPayoutConfig;
};

export type ApplyTournamentFinalResultEarningsOutput =
  | { kind: "applied"; ledger: AnnualEarningsLedger; application: AnnualEarningsApplication }
  | {
      kind: "idempotent_skip";
      ledger: AnnualEarningsLedger;
      application: AnnualEarningsApplication;
    }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] };

function buildApplicationHashMaterial(
  application: Omit<AnnualEarningsApplication, "applicationIdentityHash">,
): Record<string, unknown> {
  return {
    schemaVersion: application.schemaVersion,
    personId: application.personId,
    worldYear: application.worldYear,
    tournamentId: application.tournamentId,
    tournamentKind: application.tournamentKind,
    awardTier: application.awardTier,
    sourceFinalResultHash: application.sourceFinalResultHash,
    awardedAmount: application.awardedAmount,
  };
}

export function computeAnnualEarningsApplicationIdentityHash(
  application: Omit<AnnualEarningsApplication, "applicationIdentityHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildApplicationHashMaterial(application)),
    "/applicationIdentityHash",
  );
}

export function annualEarningsApplicationKey(
  tournamentId: TournamentId,
  personId: PersonId,
): string {
  return `${tournamentId}:earnings:${personId}`;
}

export function createEmptyAnnualEarningsLedger(): AnnualEarningsLedger {
  return deepFreezePlainJson({ applications: [] });
}

function findApplicationByKey(
  ledger: AnnualEarningsLedger,
  tournamentId: TournamentId,
  personId: PersonId,
): AnnualEarningsApplication | undefined {
  const key = annualEarningsApplicationKey(tournamentId, personId);
  return ledger.applications.find(
    (application) =>
      annualEarningsApplicationKey(application.tournamentId, application.personId) === key,
  );
}

export function applyTournamentFinalResultEarnings(
  input: ApplyTournamentFinalResultEarningsInput,
  provider: Sha256Provider,
): ApplyTournamentFinalResultEarningsOutput {
  if (!Number.isSafeInteger(input.worldYear) || input.worldYear < 1) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/worldYear",
          message: "worldYear must be a safe integer >= 1",
          actual: input.worldYear,
        },
      ],
    };
  }

  const sourceValidation = validateTournamentFinalResultSource(input.finalResult, input.source);
  if (!sourceValidation.ok) {
    return { kind: "validation_failure", issues: sourceValidation.issues };
  }

  let ledger = input.ledger;
  let lastApplication: AnnualEarningsApplication | undefined;
  let appliedAny = false;

  for (const placement of input.finalResult.placements) {
    const existing = findApplicationByKey(
      ledger,
      input.finalResult.tournamentId,
      placement.personId,
    );
    if (existing !== undefined) {
      if (existing.sourceFinalResultHash !== input.finalResult.resultHash) {
        return {
          kind: "validation_failure",
          issues: [
            {
              path: "/applications",
              message: "conflicting earnings application for same tournament and person",
              actual: existing.applicationIdentityHash,
            },
          ],
        };
      }
      lastApplication = existing;
      continue;
    }

    const payout = lookupTournamentPayoutAmount({
      config: input.payoutConfig,
      tournamentKind: input.tournamentKind,
      awardTier: placement.awardTier,
    });
    if (!payout.ok) {
      return { kind: "validation_failure", issues: payout.issues };
    }

    const withoutHash = {
      schemaVersion: ANNUAL_EARNINGS_APPLICATION_SCHEMA_VERSION,
      personId: placement.personId,
      worldYear: input.worldYear,
      tournamentId: input.finalResult.tournamentId,
      tournamentKind: input.tournamentKind,
      awardTier: placement.awardTier,
      sourceFinalResultHash: input.finalResult.resultHash,
      awardedAmount: payout.value,
    } satisfies Omit<AnnualEarningsApplication, "applicationIdentityHash">;

    const identityHash = computeAnnualEarningsApplicationIdentityHash(withoutHash, provider);
    if (!identityHash.ok) {
      return { kind: "validation_failure", issues: identityHash.issues };
    }

    const application = deepFreezePlainJson({
      ...withoutHash,
      applicationIdentityHash: identityHash.value,
    });
    ledger = deepFreezePlainJson({
      applications: [...ledger.applications, application],
    });
    lastApplication = application;
    appliedAny = true;
  }

  if (lastApplication === undefined) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/placements",
          message: "no earnings applications produced from tournament final result",
        },
      ],
    };
  }

  if (appliedAny) {
    return { kind: "applied", ledger, application: lastApplication };
  }
  return { kind: "idempotent_skip", ledger, application: lastApplication };
}

export function computeYearlyCumulativeEarnings(
  ledger: AnnualEarningsLedger,
  worldYear: number,
  personId: PersonId,
): number {
  let total = 0;
  for (const application of ledger.applications) {
    if (application.worldYear === worldYear && application.personId === personId) {
      total += application.awardedAmount;
    }
  }
  return total;
}

export function listAnnualEarningsApplicationsForYear(
  ledger: AnnualEarningsLedger,
  worldYear: number,
): readonly AnnualEarningsApplication[] {
  return ledger.applications.filter((application) => application.worldYear === worldYear);
}
