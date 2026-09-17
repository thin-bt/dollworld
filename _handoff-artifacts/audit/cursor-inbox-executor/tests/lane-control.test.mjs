import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readLaneInbox } from "../lib/lane-control.mjs";
import { resolveInstructionPath } from "../lib/parse-control.mjs";

test("GitHub canonical inbox wins over audit mirror for PREPARED", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lane-control-"));
  const handoffRoot = path.join(root, "_handoff-artifacts");
  const auditDir = path.join(handoffRoot, "audit");
  const controlDir = path.join(handoffRoot, "control");
  await mkdir(auditDir, { recursive: true });
  await mkdir(controlDir, { recursive: true });

  await writeFile(
    path.join(auditDir, "CURSOR_INBOX.md"),
    `# Cursor A Inbox
state: IDLE
task-key: (none)
`,
    "utf8",
  );
  await writeFile(
    path.join(controlDir, "CURSOR_A_INBOX.md"),
    `# Cursor A Inbox
state: PREPARED
task-key: GITHUB-TASK-A
control-authority: GitHub
instruction-path: _handoff-artifacts/tasks/GITHUB-TASK-A/instruction.md
`,
    "utf8",
  );

  const inbox = await readLaneInbox("A", auditDir);
  assert.equal(inbox.source, "github-canonical");
  assert.equal(inbox.fields.state, "PREPARED");
  assert.equal(inbox.fields["task-key"], "GITHUB-TASK-A");

  await rm(root, { recursive: true, force: true });
});

test("audit mirror used when canonical missing — poll not blocked", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lane-mirror-"));
  const handoffRoot = path.join(root, "_handoff-artifacts");
  const auditDir = path.join(handoffRoot, "audit");
  await mkdir(auditDir, { recursive: true });

  await writeFile(
    path.join(auditDir, "CURSOR_INBOX.md"),
    `# Cursor A Inbox
state: PREPARED
task-key: LEGACY-TASK
instruction-path: _handoff-artifacts/audit/current/LEGACY-TASK/gpt-to-cursor-instruction.txt
`,
    "utf8",
  );

  const inbox = await readLaneInbox("A", auditDir);
  assert.equal(inbox.fields["task-key"], "LEGACY-TASK");
  assert.equal(inbox.fields.state, "PREPARED");

  await rm(root, { recursive: true, force: true });
});

test("resolveInstructionPath finds tasks/<task-key>/instruction.md", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "instr-path-"));
  const handoffRoot = path.join(root, "_handoff-artifacts");
  const auditDir = path.join(handoffRoot, "audit");
  const taskKey = "GITHUB-TASK-B";
  const instructionFile = path.join(handoffRoot, "tasks", taskKey, "instruction.md");
  await mkdir(path.dirname(instructionFile), { recursive: true });
  await writeFile(instructionFile, "task-key: GITHUB-TASK-B\n", "utf8");

  const resolved = await resolveInstructionPath({ "task-key": taskKey }, auditDir);
  assert.equal(resolved, instructionFile);

  await rm(root, { recursive: true, force: true });
});
