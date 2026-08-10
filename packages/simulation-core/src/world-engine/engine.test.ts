import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  computeConfigHash,
  computeNameDataHash,
  cloneWorldEngineState,
  createWorldEngineState,
  createSeededRng,
  deriveSeed,
  fromAbsoluteWeek,
  generateInitialWorld,
  importSeededRng,
  RNG_ALGORITHM_VERSION,
  runWorldOneWeek,
  runWorldWeeks,
  runWorldYears,
  toCanonicalJson,
  validateEventSequence,
  validateInitialWorldConfig,
  validateWorldEngineState,
  WorldEngineError,
  cloneRuntimeState,
  exportRuntimeState,
  validateAndCloneProcessorRuntimeState,
  type Person,
  type ProcessorRuntimeState,
  type WorldEngineState,
  type WorldProcessor,
} from "../index.js";
import { processorRngLabel } from "./processor-runtime.js";
import { cloneBaselineConfig } from "../test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  loadBaselineNameData,
} from "../test-fixtures/name-data-loader.fixture.js";

const moduleUrl = import.meta.url;
const sha256Provider = createNodeSha256Provider();
const SEED = 12345;

function buildBaselineWorld() {
  const config = cloneBaselineConfig();
  const validated = validateInitialWorldConfig(config);
  if (!validated.ok) {
    throw new Error(JSON.stringify(validated.issues));
  }
  const nameData = loadBaselineNameData(moduleUrl);
  return generateInitialWorld({
    config: validated.value,
    configHash: computeConfigHash(validated.value, sha256Provider),
    seed: SEED,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  });
}

function createCallOrderProcessor(processorId: string, callOrder: string[]): WorldProcessor {
  return {
    processorId,
    process({ state, rng }) {
      rng.nextUint32();
      callOrder.push(processorId);
      return state;
    },
  };
}

function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child !== null && typeof child === "object" && !Object.isFrozen(child)) {
      freezeDeep(child);
    }
  }
  return value;
}

function listProductionSourceFiles(): string[] {
  const root = join(dirname(fileURLToPath(moduleUrl)), ".");
  const files: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        files.push(full);
      }
    }
  }
  return files;
}

