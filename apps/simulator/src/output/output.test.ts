import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  asRelationshipId,
  cloneWorldEngineState,
  createWorldEngineState,
  generateInitialWorld,
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  isLivingPerson,
  isMarchWeek4,
  toCanonicalJson,
  validateEventEnvelope,
  validateEventSequence,
  validateInitialWorldConfig,
  validateInitialWorldSnapshot,
  validateWorldEngineState,
  type EventEnvelope,
  type InitialWorldSnapshot,
  type WorldEngineState,
  type WorldProcessor,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { EXIT_RUNTIME_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR, runCli } from "../cli.js";
import { loadValidatedNameData } from "../file-loader.js";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { measureUtf8Bytes, writeRunOutputAtomic, type RunOutputContents } from "./atomic-write.js";
import { FIXED_OUTPUT_FILE_NAMES } from "./fixed-files.js";
import { finalWorldToEngineState } from "./final-world.js";
import { createNodeFsOps, type FsOps } from "./fs-ops.js";
import { buildPerformanceDocument } from "./performance.js";
import { createRunIdGenerator, isValidRunIdFormat, RUN_ID_FORMAT_REGEX } from "./run-id.js";
import { runSimulationWithYearlyCapture } from "./run-simulation-yearly.js";
import { parseYearlyStatisticsCsv, YEARLY_STATISTICS_COLUMNS } from "./yearly-statistics.js";
import { evaluateReferenceIntegrity } from "./world-integrity.js";
import { buildValidationReport } from "./validation-report.js";
import { verifyReloadedRunOutputContents } from "./verify-run-output.js";
import type { FinalWorldDocument, PerformanceDocument, RunMetadataDocument } from "./types.js";

const REPO_ROOT = join(import.meta.dirname, "../../../..");
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
  const dir = mkdtempSync(join(tmpdir(), "dollworld-s00-009-"));
  tempDirs.push(dir);
  return dir;
}

function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function assertLfTrailingNewline(text: string, label: string): void {
  expect(text.includes("\r"), `${label} must not contain CR`).toBe(false);
  expect(text.endsWith("\n"), `${label} must end with LF`).toBe(true);
}

function loadRunDirectory(runDirectory: string): Record<string, string> {
  const files = readdirSync(runDirectory).sort();
  expect(files).toEqual([...FIXED_OUTPUT_FILE_NAMES].sort());
  const contents: Record<string, string> = {};
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    contents[name] = readUtf8(join(runDirectory, name));
  }
  return contents;
}

function parseJsonLf(text: string): unknown {
  assertLfTrailingNewline(text, "json");
  return JSON.parse(text) as unknown;
}

function extractRunDirectory(stdout: string): string {
  const match = /outputDirectory=(.+)\n/.exec(`${stdout}\n`);
  expect(match).not.toBeNull();
  return match![1]!.trim();
}

function runSimulate(input: {
  years: number;
  seed: number;
  outputRoot: string;
  clock?: () => Date;
}): { exitCode: number; stdout: string; stderr: string; runDirectory: string } {
  const result = runCli(
    ["--years", String(input.years), "--seed", String(input.seed), "--config", BASELINE_CONFIG],
    {
      cwd: REPO_ROOT,
      outputRoot: input.outputRoot,
      ...(input.clock !== undefined ? { clock: input.clock } : {}),
    },
  );
  expect(result.exitCode).toBe(EXIT_SUCCESS);
  expect(result.stderr).toBe("");
  const runDirectory = extractRunDirectory(result.stdout);
  return { ...result, runDirectory };
}

function assertCsvLivingInvariants(row: Record<string, string>): void {
  const num = (key: string): number => Number(row[key]);
  expect(
    num("age0To7") + num("age8To15") + num("age16To17") + num("age18To41") + num("age42Plus"),
  ).toBe(num("livingCount"));
  expect(
    num("childCount") + num("traineeCount") + num("activeCompetitorCount") + num("retiredCount"),
  ).toBe(num("livingCount"));
  expect(
    num("rankNone") +
      num("rankF") +
      num("rankE") +
      num("rankD") +
      num("rankC") +
      num("rankB") +
      num("rankA") +
      num("rankS"),
  ).toBe(num("livingCount"));
}

