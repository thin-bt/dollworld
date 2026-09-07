import { toCanonicalJson } from "./canonical-json.js";
import type { InitialWorldConfig } from "./config/types.js";
import type { NameDataManifest } from "./names/types.js";

/**
 * Incremental UTF-8 hasher for large canonical JSON payloads that must not be
 * materialized as a single JavaScript string.
 */
export interface Sha256Utf8Hasher {
  update(utf8Text: string): void;
  digestHex(): string;
}

/**
 * Injected SHA-256 contract. Concrete Node crypto lives outside simulation-core.
 * Implementations must return a lowercase hex digest of the UTF-8 bytes of `utf8Text`.
 */
export interface Sha256Provider {
  hashUtf8(utf8Text: string): string;
  createUtf8Hasher?(): Sha256Utf8Hasher;
}

export function computeConfigHash(config: InitialWorldConfig, provider: Sha256Provider): string {
  return provider.hashUtf8(toCanonicalJson(config));
}

export function computeNameDataHash(manifest: NameDataManifest, provider: Sha256Provider): string {
  return provider.hashUtf8(toCanonicalJson(manifest));
}
