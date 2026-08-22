import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Click-through-only userflow evidence for people→detail and mock battle.
 * Does not accept by typing detail/result URLs.
 */

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-PRODUCTION-USERFLOW-FIX1-20260818";

async function shot(page: Page, project: string, name: string): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

test.describe("S1.5 production userflow click-through", () => {
  test("people detail click + mock battle UI completion", async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/people");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await shot(page, project, "01-people-list");

    const firstOpen = page.locator("[data-person-nav]").first();
    await expect(firstOpen).toBeVisible();
    const href = await firstOpen.getAttribute("href");
    expect(href).toMatch(/^\/people\/person_/);
    await firstOpen.click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByTestId("person-detail-page")).toBeVisible();
    await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 30_000 },
    );
    await shot(page, project, "02-person-detail-via-click");

    await page.goBack();
    await expect(page.getByTestId("dev-viewer-people")).toBeVisible();
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 30_000,
    });
    await shot(page, project, "03-people-after-back");

    await page.locator('[data-menu-item="模擬戦"]').click();
    await expect(page).toHaveURL(/\/mock-battle$/);
    await expect(page.getByTestId("mock-battle-page")).toBeVisible();
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 360_000 },
    );
    const options = page.locator("#mock-participant-a option");
    const values = await options.evaluateAll((nodes) =>
      nodes
        .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
        .filter((value) => value.length > 0),
    );
    expect(values.length).toBeGreaterThanOrEqual(2);
    await page.getByTestId("mock-participant-a").selectOption(values[0]!);
    await page.getByTestId("mock-participant-b").selectOption(values[1]!);
    await expect(page.getByTestId("mock-battle-run")).toBeEnabled();
    await shot(page, project, "04-mock-select");

    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("mock-battle-summary")).toContainText("勝者");
    await shot(page, project, "05-mock-result");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page).toHaveURL(/\/mock-battle\/result$/);
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-log-status")).toHaveAttribute("data-status", "success", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("battle-log-items").locator("li")).not.toHaveCount(0);
    await expect(page.getByTestId("battle-log-requested-resolved-0")).toContainText("要求");
    await expect(page.getByTestId("battle-log-requested-resolved-0")).toContainText("解決");
    await shot(page, project, "06-battle-log");
  });
});
