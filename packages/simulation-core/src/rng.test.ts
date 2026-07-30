import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createSeededRng, deriveSeed, importSeededRng, RNG_ALGORITHM_VERSION } from "./rng.js";

const GOLDEN_SEED = 12345;
const GOLDEN_INITIAL_STATE = [3283241497, 613117429, 2940958500, 516375437] as const;
const GOLDEN_SEQUENCE = [
  1093274547, 203003357, 3741353573, 3803725158, 4178738660, 810247443, 1347789520, 4037788777,
  3729597786, 3845877672,
] as const;

describe("xoshiro128ss-v1 seeded RNG", () => {
  it("matches golden initial state and first 10 nextUint32 values for seed 12345", () => {
    const rng = createSeededRng(GOLDEN_SEED);
    expect(rng.exportState()).toEqual({
      algorithmVersion: RNG_ALGORITHM_VERSION,
      s0: GOLDEN_INITIAL_STATE[0],
      s1: GOLDEN_INITIAL_STATE[1],
      s2: GOLDEN_INITIAL_STATE[2],
      s3: GOLDEN_INITIAL_STATE[3],
    });

    const values = Array.from({ length: 10 }, () => rng.nextUint32());
    expect(values).toEqual([...GOLDEN_SEQUENCE]);
  });

  it("accepts boundary seeds 0, 1, and 4294967295", () => {
    expect(() => createSeededRng(0)).not.toThrow();
    expect(() => createSeededRng(1)).not.toThrow();
    expect(() => createSeededRng(4294967295)).not.toThrow();
    expect(createSeededRng(0).nextUint32()).toBeTypeOf("number");
  });

  it("rejects out-of-range and non-integer seeds", () => {
    expect(() => createSeededRng(-1)).toThrow(/seed/);
    expect(() => createSeededRng(4294967296)).toThrow(/seed/);
    expect(() => createSeededRng(1.5)).toThrow(/seed/);
    expect(() => createSeededRng(Number.NaN)).toThrow(/seed/);
    expect(() => createSeededRng(Number.POSITIVE_INFINITY)).toThrow(/seed/);
  });

  it("returns identical sequences for the same seed and call order", () => {
    const a = createSeededRng(99);
    const b = createSeededRng(99);
    const opsA = [
      a.nextUint32(),
      a.nextFloat(),
      a.nextInt(3, 10),
      a.chance(0.4),
      a.choose(["x", "y", "z"]),
      a.shuffle([1, 2, 3, 4]),
      a.sampleWithoutReplacement(["a", "b", "c", "d"], 2),
    ];
    const opsB = [
      b.nextUint32(),
      b.nextFloat(),
      b.nextInt(3, 10),
      b.chance(0.4),
      b.choose(["x", "y", "z"]),
      b.shuffle([1, 2, 3, 4]),
      b.sampleWithoutReplacement(["a", "b", "c", "d"], 2),
    ];
    expect(opsA).toEqual(opsB);
  });

  it("produces different leading sequences for different seeds", () => {
    const rngA = createSeededRng(1);
    const rngB = createSeededRng(2);
    const seqA = Array.from({ length: 5 }, () => rngA.nextUint32());
    const seqB = Array.from({ length: 5 }, () => rngB.nextUint32());
    expect(seqA).not.toEqual(seqB);
  });

  it("keeps nextFloat in [0, 1)", () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("honors nextInt safe-integer boundaries and rejects unsafe bounds", () => {
    const rng = createSeededRng(7);
    expect(() => rng.nextInt(5, 5)).toThrow(/minInclusive/);
    expect(() => rng.nextInt(5, 4)).toThrow(/minInclusive/);
    expect(() => rng.nextInt(1.5, 3)).toThrow(/safe integer/);
    expect(() => rng.nextInt(Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2)).toThrow(
      /safe integer/,
    );
    expect(() => rng.nextInt(Number.MIN_SAFE_INTEGER - 1, 0)).toThrow(/safe integer/);

    for (let i = 0; i < 200; i += 1) {
      const value = rng.nextInt(-2, 3);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThan(3);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("rejects one uint32 during nextInt rejection sampling for range 3", () => {
    const rejectionState = {
      algorithmVersion: RNG_ALGORITHM_VERSION,
      s0: 1,
      s1: 0x831c71c7,
      s2: 0,
      s3: 0,
    } as const;

    const rngA = importSeededRng(rejectionState);
    const rngB = importSeededRng(rejectionState);

    const sampled = rngA.nextInt(0, 3);
    expect(sampled).toBeGreaterThanOrEqual(0);
    expect(sampled).toBeLessThan(3);

    const first = rngB.nextUint32();
    const second = rngB.nextUint32();
    expect(first).toBe(0xffffffff);
    expect(rngA.exportState()).toEqual(rngB.exportState());
    expect(sampled).toBe(second % 3);
  });

  it("validates chance boundaries and invalid probabilities", () => {
    const rng = createSeededRng(21);
    const beforeZero = rng.exportState();
    expect(rng.chance(0)).toBe(false);
    expect(rng.exportState()).toEqual(beforeZero);

    const beforeOne = rng.exportState();
    expect(rng.chance(1)).toBe(true);
    expect(rng.exportState()).toEqual(beforeOne);

    expect(() => rng.chance(-0.1)).toThrow(/0\.\.1/);
    expect(() => rng.chance(1.1)).toThrow(/0\.\.1/);
    expect(() => rng.chance(Number.NaN)).toThrow(/finite/);
    expect(() => rng.chance(Number.POSITIVE_INFINITY)).toThrow(/finite/);

    const mid = createSeededRng(21);
    const probe = createSeededRng(21);
    const probability = 0.35;
    const observed = mid.chance(probability);
    expect(observed).toBe(probe.nextFloat() < probability);
    expect(mid.exportState()).toEqual(probe.exportState());
  });

  it("rejects invalid imported RNG states", () => {
    expect(() =>
      importSeededRng({
        algorithmVersion: RNG_ALGORITHM_VERSION,
        s0: 0,
        s1: 0,
        s2: 0,
        s3: 0,
      }),
    ).toThrow(/all zero/);

    expect(() =>
      importSeededRng({
        algorithmVersion: "other-rng",
        s0: 1,
        s1: 2,
        s2: 3,
        s3: 4,
      } as unknown as Parameters<typeof importSeededRng>[0]),
    ).toThrow(/algorithmVersion/);

    expect(() =>
      importSeededRng({
        algorithmVersion: RNG_ALGORITHM_VERSION,
        s0: 1.5,
        s1: 2,
        s2: 3,
        s3: 4,
      }),
    ).toThrow(/uint32/);

    expect(() =>
      importSeededRng({
        algorithmVersion: RNG_ALGORITHM_VERSION,
        s0: -1,
        s1: 2,
        s2: 3,
        s3: 4,
      }),
    ).toThrow(/uint32/);

    const valid = createSeededRng(55);
    valid.nextUint32();
    const snapshot = valid.exportState();
    const restored = importSeededRng(snapshot);
    expect(restored.nextUint32()).toBe(valid.nextUint32());
  });

  it("rejects choose on an empty array", () => {
    const rng = createSeededRng(1);
    expect(() => rng.choose([])).toThrow(/non-empty/);
  });

  it("does not mutate the input array in shuffle", () => {
    const rng = createSeededRng(11);
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    const shuffled = rng.shuffle(input);
    expect(input).toEqual(snapshot);
    expect(shuffled).not.toBe(input);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(snapshot);
  });

  it("samples without replacement for the requested count and preserves multiset possibility", () => {
    const rng = createSeededRng(13);
    const items = ["a", "b", "b", "c"];
    const original = [...items];
    expect(rng.sampleWithoutReplacement(items, 0)).toEqual([]);
    expect(items).toEqual(original);

    const sample = rng.sampleWithoutReplacement(items, 3);
    expect(sample).toHaveLength(3);
    expect(items).toEqual(original);

    // Selected values must come from the original multiset without inventing entries.
    const remaining = [...items];
    for (const value of sample) {
      const index = remaining.indexOf(value);
      expect(index).toBeGreaterThanOrEqual(0);
      remaining.splice(index, 1);
    }

    expect(() => rng.sampleWithoutReplacement(items, -1)).toThrow(/count/);
    expect(() => rng.sampleWithoutReplacement(items, 5)).toThrow(/count/);
  });

  it("matches golden deriveSeed values", () => {
    expect(deriveSeed(12345, "initial-world")).toBe(1072236765);
    expect(deriveSeed(12345, "names/family")).toBe(3916266897);
  });

  it("restores the same sequence after export/import", () => {
    const original = createSeededRng(55);
    original.nextUint32();
    original.nextInt(0, 10);
    const snapshot = original.exportState();
    const continued = Array.from({ length: 8 }, () => original.nextUint32());

    const restored = importSeededRng(snapshot);
    const restoredValues = Array.from({ length: 8 }, () => restored.nextUint32());
    expect(restoredValues).toEqual(continued);
    expect(snapshot.algorithmVersion).toBe(RNG_ALGORITHM_VERSION);
  });

  it("does not reference Math.random in the RNG source", () => {
    const sourcePath = join(dirname(fileURLToPath(import.meta.url)), "rng.ts");
    const source = readFileSync(sourcePath, "utf8");
    expect(source.includes("Math.random")).toBe(false);
  });
});
