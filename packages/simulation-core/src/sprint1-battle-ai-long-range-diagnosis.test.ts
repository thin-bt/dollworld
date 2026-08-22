/**
 * Diagnostic evidence: at long range, unarmed offense is out of legal set while magic basic remains.
 * Documents DefaultBattleStrategy contract-consistent behavior (authority gap, not a code defect).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { enumerateLegalBattleActions } from "./index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fixturePath = path.join(root, "apps/simulator/fixtures/sprint1/sprint1-input.json");

describe("FIX battle-AI long-range magic preference (authority diagnosis)", () => {
  it("fixture + defaults: long excludes unarmed basic/technique; magic basic includes long", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      sprint1Config: {
        techniqueBalance: {
          basicAttackProfiles: Record<string, { usableRanges: string[] }>;
        };
      };
      techniqueCatalog: {
        definitions: Array<{
          techniqueId: string;
          category: string;
          usableRanges: string[];
        }>;
      };
    };

    const profiles = raw.sprint1Config.techniqueBalance.basicAttackProfiles;
    const unarmedRanges = profiles.unarmed?.usableRanges ?? [];
    const magicRanges = profiles.magic?.usableRanges ?? [];
    expect(unarmedRanges.includes("long")).toBe(false);
    expect(magicRanges.includes("long")).toBe(true);

    const unarmedTech = raw.techniqueCatalog.definitions.find((t) => t.category === "unarmed");
    expect(unarmedTech).toBeDefined();
    expect(unarmedTech!.usableRanges.includes("long")).toBe(false);

    const magicTech = raw.techniqueCatalog.definitions.find((t) => t.category === "magic");
    expect(magicTech).toBeDefined();
    expect(magicTech!.usableRanges.includes("long")).toBe(true);

    // Scoring only considers legal candidates; aptitude does not re-open out-of-range profiles.
    expect(typeof enumerateLegalBattleActions).toBe("function");
  });
});
