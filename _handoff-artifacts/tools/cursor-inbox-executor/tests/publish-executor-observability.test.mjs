import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  mirrorExecutorObservabilityLocal,
  publishExecutorObservabilityToGitHub,
} from "../lib/publish-executor-observability-github.mjs";

test("mirrorExecutorObservabilityLocal copies Active+heartbeat into control/", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "exec-obs-mirror-"));
  try {
    const auditDir = path.join(root, "_handoff-artifacts", "audit");
    const controlDir = path.join(root, "_handoff-artifacts", "control");
    await mkdir(auditDir, { recursive: true });
    await writeFile(
      path.join(auditDir, "CURSOR_ACTIVE_TASK.md"),
      "# A\nstate: ACTIVE\ntask-key: T1\n",
      "utf8",
    );
    await writeFile(
      path.join(auditDir, "CURSOR_A_EXECUTOR_HEARTBEAT.md"),
      "# hb\nstatus: INVOKING\nphase: AGENT_PROMPT_RUNNING\n",
      "utf8",
    );

    const result = await mirrorExecutorObservabilityLocal({ lane: "A", auditDir });
    assert.equal(result.ok, true);
    assert.equal(
      await readFile(path.join(controlDir, "CURSOR_A_ACTIVE_TASK.md"), "utf8"),
      "# A\nstate: ACTIVE\ntask-key: T1\n",
    );
    assert.match(
      await readFile(path.join(controlDir, "CURSOR_A_EXECUTOR_HEARTBEAT.md"), "utf8"),
      /AGENT_PROMPT_RUNNING/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publishExecutorObservabilityToGitHub dryRun does not push", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "exec-obs-dry-"));
  try {
    const auditDir = path.join(root, "_handoff-artifacts", "audit");
    await mkdir(auditDir, { recursive: true });
    await writeFile(path.join(auditDir, "CURSOR_B2_ACTIVE_TASK.md"), "state: IDLE\n", "utf8");
    await writeFile(path.join(auditDir, "CURSOR_B2_EXECUTOR_HEARTBEAT.md"), "status: IDLE\n", "utf8");

    const result = await publishExecutorObservabilityToGitHub({
      lane: "B2",
      auditDir,
      repoRoot: root,
      dryRun: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, "DRY_RUN");
    assert.equal(result.pushed, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
