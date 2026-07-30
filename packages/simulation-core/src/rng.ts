/**
 * Seeded RNG: xoshiro128ss-v1 (07 mini-spec).
 * Deterministic only; never uses host PRNG APIs, wall clock, or OS entropy.
 */

export const RNG_ALGORITHM_VERSION = "xoshiro128ss-v1" as const;

const UINT32_MAX = 4294967295;
const UINT32_RANGE = 4294967296;

export type SeededRngState = {
  algorithmVersion: typeof RNG_ALGORITHM_VERSION;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
};

export type SeededRng = {
  nextUint32(): number;
  nextFloat(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
  chance(probability: number): boolean;
  choose<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  sampleWithoutReplacement<T>(items: readonly T[], count: number): T[];
  exportState(): SeededRngState;
};

export type SeededRngFactory = (seed: number) => SeededRng;

export function createSeededRng(seed: number): SeededRng {
  assertSeed(seed);
  const [s0, s1, s2, s3] = initializeState(seed);
  return createRngFromState(s0, s1, s2, s3);
}

export function importSeededRng(state: SeededRngState): SeededRng {
  if (state.algorithmVersion !== RNG_ALGORITHM_VERSION) {
    throw new Error(
      `unsupported RNG algorithmVersion: ${state.algorithmVersion} (expected ${RNG_ALGORITHM_VERSION})`,
    );
  }
  assertUint32(state.s0, "s0");
  assertUint32(state.s1, "s1");
  assertUint32(state.s2, "s2");
  assertUint32(state.s3, "s3");
  if (state.s0 === 0 && state.s1 === 0 && state.s2 === 0 && state.s3 === 0) {
    throw new Error("RNG state must not be all zero");
  }
  return createRngFromState(state.s0, state.s1, state.s2, state.s3);
}

export function deriveSeed(parentSeed: number, label: string): number {
  assertSeed(parentSeed);
  assertAsciiLabel(label);

  let h = (parentSeed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < label.length; i += 1) {
    const codeUnit = label.charCodeAt(i);
    const low = codeUnit & 0xff;
    const high = (codeUnit >>> 8) & 0xff;
    h = Math.imul(h ^ low, 0x01000193) >>> 0;
    h = Math.imul(h ^ high, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function createRngFromState(
  initialS0: number,
  initialS1: number,
  initialS2: number,
  initialS3: number,
): SeededRng {
  let s0 = initialS0 >>> 0;
  let s1 = initialS1 >>> 0;
  let s2 = initialS2 >>> 0;
  let s3 = initialS3 >>> 0;

  function nextUint32(): number {
    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result;
  }

  function nextFloat(): number {
    return nextUint32() / UINT32_RANGE;
  }

  function nextInt(minInclusive: number, maxExclusive: number): number {
    assertSafeInteger(minInclusive, "minInclusive");
    assertSafeInteger(maxExclusive, "maxExclusive");
    if (!(minInclusive < maxExclusive)) {
      throw new Error(
        `nextInt requires minInclusive < maxExclusive (got ${String(minInclusive)}, ${String(maxExclusive)})`,
      );
    }

    const range = maxExclusive - minInclusive;
    if (!Number.isSafeInteger(range) || range <= 0 || range > UINT32_RANGE) {
      throw new Error(
        `nextInt range is not a safe positive integer within uint32 span: ${String(range)}`,
      );
    }

    // Rejection sampling avoids modulo bias.
    const bound = Math.floor(UINT32_RANGE / range) * range;
    let value = nextUint32();
    while (value >= bound) {
      value = nextUint32();
    }
    return minInclusive + (value % range);
  }

  function chance(probability: number): boolean {
    if (typeof probability !== "number" || !Number.isFinite(probability)) {
      throw new Error(`chance probability must be a finite number (got ${String(probability)})`);
    }
    if (probability < 0 || probability > 1) {
      throw new Error(`chance probability must be within 0..1 (got ${String(probability)})`);
    }
    if (probability === 0) {
      return false;
    }
    if (probability === 1) {
      return true;
    }
    return nextFloat() < probability;
  }

  function choose<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("choose requires a non-empty array");
    }
    return items[nextInt(0, items.length)]!;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = nextInt(0, i + 1);
      const tmp = result[i]!;
      result[i] = result[j]!;
      result[j] = tmp;
    }
    return result;
  }

  function sampleWithoutReplacement<T>(items: readonly T[], count: number): T[] {
    assertInteger(count, "count");
    if (count < 0 || count > items.length) {
      throw new Error(
        `sampleWithoutReplacement count must be within 0..${String(items.length)} (got ${String(count)})`,
      );
    }
    if (count === 0) {
      return [];
    }

    const working = items.slice();
    for (let i = 0; i < count; i += 1) {
      const j = nextInt(i, working.length);
      const tmp = working[i]!;
      working[i] = working[j]!;
      working[j] = tmp;
    }
    return working.slice(0, count);
  }

  function exportState(): SeededRngState {
    return {
      algorithmVersion: RNG_ALGORITHM_VERSION,
      s0,
      s1,
      s2,
      s3,
    };
  }

  return {
    nextUint32,
    nextFloat,
    nextInt,
    chance,
    choose,
    shuffle,
    sampleWithoutReplacement,
    exportState,
  };
}

function initializeState(seed: number): [number, number, number, number] {
  let state = seed >>> 0;
  const values: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    values.push((z ^ (z >>> 15)) >>> 0);
  }

  let s0 = values[0]!;
  const s1 = values[1]!;
  const s2 = values[2]!;
  const s3 = values[3]!;
  if (s0 === 0 && s1 === 0 && s2 === 0 && s3 === 0) {
    s0 = 0x9e3779b9;
  }
  return [s0, s1, s2, s3];
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

function assertSeed(seed: number): void {
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new Error(`seed must be an integer in 0..${String(UINT32_MAX)} (got ${String(seed)})`);
  }
}

function assertUint32(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new Error(`${name} must be a uint32 (got ${String(value)})`);
  }
}

function assertInteger(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer (got ${String(value)})`);
  }
}

function assertSafeInteger(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer (got ${String(value)})`);
  }
}

function assertAsciiLabel(label: string): void {
  if (typeof label !== "string" || label.length === 0) {
    throw new Error("deriveSeed label must be a non-empty ASCII string");
  }
  for (let i = 0; i < label.length; i += 1) {
    if (label.charCodeAt(i) > 0x7f) {
      throw new Error(`deriveSeed label must be ASCII (non-ASCII at index ${String(i)})`);
    }
  }
}
