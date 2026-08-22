/**
 * FIX13 Chrome+Edge evidence: VR-03/04/05 presentation (developer density, JP range, JP empty).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-VISUAL-DEDEBUG-FIX13-B2-20260822";

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

async function writeProbe(
  project: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test.describe("S1.5 FIX13 visual dedebug VR-03/04/05", () => {
  test.describe.configure({ timeout: 360_000 });

  test("people JP range + person JP empty + disclosure density", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await shot(page, project, "01-home");

    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const rangeText = await page.getByTestId("people-range").innerText();
    expect(rangeText).toMatch(/全\d+/);
    expect(rangeText).not.toMatch(/\bof\b/);
    const peopleHtml = await page.getByTestId("dev-viewer-people").innerHTML();
    const openDevSummaries = (peopleHtml.match(/<summary>開発者情報<\/summary>/g) ?? []).length;
    expect(openDevSummaries).toBeLessThanOrEqual(2);
    expect(peopleHtml).not.toMatch(
      /data-testid="developer-details-person-[^"]+"[^>]*>[\s\S]*?<summary>/,
    );
    await shot(page, project, "02-people");
    await writeProbe(project, "02-people-probe", {
      rangeText,
      developerSummaryCount: openDevSummaries,
      englishOf: /\bof\b/.test(rangeText),
    });

    await page.locator('[data-testid^="people-open-"]').first().click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    const personHtml = await page.getByTestId("person-detail-page").innerHTML();
    expect(personHtml).not.toMatch(/>\s*empty\s*</);
    expect(personHtml).not.toMatch(/>\s*absent\s*</);
    const personDevCount = (personHtml.match(/<summary>開発者情報<\/summary>/g) ?? []).length;
    expect(personDevCount).toBe(1);
    await shot(page, project, "03-person-detail");
    await writeProbe(project, "03-person-probe", {
      emptyToken: />\s*empty\s*</.test(personHtml),
      absentToken: />\s*absent\s*</.test(personHtml),
      developerSummaryCount: personDevCount,
    });

    await page.goto("/events");
    await expect(page.getByTestId("events-status")).toHaveAttribute(
      "data-status",
      /success|empty/,
      {
        timeout: 60_000,
      },
    );
    const eventsHtml = await page.getByTestId("events-list-panel").innerHTML();
    const eventsDevCount = (eventsHtml.match(/<summary>開発者情報<\/summary>/g) ?? []).length;
    expect(eventsDevCount).toBeLessThanOrEqual(2);
    expect(eventsHtml).not.toMatch(/class="dw-event-item"[\s\S]*?<summary>開発者情報<\/summary>/);
    await shot(page, project, "04-events");
    await writeProbe(project, "04-events-probe", {
      developerSummaryCount: eventsDevCount,
      perCardDeveloper: /class="dw-event-item"[\s\S]*?<summary>開発者情報<\/summary>/.test(
        eventsHtml,
      ),
    });

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      /success|empty/,
      { timeout: 60_000 },
    );
    await shot(page, project, "05-mock");
  });
});
