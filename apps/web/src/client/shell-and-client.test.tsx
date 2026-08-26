import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { decodeApiResponse } from "./api-client.js";
import { Shell } from "./Shell.js";
import { ensureReadySimulation, loadUiSession } from "./session-client.js";

describe("UI-001 React static shell", () => {
  it("renders common menu; session dev consolidated on home simulation panel", () => {
    const html = renderToStaticMarkup(<Shell sessionState="empty" />);
    expect(html).toContain("シミュレーション");
    expect(html).toContain("人物");
    expect(html).toContain('href="/people"');
    expect(html).toContain("模擬戦");
    expect(html).toContain("イベント");
    expect(html).toContain('href="/events"');
    expect(html).not.toContain('data-testid="shell-session-developer-details"');
    expect(html).not.toContain("/api/s1_5/people/");
    expect(html).not.toContain("/mock-battles");
    expect(html).not.toContain("/api/s1_5/events");
  });
});

describe("production `/` session lifecycle parity with /dev-viewer", () => {
  it("gates people route until session is ready (no premature SESSION_REQUIRED)", () => {
    const loading = renderToStaticMarkup(<Shell sessionState="empty" route={{ kind: "people" }} />);
    expect(loading).toContain("読み込み中…");
    expect(loading).not.toContain('data-testid="dev-viewer-people"');
    const ready = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "people" }} />);
    expect(ready).toContain('data-testid="dev-viewer-people"');
  });

  it("mounts Events during updating session so mock-ready contention can still read", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="updating" route={{ kind: "events", tab: "events" }} />,
    );
    expect(html).toContain('data-testid="events-page"');
  });

  it("empty session then ensureReadySimulation before domain reads", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string, init?: { method?: string }) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("/session") && (init?.method ?? "GET") === "GET") {
        if (calls.filter((c) => c.startsWith("GET ") && c.includes("/session")).length === 1) {
          return {
            status: 200,
            text: async () =>
              JSON.stringify({
                apiSchemaVersion: "0.2.0",
                ok: true,
                data: {
                  sessionState: "empty",
                  csrfToken: "b".repeat(43),
                  activeOperation: null,
                },
                uiRevision: 0,
                isUpdating: false,
              }),
          };
        }
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              apiSchemaVersion: "0.2.0",
              ok: true,
              data: {
                sessionState: "ready",
                csrfToken: "b".repeat(43),
                activeOperation: null,
              },
              uiRevision: 1,
              isUpdating: false,
            }),
        };
      }
      if (url.includes("/simulation/start")) {
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              apiSchemaVersion: "0.2.0",
              ok: true,
              data: { operation: "start" },
              uiRevision: 1,
              isUpdating: false,
            }),
        };
      }
      throw new Error(`unexpected ${url}`);
    };

    const session = await loadUiSession({ fetchImpl });
    expect(session.kind).toBe("success");
    if (session.kind !== "success") {
      return;
    }
    expect(session.sessionState).toBe("empty");
    const ready = await ensureReadySimulation({
      csrfToken: session.csrfToken,
      expectedUiRevision: session.uiRevision,
      fetchImpl,
      requestId: "00000000-0000-4000-8000-000000000099",
    });
    expect(ready.kind).toBe("success");
    if (ready.kind === "success") {
      expect(ready.sessionState).toBe("ready");
    }
    expect(calls[0]).toContain("/api/s1_5/session");
    expect(calls.some((c) => c.includes("/simulation/start"))).toBe(true);
    expect(calls.some((c) => c.includes("/simulation/step"))).toBe(false);
    expect(calls.findIndex((c) => c.includes("/session"))).toBeLessThan(
      calls.findIndex((c) => c.includes("/simulation/start")),
    );
  });
});

describe("client transport/envelope primitive", () => {
  it("FI-006 does not treat a malformed body as success", () => {
    const malformed = decodeApiResponse("{not json");
    expect(malformed.kind).toBe("transport_error");

    const nonSchema = decodeApiResponse(JSON.stringify({ ok: true, data: {} }));
    expect(nonSchema.kind).toBe("transport_error");

    const success = decodeApiResponse(
      JSON.stringify({
        apiSchemaVersion: "0.2.0",
        ok: true,
        data: { probe: true },
        uiRevision: 0,
        isUpdating: false,
      }),
    );
    expect(success.kind).toBe("success");
  });
});
