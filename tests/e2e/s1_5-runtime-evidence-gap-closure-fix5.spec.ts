import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * FIX5 evidence path, realigned to FIX6:
 * - Cold mock: adults eligible at world start; zero automatic simulation-step.
 * - Events during update: open Events while an explicit year step is in flight.
 */

const EVIDENCE_ROOT =
  "_handoff-artifacts/audit/current/S1_5-RUNTIME-EVIDENCE-GAP-CLOSURE-FIX5-20260819";
const STEP_WEEKS_ONE_YEAR = 48;

type BrowserJson = {
  ok?: boolean;
  status: number;
  body: {
    ok?: boolean;
    uiRevision?: number;
    isUpdating?: boolean;
    data?: Record<string, unknown>;
    error?: { code?: string; message?: string };
  };
};

async function browserJson(
  page: Page,
  input: { url: string; method?: string; csrf?: string; body?: unknown },
): Promise<BrowserJson> {
  return page.evaluate(async (spec) => {
    const headers: Record<string, string> = {};
    if (spec.method === "POST") {
      headers["content-type"] = "application/json";
    }
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

async function shot(page: Page, project: string, name: string): Promise<string> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function writeNetworkNote(project: string, name: string, payload: unknown): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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
  if (start.ok !== true) {
    throw new Error(
      `simulation start failed: ${String(start.status)} ${JSON.stringify(start.body)}`,
    );
  }
}

async function resetWorld(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { csrf, uiRevision } = await sessionCsrf(page);
    const reset = await browserJson(page, {
      url: "/api/s1_5/simulation/reset",
      method: "POST",
      csrf,
      body: {
        requestId: crypto.randomUUID(),
        expectedUiRevision: uiRevision,
      },
    });
    if (reset.ok === true) return;
    const code = reset.body.error?.code;
    if (reset.status === 409 && code === "SIMULATION_NOT_STARTED") return;
    if (reset.status === 409 && (code === "STALE_UI_REVISION" || code === "UPDATE_IN_PROGRESS")) {
      await page.waitForTimeout(300);
      continue;
    }
    throw new Error(
      `simulation reset failed: ${String(reset.status)} ${JSON.stringify(reset.body)}`,
    );
  }
  throw new Error("simulation reset failed after retries");
}

async function eventsTotalCount(page: Page): Promise<number> {
  const eventsApi = await browserJson(page, { url: "/api/s1_5/events?limit=100" });
  if (eventsApi.ok !== true) {
    throw new Error(`events api ${String(eventsApi.status)} ${JSON.stringify(eventsApi.body)}`);
  }
  const total = eventsApi.body.data?.totalCount;
  if (typeof total !== "number") {
    throw new Error(`events api missing totalCount: ${JSON.stringify(eventsApi.body)}`);
  }
  return total;
}

async function mockCandidatesCount(page: Page): Promise<number> {
  const candidatesApi = await browserJson(page, {
    url: "/api/s1_5/mock-battles/candidates?limit=50",
  });
  if (candidatesApi.ok !== true) {
    throw new Error(
      `mock candidates api ${String(candidatesApi.status)} ${JSON.stringify(candidatesApi.body)}`,
    );
  }
  const items = Array.isArray(candidatesApi.body.data?.items) ? candidatesApi.body.data.items : [];
  return items.length;
}

test.describe("S1.5 runtime evidence gap closure FIX5", () => {
  test.describe.configure({ timeout: 600_000 });

  test("cold mock adults + Events during explicit step contention", async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();

    const coldSeed = 42;
    await writeNetworkNote(project, "cold-seed", { coldSeed });

    // -----------------------------
    // Scenario 1: Cold mock path (no auto-advance)
    // -----------------------------
    await resetWorld(page);
    await startWorld(page, coldSeed);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    const stepPosts: Array<{ weeks: number; startedAt: number }> = [];
    const requestHandler = (request: {
      method: () => string;
      url: () => string;
      postData: () => string | null;
    }) => {
      try {
        if (request.method() !== "POST") return;
        const url = request.url() ?? "";
        if (!url.includes("/api/s1_5/simulation/step")) return;
        const postData = request.postData() ?? undefined;
        if (!postData) return;
        const parsed = JSON.parse(postData) as { weeks?: unknown };
        const weeks = typeof parsed.weeks === "number" ? parsed.weeks : null;
        if (weeks === STEP_WEEKS_ONE_YEAR) {
          stepPosts.push({ weeks, startedAt: Date.now() });
        }
      } catch {
        // ignore
      }
    };
    page.on("request", requestHandler);

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-battle-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "確認専用模擬戦" })).toBeVisible();
    await expect(page.getByText(/模擬戦の対象年齢まで世界を進めています/)).toHaveCount(0);
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    await shot(page, project, "fix5-cold-mock-candidates-loaded");

    const apiCount = await mockCandidatesCount(page);
    expect(apiCount).toBeGreaterThanOrEqual(2);

    await expect(page.getByTestId("mock-select-two-hint")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("mock-battle-run")).toBeDisabled();

    const options = page.locator("#mock-participant-a option");
    const values = await options.evaluateAll((nodes) =>
      nodes
        .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
        .filter((value) => value.length > 0),
    );
    expect(values.length).toBeGreaterThanOrEqual(2);

    const eventsBeforeMock = await eventsTotalCount(page);
    const a = values[0]!;
    const b = values[1]!;
    await page.getByTestId("mock-participant-a").selectOption(a);
    await page.getByTestId("mock-participant-b").selectOption(b);
    await expect(page.getByTestId("mock-battle-run")).toBeEnabled();
    await shot(page, project, "fix5-cold-mock-select");

    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("mock-battle-summary")).toContainText("勝者");
    await shot(page, project, "fix5-cold-mock-result");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-log-status")).toHaveAttribute("data-status", "success", {
      timeout: 20_000,
    });
    await expect(page.getByTestId("battle-log-items").locator("li")).not.toHaveCount(0);
    await shot(page, project, "fix5-cold-mock-battle-log");

    const eventsAfterMock = await eventsTotalCount(page);
    await writeNetworkNote(project, "fix5-cold-events-totalCount", {
      before: eventsBeforeMock,
      after: eventsAfterMock,
    });
    page.off("request", requestHandler);
    await writeNetworkNote(project, "fix5-cold-simulation-step-count", {
      stepPostsWeeks48: stepPosts.length,
    });
    expect(stepPosts.length).toBe(0);
    expect(eventsAfterMock).toBe(eventsBeforeMock);

    // -----------------------------
    // Scenario 2: Events during explicit year-step contention
    // -----------------------------
    await resetWorld(page);
    await startWorld(page, coldSeed);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    const stepPromise = page.getByTestId("simulation-step-48").click();
    await page.locator('[data-menu-item="イベント"]').click();
    await expect(page).toHaveURL(/\/events/, { timeout: 60_000 });
    await expect(page.getByTestId("events-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("events-status")).not.toHaveAttribute("data-status", "loading", {
      timeout: 240_000,
    });
    await expect(page.getByTestId("events-items").locator("li")).not.toHaveCount(0, {
      timeout: 240_000,
    });
    await expect(page.locator(".dw-event-when").first()).toBeVisible();
    await expect(page.locator(".dw-event-what").first()).toBeVisible();
    await shot(page, project, "fix5-events-during-contention");
    await stepPromise.catch(() => undefined);

    await page.goto("/events?tab=validation");
    await expect(page.getByTestId("events-page")).toHaveAttribute("data-active-tab", "validation");
    await expect(page.getByTestId("validation-status")).not.toHaveAttribute(
      "data-status",
      "loading",
      { timeout: 240_000 },
    );
    await shot(page, project, "fix5-events-during-contention-validation");
  });
});
