import { expect, test } from "@playwright/test";

test.describe("Sprint2 UI009 round-robin competition", () => {
  test("advances every accepted round-robin pair in the real competition UI", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto("/competition");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: "大会" })).toBeVisible();

    const step = page.getByTestId("competition-step-cta");
    await expect(step).toBeEnabled({ timeout: 60_000 });

    // First real match: this must transition from the annual schedule to the active tournament detail.
    await step.click();
    await expect(page.getByTestId("competition-round-robin-matrix")).toBeVisible({ timeout: 60_000 });
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
      await expect
        .poll(completedMatches, { timeout: 60_000 })
        .toBe(expectedCompleted);
      if (expectedCompleted < matchesTotal) {
        await expect(step).toBeEnabled();
      }
    }

    await expect(page.getByTestId("competition-round-robin-complete")).toBeVisible();
    await expect(page.getByTestId("competition-finished")).toContainText("総当たり戦の全試合を消化しました。");
    await expect(page.getByText("総当たり戦終了", { exact: true })).toBeVisible();
    await expect(step).toHaveCount(0);

    // Accepted standings/finalization is not wired yet: the UI must not invent these facts.
    await expect(page.getByTestId("competition-champion")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "年間順位" })).toHaveCount(0);
    await expect(page.getByText("順位・優勝者はまだ確定していません。")).toBeVisible();

    // Competition mutations must not corrupt the simulation read path.
    const simulationStatus = await page.evaluate(async () => {
      const response = await fetch("/api/s1_5/simulation", { credentials: "same-origin" });
      return response.status;
    });
    expect(simulationStatus).toBe(200);
  });
});