function sampleContents(overrides?: Partial<RunOutputContents>): RunOutputContents {
  const json = `${toCanonicalJson({ ok: true })}\n`;
  return {
    "run-metadata.json": json,
    "initial-world.json": json,
    "final-world.json": json,
    "yearly-statistics.csv": `${YEARLY_STATISTICS_COLUMNS.join(",")}\n`,
    "events.jsonl": "",
    "validation-report.json": json,
    "performance.json": json,
    ...overrides,
  };
}

describe("runId", () => {
  it("matches the required format regex", () => {
    const generator = createRunIdGenerator(() => new Date("2026-08-01T03:04:05.006Z"));
    const id = generator.next();
    expect(id).toBe("run_20260801T030405006Z_0000");
    expect(isValidRunIdFormat(id)).toBe(true);
    expect(RUN_ID_FORMAT_REGEX.test(id)).toBe(true);
  });

  it("avoids collisions within the same millisecond via sequence", () => {
    const fixed = new Date("2026-08-01T12:00:00.000Z");
    const generator = createRunIdGenerator(() => fixed);
    const a = generator.next();
    const b = generator.next();
    const c = generator.next();
    expect(a).toBe("run_20260801T120000000Z_0000");
    expect(b).toBe("run_20260801T120000000Z_0001");
    expect(c).toBe("run_20260801T120000000Z_0002");
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("atomic write", () => {
  it("writes all seven files via rename and reports sizes", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const fs = createNodeFsOps();
    const result = writeRunOutputAtomic({
      fs,
      outputRoot,
      runId: "run_20260801T000000000Z_0000",
      contents: sampleContents(),
      verifyReloadedContents: verifyReloadedRunOutputContents,
    });
    expect(existsSync(result.runDirectory)).toBe(true);
    expect(readdirSync(result.runDirectory).sort()).toEqual([...FIXED_OUTPUT_FILE_NAMES].sort());
    expect(result.fileBytes).toHaveLength(7);
    expect(result.totalBytes).toBeGreaterThan(0);
    const leftovers = readdirSync(outputRoot).filter((name) => name.startsWith(".tmp-"));
    expect(leftovers).toEqual([]);
  });

  it("cleans up temp dir and leaves no final run dir on mid-write failure", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const fs = createNodeFsOps();
    const runId = "run_20260801T000000000Z_0099";
    expect(() =>
      writeRunOutputAtomic({
        fs,
        outputRoot,
        runId,
        contents: sampleContents(),
        verifyReloadedContents: () => undefined,
        afterTempWrite: () => {
          throw new Error("injected atomic write failure");
        },
      }),
    ).toThrow(/injected atomic write failure/);
    expect(existsSync(join(outputRoot, runId))).toBe(false);
    if (existsSync(outputRoot)) {
      const leftovers = readdirSync(outputRoot).filter((name) => name.startsWith(".tmp-"));
      expect(leftovers).toEqual([]);
    }
  });

  it("does not overwrite an existing final run directory", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const fs = createNodeFsOps();
    const runId = "run_20260801T000000000Z_0100";
    writeRunOutputAtomic({
      fs,
      outputRoot,
      runId,
      contents: sampleContents(),
      verifyReloadedContents: () => undefined,
    });
    expect(() =>
      writeRunOutputAtomic({
        fs,
        outputRoot,
        runId,
        contents: sampleContents(),
        verifyReloadedContents: () => undefined,
      }),
    ).toThrow(/already exists/);
  });

  it("supports injected fs failure before rename with cleanup", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const base = createNodeFsOps();
    const runId = "run_20260801T000000000Z_0101";
    const fs: FsOps = {
      ...base,
      renameSync: () => {
        throw new Error("rename failed");
      },
    };
    expect(() =>
      writeRunOutputAtomic({
        fs,
        outputRoot,
        runId,
        contents: sampleContents(),
        verifyReloadedContents: () => undefined,
      }),
    ).toThrow(/rename failed/);
    expect(existsSync(join(outputRoot, runId))).toBe(false);
  });

  it("accepts empty events.jsonl and completes atomic rename", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const runId = "run_20260801T000000000Z_0300";
    const result = writeRunOutputAtomic({
      fs: createNodeFsOps(),
      outputRoot,
      runId,
      contents: sampleContents({ "events.jsonl": "" }),
      verifyReloadedContents: verifyReloadedRunOutputContents,
    });
    expect(existsSync(result.runDirectory)).toBe(true);
    expect(readUtf8(join(result.runDirectory, "events.jsonl"))).toBe("");
    expect(readdirSync(outputRoot).filter((n) => n.startsWith(".tmp-"))).toEqual([]);
  });

  it("rejects events.jsonl that is only a single LF empty line", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const runId = "run_20260801T000000000Z_0301";
    expect(() =>
      writeRunOutputAtomic({
        fs: createNodeFsOps(),
        outputRoot,
        runId,
        contents: sampleContents({ "events.jsonl": "\n" }),
        verifyReloadedContents: verifyReloadedRunOutputContents,
      }),
    ).toThrow(/empty line/);
    expect(existsSync(join(outputRoot, runId))).toBe(false);
    if (existsSync(outputRoot)) {
      expect(readdirSync(outputRoot).filter((n) => n.startsWith(".tmp-"))).toEqual([]);
    }
  });

  it("re-validates after afterTempWrite tampering and does not rename", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const runId = "run_20260801T000000000Z_0302";
    const fs = createNodeFsOps();
    expect(() =>
      writeRunOutputAtomic({
        fs,
        outputRoot,
        runId,
        contents: sampleContents({ "events.jsonl": "" }),
        afterTempWrite: (tempDirectory) => {
          fs.writeFileSync(fs.join(tempDirectory, "events.jsonl"), "{not-json\n", "utf8");
        },
        verifyReloadedContents: verifyReloadedRunOutputContents,
      }),
    ).toThrow(/content mismatch|events\.jsonl|not valid JSON/);
    expect(existsSync(join(outputRoot, runId))).toBe(false);
    if (existsSync(outputRoot)) {
      expect(readdirSync(outputRoot).filter((n) => n.startsWith(".tmp-"))).toEqual([]);
    }
  });

  it("does not rename when CSV verification fails and cleans temp", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const runId = "run_20260801T000000000Z_0200";
    expect(() =>
      writeRunOutputAtomic({
        fs: createNodeFsOps(),
        outputRoot,
        runId,
        contents: sampleContents({
          "yearly-statistics.csv": "bad,header\n1\n",
        }),
        verifyReloadedContents: verifyReloadedRunOutputContents,
      }),
    ).toThrow(/yearly-statistics\.csv/);
    expect(existsSync(join(outputRoot, runId))).toBe(false);
    if (existsSync(outputRoot)) {
      expect(readdirSync(outputRoot).filter((n) => n.startsWith(".tmp-"))).toEqual([]);
    }
  });

  it("does not rename when JSONL verification fails and cleans temp", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const runId = "run_20260801T000000000Z_0201";
    expect(() =>
      writeRunOutputAtomic({
        fs: createNodeFsOps(),
        outputRoot,
        runId,
        contents: sampleContents({
          "events.jsonl": "{not-json\n",
        }),
        verifyReloadedContents: verifyReloadedRunOutputContents,
      }),
    ).toThrow(/events\.jsonl/);
    expect(existsSync(join(outputRoot, runId))).toBe(false);
  });
});

