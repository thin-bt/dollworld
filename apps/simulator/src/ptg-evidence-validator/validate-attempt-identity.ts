export type AttemptIdentityFailureCode = "SEM_DUPLICATE_ATTEMPT_ID" | "SEM_IMMUTABILITY_VIOLATION";

export type AttemptIdentityDiagnostic = {
  code: AttemptIdentityFailureCode;
  attemptId: string;
  instancePointer: string;
  message: string;
};

export type AttemptIdentityValidationResult =
  | { ok: true; diagnostics: readonly [] }
  | {
      ok: false;
      firstFailureCode: "SEM_DUPLICATE_ATTEMPT_ID";
      diagnostics: readonly AttemptIdentityDiagnostic[];
    };

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : JSON.stringify(value);
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("attempt identity validation requires parsed JSON data");
}

/**
 * Validate PTG attempt identity after PTG-024 structural validation succeeds.
 * Duplicate identity is always diagnosed before comparing record contents, so
 * an M20 record mismatch cannot replace SEM_DUPLICATE_ATTEMPT_ID as the first
 * failure. Object-member order is ignored while array order remains material.
 */
export function validateAttemptIdentity(
  attempts: readonly Readonly<Record<string, unknown>>[],
): AttemptIdentityValidationResult {
  const firstById = new Map<string, string>();
  const diagnostics: AttemptIdentityDiagnostic[] = [];

  attempts.forEach((attempt, index) => {
    const attemptId = attempt.attemptId;
    if (typeof attemptId !== "string") {
      throw new TypeError(
        "attempt identity validation requires structurally valid attemptId values",
      );
    }

    const canonicalRecord = canonicalJson(attempt);
    const firstRecord = firstById.get(attemptId);
    if (firstRecord === undefined) {
      firstById.set(attemptId, canonicalRecord);
      return;
    }

    diagnostics.push({
      code: "SEM_DUPLICATE_ATTEMPT_ID",
      attemptId,
      instancePointer: `/attempts/${index}/attemptId`,
      message: `attemptId ${JSON.stringify(attemptId)} occurs more than once`,
    });
    if (canonicalRecord !== firstRecord) {
      diagnostics.push({
        code: "SEM_IMMUTABILITY_VIOLATION",
        attemptId,
        instancePointer: `/attempts/${index}`,
        message: `duplicate attemptId ${JSON.stringify(attemptId)} has different record content`,
      });
    }
  });

  if (diagnostics.length === 0) return { ok: true, diagnostics: [] };
  return {
    ok: false,
    firstFailureCode: "SEM_DUPLICATE_ATTEMPT_ID",
    diagnostics,
  };
}
