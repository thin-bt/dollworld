import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

/**
 * Sprint2 visual quality review (A) — screenshot evidence + document overflow guards.
 */

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1",
);

const UI009_ACCEPTED_START_SEED = 42;

const VIEWPORTS = [
  { id: "narrow-390", width: 390, height: 844 },
  { id: "app-900", width: 900, height: 900 },
  { id: "desktop-1440", width: 1440, height: 1000 },
] as const;

async function assertNoDocumentHorizontalOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
}

async function shot(page: Page, viewportId: string, name: string): Promise<string> {
  const dir = path.join(EVIDENCE_ROOT, "chrome", viewportId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function bootstrapAcceptedCompetitionSession(
  page: Page,
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  await context.clearCookies();
  const sessionResponse = await page.request.get("/api/s1_5/session");
  expect(sessionResponse.ok()).toBeTruthy();
  const sessionEnvelope = (await sessionResponse.json()) as {
    data: { csrfToken: string };
    uiRevision: number;
  };
  const startResponse = await page.request.post("/api/s1_5/simulation/start", {
    headers: {
      "content-type": "application/json",
      "x-dollworld-csrf": sessionEnvelope.data.csrfToken,
      origin: "http://127.0.0.1:8787",
    },
    data: {
      requestId: randomUUID(),
      expectedUiRevision: sessionEnvelope.uiRevision,
      presetId: "sprint1-tiny-accepted",
      seed: UI009_ACCEPTED_START_SEED,
    },
  });
  expect(startResponse.ok()).toBeTruthy();
}

async function openCompetitionReady(
  page: Page,
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  await bootstrapAcceptedCompetitionSession(page, context);
  await page.goto("/competition");
  await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("competition-annual-schedule")).toBeVisible({ timeout: 60_000 });
}

async function selectFirstPlayableTournament(page: Page): Promise<void> {
  const playable = page
    .locator(".competition-schedule-cell--playable [data-testid='competition-schedule-cell']")
    .first();
  await expect(playable).toBeVisible({ timeout: 60_000 });
  await playable.click();
  await expect(page.getByTestId("competition-detail")).toBeVisible();
}

async function advanceRoundRobinToFinish(page: Page): Promise<void> {
  const step = page.getByTestId("competition-step-cta");
  await expect(step).toBeEnabled({ timeout: 60_000 });
  await step.click();
  await expect(page.getByTestId("competition-round-robin-history")).toBeVisible({
    timeout: 60_000,
  });

  const historyRows = page.getByTestId("competition-round-robin-history").locator("tbody tr");
  const matchesTotal = await historyRows.count();
  expect(matchesTotal).toBeGreaterThan(1);

  for (let i = 1; i < matchesTotal; i += 1) {
    await expect(step).toBeEnabled({ timeout: 60_000 });
    await step.click();
  }

  await expect(page.getByTestId("competition-champion")).toBeVisible({ timeout: 120_000 });
}

test.describe("Sprint2 visual quality review (A)", () => {
  for (const viewport of VIEWPORTS) {
    test(`visual evidence ${viewport.id} — schedule through person/battle detail`, async ({
      page,
      context,
    }) => {
      test.setTimeout(360_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await openCompetitionReady(page, context);
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "01-annual-schedule");

      await selectFirstPlayableTournament(page);
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "02-tournament-detail-overview");

      await page.getByTestId("competition-detail-tab-participants").click();
      await expect(page.getByTestId("competition-participant-comparison")).toBeVisible();
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "03-participants-comparison");

      const personLink = page
        .getByTestId("competition-participants")
        .locator('a[href^="/people/"]')
        .first();
      await expect(personLink).toBeVisible();
      await personLink.click();
      await expect(page.getByTestId("person-detail-page")).toBeVisible();
      await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
        "data-status",
        "success",
        {
          timeout: 60_000,
        },
      );
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "12-person-detail");

      await page.goBack();
      await expect(page.getByTestId("competition-detail")).toBeVisible({ timeout: 60_000 });
      await page.getByTestId("competition-detail-tab-overview").click();
      await expect(page.getByTestId("competition-detail-overview")).toBeVisible();
      await advanceRoundRobinToFinish(page);

      await expect(page.getByTestId("competition-round-robin-matrix")).toBeVisible();
      await expect(page.getByTestId("competition-round-robin-pair-matrix")).toBeVisible();
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "04-round-robin-matrices");

      await expect(page.getByTestId("competition-knockout-bracket")).toBeVisible();
      await expect(page.getByTestId("competition-match-result")).toBeVisible();
      await shot(page, viewport.id, "05-knockout-bracket");

      await expect(page.getByTestId("competition-champion")).toBeVisible();
      await expect(page.getByTestId("competition-finished")).toContainText(
        "この大会は終了しました。",
      );
      await shot(page, viewport.id, "06-tournament-result");

      const series = page.getByTestId("competition-series-history");
      await expect(series).toBeVisible();
      await shot(page, viewport.id, "07-series-history");

      const rankingTable = page.getByTestId("competition-annual-ranking-table");
      await expect(rankingTable).toBeVisible();
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "08-annual-ranking");

      await expect(page.getByTestId("competition-promotion-results")).toBeVisible();
      await shot(page, viewport.id, "09-promotion-result");

      await expect(page.getByTestId("competition-person-rank-history")).toBeVisible();
      await shot(page, viewport.id, "10-person-rank-history");

      const matchLink = page.locator('[data-testid^="competition-history-match-"]').first();
      await expect(matchLink).toBeVisible();
      await matchLink.click();
      await expect(page.getByTestId("competition-match-page")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("competition-match-turn-order")).toBeVisible();
      await assertNoDocumentHorizontalOverflow(page);
      await shot(page, viewport.id, "11-battle-detail");
    });
  }
});
