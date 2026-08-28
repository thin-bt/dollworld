import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EVIDENCE_OUTPUT_ROOT_ENV,
  isRepoLocalEvidenceOutputEnabled,
  repoRootForEvidenceTests,
  resolveE2eEvidenceDir,
} from "./evidence-output-root.js";

const REPO_LOCAL =
  "_handoff-artifacts/audit/current/S1_5-RUNTIME-EVIDENCE-GAP-CLOSURE-FIX5-20260819";

describe("resolveE2eEvidenceDir", () => {
  afterEach(() => {
    delete process.env[EVIDENCE_OUTPUT_ROOT_ENV];
  });

  it("defaults to an external root outside repo _handoff-artifacts", () => {
    const resolved = resolveE2eEvidenceDir(REPO_LOCAL);
    const repoRoot = repoRootForEvidenceTests();

    expect(resolved.startsWith(join(repoRoot, "_handoff-artifacts"))).toBe(false);
    expect(resolved.endsWith("S1_5-RUNTIME-EVIDENCE-GAP-CLOSURE-FIX5-20260819")).toBe(true);
    expect(isRepoLocalEvidenceOutputEnabled()).toBe(false);
  });

  it("preserves repo-local layout when output root is the repository root", () => {
    const repoRoot = repoRootForEvidenceTests();
    process.env[EVIDENCE_OUTPUT_ROOT_ENV] = repoRoot;

    expect(resolveE2eEvidenceDir(REPO_LOCAL)).toBe(join(repoRoot, REPO_LOCAL));
    expect(isRepoLocalEvidenceOutputEnabled()).toBe(true);
  });

  it("writes under a custom external root when explicitly configured", () => {
    const externalRoot = mkdtempSync(join(tmpdir(), "dollworld-evidence-test-"));
    process.env[EVIDENCE_OUTPUT_ROOT_ENV] = externalRoot;

    try {
      expect(resolveE2eEvidenceDir(REPO_LOCAL)).toBe(
        join(externalRoot, "S1_5-RUNTIME-EVIDENCE-GAP-CLOSURE-FIX5-20260819"),
      );
      expect(isRepoLocalEvidenceOutputEnabled()).toBe(false);
    } finally {
      rmSync(externalRoot, { recursive: true, force: true });
    }
  });
});