describe("world-engine", () => {
  const generated = buildBaselineWorld();
  const startSequence = generated.initialEvents.length;

  function freshState(): WorldEngineState {
    return createWorldEngineState(generated.snapshot);
  }

  it("creates engine state from snapshot without mutating the snapshot", () => {
    const before = toCanonicalJson(generated.snapshot);
    const state = createWorldEngineState(generated.snapshot);
    expect(toCanonicalJson(generated.snapshot)).toBe(before);
    expect(state.worldDate).toEqual(generated.snapshot.worldDate);
    expect(state.persons).not.toBe(generated.snapshot.persons);
    expect(state.persons[0]).not.toBe(generated.snapshot.persons[0]);
    expect(state.persons[0]?.abilities).not.toBe(generated.snapshot.persons[0]?.abilities);
    expect(state.generationSummary).not.toBe(generated.snapshot.generationSummary);
    expect(state.generationSummary.ageBands).not.toBe(
      generated.snapshot.generationSummary.ageBands,
    );
  });

  it("0 weeks leaves state, events, notices, sequence, and RNG unchanged", () => {
    const state = freshState();
    const processors = [createCallOrderProcessor("a", [])];
    const result = runWorldWeeks({
      state,
      processors,
      weeks: 0,
      startSequence,
    });
    expect(result.weeksExecuted).toBe(0);
    expect(result.events).toEqual([]);
    expect(result.yearStatsFinalizedNotices).toEqual([]);
    expect(result.nextSequence).toBe(startSequence);
    expect(result.state.worldDate).toEqual(state.worldDate);
    expect(result.processorRuntimeState.rngStates).toHaveLength(1);
    const again = runWorldWeeks({
      state: result.state,
      processors,
      weeks: 0,
      startSequence: result.nextSequence,
      processorRuntimeState: result.processorRuntimeState,
    });
    expect(again.processorRuntimeState).toEqual(result.processorRuntimeState);
  });

  it("1 week increments absoluteWeek by 1", () => {
    const state = freshState();
    const result = runWorldOneWeek({
      state,
      processors: [],
      startSequence,
    });
    expect(result.weeksExecuted).toBe(1);
    expect(result.state.worldDate.absoluteWeek).toBe(state.worldDate.absoluteWeek + 1);
  });

  it("48 weeks reaches year 2 April week 1", () => {
    const result = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 48,
      startSequence,
    });
    expect(result.state.worldDate).toMatchObject({
      year: 2,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
  });

  it("4800 weeks reaches year 101 April week 1 absoluteWeek 4800", () => {
    const result = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 4800,
      startSequence,
    });
    expect(result.state.worldDate).toMatchObject({
      year: 101,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 4800,
    });
  }, 60_000);

  it("years N equals weeks N*48", () => {
    const yearsResult = runWorldYears({
      state: freshState(),
      processors: [],
      years: 2,
      startSequence,
    });
    const weeksResult = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 96,
      startSequence,
    });
    expect(toCanonicalJson(yearsResult.state)).toBe(toCanonicalJson(weeksResult.state));
    expect(toCanonicalJson(yearsResult.events)).toBe(toCanonicalJson(weeksResult.events));
    expect(yearsResult.nextSequence).toBe(weeksResult.nextSequence);
  });

  it("empty processors still advance calendar and age", () => {
    const before = freshState();
    const result = runWorldWeeks({
      state: before,
      processors: [],
      weeks: 48,
      startSequence,
    });
    expect(result.processorOrder).toEqual([]);
    expect(result.state.worldDate.year).toBe(2);
    const livingBefore = before.persons.filter((p) => p.lifeStatus === "living");
    const livingAfter = result.state.persons.filter((p) => p.lifeStatus === "living");
    expect(livingAfter.some((p, i) => p.currentAge !== livingBefore[i]?.currentAge)).toBe(true);
  });

  it("multiple processors run in fixed input order", () => {
    const callOrder: string[] = [];
    const processors = [
      createCallOrderProcessor("first", callOrder),
      createCallOrderProcessor("second", callOrder),
      createCallOrderProcessor("third", callOrder),
    ];
    runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 2,
      startSequence,
    });
    expect(callOrder).toEqual(["first", "second", "third", "first", "second", "third"]);
  });

  it("rejects duplicate processor ids", () => {
    const processors: WorldProcessor[] = [
      createCallOrderProcessor("dup", []),
      createCallOrderProcessor("dup", []),
    ];
    expect(() =>
      runWorldWeeks({
        state: freshState(),
        processors,
        weeks: 1,
        startSequence,
      }),
    ).toThrow(WorldEngineError);
  });

  it("rejects non-ASCII processor ids", () => {
    const processors: WorldProcessor[] = [
      {
        processorId: "日本語",
        process({ state }) {
          return state;
        },
      },
    ];
    expect(() =>
      runWorldWeeks({
        state: freshState(),
        processors,
        weeks: 1,
        startSequence,
      }),
    ).toThrow(WorldEngineError);
  });

  it("rejects processor that changes worldDate", () => {
    const processors: WorldProcessor[] = [
      {
        processorId: "bad-date",
        process({ state }) {
          return {
            ...state,
            worldDate: fromAbsoluteWeek(state.worldDate.absoluteWeek + 1),
          };
        },
      },
    ];
    expect(() =>
      runWorldWeeks({
        state: freshState(),
        processors,
        weeks: 1,
        startSequence,
      }),
    ).toThrow(/worldDate/);
  });

  it("rejects processor that reorders persons", () => {
    const processors: WorldProcessor[] = [
      {
        processorId: "reorder",
        process({ state }) {
          return {
            ...state,
            persons: [...state.persons].reverse(),
          };
        },
      },
    ];
    expect(() =>
      runWorldWeeks({
        state: freshState(),
        processors,
        weeks: 1,
        startSequence,
      }),
    ).toThrow(/persons/);
  });

  it("rejects processor that removes a person", () => {
    const processors: WorldProcessor[] = [
      {
        processorId: "remove",
        process({ state }) {
          return {
            ...state,
            persons: state.persons.slice(1),
          };
        },
      },
    ];
    expect(() =>
      runWorldWeeks({
        state: freshState(),
        processors,
        weeks: 1,
        startSequence,
      }),
    ).toThrow(/persons/);
  });

  it("uses independent RNG streams and supports save/restore continuity", () => {
    const callOrder: string[] = [];
    const processors = [
      createCallOrderProcessor("alpha", callOrder),
      createCallOrderProcessor("beta", callOrder),
    ];
    const first = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 3,
      startSequence,
    });

    const labelA = processorRngLabel("alpha");
    const labelB = processorRngLabel("beta");
    expect(deriveSeed(SEED, labelA)).not.toBe(deriveSeed(SEED, labelB));

    const initialA = createSeededRng(deriveSeed(SEED, labelA));
    const initialB = createSeededRng(deriveSeed(SEED, labelB));
    for (let i = 0; i < 3; i += 1) {
      initialA.nextUint32();
      initialB.nextUint32();
    }
    expect(first.processorRuntimeState.rngStates[0]?.state).toEqual(initialA.exportState());
    expect(first.processorRuntimeState.rngStates[1]?.state).toEqual(initialB.exportState());

    const continued = runWorldWeeks({
      state: first.state,
      processors,
      weeks: 2,
      startSequence: first.nextSequence,
      processorRuntimeState: first.processorRuntimeState,
    });
    const batch = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 5,
      startSequence,
    });
    expect(continued.processorRuntimeState).toEqual(batch.processorRuntimeState);
    expect(toCanonicalJson(continued.state)).toBe(toCanonicalJson(batch.state));
  });

  it("rejects runtime state order mismatch / missing / extra / bad algorithmVersion", () => {
    const processors = [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])];
    const ok = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 1,
      startSequence,
    });

    const orderMismatch: ProcessorRuntimeState = {
      processorOrder: ["b", "a"],
      rngStates: [
        { processorId: "b", state: ok.processorRuntimeState.rngStates[1]!.state },
        { processorId: "a", state: ok.processorRuntimeState.rngStates[0]!.state },
      ],
    };
    expect(() =>
      runWorldWeeks({
        state: ok.state,
        processors,
        weeks: 1,
        startSequence: ok.nextSequence,
        processorRuntimeState: orderMismatch,
      }),
    ).toThrow(WorldEngineError);

    const missing: ProcessorRuntimeState = {
      processorOrder: ["a"],
      rngStates: [{ processorId: "a", state: ok.processorRuntimeState.rngStates[0]!.state }],
    };
    expect(() =>
      runWorldWeeks({
        state: ok.state,
        processors,
        weeks: 1,
        startSequence: ok.nextSequence,
        processorRuntimeState: missing,
      }),
    ).toThrow(WorldEngineError);

    const extra: ProcessorRuntimeState = {
      processorOrder: ["a", "b", "c"],
      rngStates: [
        ...ok.processorRuntimeState.rngStates,
        { processorId: "c", state: ok.processorRuntimeState.rngStates[0]!.state },
      ],
    };
    expect(() =>
      runWorldWeeks({
        state: ok.state,
        processors,
        weeks: 1,
        startSequence: ok.nextSequence,
        processorRuntimeState: extra,
      }),
    ).toThrow(WorldEngineError);

    const badAlgo: ProcessorRuntimeState = {
      processorOrder: ["a", "b"],
      rngStates: [
        {
          processorId: "a",
          state: {
            ...ok.processorRuntimeState.rngStates[0]!.state,
            algorithmVersion: "not-a-real-algo" as typeof RNG_ALGORITHM_VERSION,
          },
        },
        ok.processorRuntimeState.rngStates[1]!,
      ],
    };
    expect(() =>
      runWorldWeeks({
        state: ok.state,
        processors,
        weeks: 1,
        startSequence: ok.nextSequence,
        processorRuntimeState: badAlgo,
      }),
    ).toThrow(WorldEngineError);
  });

  it("events start at startSequence and do not duplicate initial events", () => {
    const result = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 48,
      startSequence,
    });
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0]?.sequence).toBe(startSequence);
    expect(result.events.every((e) => e.origin === "simulation")).toBe(true);
    expect(result.events.some((e) => e.eventType === "world.started")).toBe(false);
    expect(result.events.some((e) => e.eventType === "person.initialized")).toBe(false);
    expect(result.nextSequence).toBe(startSequence + result.events.length);
  });

  it("year boundary event order and no year_started for world year 1", () => {
    const result = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 48,
      startSequence,
    });
    const yearStarted = result.events.filter((e) => e.eventType === "world.year_started");
    expect(yearStarted.map((e) => e.payload.worldYear)).toEqual([2]);

    const boundaryIndex = result.events.findIndex(
      (e) => e.eventType === "world.year_stats_finalized",
    );
    expect(boundaryIndex).toBeGreaterThanOrEqual(0);
    expect(result.events[boundaryIndex]?.eventType).toBe("world.year_stats_finalized");
    expect(result.events[boundaryIndex + 1]?.eventType).toBe("world.year_started");
    expect(result.events[boundaryIndex + 2]?.eventType).toBe("person.aged");
  });

  it("quiet weeks may have 0 events", () => {
    const result = runWorldOneWeek({
      state: freshState(),
      processors: [],
      startSequence,
    });
    expect(result.events).toEqual([]);
    expect(result.nextSequence).toBe(startSequence);
  });

  it("100 years: 100 notices for years 1-100, forced retirement at 42", () => {
    const before = freshState();
    const age41 = before.persons.find(
      (p): p is Person & { lifeStatus: "living"; currentAge: number } =>
        p.lifeStatus === "living" &&
        p.participationStatus === "active" &&
        p.careerStatus === "active_competitor" &&
        p.currentAge === 41,
    );
    expect(age41).toBeDefined();
    const targetId = age41!.personId;
    const previousRank = age41!.currentRank;
    const previousHighest = age41!.highestRank;

    const result = runWorldYears({
      state: before,
      processors: [],
      years: 100,
      startSequence,
    });

    expect(result.weeksExecuted).toBe(4800);
    expect(result.state.worldDate).toMatchObject({
      year: 101,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 4800,
    });
    expect(result.yearStatsFinalizedNotices).toHaveLength(100);
    expect(result.yearStatsFinalizedNotices.map((n) => n.worldYear)).toEqual(
      Array.from({ length: 100 }, (_, i) => i + 1),
    );
    expect(result.yearStatsFinalizedNotices.every((n) => n.worldDate.month === 3)).toBe(true);
    expect(result.yearStatsFinalizedNotices.every((n) => n.worldDate.weekOfMonth === 4)).toBe(true);
    expect(
      result.yearStatsFinalizedNotices.every(
        (n) => n.worldDate.absoluteWeek === n.worldYear * 48 - 1,
      ),
    ).toBe(true);
    expect(result.yearStatsFinalizedNotices.some((n) => n.worldYear === 101)).toBe(false);

    const retired = result.state.persons.find((p) => p.personId === targetId);
    expect(retired?.lifeStatus).toBe("living");
    if (retired?.lifeStatus === "living") {
      expect(retired.careerStatus).toBe("retired");
      expect(retired.currentAge).toBe(141);
      if (retired.careerStatus === "retired") {
        expect(retired.retirementRank).toBe(previousRank);
        expect(retired.highestRank).toBe(previousHighest);
        expect("currentRank" in retired && retired.currentRank !== undefined).toBe(false);
      }
    }

    const forceRetiredEvents = result.events.filter((e) => e.eventType === "person.force_retired");
    expect(forceRetiredEvents.some((e) => e.entities.personIds.includes(targetId))).toBe(true);
  }, 60_000);

  it("batch 4800 equals 2400+2400 for state, events, notices, sequence, RNG", () => {
    const processors = [createCallOrderProcessor("p1", []), createCallOrderProcessor("p2", [])];
    const batch = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 4800,
      startSequence,
    });
    const firstHalf = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 2400,
      startSequence,
    });
    const secondHalf = runWorldWeeks({
      state: firstHalf.state,
      processors,
      weeks: 2400,
      startSequence: firstHalf.nextSequence,
      processorRuntimeState: firstHalf.processorRuntimeState,
    });

    expect(toCanonicalJson(secondHalf.state)).toBe(toCanonicalJson(batch.state));
    expect(toCanonicalJson([...firstHalf.events, ...secondHalf.events])).toBe(
      toCanonicalJson(batch.events),
    );
    expect(
      toCanonicalJson([
        ...firstHalf.yearStatsFinalizedNotices,
        ...secondHalf.yearStatsFinalizedNotices,
      ]),
    ).toBe(toCanonicalJson(batch.yearStatsFinalizedNotices));
    expect(secondHalf.nextSequence).toBe(batch.nextSequence);
    expect(secondHalf.processorRuntimeState).toEqual(batch.processorRuntimeState);
  }, 180_000);

  it("same inputs are deep-equal reproducible", () => {
    const processors = [createCallOrderProcessor("repro", [])];
    const a = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 96,
      startSequence,
    });
    const b = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 96,
      startSequence,
    });
    expect(toCanonicalJson(a)).toBe(toCanonicalJson(b));
  });

  it("does not mutate input snapshot, state, processors array, or runtime state", () => {
    const snapshotJson = toCanonicalJson(generated.snapshot);
    const state = freshState();
    const stateJson = toCanonicalJson(state);
    const callOrder: string[] = [];
    const processors = [
      createCallOrderProcessor("x", callOrder),
      createCallOrderProcessor("y", callOrder),
    ];
    const processorsJson = toCanonicalJson(processors.map((p) => p.processorId));

    const first = runWorldWeeks({
      state,
      processors,
      weeks: 2,
      startSequence,
    });
    const runtimeJson = toCanonicalJson(first.processorRuntimeState);
    freezeDeep(first.processorRuntimeState);

    const second = runWorldWeeks({
      state: first.state,
      processors,
      weeks: 2,
      startSequence: first.nextSequence,
      processorRuntimeState: first.processorRuntimeState,
    });

    expect(toCanonicalJson(generated.snapshot)).toBe(snapshotJson);
    expect(toCanonicalJson(state)).toBe(stateJson);
    expect(toCanonicalJson(processors.map((p) => p.processorId))).toBe(processorsJson);
    expect(toCanonicalJson(first.processorRuntimeState)).toBe(runtimeJson);
    expect(second.weeksExecuted).toBe(2);
  });

  it("production sources avoid Math.random, Date, node:fs, node:crypto", () => {
    const forbidden = [/Math\.random\s*\(/, /\bnew\s+Date\b/, /node:fs/, /node:crypto/];
    for (const file of listProductionSourceFiles()) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(source, `${file} matched ${String(pattern)}`).not.toMatch(pattern);
      }
    }
  });

  it("importSeededRng continues after exported runtime state", () => {
    const processors = [createCallOrderProcessor("cont", [])];
    const result = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 4,
      startSequence,
    });
    const restored = importSeededRng(result.processorRuntimeState.rngStates[0]!.state);
    const expected = createSeededRng(deriveSeed(SEED, processorRngLabel("cont")));
    for (let i = 0; i < 4; i += 1) {
      expected.nextUint32();
    }
    expect(restored.nextUint32()).toBe(expected.nextUint32());
  });
});

