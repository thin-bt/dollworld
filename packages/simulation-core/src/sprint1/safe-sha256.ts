/**
 * Catch Sha256Provider throws at public hash boundaries so callers receive a
 * ValidationResult failure instead of an external exception (S01-005 audit).
 * Also rejects non-64-lowercase-hex digests (S1-SPEC-0.1.19 dependency_failure).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { SHA256_HEX_PATTERN } from "./plain-data.js";

export function safeHashUtf8(
  provider: Sha256Provider,
  text: string,
  path: string,
): ValidationResult<string> {
  try {
    const digest = provider.hashUtf8(text);
    if (typeof digest !== "string" || !SHA256_HEX_PATTERN.test(digest)) {
      return failure([
        {
          path,
          message: "Sha256Provider.hashUtf8 returned invalid digest",
          actual: typeof digest === "string" ? digest : String(digest),
          expected: "successful SHA-256 digest",
        },
      ]);
    }
    return success(digest);
  } catch (error) {
    return failure([
      {
        path,
        message:
          error instanceof Error ? error.message : "Sha256Provider.hashUtf8 failed unexpectedly",
        expected: "successful SHA-256 digest",
      },
    ]);
  }
}
