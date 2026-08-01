import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import {
  assertCommitExists,
  assertTagExists,
  classifyWikiEntry,
  classifyWikiRootPath,
  EMPTY_WIKI_DIRECTORIES_ALLOWED,
  inspectWikiTreeEntries,
  isPathInsideRepo,
  isValidIsoDate,
  resolveRepoSourcePath,
  resolveWikiRelativePath,
  validateWikiRoot,
  verifyWikiTree,
} from "./wiki-check-lib.mjs";

/**
 * @param {(dir: string) => void} fn
 */
function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "dollworld-wiki-check-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * @param {string} dir
 * @param {string[]} args
 */
function git(dir, args) {
  return execFileSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * @param {string} dir
 */
function initGitRepo(dir) {
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "wiki-check@example.com"]);
  git(dir, ["config", "user.name", "Wiki Check"]);
  writeFileSync(join(dir, "README.md"), "# fixture\n", "utf8");
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "SPEC.md"), "# SPEC\n", "utf8");
  git(dir, ["add", "README.md", "docs/SPEC.md"]);
  git(dir, ["commit", "-m", "initial"]);
  return git(dir, ["rev-parse", "HEAD"]);
}

/**
 * @param {string} repoRoot
 * @param {Record<string, string>} pages
 */
function writeWiki(repoRoot, pages) {
  for (const [rel, content] of Object.entries(pages)) {
    const full = join(repoRoot, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content, "utf8");
  }
}

/**
 * @param {string} target
 * @param {string} path
 * @param {"file" | "dir" | undefined} type
 */
function trySymlink(target, path, type) {
  try {
    if (type === undefined) {
      symlinkSync(target, path);
    } else {
      symlinkSync(target, path, type);
    }
    return true;
  } catch {
    return false;
  }
}

function page(overrides = {}) {
  const {
    title = "Example",
    status = "current",
    authority = "explanatory",
    scope = "sprint0",
    last_verified = "2026-08-01",
    sources = ["README.md"],
    related,
    supersedes,
    body = "## Overview\n\nOk.\n",
  } = overrides;
  const lines = [
    "---",
    `title: ${title}`,
    `status: ${status}`,
    `authority: ${authority}`,
    `scope: ${scope}`,
    "sources:",
    ...sources.map((s) => `  - ${s}`),
    `last_verified: ${last_verified}`,
  ];
  if (related !== undefined) {
    lines.push("related:");
    for (const item of related) {
      lines.push(`  - ${item}`);
    }
  }
  if (supersedes !== undefined) {
    lines.push("supersedes:");
    for (const item of supersedes) {
      lines.push(`  - ${item}`);
    }
  }
  lines.push("---", "", body);
  return `${lines.join("\n")}\n`;
}

test("accepts real relative path, commit, annotated and lightweight tags, current and pending", () => {
  withTempDir((dir) => {
    const commitSha = initGitRepo(dir);
    git(dir, ["tag", "-a", "sprint0-complete", "-m", "complete"]);
    git(dir, ["tag", "light-tag"]);

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        title: "Index",
        status: "current",
        sources: ["README.md", `commit:${commitSha}`, "tag:sprint0-complete", "tag:light-tag"],
        related: ["pending.md"],
        body: "See [pending](pending.md).\n",
      }),
      "docs/wiki/pending.md": page({
        title: "Pending",
        status: "pending",
        sources: ["README.md"],
      }),
    });

    assertCommitExists(commitSha, dir);
    assertTagExists("sprint0-complete", dir);
    assertTagExists("light-tag", dir);

    const result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(result.errors.length, 0, result.errors.join("\n"));
    assert.equal(result.fileCount, 2);
  });
});

test("rejects missing commit and non-commit git object", () => {
  withTempDir((dir) => {
    const commitSha = initGitRepo(dir);
    const treeSha = git(dir, ["rev-parse", `${commitSha}^{tree}`]);
    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: [`commit:${"a".repeat(40)}`],
      }),
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => /commit object does not exist|does not exist/.test(e)));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: [`commit:${treeSha}`],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("expected git object type commit, got tree")));

    assert.throws(() => assertCommitExists("deadbeef", dir), /40-character/);
  });
});

