import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Minimal filesystem operations for atomic run output.
 * Tests may inject failing implementations; production uses Node fs.
 */
export type FsOps = {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options: { recursive: boolean }) => void;
  mkdtempSync: (prefix: string) => string;
  writeFileSync: (path: string, data: string, encoding: "utf8") => void;
  readFileSync: (path: string, encoding: "utf8") => string;
  renameSync: (from: string, to: string) => void;
  rmSync: (path: string, options: { recursive: boolean; force: boolean }) => void;
  statSync: (path: string) => { size: number };
  join: (...parts: string[]) => string;
  dirname: (path: string) => string;
  tmpdir: () => string;
};

export function createNodeFsOps(): FsOps {
  return {
    existsSync,
    mkdirSync: (path, options) => {
      mkdirSync(path, options);
    },
    mkdtempSync,
    writeFileSync: (path, data, encoding) => {
      writeFileSync(path, data, encoding);
    },
    readFileSync: (path, encoding) => readFileSync(path, encoding),
    renameSync,
    rmSync,
    statSync: (path) => {
      const stat = statSync(path);
      return { size: stat.size };
    },
    join,
    dirname,
    tmpdir,
  };
}
