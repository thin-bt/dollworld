#!/usr/bin/env node
/**
 * Verify docs/wiki integrity.
 * Self-tests are run by `npm run wiki:check` via node:test before this CLI.
 */
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyWikiTree } from "./wiki-check-lib.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..");
const WIKI_ROOT = join(REPO_ROOT, "docs", "wiki");

const result = verifyWikiTree({
  repoRoot: REPO_ROOT,
  wikiRoot: WIKI_ROOT,
  gitCwd: REPO_ROOT,
});

if (result.errors.length > 0) {
  for (const error of result.errors) {
    process.stderr.write(`wiki:check error: ${error}\n`);
  }
  process.stderr.write(`wiki:check failed with ${String(result.errors.length)} error(s)\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`wiki:check passed (${String(result.fileCount)} files)\n`);
}
