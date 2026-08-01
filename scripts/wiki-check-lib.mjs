/**
 * Wiki integrity verification library (Node standard library only).
 * Used by scripts/check-wiki.mjs and scripts/wiki-check.test.mjs.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const REQUIRED_FRONT_MATTER_KEYS = [
  "title",
  "status",
  "authority",
  "scope",
  "sources",
  "last_verified",
];

export const FRONT_MATTER_TRACKED_KEYS = [
  "title",
  "status",
  "authority",
  "scope",
  "sources",
  "last_verified",
  "related",
  "supersedes",
];

export const ALLOWED_STATUS = new Set(["current", "pending", "superseded"]);
export const ALLOWED_AUTHORITY = new Set(["explanatory"]);

/**
 * Empty directories under docs/wiki are allowed (organizational placeholders).
 * Only directories and regular `.md` files are permitted; symlinks and other
 * non-markdown files are forbidden.
 */
export const EMPTY_WIKI_DIRECTORIES_ALLOWED = true;

/**
 * @typedef {"directory" | "markdown" | "non-markdown-file" | "symlink" | "other"} WikiEntryKind
 */

/**
 * @typedef {"missing" | "symlink" | "file" | "other" | "directory"} WikiRootKind
 */

/**
 * Classify one wiki-tree Dirent without following symlinks.
 * Separated for unit testing when the OS cannot create symlinks.
 *
 * @param {import("node:fs").Dirent} entry
 * @param {string} fullPath
 * @param {{ lstatSync?: typeof lstatSync }} [options]
 * @returns {{ kind: WikiEntryKind, detail: string }}
 */
export function classifyWikiEntry(entry, fullPath, options = {}) {
  const lstat = options.lstatSync ?? lstatSync;
  if (typeof entry.isSymbolicLink === "function" && entry.isSymbolicLink()) {
    return { kind: "symlink", detail: "symbolic link" };
  }
  let st;
  try {
    st = lstat(fullPath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { kind: "other", detail: `lstat failed: ${detail}` };
  }
  if (st.isSymbolicLink()) {
    return { kind: "symlink", detail: "symbolic link" };
  }
  if (st.isDirectory()) {
    return { kind: "directory", detail: "directory" };
  }
  if (st.isFile()) {
    if (entry.name.toLowerCase().endsWith(".md")) {
      return { kind: "markdown", detail: "markdown file" };
    }
    return { kind: "non-markdown-file", detail: `non-markdown file (${entry.name})` };
  }
  return { kind: "other", detail: "non-regular directory entry" };
}

/**
 * Walk the wiki tree. Returns markdown file paths and entry errors.
 * Empty directories are allowed when EMPTY_WIKI_DIRECTORIES_ALLOWED is true.
 *
 * @param {string} wikiRoot
 * @param {{ classify?: typeof classifyWikiEntry }} [options]
 * @returns {{ markdownFiles: string[], errors: string[] }}
 */
export function inspectWikiTreeEntries(wikiRoot, options = {}) {
  const classify = options.classify ?? classifyWikiEntry;
  /** @type {string[]} */
  const markdownFiles = [];
  /** @type {string[]} */
  const errors = [];

  /**
   * @param {string} dir
   */
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`wiki tree: failed to read directory ${dir}: ${detail}`);
      return;
    }
    if (entries.length === 0 && !EMPTY_WIKI_DIRECTORIES_ALLOWED) {
      errors.push(`wiki tree: empty directory forbidden: ${dir}`);
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const classified = classify(entry, full);
      if (classified.kind === "directory") {
        walk(full);
        continue;
      }
      if (classified.kind === "markdown") {
        markdownFiles.push(full);
        continue;
      }
      errors.push(
        `wiki tree: forbidden entry ${full} (${classified.detail}; only directories and regular .md files are allowed)`,
      );
    }
  }

  walk(wikiRoot);
  return { markdownFiles, errors };
}

