import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { publishTaskResult } from "../lib/publish-result.mjs";

test("publishTaskResult writes canonical results path", async () => {
  const handoffRoot = await mkdtemp(path.join(os.tmpdir(), "pub-result-"));
  const taskKey = "TEST-RESULT-A";
  const resultPath = await publishTaskResult({
    handoffRoot,
    taskKey,
    headerFields: { state: "READY", terminal: "OK" },
    body: "Evidence body.",
  });
  const text = await readFile(resultPath, "utf8");
  assert.match(text, /^# TEST-RESULT-A/m);
  assert.match(text, /state: READY/);
  assert.match(text, /Evidence body\./);

  await rm(handoffRoot, { recursive: true, force: true });
});
