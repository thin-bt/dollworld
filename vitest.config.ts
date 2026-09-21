import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.tsx",
      "tests/e2e/support/**/*.test.ts",
    ],
    // Long-horizon Sprint 0 Vitest wrapper is optional/manual; `npm run verify:sprint0`
    // runs the CLI suite (`verify-sprint0-main.js`), not this file.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.long.test.ts"],
    // UI server boot (FV-001) and tournament-week simulation/start auto-progression
    // can exceed 15s on accepted integration presets (seed 42 / UI009 playable week).
    testTimeout: 120_000,
    // Serialize test files on the canonical executor so heavy simulation suites
    // (ST-012, CHK-009, WIN-006) are not starved by parallel Vitest workers.
    fileParallelism: false,
    maxWorkers: 1,
  },
});