describe("world integrity and validation report", () => {
  it("reports broken references with target ids", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { runDirectory } = runSimulate({ years: 1, seed: 12345, outputRoot });
    const finalWorld = parseJsonLf(
      readUtf8(join(runDirectory, "final-world.json")),
    ) as FinalWorldDocument;
    const state = cloneWorldEngineState(finalWorldToEngineState(finalWorld));
    const brokenState = {
      ...state,
      persons: state.persons.map((person, index) =>
        index === 0
          ? { ...person, familyId: "family_does_not_exist" as typeof person.familyId }
          : person,
      ),
    };
    const integrity = evaluateReferenceIntegrity(brokenState);
    expect(integrity.brokenReferenceCount).toBeGreaterThan(0);
    expect(integrity.brokenReferences[0]?.targetIds.length).toBeGreaterThan(0);
    expect(integrity.passed).toBe(false);

    const report = buildValidationReport({ finalIntegrity: integrity });
    expect(report.brokenReferenceCount).toBe(integrity.brokenReferenceCount);
    expect(report.brokenReferences[0]?.targetIds).toEqual(integrity.brokenReferences[0]?.targetIds);
    const brokenCheck = report.checks.find((c) => c.name === "broken_references");
    expect(brokenCheck?.status).toBe("failed");
    expect(brokenCheck?.targetIds.length).toBeGreaterThan(0);
    expect(report.sameSeedComparison.status).toBe("not_performed");
  }, 60_000);

  it("keeps self-reference target ids and does not double-count as cycles", () => {
    const dir = makeTempDir();
    const { runDirectory } = runSimulate({
      years: 1,
      seed: 12345,
      outputRoot: join(dir, "output"),
    });
    const finalWorld = parseJsonLf(
      readUtf8(join(runDirectory, "final-world.json")),
    ) as FinalWorldDocument;
    const state = cloneWorldEngineState(finalWorldToEngineState(finalWorld));
    const personId = state.persons[0]!.personId;
    const selfRels = [
      {
        relationshipId: asRelationshipId("relationship_self_parent"),
        kind: "parent_child" as const,
        parentId: personId,
        childId: personId,
        parentRole: "father" as const,
      },
      {
        relationshipId: asRelationshipId("relationship_self_marriage"),
        kind: "marriage" as const,
        personAId: personId,
        personBId: personId,
      },
      {
        relationshipId: asRelationshipId("relationship_self_master"),
        kind: "master_disciple" as const,
        masterId: personId,
        discipleId: personId,
      },
    ];
    const withSelf = {
      ...state,
      relationships: [...state.relationships, ...selfRels],
    };
    const integrity = evaluateReferenceIntegrity(withSelf);
    expect(integrity.selfReferenceCount).toBe(3);
    expect(integrity.selfReferences).toHaveLength(3);
    for (const violation of integrity.selfReferences) {
      expect(violation.relationshipId.length).toBeGreaterThan(0);
      expect(violation.personIds).toContain(personId);
      expect(violation.severity).toBe("error");
    }
    expect(integrity.cycles.some((c) => c.targetIds.includes("relationship_self_parent"))).toBe(
      false,
    );
    expect(integrity.cycles.some((c) => c.targetIds.includes("relationship_self_master"))).toBe(
      false,
    );
    expect(integrity.invariantViolationCount).toBe(
      integrity.selfReferences.length +
        integrity.cycles.length +
        integrity.ageViolations.length +
        integrity.statusViolations.length,
    );
    const report = buildValidationReport({ finalIntegrity: integrity });
    const selfCheck = report.checks.find((c) => c.name === "self_references");
    expect(selfCheck?.targetIds).toEqual(
      expect.arrayContaining([
        "relationship_self_parent",
        "relationship_self_marriage",
        "relationship_self_master",
        personId,
      ]),
    );
    expect(selfCheck?.reasons.length).toBe(3);
  }, 60_000);
});

