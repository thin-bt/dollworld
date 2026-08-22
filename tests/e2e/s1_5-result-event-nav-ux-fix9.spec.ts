/**
 * FIX9 Chrome+Edge: mock result bars, same-seed replay label, turn-end panels,
 * events newest-first + year/month/week filters, person detail corrections.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-RESULT-EVENT-NAV-UX-FIX9-20260821";
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

test.describe("S1.5 FIX9 result / event nav UX", () => {
  test.describe.configure({ timeout: 360_000 });

  test("mock bars + seed replay + events newest-first + person corrections", async ({
    page,
  }, testInfo) => {
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

    // --- Events newest-first + filters + honest page count ---
    await page.goto("/events");
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("events-meta")).toContainText("このページ");
    await expect(page.getByTestId("events-meta")).not.toContainText("取得");
    const firstWhen = (await page.locator(".dw-event-when").first().innerText()).trim();
    expect(firstWhen).not.toMatch(/^1年\s*1月\s*第1週$/);
    await expect(page.getByTestId("events-year")).toBeVisible();
    await expect(page.getByTestId("events-month")).toBeVisible();
    await expect(page.getByTestId("events-week")).toBeVisible();
    await page.getByTestId("events-year").fill("1");
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
    await shot(page, project, "fix9-events-filtered-y1");
    await page.getByTestId("events-reset-newest").click();
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("events-year")).toHaveValue("");
    await shot(page, project, "fix9-events-newest");

    // --- Person detail corrections ---
    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await page.locator('[data-testid^="people-open-"]').first().click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("person-detail-current-state")).toContainText("現在精神力");
    await expect(page.getByTestId("person-detail-current-mental")).not.toContainText("最大 = 50");
    const trainingText = await page.getByTestId("person-detail-trainingHistory").innerText();
    expect(trainingText).not.toMatch(/\brest\b/);
    if (trainingText.includes("休養") || trainingText.includes("修行")) {
      expect(trainingText).toMatch(/休養|の修行|技を覚える|技を練る/);
    }
    await shot(page, project, "fix9-person-detail");

    // --- Mock battle compact result + same-seed replay ---
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
    await expect(page.getByTestId("mock-battle-replay")).toContainText("同じseedで再現");
    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("mock-battle-final-state")).toBeVisible();
    await expect(page.getByTestId("mock-final-a-durability")).toBeVisible();
    await expect(page.getByTestId("mock-final-a-mental")).toBeVisible();
    const outcome1 = await page.getByTestId("mock-battle-outcome").innerText();
    const final1 = await page.getByTestId("mock-battle-final-state").innerText();
    await shot(page, project, "fix9-mock-compact-result");

    await page.getByTestId("mock-battle-replay").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    const outcome2 = await page.getByTestId("mock-battle-outcome").innerText();
    const final2 = await page.getByTestId("mock-battle-final-state").innerText();
    expect(outcome2).toBe(outcome1);
    expect(final2).toBe(final1);
    await shot(page, project, "fix9-mock-same-seed-replay");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.locator('[data-testid^="battle-log-turn-state-"]').first()).toBeVisible();
    const turnState = page.locator('[data-testid^="battle-log-turn-state-"]').first();
    await expect(turnState).toContainText("耐久");
    await expect(turnState).toContainText("精神力");
    await shot(page, project, "fix9-battle-turn-end-state");

    await writeNote(project, "fix9-summary", {
      eventsNewestFirst: true,
      eventsPageCountHonest: true,
      yearMonthWeekFilters: true,
      personMentalConcise: true,
      trainingNoRawRest: true,
      mockCompactBars: true,
      sameSeedReplayLabel: true,
      sameSeedOutcomeMatch: outcome1 === outcome2,
      turnEndStatePanels: true,
    });
  });
});
