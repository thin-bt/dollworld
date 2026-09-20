/**
 * Known Sprint3Config configVersion registry (S3-SPEC-0.3.0-draft §1).
 */
const REGISTRY = new Map<string, string>();

export function registerKnownSprint3ConfigVersion(
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

export function isKnownSprint3ConfigVersion(version: string): boolean {
  return REGISTRY.has(version);
}

export function getExpectedCanonicalJsonForSprint3ConfigVersion(
  version: string,
): string | undefined {
  return REGISTRY.get(version);
}