/**
 * Classify the wikiRoot path itself without following links.
 * Separated so Windows environments without symlink privilege can unit-test logic.
 *
 * @param {string} wikiRoot
 * @param {{ lstatSync?: typeof lstatSync }} [options]
 * @returns {{ kind: WikiRootKind, detail: string }}
 */
export function classifyWikiRootPath(wikiRoot, options = {}) {
  const lstat = options.lstatSync ?? lstatSync;
  let st;
  try {
    st = lstat(wikiRoot);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { kind: "missing", detail };
  }
  if (st.isSymbolicLink()) {
    return { kind: "symlink", detail: "symbolic link or junction/reparse point" };
  }
  if (st.isFile()) {
    return { kind: "file", detail: "regular file" };
  }
  if (st.isDirectory()) {
    return { kind: "directory", detail: "directory" };
  }
  return { kind: "other", detail: "non-directory entry" };
}

/**
 * Validate wikiRoot: lexical repo containment, lstat (no symlink), regular directory,
 * and realpath inside repoRoot. Never uses statSync (which follows symlinks).
 *
 * @param {string} repoRoot
 * @param {string} wikiRoot
 * @param {{
 *   lstatSync?: typeof lstatSync,
 *   realpathSync?: typeof realpathSync,
 *   classify?: typeof classifyWikiRootPath,
 * }} [options]
 * @returns {{ ok: true, realPath: string } | { ok: false, reason: string }}
 */
export function validateWikiRoot(repoRoot, wikiRoot, options = {}) {
  const realpath = options.realpathSync ?? realpathSync;
  const classify = options.classify ?? classifyWikiRootPath;
  const root = resolve(repoRoot);
  const wiki = resolve(wikiRoot);

  if (!isPathInsideRepo(root, wiki)) {
    return { ok: false, reason: `wikiRoot path escapes repository root: ${wikiRoot}` };
  }

  const classified = classify(wiki, { lstatSync: options.lstatSync });
  if (classified.kind === "missing") {
    return { ok: false, reason: `wikiRoot does not exist: ${wikiRoot} (${classified.detail})` };
  }
  if (classified.kind === "symlink") {
    return {
      ok: false,
      reason: `wikiRoot must not be a symbolic link/junction: ${wikiRoot}`,
    };
  }
  if (classified.kind === "file") {
    return { ok: false, reason: `wikiRoot must be a directory, not a file: ${wikiRoot}` };
  }
  if (classified.kind !== "directory") {
    return {
      ok: false,
      reason: `wikiRoot must be a regular directory: ${wikiRoot} (${classified.detail})`,
    };
  }

  let realPath;
  try {
    realPath = realpath(wiki);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `wikiRoot realpath failed: ${wikiRoot} (${detail})` };
  }
  if (!isPathInsideRepo(root, realPath)) {
    return {
      ok: false,
      reason: `wikiRoot realpath escapes repository root: ${wikiRoot} -> ${realPath}`,
    };
  }
  return { ok: true, realPath };
}

/**
 * Split YAML front matter. Opening and closing delimiters must be a line that is
 * exactly `---` (LF or CRLF). `---x`, `----`, missing close → null.
 *
 * @param {string} text
 * @returns {{ matter: string, body: string } | null}
 */
export function splitFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") {
    return null;
  }
  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return null;
  }
  const matter = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");
  return { matter, body };
}

/**
 * @param {string} matter
 * @returns {Set<string>}
 */
export function topLevelKeys(matter) {
  /** @type {Set<string>} */
  const keys = new Set();
  const tracked = new Set(FRONT_MATTER_TRACKED_KEYS);
  for (const line of matter.split("\n")) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(line);
    if (match?.[1] !== undefined && tracked.has(match[1])) {
      keys.add(match[1]);
    }
  }
  return keys;
}

/**
 * Return tracked keys that appear more than once at the top level.
 * @param {string} matter
 * @returns {string[]}
 */
