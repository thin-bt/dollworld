import { describe, expect, it } from "vitest";
import { validateAttemptIdentity } from "./validate-attempt-identity.js";

const attempt = (attemptId: string, verdict = "PASS") => ({
  attemptId,
  lane: "PTG-014A",
  verdictRecord: { verdict, failedAssertionIds: [] },
});

describe("validateAttemptIdentity", () => {
  it("accepts unique attempt identities", () => {
    expect(validateAttemptIdentity([attempt("a"), attempt("b")])).toEqual({
      ok: true,
      diagnostics: [],
    });
  });

  it("reports only duplicate identity when repeated records are identical", () => {
    expect(validateAttemptIdentity([attempt("a"), attempt("a")])).toEqual({
      ok: false,
      firstFailureCode: "SEM_DUPLICATE_ATTEMPT_ID",
      diagnostics: [
        {
          code: "SEM_DUPLICATE_ATTEMPT_ID",
          attemptId: "a",
          instancePointer: "/attempts/1/attemptId",
          message: 'attemptId "a" occurs more than once',
        },
      ],
    });
  });

  it("keeps duplicate identity first and adds immutability for M20 content drift", () => {
    const result = validateAttemptIdentity([attempt("a"), attempt("a", "NOT_REACHABLE")]);

    expect(result).toEqual({
      ok: false,
      firstFailureCode: "SEM_DUPLICATE_ATTEMPT_ID",
      diagnostics: [
        expect.objectContaining({
          code: "SEM_DUPLICATE_ATTEMPT_ID",
          instancePointer: "/attempts/1/attemptId",
        }),
        expect.objectContaining({
          code: "SEM_IMMUTABILITY_VIOLATION",
          instancePointer: "/attempts/1",
        }),
      ],
    });
  });

  it("ignores object-member order but preserves deterministic duplicate ordering", () => {
    const reordered = {
      verdictRecord: { failedAssertionIds: [], verdict: "PASS" },
      lane: "PTG-014A",
      attemptId: "a",
    };
    const result = validateAttemptIdentity([attempt("a"), reordered, attempt("a", "FAILED")]);

    expect(result).toMatchObject({
      ok: false,
      firstFailureCode: "SEM_DUPLICATE_ATTEMPT_ID",
      diagnostics: [
        { code: "SEM_DUPLICATE_ATTEMPT_ID", instancePointer: "/attempts/1/attemptId" },
        { code: "SEM_DUPLICATE_ATTEMPT_ID", instancePointer: "/attempts/2/attemptId" },
        { code: "SEM_IMMUTABILITY_VIOLATION", instancePointer: "/attempts/2" },
      ],
    });
  });
});
