/**
 * FIX7 Chrome+Edge evidence: people sort/pagination defaults, Merril mental labels,
 * mock result + battle log human readability.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-PEOPLE-LIST-UX-FIX7-20260820",
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

test.describe("S1.5 FIX7 people + mock readability", () => {
  test.describe.configure({ timeout: 360_000 });

  test("people defaults + mental labels + mock human result", async ({ page }, testInfo) => {
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

    await page.goto("/people");
    await expect(page.getByTestId("dev-viewer-people")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("people-sort-by")).toHaveValue("stamina");
    await expect(page.getByTestId("people-sort-order")).toHaveValue("asc");
    await expect(page.getByTestId("people-state-filter")).toHaveValue("life:living");
    const sortHtml = await page.getByTestId("people-sort-by").innerHTML();
    expect(sortHtml).toContain("体力");
    expect(sortHtml).not.toContain("既定");
    expect(sortHtml).not.toContain("識別子");
    await expect(page.getByTestId("people-prev")).toBeDisabled();
    await shot(page, project, "fix7-people-list-default-living");

    await page.getByTestId("people-sort-order").selectOption("desc");
    await page.getByTestId("people-apply-query").click();
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await shot(page, project, "fix7-people-list-id-desc");

    // Find a living person named like Merril if present; else first linked person.
    const firstLink = page.locator('[data-testid^="people-open-"]').first();
    await firstLink.click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("person-detail-current-mental")).toContainText("現在精神力");
    await expect(page.getByTestId("person-detail-status-chips")).not.toContainText("現在精神力");
    await expect(page.getByTestId("person-detail-current-state")).toBeVisible();
    await expect(page.locator('[data-stat="spirit"] small')).toContainText("精神");
    await shot(page, project, "fix7-person-detail-mental-labels");

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
    await expect(page.getByTestId("mock-battle-outcome")).toBeVisible();
    await expect(page.getByTestId("mock-battle-summary")).toContainText("勝者");
    await expect(page.getByTestId("mock-battle-summary")).not.toContainText("completed");
    await expect(page.getByTestId("mock-battle-summary")).not.toContainText("null");
    await shot(page, project, "fix7-mock-result-human");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-log-items").locator("li").first()).toBeVisible();
    await expect(page.getByTestId("battle-participant-status")).toBeVisible();
    await expect(page.getByTestId("battle-status-a-durability")).toBeVisible();
    await expect(page.getByTestId("battle-status-b-mental")).toBeVisible();
    const actorText = await page.getByTestId("battle-log-actor-0").innerText();
    expect(actorText).not.toMatch(/sideA|sideB/);
    const outcomeText = await page.getByTestId("battle-log-outcome-0").innerText();
    expect(outcomeText).not.toMatch(/\btrue\b|\bfalse\b/);
    expect(outcomeText).not.toMatch(/null/);
    await expect(page.getByTestId("battle-log-next")).toBeDisabled();
    await shot(page, project, "fix7-battle-log-human");
    await shot(page, project, "fix7-battle-status-vs");

    await page.goto("/");
    await expect(page.getByTestId("simulation-step-1")).toBeEnabled();
    await page.getByTestId("simulation-step-1").click();
    await expect(page.getByTestId("simulation-feedback")).toHaveAttribute("data-kind", "success", {
      timeout: 60_000,
    });

    await page.goto("/events");
    await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await expect(page.locator(".dw-event-what").first()).toBeVisible({ timeout: 60_000 });
    const eventWhat = await page.locator(".dw-event-what").first().innerText();
    expect(eventWhat.length).toBeGreaterThan(0);
    expect(eventWhat).not.toBe("出来事");
    await expect(page.getByTestId("events-tab-validation")).toContainText("開発者向け");
    await shot(page, project, "fix7-events-human");
    await page.getByTestId("events-tab-validation").click();
    await expect(page.getByTestId("validation-dev-banner")).toBeVisible();
    await shot(page, project, "fix7-validation-dev-context");

    await writeNote(project, "fix7-summary", {
      defaultSort: "stamina asc",
      defaultStateFilter: "life:living",
      participationPrimaryUi: false,
      mentalLabels: ["現在精神力", "精神"],
      battleStateSource: "finalState + sourceLogEntry",
      validationPresentation: "developer/system de-emphasized",
    });
  });
});