export function findDuplicateFrontMatterKeys(matter) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  /** @type {string[]} */
  const duplicates = [];
  const tracked = new Set(FRONT_MATTER_TRACKED_KEYS);
  for (const line of matter.split("\n")) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(line);
    if (match?.[1] === undefined || !tracked.has(match[1])) {
      continue;
    }
    const key = match[1];
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    if (next === 2) {
      duplicates.push(key);
    }
  }
  return duplicates;
}

/**
 * @param {string} matter
 * @param {string} key
 * @returns {string | null}
 */
export function parseScalar(matter, key) {
  const re = new RegExp(`^${key}:[ \\t]*(.*)$`, "m");
  const match = re.exec(matter);
  if (match === null) {
    return null;
  }
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

/**
 * Parse a block list only. Scalar forms like `sources: docs/SPEC.md` are invalid.
 *
 * @param {string} matter
 * @param {string} key
 * @returns {
 *   | { status: "absent" }
 *   | { status: "invalid", reason: string }
 *   | { status: "ok", items: string[] }
 * }
 */
export function parseStringList(matter, key) {
  const lines = matter.split("\n");
  let inList = false;
  /** @type {string[]} */
  const items = [];
  let found = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, "");
    if (new RegExp(`^${key}\\s*:`).test(line)) {
      found = true;
      inList = true;
      const afterColon = line.replace(new RegExp(`^${key}\\s*:`), "");
      if (afterColon.trim() !== "") {
        return {
          status: "invalid",
          reason: `${key} must use a block list, not a scalar value`,
        };
      }
      continue;
    }
    if (inList) {
      if (/^[a-zA-Z_]/.test(line)) {
        break;
      }
      if (line.trim() === "") {
        continue;
      }
      const item = /^[ \t]+-[ \t]+(.*)$/.exec(line);
      if (item === null) {
        return {
          status: "invalid",
          reason: `${key} has an invalid list item indentation or format: ${line}`,
        };
      }
      const value = item[1].trim();
      if (value === "") {
        return { status: "invalid", reason: `${key} contains an empty list item` };
      }
      items.push(value);
    }
  }
  if (!found) {
    return { status: "absent" };
  }
  return { status: "ok", items };
}

/**
 * True when resolvedPath is the root or a path inside it (lexical).
 * @param {string} root
 * @param {string} resolvedPath
 */
export function isPathInsideRepo(root, resolvedPath) {
  const base = resolve(root);
  const target = resolve(resolvedPath);
  const rel = relative(base, target);
  if (rel === "") {
    return true;
  }
  if (isAbsolute(rel)) {
    return false;
  }
  const normalized = rel.split(/[/\\]/).join("/");
  return !normalized.startsWith("..");
}

/**
 * Resolve the real path and ensure it stays under root.
 * @param {string} root
 * @param {string} candidatePath
 * @param {{ realpathSync?: typeof realpathSync }} [options]
 * @returns {{ ok: true, realPath: string } | { ok: false, reason: string }}
 */
export function assertRealPathInside(root, candidatePath, options = {}) {
  const realpath = options.realpathSync ?? realpathSync;
  let realPath;
  try {
    realPath = realpath(candidatePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `realpath failed for ${candidatePath}: ${detail}` };
  }
  if (!isPathInsideRepo(root, realPath)) {
    return {
      ok: false,
      reason: `realpath escapes allowed root (${root}): ${candidatePath} -> ${realPath}`,
    };
  }
  return { ok: true, realPath };
}

/**
 * @param {string} value
 */
export function isForbiddenAbsoluteOrUrlPath(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }
  if (/^file:/i.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    return true;
  }
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("\\\\") || trimmed.startsWith("//")) {
    return true;
  }
  return false;
}

/**
 * @param {string} dateText
 */
