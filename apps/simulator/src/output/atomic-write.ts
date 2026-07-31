import { toCanonicalJson } from "@shared-world/simulation-core";
import type { FixedOutputFileName } from "./fixed-files.js";
import { FIXED_OUTPUT_FILE_NAMES } from "./fixed-files.js";
import type { FsOps } from "./fs-ops.js";

export type RunOutputContents = Record<FixedOutputFileName, string>;

export type AtomicWriteResult = {
  runDirectory: string;
  fileBytes: { fileName: FixedOutputFileName; bytes: number }[];
  totalBytes: number;
};

export type AtomicWriteInput = {
  fs: FsOps;
  outputRoot: string;
  runId: string;
  contents: RunOutputContents;
  /**
   * Optional hook after temp files are written and before reload/verify/rename.
   * Used by tests to simulate mid-write failure or tampering.
   */
  afterTempWrite?: (tempDirectory: string) => void;
  /**
   * Validate reloaded contents before rename. On throw, temp is cleaned up
   * and the final run directory is not created.
   */
  verifyReloadedContents?: (contents: RunOutputContents) => void;
};

function assertAllSevenPresent(contents: RunOutputContents): void {
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    if (!(name in contents)) {
      throw new Error(`missing output content for ${name}`);
    }
    if (typeof contents[name] !== "string") {
      throw new Error(`output content for ${name} must be a string`);
    }
  }
}

function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/**
 * Write fixed 7 files via temp directory + same-filesystem rename.
 * On any failure before successful rename, removes the temp directory and
 * never leaves a partial final run directory.
 */
export function writeRunOutputAtomic(input: AtomicWriteInput): AtomicWriteResult {
  assertAllSevenPresent(input.contents);

  const finalDirectory = input.fs.join(input.outputRoot, input.runId);
  if (input.fs.existsSync(finalDirectory)) {
    throw new Error(`output run directory already exists: ${finalDirectory}`);
  }

  input.fs.mkdirSync(input.outputRoot, { recursive: true });

  const tempPrefix = input.fs.join(input.outputRoot, `.tmp-${input.runId}-`);
  let tempDirectory: string;
  try {
    tempDirectory = input.fs.mkdtempSync(tempPrefix);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to create temporary output directory: ${detail}`, {
      cause: error,
    });
  }

  try {
    if (input.fs.existsSync(finalDirectory)) {
      throw new Error(`output run directory already exists: ${finalDirectory}`);
    }

    for (const name of FIXED_OUTPUT_FILE_NAMES) {
      const path = input.fs.join(tempDirectory, name);
      input.fs.writeFileSync(path, input.contents[name], "utf8");
    }

    if (input.afterTempWrite !== undefined) {
      input.afterTempWrite(tempDirectory);
    }

    const reloaded = {} as RunOutputContents;
    for (const name of FIXED_OUTPUT_FILE_NAMES) {
      const path = input.fs.join(tempDirectory, name);
      if (!input.fs.existsSync(path)) {
        throw new Error(`atomic write verification failed: missing ${name}`);
      }
      const text = input.fs.readFileSync(path, "utf8");
      if (text !== input.contents[name]) {
        throw new Error(`atomic write verification failed: content mismatch for ${name}`);
      }
      reloaded[name] = text;
    }

    if (input.verifyReloadedContents !== undefined) {
      input.verifyReloadedContents(reloaded);
    }

    if (input.fs.existsSync(finalDirectory)) {
      throw new Error(`output run directory already exists: ${finalDirectory}`);
    }

    input.fs.renameSync(tempDirectory, finalDirectory);
  } catch (error) {
    try {
      input.fs.rmSync(tempDirectory, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; surface the original error.
    }
    throw error;
  }

  const fileBytes = FIXED_OUTPUT_FILE_NAMES.map((fileName) => ({
    fileName,
    bytes: input.fs.statSync(input.fs.join(finalDirectory, fileName)).size,
  }));
  const totalBytes = fileBytes.reduce((sum, entry) => sum + entry.bytes, 0);

  return {
    runDirectory: finalDirectory,
    fileBytes,
    totalBytes,
  };
}

/** Serialize a value as canonical JSON text with trailing LF. */
export function toCanonicalJsonFile(value: unknown): string {
  return `${toCanonicalJson(value)}\n`;
}

export function measureUtf8Bytes(text: string): number {
  return utf8ByteLength(text);
}