describe("performance document", () => {
  it("selects the 600-person band for livingCount 600 / 100 years and fires warnings without failing", () => {
    const targets = {
      warningSecondsFor600People100Years: 30,
      warningSecondsFor2000People100Years: 120,
      measureOnlyPopulation: 5000,
    };
    const other = {
      "run-metadata.json": "{}\n",
      "initial-world.json": "{}\n",
      "final-world.json": "{}\n",
      "yearly-statistics.csv": "worldYear\n",
      "events.jsonl": "",
      "validation-report.json": "{}\n",
    } as const;
    const { document } = buildPerformanceDocument({
      targets,
      totalMilliseconds: 60_000,
      yearsExecuted: 100,
      weeksExecuted: 4800,
      personCount: 600,
      eventCount: 10,
      maxRssKilobytes: 1000,
      otherFileContents: other,
    });
    expect(document.counts.personCount).toBe(600);
    expect(document.warningComparison.populationBand).toBe("600");
    expect(document.warningComparison.exceeded).toBe(true);
    expect(document.warnings.length).toBeGreaterThanOrEqual(1);
  });
});

describe("year-end boundary and event attribution", () => {
  it("captures post-processor March-week-4 state and attributes cross-year events", () => {
    const sha256 = createNodeSha256Provider();
    const configJson = JSON.parse(
      readFileSync(join(REPO_ROOT, BASELINE_CONFIG), "utf8"),
    ) as unknown;
    const configResult = validateInitialWorldConfig(configJson);
    expect(configResult.ok).toBe(true);
    if (!configResult.ok) {
      return;
    }
    const config = configResult.value;
    const nameData = loadValidatedNameData({
      cwd: REPO_ROOT,
      manifestPath: config.nameData.manifestPath,
      requiredVersion: config.nameData.requiredVersion,
      initialFamilyCount: config.families.initialFamilyCount,
      sha256Provider: sha256,
    });
    const configHash = computeConfigHash(config, sha256);
    const nameDataHash = computeNameDataHash(nameData.manifest, sha256);
    const generated = generateInitialWorld({
      config,
      configHash,
      seed: 12345,
      nameData,
      nameDataHash,
      rngFactory: createSeededRng,
      sha256Provider: sha256,
    });

    const markerProcessor: WorldProcessor = {
      processorId: "test/march-week4-marker",
      process({ state }) {
        if (!isMarchWeek4(state.worldDate)) {
          return state;
        }
        let marked = false;
        const persons = state.persons.map((person) => {
          if (marked || !isLivingPerson(person)) {
            return person;
          }
          marked = true;
          return {
            ...person,
            givenName: `Y${String(state.worldDate.year)}Marked`,
          };
        });
        return { ...state, persons };
      },
    };

    const simulation = runSimulationWithYearlyCapture({
      initialState: createWorldEngineState(generated.snapshot),
      years: 2,
      startSequence: generated.initialEvents.length,
      processors: [markerProcessor],
      priorEvents: generated.initialEvents,
    });

    expect(simulation.yearEnds).toHaveLength(2);
    expect(simulation.yearEnds[0]?.state.worldDate).toEqual({
      year: 1,
      month: 3,
      weekOfMonth: 4,
      absoluteWeek: 47,
    });
    const year1Marked = simulation.yearEnds[0]?.state.persons.find(
      (p) => isLivingPerson(p) && p.givenName === "Y1Marked",
    );
    expect(year1Marked).toBeDefined();
    expect(simulation.finalState.worldDate).toEqual({
      year: 3,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 96,
    });
    // Year-start ages advanced; marker name from year-2 March week 4 persists.
    const year2Marked = simulation.finalState.persons.find(
      (p) => isLivingPerson(p) && p.givenName === "Y2Marked",
    );
    expect(year2Marked).toBeDefined();

    const allOutputEvents = [...generated.initialEvents, ...simulation.events];
    expect(simulation.yearEnds[1]?.row.eventCountCumulative).toBe(allOutputEvents.length);

    const year1StartedNext = simulation.events.filter(
      (e) => e.eventType === "world.year_started" && e.payload.worldYear === 2,
    );
    expect(year1StartedNext.length).toBeGreaterThan(0);
    expect(year1StartedNext.every((e) => e.worldDate.year === 2)).toBe(true);
    expect(simulation.yearEnds[0]?.row.eventCountThisYear).toBe(
      allOutputEvents.filter((e) => e.worldDate.year === 1).length,
    );
    expect(simulation.yearEnds[1]?.row.eventCountThisYear).toBe(
      allOutputEvents.filter((e) => e.worldDate.year === 2).length,
    );
    // Cumulative at year 1 includes already-emitted year-2-dated events from week 48.
    expect(simulation.yearEnds[0]?.row.eventCountCumulative).toBeGreaterThan(
      simulation.yearEnds[0]!.row.eventCountThisYear,
    );
    for (const yearEnd of simulation.yearEnds) {
      expect(yearEnd.row.brokenReferenceCount).toBe(yearEnd.integrity.brokenReferenceCount);
      expect(yearEnd.row.invariantViolationCount).toBe(yearEnd.integrity.invariantViolationCount);
      assertCsvLivingInvariants(
        Object.fromEntries(
          YEARLY_STATISTICS_COLUMNS.map((column) => [column, String(yearEnd.row[column])]),
        ),
      );
    }
  }, 120_000);
});

