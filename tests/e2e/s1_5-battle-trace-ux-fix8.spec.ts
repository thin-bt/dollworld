/**
 * FIX8 Chrome+Edge: battle trace — turn groups, range JP, durability/mental, order notes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-BATTLE-TRACE-UX-FIX8-20260821",
);

type BrowserJson = {
  ok?: boolean;
  status: number;
  body: {
    ok?: boolean;
    uiRevision?: number;
    data?: Record<string, unknown>;
    error?: { code?: string };
  };
};

async function browserJson(
  page: Page,
  input: { url: string; method?: string; csrf?: string; body?: unknown },
): Promise<BrowserJson> {
  return page.evaluate(async (spec) => {
    const headers: Record<string, string> = {};
    if (spec.method === "POST") headers["content-type"] = "application/json";
    if (typeof spec.csrf === "string" && spec.csrf.length > 0) {
      headers["x-dollworld-csrf"] = spec.csrf;
    }
    const response = await fetch(spec.url, {
      method: spec.method ?? "GET",
      credentials: "same-origin",
      headers,
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: (await response.json()) as BrowserJson["body"],
    };
  }, input);
}

async function sessionCsrf(page: Page): Promise<{ csrf: string; uiRevision: number }> {
  const session = await browserJson(page, { url: "/api/s1_5/session" });
  expect(session.ok).toBe(true);
  const csrf = typeof session.body.data?.csrfToken === "string" ? session.body.data.csrfToken : "";
  expect(csrf.length).toBeGreaterThan(0);
  return { csrf, uiRevision: session.body.uiRevision ?? 0 };
}

async function resetWorld(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { csrf, uiRevision } = await sessionCsrf(page);
    const reset = await browserJson(page, {
      url: "/api/s1_5/simulation/reset",
      method: "POST",
      csrf,
      body: { requestId: crypto.randomUUID(), expectedUiRevision: uiRevision },
    });
    if (reset.ok) return;
    if (reset.status === 409 && reset.body.error?.code === "SIMULATION_NOT_STARTED") return;
    if (
      reset.status === 409 &&
      (reset.body.error?.code === "STALE_UI_REVISION" ||
        reset.body.error?.code === "UPDATE_IN_PROGRESS")
    ) {
      await page.waitForTimeout(300);
      continue;
    }
    throw new Error(`reset failed ${String(reset.status)}`);
  }
}

async function startWorld(page: Page, seed: number): Promise<void> {
  const { csrf, uiRevision } = await sessionCsrf(page);
  const start = await browserJson(page, {
    url: "/api/s1_5/simulation/start",
    method: "POST",
    csrf,
    body: {
      requestId: crypto.randomUUID(),
      expectedUiRevision: uiRevision,
      presetId: "sprint1-tiny-accepted",
      seed,
    },
  });
  expect(start.ok).toBe(true);
}

async function shot(page: Page, project: string, name: string): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function writeNote(project: string, name: string, payload: unknown): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test.describe("S1.5 FIX8 battle trace UX", () => {
  test.describe.configure({ timeout: 360_000 });

  test("mock battle timeline shows range / resources / human outcomes", async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    const values = await page
      .locator("#mock-participant-a option")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
          .filter((value) => value.length > 0),
      );
    expect(values.length).toBeGreaterThanOrEqual(2);
    await page.getByTestId("mock-participant-a").selectOption(values[0]!);
    await page.getByTestId("mock-participant-b").selectOption(values[1]!);
    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await shot(page, project, "fix8-mock-result");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-participant-status")).toBeVisible();
    await expect(page.getByTestId("battle-status-a-mental")).toContainText("精神力");
    await expect(page.getByTestId("battle-range-summary")).toBeVisible();
    const rangeText = await page.getByTestId("battle-range-summary").innerText();
    expect(rangeText).toMatch(/密着|近距離|中距離|遠距離/);

    await expect(page.locator(".dw-combat-turn").first()).toBeVisible();
    const primary = page.getByTestId("battle-log-items");
    // Exclude developer details from primary surface check (raw sideA may live there).
    const primaryText = await primary
      .locator(".dw-combat-turn-header, .dw-log-header, .dw-combat-effects, .dw-combat-state-strip")
      .allInnerTexts();
    const joined = primaryText.join("\n");
    expect(joined).not.toMatch(/\bsideA\b|\bsideB\b/);
    expect(joined).not.toMatch(/\{"kind"/);

    const firstOutcome = await page.getByTestId("battle-log-outcome-0").innerText();
    expect(firstOutcome.length).toBeGreaterThan(0);
    expect(firstOutcome).not.toMatch(/\btrue\b|\bfalse\b/);

    await expect(page.getByTestId("battle-log-next")).toBeDisabled();
    await shot(page, project, "fix8-battle-trace-top");
    await page.locator(".dw-combat-turn").last().scrollIntoViewIfNeeded();
    await shot(page, project, "fix8-battle-trace-end");

    await writeNote(project, "fix8-summary", {
      rangeLabels: ["密着", "近距離", "中距離", "遠距離"],
      mentalLabel: "精神力",
      durabilityLabel: "耐久",
      turnGrouped: true,
      contractGapsDocumented: [
        "per-action fatigue B/A",
        "numeric injury B/A",
        "turnOrderLogs why-first rolls",
        "dedicated evade/guard success flags",
      ],
    });
  });
});
