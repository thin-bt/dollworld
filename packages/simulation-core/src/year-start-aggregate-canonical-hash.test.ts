import { describe, expect, it } from "vitest";
import { hashCanonicalValueUtf8, toCanonicalJson } from "./canonical-json.js";
import { runYears } from "./sprint2/run-weeks.js";
import { computeEventStreamHash } from "./sprint1/year-start-aggregate.js";
import {
  buildFreshCheckpointRunContext,
  expectOk,
} from "./test-fixtures/sprint2-checkpoint.fixture.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const provider = createNodeSha256Provider();

function buildSyntheticEvent(sequence: number): Record<string, unknown> {
  return {
    sequence,
    schemaVersion: "0.2.0",
    eventId: `evt-${String(sequence).padStart(8, "0")}`,
    simulationId: "sim-test",
    worldDate: { year: 1, week: 1 },
    importance: "routine",
    origin: "processor",
    label: "weekly-training-completed",
    summary: "x".repeat(256),
    entities: {
      persons: [`person-${String(sequence % 600).padStart(4, "0")}`],
      families: [],
      lineages: [],
      matches: [],
      relationships: [],
    },
    matchIds: [],
    payload: {
      action: "training",
      notes: "y".repeat(128),
    },
  };
}

describe("year-start aggregate canonical hash streaming", () => {
  it("matches legacy hashUtf8(toCanonicalJson) on bounded fixtures", () => {
    const fixtures: unknown[] = [
      { b: 1, a: { d: 2, c: 3 }, list: [1, 2] },
      [{ sequence: 2, label: "b" }, { sequence: 1, label: "a" }],
      { eventEnvelopeSchemaVersion: "0.2.0", nextSequence: 42 },
    ];

    for (const fixture of fixtures) {
      const legacy = provider.hashUtf8(toCanonicalJson(fixture));
      const streamed = hashCanonicalValueUtf8(provider, fixture);
      expect(streamed).toBe(legacy);
    }
  });

  it("hashes large event streams without materializing canonical JSON text", () => {
    const eventCount = 250_000;
    const eventStream = Array.from({ length: eventCount }, (_, index) =>
      buildSyntheticEvent(index + 1),
    );

    const hashed = computeEventStreamHash(eventStream, provider);
    expect(hashed.ok).toBe(true);
    if (!hashed.ok) {
      throw new Error(JSON.stringify(hashed.issues));
    }

    expect(hashed.value).toMatch(/^[0-9a-f]{64}$/);

    const prefix = eventStream.slice(0, 128);
    const prefixLegacy = provider.hashUtf8(toCanonicalJson(prefix));
    const prefixStreamed = hashCanonicalValueUtf8(provider, prefix);
    expect(prefixStreamed).toBe(prefixLegacy);

    const repeat = computeEventStreamHash(eventStream, provider);
    expect(repeat.ok).toBe(true);
    if (repeat.ok) {
      expect(repeat.value).toBe(hashed.value);
    }
  });

  it("runYears year-start sealing survives real checkpoint progression", () => {
    const initial = buildFreshCheckpointRunContext(12345, provider);
    const after = expectOk(runYears(initial, 3, provider));
    expect(after.executionState.elapsedWeeks).toBeGreaterThan(0);
    expect(after.session.runtimeState.eventStream.length).toBeGreaterThan(0);

    const eventStreamHash = computeEventStreamHash(
      after.session.runtimeState.eventStream,
      provider,
    );
    expect(eventStreamHash.ok).toBe(true);
  });
});
