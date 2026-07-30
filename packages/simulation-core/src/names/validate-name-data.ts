import { toCanonicalJson } from "../canonical-json.js";
import { isSafeRelativePosixPath } from "../paths.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success, type ValidationIssue, type ValidationResult } from "../validation.js";
import type {
  NameCandidateCategory,
  NameCandidateFile,
  NameDataManifest,
  NameDataManifestFiles,
  NameDataSelectionPolicy,
  NameManifestFileEntry,
  ValidatedNameData,
} from "./types.js";

const MANIFEST_SCHEMA_VERSION = "1.1.0";
const CANDIDATE_SCHEMA_VERSION = "1.0.0";
const REQUIRED_ENCODING = "UTF-8";

const MANIFEST_KEYS = [
  "schemaVersion",
  "nameDataVersion",
  "locale",
  "style",
  "displayFormat",
  "files",
  "selectionPolicy",
  "hashAlgorithm",
] as const;

const MANIFEST_FILE_KEYS = ["family", "male", "female", "neutral"] as const;

const MANIFEST_FILE_ENTRY_KEYS = ["path", "count", "sha256"] as const;

const SELECTION_POLICY_KEYS = [
  "familyNames",
  "givenNames",
  "duplicateLivingFullNameWithinFamily",
  "historicalReuse",
  "rng",
] as const;

const CANDIDATE_FILE_KEYS = [
  "schemaVersion",
  "nameDataVersion",
  "locale",
  "style",
  "encoding",
  "notes",
  "category",
  "count",
  "names",
] as const;

export type ValidateNameDataInput = {
  manifest: unknown;
  familyNames: unknown;
  maleGivenNames: unknown;
  femaleGivenNames: unknown;
  neutralGivenNames: unknown;
  requiredVersion: string;
  initialFamilyCount: number;
  sha256Provider: Sha256Provider;
};

export function validateNameCandidateFile(
  input: unknown,
  expectedCategory?: NameCandidateCategory,
): ValidationResult<NameCandidateFile> {
  const issues: ValidationIssue[] = [];
  const parsed = parseCandidateFile(input, "", expectedCategory, issues);
  if (parsed === undefined || issues.length > 0) {
    return failure(issues);
  }
  return success(parsed);
}

export function validateNameDataManifest(input: unknown): ValidationResult<NameDataManifest> {
  const issues: ValidationIssue[] = [];
  const parsed = parseManifest(input, issues);
  if (parsed === undefined || issues.length > 0) {
    return failure(issues);
  }
  return success(parsed);
}

export function validateNameData(
  input: ValidateNameDataInput,
): ValidationResult<ValidatedNameData> {
  const issues: ValidationIssue[] = [];

  const manifest = parseManifest(input.manifest, issues);
  const familyNames = parseCandidateFile(input.familyNames, "/familyNames", "family_name", issues);
  const maleGivenNames = parseCandidateFile(
    input.maleGivenNames,
    "/maleGivenNames",
    "male_given_name",
    issues,
  );
  const femaleGivenNames = parseCandidateFile(
    input.femaleGivenNames,
    "/femaleGivenNames",
    "female_given_name",
    issues,
  );
  const neutralGivenNames = parseCandidateFile(
    input.neutralGivenNames,
    "/neutralGivenNames",
    "neutral_given_name",
    issues,
  );

  if (
    manifest === undefined ||
    familyNames === undefined ||
    maleGivenNames === undefined ||
    femaleGivenNames === undefined ||
    neutralGivenNames === undefined
  ) {
    return failure(issues);
  }

  if (manifest.nameDataVersion !== input.requiredVersion) {
    issues.push({
      path: "/nameDataVersion",
      message: "manifest nameDataVersion must match requiredVersion",
      actual: manifest.nameDataVersion,
      expected: input.requiredVersion,
    });
  }

  if (familyNames.count < input.initialFamilyCount) {
    issues.push({
      path: "/familyNames/count",
      message: "family name candidate count must be >= initialFamilyCount",
      actual: familyNames.count,
      expected: `>= ${String(input.initialFamilyCount)}`,
    });
  }

  const loaded = {
    family: familyNames,
    male: maleGivenNames,
    female: femaleGivenNames,
    neutral: neutralGivenNames,
  } as const;

  for (const slot of MANIFEST_FILE_KEYS) {
    const entry = manifest.files[slot];
    const file = loaded[slot];
    if (file.count !== entry.count) {
      issues.push({
        path: `/files/${slot}/count`,
        message: "manifest count must match candidate file count",
        actual: { manifestCount: entry.count, fileCount: file.count },
        expected: "equal counts",
      });
    }

    const digest = input.sha256Provider.hashUtf8(toCanonicalJson(file));
    if (digest !== entry.sha256) {
      issues.push({
        path: `/files/${slot}/sha256`,
        message: "candidate file canonical SHA-256 must match manifest",
        actual: digest,
        expected: entry.sha256,
      });
    }

    if (file.nameDataVersion !== manifest.nameDataVersion) {
      issues.push({
        path: `/${slot}/nameDataVersion`,
        message: "candidate file nameDataVersion must match manifest",
        actual: file.nameDataVersion,
        expected: manifest.nameDataVersion,
      });
    }

    if (file.locale !== manifest.locale) {
      issues.push({
        path: `/${slot}/locale`,
        message: "candidate file locale must match manifest",
        actual: file.locale,
        expected: manifest.locale,
      });
    }

    if (file.style !== manifest.style) {
      issues.push({
        path: `/${slot}/style`,
        message: "candidate file style must match manifest",
        actual: file.style,
        expected: manifest.style,
      });
    }
  }

  assertNoFamilyGivenOverlap(
    familyNames.names,
    [maleGivenNames.names, femaleGivenNames.names, neutralGivenNames.names],
    issues,
  );

  if (issues.length > 0) {
    return failure(issues);
  }

  return success({
    manifest,
    familyNames,
    maleGivenNames,
    femaleGivenNames,
    neutralGivenNames,
  });
}