describe("world-engine audit guards", () => {
  const generated = buildBaselineWorld();
  const startSequence = generated.initialEvents.length;

  function freshState(): WorldEngineState {
    return createWorldEngineState(generated.snapshot);
  }

  function invalidReturn(value: unknown): WorldEngineState {
    return value as WorldEngineState;
  }

  function invalidSummary(value: unknown): WorldEngineState["generationSummary"] {
    return value as WorldEngineState["generationSummary"];
  }

  it("deep-clones every mutable world-state branch", () => {
    const state = freshState();
    const clone = cloneWorldEngineState(state);
    expect(clone).toEqual(state);
    expect(clone).not.toBe(state);
    expect(clone.worldDate).not.toBe(state.worldDate);
    expect(clone.persons).not.toBe(state.persons);
    expect(clone.persons[0]).not.toBe(state.persons[0]);
    expect(clone.persons[0]?.abilities.stamina).not.toBe(state.persons[0]?.abilities.stamina);
    expect(clone.persons[0]?.aptitudes.unarmed).not.toBe(state.persons[0]?.aptitudes.unarmed);
    expect(clone.families[0]).not.toBe(state.families[0]);
    expect(clone.lineages[0]).not.toBe(state.lineages[0]);
    expect(clone.relationships[0]).not.toBe(state.relationships[0]);
    expect(clone.generationSummary).not.toBe(state.generationSummary);
    expect(clone.generationSummary.livingCount).not.toBe(state.generationSummary.livingCount);
    expect(clone.generationSummary.ageBands[0]).not.toBe(state.generationSummary.ageBands[0]);
    expect(clone.generationSummary.activeRanks.F).not.toBe(state.generationSummary.activeRanks.F);
    expect(clone.generationSummary.warnings).not.toBe(state.generationSummary.warnings);
  });

  it("isolates processor input and detects in-place nested mutation", () => {
    const state = freshState();
    const before = toCanonicalJson(state);
    const processor: WorldProcessor = {
      processorId: "mutates-input",
      process({ state: isolated }) {
        isolated.persons[0]!.abilities.stamina.surfaceValue += 1;
        return isolated;
      },
    };

    expect(() => runWorldOneWeek({ state, processors: [processor], startSequence })).toThrow(
      /must not mutate its input state/,
    );
    expect(toCanonicalJson(state)).toBe(before);
  });

  it("allows unchanged same-reference and valid new-state processor returns", () => {
    const sameReference: WorldProcessor = {
      processorId: "same-reference",
      process({ state }) {
        return state;
      },
    };
    const validUpdate: WorldProcessor = {
      processorId: "valid-update",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person, index) =>
            index === 0 ? { ...person, displayName: `${person.displayName} updated` } : person,
          ),
        };
      },
    };
    const result = runWorldOneWeek({
      state: freshState(),
      processors: [sameReference, validUpdate],
      startSequence,
    });
    expect(result.state.persons[0]?.displayName).toMatch(/ updated$/);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["Promise", Promise.resolve(null)],
    ["array", []],
  ])("wraps a processor %s return as WorldEngineError", (_label, returned) => {
    const processor: WorldProcessor = {
      processorId: "bad-return",
      process() {
        return invalidReturn(returned);
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [processor], startSequence }),
    ).toThrow(WorldEngineError);
  });

  it("rejects fixed collection content changes and malformed summaries", () => {
    const changesFamily: WorldProcessor = {
      processorId: "changes-family",
      process({ state }) {
        return {
          ...state,
          families: state.families.map((family, index) =>
            index === 0 ? { ...family, familyName: `${family.familyName} changed` } : family,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({
        state: freshState(),
        processors: [changesFamily],
        startSequence,
      }),
    ).toThrow(/families/);

    const malformedSummary: WorldProcessor = {
      processorId: "malformed-summary",
      process({ state }) {
        return {
          ...state,
          generationSummary: invalidSummary(null),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({
        state: freshState(),
        processors: [malformedSummary],
        startSequence,
      }),
    ).toThrow(WorldEngineError);
  });

  it("fills processor and week context for thrown errors", () => {
    const processor: WorldProcessor = {
      processorId: "throws",
      process() {
        throw new WorldEngineError("processor rejected work");
      },
    };
    try {
      runWorldOneWeek({ state: freshState(), processors: [processor], startSequence });
      throw new Error("expected runWorldOneWeek to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(WorldEngineError);
      if (error instanceof WorldEngineError) {
        expect(error.context.processorId).toBe("throws");
        expect(error.context.absoluteWeek).toBe(0);
        expect(error.context.startSequence).toBe(startSequence);
      }
    }
  });

  it("rejects nextSequence overflow for two year-boundary events", () => {
    const base = freshState();
    const emptyBoundaryState: WorldEngineState = {
      ...base,
      worldDate: fromAbsoluteWeek(47),
      persons: [],
      families: [],
      lineages: [],
      relationships: [],
    };
    expect(() =>
      runWorldOneWeek({
        state: emptyBoundaryState,
        processors: [],
        startSequence: Number.MAX_SAFE_INTEGER - 1,
      }),
    ).toThrow(/safe integer range/);
  });

  it("allows the safe nextSequence boundary with two year-boundary events", () => {
    const base = freshState();
    const emptyBoundaryState: WorldEngineState = {
      ...base,
      worldDate: fromAbsoluteWeek(47),
      persons: [],
      families: [],
      lineages: [],
      relationships: [],
    };
    const result = runWorldOneWeek({
      state: emptyBoundaryState,
      processors: [],
      startSequence: Number.MAX_SAFE_INTEGER - 2,
    });
    expect(result.events).toHaveLength(2);
    expect(result.nextSequence).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("world-engine final audit", () => {
  const generated = buildBaselineWorld();
  const startSequence = generated.initialEvents.length;

  function freshState(): WorldEngineState {
    return createWorldEngineState(generated.snapshot);
  }

  function knownIdsFrom(state: WorldEngineState) {
    return {
      personIds: state.persons.map((p) => p.personId),
      familyIds: state.families.map((f) => f.familyId),
      lineageIds: state.lineages.map((l) => l.lineageId),
      relationshipIds: state.relationships.map((r) => r.relationshipId),
    };
  }

  it.each([
    ["runWorldOneWeek", (value: unknown) => runWorldOneWeek(value as never)],
    ["runWorldWeeks", (value: unknown) => runWorldWeeks(value as never)],
    ["runWorldYears", (value: unknown) => runWorldYears(value as never)],
  ])("%s rejects null/undefined/array/missing fields as WorldEngineError", (_name, run) => {
    expect(() => run(null)).toThrow(WorldEngineError);
    expect(() => run(undefined)).toThrow(WorldEngineError);
    expect(() => run([])).toThrow(WorldEngineError);
    expect(() => run("x")).toThrow(WorldEngineError);
    expect(() => run(1)).toThrow(WorldEngineError);
    expect(() => run({})).toThrow(WorldEngineError);
  });

  it("does not allow validateWorldEngineState to skip via same-reference expectedFixed", () => {
    const bad = {};
    expect(() =>
      (validateWorldEngineState as (state: unknown, expected?: unknown) => void)(bad, bad),
    ).toThrow(WorldEngineError);
    expect(validateWorldEngineState.length).toBe(1);
  });

  it("does not treat shallow-frozen collections as validated cache", () => {
    const state = freshState();
    Object.freeze(state.families);
    validateWorldEngineState(state);
    (state.families[0] as { status: string }).status = "not-a-status";
    expect(() => validateWorldEngineState(state)).toThrow(/families/);

    const state2 = freshState();
    Object.freeze(state2.generationSummary);
    validateWorldEngineState(state2);
    (state2.generationSummary.livingCount as { actual: number }).actual = Number.NaN;
    expect(() => validateWorldEngineState(state2)).toThrow(/livingCount/);

    const state3 = freshState();
    Object.freeze(state3.persons);
    validateWorldEngineState(state3);
    (state3.persons[0] as { sex: string }).sex = "invalid";
    expect(() => validateWorldEngineState(state3)).toThrow(/sex/);
  });

  it("fixes processor list so splice and process replacement cannot change run order", () => {
    const processors: WorldProcessor[] = [];
    const callOrder: string[] = [];
    let p1Calls = 0;
    const p1: WorldProcessor = {
      processorId: "p1",
      process({ state, rng }) {
        p1Calls += 1;
        rng.nextUint32();
        callOrder.push("p1");
        if (p1Calls === 1) {
          processors.splice(1, 1);
        }
        return state;
      },
    };
    const p2: WorldProcessor = {
      processorId: "p2",
      process({ state, rng }) {
        rng.nextUint32();
        callOrder.push("p2");
        return state;
      },
    };
    processors.push(p1, p2);

    const result = runWorldWeeks({
      state: freshState(),
      processors,
      weeks: 2,
      startSequence,
    });

    expect(callOrder).toEqual(["p1", "p2", "p1", "p2"]);
    expect(result.processorOrder).toEqual(["p1", "p2"]);
    expect(result.processorRuntimeState.rngStates).toHaveLength(2);
  });

  it("keeps start-time process function even if processor object is later overwritten", () => {
    const callOrder: string[] = [];
    const seenThisIds: string[] = [];
    const p2: WorldProcessor = {
      processorId: "p2",
      process(this: WorldProcessor, { state, rng }) {
        rng.nextUint32();
        callOrder.push("p2-original");
        seenThisIds.push(this.processorId);
        return state;
      },
    };
    const p1: WorldProcessor = {
      processorId: "p1",
      process({ state, rng }) {
        rng.nextUint32();
        callOrder.push("p1");
        (p2 as { processorId: string }).processorId = "hijacked";
        (p2 as { process: WorldProcessor["process"] }).process = ({ state: inner }) => {
          callOrder.push("p2-hijacked");
          return inner;
        };
        return state;
      },
    };

    runWorldOneWeek({
      state: freshState(),
      processors: [p1, p2],
      startSequence,
    });
    expect(callOrder).toEqual(["p1", "p2-original"]);
    expect(seenThisIds).toEqual(["p2"]);
  });

  it("rejects dynamic person invariant violations", () => {
    const base = freshState();
    const living = base.persons.find(
      (p): p is Person & { lifeStatus: "living"; careerStatus: "active_competitor" } =>
        p.lifeStatus === "living" && p.careerStatus === "active_competitor",
    )!;

    const seventyActive = {
      ...base,
      persons: base.persons.map((person) =>
        person.personId === living.personId
          ? {
              ...person,
              lifeStatus: "living",
              participationStatus: "active",
              careerStatus: "active_competitor",
              currentAge: 70,
              birthYear: base.worldDate.year - 70,
              currentRank: "F",
              highestRank: "F",
              qualifiedMaster: false,
            }
          : person,
      ),
    } as WorldEngineState;
    expect(() => validateWorldEngineState(seventyActive)).toThrow(/careerStatus|currentAge|42/);

    const invertedActive = {
      ...base,
      persons: base.persons.map((person) =>
        person.lifeStatus === "living" && person.careerStatus === "active_competitor"
          ? { ...person, currentRank: "S", highestRank: "F" }
          : person,
      ),
    } as WorldEngineState;
    expect(() => validateWorldEngineState(invertedActive)).toThrow(/highestRank/);

    const invertedRetired = {
      ...base,
      persons: base.persons.map((person) =>
        person.lifeStatus === "living" && person.careerStatus === "retired"
          ? { ...person, retirementRank: "S", highestRank: "F", qualifiedMaster: false }
          : person,
      ),
    } as WorldEngineState;
    expect(() => validateWorldEngineState(invertedRetired)).toThrow(/highestRank/);

    const masterNoLineage = {
      ...base,
      persons: base.persons.map((person) => {
        if (!(person.lifeStatus === "living" && person.careerStatus === "retired")) {
          return person;
        }
        const next = {
          ...person,
          retirementRank: "C" as const,
          highestRank: "C" as const,
          qualifiedMaster: true,
        };
        delete (next as { lineageId?: string }).lineageId;
        return next;
      }),
    } as WorldEngineState;
    expect(() => validateWorldEngineState(masterNoLineage)).toThrow(/lineageId|qualifiedMaster/);

    const masterLowRank: WorldEngineState = {
      ...base,
      persons: base.persons.map((person) =>
        person.lifeStatus === "living" && person.careerStatus === "retired"
          ? {
              ...person,
              retirementRank: "F",
              highestRank: "F",
              qualifiedMaster: true,
              lineageId: base.lineages[0]!.lineageId,
            }
          : person,
      ),
    };
    expect(() => validateWorldEngineState(masterLowRank)).toThrow(/retirementRank|qualifiedMaster/);

    for (const age of [0, 7]) {
      const child = base.persons.find(
        (p): p is Person & { lifeStatus: "living"; careerStatus: "child" } =>
          p.lifeStatus === "living" && p.careerStatus === "child" && p.currentAge === age,
      );
      expect(child).toBeDefined();
      const withLineage: WorldEngineState = {
        ...base,
        persons: base.persons.map((person) =>
          person.personId === child!.personId
            ? { ...person, lineageId: base.lineages[0]!.lineageId }
            : person,
        ),
      };
      expect(() => validateWorldEngineState(withLineage)).toThrow(/lineageId/);
    }
  });

  it("allows ability-only processor updates and aged retired people after 100 years", () => {
    const abilityOnly: WorldProcessor = {
      processorId: "ability-only",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person, index) =>
            index === 0
              ? {
                  ...person,
                  abilities: {
                    ...person.abilities,
                    stamina: {
                      ...person.abilities.stamina,
                      surfaceValue: person.abilities.stamina.surfaceValue + 1,
                    },
                  },
                }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [abilityOnly], startSequence }),
    ).not.toThrow();

    const after100 = runWorldYears({
      state: freshState(),
      processors: [],
      years: 100,
      startSequence,
    });
    const elderlyRetired = after100.state.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "retired" && p.currentAge > 70,
    );
    expect(elderlyRetired).toBeDefined();
    expect(() => validateWorldEngineState(after100.state)).not.toThrow();
  }, 60_000);

  it("aligns age checks with active/waiting/stopped participation", () => {
    const base = freshState();
    const target = base.persons.find(
      (p): p is Person & { lifeStatus: "living"; participationStatus: "active" } =>
        p.lifeStatus === "living" &&
        p.participationStatus === "active" &&
        p.careerStatus === "active_competitor" &&
        p.currentAge >= 20 &&
        p.currentAge <= 40,
    )!;
    const birthYear = target.birthYear;
    const initialAge = target.currentAge;

    const after48 = runWorldWeeks({
      state: base,
      processors: [],
      weeks: 48,
      startSequence,
    });
    const aged = after48.state.persons.find((p) => p.personId === target.personId);
    expect(aged?.lifeStatus).toBe("living");
    if (aged?.lifeStatus === "living") {
      expect(aged.currentAge).toBe(initialAge + 1);
      expect(aged.currentAge).toBe(after48.state.worldDate.year - birthYear);
    }

    for (const status of ["stopped", "waiting"] as const) {
      const pause: WorldProcessor = {
        processorId: `pause-${status}`,
        process({ state }) {
          return {
            ...state,
            persons: state.persons.map((person) =>
              person.personId === target.personId && person.lifeStatus === "living"
                ? { ...person, participationStatus: status }
                : person,
            ),
          };
        },
      };
      const paused = runWorldOneWeek({
        state: freshState(),
        processors: [pause],
        startSequence,
      });
      expect(() =>
        runWorldWeeks({
          state: paused.state,
          processors: [],
          weeks: 48,
          startSequence: paused.nextSequence,
        }),
      ).not.toThrow(WorldEngineError);

      const badResume: WorldProcessor = {
        processorId: "bad-resume",
        process({ state }) {
          return {
            ...state,
            persons: state.persons.map((person) =>
              person.personId === target.personId && person.lifeStatus === "living"
                ? { ...person, participationStatus: "active" }
                : person,
            ),
          };
        },
      };
      const pausedLong = runWorldWeeks({
        state: paused.state,
        processors: [],
        weeks: 48,
        startSequence: paused.nextSequence,
      });
      expect(() =>
        runWorldOneWeek({
          state: pausedLong.state,
          processors: [badResume],
          startSequence: pausedLong.nextSequence,
        }),
      ).toThrow(WorldEngineError);

      const goodResume: WorldProcessor = {
        processorId: "good-resume",
        process({ state }) {
          return {
            ...state,
            persons: state.persons.map((person) => {
              if (person.personId !== target.personId || person.lifeStatus !== "living") {
                return person;
              }
              const currentAge = state.worldDate.year - person.birthYear;
              if (currentAge >= 18) {
                const rest = { ...person } as Record<string, unknown>;
                delete rest.currentRank;
                return {
                  ...(rest as unknown as Person),
                  participationStatus: "active" as const,
                  currentAge,
                  careerStatus: "retired" as const,
                  retirementRank: "F" as const,
                  highestRank: "F" as const,
                  qualifiedMaster: false,
                };
              }
              return {
                ...person,
                participationStatus: "active" as const,
                currentAge,
                careerStatus: "active_competitor" as const,
                currentRank: "F" as const,
                highestRank: "F" as const,
                qualifiedMaster: false,
              };
            }),
          } as WorldEngineState;
        },
      };
      expect(() =>
        runWorldOneWeek({
          state: pausedLong.state,
          processors: [goodResume],
          startSequence: pausedLong.nextSequence,
        }),
      ).not.toThrow();
    }
  }, 60_000);

  it("validates aggregated events for empty, normal, multi-year, and 4800-week runs", () => {
    const zero = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 0,
      startSequence,
    });
    expect(() =>
      validateEventSequence(zero.events, {
        expectedStartSequence: startSequence,
        knownIds: knownIdsFrom(zero.state),
      }),
    ).not.toThrow();

    const one = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 1,
      startSequence,
    });
    expect(() =>
      validateEventSequence(one.events, {
        expectedStartSequence: startSequence,
        knownIds: knownIdsFrom(one.state),
      }),
    ).not.toThrow();

    const multiYear = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 96,
      startSequence,
    });
    expect(() =>
      validateEventSequence(multiYear.events, {
        expectedStartSequence: startSequence,
        knownIds: knownIdsFrom(multiYear.state),
      }),
    ).not.toThrow();

    const long = runWorldWeeks({
      state: freshState(),
      processors: [],
      weeks: 4800,
      startSequence,
    });
    expect(() =>
      validateEventSequence(long.events, {
        expectedStartSequence: startSequence,
        knownIds: knownIdsFrom(long.state),
      }),
    ).not.toThrow();
  }, 60_000);

  it.each([
    [
      "simulationId",
      (state: WorldEngineState) => {
        (state as { simulationId: string }).simulationId = "simulation_deadbeefdeadbeef";
      },
    ],
    [
      "personId",
      (state: WorldEngineState) => {
        (state.persons[0] as { personId: string }).personId = "person_mutated";
      },
    ],
    [
      "persons.reverse",
      (state: WorldEngineState) => {
        state.persons.reverse();
      },
    ],
    [
      "generationSummary.livingCount.actual",
      (state: WorldEngineState) => {
        (state.generationSummary.livingCount as { actual: number }).actual += 1;
      },
    ],
    [
      "abilities.stamina.surfaceValue",
      (state: WorldEngineState) => {
        state.persons[0]!.abilities.stamina.surfaceValue += 1;
      },
    ],
    [
      "families[0].familyName",
      (state: WorldEngineState) => {
        (state.families[0] as { familyName: string }).familyName = "mutated";
      },
    ],
    [
      "relationships array",
      (state: WorldEngineState) => {
        (state.relationships as unknown as unknown[]).push({ kind: "x" });
      },
    ],
  ])(
    "rejects in-place processor mutation of %s without changing caller state",
    (_label, mutate) => {
      const state = freshState();
      const before = toCanonicalJson(state);
      const processor: WorldProcessor = {
        processorId: "inplace-mutator",
        process({ state: isolated }) {
          mutate(isolated);
          return isolated;
        },
      };
      expect(() => runWorldOneWeek({ state, processors: [processor], startSequence })).toThrow(
        WorldEngineError,
      );
      expect(toCanonicalJson(state)).toBe(before);
    },
  );
});

