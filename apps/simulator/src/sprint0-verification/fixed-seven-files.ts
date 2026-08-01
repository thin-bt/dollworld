import { readdirSync, type Dirent } from "node:fs";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";

export type FixedSevenFilesIssue = {
  name: string;
  targetIds: string[];
  reason: string;
  severity: "error";
  canContinue: boolean;
};

export type FixedSevenFilesResult = {
  passed: boolean;
  entryCount: number;
  actualFileNames: string[];
  issues: FixedSevenFilesIssue[];
};

function issue(name: string, reason: string, targetIds: string[] = []): FixedSevenFilesIssue {
  return { name, reason, targetIds, severity: "error", canContinue: false };
}

function describeEntryKind(entry: Dirent): string {
  if (entry.isDirectory()) {
    return "directory";
  }
  if (entry.isSymbolicLink()) {
    return "symbolic link";
  }
  if (entry.isFile()) {
    return "file";
  }
  return "non-regular entry";
}

/**
 * Verify a set of directory entries is exactly the fixed 7 regular files.
 * Directories, symbolic links, and other entry kinds always fail, including
 * when they carry a required file name.
 */
export function verifyFixedSevenDirents(entries: readonly Dirent[]): FixedSevenFilesResult {
  const issues: FixedSevenFilesIssue[] = [];
  const expected = [...FIXED_OUTPUT_FILE_NAMES].sort();
  const expectedSet = new Set<string>(expected);
  const regularFileNames: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && !entry.isSymbolicLink()) {
      regularFileNames.push(entry.name);
      continue;
    }
    issues.push(
      issue("sevenFiles.nonRegularEntry", `unexpected ${describeEntryKind(entry)}: ${entry.name}`, [
        entry.name,
      ]),
    );
  }
  regularFileNames.sort();

  const regularFileSet = new Set<string>(regularFileNames);
  for (const name of expected) {
    if (!regularFileSet.has(name)) {
      issues.push(issue("sevenFiles.missing", `missing required file: ${name}`, [name]));
    }
  }
  for (const name of regularFileNames) {
    if (!expectedSet.has(name)) {
      issues.push(issue("sevenFiles.extra", `unexpected extra file: ${name}`, [name]));
    }
  }
  if (entries.length !== expected.length) {
    issues.push(
      issue(
        "sevenFiles.count",
        `expected ${String(expected.length)} entries, found ${String(entries.length)}`,
        entries.map((entry) => entry.name),
      ),
    );
  }

  return {
    passed: issues.length === 0,
    entryCount: entries.length,
    actualFileNames: regularFileNames,
    issues,
  };
}

/**
 * Strictly verify that runDirectory contains exactly the fixed 7 regular files.
 */
export function verifyFixedSevenFilesOnDisk(runDirectory: string): FixedSevenFilesResult {
  return verifyFixedSevenDirents(readdirSync(runDirectory, { withFileTypes: true }));
}