function parseManifest(input: unknown, issues: ValidationIssue[]): NameDataManifest | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      path: "",
      message: "manifest must be an object",
      actual: input,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(input, MANIFEST_KEYS, "", issues);

  const schemaVersion = requireNonEmptyTrimmedString(input, "schemaVersion", "", issues);
  if (schemaVersion !== undefined && schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "manifest schemaVersion must equal 1.1.0",
      actual: schemaVersion,
      expected: MANIFEST_SCHEMA_VERSION,
    });
  }
  const nameDataVersion = requireNonEmptyTrimmedString(input, "nameDataVersion", "", issues);
  const locale = requireNonEmptyTrimmedString(input, "locale", "", issues);
  const style = requireNonEmptyTrimmedString(input, "style", "", issues);
  const displayFormat = requireString(input, "displayFormat", "", issues);
  const hashAlgorithm = requireString(input, "hashAlgorithm", "", issues);
  const files = parseManifestFiles(input["files"], issues);
  const selectionPolicy = parseSelectionPolicy(input["selectionPolicy"], issues);

  if (displayFormat !== undefined && displayFormat !== "{givenName}・{familyName}") {
    issues.push({
      path: "/displayFormat",
      message: "displayFormat must be {givenName}・{familyName}",
      actual: displayFormat,
      expected: "{givenName}・{familyName}",
    });
  }

  if (hashAlgorithm !== undefined && hashAlgorithm !== "sha256-canonical-json-v1") {
    issues.push({
      path: "/hashAlgorithm",
      message: "hashAlgorithm must be sha256-canonical-json-v1",
      actual: hashAlgorithm,
      expected: "sha256-canonical-json-v1",
    });
  }

  if (
    schemaVersion !== MANIFEST_SCHEMA_VERSION ||
    nameDataVersion === undefined ||
    locale === undefined ||
    style === undefined ||
    displayFormat !== "{givenName}・{familyName}" ||
    hashAlgorithm !== "sha256-canonical-json-v1" ||
    files === undefined ||
    selectionPolicy === undefined
  ) {
    return undefined;
  }

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    nameDataVersion,
    locale,
    style,
    displayFormat: "{givenName}・{familyName}",
    files,
    selectionPolicy,
    hashAlgorithm: "sha256-canonical-json-v1",
  };
}

function parseManifestFiles(
  value: unknown,
  issues: ValidationIssue[],
): NameDataManifestFiles | undefined {
  const path = "/files";
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "files must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, MANIFEST_FILE_KEYS, path, issues);

  const family = parseManifestFileEntry(value["family"], `${path}/family`, issues);
  const male = parseManifestFileEntry(value["male"], `${path}/male`, issues);
  const female = parseManifestFileEntry(value["female"], `${path}/female`, issues);
  const neutral = parseManifestFileEntry(value["neutral"], `${path}/neutral`, issues);

  if (family === undefined || male === undefined || female === undefined || neutral === undefined) {
    return undefined;
  }

  const paths = [family.path, male.path, female.path, neutral.path];
  if (new Set(paths).size !== paths.length) {
    issues.push({
      path: "/files",
      message: "manifest candidate file paths must be unique",
      actual: paths,
      expected: "4 distinct relative paths",
    });
    return undefined;
  }

  return { family, male, female, neutral };
}

