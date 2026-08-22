import { afterEach, describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type UiApp } from "./app.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function boot(enableTestProbe = true): Promise<UiApp> {
  return createUiApp({
    publicOrigin: ORIGIN,
    enableTestProbe,
    repoRoot: REPO_ROOT,
    // Probe remains CSRF-exempt under enableTestProbe so Host/Origin FI stay UI-001-shaped.
    exemptTestProbeFromCsrf: true,
  });
}

describe("UI-001 Fastify loopback + Host/Origin primitive", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("boots and answers an allowed Host GET without domain feature routes", async () => {
    app = await boot(false);
    const response = await app.inject({
      method: "GET",
      url: "/",
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(404);
  });

  it("FI-001 rejects a non-loopback Host before any mutation", async () => {
    app = await boot(true);
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/ui001-test-probe`,
      headers: { host: "example.com" },
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as {
      ok: boolean;
      error: { code: string; commitState: string };
      uiRevision: number | null;
      isUpdating: boolean;
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("REQUEST_FORBIDDEN");
    expect(body.error.commitState).toBe("none");
    expect(body.uiRevision).toBe(null);
    expect(body.isUpdating).toBe(false);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("FI-002 rejects a state-changing POST with a foreign Origin", async () => {
    app = await boot(true);
    const response = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/ui001-test-probe`,
      headers: {
        host: HOST,
        origin: "http://evil.example",
        "content-type": "application/json",
      },
      payload: { probe: true },
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as {
      ok: boolean;
      error: { code: string };
      uiRevision: number | null;
      isUpdating: boolean;
    };
    expect(body.error.code).toBe("REQUEST_FORBIDDEN");
    expect(body.uiRevision).toBe(null);
    expect(body.isUpdating).toBe(false);
  });

  it("FI-002 rejects a state-changing POST with a missing Origin", async () => {
    app = await boot(true);
    const response = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/ui001-test-probe`,
      headers: {
        host: HOST,
        "content-type": "application/json",
      },
      payload: { probe: true },
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe("REQUEST_FORBIDDEN");
  });

  it("FI-003 rejects invalid JSON before the probe handler", async () => {
    app = await boot(true);
    const response = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/ui001-test-probe`,
      headers: {
        host: HOST,
        origin: ORIGIN,
        "content-type": "application/json",
      },
      payload: "{not-json",
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("accepts a probe POST with Host and Origin when the test probe is enabled", async () => {
    app = await boot(true);
    const response = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/ui001-test-probe`,
      headers: {
        host: HOST,
        origin: ORIGIN,
        "content-type": "application/json",
      },
      payload: { probe: true },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { ok: boolean; data: { probe: boolean } };
    expect(body.ok).toBe(true);
    expect(body.data.probe).toBe(true);
  });
});
