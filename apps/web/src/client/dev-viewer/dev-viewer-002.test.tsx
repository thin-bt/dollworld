import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DevViewer } from "./DevViewer.js";
import {
  ACCEPTED_STEP_WEEKS,
  describeMutationResult,
  loadSimulation,
  postReset,
  postStep,
  runMutationWithRefresh,
  STEP_WEEKS_FOUR_WEEKS,
  STEP_WEEKS_ONE_WEEK,
  STEP_WEEKS_ONE_YEAR,
  type SimulationMutationResult,
  type SimulationSummaryView,
} from "./fetch-simulation.js";
import {
  appendPeoplePage,
  formatVisibleRange,
  initialPeoplePageStack,
  isPeoplePageSize,
  pageStackForPageSizeChange,
  popPeoplePage,
  PEOPLE_PAGE_SIZES,
  PEOPLE_PAGE_SIZES_BLOCKED,
  PEOPLE_PAGE_SIZE_BLOCKED_REASON,
  PEOPLE_PAGE_SIZE_DEFAULT,
} from "./people-paging.js";
import { PeopleViewerView, type PeopleViewerViewProps } from "./PeopleViewerView.js";
import { SimulationPanelView, type SimulationPanelViewProps } from "./SimulationPanelView.js";
import type { PersonListItemView } from "./ui004-views.js";

const CSRF = "c".repeat(43);

/** Mirrors accepted WorldSummaryView fields the viewer displays. */
const summaryPayload = {
  simulationId: "sim_0001",
  seed: 42,
  worldDate: { year: 1, month: 3, week: 2 },
  elapsedWeeks: 10,
  personCount: 15,
  worldYearStartMonth: 1,
};

const summaryView: SimulationSummaryView = {
  simulationId: "sim_0001",
  worldDate: { year: 1, month: 3, week: 2 },
  elapsedWeeks: 10,
  personCount: 15,
  worldYearStartMonth: 1,
};

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
  stats: { stamina: 10, strength: 10, skill: 10, speed: 10, spirit: 10, magic: 10 },
  aptitudes: { unarmed: 10, sword: 10, magic: 10 },
  learnedTechniqueCount: 0,
};

function successEnvelope(data: unknown, uiRevision: number): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data,
    uiRevision,
    isUpdating: false,
  });
}

function failureEnvelope(code: string, message: string, commitState: string): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: false,
    error: { code, message, commitState },
    uiRevision: 7,
    isUpdating: false,
    refreshRequired: true,
  });
}

function mutationEnvelope(input: {
  operation: "step" | "reset";
  requestedWeeks: number;
  committedWeeks: number;
  completedUiRevision: number;
}): string {
  return successEnvelope(
    {
      acceptedUiRevision: input.completedUiRevision - input.committedWeeks,
      completedUiRevision: input.completedUiRevision,
      operation: input.operation,
      outcome: "success",
      requestedWeeks: input.requestedWeeks,
      committedWeeks: input.committedWeeks,
      failedWeek: null,
      eventCount: 3,
      statIncreaseCount: 1,
      techniqueLearnedCount: 0,
      validationResultCount: 0,
      mockBattleCount: 0,
      durationMs: 5,
      summary: summaryPayload,
    },
    input.completedUiRevision,
  );
}

function simulationPanelProps(
  overrides: Partial<SimulationPanelViewProps>,
): SimulationPanelViewProps {
  return {
    status: "success",
    summary: summaryView,
    uiRevision: 7,
    isUpdating: false,
    sessionState: "ready",
    errorText: null,
    mutating: false,
    feedback: null,
    onStep: () => undefined,
    onReset: () => undefined,
    ...overrides,
  };
}

