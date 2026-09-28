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

test.describe("Sprint2 UI009 round-robin competition", () => {
  test("advances every accepted round-robin pair in the real competition UI", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await bootstrapAcceptedCompetitionSession(page, context);
    await page.goto("/competition");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: "大会", exact: true })).toBeVisible();

    const step = page.getByTestId("competition-step-cta");
    await expect(step).toBeEnabled({ timeout: 60_000 });

    // First real match: this must transition from the annual schedule to the active tournament detail.
    await step.click();
    await expect(page.getByTestId("competition-round-robin-matrix")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("competition-round-robin-history")).toBeVisible();

    // Regression for the original two-person placeholder: the accepted participant plan must expose >2.
    await page.getByTestId("competition-detail-tab-participants").click();
    const participantRows = page.getByTestId("competition-participants").locator("tbody tr");
    expect(await participantRows.count()).toBeGreaterThan(2);
    await page.getByTestId("competition-detail-tab-overview").click();

    const historyRows = page.getByTestId("competition-round-robin-history").locator("tbody tr");
    const matchesTotal = await historyRows.count();
    expect(matchesTotal).toBeGreaterThan(1);

    const completedMatches = async (): Promise<number> => {
      const texts = await historyRows.locator("td:last-child").allInnerTexts();
      return texts.filter((text) => text.includes("勝利")).length;
    };

    expect(await completedMatches()).toBe(1);

    // Critical CTA regression: after match 1 an active tournament must remain advanceable.
    await expect(step).toBeEnabled();

    for (let expectedCompleted = 2; expectedCompleted <= matchesTotal; expectedCompleted += 1) {
      await step.click();
      await expect.poll(completedMatches, { timeout: 60_000 }).toBe(expectedCompleted);
      if (expectedCompleted < matchesTotal) {
        await expect(step).toBeEnabled();
      }
    }

    await expect(page.getByTestId("competition-finished")).toContainText(
      "この大会は終了しました。",
    );
    await expect(page.getByTestId("competition-champion")).toBeVisible();
    await expect(page.getByRole("heading", { name: "年間順位" })).toBeVisible();
    expect(await historyRows.count()).toBe(matchesTotal);
    await expect(step).toHaveCount(0);

    // Competition mutations must not corrupt the simulation read path.
    const simulationStatus = await page.evaluate(async () => {
      const response = await fetch("/api/s1_5/simulation", { credentials: "same-origin" });
      return response.status;
    });
    expect(simulationStatus).toBe(200);
  });
  test("year navigation reloads only the competition projection", async ({ page, context }) => {
    test.setTimeout(120_000);
    await bootstrapAcceptedCompetitionSession(page, context);

    let sessionGets = 0;
    let competitionGets = 0;
    page.on("request", (request) => {
      if (request.method() !== "GET") return;
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/s1_5/session") sessionGets += 1;
      if (pathname === "/api/s1_5/competition") competitionGets += 1;
    });

    await page.goto("/competition");
    await expect(page.getByTestId("competition-load-status")).toHaveCount(0, { timeout: 60_000 });
    const sessionBaseline = sessionGets;
    const competitionBaseline = competitionGets;

    const yearButton = page
      .getByTestId("competition-schedule-year-nav")
      .getByRole("button")
      .filter({ hasNot: page.locator(":disabled") })
      .first();
    await expect(yearButton).toBeEnabled();
    await yearButton.click();
    await expect.poll(() => competitionGets - competitionBaseline, { timeout: 60_000 }).toBe(1);
    expect(sessionGets - sessionBaseline).toBe(0);
  });

  test("ranking year navigation reloads only the competition projection", async ({ page, context }) => {
    test.setTimeout(120_000);
    await bootstrapAcceptedCompetitionSession(page, context);

    let sessionGets = 0;
    let competitionGets = 0;
    page.on("request", (request) => {
      if (request.method() !== "GET") return;
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/s1_5/session") sessionGets += 1;
      if (pathname === "/api/s1_5/competition") competitionGets += 1;
    });

    await page.goto("/competition");
    const step = page.getByTestId("competition-step-cta");
    await expect(step).toBeEnabled({ timeout: 60_000 });
    await step.click();
    await expect(page.getByTestId("competition-ranking-section")).toBeVisible({ timeout: 60_000 });

    const sessionBaseline = sessionGets;
    const competitionBaseline = competitionGets;
    const selectedYear = page
      .getByTestId("competition-ranking-year-option")
      .filter({ has: page.locator('[aria-pressed="true"]') });
    const selectedValue = await selectedYear.first().getAttribute("data-year");
    const yearButton = page
      .getByTestId("competition-ranking-year-option")
      .filter({ hasNot: page.locator(":disabled") })
      .filter({ hasNot: page.locator('[aria-pressed="true"]') })
      .first();
    await expect(yearButton).toBeEnabled();
    expect(await yearButton.getAttribute("data-year")).not.toBe(selectedValue);
    await yearButton.click();

    await expect.poll(() => competitionGets - competitionBaseline, { timeout: 60_000 }).toBe(1);
    expect(sessionGets - sessionBaseline).toBe(0);
  });

  test("rejected competition mutation invalidates the session and reacquires once with visible failure", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await bootstrapAcceptedCompetitionSession(page, context);

    let sessionGets = 0;
    let competitionGets = 0;
    let rejectedSteps = 0;
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (request.method() === "GET" && pathname === "/api/s1_5/session") sessionGets += 1;
      if (request.method() === "GET" && pathname === "/api/s1_5/competition") competitionGets += 1;
    });
    await page.route("**/api/s1_5/competition/step", async (route) => {
      if (rejectedSteps === 0) {
        rejectedSteps += 1;
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            apiSchemaVersion: "0.2.0",
            ok: false,
            error: { code: "STALE_UI_REVISION", message: "forced stale session regression" },
            uiRevision: 0,
            isUpdating: false,
            refreshRequired: true,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/competition");
    const step = page.getByTestId("competition-step-cta");
    await expect(step).toBeEnabled({ timeout: 60_000 });
    const sessionBaseline = sessionGets;
    const competitionBaseline = competitionGets;

    await step.click();
    await expect(page.getByTestId("competition-action-error")).toContainText(
      "forced stale session regression",
    );
    await expect.poll(() => sessionGets - sessionBaseline, { timeout: 60_000 }).toBe(1);
    await expect.poll(() => competitionGets - competitionBaseline, { timeout: 60_000 }).toBe(1);

    const retry = page.getByTestId("competition-action-error").getByRole("button", {
      name: "再試行",
    });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(page.getByTestId("competition-round-robin-matrix")).toBeVisible({
      timeout: 60_000,
    });
    expect(rejectedSteps).toBe(1);
  });

});
