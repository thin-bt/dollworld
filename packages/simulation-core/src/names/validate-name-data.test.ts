import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  computeNameDataHash,
  toCanonicalJson,
  validateNameCandidateFile,
  validateNameData,
  type NameCandidateFile,
  type NameDataManifest,
  type Sha256Provider,
} from "../index.js";

function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(toCanonicalJson(value), "utf8").digest("hex");
}

function createCandidate(
  category: NameCandidateFile["category"],
  names: string[],
): NameCandidateFile {
  return {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-0.1.2",
    locale: "ja-JP",
    style: "common-western-fantasy",
    encoding: "UTF-8",
    notes: "fixture",
    category,
    count: names.length,
    names,
  };
}

function createManifest(
  files: {
    family: NameCandidateFile;
    male: NameCandidateFile;
    female: NameCandidateFile;
    neutral: NameCandidateFile;
  },
  sha256Provider: Sha256Provider = {
    hashUtf8(utf8Text: string): string {
      return createHash("sha256").update(utf8Text, "utf8").digest("hex");
    },
  },
): NameDataManifest {
  return {
    schemaVersion: "1.1.0",
    nameDataVersion: "NAMES-0.1.2",
    locale: "ja-JP",
    style: "common-western-fantasy",
    displayFormat: "{givenName}・{familyName}",
    files: {
      family: {
        path: "family-names.json",
        count: files.family.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(files.family)),
      },
      male: {
        path: "male-given-names.json",
        count: files.male.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(files.male)),
      },
      female: {
        path: "female-given-names.json",
        count: files.female.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(files.female)),
      },
      neutral: {
        path: "neutral-given-names.json",
        count: files.neutral.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(files.neutral)),
      },
    },
    selectionPolicy: {
      familyNames: "without replacement",
      givenNames: "sex pool with neutral probability",
      duplicateLivingFullNameWithinFamily: "deterministic scan",
      historicalReuse: "allowed when not overlapping living",
      rng: "seeded only",
    },
    hashAlgorithm: "sha256-canonical-json-v1",
  };
}

