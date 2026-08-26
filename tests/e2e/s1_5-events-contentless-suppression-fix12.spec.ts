/**
 * FIX12 Chrome+Edge: ordinary Events must not wipe via same-page suppressLifecycleKeys.
 * Seed/scenario aligned with Cursor A S1_5-FIX11-MISSING-FORMAL-EVIDENCE (seed 42).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const EVIDENCE_ROOT =
  "_handoff-artifacts/audit/current/S1_5-EVENTS-CONTENTLESS-SUPPRESSION-FIX12-20260821";
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

async function pageAnalysis(page: Page): Promise<{
  cardCount: number;
  meta: string | null;
  techDev: string | null;
  growthOnly: string[];
  conditionOnly: string[];
  whatSample: string[];
}> {
  const cardCount = await page.getByTestId("events-items").locator("li").count();
  const meta = await page.getByTestId("events-meta").textContent();
  const techDev = await page
    .getByTestId("events-technical-count")
    .textContent()
    .catch(() => null);
  const whats = await page.locator(".dw-event-what").allInnerTexts();
  return {
    cardCount,
    meta,
    techDev,
    growthOnly: whats.filter((w) => /が成長した$/.test(w)),
    conditionOnly: whats.filter((w) => /コンディションが更新された$/.test(w)),
    whatSample: whats.slice(0, 5),
  };
}

test.describe("S1.5 FIX12 events contentless suppression", () => {
  test.describe.configure({ timeout: 360_000 });

  test("seed 42: ordinary Events nonempty; next+return; filter coherent", async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);
    await stepAcceptedYears(page, 4);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    const api = await browserJson(page, { url: "/api/s1_5/events?limit=100" });
    expect(api.ok).toBe(true);
    const apiItems = Array.isArray(api.body.data?.items) ? api.body.data.items : [];
    expect(apiItems.length).toBeGreaterThan(0);

    await page.goto("/events");
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const newest = await pageAnalysis(page);
    expect(newest.cardCount).toBeGreaterThan(0);
    expect(newest.meta ?? "").toMatch(/[1-9]\d*\s*件/);
    expect(newest.techDev ?? "").not.toMatch(/contentlessHidden=100\b/);
    expect(newest.growthOnly).toEqual([]);
    expect(newest.conditionOnly).toEqual([]);
    await shot(page, project, "01-events-newest");

    const next = page.getByTestId("events-next");
    let nextAnalysis = newest;
    if (await next.isEnabled()) {
      await next.click();
      await expect(page.getByTestId("events-status")).toHaveAttribute(
        "data-status",
        /success|empty/,
        {
          timeout: 60_000,
        },
      );
      nextAnalysis = await pageAnalysis(page);
      if ((await page.getByTestId("events-status").getAttribute("data-status")) === "success") {
        expect(nextAnalysis.cardCount).toBeGreaterThan(0);
        expect(nextAnalysis.techDev ?? "").not.toMatch(/contentlessHidden=100\b/);
        expect(nextAnalysis.growthOnly).toEqual([]);
        expect(nextAnalysis.conditionOnly).toEqual([]);
      }
      await shot(page, project, "02-events-next");
    }

    await page.getByTestId("events-reset-newest").click();
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const afterReturn = await pageAnalysis(page);
    expect(afterReturn.cardCount).toBeGreaterThan(0);
    expect(afterReturn.techDev ?? "").not.toMatch(/contentlessHidden=100\b/);
    await shot(page, project, "03-events-return-newest");

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
    const filteredStatus = await page.getByTestId("events-status").getAttribute("data-status");
    if (filteredStatus === "success") {
      await expect(page.getByTestId("events-items").locator("li").first()).toBeVisible({
        timeout: 60_000,
      });
    }
    const filtered = await pageAnalysis(page);
    if (filteredStatus === "success") {
      expect(filtered.cardCount).toBeGreaterThan(0);
      expect(filtered.techDev ?? "").not.toMatch(/contentlessHidden=100\b/);
    }
    await shot(page, project, "04-events-filtered-y4m1w1");

    await page.getByTestId("events-reset-newest").click();
    await expect(page.getByTestId("events-year")).toHaveValue("");
    await shot(page, project, "05-events-reset-after-filter");

    const labels = await page.locator(".dw-event-what").first().textContent();
    const ordinaryHasRawType =
      labels !== null && /training\.(action_selected|stat_growth_applied)/.test(labels);
    expect(ordinaryHasRawType).toBe(false);
    await shot(page, project, "06-events-human-vs-dev");

    await writeNote(project, "fix12-summary", {
      seed: 42,
      apiItemCount: apiItems.length,
      newest,
      next: nextAnalysis,
      afterReturn,
      filtered,
      reversePath: "events-reset-newest",
      hasDedicatedPrev: false,
    });
  });
});
