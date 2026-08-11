import { spawnSync } from "node:child_process";
import type { CommandGateResult, VerificationIssue } from "./types.js";

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  label: string,
): { result: CommandGateResult; failures: VerificationIssue[]; stdout: string; stderr: string } {
  const spawned = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  const exitCode = spawned.status ?? 1;
  const stdout = spawned.stdout?.toString() ?? "";
  const stderr = spawned.stderr?.toString() ?? "";
  const passed = exitCode === 0;
  const failures: VerificationIssue[] = [];
  if (!passed) {
    failures.push({
      code: "SPRINT1_COMMAND_GATE_FAILED",
      message: `${label} failed with exit ${String(exitCode)}: ${stderr || stdout.slice(0, 2000)}`,
      scope: `check/${label}`,
    });
  }
  return {
    result: {
      command: `${command} ${args.join(" ")}`.trim(),
      exitCode,
      passed,
    },
    failures,
    stdout,
    stderr,
  };
}

export function runNpmCheck(repoRoot: string) {
  return runCommand(npmCommand(), ["run", "check"], repoRoot, "npmCheck");
}

export function runWikiCheck(repoRoot: string) {
  return runCommand(npmCommand(), ["run", "wiki:check"], repoRoot, "wikiCheck");
}

export function runDiffCheck(repoRoot: string) {
  return runCommand("git", ["diff", "--check", "HEAD"], repoRoot, "diffCheck");
}

export function runVerifySprint0Command(repoRoot: string) {
  return runCommand(npmCommand(), ["run", "verify:sprint0"], repoRoot, "verifySprint0");
}
