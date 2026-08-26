import { expect, test } from "@playwright/test";
import {
  assertChromeIdentity,
  assertEdgeIdentity,
  captureBrowserIdentity,
} from "./support/browser-identity";

/**
 * UI-010 tooling smoke — ACC-056 (chrome project) / ACC-057 (edge project).
 * Does not implement UI-010 final audit aggregation or SCN-014.
 */

const ROUTES = [
  "/",
  "/people",
  "/mock-battle",
  "/mock-battle/result",
  "/events",
  "/events?tab=events",
  "/events?tab=validation",
] as const;

test.describe("UI-010 ACC-056/057 browser smoke", () => {
  test("shell loads, accepted routes reachable, browser identity captured", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await expect(page.getByTestId("common-menu")).toBeVisible();
    await expect(page.getByTestId("session-state")).toBeAttached();
    await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
      timeout: 60_000,
    });

    const identity = await captureBrowserIdentity(page, testInfo);
    if (testInfo.project.name === "chrome") {
      assertChromeIdentity(identity);
    } else if (testInfo.project.name === "edge") {
      assertEdgeIdentity(identity);
    } else {
      throw new Error(`unexpected project ${testInfo.project.name}`);
    }

    for (const route of ROUTES) {
      const response = await page.goto(route);
      expect(response, `navigation ${route}`).not.toBeNull();
      expect(response!.ok() || response!.status() === 304, `HTTP for ${route}`).toBe(true);
      await expect(page.getByTestId("ui001-shell")).toBeVisible();
    }

    // Fail-closed observability: session endpoint returns an API envelope, not a masked blank.
    const sessionResponse = await page.request.get("/api/s1_5/session");
    expect(sessionResponse.status()).toBeGreaterThanOrEqual(200);
    const sessionBody = await sessionResponse.text();
    expect(sessionBody.length).toBeGreaterThan(0);
    expect(sessionBody).toContain("apiSchemaVersion");
  });
});