describe("validateNameData", () => {
  it("accepts a consistent manifest and candidate bundle", () => {
    const family = createCandidate("family_name", ["アッシュフォード", "ブレイヴウッド"]);
    const male = createCandidate("male_given_name", ["アーデン", "ケイン"]);
    const female = createCandidate("female_given_name", ["ブリン", "ダイン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });

    const result = validateNameData({
      manifest,
      familyNames: family,
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 2,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects count mismatches", () => {
    const family = createCandidate("family_name", ["アッシュフォード", "ブレイヴウッド"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });
    const brokenFamily = { ...family, count: 3 };

    const result = validateNameData({
      manifest,
      familyNames: brokenFamily,
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 1,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects duplicates, empty strings, and whitespace-padded names", () => {
    const familyDup = createCandidate("family_name", ["アッシュフォード", "アッシュフォード"]);
    expect(
      validateNameData({
        manifest: createManifest({
          family: createCandidate("family_name", ["アッシュフォード"]),
          male: createCandidate("male_given_name", ["アーデン"]),
          female: createCandidate("female_given_name", ["ブリン"]),
          neutral: createCandidate("neutral_given_name", ["レイン"]),
        }),
        familyNames: familyDup,
        maleGivenNames: createCandidate("male_given_name", ["アーデン"]),
        femaleGivenNames: createCandidate("female_given_name", ["ブリン"]),
        neutralGivenNames: createCandidate("neutral_given_name", ["レイン"]),
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);

    const empty = createCandidate("male_given_name", [""]);
    expect(
      validateNameData({
        manifest: createManifest({
          family: createCandidate("family_name", ["アッシュフォード"]),
          male: createCandidate("male_given_name", ["アーデン"]),
          female: createCandidate("female_given_name", ["ブリン"]),
          neutral: createCandidate("neutral_given_name", ["レイン"]),
        }),
        familyNames: createCandidate("family_name", ["アッシュフォード"]),
        maleGivenNames: empty,
        femaleGivenNames: createCandidate("female_given_name", ["ブリン"]),
        neutralGivenNames: createCandidate("neutral_given_name", ["レイン"]),
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);

    const padded = createCandidate("female_given_name", [" ブリン"]);
    expect(
      validateNameData({
        manifest: createManifest({
          family: createCandidate("family_name", ["アッシュフォード"]),
          male: createCandidate("male_given_name", ["アーデン"]),
          female: createCandidate("female_given_name", ["ブリン"]),
          neutral: createCandidate("neutral_given_name", ["レイン"]),
        }),
        familyNames: createCandidate("family_name", ["アッシュフォード"]),
        maleGivenNames: createCandidate("male_given_name", ["アーデン"]),
        femaleGivenNames: padded,
        neutralGivenNames: createCandidate("neutral_given_name", ["レイン"]),
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects incorrect candidate hashes", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });
    manifest.files.family.sha256 = "0".repeat(64);

    const result = validateNameData({
      manifest,
      familyNames: family,
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 1,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "/files/family/sha256")).toBe(true);
    }
  });

  it("rejects family/given name string overlaps", () => {
    const family = createCandidate("family_name", ["共通名"]);
    const male = createCandidate("male_given_name", ["共通名"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });

    const result = validateNameData({
      manifest,
      familyNames: family,
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 1,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });

    expect(result.ok).toBe(false);
  });

  it("passes canonical manifest JSON to Sha256Provider for nameDataHash", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });

    const seen: string[] = [];
    const stub: Sha256Provider = {
      hashUtf8(utf8Text: string): string {
        seen.push(utf8Text);
        return "b".repeat(64);
      },
    };

    const hash = computeNameDataHash(manifest, stub);
    expect(hash).toBe("b".repeat(64));
    expect(seen).toEqual([toCanonicalJson(manifest)]);
    expect(sha256Canonical(manifest)).toHaveLength(64);
  });

  it("rejects duplicate manifest candidate paths", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });
    manifest.files.male.path = manifest.files.family.path;

    const result = validateNameData({
      manifest,
      familyNames: family,
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 1,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unsafe candidate paths", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });
    manifest.files.family.path = "../family-names.json";

    const result = validateNameData({
      manifest,
      familyNames: family,
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 1,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects mismatched schemaVersion on manifest or candidates", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const badManifest = createManifest({ family, male, female, neutral });
    badManifest.schemaVersion = "1.0.0";
    expect(
      validateNameData({
        manifest: badManifest,
        familyNames: family,
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);

    const badCandidate = { ...family, schemaVersion: "1.1.0" };
    const manifest = createManifest({ family, male, female, neutral });
    expect(
      validateNameData({
        manifest,
        familyNames: badCandidate,
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects candidate locale, style, or nameDataVersion mismatches", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });

    expect(
      validateNameData({
        manifest,
        familyNames: { ...family, locale: "en-US" },
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);

    expect(
      validateNameData({
        manifest,
        familyNames: { ...family, style: "other" },
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);

    expect(
      validateNameData({
        manifest,
        familyNames: { ...family, nameDataVersion: "NAMES-0.0.0" },
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects non-UTF-8 encoding", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });

    expect(
      validateNameData({
        manifest,
        familyNames: { ...family, encoding: "UTF-16" as NameCandidateFile["encoding"] },
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: {
          hashUtf8(utf8Text: string): string {
            return createHash("sha256").update(utf8Text, "utf8").digest("hex");
          },
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects empty or whitespace-padded selectionPolicy strings", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const provider = {
      hashUtf8(utf8Text: string): string {
        return createHash("sha256").update(utf8Text, "utf8").digest("hex");
      },
    };

    const keys = [
      "familyNames",
      "givenNames",
      "duplicateLivingFullNameWithinFamily",
      "historicalReuse",
      "rng",
    ] as const;

    for (const key of keys) {
      const emptyManifest = createManifest({ family, male, female, neutral });
      emptyManifest.selectionPolicy[key] = "";
      expect(
        validateNameData({
          manifest: emptyManifest,
          familyNames: family,
          maleGivenNames: male,
          femaleGivenNames: female,
          neutralGivenNames: neutral,
          requiredVersion: "NAMES-0.1.2",
          initialFamilyCount: 1,
          sha256Provider: provider,
        }).ok,
      ).toBe(false);

      const paddedManifest = createManifest({ family, male, female, neutral });
      paddedManifest.selectionPolicy[key] = " padded ";
      expect(
        validateNameData({
          manifest: paddedManifest,
          familyNames: family,
          maleGivenNames: male,
          femaleGivenNames: female,
          neutralGivenNames: neutral,
          requiredVersion: "NAMES-0.1.2",
          initialFamilyCount: 1,
          sha256Provider: provider,
        }).ok,
      ).toBe(false);
    }

    const validManifest = createManifest({ family, male, female, neutral });
    expect(
      validateNameData({
        manifest: validManifest,
        familyNames: family,
        maleGivenNames: male,
        femaleGivenNames: female,
        neutralGivenNames: neutral,
        requiredVersion: "NAMES-0.1.2",
        initialFamilyCount: 1,
        sha256Provider: provider,
      }).ok,
    ).toBe(true);
  });

  it("rejects unknown categories with a structured ValidationIssue", () => {
    const result = validateNameCandidateFile({
      schemaVersion: "1.0.0",
      nameDataVersion: "NAMES-0.1.2",
      locale: "ja-JP",
      style: "common-western-fantasy",
      encoding: "UTF-8",
      notes: "fixture",
      category: "unknown_category",
      count: 1,
      names: ["Arden"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
      const categoryIssue = result.issues.find((issue) => issue.path === "/category");
      expect(categoryIssue).toBeDefined();
      expect(categoryIssue?.expected).toContain("family_name");
      expect(categoryIssue?.expected).toContain("male_given_name");
      expect(categoryIssue?.expected).toContain("female_given_name");
      expect(categoryIssue?.expected).toContain("neutral_given_name");
      expect(categoryIssue?.actual).toBe("unknown_category");
    }
  });

  it("rejects slot category mismatches without treating them as unknown categories", () => {
    const family = createCandidate("family_name", ["アッシュフォード"]);
    const male = createCandidate("male_given_name", ["アーデン"]);
    const female = createCandidate("female_given_name", ["ブリン"]);
    const neutral = createCandidate("neutral_given_name", ["レイン"]);
    const manifest = createManifest({ family, male, female, neutral });

    const result = validateNameData({
      manifest,
      familyNames: { ...family, category: "male_given_name" },
      maleGivenNames: male,
      femaleGivenNames: female,
      neutralGivenNames: neutral,
      requiredVersion: "NAMES-0.1.2",
      initialFamilyCount: 1,
      sha256Provider: {
        hashUtf8(utf8Text: string): string {
          return createHash("sha256").update(utf8Text, "utf8").digest("hex");
        },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const categoryIssues = result.issues.filter(
        (issue) => issue.path === "/familyNames/category",
      );
      expect(categoryIssues).toHaveLength(1);
      expect(categoryIssues[0]?.message).toContain("mismatch");
      expect(categoryIssues[0]?.expected).toBe("family_name");
    }
  });
});
