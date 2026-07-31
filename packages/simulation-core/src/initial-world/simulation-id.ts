import { asSimulationId } from "../ids.js";
import type { SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { S0_SPEC_VERSION, SIMULATION_SPEC_VERSION } from "./constants.js";
import { RNG_ALGORITHM_VERSION } from "../rng.js";

export function buildSimulationIdMaterial(
  configHash: string,
  seed: number,
  nameDataHash: string,
): string {
  return `${SIMULATION_SPEC_VERSION}|${S0_SPEC_VERSION}|${configHash}|${String(seed)}|${nameDataHash}|${RNG_ALGORITHM_VERSION}`;
}

export function createSimulationId(
  configHash: string,
  seed: number,
  nameDataHash: string,
  sha256Provider: Sha256Provider,
): SimulationId {
  const material = buildSimulationIdMaterial(configHash, seed, nameDataHash);
  const digest = sha256Provider.hashUtf8(material);
  const hex = digest.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(`SHA-256 digest must be 64 lowercase hex chars (got ${digest})`);
  }
  return asSimulationId(`simulation_${hex.slice(0, 16)}`);
}
