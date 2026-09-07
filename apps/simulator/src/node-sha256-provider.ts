import { createHash } from "node:crypto";
import type { Sha256Provider, Sha256Utf8Hasher } from "@shared-world/simulation-core";

/**
 * Node.js `node:crypto` adapter for Sha256Provider.
 * Returns a lowercase hex digest of the UTF-8 bytes of `utf8Text`.
 */
export function createNodeSha256Provider(): Sha256Provider {
  return {
    hashUtf8(utf8Text: string): string {
      return createHash("sha256").update(utf8Text, "utf8").digest("hex");
    },
    createUtf8Hasher(): Sha256Utf8Hasher {
      const hash = createHash("sha256");
      return {
        update(utf8Text: string): void {
          hash.update(utf8Text, "utf8");
        },
        digestHex(): string {
          return hash.digest("hex");
        },
      };
    },
  };
}
