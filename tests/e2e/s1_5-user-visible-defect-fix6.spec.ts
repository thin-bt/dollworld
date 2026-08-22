/**
 * FIX6 evidence: cold start mock candidates (>=2 adults) with zero auto simulation-step,
 * plus Events human-readable cards. Chrome + Edge.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-USER-VISIBLE-DEFECT-FIX6-20260820";

type BrowserJson = {
  ok?: boolean;
  status: number;
  body: {
    ok?: boolean;
    uiRevision?: number;
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
    const code = reset.body.error?.code;
    if (reset.status === 409 && code === "SIMULATION_NOT_STARTED") return;
    if (reset.status === 409 && (code === "STALE_UI_REVISION" || code === "UPDATE_IN_PROGRESS")) {
      await page.waitForTimeout(300);
      continue;
    }
    throw new Error(`reset failed ${String(reset.status)} ${JSON.stringify(reset.body)}`);
  }
  throw new Error("reset failed after retries");
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

test.describe("S1.5 FIX6 user-visible defect closure", () => {
  test.describe.configure({ timeout: 360_000 });

  test("cold adults on mock + zero auto-step + events readable", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });

    const autoSteps: Request[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/s1_5/simulation/step")) {
        autoSteps.push(request);
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    // Clear step posts that may have been triggered by unrelated UI; we only care after mock open.
    autoSteps.length = 0;

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-battle-page")).toBeVisible();
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    await expect(page.getByText(/模擬戦の対象年齢まで世界を進めています/)).toHaveCount(0);

    const options = page.locator("#mock-participant-a option");
    const values = await options.evaluateAll((nodes) =>
      nodes
        .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
        .filter((value) => value.length > 0),
    );
    expect(values.length).toBeGreaterThanOrEqual(2);
    await writeNote(project, "fix6-mock-candidates", {
      count: values.length,
      autoSimulationStepCount: autoSteps.length,
    });
    expect(autoSteps.length).toBe(0);
    await shot(page, project, "fix6-cold-mock-candidates-no-advance");

    await page.getByTestId("mock-participant-a").selectOption(values[0]!);
    await page.getByTestId("mock-participant-b").selectOption(values[1]!);
    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("mock-battle-summary")).toContainText("勝者");
    await shot(page, project, "fix6-mock-result");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-log-items").locator("li")).not.toHaveCount(0);
    await shot(page, project, "fix6-mock-battle-log");

    // Normal events after start (already started) — open Events and check readable card.
    await page.goto("/events");
    await expect(page.getByTestId("events-page")).toBeVisible();
    await expect(page.getByTestId("events-status")).not.toHaveAttribute("data-status", "loading", {
      timeout: 120_000,
    });
    await expect(page.getByTestId("events-items").locator("li").first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator(".dw-event-who").first()).toBeVisible();
    await expect(page.locator(".dw-event-what").first()).toBeVisible();
    await expect(page.locator(".dw-event-result").first()).toBeVisible();
    const firstWhat = await page.locator(".dw-event-what").first().innerText();
    expect(firstWhat).not.toMatch(/^training\./);
    await shot(page, project, "fix6-events-human-readable");

    await writeNote(project, "fix6-auto-step-final", { autoSimulationStepCount: autoSteps.length });
    expect(autoSteps.length).toBe(0);
  });
});
