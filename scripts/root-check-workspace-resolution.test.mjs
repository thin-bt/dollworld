import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @returns {Record<string, string>}
 */
function readRootScripts() {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  return pkg.scripts ?? {};
}

test("npm run test builds workspace dist exports before vitest", () => {
  const scripts = readRootScripts();
  const pretest = scripts.pretest ?? "";
  assert.match(
    pretest,
    /npm run build --workspaces --if-present/,
    "pretest must build all workspaces so @shared-world/* dist exports resolve during vitest",
  );
});

test("root check still reaches build after test and wiki gates", () => {
  const check = readRootScripts().check ?? "";
  const segments = check.split("&&").map((part) => part.trim());
  const testIndex = segments.findIndex((part) => part === "npm run test");
  const buildIndex = segments.findIndex((part) => part === "npm run build");
  assert.ok(testIndex >= 0, "check must run npm run test");
  assert.ok(buildIndex > testIndex, "check must still finish with npm run build after test");
});
