import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeHasTerminalForTask,
  buildConsumedInboxMarkdown,
  readActiveTerminal,
  terminalStringIndicatesComplete,
} from "../lib/consume-inbox.mjs";
import { publishTerminalToGitHub } from "../lib/publish-terminal-github.mjs";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("buildConsumedInboxMarkdown sets IDLE and last-consumed", () => {
  const md = buildConsumedInboxMarkdown({
    lane: "A",
    taskKey: "TASK-1",
    terminal: "READY / TASK_1_READY",
    updatedAt: "2026-09-19T00:40:00+09:00",
    previous: { sprint: "Sprint2" },
  });
  assert.match(md, /^state: IDLE$/m);
  assert.match(md, /^task-key: \(none\)$/m);
  assert.match(md, /^last-consumed-task-key: TASK-1$/m);
  assert.match(md, /^last-terminal: READY \/ TASK_1_READY$/m);
  assert.match(md, /results\/TASK-1\/result\.md/);
});

test("activeHasTerminalForTask requires matching completed key + terminal class", () => {
  assert.equal(
    activeHasTerminalForTask(
      {
        state: "IDLE",
        lastCompletedTask: "TASK-1",
        terminal: "READY / TASK_1_READY",
      },
      "TASK-1",
    ),
    true,
  );
  assert.equal(
    activeHasTerminalForTask(
      {
        state: "IDLE",
        lastCompletedTask: "TASK-1",
        terminal: "READY / TASK_1_READY",
      },
      "TASK-2",
    ),
    false,
  );
  assert.equal(readActiveTerminal({ "last-terminal": "FIX_REQUIRED / X" }), "FIX_REQUIRED / X");
  assert.equal(terminalStringIndicatesComplete("READY_FOR_FORMAL_CLOSE"), true);
  assert.equal(
    activeHasTerminalForTask(
      {
        state: "IDLE",
        "last-completed-task":
          "SPRINT3-S03-034-POST-PUBLICATION-FORMAL-CLOSE-ELIGIBILITY-B2-20260921-R1",
        terminal: "READY_FOR_FORMAL_CLOSE",
      },
      "SPRINT3-S03-034-POST-PUBLICATION-FORMAL-CLOSE-ELIGIBILITY-B2-20260921-R1",
    ),
    true,
  );
});

test("publishTerminalToGitHub dryRun builds idle when terminal+result exist", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pub-term-"));
  const handoff = path.join(root, "_handoff-artifacts");
  const auditDir = path.join(handoff, "audit");
  const controlDir = path.join(handoff, "control");
  const taskKey = "TASK-PUB-1";
  await mkdir(auditDir, { recursive: true });
  await mkdir(controlDir, { recursive: true });
  await mkdir(path.join(handoff, "results", taskKey), { recursive: true });

  await writeFile(
    path.join(auditDir, "CURSOR_ACTIVE_TASK.md"),
    `state: IDLE
lastCompletedTask: ${taskKey}
terminal: READY / TASK_PUB_1_READY
`,
    "utf8",
  );
  await writeFile(
    path.join(handoff, "results", taskKey, "result.md"),
    `# ${taskKey}\nstate: READY\n`,
    "utf8",
  );
  await writeFile(
    path.join(controlDir, "CURSOR_A_INBOX.md"),
    `state: PREPARED
task-key: ${taskKey}
sprint: Sprint2
`,
    "utf8",
  );
  await writeFile(path.join(auditDir, "CURSOR_INBOX.md"), "state: PREPARED\n", "utf8");

  const out = await publishTerminalToGitHub({
    lane: "A",
    taskKey,
    auditDir,
    repoRoot: root,
    updatedAt: "2026-09-19T00:40:00+09:00",
    dryRun: true,
  });
  assert.equal(out.ok, true);
  assert.equal(out.reason, "DRY_RUN");
  assert.match(out.idleMarkdown, /^state: IDLE$/m);
  assert.match(out.idleMarkdown, new RegExp(`last-consumed-task-key: ${taskKey}`));

  await rm(root, { recursive: true, force: true });
});
