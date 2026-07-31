import { WEIGHT_INTEGER_SCALE } from "./constants.js";

export function allocateByLargestRemainderOrdered<K extends string>(
  weights: Readonly<Record<K, number>>,
  targetCount: number,
  keyOrder: readonly K[],
): Record<K, number> {
  if (!Number.isInteger(targetCount) || targetCount < 0) {
    throw new Error(
      `allocateByLargestRemainderOrdered rejected invalid targetCount: ${String(targetCount)}`,
    );
  }

  if (keyOrder.length === 0) {
    throw new Error("allocateByLargestRemainderOrdered requires non-empty keyOrder");
  }

  const scaledWeights = {} as Record<K, number>;
  let weightSum = 0;
  for (const key of keyOrder) {
    const w = weights[key];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
      throw new Error(`allocateByLargestRemainderOrdered invalid weight for ${key}: ${String(w)}`);
    }
    const scaled = Math.round(w * WEIGHT_INTEGER_SCALE);
    scaledWeights[key] = scaled;
    weightSum += scaled;
  }

  if (weightSum <= 0) {
    throw new Error(
      `allocateByLargestRemainderOrdered rejected non-positive weightSum: ${String(weightSum)}`,
    );
  }

  const result = {} as Record<K, number>;
  for (const key of keyOrder) {
    result[key] = 0;
  }

  if (targetCount === 0) {
    return result;
  }

  const bases = {} as Record<K, number>;
  const remainders = {} as Record<K, number>;
  let allocated = 0;

  for (const key of keyOrder) {
    const weight = scaledWeights[key]!;
    bases[key] = Math.floor((weight * targetCount) / weightSum);
    remainders[key] = (weight * targetCount) % weightSum;
    result[key] = bases[key]!;
    allocated += bases[key]!;
  }

  let remaining = targetCount - allocated;
  const surplusOrder = [...keyOrder].sort((a, b) => {
    const remainderDiff = remainders[b]! - remainders[a]!;
    if (remainderDiff !== 0) {
      return remainderDiff;
    }
    return keyOrder.indexOf(a) - keyOrder.indexOf(b);
  });

  for (const key of surplusOrder) {
    if (remaining <= 0) {
      break;
    }
    result[key]! += 1;
    remaining -= 1;
  }

  return result;
}

export function expandAllocationToList<K extends string>(
  allocation: Readonly<Record<K, number>>,
  keyOrder: readonly K[],
): K[] {
  const list: K[] = [];
  for (const key of keyOrder) {
    const count = allocation[key] ?? 0;
    for (let i = 0; i < count; i += 1) {
      list.push(key);
    }
  }
  return list;
}
