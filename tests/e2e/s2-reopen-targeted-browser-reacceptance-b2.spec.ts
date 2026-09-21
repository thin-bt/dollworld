import { expect, test, type Page } from "@playwright/test";

/**
 * Sprint2 reopen targeted browser reacceptance (B2): ordinary home simulation flow only
 * (no API preset bootstrap). Covers tournament progression, battle-log presentation,
 * embedded + standalone annual ranking surfaces.
 */

async function waitSimulationReady(page: Page): Promise<void> {
  await expect(page.getByTestId("ui001-shell")).toBeVisible();
  await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
    timeout: 120_000,
  });
}

async function stepOneWeekFromHome(page: Page): Promise<void> {
  const step = page.getByTestId("simulation-step-1");
  await expect(step).toBeEnabled({ timeout: 60_000 });
  await step.click();
  await expect(page.getByTestId("simulation-feedback")).toHaveAttribute("data-kind", "success", {
    timeout: 120_000,
  });
}

async function selectActiveOrPlayableTournament(page: Page): Promise<void> {
  const pressed = page.locator(
    ".competition-schedule-cell [data-testid='competition-schedule-cell'][aria-pressed='true']",
  );
  if (await pressed.count()) {
    return;
  }
  const playableCell = page
    .locator(".competition-schedule-cell--playable [data-testid='competition-schedule-cell']")
    .first();
  if (await playableCell.isVisible()) {
    await playableCell.click();
    await expect(page.getByTestId("competition-detail")).toBeVisible({ timeout: 60_000 });
    return;
  }
  const anyCell = page.locator("[data-testid='competition-schedule-cell']").first();
  await expect(anyCell).toBeVisible({ timeout: 60_000 });
  await anyCell.click();
  await expect(page.getByTestId("competition-detail")).toBeVisible({ timeout: 60_000 });
}

async function openCompetitionWithTournamentDetail(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await page.locator('[data-menu-item="大会"]').click();
    await expect(page).toHaveURL(/\/competition$/);
    await expect(page.getByRole("heading", { name: "大会", exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("competition-annual-schedule")).toBeVisible({ timeout: 60_000 });
    await selectActiveOrPlayableTournament(page);

    const championVisible = await page
      .getByTestId("competition-champion")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    const rankingVisible = await page
      .getByTestId("competition-annual-ranking-table")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    const step = page.getByTestId("competition-step-cta");
    const stepEnabled = await step.isEnabled({ timeout: 2_000 }).catch(() => false);
    if (stepEnabled || championVisible || rankingVisible) {
      return;
    }

    await page.locator('[data-menu-item="シミュレーション"]').click();
    await expect(page).toHaveURL(/\/$/);
    await waitSimulationReady(page);
    await stepOneWeekFromHome(page);
  }
  throw new Error("competition detail never ready after 120 weekly advances from home");
}

async function ensureTournamentFinished(page: Page): Promise<void> {
  const championVisible = await page
    .getByTestId("competition-champion")
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (championVisible) {
    return;
  }
  const step = page.getByTestId("competition-step-cta");
  const stepEnabled = await step.isEnabled({ timeout: 2_000 }).catch(() => false);
  if (!stepEnabled) {
    await expect(page.getByTestId("competition-annual-ranking-table")).toBeVisible({
      timeout: 60_000,
    });
    return;
  }
  await advanceRoundRobinToFinish(page);
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
  await expect(page.getByTestId("competition-finished")).toContainText("この大会は終了しました。");
}

test.describe("Sprint2 reopen targeted browser reacceptance (B2)", () => {
  test("ordinary flow: weekly progression, tournament UI, battle log, ranking surfaces", async ({
    page,
    context,
  }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await context.clearCookies();
    await page.goto("/");
    await waitSimulationReady(page);

    await stepOneWeekFromHome(page);
    await openCompetitionWithTournamentDetail(page);

    await expect(page.getByTestId("competition-detail-tab-participants")).toBeVisible();
    await expect(page.getByTestId("competition-detail-tab-overview")).toBeVisible();

    await ensureTournamentFinished(page);

    await expect(page.getByTestId("competition-annual-ranking-table")).toBeVisible();
    await expect(page.getByTestId("competition-ranking-year-nav")).toBeVisible();

    const matchLink = page.locator('[data-testid^="competition-history-match-"]').first();
    await expect(matchLink).toBeVisible();
    await matchLink.click();
    await expect(page.getByTestId("competition-match-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("competition-match-log-availability")).toHaveAttribute(
      "data-log-state",
      "available",
    );
    await expect(page.getByTestId("competition-battle-log-panel")).toBeVisible();
    await expect(page.getByTestId("battle-log-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    await page.locator('[data-menu-item="ランキング"]').click();
    await expect(page).toHaveURL(/\/ranking$/);
    await expect(page.getByTestId("ranking-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("ranking-annual-ranking-table")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("ranking-ranking-year-nav")).toBeVisible();
    await expect(page.getByRole("link", { name: "大会画面を開く" })).toBeVisible();

    await page.getByRole("link", { name: "大会画面を開く" }).click();
    await expect(page).toHaveURL(/\/competition$/);
    await expect(page.getByTestId("competition-champion")).toBeVisible({ timeout: 60_000 });
  });
});