test("rejects missing and empty tags", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: ["tag:does-not-exist"],
      }),
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("tag does not exist")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: ["tag:"],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => /tag name is empty|invalid tag/.test(e)));

    assert.throws(() => assertTagExists("", dir), /empty/);
  });
});

test("rejects POSIX absolute, Windows absolute, and repo-escaping paths", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: ["/etc/hosts"],
        body: "See [hosts](/etc/hosts).\n",
      }),
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("/etc/hosts")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: ["C:\\Windows\\System32"],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => /absolute|forbidden/i.test(e)));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: ["../outside-of-repo-should-fail"],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("escapes repository root")));

    const escapeLink = resolveRepoSourcePath(dir, "../../nope");
    assert.equal(escapeLink.ok, false);

    writeWiki(dir, {
      "docs/wiki/nested/page.md": page({
        sources: ["README.md"],
        body: "See [escape](../../../../etc/hosts).\n",
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(
      result.errors.some((e) => e.includes("escapes repository root") || e.includes("absolute")),
    );

    assert.equal(isPathInsideRepo(dir, join(dir, "README.md")), true);
    assert.equal(isPathInsideRepo(dir, join(dir, "..", "nope")), false);
  });
});

test("rejects missing related and supersedes", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page({
        related: ["missing.md"],
      }),
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("related") && e.includes("does not exist")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        supersedes: ["old.md"],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("supersedes") && e.includes("does not exist")));
  });
});

test("rejects bad authority, status, title, date, and empty sources", () => {
  withTempDir((dir) => {
    initGitRepo(dir);

    writeWiki(dir, {
      "docs/wiki/index.md": page({ authority: "canonical" }),
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("authority must be explanatory")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({ status: "draft" }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("status must be one of")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({ title: "" }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("title must be")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({ last_verified: "2026-02-30" }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("last_verified")));
    assert.equal(isValidIsoDate("2026-02-30"), false);
    assert.equal(isValidIsoDate("2026-08-01"), true);

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
last_verified: 2026-08-01
---

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("sources must contain at least one")));
  });
});

test("resolveWikiRelativePath rejects file URLs and accepts in-page anchors", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    const file = join(dir, "docs", "wiki", "index.md");
    mkdirSync(join(dir, "docs", "wiki"), { recursive: true });
    writeFileSync(file, page(), "utf8");
    const bad = resolveWikiRelativePath(dir, file, "file:///tmp/x");
    assert.equal(bad.ok, false);
    const anchor = resolveWikiRelativePath(dir, file, "#section");
    assert.equal(anchor.ok, true);
  });
});

test("temp directories are removed after success and failure", () => {
  /** @type {string[]} */
  const created = [];
  withTempDir((dir) => {
    created.push(dir);
    initGitRepo(dir);
    assert.equal(existsSync(dir), true);
  });
  assert.equal(existsSync(created[0]), false);

  try {
    withTempDir((dir) => {
      created.push(dir);
      throw new Error("boom");
    });
  } catch {
    // expected
  }
  assert.equal(existsSync(created[1]), false);
});

test("commit object type: commit passes; tree/blob/tag/missing/short fail", () => {
  withTempDir((dir) => {
    const commitSha = initGitRepo(dir);
    const treeSha = git(dir, ["rev-parse", `${commitSha}^{tree}`]);
    const blobSha = git(dir, ["hash-object", "-w", "README.md"]);
    git(dir, ["tag", "-a", "anno", "-m", "annotated"]);
    const tagObjectSha = git(dir, ["rev-parse", "anno"]);
    const tagType = git(dir, ["cat-file", "-t", tagObjectSha]);
    assert.equal(tagType, "tag");

    assertCommitExists(commitSha, dir);
    assert.throws(() => assertCommitExists(treeSha, dir), /got tree/);
    assert.throws(() => assertCommitExists(blobSha, dir), /got blob/);
    assert.throws(() => assertCommitExists(tagObjectSha, dir), /got tag/);
    assert.throws(() => assertCommitExists("a".repeat(40), dir), /does not exist/);
    assert.throws(() => assertCommitExists(commitSha.slice(0, 7), dir), /40-character/);

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        sources: [`commit:${tagObjectSha}`],
      }),
    });
    const result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("expected git object type commit, got tag")));
  });
});

