import { createHash } from "node:crypto";
import type { Sha256Provider } from "@shared-world/simulation-core";

/**
 * Node.js `node:crypto` adapter for Sha256Provider.
 * Returns a lowercase hex digest of the UTF-8 bytes of `utf8Text`.
 */
export function createNodeSha256Provider(): Sha256Provider {
  return {
    hashUtf8(utf8Text: string): string {
      return createHash("sha256").update(utf8Text, "utf8").digest("hex");
    },
  };
}
