import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Shell } from "../Shell.js";
import { DevViewer } from "./DevViewer.js";
import { loadMockCandidatesPage, loadPeoplePage } from "./fetch-ui004.js";
import { MockCandidatesViewerView } from "./MockCandidatesViewerView.js";
import { PEOPLE_PAGE_SIZE_DEFAULT } from "./people-paging.js";
import { PeopleViewerView, type PeopleViewerViewProps } from "./PeopleViewerView.js";
import type { MockBattleCandidateView, PersonListItemView } from "./ui004-views.js";

function peopleViewProps(overrides: Partial<PeopleViewerViewProps>): PeopleViewerViewProps {
  return {
    status: "loading",
    items: [],
    totalCount: 0,
    uiRevision: null,
    errorText: null,
    errorCode: null,
    pageSize: PEOPLE_PAGE_SIZE_DEFAULT,
    rangeText: "表示なし / 全0",
    pageNumber: 1,
    canPrev: false,
    canNext: false,
    nameFilter: "",
    stateFilter: "",
    sortBy: "personId",
    sortOrder: "asc",
    onPageSizeChange: () => undefined,
    onPrev: () => undefined,
    onNext: () => undefined,
    onNameFilterChange: () => undefined,
    onStateFilterChange: () => undefined,
    onSortByChange: () => undefined,
    onSortOrderChange: () => undefined,
    onApplyQuery: () => undefined,
    onFreshReload: () => undefined,
    ...overrides,
  };
}

const samplePerson: PersonListItemView = {
  personId: "person_000001",
  displayName: "Test Person",
  lifeStatus: "living",
  participationStatus: "active",
  careerStatus: "trainee",
  age: 12,
  deathYear: null,
  ageAtDeath: null,
  familyId: "family_000001",
  lineageId: null,
  currentRank: null,
  highestRank: null,
  retirementRank: null,
  stats: {
    stamina: 10,
    strength: 10,
    skill: 10,
    speed: 10,
    spirit: 10,
    magic: 10,
  },
  aptitudes: { unarmed: 10, sword: 10, magic: 10 },
  learnedTechniqueCount: 0,
};

const sampleCandidate: MockBattleCandidateView = {
  personId: "person_000002",
  displayName: "Candidate",
  age: 14,
  careerStatus: "trainee",
};

function successEnvelope(data: unknown): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data,
    uiRevision: 1,
    isUpdating: false,
  });
}

function failureEnvelope(code: string, message: string): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: false,
    error: { code, message, commitState: "none" },
    uiRevision: 1,
    isUpdating: false,
    refreshRequired: false,
  });
}

describe("DEV-VIEWER-001 shell entry", () => {
  it("exposes /dev-viewer developer entry without PersonDetail links", () => {
    const html = renderToStaticMarkup(<Shell sessionState="empty" />);
    expect(html).toContain('data-testid="dev-viewer-entry"');
    expect(html).toContain("/dev-viewer");
    expect(html).not.toContain("/api/s1_5/people/");
    expect(html).not.toContain("PersonDetail");
  });

  it("DevViewer marks UI-005 exclusion and session gate (SSR = loading)", () => {
    const html = renderToStaticMarkup(<DevViewer />);
    expect(html).toContain("Dollworld Dev Viewer");
    expect(html).toContain("PersonDetail (UI-005) is not exposed");
    expect(html).toContain("dev-viewer-excluded-ui006");
    expect(html).toContain('data-testid="dev-viewer-session-gate"');
    expect(html).toContain('data-gate="loading"');
    // Lists mount only after session gate is ready (useEffect); SSR stays gated.
    expect(html).not.toContain('data-testid="dev-viewer-people"');
  });
});

