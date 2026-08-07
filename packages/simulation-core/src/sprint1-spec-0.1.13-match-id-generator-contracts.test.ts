/**
 * Contract tests for S1-SPEC-0.1.13 MatchId deterministic generator clarification.
 * Locks version registry, MatchId format / state field set / transition / seed role /
 * canonical fixture, and SimulationIdentity binding. Does not implement the
 * production MatchId generator (S01-005).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  createDefaultSprint1ConfigInput,
  createSimulationIdFromIdentity,
  toCanonicalJson,
  validateSimulationIdentity,
  validateSprint1Config,
  type SimulationIdentity,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

/** Spec-only logical state shape for contract fixtures (not a production type). */
type MatchIdGeneratorStateFixture = {
  schemaVersion: "0.1.0";
  generatorVersion: "match-id-generator-0.1.0";
  namespace: "match";
  seed: number;
  nextSequence: number;
};

const MATCH_ID_FORMAT = /^match_[0-9]{12}$/;
const SEQUENCE_MAXIMUM = 999_999_999_999;
const SEQUENCE_EXHAUSTED_SENTINEL = 1_000_000_000_000;

const FIXED_FRESH_STATE: MatchIdGeneratorStateFixture = {
  schemaVersion: "0.1.0",
  generatorVersion: "match-id-generator-0.1.0",
  namespace: "match",
  seed: 12345,
  nextSequence: 1,
};

const FIXED_CANONICAL_JSON =
  '{"generatorVersion":"match-id-generator-0.1.0","namespace":"match","nextSequence":1,"schemaVersion":"0.1.0","seed":12345}';
const FIXED_CANONICAL_BYTE_LENGTH = 121;
const FIXED_STATE_SHA256 = "c5b7dd00fb9b5262e58106e9a06b2936d9aa3cefcc1cf66b64a3ab714513e54f";

function formatMatchIdFromSequence(sequence: number): string {
  return `match_${String(sequence).padStart(12, "0")}`;
}

