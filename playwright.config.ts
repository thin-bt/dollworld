import { defineConfig, devices } from "@playwright/test";

/**
 * UI-010 ACC-056 / ACC-057 tooling — Playwright Test only.
 * Reuses accepted web start: `npm run start -w @shared-world/web` (port 8787).
 * Production feature semantics are out of scope for this config.
 */

const EVIDENCE_ROOT =
  "_handoff-artifacts/audit/current/S1_5-UI010-E2E-TOOLING-REMEDIATION-20260817";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 360_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: `${EVIDENCE_ROOT}/playwright-report.json` }],
    ["html", { outputFolder: `${EVIDENCE_ROOT}/playwright-html`, open: "never" }],
  ],
  outputDir: `${EVIDENCE_ROOT}/test-results`,
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    // Existing accepted start command; build workspaces required for dist/server.
    command:
      "npm run build -w @shared-world/simulation-core && npm run build -w @shared-world/web && npm run start -w @shared-world/web",
    url: "http://127.0.0.1:8787/",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
    {
      name: "edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
      },
    },
  ],
});
