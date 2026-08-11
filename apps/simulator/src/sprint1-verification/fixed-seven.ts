import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";
import type { FixedSevenSection, RunArtifactRef, VerificationIssue } from "./types.js";

function assertFixedSevenDirectory(absoluteRunDirectory: string): string[] {
  const problems: string[] = [];
  let entries;
  try {
    entries = readdirSync(absoluteRunDirectory, { withFileTypes: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [`cannot read ${absoluteRunDirectory}: ${detail}`];
  }
  if (entries.length !== FIXED_OUTPUT_FILE_NAMES.length) {
    problems.push(
      `entry count ${String(entries.length)} !== ${String(FIXED_OUTPUT_FILE_NAMES.length)}`,
    );
  }
  const names = new Set(entries.map((entry) => entry.name));
  for (const required of FIXED_OUTPUT_FILE_NAMES) {
    if (!names.has(required)) {
      problems.push(`missing ${required}`);
    }
  }
  for (const entry of entries) {
    const absolute = join(absoluteRunDirectory, entry.name);
    if (!entry.isFile() || statSync(absolute).isSymbolicLink()) {
      problems.push(`${entry.name} is not a regular file`);
    }
    if (!(FIXED_OUTPUT_FILE_NAMES as readonly string[]).includes(entry.name)) {
      problems.push(`unexpected ${entry.name}`);
    }
  }
  return problems;
}

export type FixedSevenVerificationResult = {
  section: FixedSevenSection;
  failures: VerificationIssue[];
};

export function verifyFixedSevenArtifacts(input: {
  absoluteRunDirectories: readonly string[];
  refs: readonly RunArtifactRef[];
}): FixedSevenVerificationResult {
  const failures: VerificationIssue[] = [];
  let allExactlySeven = true;
  for (let i = 0; i < input.absoluteRunDirectories.length; i += 1) {
    const dir = input.absoluteRunDirectories[i]!;
    const problems = assertFixedSevenDirectory(dir);
    if (problems.length > 0) {
      allExactlySeven = false;
      failures.push({
        code: "SPRINT1_FIXED7_INVALID",
        message: `${dir}: ${problems.join("; ")}`,
        scope: `fixedSeven/${input.refs[i]?.runKey ?? String(i)}`,
      });
    }
  }
  return {
    section: {
      status: failures.length === 0 ? "passed" : "failed",
      inspectedRunCount: input.absoluteRunDirectories.length,
      allExactlySeven,
      detail:
        failures.length === 0
          ? `inspected ${String(input.absoluteRunDirectories.length)} fixed7 directories`
          : failures.map((item) => item.message).join("; "),
    },
    failures,
  };
}
