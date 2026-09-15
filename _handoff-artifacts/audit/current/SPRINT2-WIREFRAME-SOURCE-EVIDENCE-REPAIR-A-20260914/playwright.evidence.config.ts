import { defineConfig, devices } from "@playwright/test";

const TASK_ROOT =
  "_handoff-artifacts/audit/current/SPRINT2-WIREFRAME-SOURCE-EVIDENCE-REPAIR-A-20260914";

export default defineConfig({
  testDir: ".",
  testMatch: "capture-wireframe-browser-acceptance.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 420_000,
  expect: { timeout: 90_000 },
  reporter: [["list"]],
  outputDir: `${TASK_ROOT}/test-results`,
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "retain-on-failure",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command:
      "npm run build -w @shared-world/simulation-core && npm run build -w @shared-world/web && npm run start -w @shared-world/web",
    url: "http://127.0.0.1:8787/",
    reuseExistingServer: false,
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
  ],
});
