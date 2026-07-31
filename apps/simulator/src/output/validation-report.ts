import type { ReferenceIntegrityResult, ValidationReportDocument } from "./types.js";

export function buildValidationReport(input: {
  finalIntegrity: ReferenceIntegrityResult;
}): ValidationReportDocument {
  const { finalIntegrity } = input;

  const brokenCheck = {
    name: "broken_references",
    status: finalIntegrity.brokenReferenceCount === 0 ? ("passed" as const) : ("failed" as const),
    violationCount: finalIntegrity.brokenReferenceCount,
    targetIds: finalIntegrity.brokenReferences.flatMap((v) => v.targetIds),
    reasons: finalIntegrity.brokenReferences.map((v) => v.reason),
    severity: finalIntegrity.brokenReferenceCount === 0 ? ("none" as const) : ("error" as const),
    canContinue: finalIntegrity.brokenReferenceCount === 0,
  };

  const cycleCheck = {
    name: "cycles",
    status: finalIntegrity.cycles.length === 0 ? ("passed" as const) : ("failed" as const),
    violationCount: finalIntegrity.cycles.length,
    targetIds: finalIntegrity.cycles.flatMap((v) => v.targetIds),
    reasons: finalIntegrity.cycles.map((v) => v.reason),
    severity: finalIntegrity.cycles.length === 0 ? ("none" as const) : ("error" as const),
    canContinue: finalIntegrity.cycles.length === 0,
  };

  const ageCheck = {
    name: "age_invariants",
    status: finalIntegrity.ageViolations.length === 0 ? ("passed" as const) : ("failed" as const),
    violationCount: finalIntegrity.ageViolations.length,
    targetIds: finalIntegrity.ageViolations.map((v) => v.personId),
    reasons: finalIntegrity.ageViolations.map((v) => v.reason),
    severity: finalIntegrity.ageViolations.length === 0 ? ("none" as const) : ("error" as const),
    canContinue: finalIntegrity.ageViolations.length === 0,
  };

  const statusCheck = {
    name: "status_invariants",
    status:
      finalIntegrity.statusViolations.length === 0 ? ("passed" as const) : ("failed" as const),
    violationCount: finalIntegrity.statusViolations.length,
    targetIds: finalIntegrity.statusViolations.map((v) => v.personId),
    reasons: finalIntegrity.statusViolations.map((v) => v.reason),
    severity: finalIntegrity.statusViolations.length === 0 ? ("none" as const) : ("error" as const),
    canContinue: finalIntegrity.statusViolations.length === 0,
  };

  const selfRefCheck = {
    name: "self_references",
    status: finalIntegrity.selfReferenceCount === 0 ? ("passed" as const) : ("failed" as const),
    violationCount: finalIntegrity.selfReferenceCount,
    targetIds: finalIntegrity.selfReferences.flatMap((v) => [v.relationshipId, ...v.personIds]),
    reasons: finalIntegrity.selfReferences.map((v) => v.reason),
    severity: finalIntegrity.selfReferenceCount === 0 ? ("none" as const) : ("error" as const),
    canContinue: finalIntegrity.selfReferenceCount === 0,
  };

  // Single CLI run does not perform same-seed comparison (S00-010 owns the suite).
  const sameSeedComparison = {
    status: "not_performed" as const,
    detail: "same-seed comparison is not performed during a single CLI run (see S00-010)",
  };

  const sameSeedCheck = {
    name: "same_seed_comparison",
    status: "not_performed" as const,
    violationCount: 0,
    targetIds: [] as string[],
    reasons: [sameSeedComparison.detail],
    severity: "info" as const,
    canContinue: true,
  };

  const checks = [brokenCheck, cycleCheck, ageCheck, statusCheck, selfRefCheck, sameSeedCheck];

  const overallPassed =
    brokenCheck.status === "passed" &&
    cycleCheck.status === "passed" &&
    ageCheck.status === "passed" &&
    statusCheck.status === "passed" &&
    selfRefCheck.status === "passed";

  return {
    overallPassed,
    checks,
    brokenReferences: finalIntegrity.brokenReferences,
    cycles: finalIntegrity.cycles,
    ageViolations: finalIntegrity.ageViolations,
    statusViolations: finalIntegrity.statusViolations,
    sameSeedComparison,
    brokenReferenceCount: finalIntegrity.brokenReferenceCount,
    invariantViolationCount: finalIntegrity.invariantViolationCount,
  };
}

export function summarizeValidationFailure(report: ValidationReportDocument): string {
  const failed = report.checks.filter((check) => check.status === "failed");
  if (failed.length === 0) {
    return "validation failed";
  }
  return failed
    .map(
      (check) =>
        `${check.name}(${String(check.violationCount)}): ${check.reasons.join("; ") || "failed"}`,
    )
    .join(" | ");
}