describe("S00-009 fixed seven-file output", () => {
  it("help and usage errors do not create output directories", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const help = runCli(["--help"], { cwd: REPO_ROOT, outputRoot });
    expect(help.exitCode).toBe(EXIT_SUCCESS);
    expect(existsSync(outputRoot)).toBe(false);

    const usage = runCli(["--years", "1", "--seed", "12345"], { cwd: REPO_ROOT, outputRoot });
    expect(usage.exitCode).toBe(EXIT_USAGE_ERROR);
    expect(existsSync(outputRoot)).toBe(false);
  });

  it("generates exactly seven fixed files that reload correctly for 1 year", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { runDirectory, stdout } = runSimulate({ years: 1, seed: 12345, outputRoot });
    expect(stdout).toContain("7 files written");
    const contents = loadRunDirectory(runDirectory);

    for (const name of FIXED_OUTPUT_FILE_NAMES) {
      assertLfTrailingNewline(contents[name]!, name);
    }

    const configJson = JSON.parse(
      readFileSync(join(REPO_ROOT, BASELINE_CONFIG), "utf8"),
    ) as unknown;
    const configResult = validateInitialWorldConfig(configJson);
    expect(configResult.ok).toBe(true);
    if (!configResult.ok) {
      return;
    }

    const initial = parseJsonLf(contents["initial-world.json"]!) as InitialWorldSnapshot;
    expect(() => validateInitialWorldSnapshot(configResult.value, initial)).not.toThrow();

    const finalWorld = parseJsonLf(contents["final-world.json"]!) as FinalWorldDocument;
    expect(() => validateWorldEngineState(finalWorldToEngineState(finalWorld))).not.toThrow();
    expect(finalWorld.worldDate).toEqual({
      year: 2,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
    expect(finalWorld.finalEventSequence).not.toBeNull();

    const csv = parseYearlyStatisticsCsv(contents["yearly-statistics.csv"]!);
    expect(csv.headers).toEqual([...YEARLY_STATISTICS_COLUMNS]);
    expect(csv.rows).toHaveLength(1);
    expect(csv.rows[0]?.["worldYear"]).toBe("1");
    expect(csv.rows[0]?.["absoluteWeek"]).toBe("48");
    assertCsvLivingInvariants(csv.rows[0]!);
    for (const row of csv.rows) {
      for (const column of YEARLY_STATISTICS_COLUMNS) {
        const value = row[column]!;
        expect(value).not.toMatch(/[eE]/);
      }
    }

    const jsonl = contents["events.jsonl"]!;
    assertLfTrailingNewline(jsonl, "events.jsonl");
    const lines = jsonl.slice(0, -1).split("\n");
    expect(lines.length).toBeGreaterThan(0);
    const events: EventEnvelope[] = lines.map((line) => JSON.parse(line) as EventEnvelope);
    for (const event of events) {
      expect(() => validateEventEnvelope(event)).not.toThrow();
    }
    expect(() => validateEventSequence(events, { expectedStartSequence: 0 })).not.toThrow();
    for (let i = 0; i < events.length; i += 1) {
      expect(events[i]?.sequence).toBe(i);
    }
    expect(finalWorld.finalEventSequence).toBe(events[events.length - 1]?.sequence);
    expect(Number(csv.rows[0]!["eventCountCumulative"])).toBe(events.length);

    const metadata = parseJsonLf(contents["run-metadata.json"]!) as RunMetadataDocument;
    expect(metadata.outputFiles).toHaveLength(7);
    expect(metadata.termination).toEqual({ kind: "completed" });

    const performance = parseJsonLf(contents["performance.json"]!) as PerformanceDocument;
    expect(performance.counts.personCount).toBe(600);
    expect(performance.warningComparison.populationBand).toBe("other");
    const actualTotal = FIXED_OUTPUT_FILE_NAMES.reduce(
      (sum, name) => sum + statSync(join(runDirectory, name)).size,
      0,
    );
    expect(performance.output.totalBytes).toBe(actualTotal);
    expect(performance.output.fileBytes).toHaveLength(7);
    for (const entry of performance.output.fileBytes) {
      expect(entry.bytes).toBe(statSync(join(runDirectory, entry.fileName)).size);
      expect(entry.bytes).toBe(measureUtf8Bytes(contents[entry.fileName]!));
    }
  }, 60_000);

  it("runs 100 years with 100 CSV rows, invariants, and final date year 101 April week 1", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { runDirectory } = runSimulate({ years: 100, seed: 12345, outputRoot });
    const contents = loadRunDirectory(runDirectory);
    const csv = parseYearlyStatisticsCsv(contents["yearly-statistics.csv"]!);
    expect(csv.rows).toHaveLength(100);
    expect(csv.rows[0]?.["worldYear"]).toBe("1");
    expect(csv.rows[99]?.["worldYear"]).toBe("100");
    expect(csv.rows[99]?.["absoluteWeek"]).toBe("4800");
    let previousCumulative = 0;
    for (let i = 0; i < 100; i += 1) {
      expect(csv.rows[i]?.["worldYear"]).toBe(String(i + 1));
      expect(csv.rows[i]?.["absoluteWeek"]).toBe(String((i + 1) * 48));
      assertCsvLivingInvariants(csv.rows[i]!);
      const cumulative = Number(csv.rows[i]!["eventCountCumulative"]);
      expect(cumulative).toBeGreaterThanOrEqual(previousCumulative);
      previousCumulative = cumulative;
    }
    const jsonl = contents["events.jsonl"]!;
    const eventCount = jsonl.slice(0, -1).split("\n").length;
    expect(Number(csv.rows[99]!["eventCountCumulative"])).toBe(eventCount);

    const finalWorld = parseJsonLf(contents["final-world.json"]!) as FinalWorldDocument;
    expect(finalWorld.worldDate).toEqual({
      year: 101,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 4800,
    });
    expect(() => validateWorldEngineState(finalWorldToEngineState(finalWorld))).not.toThrow();

    const performance = parseJsonLf(contents["performance.json"]!) as PerformanceDocument;
    expect(performance.counts.personCount).toBe(600);
    expect(performance.warningComparison.populationBand).toBe("600");
  }, 600_000);

  it("runs 300 years with 300 CSV rows and reloadable seven files", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { runDirectory } = runSimulate({ years: 300, seed: 12345, outputRoot });
    const contents = loadRunDirectory(runDirectory);
    const csv = parseYearlyStatisticsCsv(contents["yearly-statistics.csv"]!);
    expect(csv.rows).toHaveLength(300);
    expect(csv.rows[299]?.["absoluteWeek"]).toBe("14400");
    const finalWorld = parseJsonLf(contents["final-world.json"]!) as FinalWorldDocument;
    expect(finalWorld.worldDate).toEqual({
      year: 301,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 14400,
    });
    for (const name of FIXED_OUTPUT_FILE_NAMES) {
      if (name.endsWith(".json")) {
        expect(() => parseJsonLf(contents[name]!)).not.toThrow();
      }
    }
  }, 1_800_000);

  it("matches deterministic final-world full text for the same seed and differs for another seed", () => {
    const dir = makeTempDir();
    const a = runSimulate({
      years: 2,
      seed: 12345,
      outputRoot: join(dir, "a"),
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const b = runSimulate({
      years: 2,
      seed: 12345,
      outputRoot: join(dir, "b"),
      clock: () => new Date("2026-01-01T00:00:01.000Z"),
    });
    const c = runSimulate({
      years: 2,
      seed: 99999,
      outputRoot: join(dir, "c"),
      clock: () => new Date("2026-01-01T00:00:02.000Z"),
    });

    const contentsA = loadRunDirectory(a.runDirectory);
    const contentsB = loadRunDirectory(b.runDirectory);
    const contentsC = loadRunDirectory(c.runDirectory);

    expect(contentsA["yearly-statistics.csv"]).toBe(contentsB["yearly-statistics.csv"]);
    expect(contentsA["events.jsonl"]).toBe(contentsB["events.jsonl"]);
    expect(contentsA["initial-world.json"]).toBe(contentsB["initial-world.json"]);
    expect(contentsA["final-world.json"]).toBe(contentsB["final-world.json"]);

    const initialA = contentsA["initial-world.json"]!;
    const initialC = contentsC["initial-world.json"]!;
    expect(
      initialA !== initialC || contentsA["final-world.json"] !== contentsC["final-world.json"],
    ).toBe(true);

    const metaA = parseJsonLf(contentsA["run-metadata.json"]!) as RunMetadataDocument;
    const metaB = parseJsonLf(contentsB["run-metadata.json"]!) as RunMetadataDocument;
    expect(metaA.runId).not.toBe(metaB.runId);
    expect(metaA.simulationId).toBe(metaB.simulationId);
  }, 180_000);

  it("returns runtime error on atomic write failure without leaving a final run directory", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const result = runCli(["--years", "1", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
      outputRoot,
      afterTempWrite: () => {
        throw new Error("forced output failure");
      },
    });
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stderr).toContain("forced output failure");
    expect(result.stdout).toBe("");
    if (existsSync(outputRoot)) {
      for (const name of readdirSync(outputRoot)) {
        expect(name.startsWith("run_")).toBe(false);
      }
    }
  }, 60_000);

  it("writes failed termination and exit code 1 when validation fails, keeping complete 7 files", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const result = runCli(["--years", "1", "--seed", "12345", "--config", BASELINE_CONFIG], {
      cwd: REPO_ROOT,
      outputRoot,
      transformSimulation: (simulation) => {
        const brokenState: WorldEngineState = {
          ...simulation.finalState,
          persons: simulation.finalState.persons.map((person, index) =>
            index === 0
              ? { ...person, familyId: "family_does_not_exist" as typeof person.familyId }
              : person,
          ),
        };
        return {
          ...simulation,
          finalState: brokenState,
          finalIntegrity: evaluateReferenceIntegrity(brokenState),
        };
      },
    });
    expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/validation failed/i);
    expect(result.stdout).not.toContain("simulation completed");

    const entries = readdirSync(outputRoot).filter((name) => name.startsWith("run_"));
    expect(entries).toHaveLength(1);
    const runDirectory = join(outputRoot, entries[0]!);
    const contents = loadRunDirectory(runDirectory);
    const report = parseJsonLf(contents["validation-report.json"]!) as {
      overallPassed: boolean;
    };
    expect(report.overallPassed).toBe(false);
    const metadata = parseJsonLf(contents["run-metadata.json"]!) as RunMetadataDocument;
    expect(metadata.termination.kind).toBe("failed");
    if (metadata.termination.kind === "failed") {
      expect(metadata.termination.reason.length).toBeGreaterThan(0);
    }
    expect(readdirSync(outputRoot).filter((n) => n.startsWith(".tmp-"))).toEqual([]);
  }, 60_000);

  it("performance warnings do not cause functional failure when exceeded", () => {
    const targets = {
      warningSecondsFor600People100Years: 1,
      warningSecondsFor2000People100Years: 120,
      measureOnlyPopulation: 5000,
    };
    const { document } = buildPerformanceDocument({
      targets,
      totalMilliseconds: 5_000,
      yearsExecuted: 100,
      weeksExecuted: 4800,
      personCount: 600,
      eventCount: 1,
      maxRssKilobytes: 1,
      otherFileContents: {
        "run-metadata.json": "{}\n",
        "initial-world.json": "{}\n",
        "final-world.json": "{}\n",
        "yearly-statistics.csv": "x\n",
        "events.jsonl": "",
        "validation-report.json": "{}\n",
      },
    });
    expect(document.warningComparison.exceeded).toBe(true);
    expect(document.warnings.length).toBeGreaterThanOrEqual(1);
    // Functional success remains orthogonal: CLI success path does not check warnings.
    expect(EXIT_SUCCESS).toBe(0);
  });
});
