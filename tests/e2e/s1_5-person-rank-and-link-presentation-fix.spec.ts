/**
 * Person rank/link presentation: single current rank, no highest-rank in normal UI,
 * single people-row navigation affordance.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-PERSON-RANK-AND-LINK-PRESENTATION-FIX-B2-20260822",
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

async function writeProbe(
  project: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test.describe("S1.5 person rank and link presentation fix", () => {
  test.describe.configure({ timeout: 360_000 });

  test("people list single link + detail single current rank", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);

    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const openLinks = page.locator('[data-testid^="people-open-"]');
    await expect(openLinks.first()).toBeVisible();
    expect(await page.locator('[data-testid^="people-detail-"]').count()).toBe(0);
    expect(await page.getByRole("link", { name: "詳細" }).count()).toBe(0);
    await shot(page, project, "01-people-single-link");

    await openLinks.first().click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );

    const chips = page.getByTestId("person-detail-status-chips");
    await expect(chips).toHaveCount(1);
    await expect(chips).toBeHidden();
    await expect(chips).not.toContainText("現在段位");
    await expect(chips).not.toContainText("最高段位");
    await expect(chips).not.toContainText("年齢");

    const hero = page.getByTestId("person-detail-identity");
    const heroText = await hero.innerText();
    // Current rank label once in primary hero (rankbox), not also as chip.
    const currentRankHits = (heroText.match(/現在段位/g) ?? []).length;
    expect(currentRankHits).toBe(1);
    expect(heroText).not.toContain("最高段位");

    await shot(page, project, "02-person-detail-single-rank");
    await writeProbe(project, "02-person-detail-probe", {
      heroText,
      currentRankHits,
      chipText: await chips.innerText(),
    });

    // Mobile viewport: still one open affordance and one current-rank label.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    expect(await page.locator('[data-testid^="people-detail-"]').count()).toBe(0);
    await openLinks.first().click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    const mobileHero = await page.getByTestId("person-detail-identity").innerText();
    expect((mobileHero.match(/現在段位/g) ?? []).length).toBe(1);
    expect(mobileHero).not.toContain("最高段位");
    await shot(page, project, "03-person-detail-mobile");
  });
});
