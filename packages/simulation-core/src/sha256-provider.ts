import { toCanonicalJson } from "./canonical-json.js";
import type { InitialWorldConfig } from "./config/types.js";
import type { NameDataManifest } from "./names/types.js";

/**
 * Injected SHA-256 contract. Concrete Node crypto lives outside simulation-core.
 * Implementations must return a lowercase hex digest of the UTF-8 bytes of `utf8Text`.
 */
export interface Sha256Provider {
  hashUtf8(utf8Text: string): string;
}

export function computeConfigHash(config: InitialWorldConfig, provider: Sha256Provider): string {
  return provider.hashUtf8(toCanonicalJson(config));
}

export function computeNameDataHash(manifest: NameDataManifest, provider: Sha256Provider): string {
  return provider.hashUtf8(toCanonicalJson(manifest));
}