test("related/supersedes must stay under wikiRoot; ../../SPEC.md fails", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page({
        related: ["other.md"],
      }),
      "docs/wiki/other.md": page({
        title: "Other",
      }),
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(result.errors.length, 0, result.errors.join("\n"));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        related: ["../../SPEC.md"],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(
      result.errors.some((e) => e.includes("related") && e.includes("escapes allowed root")),
    );

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        related: ["../SPEC.md"],
      }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("related")));
  });
});

test("wiki tree allows .md and directories; rejects junk files and empty-dir policy is explicit", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page(),
      "docs/wiki/sub/page.md": page({ title: "Sub" }),
    });
    mkdirSync(join(dir, "docs", "wiki", "empty-dir"), { recursive: true });
    assert.equal(EMPTY_WIKI_DIRECTORIES_ALLOWED, true);
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(result.errors.length, 0, result.errors.join("\n"));

    writeFileSync(join(dir, "docs", "wiki", "junk.bin"), "x", "utf8");
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("junk.bin")));

    rmSync(join(dir, "docs", "wiki", "junk.bin"));
    writeFileSync(join(dir, "docs", "wiki", "diagram.png"), "x", "utf8");
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("diagram.png")));
  });
});

test("classifyWikiEntry distinguishes symlink, markdown, and other files", () => {
  const markdown = classifyWikiEntry(
    {
      name: "page.md",
      isSymbolicLink: () => false,
      isFile: () => true,
      isDirectory: () => false,
    },
    "/tmp/page.md",
    {
      lstatSync: () =>
        /** @type {import("node:fs").Stats} */ ({
          isSymbolicLink: () => false,
          isDirectory: () => false,
          isFile: () => true,
        }),
    },
  );
  assert.equal(markdown.kind, "markdown");

  const symlink = classifyWikiEntry(
    {
      name: "link.md",
      isSymbolicLink: () => true,
      isFile: () => false,
      isDirectory: () => false,
    },
    "/tmp/link.md",
    {
      lstatSync: () =>
        /** @type {import("node:fs").Stats} */ ({
          isSymbolicLink: () => true,
          isDirectory: () => false,
          isFile: () => false,
        }),
    },
  );
  assert.equal(symlink.kind, "symlink");

  const bin = classifyWikiEntry(
    {
      name: "junk.bin",
      isSymbolicLink: () => false,
      isFile: () => true,
      isDirectory: () => false,
    },
    "/tmp/junk.bin",
    {
      lstatSync: () =>
        /** @type {import("node:fs").Stats} */ ({
          isSymbolicLink: () => false,
          isDirectory: () => false,
          isFile: () => true,
        }),
    },
  );
  assert.equal(bin.kind, "non-markdown-file");
});

test("wiki tree rejects symlink files and directories when creatable", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page(),
      "docs/wiki/real.md": page({ title: "Real" }),
    });
    const linkFile = join(dir, "docs", "wiki", "link.md");
    const createdFile = trySymlink(join(dir, "docs", "wiki", "real.md"), linkFile, "file");
    if (createdFile) {
      const result = verifyWikiTree({
        repoRoot: dir,
        wikiRoot: join(dir, "docs", "wiki"),
        gitCwd: dir,
      });
      assert.ok(result.errors.some((e) => e.includes("link.md") && e.includes("symbolic link")));
      rmSync(linkFile);
    }

    const linkDir = join(dir, "docs", "wiki", "link-dir");
    const createdDir = trySymlink(join(dir, "docs", "wiki"), linkDir, "dir");
    if (createdDir) {
      const result = verifyWikiTree({
        repoRoot: dir,
        wikiRoot: join(dir, "docs", "wiki"),
        gitCwd: dir,
      });
      assert.ok(result.errors.some((e) => e.includes("link-dir") && e.includes("symbolic link")));
      rmSync(linkDir);
    }

    if (!createdFile && !createdDir) {
      // Windows without symlink privilege: Dirent classification is covered above.
      assert.equal(
        classifyWikiEntry(
          {
            name: "x",
            isSymbolicLink: () => true,
            isFile: () => false,
            isDirectory: () => false,
          },
          "x",
          {
            lstatSync: () =>
              /** @type {import("node:fs").Stats} */ ({
                isSymbolicLink: () => true,
                isDirectory: () => false,
                isFile: () => false,
              }),
          },
        ).kind,
        "symlink",
      );
    }
  });
});

