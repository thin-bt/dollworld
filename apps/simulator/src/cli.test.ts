import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toCanonicalJson } from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { EXIT_RUNTIME_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR, runCli } from "./cli.js";
import { createNodeSha256Provider } from "./node-sha256-provider.js";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const BASELINE_CONFIG = "config/initial-world.config.json";

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
  const dir = mkdtempSync(join(tmpdir(), "dollworld-simulator-"));
  tempDirs.push(dir);
  return dir;
}

function cloneBaselineConfig(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, BASELINE_CONFIG), "utf8")) as Record<
    string,
    unknown
  >;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

describe("node-sha256-provider", () => {
  it("matches known SHA-256 digests for empty string and abc", () => {
    const provider = createNodeSha256Provider();
    expect(provider.hashUtf8("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(provider.hashUtf8("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("runCli", () => {
  it("shows help and exits 0", () => {
    const dir = makeTempDir();
    const result = runCli(["--help"], { cwd: REPO_ROOT, outputRoot: join(dir, "output") });
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    expect(result.stdout).toContain("--years");
    expect(result.stdout).toContain("--seed");
    expect(result.stdout).toContain("--config");
    expect(result.stderr).toBe("");
    expect(existsSync(join(dir, "output"))).toBe(false);
  });

  it("runs a normal 1-year simulation and prints a concise summary", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const result = runCli(["--years", "1", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
      outputRoot,
    });
    expect(result.exitCode).toBe(EXIT_SUCCESS);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("simulation completed");
    expect(result.stdout).toContain("years=1");
    expect(result.stdout).toContain("seed=12345");
    expect(result.stdout).toMatch(/simulationId=simulation_[0-9a-f]{16}/);
    expect(result.stdout).toMatch(/initialPersons=\d+/);
    expect(result.stdout).toMatch(/initialFamilies=\d+/);
    expect(result.stdout).toMatch(/initialLineages=\d+/);
    expect(result.stdout).toMatch(/finalWorldDate=\d+-\d+-W\d+@\d+/);
    expect(result.stdout).toContain("weeksExecuted=48");
    expect(result.stdout).toMatch(/runId=run_\d{8}T\d{9}Z_\d{4}/);
    expect(result.stdout).toContain("outputDirectory=");
    expect(result.stdout).toContain("7 files written");
    expect(result.stdout).not.toContain('"persons"');
    expect(result.stdout).not.toContain("events=");
  }, 60_000);

  it("rejects missing --years", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const result = runCli(["--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
      outputRoot,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("--years");
    expect(result.stdout).toBe("");
    expect(existsSync(outputRoot)).toBe(false);
  });

  it("rejects missing --seed", () => {
    const result = runCli(["--years", "1", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("--seed");
    expect(result.stdout).toBe("");
  });

  it("rejects missing --config", () => {
    const result = runCli(["--years", "1", "--seed", "12345"], { cwd: REPO_ROOT });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("--config");
    expect(result.stdout).toBe("");
  });

  it("rejects years=0", () => {
    const result = runCli(["--years", "0", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("years");
    expect(result.stdout).toBe("");
  });

  it("rejects negative years", () => {
    const result = runCli(["--years", "-1", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("years");
    expect(result.stdout).toBe("");
  });

  it("rejects non-integer years", () => {
    const result = runCli(["--years", "1.5", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("years");
    expect(result.stdout).toBe("");
  });

  it("rejects seed=-1", () => {
    const result = runCli(["--years", "1", "--seed", "-1", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("seed");
    expect(result.stdout).toBe("");
    expect(result.stdout).not.toContain("simulation completed");
  });

  it("rejects seed=1.5", () => {
    const result = runCli(["--years", "1", "--seed", "1.5", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("seed");
    expect(result.stdout).toBe("");
    expect(result.stdout).not.toContain("simulation completed");
  });

  it("rejects seed=4294967296", () => {
    const result = runCli(["--years", "1", "--seed", "4294967296", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr).toContain("seed");
    expect(result.stdout).toBe("");
    expect(result.stdout).not.toContain("simulation completed");
  });

  it("rejects unknown arguments", () => {
    const result = runCli(
      ["--years", "1", "--seed", "12345", "--config", BASELINE_CONFIG, "--output", "x"],
      { cwd: REPO_ROOT },
    );
    expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stdout).toBe("");
  });

  it("rejects a missing config file", () => {
    const result = runCli(
      [
        "--years",
        "1",
        "--seed",
        "12345",
        "--config",
        "config/does-not-exist-initial-world.config.json",
      ],
      { cwd: REPO_ROOT },
    );
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toMatch(/failed to read file|ENOENT/i);
    expect(result.stdout).toBe("");
  });

  it("rejects invalid JSON config", () => {
    const dir = makeTempDir();
    const configPath = join(dir, "bad.json");
    writeFileSync(configPath, "{ not json", "utf8");
    const result = runCli(["--years", "1", "--seed", "12345", "--config", configPath], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toContain("invalid JSON");
    expect(result.stdout).toBe("");
  });

  it("rejects config that fails validation", () => {
    const dir = makeTempDir();
    const configPath = join(dir, "invalid-config.json");
    writeFileSync(configPath, JSON.stringify({ schemaVersion: "x" }), "utf8");
    const result = runCli(["--years", "1", "--seed", "12345", "--config", configPath], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toContain("config validation failed");
    expect(result.stdout).toBe("");
  });

  it("rejects missing name-data manifest referenced by config", () => {
    const dir = makeTempDir();
    const baseline = cloneBaselineConfig();
    const nameData = asObject(baseline["nameData"], "nameData");
    const config = {
      ...baseline,
      nameData: {
        ...nameData,
        manifestPath: "data/names/__missing_for_cli_test__/name-data.manifest.json",
      },
    };
    const configPath = join(dir, "config-missing-manifest.json");
    writeFileSync(configPath, JSON.stringify(config), "utf8");

    const result = runCli(["--years", "1", "--seed", "12345", "--config", configPath], {
      cwd: REPO_ROOT,
    });
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toMatch(/failed to read file|ENOENT|name data/i);
    expect(result.stdout).toBe("");
  });

  it("rejects incomplete name-data manifest schema", () => {
    const dir = makeTempDir();
    const namesDir = join(dir, "names");
    mkdirSync(namesDir, { recursive: true });
    writeFileSync(
      join(namesDir, "name-data.manifest.json"),
      JSON.stringify({ schemaVersion: "1.1.0" }),
      "utf8",
    );

    const baseline = cloneBaselineConfig();
    const nameData = asObject(baseline["nameData"], "nameData");
    const config = {
      ...baseline,
      nameData: {
        ...nameData,
        manifestPath: "names/name-data.manifest.json",
      },
    };
    const configPath = join(dir, "config-incomplete-manifest.json");
    writeFileSync(configPath, JSON.stringify(config), "utf8");

    const result = runCli(
      ["--years", "1", "--seed", "12345", "--config", "config-incomplete-manifest.json"],
      {
        cwd: dir,
      },
    );
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toContain("name data manifest validation failed");
    expect(result.stdout).toBe("");
  });

  it("rejects invalid name candidate data", () => {
    const dir = makeTempDir();
    const namesDir = join(dir, "names");
    mkdirSync(namesDir, { recursive: true });

    const provider = createNodeSha256Provider();
    const emptyNameCandidate = {
      schemaVersion: "1.0.0",
      nameDataVersion: "NAMES-CLI-BAD",
      locale: "ja-JP",
      style: "test",
      encoding: "UTF-8",
      notes: "invalid empty name",
      category: "family_name",
      count: 1,
      names: [""],
    };
    const male = {
      ...emptyNameCandidate,
      category: "male_given_name",
      names: ["MaleA"],
    };
    const female = {
      ...emptyNameCandidate,
      category: "female_given_name",
      names: ["FemaleA"],
    };
    const neutral = {
      ...emptyNameCandidate,
      category: "neutral_given_name",
      names: ["NeutralA"],
    };

    writeFileSync(join(namesDir, "family-names.json"), JSON.stringify(emptyNameCandidate), "utf8");
    writeFileSync(join(namesDir, "male-given-names.json"), JSON.stringify(male), "utf8");
    writeFileSync(join(namesDir, "female-given-names.json"), JSON.stringify(female), "utf8");
    writeFileSync(join(namesDir, "neutral-given-names.json"), JSON.stringify(neutral), "utf8");

    const manifest = {
      schemaVersion: "1.1.0",
      nameDataVersion: "NAMES-CLI-BAD",
      locale: "ja-JP",
      style: "test",
      displayFormat: "{givenName}・{familyName}",
      files: {
        family: {
          path: "family-names.json",
          count: 1,
          sha256: provider.hashUtf8(toCanonicalJson(emptyNameCandidate)),
        },
        male: {
          path: "male-given-names.json",
          count: 1,
          sha256: provider.hashUtf8(toCanonicalJson(male)),
        },
        female: {
          path: "female-given-names.json",
          count: 1,
          sha256: provider.hashUtf8(toCanonicalJson(female)),
        },
        neutral: {
          path: "neutral-given-names.json",
          count: 1,
          sha256: provider.hashUtf8(toCanonicalJson(neutral)),
        },
      },
      selectionPolicy: {
        familyNames: "without replacement",
        givenNames: "sex pool",
        duplicateLivingFullNameWithinFamily: "scan",
        historicalReuse: "allowed",
        rng: "seeded only",
      },
      hashAlgorithm: "sha256-canonical-json-v1",
    };
    writeFileSync(join(namesDir, "name-data.manifest.json"), JSON.stringify(manifest), "utf8");

    const baseline = cloneBaselineConfig();
    const nameData = asObject(baseline["nameData"], "nameData");
    const config = {
      ...baseline,
      nameData: {
        ...nameData,
        manifestPath: "names/name-data.manifest.json",
        requiredVersion: "NAMES-CLI-BAD",
      },
    };
    const configPath = join(dir, "config.json");
    writeFileSync(configPath, JSON.stringify(config), "utf8");

    const result = runCli(["--years", "1", "--seed", "12345", "--config", "config.json"], {
      cwd: dir,
    });
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toMatch(/name data/i);
    expect(result.stdout).toBe("");
  });
});
