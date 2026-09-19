import { afterEach, describe, expect, it } from "vitest";
import { createUiApp, type UiApp } from "./app.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const FORBIDDEN_STILL = [
  "/api/s1_5/simulations",
  "/api/s1_5/simulations/current",
  "/api/s1_5/simulations/current/step",
  "/api/s1_5/simulations/current/reset",
  "/api/s1_5/people/candidates",
  "/api/s1_5/battle-log",
];

const REGISTERED = [
  "/api/s1_5/session",
  "/api/s1_5/presets",
  "/api/s1_5/simulation",
  "/api/s1_5/simulation/start",
  "/api/s1_5/simulation/step",
  "/api/s1_5/simulation/reset",
  "/api/s1_5/people",
  "/api/s1_5/people/:personId",
  "/api/s1_5/mock-battles/candidates",
  "/api/s1_5/mock-battles",
  "/api/s1_5/mock-battles/replay",
  "/api/s1_5/mock-battles/latest",
  "/api/s1_5/mock-battles/latest/log",
  "/api/s1_5/events",
  "/api/s1_5/validation-results",
  "/api/s1_5/competition",
  "/api/s1_5/competition/step",
  "/api/s1_5/competition/matches/:matchId",
];

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("UI-008 owned routes registration", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("registers events and validation-results; keeps other forbidden paths", async () => {
    app = await createUiApp({
      publicOrigin: "http://127.0.0.1:8787",
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
    });
    expect(app.ui001RegisteredApiPaths).toEqual(REGISTERED);
    expect(app.hasRoute({ method: "GET", url: "/api/s1_5/events" })).toBe(true);
    expect(app.hasRoute({ method: "GET", url: "/api/s1_5/validation-results" })).toBe(true);
    expect(app.hasRoute({ method: "GET", url: "/api/s1_5/mock-battles/latest/log" })).toBe(true);

    expect(app.hasRoute({ method: "GET", url: "/api/s1_5/mock-battles" })).toBe(false);
    for (const path of FORBIDDEN_STILL) {
      expect(app.hasRoute({ method: "GET", url: path })).toBe(false);
      expect(app.hasRoute({ method: "POST", url: path })).toBe(false);
    }
  });
});
