import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EXIT_RUNTIME_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR, runCli } from "./cli.js";
import { FIXED_OUTPUT_FILE_NAMES } from "./output/fixed-files.js";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const BASELINE_CONFIG = "config/initial-world.config.json";
const SPRINT1_CONFIG = "apps/simulator/fixtures/sprint1/tiny-initial-world.config.json";
const SPRINT1_INPUT = "apps/simulator/fixtures/sprint1/sprint1-input.json";
const SPRINT1_SEED = "4242";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "dollworld-simulator-sprint1-"));
  tempDirs.push(dir);
  return dir;
}

function extractRunDirectory(stdout: string): string {
  const match = /outputDirectory=(.+)\n/.exec(`${stdout}\n`);
  expect(match).not.toBeNull();
  return match![1]!.trim();
}

describe("runCli Sprint 1", () => {
  it("shows --sprint1-input in help", () => {
    const dir = makeTempDir();
    const result = runCli(["--help"], { cwd: REPO_ROOT, outputRoot: join(dir, "output") });
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    expect(result.stdout).toContain("--sprint1-input");
  });

  it("runs Sprint 1 mode with --sprint1-input and writes exactly 7 files", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const result = runCli(
      [
        "--years",
        "1",
        "--seed",
        SPRINT1_SEED,
        "--config",
        SPRINT1_CONFIG,
        "--sprint1-input",
        SPRINT1_INPUT,
      ],
      { cwd: REPO_ROOT, outputRoot },
    );
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("simulation completed");
    expect(result.stdout).toContain(`seed=${SPRINT1_SEED}`);
    expect(result.stdout).toContain("7 files written");

    const runDirectory = extractRunDirectory(result.stdout);
    expect(readdirSync(runDirectory).sort()).toEqual([...FIXED_OUTPUT_FILE_NAMES].sort());

    const metadata = JSON.parse(
      readFileSync(join(runDirectory, "run-metadata.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(metadata["schemaVersion"]).toBe("0.4.0");
    expect(metadata["eventEnvelopeSchemaVersion"]).toBe("0.2.0");
    expect(metadata["simulationIdentity"]).toBeTruthy();
    expect(metadata["simulationIdentityHash"]).toMatch(/^[0-9a-f]{64}$/);

    const initialWorld = JSON.parse(
      readFileSync(join(runDirectory, "initial-world.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(initialWorld["schemaVersion"]).toBe("0.4.0");
    expect(initialWorld["initialWeeklyTrainingSidecarSnapshot"]).toBeTruthy();

    const finalWorld = JSON.parse(
      readFileSync(join(runDirectory, "final-world.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(finalWorld["schemaVersion"]).toBe("0.3.0");
    const sidecars = finalWorld["weeklyTrainingSidecars"] as { entries?: unknown[] };
    expect(Array.isArray(sidecars.entries)).toBe(true);
    expect(finalWorld["battleResults"]).toEqual([]);
  }, 120_000);

  it("matches deterministic Sprint 1 artifacts for the same seed without scheduling battles", () => {
    const dir = makeTempDir();
    const run = (outputRoot: string) => {
      const result = runCli(
        [
          "--years",
          "1",
          "--seed",
          SPRINT1_SEED,
          "--config",
          SPRINT1_CONFIG,
          "--sprint1-input",
          SPRINT1_INPUT,
        ],
        { cwd: REPO_ROOT, outputRoot },
      );
      expect(result.exitCode).toBe(EXIT_SUCCESS);
      return extractRunDirectory(result.stdout);
    };
    const first = run(join(dir, "first"));
    const second = run(join(dir, "second"));

    for (const fileName of [
      "initial-world.json",
      "final-world.json",
      "events.jsonl",
      "yearly-statistics.csv",
    ]) {
      expect(readFileSync(join(first, fileName), "utf8")).toBe(
        readFileSync(join(second, fileName), "utf8"),
      );
    }
    const firstMetadata = JSON.parse(
      readFileSync(join(first, "run-metadata.json"), "utf8"),
    ) as Record<string, unknown>;
    const secondMetadata = JSON.parse(
      readFileSync(join(second, "run-metadata.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(secondMetadata["simulationId"]).toBe(firstMetadata["simulationId"]);
    expect(secondMetadata["simulationIdentityHash"]).toBe(firstMetadata["simulationIdentityHash"]);

    const finalWorld = JSON.parse(readFileSync(join(first, "final-world.json"), "utf8")) as Record<
      string,
      unknown
    >;
    expect(finalWorld["battleResults"]).toEqual([]);
  }, 180_000);

  it("rejects invalid sprint1-input before writing output", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const badInputPath = join(dir, "bad-sprint1-input.json");
    writeFileSync(badInputPath, JSON.stringify({ schemaVersion: "0.1.0", extra: true }), "utf8");

    const result = runCli(
      [
        "--years",
        "1",
        "--seed",
        SPRINT1_SEED,
        "--config",
        SPRINT1_CONFIG,
        "--sprint1-input",
        badInputPath,
      ],
      { cwd: REPO_ROOT, outputRoot },
    );
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toContain("sprint1-input validation failed");
    expect(result.stdout).toBe("");
    expect(existsSync(outputRoot)).toBe(false);
  });

  it("keeps Sprint 0 behavior when --sprint1-input is omitted", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const result = runCli(["--years", "1", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
      outputRoot,
    });
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("simulation completed");
    expect(result.stdout).toContain("seed=12345");
    expect(result.stdout).toContain("7 files written");

    const runDirectory = extractRunDirectory(result.stdout);
    const metadata = JSON.parse(
      readFileSync(join(runDirectory, "run-metadata.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(metadata["schemaVersion"]).toBeUndefined();
    expect(metadata["simulationIdentity"]).toBeUndefined();
  }, 60_000);

  it("rejects unknown options including --enable-sprint1", () => {
    const result = runCli(
      ["--years", "1", "--seed", SPRINT1_SEED, "--config", SPRINT1_CONFIG, "--enable-sprint1"],
      { cwd: REPO_ROOT },
    );
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stdout).toBe("");
  });
});
