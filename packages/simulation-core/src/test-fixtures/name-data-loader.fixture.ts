import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sha256Provider, Sha256Utf8Hasher, ValidatedNameData } from "../index.js";
import { toCanonicalJson, validateNameData } from "../index.js";

export function createNodeSha256Hasher(): Sha256Utf8Hasher {
  const hash = createHash("sha256");
  return {
    update(utf8Text: string): void {
      hash.update(utf8Text, "utf8");
    },
    digestHex(): string {
      return hash.digest("hex");
    },
  };
}

export function createNodeSha256Provider(): Sha256Provider {
  return {
    hashUtf8(utf8Text: string): string {
      return createHash("sha256").update(utf8Text, "utf8").digest("hex");
    },
    createUtf8Hasher(): Sha256Utf8Hasher {
      return createNodeSha256Hasher();
    },
  };
}

function repoRootFromModuleUrl(moduleUrl: string): string {
  return join(dirname(fileURLToPath(moduleUrl)), "../../../..");
}

function readJson(relativePath: string, moduleUrl: string): unknown {
  const absolutePath = join(repoRootFromModuleUrl(moduleUrl), relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
}

export function loadBaselineNameData(moduleUrl: string): ValidatedNameData {
  const sha256Provider = createNodeSha256Provider();
  const manifest = readJson("data/names/name-data.manifest.json", moduleUrl);
  const familyNames = readJson("data/names/family-names.json", moduleUrl);
  const maleGivenNames = readJson("data/names/male-given-names.json", moduleUrl);
  const femaleGivenNames = readJson("data/names/female-given-names.json", moduleUrl);
  const neutralGivenNames = readJson("data/names/neutral-given-names.json", moduleUrl);

  const result = validateNameData({
    manifest,
    familyNames,
    maleGivenNames,
    femaleGivenNames,
    neutralGivenNames,
    requiredVersion: "NAMES-0.1.2",
    initialFamilyCount: 100,
    sha256Provider,
  });

  if (!result.ok) {
    throw new Error(`validateNameData failed: ${JSON.stringify(result.issues)}`);
  }

  return result.value;
}

export function createTinyNameData(familyNameCount: number): ValidatedNameData {
  const sha256Provider = createNodeSha256Provider();

  const familyNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "family_name" as const,
    count: familyNameCount,
    names: Array.from({ length: familyNameCount }, (_, i) => `Family${String(i + 1)}`),
  };

  const maleGivenNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "male_given_name" as const,
    count: 20,
    names: Array.from({ length: 20 }, (_, i) => `Male${String(i + 1)}`),
  };

  const femaleGivenNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "female_given_name" as const,
    count: 20,
    names: Array.from({ length: 20 }, (_, i) => `Female${String(i + 1)}`),
  };

  const neutralGivenNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "neutral_given_name" as const,
    count: 10,
    names: Array.from({ length: 10 }, (_, i) => `Neutral${String(i + 1)}`),
  };

  const manifest = {
    schemaVersion: "1.1.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    displayFormat: "{givenName}・{familyName}" as const,
    files: {
      family: {
        path: "family-names.json",
        count: familyNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(familyNames)),
      },
      male: {
        path: "male-given-names.json",
        count: maleGivenNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(maleGivenNames)),
      },
      female: {
        path: "female-given-names.json",
        count: femaleGivenNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(femaleGivenNames)),
      },
      neutral: {
        path: "neutral-given-names.json",
        count: neutralGivenNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(neutralGivenNames)),
      },
    },
    selectionPolicy: {
      familyNames: "without replacement",
      givenNames: "sex pool with neutral probability",
      duplicateLivingFullNameWithinFamily: "deterministic scan",
      historicalReuse: "allowed when not overlapping living",
      rng: "seeded only",
    },
    hashAlgorithm: "sha256-canonical-json-v1" as const,
  };

  const result = validateNameData({
    manifest,
    familyNames,
    maleGivenNames,
    femaleGivenNames,
    neutralGivenNames,
    requiredVersion: "NAMES-TEST-0.0.1",
    initialFamilyCount: 2,
    sha256Provider,
  });

  if (!result.ok) {
    throw new Error(`createTinyNameData validation failed: ${JSON.stringify(result.issues)}`);
  }

  return result.value;
}
