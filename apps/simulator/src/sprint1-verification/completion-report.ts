import { toCanonicalJson } from "@shared-world/simulation-core";
import {
  SPRINT1_ALTERNATE_SEED,
  SPRINT1_BASE_SEED,
  SPRINT1_BOUNDARY_SEEDS,
  SPRINT1_COMPLETION_REPORT_SCHEMA_VERSION,
  SPRINT1_DIFFERENT_SEED_YEARS,
  SPRINT1_PERFORMANCE_PROFILES,
  SPRINT1_PERFORMANCE_SEED,
  SPRINT1_PERFORMANCE_YEARS,
  SPRINT1_SAME_SEED_YEARS,
  SPRINT1_SPEC_VERSION,
  SPRINT1_VERIFICATION_SPRINT,
  SPRINT1_YEAR_PROFILES,
} from "./constants.js";
import {
  VERIFICATION_STATUSES,
  type BoundarySeedSection,
  type CheckSection,
  type DifferentSeedSection,
  type FixedSevenSection,
  type IdentityAndCanonicalSection,
  type IntegratedScenarioSection,
  type PerformanceProfileSection,
  type SameSeedSection,
  type Sprint0RegressionSection,
  type Sprint1CompletionReport,
  type VerificationIssue,
  type VerificationStatus,
  type YearProfileSection,
} from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVerificationStatus(value: unknown): value is VerificationStatus {
  return typeof value === "string" && (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

function isVerificationIssue(value: unknown): value is VerificationIssue {
  if (!isPlainObject(value)) return false;
  return (
    typeof value["code"] === "string" &&
    typeof value["message"] === "string" &&
    typeof value["scope"] === "string"
  );
}

function issue(code: string, message: string, scope: string): VerificationIssue {
  return { code, message, scope };
}

export function blockedSectionDetail(reason: string): string {
  return reason;
}

export function emptyRunRef(runKey: string): { runKey: string; relativeRunDirectory: string } {
  return { runKey, relativeRunDirectory: `runs/${runKey}/(not_performed)` };
}

export function buildBlockedSameSeed(reason: string): SameSeedSection {
  return {
    status: "blocked",
    seed: SPRINT1_BASE_SEED,
    years: SPRINT1_SAME_SEED_YEARS,
    runA: emptyRunRef("same-seed-a"),
    runB: emptyRunRef("same-seed-b"),
    deterministicMatch: false,
    detail: reason,
  };
}

export function buildBlockedDifferentSeed(reason: string): DifferentSeedSection {
  return {
    status: "blocked",
    baseSeed: SPRINT1_BASE_SEED,
    alternateSeed: SPRINT1_ALTERNATE_SEED,
    years: SPRINT1_DIFFERENT_SEED_YEARS,
    baseRun: emptyRunRef("same-seed-a"),
    alternateRun: emptyRunRef("different-seed-alt"),
    simulationIdsDiffer: false,
    seedsDiffer: false,
    domainContentDiffers: false,
    detail: reason,
  };
}

export function buildBlockedBoundarySeeds(reason: string): BoundarySeedSection[] {
  return SPRINT1_BOUNDARY_SEEDS.map((seed) => ({
    seed,
    status: "blocked" as const,
    years: 1,
    deterministicMatch: false,
    runA: emptyRunRef(`boundary-${String(seed)}-a`),
    runB: emptyRunRef(`boundary-${String(seed)}-b`),
    longHorizonPerformance: "not_performed" as const,
    detail: reason,
  }));
}

export function buildBlockedYearProfiles(reason: string): YearProfileSection[] {
  return SPRINT1_YEAR_PROFILES.map((years) => ({
    years,
    status: "blocked" as const,
    weeksExecuted: 0,
    csvDataRows: 0,
    finalWorldYear: 0,
    sevenFilesPassed: false,
    validationPassed: false,
    run: emptyRunRef(`year-${String(years)}`),
    maxRssMeasurement: "not_performed" as const,
    detail: reason,
  }));
}

export function buildBlockedIntegrated(reason: string): IntegratedScenarioSection {
  return {
    status: "blocked",
    seed: SPRINT1_BASE_SEED,
    weeksExecuted: 0,
    yearsExecuted: 0,
    techniqueActorPersonId: null,
    battleParticipants: [],
    battleKind: "official",
    strategy: "default_strategy",
    weekRegistryReset: false,
    globalBattleResultsRetained: false,
    deterministicMatch: false,
    runA: emptyRunRef("integrated-a"),
    runB: emptyRunRef("integrated-b"),
    checkpointDigestsMatch: false,
    detail: reason,
  };
}

export function buildBlockedIdentity(reason: string): IdentityAndCanonicalSection {
  return {
    status: "blocked",
    pathIndependencePassed: false,
    sidecarMotivationMutationChangesHashes: false,
    keyOrderInvariancePassed: false,
    mathRandomCallExpressions: 0,
    detail: reason,
  };
}

export function buildBlockedFixedSeven(reason: string): FixedSevenSection {
  return {
    status: "blocked",
    inspectedRunCount: 0,
    allExactlySeven: false,
    detail: reason,
  };
}

export function buildBlockedPerformance(reason: string): PerformanceProfileSection[] {
  return SPRINT1_PERFORMANCE_PROFILES.map((profile) => ({
    targetLivingPopulation: profile.targetLivingPopulation,
    years: SPRINT1_PERFORMANCE_YEARS,
    seed: SPRINT1_PERFORMANCE_SEED,
    status: "blocked" as const,
    actualLivingPopulation: null,
    totalPersonCount: null,
    sidecarCount: null,
    elapsedSeconds: null,
    maxRssKilobytes: null,
    eventCount: null,
    exitCode: null,
    validationPassed: false,
    finalWorldDate: null,
    functionalPassed: false,
    detail: reason,
  }));
}

export function buildBlockedSprint0(reason: string): Sprint0RegressionSection {
  return {
    status: "blocked",
    exitCode: 1,
    overallPassed: null,
    functionalFailureCount: null,
    warningCount: null,
    performanceWarnings: [],
    detail: reason,
  };
}

export function buildBlockedCheck(reason: string): CheckSection {
  const blocked = (command: string): CheckSection["npmCheck"] => ({
    command,
    exitCode: 1,
    passed: false,
  });
  void reason;
  return {
    npmCheck: blocked("npm run check"),
    wikiCheck: blocked("npm run wiki:check"),
    diffCheck: blocked("git diff --check HEAD"),
  };
}

export type BuildSprint1CompletionReportInput = {
  generatedAtUtc: string;
  gitCommit: string;
  workingTreeDirty: boolean;
  failures: VerificationIssue[];
  warnings: VerificationIssue[];
  sameSeed: SameSeedSection;
  differentSeed: DifferentSeedSection;
  boundarySeeds: BoundarySeedSection[];
  yearProfiles: YearProfileSection[];
  integratedScenario: IntegratedScenarioSection;
  identityAndCanonical: IdentityAndCanonicalSection;
  fixedSeven: FixedSevenSection;
  performanceProfiles: PerformanceProfileSection[];
  sprint0Regression: Sprint0RegressionSection;
  check: CheckSection;
};

export function buildSprint1CompletionReport(
  input: BuildSprint1CompletionReportInput,
): Sprint1CompletionReport {
  const functionalFailureCount = input.failures.length;
  return {
    schemaVersion: SPRINT1_COMPLETION_REPORT_SCHEMA_VERSION,
    sprint: SPRINT1_VERIFICATION_SPRINT,
    specVersion: SPRINT1_SPEC_VERSION,
    generatedAtUtc: input.generatedAtUtc,
    gitCommit: input.gitCommit,
    workingTreeDirty: input.workingTreeDirty,
    overallPassed: functionalFailureCount === 0,
    functionalFailureCount,
    warningCount: input.warnings.length,
    failures: input.failures,
    warnings: input.warnings,
    sameSeed: input.sameSeed,
    differentSeed: input.differentSeed,
    boundarySeeds: input.boundarySeeds,
    yearProfiles: input.yearProfiles,
    integratedScenario: input.integratedScenario,
    identityAndCanonical: input.identityAndCanonical,
    fixedSeven: input.fixedSeven,
    performanceProfiles: input.performanceProfiles,
    sprint0Regression: input.sprint0Regression,
    check: input.check,
  };
}

export function completionReportToJsonFile(report: Sprint1CompletionReport): string {
  return `${toCanonicalJson(report)}\n`;
}

function requireStatus(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): VerificationStatus | undefined {
  if (!isVerificationStatus(value)) {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be a VerificationStatus`, path));
    return undefined;
  }
  return value;
}

function requireRunRef(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): { runKey: string; relativeRunDirectory: string } | undefined {
  if (!isPlainObject(value)) {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be an object`, path));
    return undefined;
  }
  if (typeof value["runKey"] !== "string" || typeof value["relativeRunDirectory"] !== "string") {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", `${path} requires runKey and relativeRunDirectory`, path),
    );
    return undefined;
  }
  return {
    runKey: value["runKey"],
    relativeRunDirectory: value["relativeRunDirectory"],
  };
}

