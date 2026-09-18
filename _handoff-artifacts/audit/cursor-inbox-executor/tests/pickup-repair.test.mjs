import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { selectAuthoritativeInbox } from "../lib/authoritative-inbox.mjs";
import { ensureInstructionAvailable, githubInstructionRepoPath } from "../lib/ensure-instruction.mjs";
import { evaluatePickup } from "../lib/pickup.mjs";

test("stale local PREPARED/task A + newer GitHub PREPARED/task B => task B selected", () => {
  const localRead = {
    fields: {
      state: "PREPARED",
      "task-key": "TASK-A-STALE",
      "control-authority": "GitHub",
    },
    source: "audit-mirror",
    inboxPathForPrompt: "/tmp/local-inbox.md",
  };
  const remoteFields = {
    state: "PREPARED",
    "task-key": "TASK-B-FRESH",
    "control-authority": "GitHub",
    "instruction-path":
      "_handoff-artifacts/tasks/TASK-B-FRESH/instruction.md",
  };

  const selected = selectAuthoritativeInbox({
    localRead,
    remoteFields,
    canonicalPath: "/tmp/canonical-inbox.md",
  });

  assert.equal(selected.source, "github-remote");
  assert.equal(selected.fields["task-key"], "TASK-B-FRESH");
  assert.equal(selected.fields.state, "PREPARED");

  const pickup = evaluatePickup(selected.fields, {
    state: "IDLE",
    lastCompletedTask: "TASK-A-STALE",
    terminal: "READY / TASK_A_READY",
  });
  assert.equal(pickup.invoke, true);
  assert.equal(pickup.reason, "ACTIVE_IDLE");
});

test("GitHub unavailable => existing local fallback remains usable", () => {
  const localRead = {
    fields: {
      state: "PREPARED",
      "task-key": "LOCAL-ONLY",
    },
    source: "audit-mirror",
    inboxPathForPrompt: "/tmp/local-inbox.md",
  };
  const selected = selectAuthoritativeInbox({
    localRead,
    remoteFields: null,
    canonicalPath: "/tmp/canonical-inbox.md",
  });
  assert.equal(selected.source, "audit-mirror");
  assert.equal(selected.fields["task-key"], "LOCAL-ONLY");
});

test("local instruction missing + GitHub instruction present => materialize and proceed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ensure-instr-"));
  const handoffRoot = path.join(root, "_handoff-artifacts");
  const auditDir = path.join(handoffRoot, "audit");
  await mkdir(auditDir, { recursive: true });

  const taskKey = "TASK-B-FRESH";
  const inbox = {
    state: "PREPARED",
    "task-key": taskKey,
    "instruction-path": `_handoff-artifacts/tasks/${taskKey}/instruction.md`,
    "required-repository": "thin-bt/dollworld",
    "required-branch": "master",
  };

  assert.equal(
    githubInstructionRepoPath(inbox),
    `_handoff-artifacts/tasks/${taskKey}/instruction.md`,
  );

  const body = `# ${taskKey}\n\nDo the work.\n`;
  const ensured = await ensureInstructionAvailable({
    inbox,
    auditDir,
    fetchText: async () => body,
  });

  assert.equal(ensured.source, "github-materialized");
  assert.ok(ensured.instructionPath);
  const written = await readFile(ensured.instructionPath, "utf8");
  assert.equal(written, body);

  // Second call should hit local without fetch.
  let fetchCalls = 0;
  const again = await ensureInstructionAvailable({
    inbox,
    auditDir,
    fetchText: async () => {
      fetchCalls += 1;
      return "SHOULD_NOT_RUN";
    },
  });
  assert.equal(again.source, "local");
  assert.equal(fetchCalls, 0);

  await rm(root, { recursive: true, force: true });
});

test("GitHub instruction fetch miss keeps missing (no false local invent)", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ensure-miss-"));
  const handoffRoot = path.join(root, "_handoff-artifacts");
  const auditDir = path.join(handoffRoot, "audit");
  await mkdir(auditDir, { recursive: true });

  const ensured = await ensureInstructionAvailable({
    inbox: {
      state: "PREPARED",
      "task-key": "MISSING-TASK",
      "instruction-path":
        "_handoff-artifacts/tasks/MISSING-TASK/instruction.md",
    },
    auditDir,
    fetchText: async () => null,
  });
  assert.equal(ensured.source, "missing");

  await rm(root, { recursive: true, force: true });
});

test("same-task READY then plain PREPARED => ALREADY_COMPLETE (no loop)", () => {
  const pickup = evaluatePickup(
    {
      state: "PREPARED",
      "task-key": "TASK-R13",
      updatedAt: "2026-09-18T17:00:00+09:00",
    },
    {
      state: "IDLE",
      lastCompletedTask: "TASK-R13",
      terminal: "READY / TASK_R13_READY",
      completedAt: "2026-09-18T17:26:00+09:00",
      updatedAt: "2026-09-18T17:26:00+09:00",
    },
  );
  assert.equal(pickup.invoke, false);
  assert.equal(pickup.reason, "ALREADY_COMPLETE_SAME_TASK");
});

test("same-task READY then newer REDISPATCH PREPARED => invoke", () => {
  const pickup = evaluatePickup(
    {
      state: "PREPARED",
      "task-key": "TASK-R13",
      updatedAt: "2026-09-19T00:23:48+09:00",
      recovery: "PM_FAILOVER_GITHUB_FIRST_REDISPATCH_R13_0023_NO_ACTIVE_OR_TERMINAL",
    },
    {
      state: "IDLE",
      lastCompletedTask: "TASK-R13",
      "last-completed-task-key": "TASK-R13",
      terminal: "READY / TASK_R13_READY",
      completedAt: "2026-09-18T17:26:00+09:00",
      updatedAt: "2026-09-18T17:26:00+09:00",
    },
  );
  assert.equal(pickup.invoke, true);
  assert.equal(pickup.reason, "REDISPATCH_SAME_TASK");
});
