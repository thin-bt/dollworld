import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    // Long-horizon Sprint 0 Vitest wrapper is optional/manual; `npm run verify:sprint0`
    // runs the CLI suite (`verify-sprint0-main.js`), not this file.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.long.test.ts"],
  },
});
