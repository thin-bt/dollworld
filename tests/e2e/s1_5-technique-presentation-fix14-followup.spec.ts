/**
 * FIX14 followup: Japanese technique presentation on Person detail (and no raw TechniqueId as primary name).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const EVIDENCE_ROOT =
  "_handoff-artifacts/audit/current/S1_5-FIX14-TECHNIQUE-PRESENTATION-FOLLOWUP-B2-20260822";

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

test.describe("S1.5 FIX14 technique presentation followup", () => {
  test.describe.configure({ timeout: 360_000 });

  test("person detail shows Japanese technique presentation", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);

    const people = await browserJson(page, { url: "/api/s1_5/people?limit=50" });
    expect(people.ok).toBe(true);
    const items = (people.body.data?.items ?? []) as Array<{
      personId: string;
      learnedTechniqueCount: number;
    }>;
    const holders = items.filter((row) => row.learnedTechniqueCount > 0);
    expect(holders.length).toBeGreaterThanOrEqual(1);

    const samples: Array<Record<string, unknown>> = [];
    for (const holder of holders.slice(0, 6)) {
      const detail = await browserJson(page, {
        url: `/api/s1_5/people/${encodeURIComponent(holder.personId)}`,
      });
      expect(detail.ok).toBe(true);
      const techniques = (detail.body.data?.techniques ?? []) as Array<{
        techniqueId: string;
      }>;
      samples.push({
        personId: holder.personId,
        techniqueIds: techniques.map((t) => t.techniqueId),
      });
    }

    const magicHolder = samples.find((sample) =>
      (sample.techniqueIds as string[]).includes("technique_magic_basic"),
    );
    const swordHolder = samples.find((sample) =>
      (sample.techniqueIds as string[]).includes("technique_sword_basic"),
    );
    const unarmedHolder = samples.find((sample) =>
      (sample.techniqueIds as string[]).includes("technique_alpha"),
    );
    expect(magicHolder).toBeTruthy();
    expect(swordHolder).toBeTruthy();
    expect(unarmedHolder).toBeTruthy();

    async function assertTechniquePresentation(
      personId: string,
      expectedPrimary: string,
      expectedCategory: string,
      shotName: string,
    ): Promise<string> {
      await page.goto(`/people/${encodeURIComponent(personId)}`);
      await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
        "data-status",
        "success",
        { timeout: 60_000 },
      );
      const section = page.getByTestId("person-detail-techniques");
      await expect(section.getByTestId("technique-primary-label")).toContainText(expectedPrimary);
      await expect(section.getByTestId("technique-category-label")).toContainText(expectedCategory);
      await expect(section.getByTestId("technique-usable-ranges")).toBeVisible();
      await expect(section.getByTestId("technique-mental-cost")).toBeVisible();
      await expect(section.getByTestId("technique-learned-state")).toContainText("習得済");
      const primaryText = await section.getByTestId("technique-primary-label").innerText();
      expect(primaryText).not.toMatch(/technique_/);
      const html = await section.innerHTML();
      await shot(page, project, shotName);
      await writeProbe(project, `${shotName}-html`, { personId, expectedPrimary, html });
      return html;
    }

    await assertTechniquePresentation(
      magicHolder!.personId as string,
      "基本魔法",
      "魔法",
      "01-person-magic",
    );
    await assertTechniquePresentation(
      swordHolder!.personId as string,
      "基本剣技",
      "剣技",
      "02-person-sword",
    );
    await assertTechniquePresentation(
      unarmedHolder!.personId as string,
      "基本格闘",
      "格闘",
      "03-person-unarmed",
    );

    await writeProbe(project, "00-holder-samples", { samples });
  });
});
