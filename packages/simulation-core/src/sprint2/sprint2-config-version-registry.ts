/**
 * Known Sprint2Config configVersion registry (G069 / S2-SPEC-0.2.2-draft §7).
 */
const REGISTRY = new Map<string, string>();

export function registerKnownSprint2ConfigVersion(
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

export function isKnownSprint2ConfigVersion(version: string): boolean {
  return REGISTRY.has(version);
}

export function getExpectedCanonicalJsonForSprint2ConfigVersion(
  version: string,
): string | undefined {
  return REGISTRY.get(version);
}