function parseManifestFileEntry(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): NameManifestFileEntry | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "file entry must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, MANIFEST_FILE_ENTRY_KEYS, path, issues);
  const entryPath = requireNonEmptyTrimmedString(value, "path", path, issues);
  if (entryPath !== undefined && !isSafeRelativePosixPath(entryPath)) {
    issues.push({
      path: `${path}/path`,
      message: "candidate path must be a safe repository-relative POSIX path",
      actual: entryPath,
      expected: "relative POSIX path without . / .. / absolute / drive / backslash",
    });
  }
  const count = requireIntegerAtLeast(value, "count", path, 1, issues);
  const sha256 = requireNonEmptyTrimmedString(value, "sha256", path, issues);

  if (sha256 !== undefined && !/^[0-9a-f]{64}$/.test(sha256)) {
    issues.push({
      path: `${path}/sha256`,
      message: "sha256 must be 64 lowercase hex characters",
      actual: sha256,
      expected: "/^[0-9a-f]{64}$/",
    });
  }

  if (
    entryPath === undefined ||
    count === undefined ||
    sha256 === undefined ||
    !/^[0-9a-f]{64}$/.test(sha256) ||
    !isSafeRelativePosixPath(entryPath)
  ) {
    return undefined;
  }

  return { path: entryPath, count, sha256 };
}

function parseSelectionPolicy(
  value: unknown,
  issues: ValidationIssue[],
): NameDataSelectionPolicy | undefined {
  const path = "/selectionPolicy";
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "selectionPolicy must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, SELECTION_POLICY_KEYS, path, issues);

  const familyNames = requireNonEmptyTrimmedString(value, "familyNames", path, issues);
  const givenNames = requireNonEmptyTrimmedString(value, "givenNames", path, issues);
  const duplicateLivingFullNameWithinFamily = requireNonEmptyTrimmedString(
    value,
    "duplicateLivingFullNameWithinFamily",
    path,
    issues,
  );
  const historicalReuse = requireNonEmptyTrimmedString(value, "historicalReuse", path, issues);
  const rng = requireNonEmptyTrimmedString(value, "rng", path, issues);

  if (
    familyNames === undefined ||
    givenNames === undefined ||
    duplicateLivingFullNameWithinFamily === undefined ||
    historicalReuse === undefined ||
    rng === undefined
  ) {
    return undefined;
  }

  return {
    familyNames,
    givenNames,
    duplicateLivingFullNameWithinFamily,
    historicalReuse,
    rng,
  };
}

function parseCandidateFile(
  input: unknown,
  pathPrefix: string,
  expectedCategory: NameCandidateCategory | undefined,
  issues: ValidationIssue[],
): NameCandidateFile | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      path: pathPrefix,
      message: "candidate file must be an object",
      actual: input,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(input, CANDIDATE_FILE_KEYS, pathPrefix, issues);

  const schemaVersion = requireNonEmptyTrimmedString(input, "schemaVersion", pathPrefix, issues);
  if (schemaVersion !== undefined && schemaVersion !== CANDIDATE_SCHEMA_VERSION) {
    issues.push({
      path: `${pathPrefix}/schemaVersion`,
      message: "candidate schemaVersion must equal 1.0.0",
      actual: schemaVersion,
      expected: CANDIDATE_SCHEMA_VERSION,
    });
  }
  const nameDataVersion = requireNonEmptyTrimmedString(
    input,
    "nameDataVersion",
    pathPrefix,
    issues,
  );
  const locale = requireNonEmptyTrimmedString(input, "locale", pathPrefix, issues);
  const style = requireNonEmptyTrimmedString(input, "style", pathPrefix, issues);
  const encoding = requireNonEmptyTrimmedString(input, "encoding", pathPrefix, issues);
  if (encoding !== undefined && encoding !== REQUIRED_ENCODING) {
    issues.push({
      path: `${pathPrefix}/encoding`,
      message: "encoding must be UTF-8",
      actual: encoding,
      expected: REQUIRED_ENCODING,
    });
  }
  const notes = requireNonEmptyTrimmedString(input, "notes", pathPrefix, issues);
  const category = requireNonEmptyTrimmedString(input, "category", pathPrefix, issues);
  const count = requireIntegerAtLeast(input, "count", pathPrefix, 1, issues);
  const names = parseNamesArray(input["names"], `${pathPrefix}/names`, issues);

  if (category !== undefined) {
    if (!isNameCandidateCategory(category)) {
      issues.push({
        path: `${pathPrefix}/category`,
        message: "category is not an allowed NameCandidateCategory",
        actual: category,
        expected: "family_name, male_given_name, female_given_name, neutral_given_name",
      });
    } else if (expectedCategory !== undefined && category !== expectedCategory) {
      issues.push({
        path: `${pathPrefix}/category`,
        message: "candidate category mismatch",
        actual: category,
        expected: expectedCategory,
      });
    }
  }

  if (count !== undefined && names !== undefined && count !== names.length) {
    issues.push({
      path: `${pathPrefix}/count`,
      message: "count must equal names array length",
      actual: { count, length: names.length },
      expected: "count === names.length",
    });
  }

  if (names !== undefined && names.length < 1) {
    issues.push({
      path: `${pathPrefix}/names`,
      message: "names must contain at least one entry",
      actual: names.length,
      expected: ">= 1",
    });
  }

  if (
    schemaVersion !== CANDIDATE_SCHEMA_VERSION ||
    nameDataVersion === undefined ||
    locale === undefined ||
    style === undefined ||
    encoding !== REQUIRED_ENCODING ||
    notes === undefined ||
    category === undefined ||
    count === undefined ||
    names === undefined ||
    names.length < 1 ||
    count !== names.length ||
    (expectedCategory !== undefined && category !== expectedCategory) ||
    !isNameCandidateCategory(category)
  ) {
    return undefined;
  }

  return {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    nameDataVersion,
    locale,
    style,
    encoding: REQUIRED_ENCODING,
    notes,
    category,
    count,
    names,
  };
}

function parseNamesArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] | undefined {
  if (!Array.isArray(value)) {
    issues.push({
      path,
      message: "names must be an array",
      actual: value,
      expected: "string[]",
    });
    return undefined;
  }

  const names: string[] = [];
  const seen = new Set<string>();
  let ok = true;

  for (let i = 0; i < value.length; i += 1) {
    const itemPath = `${path}/${String(i)}`;
    const item = value[i];
    if (typeof item !== "string") {
      issues.push({
        path: itemPath,
        message: "name must be a string",
        actual: item,
        expected: "string",
      });
      ok = false;
      continue;
    }

    if (item.length === 0) {
      issues.push({
        path: itemPath,
        message: "name must not be empty",
        actual: item,
        expected: "non-empty string",
      });
      ok = false;
      continue;
    }

    if (item !== item.trim()) {
      issues.push({
        path: itemPath,
        message: "name must not have leading or trailing whitespace",
        actual: item,
        expected: "trimmed string",
      });
      ok = false;
      continue;
    }

    if (seen.has(item)) {
      issues.push({
        path: itemPath,
        message: "duplicate name within the same candidate file",
        actual: item,
        expected: "unique names",
      });
      ok = false;
      continue;
    }

    seen.add(item);
    names.push(item);
  }

  return ok ? names : undefined;
}

function assertNoFamilyGivenOverlap(
  familyNames: string[],
  givenNameLists: string[][],
  issues: ValidationIssue[],
): void {
  const familySet = new Set(familyNames);
  for (const list of givenNameLists) {
    for (const name of list) {
      if (familySet.has(name)) {
        issues.push({
          path: "/names",
          message: "family name candidates must not overlap given name candidates",
          actual: name,
          expected: "disjoint family and given name sets",
        });
      }
    }
  }
}

function isNameCandidateCategory(value: string): value is NameCandidateCategory {
  return (
    value === "family_name" ||
    value === "male_given_name" ||
    value === "female_given_name" ||
    value === "neutral_given_name"
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void {
  const allowedSet = new Set<string>(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      issues.push({
        path: path === "" ? `/${key}` : `${path}/${key}`,
        message: "unknown key is not allowed",
        actual: key,
        expected: `one of: ${allowed.join(", ")}`,
      });
    }
  }
}

function requireString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "string" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string") {
    issues.push({ path, message: "value must be a string", actual: value, expected: "string" });
    return undefined;
  }
  return value;
}

function requireNonEmptyTrimmedString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = requireString(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (value.length === 0 || value !== value.trim()) {
    issues.push({
      path,
      message: "string must be non-empty and must not have leading or trailing whitespace",
      actual: value,
      expected: "trimmed non-empty string",
    });
    return undefined;
  }
  return value;
}

function requireIntegerAtLeast(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  issues: ValidationIssue[],
): number | undefined {
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "integer" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.push({
      path,
      message: "value must be an integer",
      actual: value,
      expected: "integer",
    });
    return undefined;
  }
  if (value < minimum) {
    issues.push({
      path,
      message: `value must be an integer >= ${String(minimum)}`,
      actual: value,
      expected: `>= ${String(minimum)}`,
    });
    return undefined;
  }
  return value;
}