function peopleViewProps(overrides: Partial<PeopleViewerViewProps>): PeopleViewerViewProps {
  return {
    status: "success",
    items: [samplePerson],
    totalCount: 15,
    uiRevision: 7,
    errorText: null,
    errorCode: null,
    pageSize: PEOPLE_PAGE_SIZE_DEFAULT,
    rangeText: "1–15 / 全15",
    pageNumber: 1,
    canPrev: false,
    canNext: false,
    nameFilter: "",
    stateFilter: "life:living",
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

describe("DEV-VIEWER-002 accepted simulation contract mapping", () => {
  it("maps 1週 / 4週 / 1年 to the accepted step weeks 1 / 4 / 48", () => {
    expect(STEP_WEEKS_ONE_WEEK).toBe(1);
    expect(STEP_WEEKS_FOUR_WEEKS).toBe(4);
    expect(STEP_WEEKS_ONE_YEAR).toBe(48);
    expect([...ACCEPTED_STEP_WEEKS]).toEqual([1, 4, 48]);
  });

  it("loadSimulation reads data.summary WorldSummaryView fields", async () => {
    const seen: string[] = [];
    const result = await loadSimulation({
      fetchImpl: async (url) => {
        seen.push(url);
        return {
          status: 200,
          text: async () =>
            successEnvelope({ summary: summaryPayload, lastOperation: { operation: "start" } }, 7),
        };
      },
    });
    expect(seen[0]).toBe("/api/s1_5/simulation");
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.summary.worldDate).toEqual({ year: 1, month: 3, week: 2 });
    expect(result.summary.elapsedWeeks).toBe(10);
    expect(result.summary.personCount).toBe(15);
    expect(result.summary.worldYearStartMonth).toBe(1);
    expect(result.uiRevision).toBe(7);
  });

  it("loadSimulation preserves SIMULATION_NOT_STARTED (not transport_error)", async () => {
    const result = await loadSimulation({
      fetchImpl: async () => ({
        status: 409,
        text: async () =>
          failureEnvelope("SIMULATION_NOT_STARTED", "simulation has not been started", "none"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.code).toBe("SIMULATION_NOT_STARTED");
    expect(result.message).toBe("simulation has not been started");
    expect(result.message).not.toBe("transport_error");
  });

  it("loadSimulation rejects a summary that lacks accepted fields", async () => {
    const result = await loadSimulation({
      fetchImpl: async () => ({
        status: 200,
        text: async () => successEnvelope({ summary: { worldDate: { year: 1 } } }, 7),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.message).toBe("summary_shape");
  });
});

describe("DEV-VIEWER-002 step and reset mutations", () => {
  it("postStep posts the accepted step body with csrf header and same-origin credentials", async () => {
    const calls: {
      url: string;
      method?: string;
      credentials?: string;
      headers?: Record<string, string>;
      body?: string;
    }[] = [];
    const result = await postStep({
      csrfToken: CSRF,
      expectedUiRevision: 7,
      weeks: STEP_WEEKS_ONE_WEEK,
      requestId: "00000000-0000-4000-8000-000000000001",
      fetchImpl: async (url, init) => {
        calls.push({ url, ...init });
        return {
          status: 200,
          text: async () =>
            mutationEnvelope({
              operation: "step",
              requestedWeeks: 1,
              committedWeeks: 1,
              completedUiRevision: 8,
            }),
        };
      },
    });
    expect(calls[0]?.url).toBe("/api/s1_5/simulation/step");
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.credentials).toBe("same-origin");
    expect(calls[0]?.headers?.["x-dollworld-csrf"]).toBe(CSRF);
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      requestId: "00000000-0000-4000-8000-000000000001",
      expectedUiRevision: 7,
      weeks: 1,
    });
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.operation).toBe("step");
    expect(result.committedWeeks).toBe(1);
    expect(result.completedUiRevision).toBe(8);
    expect(result.summary.personCount).toBe(15);
  });

  it("postStep generates a canonical UUID v4 requestId when none is supplied", async () => {
    let body = "";
    await postStep({
      csrfToken: CSRF,
      expectedUiRevision: 7,
      weeks: STEP_WEEKS_ONE_YEAR,
      fetchImpl: async (_url, init) => {
        body = init?.body ?? "";
        return {
          status: 200,
          text: async () =>
            mutationEnvelope({
              operation: "step",
              requestedWeeks: 48,
              committedWeeks: 48,
              completedUiRevision: 55,
            }),
        };
      },
    });
    const parsed = JSON.parse(body) as { requestId: string; weeks: number };
    expect(parsed.weeks).toBe(48);
    expect(parsed.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("failed step preserves the API error code, message and commitState", async () => {
    const result = await postStep({
      csrfToken: CSRF,
      expectedUiRevision: 7,
      weeks: STEP_WEEKS_FOUR_WEEKS,
      requestId: "00000000-0000-4000-8000-000000000002",
      fetchImpl: async () => ({
        status: 409,
        text: async () =>
          failureEnvelope("STALE_UI_REVISION", "expectedUiRevision is stale", "none"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.code).toBe("STALE_UI_REVISION");
    expect(result.message).toBe("expectedUiRevision is stale");
    expect(result.commitState).toBe("none");
    expect(result.message).not.toBe("transport_error");
    expect(describeMutationResult(result).kind).toBe("failure");
    expect(describeMutationResult(result).text).toContain("STALE_UI_REVISION");
  });

  it("postReset posts only requestId and expectedUiRevision", async () => {
    let url = "";
    let body = "";
    const result = await postReset({
      csrfToken: CSRF,
      expectedUiRevision: 8,
      requestId: "00000000-0000-4000-8000-000000000003",
      fetchImpl: async (requestUrl, init) => {
        url = requestUrl;
        body = init?.body ?? "";
        return {
          status: 200,
          text: async () =>
            mutationEnvelope({
              operation: "reset",
              requestedWeeks: 0,
              committedWeeks: 0,
              completedUiRevision: 9,
            }),
        };
      },
    });
    expect(url).toBe("/api/s1_5/simulation/reset");
    expect(JSON.parse(body)).toEqual({
      requestId: "00000000-0000-4000-8000-000000000003",
      expectedUiRevision: 8,
    });
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.operation).toBe("reset");
    expect(result.completedUiRevision).toBe(9);
  });
});

describe("DEV-VIEWER-002 automatic post-mutation refresh", () => {
  it("invokes the refresh callback after a successful step", async () => {
    const order: string[] = [];
    const result = await runMutationWithRefresh({
      mutate: async () => {
        order.push("step");
        return {
          kind: "success",
          operation: "step",
          outcome: "success",
          requestedWeeks: 1,
          committedWeeks: 1,
          completedUiRevision: 8,
          summary: summaryView,
          httpStatus: 200,
        } satisfies SimulationMutationResult;
      },
      refresh: () => {
        order.push("refresh");
      },
    });
    expect(result.kind).toBe("success");
    expect(order).toEqual(["step", "refresh"]);
  });

  it("invokes the refresh callback after a successful reset", async () => {
    let refreshed = 0;
    await runMutationWithRefresh({
      mutate: async () =>
        ({
          kind: "success",
          operation: "reset",
          outcome: "success",
          requestedWeeks: 0,
          committedWeeks: 0,
          completedUiRevision: 9,
          summary: summaryView,
          httpStatus: 200,
        }) satisfies SimulationMutationResult,
      refresh: async () => {
        refreshed += 1;
      },
    });
    expect(refreshed).toBe(1);
  });

  it("does not refresh when the mutation fails", async () => {
    let refreshed = 0;
    const result = await runMutationWithRefresh({
      mutate: async () =>
        ({
          kind: "failure",
          httpStatus: 409,
          code: "UPDATE_IN_PROGRESS",
          message: "an update is already in progress",
          commitState: "none",
        }) satisfies SimulationMutationResult,
      refresh: () => {
        refreshed += 1;
      },
    });
    expect(refreshed).toBe(0);
    expect(result.kind).toBe("failure");
  });
});

describe("DEV-VIEWER-002 simulation panel presentation", () => {
  it("shows contract-backed year / week / uiRevision / session state", () => {
    const html = renderToStaticMarkup(<SimulationPanelView {...simulationPanelProps({})} />);
    expect(html).toContain('data-testid="dev-viewer-simulation"');
    expect(html).toContain('data-year="1"');
    expect(html).toContain("Y1 M3 W2");
    expect(html).toContain('data-ui-revision="7"');
    expect(html).toContain('data-session-state="ready"');
    expect(html).toContain("elapsedWeeks:");
    expect(html).toContain("worldYearStartMonth:");
    expect(html).toContain('data-testid="simulation-step-1"');
    expect(html).toContain('data-testid="simulation-step-4"');
    expect(html).toContain('data-testid="simulation-step-48"');
    expect(html).toContain('data-testid="simulation-reset"');
  });

  it("enables every mutation control when idle", () => {
    const html = renderToStaticMarkup(<SimulationPanelView {...simulationPanelProps({})} />);
    expect(html).toContain('data-mutating="false"');
    expect(html).not.toContain("disabled");
  });

  it("disables every mutation control while a mutation is in flight", () => {
    const html = renderToStaticMarkup(
      <SimulationPanelView {...simulationPanelProps({ mutating: true })} />,
    );
    expect(html).toContain('data-mutating="true"');
    expect(html).toContain('data-testid="simulation-mutating"');
    const disabledCount = html.split("disabled=").length - 1;
    expect(disabledCount).toBe(4);
  });

  it("renders readable success and failure feedback", () => {
    const success = renderToStaticMarkup(
      <SimulationPanelView
        {...simulationPanelProps({
          feedback: {
            kind: "success",
            text: "成功 operation=step outcome=success requestedWeeks=1 committedWeeks=1 uiRevision=8",
          },
        })}
      />,
    );
    expect(success).toContain('data-testid="simulation-feedback"');
    expect(success).toContain('data-kind="success"');
    expect(success).toContain("uiRevision=8");

    const failure = renderToStaticMarkup(
      <SimulationPanelView
        {...simulationPanelProps({
          status: "error",
          summary: null,
          uiRevision: null,
          errorText: "SIMULATION_NOT_STARTED: simulation has not been started",
          feedback: {
            kind: "failure",
            text: "失敗 STALE_UI_REVISION: expectedUiRevision is stale",
          },
        })}
      />,
    );
    expect(failure).toContain('data-kind="failure"');
    expect(failure).toContain("STALE_UI_REVISION");
    expect(failure).toContain('data-status="error"');
  });
});

describe("DEV-VIEWER-002 People paging state", () => {
  it("offers only the accepted UI-004 limit enum with default 50", () => {
    expect([...PEOPLE_PAGE_SIZES]).toEqual([50, 100, 200]);
    expect(PEOPLE_PAGE_SIZE_DEFAULT).toBe(50);
    expect(isPeoplePageSize(50)).toBe(true);
    expect(isPeoplePageSize(5)).toBe(false);
    expect(isPeoplePageSize(10)).toBe(false);
    expect(isPeoplePageSize(25)).toBe(false);
  });

  it("marks page size 5 / 10 / 25 BLOCKED citing the UI-004 limit enum", () => {
    expect([...PEOPLE_PAGE_SIZES_BLOCKED]).toEqual([5, 10, 25]);
    expect(PEOPLE_PAGE_SIZE_BLOCKED_REASON).toContain("BLOCKED");
    expect(PEOPLE_PAGE_SIZE_BLOCKED_REASON).toContain("50 | 100 | 200");
  });

  it("Next appends the server cursor and Prev pops it", () => {
    const first = initialPeoplePageStack();
    expect(first).toEqual([{ cursor: null, offset: 0 }]);
    const second = appendPeoplePage(first, { nextCursor: "cursor.a", loadedItemCount: 50 });
    expect(second).toEqual([
      { cursor: null, offset: 0 },
      { cursor: "cursor.a", offset: 50 },
    ]);
    const third = appendPeoplePage(second, { nextCursor: "cursor.b", loadedItemCount: 50 });
    expect(third[2]).toEqual({ cursor: "cursor.b", offset: 100 });
    expect(popPeoplePage(third)).toEqual(second);
    expect(popPeoplePage(first)).toEqual(initialPeoplePageStack());
  });

  it("page-size change resets the cursor stack to the first server page", () => {
    const deep = appendPeoplePage(
      appendPeoplePage(initialPeoplePageStack(), {
        nextCursor: "cursor.a",
        loadedItemCount: 50,
      }),
      { nextCursor: "cursor.b", loadedItemCount: 50 },
    );
    expect(deep).toHaveLength(3);
    expect(pageStackForPageSizeChange()).toEqual([{ cursor: null, offset: 0 }]);
  });

  it("formats the visible range from the server page offset", () => {
    expect(formatVisibleRange({ offset: 0, itemCount: 15, totalCount: 15 })).toBe("1–15 / 全15");
    expect(formatVisibleRange({ offset: 50, itemCount: 50, totalCount: 120 })).toBe(
      "51–100 / 全120",
    );
    expect(formatVisibleRange({ offset: 0, itemCount: 0, totalCount: 0 })).toBe("表示なし / 全0");
  });
});

describe("DEV-VIEWER-002 People panel presentation", () => {
  it("renders the 50/100/200 selector, range, page number and blocked banner", () => {
    const html = renderToStaticMarkup(<PeopleViewerView {...peopleViewProps({})} />);
    expect(html).toContain('data-testid="people-page-size"');
    expect(html).toContain('data-page-size="50"');
    expect(html).toContain('value="50"');
    expect(html).toContain('value="100"');
    expect(html).toContain('value="200"');
    expect(html).not.toContain('value="5"');
    expect(html).not.toContain('value="25"');
    expect(html).toContain('data-testid="people-range"');
    expect(html).toContain("1–15 / 全15");
    expect(html).toContain('data-testid="people-page-number"');
    expect(html).toContain('data-page="1"');
    expect(html).toContain('data-testid="people-page-size-blocked"');
    expect(html).toContain('data-blocked-page-sizes="5,10,25"');
    expect(html).toContain("50 | 100 | 200");
  });

  it("keeps Prev/Next affordances driven by cursor availability", () => {
    const middle = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          pageNumber: 2,
          rangeText: "51–100 / 全120",
          canPrev: true,
          canNext: true,
        })}
      />,
    );
    expect(middle).toContain('data-page="2"');
    expect(middle).toContain("51–100 / 全120");
    expect(middle).toContain('data-testid="people-prev">前へ</button>');
    expect(middle).toContain('data-testid="people-next">次へ</button>');
    expect(middle).not.toMatch(/data-testid="people-prev"[^>]*disabled/);
    expect(middle).not.toMatch(/data-testid="people-next"[^>]*disabled/);

    const single = renderToStaticMarkup(<PeopleViewerView {...peopleViewProps({})} />);
    expect(single).toMatch(/data-testid="people-prev"[^>]*disabled/);
    expect(single).toMatch(/data-testid="people-next"[^>]*disabled/);
  });
});

describe("DEV-VIEWER-002 viewer boundaries", () => {
  it("does not expose UI-005 PersonDetail", () => {
    const html = renderToStaticMarkup(<DevViewer />);
    expect(html).toContain('data-testid="dev-viewer-excluded-ui005"');
    expect(html).toContain("no current authority explicitly releases UI-005");
    expect(html).not.toContain("/api/s1_5/people/");
    expect(html).not.toContain('data-testid="person-detail"');
  });
});
