import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Production `/` session-bind proof — Chrome/Edge.
 * Confirms empty sessions auto-start like /dev-viewer; no SIMULATION_NOT_STARTED on normal load.
 */

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-PRODUCTION-SESSION-BIND-FIX-20260818";

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

async function shot(page: Page, project: string, name: string): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function waitHomeReady(page: Page): Promise<void> {
  await expect(page.getByTestId("ui001-shell")).toBeVisible();
  await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("simulation-status")).not.toContainText("SIMULATION_NOT_STARTED");
  await expect(page.getByTestId("simulation-year")).not.toHaveText(/unknown/i);
  await expect(page.getByTestId("simulation-week")).not.toHaveText(/unknown/i);
  await expect(page.getByTestId("simulation-elapsed-weeks")).not.toContainText("unknown");
}

test.describe("S1.5 production session bind", () => {
  test("production `/` loads real world; people+step+reload+dev-viewer", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/");
    await waitHomeReady(page);
    const yearText = await page.getByTestId("simulation-year").innerText();
    expect(yearText).toMatch(/\d/);
    await shot(page, project, "home-ready");

    const beforeElapsed = await page.getByTestId("simulation-elapsed-weeks").innerText();
    await expect(page.getByTestId("simulation-step-1")).toBeEnabled();
    await page.getByTestId("simulation-step-1").click();
    await expect(page.getByTestId("simulation-feedback")).toHaveAttribute("data-kind", "success", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success");
    await expect
      .poll(async () => page.getByTestId("simulation-elapsed-weeks").innerText(), {
        timeout: 60_000,
      })
      .not.toBe(beforeElapsed);
    const afterElapsed = await page.getByTestId("simulation-elapsed-weeks").innerText();
    await shot(page, project, "home-after-step");

    await page.goto("/people");
    await expect(page.getByTestId("dev-viewer-people")).toBeVisible();
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("people-meta")).toContainText("全");
    await shot(page, project, "people-same-session");

    await page.goto("/");
    await waitHomeReady(page);
    await expect(page.getByTestId("simulation-elapsed-weeks")).toHaveText(afterElapsed);
    await shot(page, project, "home-after-nav-roundtrip");

    await page.reload();
    await waitHomeReady(page);
    await expect(page.getByTestId("simulation-elapsed-weeks")).toHaveText(afterElapsed);
    await shot(page, project, "home-after-reload");

    await page.goto("/dev-viewer");
    await expect(page.getByTestId("dev-viewer-root")).toBeVisible();
    await expect(page.getByTestId("dev-viewer-session-gate")).toHaveAttribute(
      "data-gate",
      "ready",
      {
        timeout: 60_000,
      },
    );
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await shot(page, project, "dev-viewer-nonregression");

    const session = await browserJson(page, { url: "/api/s1_5/session" });
    expect(session.ok).toBe(true);
    expect(session.body.data?.sessionState).toBe("ready");
  });
});
