/**
 * FIX8 correction recovery evidence: person mental section, mock final resources,
 * turn terminal, events grouping.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-BATTLE-TRACE-UX-FIX8-20260821";

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

test.describe("S1.5 FIX8 correction recovery", () => {
  test.describe.configure({ timeout: 360_000 });

  test("person mental section + mock final + terminal + events", async ({ page }, testInfo) => {
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

    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await page.locator('[data-testid^="people-open-"]').first().click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("person-detail-status-chips")).not.toContainText("現在精神力");
    await expect(page.getByTestId("person-detail-current-state")).toContainText("現在精神力");
    await expect(page.getByTestId("person-detail-current-mental")).toContainText("/");
    await shot(page, project, "fix8-person-current-state");

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
    await expect(page.getByTestId("mock-battle-final-state")).toBeVisible();
    await expect(page.getByTestId("mock-final-a")).toContainText("耐久");
    await expect(page.getByTestId("mock-final-a")).toContainText("精神力");
    const mockFinal = await page.getByTestId("mock-battle-final-state").innerText();
    expect(mockFinal).not.toMatch(/防御中|回避中/);
    await shot(page, project, "fix8-mock-final-resources");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    const detailFlags = await page.getByTestId("battle-participant-status").innerText();
    expect(detailFlags).not.toMatch(/防御中|回避中/);
    await expect(page.locator('[data-testid^="battle-log-turn-state-"]').first()).toBeVisible();
    await expect(page.getByTestId("battle-log-terminal")).toBeVisible();
    await expect(page.getByTestId("battle-log-next")).toBeDisabled();
    await shot(page, project, "fix8-battle-terminal");

    await page.goto("/events");
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const whats = await page.locator(".dw-event-what").allInnerTexts();
    for (const what of whats) {
      expect(what).not.toBe("出来事");
      expect(what).not.toBe("記録");
      expect(what).not.toMatch(/に関する記録$/);
    }
    await shot(page, project, "fix8-events-grouped");

    await writeNote(project, "fix8-correction-summary", {
      personMentalInChips: false,
      personMentalInCurrentState: true,
      mockFinalResources: true,
      terminalBlock: true,
      eventsTechnicalFiltered: true,
    });
  });
});
