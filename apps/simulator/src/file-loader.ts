import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  validateNameData,
  validateNameDataManifest,
  type Sha256Provider,
  type ValidatedNameData,
} from "@shared-world/simulation-core";

export class FileLoadError extends Error {
  readonly causeDetail?: string;

  constructor(message: string, causeDetail?: string) {
    super(message);
    this.name = "FileLoadError";
    if (causeDetail !== undefined) {
      this.causeDetail = causeDetail;
    }
  }
}

export function resolveConfigPath(cwd: string, configPath: string): string {
  return isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
}

export function resolveRepoRelativePath(cwd: string, relativePath: string): string {
  return isAbsolute(relativePath) ? relativePath : resolve(cwd, relativePath);
}

/**
 * Resolve a manifest candidate path relative to the manifest file directory.
 * Manifest entries use safe repository-relative POSIX paths (often filenames
 * under `data/names/`).
 */
export function resolveManifestCandidatePath(
  manifestAbsolutePath: string,
  candidateRelativePath: string,
): string {
  return resolve(dirname(manifestAbsolutePath), candidateRelativePath);
}

export function readUtf8File(absolutePath: string): string {
  try {
    return readFileSync(absolutePath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new FileLoadError(`failed to read file: ${absolutePath}`, detail);
  }
}

export function readJsonFile(absolutePath: string): unknown {
  const text = readUtf8File(absolutePath);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new FileLoadError(`invalid JSON in file: ${absolutePath}`, detail);
  }
}

export type LoadNameDataInput = {
  cwd: string;
  manifestPath: string;
  requiredVersion: string;
  initialFamilyCount: number;
  sha256Provider: Sha256Provider;
};

export function loadValidatedNameData(input: LoadNameDataInput): ValidatedNameData {
  const manifestAbsolutePath = resolveRepoRelativePath(input.cwd, input.manifestPath);
  const manifestJson = readJsonFile(manifestAbsolutePath);
  const manifestResult = validateNameDataManifest(manifestJson);
  if (!manifestResult.ok) {
    throw new FileLoadError(
      "name data manifest validation failed",
      JSON.stringify(manifestResult.issues),
    );
  }
  const manifest = manifestResult.value;

  const familyNames = readJsonFile(
    resolveManifestCandidatePath(manifestAbsolutePath, manifest.files.family.path),
  );
  const maleGivenNames = readJsonFile(
    resolveManifestCandidatePath(manifestAbsolutePath, manifest.files.male.path),
  );
  const femaleGivenNames = readJsonFile(
    resolveManifestCandidatePath(manifestAbsolutePath, manifest.files.female.path),
  );
  const neutralGivenNames = readJsonFile(
    resolveManifestCandidatePath(manifestAbsolutePath, manifest.files.neutral.path),
  );

  const validated = validateNameData({
    manifest,
    familyNames,
    maleGivenNames,
    femaleGivenNames,
    neutralGivenNames,
    requiredVersion: input.requiredVersion,
    initialFamilyCount: input.initialFamilyCount,
    sha256Provider: input.sha256Provider,
  });
  if (!validated.ok) {
    throw new FileLoadError("name data validation failed", JSON.stringify(validated.issues));
  }
  return validated.value;
}