function requireBoolean(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): boolean | undefined {
  if (typeof value !== "boolean") {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be boolean`, path));
    return undefined;
  }
  return value;
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be a non-empty string`, path));
    return undefined;
  }
  return value;
}

function requireSafeInteger(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): number | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be a safe integer`, path));
    return undefined;
  }
  return value;
}

function requireNullableSafeInteger(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): number | null | undefined {
  if (value === null) {
    return null;
  }
  return requireSafeInteger(value, path, issues);
}

function requireNullableNumber(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be a finite number or null`, path));
    return undefined;
  }
  return value;
}

function requireNullableString(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): string | null | undefined {
  if (value === null) {
    return null;
  }
  return requireNonEmptyString(value, path, issues);
}

function requireStringArray(
  value: unknown,
  path: string,
  issues: VerificationIssue[],
): readonly string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be string[]`, path));
    return undefined;
  }
  return value;
}

/**
 * Validate a Sprint 1 completion report after read-back.
 * Rejects unknown status strings, missing required nested fields, and
 * clarifier-confirmed cross-field inconsistencies for passed sections.
 */
export function validateSprint1CompletionReport(
  value: unknown,
): { ok: true; value: Sprint1CompletionReport } | { ok: false; issues: VerificationIssue[] } {
  const issues: VerificationIssue[] = [];
  if (!isPlainObject(value)) {
    return {
      ok: false,
      issues: [issue("SPRINT1_REPORT_INVALID", "report must be a plain object", "report")],
    };
  }

  if (value["schemaVersion"] !== "0.1.0") {
    issues.push(issue("SPRINT1_REPORT_INVALID", "schemaVersion must be 0.1.0", "schemaVersion"));
  }
  if (value["sprint"] !== "sprint1") {
    issues.push(issue("SPRINT1_REPORT_INVALID", "sprint must be sprint1", "sprint"));
  }
  if (value["specVersion"] !== SPRINT1_SPEC_VERSION) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", `specVersion must be ${SPRINT1_SPEC_VERSION}`, "specVersion"),
    );
  }
  if (typeof value["generatedAtUtc"] !== "string" || value["generatedAtUtc"].length === 0) {
    issues.push(
      issue(
        "SPRINT1_REPORT_INVALID",
        "generatedAtUtc must be a non-empty string",
        "generatedAtUtc",
      ),
    );
  }
  if (typeof value["gitCommit"] !== "string" || !/^[0-9a-f]{40}$/i.test(value["gitCommit"])) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "gitCommit must be a 40-char hex SHA", "gitCommit"),
    );
  }
  if (typeof value["workingTreeDirty"] !== "boolean") {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "workingTreeDirty must be boolean", "workingTreeDirty"),
    );
  }
  if (typeof value["overallPassed"] !== "boolean") {
    issues.push(issue("SPRINT1_REPORT_INVALID", "overallPassed must be boolean", "overallPassed"));
  }
  if (
    typeof value["functionalFailureCount"] !== "number" ||
    !Number.isSafeInteger(value["functionalFailureCount"]) ||
    value["functionalFailureCount"] < 0
  ) {
    issues.push(
      issue(
        "SPRINT1_REPORT_INVALID",
        "functionalFailureCount must be a non-negative integer",
        "functionalFailureCount",
      ),
    );
  }
  if (
    typeof value["warningCount"] !== "number" ||
    !Number.isSafeInteger(value["warningCount"]) ||
    value["warningCount"] < 0
  ) {
    issues.push(
      issue(
        "SPRINT1_REPORT_INVALID",
        "warningCount must be a non-negative integer",
        "warningCount",
      ),
    );
  }

  if (!Array.isArray(value["failures"]) || !value["failures"].every(isVerificationIssue)) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "failures must be VerificationIssue[]", "failures"),
    );
  }
  if (!Array.isArray(value["warnings"]) || !value["warnings"].every(isVerificationIssue)) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "warnings must be VerificationIssue[]", "warnings"),
    );
  }

  if (Array.isArray(value["failures"]) && typeof value["functionalFailureCount"] === "number") {
    if (value["functionalFailureCount"] !== value["failures"].length) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "functionalFailureCount must equal failures.length",
          "functionalFailureCount",
        ),
      );
    }
    if (
      typeof value["overallPassed"] === "boolean" &&
      value["overallPassed"] !== (value["failures"].length === 0)
    ) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "overallPassed must equal functionalFailureCount === 0",
          "overallPassed",
        ),
      );
    }
  }
  if (Array.isArray(value["warnings"]) && typeof value["warningCount"] === "number") {
    if (value["warningCount"] !== value["warnings"].length) {
      issues.push(
        issue("SPRINT1_REPORT_INVALID", "warningCount must equal warnings.length", "warningCount"),
      );
    }
  }

  if (!isPlainObject(value["sameSeed"])) {
    issues.push(issue("SPRINT1_REPORT_INVALID", "sameSeed must be an object", "sameSeed"));
  } else {
    const section = value["sameSeed"];
    const status = requireStatus(section["status"], "sameSeed/status", issues);
    requireSafeInteger(section["seed"], "sameSeed/seed", issues);
    requireSafeInteger(section["years"], "sameSeed/years", issues);
    requireRunRef(section["runA"], "sameSeed/runA", issues);
    requireRunRef(section["runB"], "sameSeed/runB", issues);
    const match = requireBoolean(
      section["deterministicMatch"],
      "sameSeed/deterministicMatch",
      issues,
    );
    requireNonEmptyString(section["detail"], "sameSeed/detail", issues);
    if (status === "passed" && match !== true) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "sameSeed.passed requires deterministicMatch === true",
          "sameSeed/deterministicMatch",
        ),
      );
    }
  }

  if (!isPlainObject(value["differentSeed"])) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "differentSeed must be an object", "differentSeed"),
    );
  } else {
    const section = value["differentSeed"];
    const status = requireStatus(section["status"], "differentSeed/status", issues);
    requireSafeInteger(section["baseSeed"], "differentSeed/baseSeed", issues);
    requireSafeInteger(section["alternateSeed"], "differentSeed/alternateSeed", issues);
    requireSafeInteger(section["years"], "differentSeed/years", issues);
    requireRunRef(section["baseRun"], "differentSeed/baseRun", issues);
    requireRunRef(section["alternateRun"], "differentSeed/alternateRun", issues);
    const idsDiffer = requireBoolean(
      section["simulationIdsDiffer"],
      "differentSeed/simulationIdsDiffer",
      issues,
    );
    const seedsDiffer = requireBoolean(section["seedsDiffer"], "differentSeed/seedsDiffer", issues);
    const domainDiffers = requireBoolean(
      section["domainContentDiffers"],
      "differentSeed/domainContentDiffers",
      issues,
    );
    requireNonEmptyString(section["detail"], "differentSeed/detail", issues);
    if (status === "passed") {
      if (seedsDiffer !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "differentSeed.passed requires seedsDiffer === true",
            "differentSeed/seedsDiffer",
          ),
        );
      }
      if (idsDiffer !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "differentSeed.passed requires simulationIdsDiffer === true",
            "differentSeed/simulationIdsDiffer",
          ),
        );
      }
      if (domainDiffers !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "differentSeed.passed requires domainContentDiffers === true",
            "differentSeed/domainContentDiffers",
          ),
        );
      }
    }
  }

  if (!Array.isArray(value["boundarySeeds"]) || value["boundarySeeds"].length !== 2) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "boundarySeeds must have exactly 2 entries", "boundarySeeds"),
    );
  } else {
    const seeds = value["boundarySeeds"].map((entry) =>
      isPlainObject(entry) ? entry["seed"] : undefined,
    );
    if (seeds[0] !== 0 || seeds[1] !== 4294967295) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "boundarySeeds must be ordered 0 then 4294967295",
          "boundarySeeds",
        ),
      );
    }
    for (let i = 0; i < value["boundarySeeds"].length; i += 1) {
      const entry = value["boundarySeeds"][i];
      const path = `boundarySeeds/${String(i)}`;
      if (!isPlainObject(entry)) {
        issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be an object`, path));
        continue;
      }
      requireSafeInteger(entry["seed"], `${path}/seed`, issues);
      const status = requireStatus(entry["status"], `${path}/status`, issues);
      requireSafeInteger(entry["years"], `${path}/years`, issues);
      const match = requireBoolean(
        entry["deterministicMatch"],
        `${path}/deterministicMatch`,
        issues,
      );
      requireRunRef(entry["runA"], `${path}/runA`, issues);
      requireRunRef(entry["runB"], `${path}/runB`, issues);
      requireStatus(entry["longHorizonPerformance"], `${path}/longHorizonPerformance`, issues);
      requireNonEmptyString(entry["detail"], `${path}/detail`, issues);
      if (status === "passed" && match !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            `${path}.passed requires deterministicMatch === true`,
            `${path}/deterministicMatch`,
          ),
        );
      }
    }
  }

  if (!Array.isArray(value["yearProfiles"]) || value["yearProfiles"].length !== 4) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "yearProfiles must have exactly 4 entries", "yearProfiles"),
    );
  } else {
    const years = value["yearProfiles"].map((entry) =>
      isPlainObject(entry) ? entry["years"] : undefined,
    );
    if (years[0] !== 10 || years[1] !== 50 || years[2] !== 100 || years[3] !== 300) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "yearProfiles must be ordered 10,50,100,300",
          "yearProfiles",
        ),
      );
    }
    for (let i = 0; i < value["yearProfiles"].length; i += 1) {
      const entry = value["yearProfiles"][i];
      const path = `yearProfiles/${String(i)}`;
      if (!isPlainObject(entry)) {
        issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be an object`, path));
        continue;
      }
      requireSafeInteger(entry["years"], `${path}/years`, issues);
      const status = requireStatus(entry["status"], `${path}/status`, issues);
      requireSafeInteger(entry["weeksExecuted"], `${path}/weeksExecuted`, issues);
      requireSafeInteger(entry["csvDataRows"], `${path}/csvDataRows`, issues);
      requireSafeInteger(entry["finalWorldYear"], `${path}/finalWorldYear`, issues);
      const sevenOk = requireBoolean(entry["sevenFilesPassed"], `${path}/sevenFilesPassed`, issues);
      const validationOk = requireBoolean(
        entry["validationPassed"],
        `${path}/validationPassed`,
        issues,
      );
      requireRunRef(entry["run"], `${path}/run`, issues);
      requireStatus(entry["maxRssMeasurement"], `${path}/maxRssMeasurement`, issues);
      requireNonEmptyString(entry["detail"], `${path}/detail`, issues);
      if (status === "passed") {
        if (sevenOk !== true) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires sevenFilesPassed === true`,
              `${path}/sevenFilesPassed`,
            ),
          );
        }
        if (validationOk !== true) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires validationPassed === true`,
              `${path}/validationPassed`,
            ),
          );
        }
      }
    }
  }

  if (!isPlainObject(value["integratedScenario"])) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "integratedScenario must be an object", "integratedScenario"),
    );
  } else {
    const section = value["integratedScenario"];
    const status = requireStatus(section["status"], "integratedScenario/status", issues);
    requireSafeInteger(section["seed"], "integratedScenario/seed", issues);
    const weeksExecuted = requireSafeInteger(
      section["weeksExecuted"],
      "integratedScenario/weeksExecuted",
      issues,
    );
    const yearsExecuted = requireSafeInteger(
      section["yearsExecuted"],
      "integratedScenario/yearsExecuted",
      issues,
    );
    if (
      !(typeof section["techniqueActorPersonId"] === "string") &&
      section["techniqueActorPersonId"] !== null
    ) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "integratedScenario/techniqueActorPersonId must be string|null",
          "integratedScenario/techniqueActorPersonId",
        ),
      );
    }
    requireStringArray(
      section["battleParticipants"],
      "integratedScenario/battleParticipants",
      issues,
    );
    if (section["battleKind"] !== "official") {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "integratedScenario/battleKind must be official",
          "integratedScenario/battleKind",
        ),
      );
    }
    if (section["strategy"] !== "default_strategy") {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "integratedScenario/strategy must be default_strategy",
          "integratedScenario/strategy",
        ),
      );
    }
    const weekReset = requireBoolean(
      section["weekRegistryReset"],
      "integratedScenario/weekRegistryReset",
      issues,
    );
    const globalRetain = requireBoolean(
      section["globalBattleResultsRetained"],
      "integratedScenario/globalBattleResultsRetained",
      issues,
    );
    const match = requireBoolean(
      section["deterministicMatch"],
      "integratedScenario/deterministicMatch",
      issues,
    );
    requireRunRef(section["runA"], "integratedScenario/runA", issues);
    requireRunRef(section["runB"], "integratedScenario/runB", issues);
    const checkpointMatch = requireBoolean(
      section["checkpointDigestsMatch"],
      "integratedScenario/checkpointDigestsMatch",
      issues,
    );
    requireNonEmptyString(section["detail"], "integratedScenario/detail", issues);
    if (status === "passed") {
      if (weeksExecuted !== 2) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "integratedScenario.passed requires weeksExecuted === 2",
            "integratedScenario/weeksExecuted",
          ),
        );
      }
      if (yearsExecuted !== 0) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "integratedScenario.passed requires yearsExecuted === 0",
            "integratedScenario/yearsExecuted",
          ),
        );
      }
      if (weekReset !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "integratedScenario.passed requires weekRegistryReset === true",
            "integratedScenario/weekRegistryReset",
          ),
        );
      }
      if (globalRetain !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "integratedScenario.passed requires globalBattleResultsRetained === true",
            "integratedScenario/globalBattleResultsRetained",
          ),
        );
      }
      if (match !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "integratedScenario.passed requires deterministicMatch === true",
            "integratedScenario/deterministicMatch",
          ),
        );
      }
      if (checkpointMatch !== true) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            "integratedScenario.passed requires checkpointDigestsMatch === true",
            "integratedScenario/checkpointDigestsMatch",
          ),
        );
      }
    }
  }

  if (!isPlainObject(value["identityAndCanonical"])) {
    issues.push(
      issue(
        "SPRINT1_REPORT_INVALID",
        "identityAndCanonical must be an object",
        "identityAndCanonical",
      ),
    );
  } else {
    const section = value["identityAndCanonical"];
    requireStatus(section["status"], "identityAndCanonical/status", issues);
    requireBoolean(
      section["pathIndependencePassed"],
      "identityAndCanonical/pathIndependencePassed",
      issues,
    );
    requireBoolean(
      section["sidecarMotivationMutationChangesHashes"],
      "identityAndCanonical/sidecarMotivationMutationChangesHashes",
      issues,
    );
    requireBoolean(
      section["keyOrderInvariancePassed"],
      "identityAndCanonical/keyOrderInvariancePassed",
      issues,
    );
    requireSafeInteger(
      section["mathRandomCallExpressions"],
      "identityAndCanonical/mathRandomCallExpressions",
      issues,
    );
    requireNonEmptyString(section["detail"], "identityAndCanonical/detail", issues);
  }

  if (!isPlainObject(value["fixedSeven"])) {
    issues.push(issue("SPRINT1_REPORT_INVALID", "fixedSeven must be an object", "fixedSeven"));
  } else {
    const section = value["fixedSeven"];
    const status = requireStatus(section["status"], "fixedSeven/status", issues);
    requireSafeInteger(section["inspectedRunCount"], "fixedSeven/inspectedRunCount", issues);
    const allSeven = requireBoolean(
      section["allExactlySeven"],
      "fixedSeven/allExactlySeven",
      issues,
    );
    requireNonEmptyString(section["detail"], "fixedSeven/detail", issues);
    if (status === "passed" && allSeven !== true) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "fixedSeven.passed requires allExactlySeven === true",
          "fixedSeven/allExactlySeven",
        ),
      );
    }
  }

  if (!Array.isArray(value["performanceProfiles"]) || value["performanceProfiles"].length !== 3) {
    issues.push(
      issue(
        "SPRINT1_REPORT_INVALID",
        "performanceProfiles must have exactly 3 entries",
        "performanceProfiles",
      ),
    );
  } else {
    const pops = value["performanceProfiles"].map((entry) =>
      isPlainObject(entry) ? entry["targetLivingPopulation"] : undefined,
    );
    if (pops[0] !== 600 || pops[1] !== 2000 || pops[2] !== 5000) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "performanceProfiles must be ordered by targetLivingPopulation 600,2000,5000",
          "performanceProfiles",
        ),
      );
    }
    for (let index = 0; index < value["performanceProfiles"].length; index += 1) {
      const entry = value["performanceProfiles"][index];
      const path = `performanceProfiles/${String(index)}`;
      if (!isPlainObject(entry)) {
        issues.push(issue("SPRINT1_REPORT_INVALID", `${path} must be an object`, path));
        continue;
      }
      const target = requireSafeInteger(
        entry["targetLivingPopulation"],
        `${path}/targetLivingPopulation`,
        issues,
      );
      if (entry["years"] !== SPRINT1_PERFORMANCE_YEARS) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            `${path}.years must be ${String(SPRINT1_PERFORMANCE_YEARS)}`,
            `${path}/years`,
          ),
        );
      }
      if (entry["seed"] !== SPRINT1_PERFORMANCE_SEED) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            `${path}.seed must be ${String(SPRINT1_PERFORMANCE_SEED)}`,
            `${path}/seed`,
          ),
        );
      }
      const status = requireStatus(entry["status"], `${path}/status`, issues);
      const actualLiving = requireNullableSafeInteger(
        entry["actualLivingPopulation"],
        `${path}/actualLivingPopulation`,
        issues,
      );
      const totalPersons = requireNullableSafeInteger(
        entry["totalPersonCount"],
        `${path}/totalPersonCount`,
        issues,
      );
      const sidecarCount = requireNullableSafeInteger(
        entry["sidecarCount"],
        `${path}/sidecarCount`,
        issues,
      );
      requireNullableNumber(entry["elapsedSeconds"], `${path}/elapsedSeconds`, issues);
      requireNullableSafeInteger(entry["maxRssKilobytes"], `${path}/maxRssKilobytes`, issues);
      requireNullableSafeInteger(entry["eventCount"], `${path}/eventCount`, issues);
      const exitCode = requireNullableSafeInteger(entry["exitCode"], `${path}/exitCode`, issues);
      const validationPassed = requireBoolean(
        entry["validationPassed"],
        `${path}/validationPassed`,
        issues,
      );
      requireNullableString(entry["finalWorldDate"], `${path}/finalWorldDate`, issues);
      const functionalPassed = requireBoolean(
        entry["functionalPassed"],
        `${path}/functionalPassed`,
        issues,
      );
      requireNonEmptyString(entry["detail"], `${path}/detail`, issues);
      if ("warningSeconds" in entry || "measureOnly" in entry || "exceeded" in entry) {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            `${path} must not carry Sprint0-style warningSeconds/measureOnly/exceeded`,
            path,
          ),
        );
      }
      if (status === "passed") {
        if (actualLiving === null || actualLiving === undefined || actualLiving !== target) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires actualLivingPopulation === targetLivingPopulation`,
              `${path}/actualLivingPopulation`,
            ),
          );
        }
        if (
          sidecarCount === null ||
          sidecarCount === undefined ||
          totalPersons === null ||
          totalPersons === undefined ||
          sidecarCount !== totalPersons
        ) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires sidecarCount === totalPersonCount`,
              `${path}/sidecarCount`,
            ),
          );
        }
        if (validationPassed !== true) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires validationPassed === true`,
              `${path}/validationPassed`,
            ),
          );
        }
        if (functionalPassed !== true) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires functionalPassed === true`,
              `${path}/functionalPassed`,
            ),
          );
        }
        if (exitCode !== 0) {
          issues.push(
            issue(
              "SPRINT1_REPORT_INVALID",
              `${path}.passed requires exitCode === 0`,
              `${path}/exitCode`,
            ),
          );
        }
      }
    }
  }

  if (!isPlainObject(value["sprint0Regression"])) {
    issues.push(
      issue("SPRINT1_REPORT_INVALID", "sprint0Regression must be an object", "sprint0Regression"),
    );
  } else {
    const section = value["sprint0Regression"];
    requireStatus(section["status"], "sprint0Regression/status", issues);
    requireSafeInteger(section["exitCode"], "sprint0Regression/exitCode", issues);
    if (!(typeof section["overallPassed"] === "boolean") && section["overallPassed"] !== null) {
      issues.push(
        issue(
          "SPRINT1_REPORT_INVALID",
          "sprint0Regression/overallPassed must be boolean|null",
          "sprint0Regression/overallPassed",
        ),
      );
    }
    requireNullableSafeInteger(
      section["functionalFailureCount"],
      "sprint0Regression/functionalFailureCount",
      issues,
    );
    requireNullableSafeInteger(section["warningCount"], "sprint0Regression/warningCount", issues);
    requireStringArray(
      section["performanceWarnings"],
      "sprint0Regression/performanceWarnings",
      issues,
    );
    requireNonEmptyString(section["detail"], "sprint0Regression/detail", issues);
  }

  if (!isPlainObject(value["check"])) {
    issues.push(issue("SPRINT1_REPORT_INVALID", "check must be an object", "check"));
  } else {
    for (const key of ["npmCheck", "wikiCheck", "diffCheck"] as const) {
      const gate = value["check"][key];
      if (
        !isPlainObject(gate) ||
        typeof gate["command"] !== "string" ||
        typeof gate["exitCode"] !== "number" ||
        typeof gate["passed"] !== "boolean"
      ) {
        issues.push(
          issue("SPRINT1_REPORT_INVALID", `check.${key} must have command/exitCode/passed`, key),
        );
      }
    }
  }

  // Required nested failed/blocked must have corresponding failure issues.
  const failures = Array.isArray(value["failures"])
    ? (value["failures"] as VerificationIssue[])
    : [];
  if (failures.length === 0) {
    const requiredStatuses: Array<{ path: string; status: unknown }> = [
      {
        path: "sameSeed",
        status: isPlainObject(value["sameSeed"]) ? value["sameSeed"]["status"] : undefined,
      },
      {
        path: "differentSeed",
        status: isPlainObject(value["differentSeed"])
          ? value["differentSeed"]["status"]
          : undefined,
      },
      {
        path: "integratedScenario",
        status: isPlainObject(value["integratedScenario"])
          ? value["integratedScenario"]["status"]
          : undefined,
      },
      {
        path: "identityAndCanonical",
        status: isPlainObject(value["identityAndCanonical"])
          ? value["identityAndCanonical"]["status"]
          : undefined,
      },
      {
        path: "fixedSeven",
        status: isPlainObject(value["fixedSeven"]) ? value["fixedSeven"]["status"] : undefined,
      },
      {
        path: "sprint0Regression",
        status: isPlainObject(value["sprint0Regression"])
          ? value["sprint0Regression"]["status"]
          : undefined,
      },
    ];
    for (const entry of requiredStatuses) {
      if (entry.status === "failed" || entry.status === "blocked") {
        issues.push(
          issue(
            "SPRINT1_REPORT_INVALID",
            `${entry.path} is ${String(entry.status)} but failures is empty`,
            entry.path,
          ),
        );
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: value as unknown as Sprint1CompletionReport };
}
