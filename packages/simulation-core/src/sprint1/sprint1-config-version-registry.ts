/**
 * Known Sprint1Config configVersion registry (14 mini-spec §1.1 / §1.2 / §8).
 *
 * Each registered configVersion maps to exactly one immutable canonical JSON body
 * captured at registration time. Lookup never re-runs a factory.
 * Changing balance content requires a new configVersion entry.
 *
 * Version → expected canonical JSON is defined only through this registry
 * (no duplicated hash tables elsewhere). `registerKnownSprint1ConfigVersion` is
 * module-internal (not re-exported from the package public API).
 */
import { SPRINT1_CONFIG_VERSION_DEFAULT } from "./constants.js";

const REGISTRY = new Map<string, string>();

/**
 * Register a known configVersion with its already-computed expected canonical JSON.
 * Rejects duplicate registration of the same version.
 */
export function registerKnownSprint1ConfigVersion(
  version: string,
  expectedCanonicalJson: string,
): void {
  if (REGISTRY.has(version)) {
    throw new Error(`configVersion already registered: ${version}`);
  }
  if (typeof expectedCanonicalJson !== "string" || expectedCanonicalJson.length === 0) {
    throw new Error(`expected canonical JSON for ${version} must be a non-empty string`);
  }
  REGISTRY.set(version, expectedCanonicalJson);
}

export function listKnownSprint1ConfigVersions(): readonly string[] {
  return Object.freeze([...REGISTRY.keys()]);
}

export function isKnownSprint1ConfigVersion(version: string): boolean {
  return REGISTRY.has(version);
}

/**
 * Returns the expected canonical JSON for a known configVersion, or `undefined`
 * when the version is not in the registry. The returned string is the value
 * fixed at registration time (no factory re-execution).
 */
export function getExpectedCanonicalJsonForConfigVersion(version: string): string | undefined {
  return REGISTRY.get(version);
}

/** Documented initial version; registration of its body happens in validate-sprint1-config. */
export const INITIAL_SPRINT1_CONFIG_VERSION: typeof SPRINT1_CONFIG_VERSION_DEFAULT =
  SPRINT1_CONFIG_VERSION_DEFAULT;
