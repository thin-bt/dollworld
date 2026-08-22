#!/usr/bin/env node
/**
 * Sprint 1.5 completion aggregator (completion-only).
 * Runs already-accepted verification surfaces; does not change game/domain semantics.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "0.1.0";
const SPRINT = "1.5";
const REPORT_RELATIVE = "output/sprint1.5-verification/sprint1.5-completion-report.json";

const CHILD_CHECKS = [
  { key: "check", command: "npm run check" },
  { key: "verifySprint1", command: "npm run verify:sprint1" },
  { key: "e2eChrome", command: "npm run e2e:chrome" },
  { key: "e2eEdge", command: "npm run e2e:edge" },
];

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    exitCode: result.status === null ? 1 : result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

function porcelainDirty(text) {
  return text.trim().length > 0;
}

function resolveGitIdentity() {
  const head = runGit(["rev-parse", "HEAD"]);
  if (head.error !== undefined || head.exitCode !== 0) {
    return {
      gitCommit: null,
      workingTreeDirty: true,
      identityError:
        head.error !== undefined ? head.error.message : head.stderr.trim() || "git HEAD unresolved",
    };
  }
  const status = runGit(["status", "--porcelain"]);
  if (status.error !== undefined || status.exitCode !== 0) {
    return {
      gitCommit: head.stdout.trim(),
      workingTreeDirty: true,
      identityError:
        status.error !== undefined
          ? status.error.message
          : status.stderr.trim() || "git status unresolved",
    };
  }
  return {
    gitCommit: head.stdout.trim(),
    workingTreeDirty: porcelainDirty(status.stdout),
    identityError: null,
  };
}

function runNpmScript(scriptName) {
  const result = spawnSync(NPM, ["run", scriptName], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
    shell: false,
  });
  if (result.error !== undefined) {
    return { exitCode: 1, passed: false, spawnError: result.error.message };
  }
  const exitCode = result.status === null ? 1 : result.status;
  return { exitCode, passed: exitCode === 0, spawnError: null };
}

function writeReportAtomic(reportPath, report) {
  mkdirSync(dirname(reportPath), { recursive: true });
  const tmpPath = `${reportPath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  renameSync(tmpPath, reportPath);
}

function main() {
  const generatedAt = new Date().toISOString();
  const startIdentity = resolveGitIdentity();
  const failures = [];
  const warnings = [];
  const checks = {};

  if (startIdentity.gitCommit === null) {
    failures.push({
      code: "GIT_HEAD_UNRESOLVED",
      message: startIdentity.identityError ?? "git HEAD unresolved",
    });
  }
  if (startIdentity.identityError !== null && startIdentity.gitCommit !== null) {
    failures.push({
      code: "GIT_STATUS_UNRESOLVED",
      message: startIdentity.identityError,
    });
  }
  if (startIdentity.workingTreeDirty) {
    failures.push({
      code: "WORKING_TREE_DIRTY",
      message: "verification clone working tree is dirty at aggregator start",
    });
  }

  const identityOk = startIdentity.gitCommit !== null && startIdentity.identityError === null;
  const mayRunChildren = identityOk && !startIdentity.workingTreeDirty;

  for (const child of CHILD_CHECKS) {
    const scriptName = child.command.replace(/^npm run /, "");
    if (!mayRunChildren) {
      checks[child.key] = {
        command: child.command,
        exitCode: null,
        passed: false,
        skipped: true,
        reason: "preflight identity/dirty failure",
      };
      failures.push({
        code: "CHILD_SKIPPED",
        message: `${child.command} skipped due to preflight failure`,
      });
      continue;
    }
    const ran = runNpmScript(scriptName);
    checks[child.key] = {
      command: child.command,
      exitCode: ran.exitCode,
      passed: ran.passed,
    };
    if (ran.spawnError !== null) {
      failures.push({
        code: "CHILD_SPAWN_ERROR",
        message: `${child.command}: ${ran.spawnError}`,
      });
    } else if (!ran.passed) {
      failures.push({
        code: "CHILD_FAILED",
        message: `${child.command} exited ${String(ran.exitCode)}`,
      });
    }
  }

  const endIdentity = resolveGitIdentity();
  if (
    endIdentity.gitCommit !== null &&
    startIdentity.gitCommit !== null &&
    endIdentity.gitCommit !== startIdentity.gitCommit
  ) {
    failures.push({
      code: "HEAD_MOVED",
      message: "HEAD changed during verification",
    });
  }
  if (endIdentity.workingTreeDirty && !startIdentity.workingTreeDirty) {
    failures.push({
      code: "WORKING_TREE_DIRTY_AFTER",
      message: "verification clone working tree became dirty after child checks",
    });
  }

  const functionalFailureCount = failures.length;
  const overallPassed = functionalFailureCount === 0;
  const report = {
    schemaVersion: SCHEMA_VERSION,
    sprint: SPRINT,
    overallPassed,
    functionalFailureCount,
    failures,
    warningCount: warnings.length,
    warnings,
    gitCommit: startIdentity.gitCommit,
    workingTreeDirty: startIdentity.workingTreeDirty,
    checks,
    generatedAt,
  };

  const reportPath = join(REPO_ROOT, REPORT_RELATIVE);
  try {
    writeReportAtomic(reportPath, report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`verify:sprint1.5 failed to write report: ${message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `verify:sprint1.5 ${overallPassed ? "PASS" : "FAIL"} report=${REPORT_RELATIVE} gitCommit=${startIdentity.gitCommit ?? "null"}\n`,
  );
  process.exitCode = overallPassed ? 0 : 1;
}

main();
