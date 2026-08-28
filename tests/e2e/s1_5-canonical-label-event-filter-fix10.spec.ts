/**
 * FIX10 Chrome+Edge: canonical labels, training lifecycle card, date filter + session.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-CANONICAL-LABEL-EVENT-FILTER-FIX10-20260821",
);
const STEP_WEEKS_ONE_YEAR = 48;

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
      credentials: "include",
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

async function stepAcceptedYears(page: Page, years: number): Promise<void> {
  for (let i = 0; i < years; i += 1) {
    const { csrf, uiRevision } = await sessionCsrf(page);
    const step = await browserJson(page, {
      url: "/api/s1_5/simulation/step",
      method: "POST",
      csrf,
      body: {
        requestId: crypto.randomUUID(),
        expectedUiRevision: uiRevision,
        weeks: STEP_WEEKS_ONE_YEAR,
      },
    });
    if (step.ok !== true) {
      throw new Error(
        `simulation step year ${String(i + 1)} failed: ${String(step.status)} ${JSON.stringify(step.body)}`,
      );
    }
  }
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

test.describe("S1.5 FIX10 canonical labels / event filter", () => {
  test.describe.configure({ timeout: 360_000 });

  test("labels + grouped training + date filter in session", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);
    await stepAcceptedYears(page, 3);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const head = await page.locator('[data-testid="people-table"] thead').innerText();
    expect(head).toContain("基礎能力");
    expect(head).not.toContain("技術");
    expect(head).not.toContain("精神（能力）");
    expect(head).not.toContain("素手");
    const abilityGrid = page.locator('[data-testid^="people-base-abilities-person_"]').first();
    await expect(abilityGrid).toBeVisible();
    const abilityText = await abilityGrid.innerText();
    for (const label of ["体力", "筋力", "技量", "速度", "精神", "魔力"]) {
      expect(abilityText).toContain(label);
    }
    await shot(page, project, "fix10-people-labels");

    await page.goto("/events");
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("events-year")).toHaveJSProperty("tagName", "SELECT");

    // Filter to one week so the page window contains full training lifecycles (no page-edge orphans).
    await page.getByTestId("events-year").selectOption("4");
    await page.getByTestId("events-month").selectOption("1");
    await page.getByTestId("events-week").selectOption("1");
    await page.getByTestId("events-apply-query").click();
    await expect(page.getByTestId("events-status")).toHaveAttribute(
      "data-status",
      /success|empty/,
      {
        timeout: 60_000,
      },
    );
    await expect(page.getByTestId("events-status")).not.toHaveAttribute(
      "data-error-code",
      "SESSION_REQUIRED",
    );
    const panelText = await page.locator('[data-testid="events-list-panel"]').innerText();
    expect(panelText).not.toContain("SESSION_REQUIRED: session cookie is required");
    await expect(page.locator('[data-testid="events-items"] .dw-event-what').first()).toBeVisible({
      timeout: 60_000,
    });
    const whats = await page.locator('[data-testid="events-items"] .dw-event-what').allInnerTexts();
    expect(whats.length).toBeGreaterThan(0);
    const growthOnly = whats.filter((w) => /が成長した$/.test(w));
    const conditionOnly = whats.filter((w) => /コンディションが更新された$/.test(w));
    expect(growthOnly.length).toBe(0);
    expect(conditionOnly.length).toBe(0);
    expect(whats.some((w) => /修行を行った$|休んだ$/.test(w))).toBe(true);
    await shot(page, project, "fix10-events-filtered");

    await page.getByTestId("events-reset-newest").click();
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("events-year")).toHaveValue("");
    await shot(page, project, "fix10-events-newest");

    await writeNote(project, "fix10-summary", {
      peopleLabelsCanonical: true,
      trainingLifecycleMerged: true,
      dateFilterNoSessionError: true,
      resetToNewest: true,
    });
  });
});