describe("world-engine final patch audit", () => {
  const generated = buildBaselineWorld();
  const startSequence = generated.initialEvents.length;

  function freshState(): WorldEngineState {
    return createWorldEngineState(generated.snapshot);
  }

  it("records this.processorId from frozen start-time host", () => {
    const seen: string[] = [];
    const p2: WorldProcessor = {
      processorId: "p2",
      process(this: WorldProcessor, { state }) {
        seen.push(this.processorId);
        return state;
      },
    };
    const p1: WorldProcessor = {
      processorId: "p1",
      process({ state }) {
        (p2 as { processorId: string }).processorId = "hijacked";
        return state;
      },
    };
    runWorldOneWeek({ state: freshState(), processors: [p1, p2], startSequence });
    expect(seen).toEqual(["p2"]);
  });

  it.each([
    ["state", "state"],
    ["processors", "processors"],
    ["weeks", "weeks"],
    ["startSequence", "startSequence"],
    ["processorRuntimeState", "processorRuntimeState"],
  ])("runWorldWeeks converts %s getter throw into WorldEngineError", (field) => {
    const base = {
      state: freshState(),
      processors: [] as WorldProcessor[],
      weeks: 1,
      startSequence,
    };
    const input = {
      ...base,
      get [field]() {
        throw new Error(`${field} boom`);
      },
    };
    expect(() => runWorldWeeks(input as never)).toThrow(WorldEngineError);
    try {
      runWorldWeeks(input as never);
    } catch (error) {
      expect(error).toBeInstanceOf(WorldEngineError);
    }
  });

  it("runWorldOneWeek/Years and processor getters become WorldEngineError", () => {
    expect(() =>
      runWorldOneWeek({
        get state() {
          throw new TypeError("state boom");
        },
      } as never),
    ).toThrow(WorldEngineError);

    expect(() =>
      runWorldYears({
        get years() {
          throw new TypeError("years boom");
        },
      } as never),
    ).toThrow(WorldEngineError);

    const processors = [
      {
        get processorId() {
          throw new Error("id boom");
        },
        process({ state }: { state: WorldEngineState }) {
          return state;
        },
      },
    ];
    expect(() =>
      runWorldOneWeek({
        state: freshState(),
        processors: processors as never,
        startSequence,
      }),
    ).toThrow(WorldEngineError);

    const processors2 = [
      {
        processorId: "x",
        get process() {
          throw new Error("process boom");
        },
      },
    ];
    expect(() =>
      runWorldOneWeek({
        state: freshState(),
        processors: processors2 as never,
        startSequence,
      }),
    ).toThrow(WorldEngineError);
  });

  it("rejects undefined / function / circular values as WorldEngineError", () => {
    const base = freshState();
    const adult = base.persons.find((p) => p.lifeStatus === "living" && p.currentAge >= 8)!;

    const undefinedLineage = {
      ...base,
      persons: base.persons.map((person) =>
        person.personId === adult.personId ? { ...person, lineageId: undefined } : person,
      ),
    };
    expect(() => validateWorldEngineState(undefinedLineage)).toThrow(WorldEngineError);

    const withFunction = {
      ...base,
      persons: base.persons.map((person, index) =>
        index === 0 ? { ...person, extra: () => 1 } : person,
      ),
    };
    expect(() => validateWorldEngineState(withFunction)).toThrow(WorldEngineError);

    const cyclicPerson: Record<string, unknown> = { ...base.persons[0]! };
    cyclicPerson.self = cyclicPerson;
    const cyclicState = {
      ...base,
      persons: [cyclicPerson, ...base.persons.slice(1)],
    };
    expect(() => validateWorldEngineState(cyclicState)).toThrow(WorldEngineError);

    try {
      validateWorldEngineState(cyclicState);
    } catch (error) {
      expect(error).toBeInstanceOf(WorldEngineError);
      expect(error).not.toBeInstanceOf(RangeError);
    }

    const processor: WorldProcessor = {
      processorId: "bad-json",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person, index) =>
            index === 0 ? ({ ...person, weird: undefined } as unknown as Person) : person,
          ),
        } as WorldEngineState;
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [processor], startSequence }),
    ).toThrow(WorldEngineError);

    expect(() => validateWorldEngineState(freshState())).not.toThrow();
    expect(() => toCanonicalJson(freshState())).not.toThrow();
  });

  it("rejects ability/aptitude values outside 0..100", () => {
    const base = freshState();
    for (const bad of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const state = {
        ...base,
        persons: base.persons.map((person, index) =>
          index === 0
            ? {
                ...person,
                abilities: {
                  ...person.abilities,
                  stamina: {
                    ...person.abilities.stamina,
                    surfaceValue: bad,
                  },
                },
              }
            : person,
        ),
      };
      expect(() => validateWorldEngineState(state)).toThrow(WorldEngineError);
    }
    const ok = {
      ...base,
      persons: base.persons.map((person, index) =>
        index === 0
          ? {
              ...person,
              abilities: {
                ...person.abilities,
                stamina: { ...person.abilities.stamina, surfaceValue: 0 },
                strength: { ...person.abilities.strength, surfaceValue: 100 },
              },
              aptitudes: {
                ...person.aptitudes,
                unarmed: { ...person.aptitudes.unarmed, surfaceValue: 0 },
                sword: { ...person.aptitudes.sword, surfaceValue: 100 },
              },
            }
          : person,
      ),
    };
    expect(() => validateWorldEngineState(ok)).not.toThrow();
  });

  it("rejects invalid generationSummary counts/rates and family baseBirthRate", () => {
    const base = freshState();
    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: {
          ...base.generationSummary,
          livingCount: { target: -1, actual: 1 },
        },
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: {
          ...base.generationSummary,
          livingCount: { target: 1.5, actual: 1 },
        },
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: {
          ...base.generationSummary,
          knownParentCoverage: { target: -0.1, actual: 0.5 },
        },
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: {
          ...base.generationSummary,
          formalMasterCoverage: { target: 1.1, actual: 0.5 },
        },
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        families: base.families.map((family, index) =>
          index === 0 ? { ...family, baseBirthRate: -0.1 } : family,
        ),
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        families: base.families.map((family, index) =>
          index === 0 ? { ...family, baseBirthRate: 1.1 } : family,
        ),
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: {
          ...base.generationSummary,
          livingCount: { target: 0, actual: 0 },
          knownParentCoverage: { target: 0, actual: 1 },
        },
        families: base.families.map((family, index) =>
          index === 0 ? { ...family, baseBirthRate: 0 } : family,
        ),
      }),
    ).not.toThrow();

    expect(() =>
      validateWorldEngineState({
        ...base,
        families: base.families.map((family, index) =>
          index === 0 ? { ...family, baseBirthRate: 1 } : family,
        ),
      }),
    ).not.toThrow();
  });
});

