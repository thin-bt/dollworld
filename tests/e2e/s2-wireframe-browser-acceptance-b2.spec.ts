import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const UI009_ACCEPTED_START_SEED = 42;

async function bootstrapAcceptedCompetitionSession(
  page: import("@playwright/test").Page,
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
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  await bootstrapAcceptedCompetitionSession(page, context);
  await page.goto("/competition");
  await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("competition-annual-schedule")).toBeVisible({ timeout: 60_000 });
}

async function selectFirstPlayableTournament(page: import("@playwright/test").Page): Promise<void> {
  const playable = page
    .locator(".competition-schedule-cell--playable [data-testid='competition-schedule-cell']")
    .first();
  await expect(playable).toBeVisible({ timeout: 60_000 });
  await playable.click();
  await expect(page.getByTestId("competition-detail")).toBeVisible();
}

async function advanceRoundRobinToFinish(page: import("@playwright/test").Page): Promise<number> {
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
  return matchesTotal;
}

test.describe("Sprint2 wireframe browser acceptance (B2 completion gate)", () => {
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test("guard-01 annual schedule overview, world time, year switching, matrix readability", async ({
    page,
    context,
  }) => {
    await openCompetitionReady(page, context);
    await expect(page.getByTestId("competition-world-time")).toContainText("現在:");
    await expect(page.getByTestId("competition-schedule-year-nav")).toBeVisible();
    await expect(page.getByTestId("competition-schedule-prev-year")).toBeEnabled();
    await expect(page.getByTestId("competition-schedule-current-year")).toBeVisible();
    await expect(page.getByTestId("competition-schedule-next-year")).toBeEnabled();

    const headingBefore = await page.getByTestId("competition-schedule-heading").innerText();
    await page.getByTestId("competition-schedule-next-year").click();
    await expect(page.getByTestId("competition-schedule-heading")).not.toHaveText(headingBefore);
    await page.getByTestId("competition-schedule-current-year").click();

    const schedule = page.getByTestId("competition-annual-schedule");
    await expect(schedule.locator("th.competition-schedule-row-label").first()).toBeVisible();
    await expect(schedule.locator("th.competition-schedule-month").first()).toContainText("月");
    await expect(schedule.locator("th.competition-schedule-week").first()).toBeVisible();
  });

  test("guard-02 tournament detail surfaces on schedule selection", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await expect(page.getByTestId("competition-detail-tab-overview")).toBeVisible();
    await expect(page.getByTestId("competition-detail-tab-participants")).toBeVisible();
    await expect(page.getByTestId("competition-detail-overview")).toBeVisible();
  });

  test("guard-03 dense participant comparison columns", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await page.getByTestId("competition-detail-tab-participants").click();
    const comparison = page.getByTestId("competition-participant-comparison");
    await expect(comparison).toBeVisible();
    await expect(comparison).toContainText("ランク");
    await expect(comparison).toContainText("年齢");
    await expect(comparison).toContainText("公式戦");
  });

  test("guard-04 round-robin standings and pair-result matrix", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    await expect(page.getByTestId("competition-round-robin-matrix")).toBeVisible();
    await expect(page.getByTestId("competition-round-robin-pair-matrix")).toBeVisible();
    await expect(page.getByTestId("competition-round-robin-history")).toBeVisible();
  });

  test("guard-05 knockout bracket and match results", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    await expect(page.getByTestId("competition-knockout-bracket")).toBeVisible();
    await expect(page.getByTestId("competition-match-result")).toBeVisible();
  });

  test("guard-06 tournament winner and placements", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    await expect(page.getByTestId("competition-champion")).toBeVisible();
    await expect(page.getByTestId("competition-finished")).toContainText(
      "この大会は終了しました。",
    );
  });

  test("guard-07 tournament series history and historical winners", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    const series = page.getByTestId("competition-series-history");
    await expect(series).toBeVisible();
    await expect(series).toContainText("大会シリーズ履歴");
    await expect(series.locator('a[href^="/people/"]').first()).toBeVisible();
  });

  test("guard-08 annual ranking earnings, year switch, enriched columns, person navigation", async ({
    page,
    context,
  }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    await expect(page.getByTestId("competition-ranking-year-nav")).toBeVisible();
    await expect(page.getByTestId("competition-ranking-year-option").first()).toBeVisible();

    const table = page.getByTestId("competition-annual-ranking-table");
    await expect(table).toBeVisible();
    await expect(table).toContainText("年間獲得金");
    await expect(table).toContainText("出場");
    await expect(table).toContainText("優勝");
    await expect(table.locator('a[href^="/people/"]').first()).toBeVisible();
  });

  test("guard-09 promotion result section", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    await expect(page.getByTestId("competition-promotion-results")).toBeVisible();
    await expect(page.getByTestId("competition-promotion-results")).toContainText("昇格結果");
  });

  test("guard-10 person rank history section", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    await expect(page.getByTestId("competition-person-rank-history")).toBeVisible();
    await expect(page.getByTestId("competition-person-rank-history")).toContainText(
      "人物ランク履歴",
    );
  });

  test("guard-11 tournament history match link opens battle detail with detailed log", async ({
    page,
    context,
  }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await advanceRoundRobinToFinish(page);
    const matchLink = page.locator('[data-testid^="competition-history-match-"]').first();
    await expect(matchLink).toBeVisible();
    await matchLink.click();
    await expect(page.getByTestId("competition-match-page")).toBeVisible({ timeout: 60_000 });
    const logSection = page.getByTestId("competition-match-log-availability");
    await expect(logSection).toBeVisible();
    await expect(logSection).toHaveAttribute("data-log-state", "available");
    await expect(page.getByTestId("competition-match-turn-order")).toBeVisible();
  });

  test("guard-12 person detail navigation from participants", async ({ page, context }) => {
    await openCompetitionReady(page, context);
    await selectFirstPlayableTournament(page);
    await page.getByTestId("competition-detail-tab-participants").click();
    const personLink = page
      .getByTestId("competition-participants")
      .locator('a[href^="/people/"]')
      .first();
    await expect(personLink).toBeVisible();
    const personHref = await personLink.getAttribute("href");
    expect(personHref).toMatch(/^\/people\/person_/);
    await personLink.click();
    await expect(page.getByTestId("person-detail-page")).toBeVisible();
    await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
      "data-status",
      "success",
      {
        timeout: 60_000,
      },
    );
  });
});