test("symlink escape via markdown link or related is rejected when creatable", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    const outside = join(dir, "..", `outside-${String(process.pid)}.txt`);
    writeFileSync(outside, "secret\n", "utf8");
    try {
      writeWiki(dir, {
        "docs/wiki/index.md": page({
          body: "See [escape](escape-link).\n",
        }),
        "docs/wiki/inside.md": page({ title: "Inside" }),
      });
      const escapeLink = join(dir, "docs", "wiki", "escape-link");
      const createdOutside = trySymlink(outside, escapeLink, "file");
      if (createdOutside) {
        const result = verifyWikiTree({
          repoRoot: dir,
          wikiRoot: join(dir, "docs", "wiki"),
          gitCwd: dir,
        });
        assert.ok(
          result.errors.some(
            (e) =>
              e.includes("escape-link") ||
              e.includes("realpath") ||
              e.includes("symbolic link") ||
              e.includes("escapes"),
          ),
          result.errors.join("\n"),
        );
      }

      writeWiki(dir, {
        "docs/wiki/index.md": page({
          related: ["spec-link.md"],
        }),
      });
      const specLink = join(dir, "docs", "wiki", "spec-link.md");
      const createdSpec = trySymlink(join(dir, "docs", "SPEC.md"), specLink, "file");
      if (createdSpec) {
        // Symlink entry itself is forbidden in the tree.
        const result = verifyWikiTree({
          repoRoot: dir,
          wikiRoot: join(dir, "docs", "wiki"),
          gitCwd: dir,
        });
        assert.ok(result.errors.some((e) => e.includes("spec-link.md")));
      }
    } finally {
      rmSync(outside, { force: true });
    }
  });
});

test("inspectWikiTreeEntries reports non-markdown and allows empty directories", () => {
  withTempDir((dir) => {
    const wikiRoot = join(dir, "docs", "wiki");
    mkdirSync(join(wikiRoot, "empty"), { recursive: true });
    writeFileSync(join(wikiRoot, "ok.md"), page(), "utf8");
    writeFileSync(join(wikiRoot, "nope.txt"), "x", "utf8");
    const inspection = inspectWikiTreeEntries(wikiRoot);
    assert.ok(inspection.markdownFiles.some((f) => f.endsWith("ok.md")));
    assert.ok(inspection.errors.some((e) => e.includes("nope.txt")));
  });
});

