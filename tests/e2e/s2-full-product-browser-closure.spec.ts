import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

/**
 * Sprint2 full product browser closure (B2): UI-only simulation bootstrap,
 * week advance, competition schedule/matrix, match + person navigation, return home.
 */

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/SPRINT2-FULL-PRODUCT-BROWSER-CLOSURE-B2-20260916",
);

async function shot(page: Page, project: string, name: string): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

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

async function openCompetitionPlayable(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await page.locator('[data-menu-item="大会"]').click();
    await expect(page).toHaveURL(/\/competition$/);
    await expect(page.getByRole("heading", { name: "大会", exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("competition-annual-schedule")).toBeVisible({ timeout: 60_000 });
    const step = page.getByTestId("competition-step-cta");
    if (await step.isEnabled()) {
      return;
    }
    await page.locator('[data-menu-item="シミュレーション"]').click();
    await expect(page).toHaveURL(/\/$/);
    await waitSimulationReady(page);
    await stepOneWeekFromHome(page);
  }
  throw new Error("competition-step-cta never enabled after 120 weekly advances from home");
}

test.describe("Sprint2 full product browser closure", () => {
  test("simulation week advance through competition matrix, person nav, and return home", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(360_000);
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1440, height: 1000 });

    await context.clearCookies();
    await page.goto("/");
    await waitSimulationReady(page);
    await shot(page, project, "01-simulation-clean-load");

    await stepOneWeekFromHome(page);
    await shot(page, project, "02-simulation-after-one-week");

    await openCompetitionPlayable(page);
    await shot(page, project, "03-competition-schedule-playable");

    const step = page.getByTestId("competition-step-cta");
    await step.click();
    await expect(page.getByTestId("competition-round-robin-matrix")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("competition-round-robin-history")).toBeVisible();
    await expect(page.getByTestId("competition-match-result")).toBeVisible();

    await page.getByTestId("competition-detail-tab-participants").click();
    const participantRows = page.getByTestId("competition-participants").locator("tbody tr");
    expect(await participantRows.count()).toBeGreaterThan(2);
    const personLink = page
      .getByTestId("competition-participants")
      .locator('a[href^="/people/"]')
      .first();
    await expect(personLink).toBeVisible();
    const personHref = await personLink.getAttribute("href");
    expect(personHref).toMatch(/^\/people\/person_/);
    await personLink.click();
    await expect(page).toHaveURL(
      new RegExp(`${personHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    );
    await expect(page.getByTestId("person-detail-page")).toBeVisible();
    await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
      "data-status",
      "success",
      {
        timeout: 60_000,
      },
    );
    await shot(page, project, "04-person-detail-from-competition");

    await page.locator('[data-menu-item="大会"]').click();
    await expect(page.getByTestId("competition-round-robin-history")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("competition-detail-tab-overview").click();
    await expect(page.getByTestId("competition-match-result")).toBeVisible();

    await page.locator('[data-menu-item="シミュレーション"]').click();
    await expect(page).toHaveURL(/\/$/);
    await waitSimulationReady(page);
    await stepOneWeekFromHome(page);
    await shot(page, project, "05-simulation-second-week-advance");

    const simulationStatus = await page.evaluate(async () => {
      const response = await fetch("/api/s1_5/simulation", { credentials: "same-origin" });
      return response.status;
    });
    expect(simulationStatus).toBe(200);
  });
});