export function isValidIsoDate(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return false;
  }
  const year = Number(dateText.slice(0, 4));
  const month = Number(dateText.slice(5, 7));
  const day = Number(dateText.slice(8, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

/**
 * @param {string} scope
 */
export function isValidScope(scope) {
  if (scope.trim() === "") {
    return false;
  }
  if (isForbiddenAbsoluteOrUrlPath(scope)) {
    return false;
  }
  if (/[A-Za-z]:[\\/]/.test(scope) || scope.includes("\\\\")) {
    return false;
  }
  return true;
}

/**
 * Require a full 40-char object whose own type is exactly `commit`
 * (`git cat-file -t <sha>`), without peeling tags.
 *
 * @param {string} sha
 * @param {string} gitCwd
 * @param {{ execGit?: typeof defaultExecGit }} [options]
 */
export function assertCommitExists(sha, gitCwd, options = {}) {
  const execGit = options.execGit ?? defaultExecGit;
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error(
      `commit must be a full 40-character SHA (ambiguous short SHA rejected): ${sha}`,
    );
  }
  let objectType;
  try {
    objectType = execGit(["cat-file", "-t", sha], gitCwd).trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`commit object does not exist: ${sha} (${detail})`, { cause: error });
  }
  if (objectType !== "commit") {
    throw new Error(`expected git object type commit, got ${objectType}: ${sha}`);
  }
}

/**
 * @param {string} tagName
 * @param {string} gitCwd
 * @param {{ execGit?: typeof defaultExecGit }} [options]
 */