test("wikiRoot itself must be a regular directory under repoRoot", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": page(),
    });
    const ok = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(ok.errors.length, 0, ok.errors.join("\n"));

    const missing = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "missing-wiki"),
      gitCwd: dir,
    });
    assert.ok(missing.errors.some((e) => /does not exist|wikiRoot/.test(e)));

    const fileAsRoot = join(dir, "docs", "wiki-file");
    writeFileSync(fileAsRoot, "x", "utf8");
    const asFile = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: fileAsRoot,
      gitCwd: dir,
    });
    assert.ok(asFile.errors.some((e) => e.includes("not a file") || e.includes("directory")));

    const outside = join(dir, "..", `wiki-outside-${String(process.pid)}`);
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "index.md"), page(), "utf8");
    try {
      const linkOutside = join(dir, "docs", "wiki-link-out");
      const createdOut = trySymlink(outside, linkOutside, "dir");
      if (createdOut) {
        const result = verifyWikiTree({
          repoRoot: dir,
          wikiRoot: linkOutside,
          gitCwd: dir,
        });
        assert.ok(
          result.errors.some((e) => /symbolic link|junction|escapes/.test(e)),
          result.errors.join("\n"),
        );
        rmSync(linkOutside, { force: true });
      }

      const otherDir = join(dir, "docs", "other-dir");
      mkdirSync(otherDir, { recursive: true });
      writeFileSync(join(otherDir, "index.md"), page(), "utf8");
      const linkInside = join(dir, "docs", "wiki-link-in");
      const createdIn = trySymlink(otherDir, linkInside, "dir");
      if (createdIn) {
        const result = verifyWikiTree({
          repoRoot: dir,
          wikiRoot: linkInside,
          gitCwd: dir,
        });
        assert.ok(
          result.errors.some((e) => /symbolic link|junction/.test(e)),
          result.errors.join("\n"),
        );
        rmSync(linkInside, { force: true });
      }

      if (!createdOut && !createdIn) {
        const classified = classifyWikiRootPath(join(dir, "docs", "wiki"), {
          lstatSync: () =>
            /** @type {import("node:fs").Stats} */ ({
              isSymbolicLink: () => true,
              isDirectory: () => false,
              isFile: () => false,
            }),
        });
        assert.equal(classified.kind, "symlink");
        const validated = validateWikiRoot(dir, join(dir, "docs", "wiki"), {
          classify: () => ({ kind: "symlink", detail: "symbolic link" }),
        });
        assert.equal(validated.ok, false);
      }
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }

    const realpathFail = validateWikiRoot(dir, join(dir, "docs", "wiki"), {
      classify: () => ({ kind: "directory", detail: "directory" }),
      realpathSync: () => {
        throw new Error("boom");
      },
    });
    assert.equal(realpathFail.ok, false);
    assert.match(realpathFail.reason, /realpath failed/);
  });
});

test("rejects duplicate front matter keys for scalars and lists", () => {
  withTempDir((dir) => {
    initGitRepo(dir);
    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
status: invalid
authority: explanatory
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01
---

Body.
`,
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("duplicate") && e.includes("status")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
authority: canonical
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01
---

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("duplicate") && e.includes("authority")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
  - README.md
sources:
  - tag:sprint0-complete
last_verified: 2026-08-01
---

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("duplicate") && e.includes("sources")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01
related:
  - other.md
related:
  - other.md
---

Body.
`,
      "docs/wiki/other.md": page({ title: "Other" }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("duplicate") && e.includes("related")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01
supersedes:
  - old.md
supersedes:
  - older.md
---

Body.
`,
      "docs/wiki/old.md": page({ title: "Old" }),
      "docs/wiki/older.md": page({ title: "Older" }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("duplicate") && e.includes("supersedes")));

    writeWiki(dir, {
      "docs/wiki/index.md": page({
        related: ["other.md"],
      }),
      "docs/wiki/other.md": page({ title: "Other" }),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(result.errors.length, 0, result.errors.join("\n"));
  });
});

test("strict front matter delimiters and block-list sources", () => {
  withTempDir((dir) => {
    initGitRepo(dir);

    writeWiki(dir, {
      "docs/wiki/index.md":
        "---\r\ntitle: Example\r\nstatus: current\r\nauthority: explanatory\r\nscope: sprint0\r\nsources:\r\n  - README.md\r\nlast_verified: 2026-08-01\r\n---\r\n\r\nBody.\r\n",
    });
    let result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(result.errors.length, 0, result.errors.join("\n"));

    writeWiki(dir, {
      "docs/wiki/index.md": page(),
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.equal(result.errors.length, 0, result.errors.join("\n"));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01
---x

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("malformed") || e.includes("front matter")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01
----

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("malformed") || e.includes("front matter")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources:
  - README.md
last_verified: 2026-08-01

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("malformed") || e.includes("front matter")));

    writeWiki(dir, {
      "docs/wiki/index.md": `---
title: Example
status: current
authority: explanatory
scope: sprint0
sources: README.md
last_verified: 2026-08-01
---

Body.
`,
    });
    result = verifyWikiTree({
      repoRoot: dir,
      wikiRoot: join(dir, "docs", "wiki"),
      gitCwd: dir,
    });
    assert.ok(result.errors.some((e) => e.includes("block list") || e.includes("scalar")));
  });
});