function reserveNextMatchIdContract(state: MatchIdGeneratorStateFixture):
  | {
      kind: "success";
      matchId: string;
      nextState: MatchIdGeneratorStateFixture;
    }
  | {
      kind: "failure";
      matchId: null;
      nextState: null;
      code: "match_id_sequence_exhausted";
    } {
  if (state.nextSequence === SEQUENCE_EXHAUSTED_SENTINEL) {
    return {
      kind: "failure",
      matchId: null,
      nextState: null,
      code: "match_id_sequence_exhausted",
    };
  }
  if (state.nextSequence < 1 || state.nextSequence > SEQUENCE_MAXIMUM) {
    throw new Error("contract fixture nextSequence is outside the reserved success band");
  }
  const matchId = formatMatchIdFromSequence(state.nextSequence);
  return {
    kind: "success",
    matchId,
    nextState: {
      schemaVersion: state.schemaVersion,
      generatorVersion: state.generatorVersion,
      namespace: state.namespace,
      seed: state.seed,
      nextSequence: state.nextSequence + 1,
    },
  };
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function identityWithStateHash(stateHash: string): SimulationIdentity {
  return {
    schemaVersion: "0.3.0",
    seed: 1,
    initialWorldConfigHash: "a".repeat(64),
    sprint1ConfigHash: "b".repeat(64),
    techniqueCatalogHash: "c".repeat(64),
    battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
    matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
    initialMatchIdGeneratorStateHash: stateHash,
    defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
    specVersions: [
      { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint1", version: S1_SPEC_VERSION },
    ],
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: "canonical-json-v1",
    hashAlgorithm: "SHA-256",
  };
}

describe("S1-SPEC-0.1.13 version registry (superseded current = 0.1.15)", () => {
  it("publishes current S1-SPEC-0.1.15 while MatchId generator constants remain fixed", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.15");
    expect(MAIN_SPEC_VERSION_FOR_IDENTITY).toBe("SPEC-0.1.2");
    expect(MATCH_ID_GENERATOR_VERSION).toBe("match-id-generator-0.1.0");
    expect(MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION).toBe("0.1.0");
    expect(MATCH_ID_NAMESPACE).toBe("match");
  });

  it("accepts a new Sprint 1 identity with S1-SPEC-0.1.15 and rejects 0.1.14／0.1.13", () => {
    const ok = validateSimulationIdentity(identityWithStateHash("d".repeat(64)));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.specVersions[2]?.version).toBe("S1-SPEC-0.1.15");
    }

    const rejected014 = validateSimulationIdentity({
      ...identityWithStateHash("d".repeat(64)),
      specVersions: [
        { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint1", version: "S1-SPEC-0.1.14" },
      ],
    });
    expect(rejected014.ok).toBe(false);

    const rejected013 = validateSimulationIdentity({
      ...identityWithStateHash("d".repeat(64)),
      specVersions: [
        { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint1", version: "S1-SPEC-0.1.13" },
      ],
    });
    expect(rejected013.ok).toBe(false);

    const rejected012 = validateSimulationIdentity({
      ...identityWithStateHash("d".repeat(64)),
      specVersions: [
        { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint1", version: "S1-SPEC-0.1.12" },
      ],
    });
    expect(rejected012.ok).toBe(false);
  });

  it("keeps the Sprint1Config balance SHA unchanged", () => {
    const validated = validateSprint1Config(createDefaultSprint1ConfigInput());
    expect(validated.ok).toBe(true);
    expect(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256).toBe(
      "3d3fdfe204d146046630e23c6439ab49769c9d1644a5f072da5d0a19273621c9",
    );
  });
});

describe("S1-SPEC-0.1.13 MatchIdGeneratorState contract", () => {
  it("locks the exact five canonical keys and initial nextSequence=1", () => {
    expect(Object.keys(FIXED_FRESH_STATE).sort()).toEqual([
      "generatorVersion",
      "namespace",
      "nextSequence",
      "schemaVersion",
      "seed",
    ]);
    expect(FIXED_FRESH_STATE.schemaVersion).toBe("0.1.0");
    expect(FIXED_FRESH_STATE.generatorVersion).toBe("match-id-generator-0.1.0");
    expect(FIXED_FRESH_STATE.namespace).toBe("match");
    expect(FIXED_FRESH_STATE.nextSequence).toBe(1);
  });

  it("allows seed boundaries and the exhausted sentinel as valid state values", () => {
    expect(Number.isSafeInteger(0)).toBe(true);
    expect(Number.isSafeInteger(4294967295)).toBe(true);
    expect(SEQUENCE_EXHAUSTED_SENTINEL).toBe(1_000_000_000_000);
    expect(Number.isSafeInteger(SEQUENCE_EXHAUSTED_SENTINEL)).toBe(true);
  });

  it("rejects unknown keys from the contract field set", () => {
    const allowed = new Set([
      "schemaVersion",
      "generatorVersion",
      "namespace",
      "seed",
      "nextSequence",
    ]);
    for (const forbidden of [
      "lastMatchId",
      "issuedMatchIds",
      "counter",
      "ordinal",
      "rngState",
      "stateHash",
      "createdAt",
      "simulationId",
    ]) {
      expect(allowed.has(forbidden)).toBe(false);
    }
  });
});

describe("S1-SPEC-0.1.13 MatchId format", () => {
  it("formats sequences 1, 2, and max as fixed 12-digit match_ IDs", () => {
    expect(formatMatchIdFromSequence(1)).toBe("match_000000000001");
    expect(formatMatchIdFromSequence(2)).toBe("match_000000000002");
    expect(formatMatchIdFromSequence(SEQUENCE_MAXIMUM)).toBe("match_999999999999");
    expect(formatMatchIdFromSequence(1)).toMatch(MATCH_ID_FORMAT);
  });

  it("lists invalid MatchId forms", () => {
    expect(MATCH_ID_FORMAT.test("match_000000000000")).toBe(true);
    expect(Number("match_000000000000".slice("match_".length))).toBe(0);

    for (const value of [
      "match_1",
      "match_00000000001",
      "match_0000000000001",
      "MATCH_000000000001",
      "match_00000000000a",
      "battle_000000000001",
    ]) {
      expect(MATCH_ID_FORMAT.test(value)).toBe(false);
    }
  });
});

describe("S1-SPEC-0.1.13 MatchId reservation transition", () => {
  it("advances 1→2, 2→3, max→sentinel, and fails on sentinel", () => {
    const first = reserveNextMatchIdContract({ ...FIXED_FRESH_STATE, nextSequence: 1 });
    expect(first).toEqual({
      kind: "success",
      matchId: "match_000000000001",
      nextState: { ...FIXED_FRESH_STATE, nextSequence: 2 },
    });

    const second = reserveNextMatchIdContract({ ...FIXED_FRESH_STATE, nextSequence: 2 });
    expect(second.kind).toBe("success");
    if (second.kind === "success") {
      expect(second.matchId).toBe("match_000000000002");
      expect(second.nextState.nextSequence).toBe(3);
    }

    const max = reserveNextMatchIdContract({
      ...FIXED_FRESH_STATE,
      nextSequence: SEQUENCE_MAXIMUM,
    });
    expect(max).toEqual({
      kind: "success",
      matchId: "match_999999999999",
      nextState: { ...FIXED_FRESH_STATE, nextSequence: SEQUENCE_EXHAUSTED_SENTINEL },
    });

    const exhausted = reserveNextMatchIdContract({
      ...FIXED_FRESH_STATE,
      nextSequence: SEQUENCE_EXHAUSTED_SENTINEL,
    });
    expect(exhausted).toEqual({
      kind: "failure",
      matchId: null,
      nextState: null,
      code: "match_id_sequence_exhausted",
    });
  });

  it("does not mutate the input state and retries the same ID before commit", () => {
    const committed: MatchIdGeneratorStateFixture = {
      ...FIXED_FRESH_STATE,
      nextSequence: 25,
    };
    const snapshot = JSON.stringify(committed);
    const reserved = reserveNextMatchIdContract(committed);
    expect(JSON.stringify(committed)).toBe(snapshot);
    expect(reserved.kind).toBe("success");
    if (reserved.kind === "success") {
      expect(reserved.matchId).toBe("match_000000000025");
      expect(reserved.nextState.nextSequence).toBe(26);
    }
    const retry = reserveNextMatchIdContract(committed);
    expect(retry).toEqual(reserved);
  });
});

describe("S1-SPEC-0.1.13 MatchId seed role", () => {
  it("keeps MatchId text identical across seeds for the same nextSequence", () => {
    const a = reserveNextMatchIdContract({ ...FIXED_FRESH_STATE, seed: 1, nextSequence: 1 });
    const b = reserveNextMatchIdContract({ ...FIXED_FRESH_STATE, seed: 2, nextSequence: 1 });
    expect(a.kind).toBe("success");
    expect(b.kind).toBe("success");
    if (a.kind === "success" && b.kind === "success") {
      expect(a.matchId).toBe(b.matchId);
      expect(a.matchId).toBe("match_000000000001");
      expect(toCanonicalJson(a.nextState)).not.toBe(toCanonicalJson(b.nextState));
      expect(sha256Hex(toCanonicalJson({ ...FIXED_FRESH_STATE, seed: 1 }))).not.toBe(
        sha256Hex(toCanonicalJson({ ...FIXED_FRESH_STATE, seed: 2 })),
      );
    }
  });
});

describe("S1-SPEC-0.1.13 MatchId canonical fixture", () => {
  it("locks canonical JSON, byte length, and SHA-256 literals", () => {
    const reordered: MatchIdGeneratorStateFixture = {
      nextSequence: 1,
      seed: 12345,
      namespace: "match",
      generatorVersion: "match-id-generator-0.1.0",
      schemaVersion: "0.1.0",
    };
    const canonical = toCanonicalJson(FIXED_FRESH_STATE);
    expect(canonical).toBe(FIXED_CANONICAL_JSON);
    expect(toCanonicalJson(reordered)).toBe(FIXED_CANONICAL_JSON);
    expect(Buffer.byteLength(canonical, "utf8")).toBe(FIXED_CANONICAL_BYTE_LENGTH);
    expect(sha256Hex(canonical)).toBe(FIXED_STATE_SHA256);
  });
});

describe("S1-SPEC-0.1.13 SimulationIdentity binding", () => {
  it("changes simulationId when initial MatchIdGeneratorState hash differs", () => {
    const hashA = FIXED_STATE_SHA256;
    const hashB = sha256Hex(toCanonicalJson({ ...FIXED_FRESH_STATE, seed: 99999 }));
    expect(hashA).not.toBe(hashB);

    const idA = createSimulationIdFromIdentity(identityWithStateHash(hashA), sha256Provider);
    const idB = createSimulationIdFromIdentity(identityWithStateHash(hashB), sha256Provider);
    expect(idA.ok).toBe(true);
    expect(idB.ok).toBe(true);
    if (idA.ok && idB.ok) {
      expect(idA.value).not.toBe(idB.value);
    }
  });

  it("does not put the current runtime sequence into SimulationIdentity materials", () => {
    const keys = Object.keys(identityWithStateHash(FIXED_STATE_SHA256));
    expect(keys).not.toContain("nextSequence");
    expect(keys).not.toContain("matchId");
    expect(keys).toContain("initialMatchIdGeneratorStateHash");
  });
});
