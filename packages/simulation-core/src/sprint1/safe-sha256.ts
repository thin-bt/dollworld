/**
 * Catch Sha256Provider throws at public hash boundaries so callers receive a
 * ValidationResult failure instead of an external exception (S01-005 audit).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";

export function safeHashUtf8(
  provider: Sha256Provider,
  text: string,
  path: string,
): ValidationResult<string> {
  try {
    return success(provider.hashUtf8(text));
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
