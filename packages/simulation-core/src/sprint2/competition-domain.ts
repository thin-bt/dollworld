/**
 * CompetitionDomainRegistry validation and canonical hash (G069 / S2-SPEC-0.2.2-draft §6).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  COMPETITION_DOMAIN_KEYS,
  COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION,
  COMPETITION_DOMAIN_REGISTRY_VERSION,
  type CompetitionDomainKey,
} from "./constants.js";
import {
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireLiteralString,
  requireString,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type {
  CompetitionDomainBinding,
  CompetitionDomainRegistry,
  CompetitionDomainRegistryInput,
} from "./types.js";

const ROOT_KEYS = ["schemaVersion", "registryVersion", "bindings", "registryHash"] as const;
const BINDING_KEYS = ["techniqueCategory", "basicAttackProfile"] as const;
const REJECTED_DOMAIN_KEYS = new Set(["martial"]);

export function createDefaultCompetitionDomainRegistryInput(): CompetitionDomainRegistryInput {
  return {
    schemaVersion: COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION,
    registryVersion: COMPETITION_DOMAIN_REGISTRY_VERSION,
    bindings: {
      unarmed: { techniqueCategory: "unarmed", basicAttackProfile: "unarmed" },
      sword: { techniqueCategory: "sword", basicAttackProfile: "sword" },
      magic: { techniqueCategory: "magic", basicAttackProfile: "magic" },
    },
  };
}

function parseBinding(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): CompetitionDomainBinding | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(object, BINDING_KEYS, path, issues);

  const techniqueCategoryRaw = requireString(object, "techniqueCategory", path, issues);
  const basicAttackProfileRaw = requireString(object, "basicAttackProfile", path, issues);
  if (techniqueCategoryRaw === undefined || basicAttackProfileRaw === undefined) {
    return undefined;
  }
  if (!COMPETITION_DOMAIN_KEYS.includes(techniqueCategoryRaw as CompetitionDomainKey)) {
    issues.push({
      path: `${path}/techniqueCategory`,
      message: "techniqueCategory must be a fixed CompetitionDomain key",
      actual: techniqueCategoryRaw,
      expected: COMPETITION_DOMAIN_KEYS.join(" | "),
    });
    return undefined;
  }
  if (!COMPETITION_DOMAIN_KEYS.includes(basicAttackProfileRaw as CompetitionDomainKey)) {
    issues.push({
      path: `${path}/basicAttackProfile`,
      message: "basicAttackProfile must be a fixed CompetitionDomain key",
      actual: basicAttackProfileRaw,
      expected: COMPETITION_DOMAIN_KEYS.join(" | "),
    });
    return undefined;
  }
  const techniqueCategory = techniqueCategoryRaw as CompetitionDomainKey;
  const basicAttackProfile = basicAttackProfileRaw as CompetitionDomainKey;
  if (techniqueCategory === undefined || basicAttackProfile === undefined || issues.length > 0) {
    return undefined;
  }
  if (techniqueCategory !== basicAttackProfile) {
    issues.push({
      path,
      message: "techniqueCategory and basicAttackProfile must match for unrestricted binding",
      actual: { techniqueCategory, basicAttackProfile },
      expected: "matching domain keys",
    });
    return undefined;
  }
  return { techniqueCategory: techniqueCategory as CompetitionDomainKey, basicAttackProfile };
}

function buildRegistryHashInput(
  registry: Omit<CompetitionDomainRegistry, "registryHash">,
): Record<string, unknown> {
  return {
    schemaVersion: registry.schemaVersion,
    registryVersion: registry.registryVersion,
    bindings: registry.bindings,
  };
}

export function computeCompetitionDomainRegistryHash(
  registry: Omit<CompetitionDomainRegistry, "registryHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildRegistryHashInput(registry)), "/registryHash");
}

export function validateCompetitionDomainRegistry(
  input: unknown,
): ValidationResult<CompetitionDomainRegistry> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }

  const inputKeys = Object.keys(object);
  for (const key of inputKeys) {
    if (REJECTED_DOMAIN_KEYS.has(key)) {
      issues.push({
        path: `/${key}`,
        message: "rejected legacy or alias domain key at registry root",
        actual: key,
        expected: "schemaVersion, registryVersion, bindings, registryHash",
      });
    }
  }
  rejectUnknownKeys(object, ROOT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION,
    issues,
  );
  const registryVersion = requireLiteralString(
    object,
    "registryVersion",
    "",
    COMPETITION_DOMAIN_REGISTRY_VERSION,
    issues,
  );
  const bindingsObject = snapshotPlainObjectOrFail(object["bindings"], "/bindings", issues);
  if (bindingsObject === undefined) {
    return failure(issues);
  }

  rejectUnknownKeys(bindingsObject, COMPETITION_DOMAIN_KEYS, "/bindings", issues);
  for (const key of Object.keys(bindingsObject)) {
    if (REJECTED_DOMAIN_KEYS.has(key)) {
      issues.push({
        path: `/bindings/${key}`,
        message: "rejected legacy domain key",
        actual: key,
        expected: COMPETITION_DOMAIN_KEYS.join(" | "),
      });
    }
  }

  const bindings: Partial<Record<CompetitionDomainKey, CompetitionDomainBinding>> = {};
  for (const domainKey of COMPETITION_DOMAIN_KEYS) {
    if (!hasOwn(bindingsObject, domainKey)) {
      issues.push({
        path: `/bindings/${domainKey}`,
        message: "required domain binding is missing",
        expected: "CompetitionDomainBinding",
      });
      continue;
    }
    const parsed = parseBinding(bindingsObject[domainKey], `/bindings/${domainKey}`, issues);
    if (parsed !== undefined) {
      bindings[domainKey] = parsed;
    }
  }

  if (
    schemaVersion === undefined ||
    registryVersion === undefined ||
    issues.length > 0 ||
    COMPETITION_DOMAIN_KEYS.some((key) => bindings[key] === undefined)
  ) {
    return failure(issues);
  }

  const withoutHash: Omit<CompetitionDomainRegistry, "registryHash"> = {
    schemaVersion,
    registryVersion,
    bindings: bindings as Record<CompetitionDomainKey, CompetitionDomainBinding>,
  };

  if (hasOwn(object, "registryHash")) {
    const declared = object["registryHash"];
    if (typeof declared !== "string") {
      issues.push({
        path: "/registryHash",
        message: "registryHash must be a string when present",
        actual: declared,
        expected: "64 lowercase hex chars",
      });
      return failure(issues);
    }
    return success(
      deepFreezePlainJson({
        ...withoutHash,
        registryHash: declared,
      }),
    );
  }

  return success(
    deepFreezePlainJson({
      ...withoutHash,
      registryHash: "",
    }),
  );
}

export function finalizeCompetitionDomainRegistry(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<CompetitionDomainRegistry> {
  const validated = validateCompetitionDomainRegistry(input);
  if (!validated.ok) {
    return validated;
  }

  const withoutDeclaredHash: Omit<CompetitionDomainRegistry, "registryHash"> = {
    schemaVersion: validated.value.schemaVersion,
    registryVersion: validated.value.registryVersion,
    bindings: validated.value.bindings,
  };
  const hashResult = computeCompetitionDomainRegistryHash(withoutDeclaredHash, provider);
  if (!hashResult.ok) {
    return hashResult;
  }

  if (
    validated.value.registryHash.length > 0 &&
    validated.value.registryHash !== hashResult.value
  ) {
    return failure([
      {
        path: "/registryHash",
        message: "registryHash must equal canonical CompetitionDomainRegistry hash",
        actual: validated.value.registryHash,
        expected: hashResult.value,
      },
    ]);
  }

  return success(
    deepFreezePlainJson({
      ...withoutDeclaredHash,
      registryHash: hashResult.value,
    }),
  );
}