describe("DEV-VIEWER-001 presentational states", () => {
  it("loading / success / empty / error / paging affordances", () => {
    const loading = renderToStaticMarkup(
      <PeopleViewerView {...peopleViewProps({ status: "loading" })} />,
    );
    expect(loading).toContain('data-status="loading"');

    const success = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [samplePerson],
          totalCount: 1,
          uiRevision: 3,
          rangeText: "1–1 / 全1",
          canNext: true,
        })}
      />,
    );
    expect(success).toContain('data-status="success"');
    expect(success).toContain("person_000001");
    expect(success).toContain("Test Person");
    expect(success).toContain('data-testid="people-next"');

    const empty = renderToStaticMarkup(
      <PeopleViewerView {...peopleViewProps({ status: "empty", uiRevision: 1 })} />,
    );
    expect(empty).toContain('data-status="empty"');

    const error = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "error",
          errorText: "SIMULATION_NOT_STARTED: simulation has not been started",
        })}
      />,
    );
    expect(error).toContain('data-status="error"');
    expect(error).toContain("SIMULATION_NOT_STARTED");

    const candidates = renderToStaticMarkup(
      <MockCandidatesViewerView
        status="success"
        items={[sampleCandidate]}
        totalCount={1}
        uiRevision={2}
        errorText={null}
        canPrev={true}
        canNext={false}
        onPrev={() => undefined}
        onNext={() => undefined}
      />,
    );
    expect(candidates).toContain("person_000002");
    expect(candidates).toContain("trainee");
  });
});

describe("DEV-VIEWER-001 fetch-ui004 (API-007/011)", () => {
  it("success with items", async () => {
    const result = await loadPeoplePage({
      cursor: null,
      fetchImpl: async () => ({
        status: 200,
        text: async () =>
          successEnvelope({
            items: [samplePerson],
            totalCount: 1,
            nextCursor: null,
          }),
      }),
    });
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.totalCount).toBe(1);
    }
  });

  it("empty result", async () => {
    const result = await loadPeoplePage({
      cursor: null,
      fetchImpl: async () => ({
        status: 200,
        text: async () => successEnvelope({ items: [], totalCount: 0, nextCursor: null }),
      }),
    });
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.items).toEqual([]);
      expect(result.data.totalCount).toBe(0);
    }
  });

  it("API failure", async () => {
    const result = await loadPeoplePage({
      cursor: null,
      fetchImpl: async () => ({
        status: 409,
        text: async () =>
          failureEnvelope("SIMULATION_NOT_STARTED", "simulation has not been started"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.code).toBe("SIMULATION_NOT_STARTED");
      expect(result.httpStatus).toBe(409);
    }
  });

  it("paging passes cursor query to people and candidates", async () => {
    const seen: string[] = [];
    await loadPeoplePage({
      cursor: "cursor.token",
      limit: 50,
      fetchImpl: async (url) => {
        seen.push(url);
        return {
          status: 200,
          text: async () =>
            successEnvelope({ items: [samplePerson], totalCount: 2, nextCursor: null }),
        };
      },
    });
    expect(seen[0]).toContain("/api/s1_5/people?");
    expect(seen[0]).toContain("limit=50");
    expect(seen[0]).toContain("cursor=cursor.token");

    await loadMockCandidatesPage({
      cursor: "cand.token",
      fetchImpl: async (url) => {
        seen.push(url);
        return {
          status: 200,
          text: async () =>
            successEnvelope({
              items: [sampleCandidate],
              totalCount: 1,
              nextCursor: null,
            }),
        };
      },
    });
    expect(seen[1]).toContain("/api/s1_5/mock-battles/candidates?");
    expect(seen[1]).toContain("cursor=cand.token");
  });

  it("rejects wrong item key set (no guessed shapes)", async () => {
    const result = await loadPeoplePage({
      cursor: null,
      fetchImpl: async () => ({
        status: 200,
        text: async () =>
          successEnvelope({
            items: [{ personId: "x", displayName: "y" }],
            totalCount: 1,
            nextCursor: null,
          }),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.message).toBe("data_shape");
    }
  });
});

describe("DEV-VIEWER-001 session initialization before domain fetch", () => {
  it("loadUiSession success + ensureReadySimulation order before people", async () => {
    const { loadUiSession, ensureReadySimulation } = await import("../session-client.js");
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
                  csrfToken: "a".repeat(43),
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
                csrfToken: "a".repeat(43),
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
    if (session.kind !== "success") return;
    expect(session.sessionState).toBe("empty");
    const ready = await ensureReadySimulation({
      csrfToken: session.csrfToken,
      expectedUiRevision: session.uiRevision,
      fetchImpl,
      requestId: "00000000-0000-4000-8000-000000000001",
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

  it("preserves SESSION_REQUIRED from people fetch (not transport_error)", async () => {
    const result = await loadPeoplePage({
      cursor: null,
      fetchImpl: async () => ({
        status: 401,
        text: async () => failureEnvelope("SESSION_REQUIRED", "session cookie is required"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.code).toBe("SESSION_REQUIRED");
      expect(result.message).toBe("session cookie is required");
      expect(result.message).not.toBe("transport_error");
    }
  });
});
