import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadPeoplePage, personDetailPath } from "../dev-viewer/fetch-ui004.js";
import { PeopleViewerView, type PeopleViewerViewProps } from "../dev-viewer/PeopleViewerView.js";
import { PEOPLE_PAGE_SIZE_DEFAULT } from "../dev-viewer/people-paging.js";
import type { PersonListItemView } from "../dev-viewer/ui004-views.js";
import { Shell } from "../Shell.js";

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
    sortBy: "",
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

describe("FE-01 /people route and Shell navigation", () => {
  it("Shell 人物 menu reaches /people and people route mounts viewer", () => {
    const home = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "home" }} />);
    expect(home).toContain('data-menu-item="人物"');
    expect(home).toContain('href="/people"');

    const people = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "people" }} />);
    expect(people).toContain('data-testid="dev-viewer-people"');
    expect(people).toContain('data-menu-active="true"');
  });

  it("row navigation uses a single displayName link to personId path", () => {
    expect(personDetailPath("person_000001")).toBe("/people/person_000001");
    const html = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [{ ...samplePerson, currentRank: "C" }],
          totalCount: 1,
          enablePersonNavigation: true,
        })}
      />,
    );
    expect(html).toContain('href="/people/person_000001"');
    expect(html).toContain('data-person-nav="person_000001"');
    expect(html).toContain('data-testid="people-open-person_000001"');
    expect(html).toContain(">Test Person</a>");
    expect(html).not.toContain('data-testid="people-detail-person_000001"');
    expect(html).not.toContain(">詳細</a>");
    // Rank once: dedicated column only (no badge beside the name).
    expect(html).toContain("<th>段位</th>");
    expect(html).toContain(">C</td>");
    expect(html).not.toContain('class="dw-badge dw-rank-badge"');
  });
});

describe("FE-01 API-007 query/paging (no local domain recompute)", () => {
  it("first page hits /api/s1_5/people with limit", async () => {
    let seen = "";
    const result = await loadPeoplePage({
      cursor: null,
      limit: 50,
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({ items: [samplePerson], totalCount: 1, nextCursor: null }),
        };
      },
    });
    expect(result.kind).toBe("success");
    expect(seen).toContain("/api/s1_5/people?");
    expect(seen).toContain("limit=50");
  });

  it("filter/sort/cursor are forwarded as API query params", async () => {
    let seen = "";
    await loadPeoplePage({
      cursor: "cursor.token",
      limit: 100,
      query: {
        name: "Alice",
        state: "life:living",
        sortBy: "stamina",
        sortOrder: "desc",
      },
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({ items: [samplePerson], totalCount: 2, nextCursor: null }),
        };
      },
    });
    expect(seen).toContain("name=Alice");
    expect(seen).toContain("state=life%3Aliving");
    expect(seen).toContain("sortBy=stamina");
    expect(seen).toContain("sortOrder=desc");
    expect(seen).toContain("cursor=cursor.token");
    expect(seen).toContain("limit=100");
  });
});

describe("FE-01 loading / empty / error / stale / safe-text", () => {
  it("renders distinct loading empty error stale states", () => {
    expect(
      renderToStaticMarkup(<PeopleViewerView {...peopleViewProps({ status: "loading" })} />),
    ).toContain('data-status="loading"');
    expect(
      renderToStaticMarkup(<PeopleViewerView {...peopleViewProps({ status: "empty" })} />),
    ).toContain('data-status="empty"');
    expect(
      renderToStaticMarkup(
        <PeopleViewerView
          {...peopleViewProps({
            status: "error",
            errorCode: "SIMULATION_NOT_STARTED",
            errorText: "SIMULATION_NOT_STARTED: not started",
          })}
        />,
      ),
    ).toContain('data-status="error"');
    const stale = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "stale",
          errorCode: "STALE_CURSOR",
          errorText: "STALE_CURSOR: cursor is stale",
        })}
      />,
    );
    expect(stale).toContain('data-status="stale"');
    expect(stale).toContain('data-testid="people-fresh-reload"');
    expect(stale).not.toContain('data-status="success"');
  });

  it("safe-text renders malicious server strings literally", () => {
    const evil: PersonListItemView = {
      ...samplePerson,
      displayName: "<img src=x onerror=alert(1)>",
      personId: "person_000099",
    };
    const html = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [evil],
          totalCount: 1,
          enablePersonNavigation: true,
        })}
      />,
    );
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
  });

  it("STALE_CURSOR failure is preserved from API (not transport_error)", async () => {
    const result = await loadPeoplePage({
      cursor: "stale",
      fetchImpl: async () => ({
        status: 409,
        text: async () => failureEnvelope("STALE_CURSOR", "cursor is stale"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.code).toBe("STALE_CURSOR");
      expect(result.message).toBe("cursor is stale");
    }
  });
});

describe("FE-01 static audit", () => {
  it("FIX10: ordinary headings use canonical JP labels 技量/精神/格闘/剣技", () => {
    const html = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [samplePerson],
          totalCount: 1,
        })}
      />,
    );
    expect(html).toContain(">体力<");
    expect(html).toContain(">筋力<");
    expect(html).toContain(">技量<");
    expect(html).toContain(">速度<");
    expect(html).toContain(">精神<");
    expect(html).toContain(">魔力<");
    expect(html).toContain(">格闘<");
    expect(html).toContain(">剣技<");
    expect(html).toContain(">魔法<");
    expect(html).not.toContain(">技術<");
    expect(html).not.toContain("精神（能力）");
    expect(html).not.toContain(">素手<");
    expect(html).not.toContain(">剣<");
  });
});