describe("world-engine acceptance audit", () => {
  const generated = buildBaselineWorld();
  const startSequence = generated.initialEvents.length;

  function freshState(): WorldEngineState {
    return createWorldEngineState(generated.snapshot);
  }

  it("rejects rng method replacement, addition, and bad exportState", () => {
    const replaceExport: WorldProcessor = {
      processorId: "bad-export",
      process({ state, rng }) {
        (rng as { exportState: unknown }).exportState = () => ({
          algorithmVersion: "bad-rng",
          s0: 1,
          s1: 2,
          s2: 3,
          s3: 4,
        });
        return state;
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [replaceExport], startSequence }),
    ).toThrow(WorldEngineError);

    const replaceNext: WorldProcessor = {
      processorId: "bad-next",
      process({ state, rng }) {
        (rng as { nextUint32: unknown }).nextUint32 = () => 0;
        return state;
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [replaceNext], startSequence }),
    ).toThrow(WorldEngineError);

    const addProp: WorldProcessor = {
      processorId: "bad-add",
      process({ state, rng }) {
        (rng as { hacked?: boolean }).hacked = true;
        return state;
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [addProp], startSequence }),
    ).toThrow(WorldEngineError);

    const ok: WorldProcessor = {
      processorId: "ok-rng",
      process({ state, rng }) {
        rng.nextUint32();
        rng.nextFloat();
        return state;
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [ok], startSequence }),
    ).not.toThrow();
  });

  it("rejects accessor-based unstable WorldEngineState inputs", () => {
    const base = freshState();
    let seedFlip = 0;
    const unstableSeed = {
      ...base,
      get seed() {
        seedFlip += 1;
        return seedFlip === 1 ? 12345 : "bad";
      },
    };
    expect(() => validateWorldEngineState(unstableSeed)).toThrow(WorldEngineError);

    let idFlip = 0;
    const person = base.persons[0]!;
    const unstablePersonId = {
      ...base,
      persons: [
        {
          ...person,
          get personId() {
            idFlip += 1;
            return idFlip === 1 ? person.personId : "person_changed";
          },
        },
        ...base.persons.slice(1),
      ],
    };
    expect(() => validateWorldEngineState(unstablePersonId)).toThrow(WorldEngineError);

    let abilitiesFlip = 0;
    const unstableAbilities = {
      ...base,
      persons: [
        {
          ...person,
          get abilities() {
            abilitiesFlip += 1;
            return abilitiesFlip === 1
              ? person.abilities
              : { ...person.abilities, stamina: { ...person.abilities.stamina, surfaceValue: -1 } };
          },
        },
        ...base.persons.slice(1),
      ],
    };
    expect(() => validateWorldEngineState(unstableAbilities)).toThrow(WorldEngineError);

    const throwingSeed = {
      ...base,
      get seed() {
        throw new TypeError("seed boom");
      },
    };
    expect(() => validateWorldEngineState(throwingSeed)).toThrow(WorldEngineError);

    const setterOnly: Record<string, unknown> = { ...base };
    Object.defineProperty(setterOnly, "configProfileId", {
      set() {
        /* ignore */
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => validateWorldEngineState(setterOnly)).toThrow(WorldEngineError);

    const symbolPerson = {
      ...base,
      persons: [Object.assign({ ...person }, { [Symbol("x")]: 1 }), ...base.persons.slice(1)],
    };
    expect(() => validateWorldEngineState(symbolPerson)).toThrow(WorldEngineError);

    const symbolState = Object.assign({ ...base }, { [Symbol("y")]: 1 });
    expect(() => validateWorldEngineState(symbolState)).toThrow(WorldEngineError);

    const valid = freshState();
    expect(() => validateWorldEngineState(valid)).not.toThrow();
    expect(() => validateWorldEngineState(valid)).not.toThrow();
  });

  it("rejects schema-extra nested fields and array own props", () => {
    const base = freshState();
    expect(() =>
      validateWorldEngineState({
        ...base,
        persons: base.persons.map((person, index) =>
          index === 0 ? { ...person, extra: { nested: { value: 1 } } } : person,
        ),
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        families: base.families.map((family, index) =>
          index === 0 ? { ...family, extra: { nested: 1 } } : family,
        ),
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: {
          ...base.generationSummary,
          extra: { nested: 1 },
        },
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      validateWorldEngineState({
        ...base,
        extra: { nested: 1 },
      }),
    ).toThrow(WorldEngineError);

    const persons = [...base.persons] as unknown as unknown[] & { custom?: string };
    persons.custom = "nope";
    expect(() => validateWorldEngineState({ ...base, persons })).toThrow(WorldEngineError);

    expect(() => validateWorldEngineState(generated.snapshot)).not.toThrow();
    expect(() => toCanonicalJson(freshState())).not.toThrow();
  });

  it("keeps clone fully isolated and rejects unstable clone inputs", () => {
    const state = freshState();
    const cloned = cloneWorldEngineState(state);
    expect(cloned.persons[0]).not.toBe(state.persons[0]);
    expect(cloned.persons[0]?.abilities).not.toBe(state.persons[0]?.abilities);
    expect(cloned.families[0]).not.toBe(state.families[0]);
    expect(cloned.generationSummary).not.toBe(state.generationSummary);

    const before = toCanonicalJson(state);
    cloned.persons[0]!.abilities.stamina.surfaceValue = Math.min(
      100,
      cloned.persons[0]!.abilities.stamina.surfaceValue + 1,
    );
    (cloned.families[0] as { familyName: string }).familyName = "changed";
    (cloned.generationSummary.livingCount as { actual: number }).actual += 1;
    expect(toCanonicalJson(state)).toBe(before);

    expect(() =>
      cloneWorldEngineState({
        ...state,
        persons: state.persons.map((person, index) =>
          index === 0 ? { ...person, extra: { nested: { value: 1 } } } : person,
        ),
      }),
    ).toThrow(WorldEngineError);

    let flip = 0;
    const unstable = {
      ...state,
      get seed() {
        flip += 1;
        return flip === 1 ? state.seed : "bad";
      },
    };
    expect(() => cloneWorldEngineState(unstable)).toThrow(WorldEngineError);
  });
});

describe("world-engine final acceptance audit", () => {
  const generated = buildBaselineWorld();
  const startSequence = generated.initialEvents.length;

  function freshState(): WorldEngineState {
    return createWorldEngineState(generated.snapshot);
  }

  function livingActiveAround(
    state: WorldEngineState,
    minAge: number,
    maxAge: number,
  ): Person & { lifeStatus: "living"; participationStatus: "active"; currentAge: number } {
    const found = state.persons.find(
      (
        person,
      ): person is Person & {
        lifeStatus: "living";
        participationStatus: "active";
        currentAge: number;
      } =>
        person.lifeStatus === "living" &&
        person.participationStatus === "active" &&
        person.careerStatus === "active_competitor" &&
        person.currentAge >= minAge &&
        person.currentAge <= maxAge,
    );
    if (found === undefined) {
      throw new Error("no suitable living active person");
    }
    return found;
  }

  it("rejects runWorld input getters before evaluation", () => {
    const state = freshState();
    const counters = {
      state: 0,
      processors: 0,
      weeks: 0,
      years: 0,
      startSequence: 0,
      processorRuntimeState: 0,
      processorId: 0,
      process: 0,
    };

    const weeksInput: Record<string, unknown> = {};
    Object.defineProperty(weeksInput, "state", {
      get() {
        counters.state += 1;
        return state;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(weeksInput, "processors", {
      get() {
        counters.processors += 1;
        return [];
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(weeksInput, "weeks", {
      get() {
        counters.weeks += 1;
        return 1;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(weeksInput, "startSequence", {
      get() {
        counters.startSequence += 1;
        return startSequence;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => runWorldWeeks(weeksInput as never)).toThrow(WorldEngineError);
    expect(counters.state).toBe(0);
    expect(counters.processors).toBe(0);
    expect(counters.weeks).toBe(0);
    expect(counters.startSequence).toBe(0);

    const yearsInput: Record<string, unknown> = {
      state,
      processors: [],
      startSequence,
    };
    Object.defineProperty(yearsInput, "years", {
      get() {
        counters.years += 1;
        return 1;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => runWorldYears(yearsInput as never)).toThrow(WorldEngineError);
    expect(counters.years).toBe(0);

    const runtimeInput: Record<string, unknown> = {
      state,
      processors: [],
      weeks: 0,
      startSequence,
    };
    Object.defineProperty(runtimeInput, "processorRuntimeState", {
      get() {
        counters.processorRuntimeState += 1;
        return { processorOrder: [], rngStates: [] };
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => runWorldWeeks(runtimeInput as never)).toThrow(WorldEngineError);
    expect(counters.processorRuntimeState).toBe(0);

    const processorHost: Record<string, unknown> = {};
    Object.defineProperty(processorHost, "processorId", {
      get() {
        counters.processorId += 1;
        return "p1";
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(processorHost, "process", {
      get() {
        counters.process += 1;
        return ({ state: s }: { state: WorldEngineState }) => s;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldOneWeek({
        state,
        processors: [processorHost as never],
        startSequence,
      }),
    ).toThrow(WorldEngineError);
    expect(counters.processorId).toBe(0);
    expect(counters.process).toBe(0);
  });

  it("rejects TOCTOU getters that would mutate caller state abilities to 999", () => {
    const mutateAbility = (state: WorldEngineState) => {
      const person = state.persons[0];
      if (person === undefined) {
        throw new Error("missing person");
      }
      person.abilities.stamina.surfaceValue = 999;
    };

    for (const field of ["processors", "weeks", "startSequence"] as const) {
      const state = freshState();
      const input: Record<string, unknown> = {
        state,
        processors: [],
        weeks: 1,
        startSequence,
      };
      let counter = 0;
      Object.defineProperty(input, field, {
        get() {
          counter += 1;
          mutateAbility(state);
          if (field === "processors") {
            return [];
          }
          if (field === "weeks") {
            return 1;
          }
          return startSequence;
        },
        enumerable: true,
        configurable: true,
      });
      expect(() => runWorldWeeks(input as never)).toThrow(WorldEngineError);
      expect(counter).toBe(0);
      expect(state.persons[0]?.abilities.stamina.surfaceValue).not.toBe(999);
    }

    const state = freshState();
    const processorHost: Record<string, unknown> = {
      process({ state: s }: { state: WorldEngineState }) {
        return s;
      },
    };
    let processorIdCounter = 0;
    Object.defineProperty(processorHost, "processorId", {
      get() {
        processorIdCounter += 1;
        mutateAbility(state);
        return "p1";
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state,
        processors: [processorHost as never],
        weeks: 1,
        startSequence,
      }),
    ).toThrow(WorldEngineError);
    expect(processorIdCounter).toBe(0);
    expect(state.persons[0]?.abilities.stamina.surfaceValue).not.toBe(999);
  });

  it("rejects non-enumerable schema properties", () => {
    const base = freshState();

    const seedHidden = { ...base };
    Object.defineProperty(seedHidden, "seed", {
      value: base.seed,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    expect(() => validateWorldEngineState(seedHidden)).toThrow(WorldEngineError);

    const worldDateHidden = {
      ...base,
      worldDate: { ...base.worldDate },
    };
    Object.defineProperty(worldDateHidden.worldDate, "year", {
      value: base.worldDate.year,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    expect(() => validateWorldEngineState(worldDateHidden)).toThrow(WorldEngineError);

    const person = { ...base.persons[0]! };
    Object.defineProperty(person, "personId", {
      value: person.personId,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    expect(() =>
      validateWorldEngineState({
        ...base,
        persons: [person, ...base.persons.slice(1)],
      }),
    ).toThrow(WorldEngineError);

    const family = { ...base.families[0]! };
    Object.defineProperty(family, "familyId", {
      value: family.familyId,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    expect(() =>
      validateWorldEngineState({
        ...base,
        families: [family, ...base.families.slice(1)],
      }),
    ).toThrow(WorldEngineError);

    const summary = { ...base.generationSummary };
    Object.defineProperty(summary, "livingCount", {
      value: summary.livingCount,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: summary,
      }),
    ).toThrow(WorldEngineError);
  });

  it("rejects sparse arrays, index accessors, own props, and invalid array indexes", () => {
    const base = freshState();
    let personGetterCount = 0;
    const personsWithGetter = [...base.persons];
    Object.defineProperty(personsWithGetter, "0", {
      get() {
        personGetterCount += 1;
        return base.persons[0];
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => validateWorldEngineState({ ...base, persons: personsWithGetter })).toThrow(
      WorldEngineError,
    );
    expect(personGetterCount).toBe(0);

    const sparseWarnings = [...base.generationSummary.warnings];
    if (sparseWarnings.length === 0) {
      sparseWarnings.length = 1;
    }
    delete sparseWarnings[0];
    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: { ...base.generationSummary, warnings: sparseWarnings },
      }),
    ).toThrow(WorldEngineError);

    const sparseAgeBands = [...base.generationSummary.ageBands];
    if (sparseAgeBands.length === 0) {
      sparseAgeBands.length = 1;
    }
    delete sparseAgeBands[0];
    expect(() =>
      validateWorldEngineState({
        ...base,
        generationSummary: { ...base.generationSummary, ageBands: sparseAgeBands },
      }),
    ).toThrow(WorldEngineError);

    const personsOwn = [...base.persons] as unknown as unknown[] & { custom?: string };
    personsOwn.custom = "nope";
    expect(() => validateWorldEngineState({ ...base, persons: personsOwn })).toThrow(
      WorldEngineError,
    );

    const personsPseudo = [...base.persons];
    Object.defineProperty(personsPseudo, "4294967295", {
      value: base.persons[0],
      enumerable: true,
      configurable: true,
    });
    expect(() => validateWorldEngineState({ ...base, persons: personsPseudo })).toThrow(
      WorldEngineError,
    );

    expect(() => validateWorldEngineState(base)).not.toThrow();
    expect(() => JSON.parse(toCanonicalJson(base))).not.toThrow();
  });

  it("rejects ProcessorRuntimeState accessors, sparse arrays, symbols, and extras", () => {
    const first = runWorldWeeks({
      state: freshState(),
      processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
      weeks: 1,
      startSequence,
    });
    const good = first.processorRuntimeState;

    const orderGetter: Record<string, unknown> = {
      rngStates: good.rngStates,
    };
    let orderCount = 0;
    Object.defineProperty(orderGetter, "processorOrder", {
      get() {
        orderCount += 1;
        return good.processorOrder;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state: freshState(),
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence,
        processorRuntimeState: orderGetter as never,
      }),
    ).toThrow(WorldEngineError);
    expect(orderCount).toBe(0);

    const rngGetter: Record<string, unknown> = {
      processorOrder: [...good.processorOrder],
    };
    let rngCount = 0;
    Object.defineProperty(rngGetter, "rngStates", {
      get() {
        rngCount += 1;
        return good.rngStates;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: rngGetter as never,
      }),
    ).toThrow(WorldEngineError);
    expect(rngCount).toBe(0);

    const entry = { ...good.rngStates[0]! };
    let entryIdCount = 0;
    Object.defineProperty(entry, "processorId", {
      get() {
        entryIdCount += 1;
        return good.rngStates[0]!.processorId;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: [...good.processorOrder],
          rngStates: [entry, good.rngStates[1]!],
        },
      }),
    ).toThrow(WorldEngineError);
    expect(entryIdCount).toBe(0);

    const entryStateHost = {
      processorId: good.rngStates[0]!.processorId,
    } as Record<string, unknown>;
    let entryStateCount = 0;
    Object.defineProperty(entryStateHost, "state", {
      get() {
        entryStateCount += 1;
        return good.rngStates[0]!.state;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: [...good.processorOrder],
          rngStates: [entryStateHost as never, good.rngStates[1]!],
        },
      }),
    ).toThrow(WorldEngineError);
    expect(entryStateCount).toBe(0);

    const s0Host = { ...good.rngStates[0]!.state };
    let s0Count = 0;
    Object.defineProperty(s0Host, "s0", {
      get() {
        s0Count += 1;
        return good.rngStates[0]!.state.s0;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: [...good.processorOrder],
          rngStates: [
            { processorId: good.rngStates[0]!.processorId, state: s0Host },
            good.rngStates[1]!,
          ],
        },
      }),
    ).toThrow(WorldEngineError);
    expect(s0Count).toBe(0);

    const flipState = { ...good.rngStates[0]!.state };
    let flip = 0;
    Object.defineProperty(flipState, "s1", {
      get() {
        flip += 1;
        return flip === 1 ? good.rngStates[0]!.state.s1 : (good.rngStates[0]!.state.s1 + 1) >>> 0;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: [...good.processorOrder],
          rngStates: [
            { processorId: good.rngStates[0]!.processorId, state: flipState },
            good.rngStates[1]!,
          ],
        },
      }),
    ).toThrow(WorldEngineError);
    expect(flip).toBe(0);

    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: Object.assign(
          {
            processorOrder: [...good.processorOrder],
            rngStates: good.rngStates.map((entry) => ({
              processorId: entry.processorId,
              state: { ...entry.state },
            })),
          },
          { [Symbol("x")]: 1 },
        ) as never,
      }),
    ).toThrow(WorldEngineError);

    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: [...good.processorOrder],
          rngStates: good.rngStates.map((entry) => ({
            processorId: entry.processorId,
            state: { ...entry.state },
          })),
          extra: true,
        } as never,
      }),
    ).toThrow(WorldEngineError);

    const sparseOrder = [...good.processorOrder];
    delete sparseOrder[0];
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: sparseOrder,
          rngStates: good.rngStates.map((entry) => ({
            processorId: entry.processorId,
            state: { ...entry.state },
          })),
        },
      }),
    ).toThrow(WorldEngineError);

    const sparseRng = good.rngStates.map((entry) => ({
      processorId: entry.processorId,
      state: { ...entry.state },
    }));
    delete sparseRng[0];
    expect(() =>
      runWorldWeeks({
        state: first.state,
        processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
        weeks: 1,
        startSequence: first.nextSequence,
        processorRuntimeState: {
          processorOrder: [...good.processorOrder],
          rngStates: sparseRng,
        },
      }),
    ).toThrow(WorldEngineError);

    const continued = runWorldWeeks({
      state: first.state,
      processors: [createCallOrderProcessor("a", []), createCallOrderProcessor("b", [])],
      weeks: 1,
      startSequence: first.nextSequence,
      processorRuntimeState: {
        processorOrder: [...good.processorOrder],
        rngStates: good.rngStates.map((entry) => ({
          processorId: entry.processorId,
          state: { ...entry.state },
        })),
      },
    });
    expect(continued.weeksExecuted).toBe(1);
  });

  it("rejects age regression and birthYear mutation; allows catch-up and active resume", () => {
    const base = freshState();
    const target = livingActiveAround(base, 28, 35);

    const rejectStoppedToZero: WorldProcessor = {
      processorId: "age-down-stopped",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? { ...person, participationStatus: "stopped", currentAge: 0 }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({ state: base, processors: [rejectStoppedToZero], startSequence }),
    ).toThrow(WorldEngineError);

    const rejectWaitingDown: WorldProcessor = {
      processorId: "age-down-waiting",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? {
                  ...person,
                  participationStatus: "waiting",
                  currentAge: Math.max(0, person.currentAge - 20),
                }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [rejectWaitingDown], startSequence }),
    ).toThrow(WorldEngineError);

    const rejectBirthYear: WorldProcessor = {
      processorId: "birth-year",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? { ...person, birthYear: person.birthYear - 1 }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [rejectBirthYear], startSequence }),
    ).toThrow(WorldEngineError);

    const rejectSimultaneous: WorldProcessor = {
      processorId: "birth-and-age",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? {
                  ...person,
                  birthYear: person.birthYear + 5,
                  currentAge: state.worldDate.year - (person.birthYear + 5),
                }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({ state: freshState(), processors: [rejectSimultaneous], startSequence }),
    ).toThrow(WorldEngineError);

    const pauseSameAge: WorldProcessor = {
      processorId: "age-ops",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? { ...person, participationStatus: "stopped" }
              : person,
          ),
        };
      },
    };
    const paused = runWorldOneWeek({
      state: freshState(),
      processors: [pauseSameAge],
      startSequence,
    });
    const holdStopped: WorldProcessor = {
      processorId: "age-ops",
      process({ state }) {
        return state;
      },
    };
    const lagged = runWorldWeeks({
      state: paused.state,
      processors: [holdStopped],
      weeks: 48,
      startSequence: paused.nextSequence,
      processorRuntimeState: paused.processorRuntimeState,
    });
    const laggedPerson = lagged.state.persons.find((person) => person.personId === target.personId);
    expect(laggedPerson?.lifeStatus).toBe("living");
    if (laggedPerson?.lifeStatus !== "living") {
      throw new Error("expected living lagged person");
    }
    const laggedCalendarAge = lagged.state.worldDate.year - laggedPerson.birthYear;
    expect(laggedPerson.currentAge).toBe(laggedCalendarAge - 1);

    const catchUp: WorldProcessor = {
      processorId: "age-ops",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? {
                  ...person,
                  participationStatus: "stopped",
                  currentAge: state.worldDate.year - person.birthYear,
                }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({
        state: lagged.state,
        processors: [catchUp],
        startSequence: lagged.nextSequence,
        processorRuntimeState: lagged.processorRuntimeState,
      }),
    ).not.toThrow();

    const resumeActive: WorldProcessor = {
      processorId: "age-ops",
      process({ state }) {
        return {
          ...state,
          persons: state.persons.map((person) =>
            person.personId === target.personId && person.lifeStatus === "living"
              ? {
                  ...person,
                  participationStatus: "active",
                  currentAge: state.worldDate.year - person.birthYear,
                }
              : person,
          ),
        };
      },
    };
    expect(() =>
      runWorldOneWeek({
        state: lagged.state,
        processors: [resumeActive],
        startSequence: lagged.nextSequence,
        processorRuntimeState: lagged.processorRuntimeState,
      }),
    ).not.toThrow();
  });

  it("requires fixed schemaVersion, simulationSpecVersion, and worldId", () => {
    const base = freshState();
    expect(() => validateWorldEngineState({ ...base, schemaVersion: "x" })).toThrow(
      WorldEngineError,
    );
    expect(() => validateWorldEngineState({ ...base, simulationSpecVersion: "x" })).toThrow(
      WorldEngineError,
    );
    expect(() => validateWorldEngineState({ ...base, worldId: "x" })).toThrow(WorldEngineError);

    const after101 = runWorldYears({
      state: freshState(),
      processors: [],
      years: 100,
      startSequence,
    });
    expect(after101.state.schemaVersion).toBe(generated.snapshot.schemaVersion);
    expect(after101.state.simulationSpecVersion).toBe(generated.snapshot.simulationSpecVersion);
    expect(after101.state.worldId).toBe(generated.snapshot.worldId);
    expect(() => validateWorldEngineState(after101.state)).not.toThrow();
    expect(() => JSON.parse(toCanonicalJson(after101.state))).not.toThrow();
  }, 60_000);
});

describe("processorSpecificStates deep clone hardening", () => {
  function sampleRngState() {
    return createSeededRng(1).exportState();
  }

  function runtimeWithSpecific(specificState: unknown): ProcessorRuntimeState {
    return {
      processorOrder: ["weekly-training"],
      rngStates: [{ processorId: "weekly-training", state: sampleRngState() }],
      processorSpecificStates: [{ processorId: "weekly-training", specificState }],
    };
  }

  it("deep-clones nested specificState without aliasing source", () => {
    const source = runtimeWithSpecific({
      schemaVersion: "0.1.0",
      actionCounts: { train_stat: 1, rest: 2 },
    });
    const cloned = validateAndCloneProcessorRuntimeState(source, ["weekly-training"]);
    const sourceSpecific = source.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    const clonedSpecific = cloned.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    expect(clonedSpecific).not.toBe(sourceSpecific);
    expect(clonedSpecific.actionCounts).not.toBe(sourceSpecific.actionCounts);
    expect(clonedSpecific).toEqual(sourceSpecific);
  });

  it("keeps clone immutable when source nested values mutate", () => {
    const source = runtimeWithSpecific({
      schemaVersion: "0.1.0",
      actionCounts: { train_stat: 1 },
    });
    const cloned = cloneRuntimeState(source);
    const sourceSpecific = source.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    sourceSpecific.actionCounts.train_stat = 99;
    const clonedSpecific = cloned.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    expect(clonedSpecific.actionCounts.train_stat).toBe(1);
  });

  it("keeps source immutable when clone nested values mutate", () => {
    const source = runtimeWithSpecific({
      schemaVersion: "0.1.0",
      actionCounts: { train_stat: 1 },
    });
    const cloned = exportRuntimeState(
      source.processorOrder,
      [createSeededRng(1)],
      source.processorSpecificStates,
    );
    const clonedSpecific = cloned.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    clonedSpecific.actionCounts.train_stat = 77;
    const sourceSpecific = source.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    expect(sourceSpecific.actionCounts.train_stat).toBe(1);
  });

  it("rejects nested getters without invoking them", () => {
    let calls = 0;
    const specificState = {};
    Object.defineProperty(specificState, "actionCounts", {
      enumerable: true,
      get() {
        calls += 1;
        return { train_stat: 1 };
      },
    });
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific(specificState), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
    expect(calls).toBe(0);
  });

  it("rejects throwing getters without invoking them", () => {
    let calls = 0;
    const specificState = {};
    Object.defineProperty(specificState, "boom", {
      enumerable: true,
      get() {
        calls += 1;
        throw new Error("should not run");
      },
    });
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific(specificState), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
    expect(calls).toBe(0);
  });

  it("rejects cyclic specificState", () => {
    const cyclic: Record<string, unknown> = { schemaVersion: "0.1.0" };
    cyclic["self"] = cyclic;
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific(cyclic), ["weekly-training"]),
    ).toThrow(WorldEngineError);
  });

  it("rejects sparse arrays in specificState", () => {
    const sparse: unknown[] = [];
    sparse[1] = 1;
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ items: sparse }), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
  });

  it("rejects function / symbol / bigint / non-finite numbers", () => {
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ fn: () => 1 }), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ sym: Symbol("x") }), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ big: 1n }), ["weekly-training"]),
    ).toThrow(WorldEngineError);
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ n: Number.NaN }), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ n: Number.POSITIVE_INFINITY }), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
    expect(() =>
      validateAndCloneProcessorRuntimeState(runtimeWithSpecific({ n: Number.NEGATIVE_INFINITY }), [
        "weekly-training",
      ]),
    ).toThrow(WorldEngineError);
  });

  it("keeps Sprint0 omission and empty processorSpecificStates compatible", () => {
    const omitted: ProcessorRuntimeState = {
      processorOrder: ["alpha"],
      rngStates: [{ processorId: "alpha", state: sampleRngState() }],
    };
    const clonedOmitted = validateAndCloneProcessorRuntimeState(omitted, ["alpha"]);
    expect(clonedOmitted.processorSpecificStates).toBeUndefined();

    const empty = {
      ...omitted,
      processorSpecificStates: [],
    };
    const clonedEmpty = validateAndCloneProcessorRuntimeState(empty, ["alpha"]);
    expect(clonedEmpty.processorSpecificStates).toEqual([]);
  });

  it("rejects cloneRuntimeState top-level processorSpecificStates getter without invoking it", () => {
    let calls = 0;
    const source: Record<string, unknown> = {
      processorOrder: ["weekly-training"],
      rngStates: [{ processorId: "weekly-training", state: sampleRngState() }],
    };
    Object.defineProperty(source, "processorSpecificStates", {
      enumerable: true,
      get() {
        calls += 1;
        return [{ processorId: "weekly-training", specificState: { x: 1 } }];
      },
    });
    expect(() => cloneRuntimeState(source)).toThrow(WorldEngineError);
    expect(calls).toBe(0);
  });

  it("rejects cloneRuntimeState entry.processorId getter without invoking it", () => {
    let calls = 0;
    const entry: Record<string, unknown> = {
      specificState: { schemaVersion: "0.1.0" },
    };
    Object.defineProperty(entry, "processorId", {
      enumerable: true,
      get() {
        calls += 1;
        return "weekly-training";
      },
    });
    const source = {
      processorOrder: ["weekly-training"],
      rngStates: [{ processorId: "weekly-training", state: sampleRngState() }],
      processorSpecificStates: [entry],
    };
    expect(() => cloneRuntimeState(source)).toThrow(WorldEngineError);
    expect(calls).toBe(0);
  });

  it("rejects cloneRuntimeState entry.specificState getter without invoking it", () => {
    let calls = 0;
    const entry: Record<string, unknown> = {
      processorId: "weekly-training",
    };
    Object.defineProperty(entry, "specificState", {
      enumerable: true,
      get() {
        calls += 1;
        return { schemaVersion: "0.1.0" };
      },
    });
    const source = {
      processorOrder: ["weekly-training"],
      rngStates: [{ processorId: "weekly-training", state: sampleRngState() }],
      processorSpecificStates: [entry],
    };
    expect(() => cloneRuntimeState(source)).toThrow(WorldEngineError);
    expect(calls).toBe(0);
  });

  it("rejects exportRuntimeState entry.specificState getter without invoking it", () => {
    let calls = 0;
    const entry: Record<string, unknown> = {
      processorId: "weekly-training",
    };
    Object.defineProperty(entry, "specificState", {
      enumerable: true,
      get() {
        calls += 1;
        return { schemaVersion: "0.1.0" };
      },
    });
    expect(() =>
      exportRuntimeState(
        ["weekly-training"],
        [createSeededRng(1)],
        [entry as { processorId: string; specificState: unknown }],
      ),
    ).toThrow(WorldEngineError);
    expect(calls).toBe(0);
  });
});