export function assertTagExists(tagName, gitCwd, options = {}) {
  const execGit = options.execGit ?? defaultExecGit;
  if (tagName.trim() === "") {
    throw new Error("tag name is empty");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(tagName) || tagName.includes("..")) {
    throw new Error(`invalid tag name: ${tagName}`);
  }
  try {
    execGit(["show-ref", "--verify", "--quiet", `refs/tags/${tagName}`], gitCwd);
  } catch {
    throw new Error(`tag does not exist locally: ${tagName}`);
  }
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
export function defaultExecGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * Resolve a repo-root-relative source path; lexical + realpath must stay in repo.
 * @param {string} repoRoot
 * @param {string} sourcePath
 * @param {{ realpathSync?: typeof realpathSync, lstatSync?: typeof lstatSync }} [options]
 * @returns {{ ok: true, resolved: string, realPath: string } | { ok: false, reason: string }}
 */
export function resolveRepoSourcePath(repoRoot, sourcePath, options = {}) {
  if (sourcePath.trim() === "") {
    return { ok: false, reason: "empty path" };
  }
  if (isForbiddenAbsoluteOrUrlPath(sourcePath)) {
    return { ok: false, reason: `absolute or file URL path forbidden: ${sourcePath}` };
  }
  const resolved = resolve(repoRoot, sourcePath.replace(/\//g, sep));
  if (!isPathInsideRepo(repoRoot, resolved)) {
    return { ok: false, reason: `path escapes repository root: ${sourcePath}` };
  }
  if (!existsSync(resolved)) {
    return { ok: false, reason: `path does not exist: ${sourcePath}` };
  }
  const real = assertRealPathInside(repoRoot, resolved, options);
  if (!real.ok) {
    return real;
  }
  return { ok: true, resolved, realPath: real.realPath };
}

/**
 * Resolve a path relative to a wiki markdown file.
 * @param {string} repoRoot
 * @param {string} fromFile
 * @param {string} target
 * @param {{
 *   requireMarkdown?: boolean,
 *   requireRegularFile?: boolean,
 *   allowedRoot?: string,
 *   realpathSync?: typeof realpathSync,
 *   lstatSync?: typeof lstatSync,
 * }} [options]
 */
export function resolveWikiRelativePath(repoRoot, fromFile, target, options = {}) {
  const lstat = options.lstatSync ?? lstatSync;
  const allowedRoot = resolve(options.allowedRoot ?? repoRoot);
  if (target.trim() === "") {
    return { ok: false, reason: "empty path" };
  }
  if (isForbiddenAbsoluteOrUrlPath(target)) {
    return { ok: false, reason: `absolute or file URL path forbidden: ${target}` };
  }
  const clean = target.split("#")[0] ?? target;
  if (clean.length === 0) {
    return { ok: true, resolved: fromFile };
  }
  const resolved = resolve(dirname(fromFile), clean);
  if (!isPathInsideRepo(repoRoot, resolved)) {
    return { ok: false, reason: `path escapes repository root: ${target}` };
  }
  if (!isPathInsideRepo(allowedRoot, resolved)) {
    return { ok: false, reason: `path escapes allowed root: ${target}` };
  }
  if (!existsSync(resolved)) {
    return { ok: false, reason: `path does not exist: ${target}` };
  }

  let st;
  try {
    st = lstat(resolved);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `lstat failed: ${detail}` };
  }

  if (options.requireRegularFile === true || options.requireMarkdown === true) {
    if (st.isSymbolicLink()) {
      return { ok: false, reason: `expected a regular file, got symlink: ${target}` };
    }
    if (!st.isFile()) {
      return { ok: false, reason: `expected a regular file: ${target}` };
    }
  }
  if (options.requireMarkdown === true && !resolved.toLowerCase().endsWith(".md")) {
    return { ok: false, reason: `expected a .md page: ${target}` };
  }

  const realInRepo = assertRealPathInside(repoRoot, resolved, options);
  if (!realInRepo.ok) {
    return realInRepo;
  }
  const realInAllowed = assertRealPathInside(allowedRoot, resolved, options);
  if (!realInAllowed.ok) {
    return realInAllowed;
  }
  return { ok: true, resolved, realPath: realInAllowed.realPath };
}

/**
 * @typedef {object} VerifyWikiOptions
 * @property {string} repoRoot
 * @property {string} wikiRoot
 * @property {string} [gitCwd]
 * @property {typeof defaultExecGit} [execGit]
 * @property {typeof lstatSync} [lstatSync]
 * @property {typeof realpathSync} [realpathSync]
 * @property {typeof classifyWikiRootPath} [classifyWikiRoot]
 */

/**
 * Verify a wiki tree. Returns structured errors (does not throw for content issues).
 * @param {VerifyWikiOptions} options
 * @returns {{ errors: string[], fileCount: number }}
 */
export function verifyWikiTree(options) {
  const repoRoot = resolve(options.repoRoot);
  const wikiRoot = resolve(options.wikiRoot);
  const gitCwd = resolve(options.gitCwd ?? repoRoot);
  const execGit = options.execGit ?? defaultExecGit;
  /** @type {string[]} */
  const errors = [];

  const rootCheck = validateWikiRoot(repoRoot, wikiRoot, {
    lstatSync: options.lstatSync,
    realpathSync: options.realpathSync,
    classify: options.classifyWikiRoot,
  });
  if (!rootCheck.ok) {
    return { errors: [rootCheck.reason], fileCount: 0 };
  }

  const inspection = inspectWikiTreeEntries(wikiRoot);
  errors.push(...inspection.errors);
  const files = inspection.markdownFiles;
  if (files.length === 0) {
    errors.push("no markdown files under wiki root");
  }

  for (const filePath of files) {
    const rel = relative(repoRoot, filePath).split(/[/\\]/).join("/");
    const text = readFileSync(filePath, "utf8");
    const split = splitFrontMatter(text);
    if (split === null) {
      errors.push(`${rel}: missing or malformed YAML front matter delimiters`);
      continue;
    }

    const duplicates = findDuplicateFrontMatterKeys(split.matter);
    if (duplicates.length > 0) {
      errors.push(`${rel}: duplicate front matter key(s): ${duplicates.join(", ")}`);
      continue;
    }

    const keys = topLevelKeys(split.matter);
    for (const key of REQUIRED_FRONT_MATTER_KEYS) {
      if (!keys.has(key)) {
        errors.push(`${rel}: missing front matter key: ${key}`);
      }
    }

    const title = parseScalar(split.matter, "title");
    if (title === null || title.trim() === "") {
      errors.push(`${rel}: title must be a non-empty string`);
    }

    const status = parseScalar(split.matter, "status");
    if (status === null || !ALLOWED_STATUS.has(status)) {
      errors.push(`${rel}: status must be one of current|pending|superseded`);
    }

    const authority = parseScalar(split.matter, "authority");
    if (authority === null || !ALLOWED_AUTHORITY.has(authority)) {
      errors.push(`${rel}: authority must be explanatory`);
    }

    const scope = parseScalar(split.matter, "scope");
    if (scope === null || !isValidScope(scope)) {
      errors.push(`${rel}: scope is empty or contains a forbidden path-like value`);
    }

    const lastVerified = parseScalar(split.matter, "last_verified");
    if (lastVerified === null || !isValidIsoDate(lastVerified)) {
      errors.push(`${rel}: last_verified must be a real YYYY-MM-DD date`);
    }

    const sources = parseStringList(split.matter, "sources");
    if (sources.status === "absent" || (sources.status === "ok" && sources.items.length === 0)) {
      errors.push(`${rel}: sources must contain at least one item`);
    } else if (sources.status === "invalid") {
      errors.push(`${rel}: ${sources.reason}`);
    } else {
      for (const source of sources.items) {
        errors.push(...validateSourceEntry(rel, source, repoRoot, gitCwd, execGit));
      }
    }

    for (const listKey of /** @type {const} */ (["related", "supersedes"])) {
      const items = parseStringList(split.matter, listKey);
      if (items.status === "absent") {
        continue;
      }
      if (items.status === "invalid") {
        errors.push(`${rel}: ${items.reason}`);
        continue;
      }
      if (items.items.length === 0) {
        errors.push(`${rel}: ${listKey} is present but empty`);
        continue;
      }
      for (const item of items.items) {
        const mdResolved = resolveWikiRelativePath(repoRoot, filePath, item, {
          requireMarkdown: true,
          requireRegularFile: true,
          allowedRoot: wikiRoot,
        });
        if (!mdResolved.ok) {
          errors.push(`${rel}: ${listKey} invalid (${mdResolved.reason})`);
        }
      }
    }

    errors.push(...validateMarkdownLinks(rel, filePath, split.body, repoRoot));
  }

  return { errors, fileCount: files.length };
}

/**
 * @param {string} rel
 * @param {string} source
 * @param {string} repoRoot
 * @param {string} gitCwd
 * @param {typeof defaultExecGit} execGit
 * @returns {string[]}
 */
function validateSourceEntry(rel, source, repoRoot, gitCwd, execGit) {
  /** @type {string[]} */
  const errors = [];
  if (source.trim() === "") {
    errors.push(`${rel}: sources contains an empty item`);
    return errors;
  }
  if (source.startsWith("commit:")) {
    const sha = source.slice("commit:".length);
    try {
      assertCommitExists(sha, gitCwd, { execGit });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`${rel}: ${detail}`);
    }
    return errors;
  }
  if (source.startsWith("tag:")) {
    const tagName = source.slice("tag:".length);
    try {
      assertTagExists(tagName, gitCwd, { execGit });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`${rel}: ${detail}`);
    }
    return errors;
  }
  const resolved = resolveRepoSourcePath(repoRoot, source);
  if (!resolved.ok) {
    errors.push(`${rel}: sources ${resolved.reason}`);
  }
  return errors;
}

/**
 * @param {string} rel
 * @param {string} filePath
 * @param {string} body
 * @param {string} repoRoot
 * @returns {string[]}
 */
function validateMarkdownLinks(rel, filePath, body, repoRoot) {
  /** @type {string[]} */
  const errors = [];
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRe.exec(body)) !== null) {
    const target = match[2].trim();
    if (target.startsWith("http://") || target.startsWith("https://")) {
      continue;
    }
    if (target.startsWith("#")) {
      continue;
    }
    if (isForbiddenAbsoluteOrUrlPath(target.split("#")[0] ?? target)) {
      errors.push(`${rel}: markdown link absolute/file path forbidden: ${target}`);
      continue;
    }
    const result = resolveWikiRelativePath(repoRoot, filePath, target, {
      allowedRoot: repoRoot,
    });
    if (!result.ok) {
      errors.push(`${rel}: markdown link ${result.reason}`);
    }
  }
  return errors;
}
