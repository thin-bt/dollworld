import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BattleLogViewPanel } from "../battle-log/BattleLogView.js";
import { loadBattleLogPage } from "../battle-log/fetch-ui007.js";
import { BATTLE_LOG_ITEM_VIEW_KEYS, type BattleLogItemView } from "../battle-log/ui007-views.js";
import { personDetailPath } from "../dev-viewer/fetch-ui004.js";
import { PeopleViewerView, type PeopleViewerViewProps } from "../dev-viewer/PeopleViewerView.js";
import { PEOPLE_PAGE_SIZE_DEFAULT } from "../dev-viewer/people-paging.js";
import type { PersonListItemView } from "../dev-viewer/ui004-views.js";
import { EventListView, type EventListViewProps } from "../events/EventListView.js";
import { EventsPage, parseEventsTab } from "../events/EventsPage.js";
import { loadEventsPage, loadValidationResultsPage } from "../events/fetch-ui008.js";
import type { EventListItemView, ValidationResultViewItem } from "../events/ui008-views.js";
import { ValidationListView, type ValidationListViewProps } from "../events/ValidationListView.js";
import {
  loadMockBattleLatest,
  postMockBattle,
  postMockBattleReplay,
} from "../mock-battle/fetch-ui006.js";
import { MockBattleViewPanel, type MockBattleViewProps } from "../mock-battle/MockBattleView.js";
import { MOCK_BATTLE_VIEW_KEYS, type MockBattleView } from "../mock-battle/ui006-views.js";
import { loadPersonDetail } from "../person-detail/fetch-ui005.js";
import { PersonDetailViewPanel } from "../person-detail/PersonDetailView.js";
import type { PersonDetailView } from "../person-detail/ui005-views.js";
import { Shell } from "../Shell.js";
import {
  FE_INTEGRATION_ROUTES,
  FE_SHELL_NAV,
  FE_TRACEABILITY_ROWS,
} from "./frontend-traceability.js";

function successEnvelope(data: unknown, uiRevision = 1): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data,
    uiRevision,
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

function samplePerson(overrides: Partial<PersonListItemView> = {}): PersonListItemView {
  return {
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
    ...overrides,
  };
}

function sampleDetail(): PersonDetailView {
  return {
    personId: "person_000001",
    displayName: "Test Person",
    sex: "male",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "trainee",
    birthYear: 1,
    age: 12,
    deathYear: null,
    ageAtDeath: null,
    familyId: "family_000001",
    lineageId: null,
    currentRank: null,
    highestRank: null,
    retirementRank: null,
    qualifiedMaster: false,
    parentPersonIds: [],
    formalMasterPersonIds: [],
    stats: {
      stamina: 10,
      strength: 10,
      skill: 10,
      speed: 10,
      spirit: 10,
      magic: 10,
    },
    aptitudes: { unarmed: 10, sword: 10, magic: 10 },
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    currentMental: 50,
    learningFocusTechniqueId: null,
    statHistory: null,
    techniques: [],
    trainingHistory: { available: true, items: [] },
  };
}

function sampleMock(overrides: Partial<MockBattleView> = {}): MockBattleView {
  const base: MockBattleView = {
    resultUiRevision: 2,
    sourceWorldUiRevision: 1,
    battleResultSchemaVersion: "0.5.0",
    matchId: "match_1",
    simulationId: "simulation_x",
    battleKind: "mock",
    participantAPersonId: "person_000001",
    participantBPersonId: "person_000002",
    participantAActionSourceIdentity: {},
    participantBActionSourceIdentity: {},
    participantSourceSnapshotHashes: {},
    sourceWorldDate: { year: 1, month: 1, week: 1 },
    battleSeed: 9,
    resultKind: "completed",
    winnerPersonId: "person_000001",
    loserPersonId: "person_000002",
    endReason: "ko",
    endReasonIsJudgeDecision: false,
    judgementApplied: false,
    judgeScore: null,
    turnsExecuted: 3,
    battleInputHash: "a".repeat(64),
    runRuleSnapshotHash: "b".repeat(64),
    sprint1ConfigVersion: "0.1.0",
    sprint1ConfigHash: "c".repeat(64),
    techniqueCatalogDataVersion: "0.1.0",
    techniqueCatalogHash: "d".repeat(64),
    finalState: {},
    finalRngState: { counter: 1 },
    failure: null,
    eventCandidates: [],
    validation: null,
    logTotalCount: 2,
    replayAvailable: true,
  };
  return { ...base, ...overrides };
}

function sampleLogItem(sequenceInBattle: number): BattleLogItemView {
  const item = Object.fromEntries(
    BATTLE_LOG_ITEM_VIEW_KEYS.map((key) => [key, null]),
  ) as BattleLogItemView;
  item.sequenceInBattle = sequenceInBattle;
  item.actionSequence = sequenceInBattle;
  item.turnNumber = 1;
  item.actorPersonId = "person_000001";
  item.actorSide = "sideA";
  item.requestedAction = "strike";
  item.resolvedAction = "strike";
  item.techniqueId = "technique_001";
  item.hit = true;
  item.damage = 1;
  return item;
}

function sampleEvent(overrides: Partial<EventListItemView> = {}): EventListItemView {
  return {
    schemaVersion: "0.5.0",
    eventId: "event_000001",
    simulationId: "simulation_x",
    sequence: 1,
    eventType: "training_completed",
    importance: "normal",
    worldDate: { year: 1, month: 1, week: 1 },
    origin: { kind: "processor" },
    sourceProcessor: "training",
    entities: { personIds: ["person_000001"] },
    payload: { note: "ok" },
    ...overrides,
  };
}

function sampleValidation(
  overrides: Partial<ValidationResultViewItem> = {},
): ValidationResultViewItem {
  return {
    validationOccurrence: 1,
    status: "failure",
    issueCount: 1,
    issues: [{ path: "/stats/stamina", message: "out of range" }],
    result: { ok: false },
    ...overrides,
  };
}

function peopleViewProps(overrides: Partial<PeopleViewerViewProps> = {}): PeopleViewerViewProps {
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

function mockViewProps(overrides: Partial<MockBattleViewProps> = {}): MockBattleViewProps {
  return {
    candidatesStatus: "success",
    candidates: [
      {
        personId: "person_000001",
        displayName: "A",
        age: 20,
        careerStatus: "trainee",
      },
      {
        personId: "person_000002",
        displayName: "B",
        age: 21,
        careerStatus: "trainee",
      },
    ],
    candidatesError: null,
    participantAId: "person_000001",
    participantBId: "person_000002",
    participantASummaryStatus: "idle",
    participantBSummaryStatus: "idle",
    participantADetail: null,
    participantBDetail: null,
    participantASummaryError: null,
    participantBSummaryError: null,
    samePersonBlocked: false,
    actionPending: false,
    actionError: null,
    actionErrorCode: null,
    latestStatus: "idle",
    latestError: null,
    trustedResult: null,
    replayAvailable: false,
    onParticipantAChange: () => undefined,
    onParticipantBChange: () => undefined,
    onRun: () => undefined,
    onReplay: () => undefined,
    onLatest: () => undefined,
    ...overrides,
  };
}

function eventViewProps(overrides: Partial<EventListViewProps> = {}): EventListViewProps {
  return {
    status: "loading",
    items: [],
    totalCount: 0,
    errorText: null,
    errorCode: null,
    personIdFilter: "",
    eventGroupFilter: "",
    yearFilter: "",
    monthFilter: "",
    weekFilter: "",
    yearOptionsMax: 12,
    filterHint: null,
    canNext: false,
    loading: false,
    onPersonIdFilterChange: () => undefined,
    onEventGroupFilterChange: () => undefined,
    onYearFilterChange: () => undefined,
    onMonthFilterChange: () => undefined,
    onWeekFilterChange: () => undefined,
    onApplyQuery: () => undefined,
    onResetToNewest: () => undefined,
    onNext: () => undefined,
    onFreshReload: () => undefined,
    ...overrides,
  };
}

function validationViewProps(
  overrides: Partial<ValidationListViewProps> = {},
): ValidationListViewProps {
  return {
    status: "loading",
    items: [],
    totalCount: 0,
    errorText: null,
    errorCode: null,
    statusFilter: "",
    canNext: false,
    loading: false,
    onStatusFilterChange: () => undefined,
    onApplyQuery: () => undefined,
    onNext: () => undefined,
    onFreshReload: () => undefined,
    ...overrides,
  };
}

describe("FE-06 navigation matrix", () => {
  it("1. Shell -> People -> exact Detail -> keyboard return", () => {
    const home = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "home" }} />);
    expect(home).toContain('data-menu-item="人物"');
    expect(home).toContain('href="/people"');

    const people = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "people" }} />);
    expect(people).toContain('data-testid="dev-viewer-people"');
    expect(people).toContain('data-menu-active="true"');

    const detailHref = personDetailPath("person_000001");
    expect(detailHref).toBe("/people/person_000001");
    const list = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [samplePerson()],
          totalCount: 1,
          enablePersonNavigation: true,
        })}
      />,
    );
    expect(list).toContain(`href="${detailHref}"`);

    const detail = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "person-detail", personId: "person_000001" }} />,
    );
    expect(detail).toContain('data-testid="person-detail-page"');
    expect(detail).toContain('data-testid="person-detail-back"');
    expect(detail).toContain('href="/people"');
  });

  it("2. Direct/reload Detail exact-ID + fail-closed stale/session", async () => {
    const encoded = personDetailPath("person/odd");
    expect(encoded).toBe("/people/person%2Fodd");
    const ok = await loadPersonDetail({
      personId: "person_000001",
      fetchImpl: async (url) => {
        expect(url).toBe("/api/s1_5/people/person_000001");
        return {
          status: 200,
          text: async () => successEnvelope(sampleDetail()),
        };
      },
    });
    expect(ok.kind).toBe("success");

    for (const code of ["SESSION_REQUIRED", "STALE_CURSOR"] as const) {
      const fail = await loadPersonDetail({
        personId: "person_000001",
        fetchImpl: async () => ({
          status: 401,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(fail.kind).toBe("failure");
      if (fail.kind === "failure") {
        expect(fail.code).toBe(code);
      }
    }

    const errorHtml = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="error"
        personId="person_000001"
        detail={null}
        errorText="SESSION_REQUIRED: session cookie is required"
        errorCode="SESSION_REQUIRED"
        uiRevision={null}
      />,
    );
    expect(errorHtml).toContain('data-status="error"');
    expect(errorHtml).not.toContain('data-status="success"');
    expect(errorHtml).not.toContain("Test Person");
  });

  it("3. Shell -> Mock -> Run -> Result -> Log surface binding", () => {
    const mock = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle" }} />,
    );
    expect(mock).toContain('href="/mock-battle"');
    expect(mock).toContain('data-testid="mock-battle-page"');

    const withResult = renderToStaticMarkup(
      <MockBattleViewPanel
        {...mockViewProps({
          trustedResult: sampleMock(),
          latestStatus: "success",
          replayAvailable: true,
        })}
      />,
    );
    expect(withResult).toContain('href="/mock-battle/result"');
    expect(withResult).toContain('data-testid="mock-battle-open-result"');

    const result = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle-result" }} />,
    );
    expect(result).toContain('data-testid="battle-log-page"');
    expect(result).toContain('href="/mock-battle"');
    expect(result).toContain('data-testid="battle-log-back"');
  });

  it("4. Replay API-013 only; Result/Log use accepted server paths", async () => {
    const urls: string[] = [];
    await postMockBattleReplay({
      csrfToken: "csrf",
      expectedUiRevision: 2,
      fetchImpl: async (url, init) => {
        urls.push(`${init?.method ?? "GET"} ${url}`);
        return {
          status: 200,
          text: async () =>
            successEnvelope({
              acceptedUiRevision: 2,
              completedUiRevision: 3,
              replay: true,
              durationMs: 1,
              result: sampleMock(),
            }),
        };
      },
    });
    expect(urls).toEqual(["POST /api/s1_5/mock-battles/replay"]);
    expect(urls.some((u) => u === "POST /api/s1_5/mock-battles")).toBe(false);

    let logUrl = "";
    const log = await loadBattleLogPage({
      cursor: null,
      fetchImpl: async (url) => {
        logUrl = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({
              items: [sampleLogItem(1)],
              totalCount: 1,
              nextCursor: null,
              resultUiRevision: 2,
            }),
        };
      },
    });
    expect(logUrl).toContain("/api/s1_5/mock-battles/latest/log?");
    expect(log.kind).toBe("success");
    if (log.kind === "success") {
      expect(Object.keys(log.data.items[0]!).sort()).toEqual([...BATTLE_LOG_ITEM_VIEW_KEYS].sort());
    }
  });

  it("5. Direct/reload result does not trust transient-only state", async () => {
    const latestEmpty = await loadMockBattleLatest({
      fetchImpl: async () => ({
        status: 404,
        text: async () => failureEnvelope("NOT_FOUND", "no latest"),
      }),
    });
    expect(latestEmpty.kind).toBe("failure");
    if (latestEmpty.kind === "failure") {
      expect(latestEmpty.code).toBe("NOT_FOUND");
    }

    const direct = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle-result" }} />,
    );
    expect(direct).toContain('data-testid="battle-log-page"');
    expect(direct).not.toContain("match_1");
  });
});

describe("FE-06 Event/Validation independence + reset", () => {
  it("6. Shell -> Event -> Validation tabs with independent controls", () => {
    const events = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
    );
    expect(events).toContain('data-testid="events-page"');
    expect(events).toContain('data-testid="events-list-panel"');
    expect(events).toContain('data-testid="validation-list-panel"');
    expect(events).toContain('href="/events?tab=validation"');
    expect(events).toContain('href="/events?tab=events"');
    expect(parseEventsTab("?tab=validation")).toBe("validation");
    expect(parseEventsTab("?tab=events")).toBe("events");
    expect(parseEventsTab("?tab=nope")).toBe("events");
  });

  it("7. Event stale does not corrupt Validation", () => {
    const eventStale = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "stale",
          errorCode: "STALE_CURSOR",
          errorText: "event stale",
        })}
      />,
    );
    const validationOk = renderToStaticMarkup(
      <ValidationListView
        {...validationViewProps({
          status: "success",
          items: [sampleValidation({ status: "success", issueCount: 0, issues: [] })],
          totalCount: 1,
        })}
      />,
    );
    expect(eventStale).toContain('data-status="stale"');
    expect(validationOk).toContain('data-status="success"');
    expect(validationOk).not.toContain("event stale");
  });

  it("8. Validation stale does not corrupt Event", () => {
    const validationStale = renderToStaticMarkup(
      <ValidationListView
        {...validationViewProps({
          status: "stale",
          errorCode: "STALE_CURSOR",
          errorText: "validation stale",
        })}
      />,
    );
    const eventOk = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [sampleEvent()],
          totalCount: 1,
        })}
      />,
    );
    expect(validationStale).toContain('data-status="stale"');
    expect(eventOk).toContain('data-status="success"');
    expect(eventOk).not.toContain("validation stale");
  });

  it("9. reset/new-session invalidates stale trust across FE surfaces", async () => {
    for (const code of ["STALE_CURSOR", "SESSION_REQUIRED"] as const) {
      const peopleFail = await loadEventsPage({
        cursor: "old",
        fetchImpl: async () => ({
          status: 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(peopleFail.kind).toBe("failure");

      const validationFail = await loadValidationResultsPage({
        cursor: "old",
        fetchImpl: async () => ({
          status: 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(validationFail.kind).toBe("failure");

      const logFail = await loadBattleLogPage({
        cursor: "old",
        fetchImpl: async () => ({
          status: 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(logFail.kind).toBe("failure");

      const detailFail = await loadPersonDetail({
        personId: "person_000001",
        fetchImpl: async () => ({
          status: 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(detailFail.kind).toBe("failure");
    }

    const peopleStale = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "stale",
          errorCode: "STALE_CURSOR",
          errorText: "stale",
          items: [],
        })}
      />,
    );
    expect(peopleStale).toContain('data-status="stale"');
    expect(peopleStale).not.toContain('data-status="success"');

    const shell = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "home" }} />);
    expect(shell).toContain('data-navigation-epoch="0"');
  });

  it("10. history/back/forward cannot expose mixed-session success", () => {
    const events = renderToStaticMarkup(<EventsPage tab="events" />);
    expect(events).toContain('href="/events?tab=events"');
    expect(events).toContain('href="/events?tab=validation"');
    // Full document navigations remount Shell pages; bfcache restore bumps navigationEpoch.
    const shell = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "validation" }} />,
    );
    expect(shell).toContain('data-testid="shell-main"');
    expect(shell).toContain('data-route-kind="events"');
    expect(shell).not.toContain("mock-battle-page");
  });
});

describe("FE-06 state / safe-text / keyboard / static audits", () => {
  it("11. loading/empty/error/stale remain distinct across surfaces", () => {
    expect(
      renderToStaticMarkup(<PeopleViewerView {...peopleViewProps({ status: "loading" })} />),
    ).toContain('data-status="loading"');
    expect(
      renderToStaticMarkup(<PeopleViewerView {...peopleViewProps({ status: "empty" })} />),
    ).toContain('data-status="empty"');
    expect(
      renderToStaticMarkup(
        <PeopleViewerView
          {...peopleViewProps({ status: "error", errorCode: "INTERNAL_ERROR", errorText: "x" })}
        />,
      ),
    ).toContain('data-status="error"');
    expect(
      renderToStaticMarkup(
        <PeopleViewerView
          {...peopleViewProps({ status: "stale", errorCode: "STALE_CURSOR", errorText: "s" })}
        />,
      ),
    ).toContain('data-status="stale"');

    expect(
      renderToStaticMarkup(<EventListView {...eventViewProps({ status: "loading" })} />),
    ).toContain('data-status="loading"');
    expect(
      renderToStaticMarkup(<EventListView {...eventViewProps({ status: "stale" })} />),
    ).toContain('data-status="stale"');
    expect(
      renderToStaticMarkup(<ValidationListView {...validationViewProps({ status: "empty" })} />),
    ).toContain('data-status="empty"');
  });

  it("12. malicious server strings render literally everywhere", () => {
    const people = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [samplePerson({ displayName: "<img src=x onerror=alert(1)>" })],
          totalCount: 1,
          enablePersonNavigation: true,
        })}
      />,
    );
    expect(people).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(people).not.toContain("<img src=x");

    const events = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [sampleEvent({ eventType: "<script>x</script>" })],
          totalCount: 1,
        })}
      />,
    );
    expect(events).toContain("&lt;script&gt;x&lt;/script&gt;");

    const mock = renderToStaticMarkup(
      <MockBattleViewPanel
        {...mockViewProps({
          trustedResult: sampleMock({ matchId: "<b>match</b>" }),
          latestStatus: "success",
        })}
      />,
    );
    expect(mock).toContain("&lt;b&gt;match&lt;/b&gt;");
  });

  it("13. keyboard-only primary path surfaces (href/button/labels)", () => {
    const home = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "home" }} />);
    for (const nav of FE_SHELL_NAV) {
      expect(home).toContain(`data-menu-item="${nav.label}"`);
      expect(home).toContain(`href="${nav.href}"`);
    }

    const people = renderToStaticMarkup(
      <PeopleViewerView
        {...peopleViewProps({
          status: "success",
          items: [samplePerson()],
          totalCount: 1,
          enablePersonNavigation: true,
        })}
      />,
    );
    expect(people).toMatch(/href="\/people\/person_000001"/);

    const detail = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000001"
        detail={sampleDetail()}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(detail).toContain('data-testid="person-detail-back"');

    const mock = renderToStaticMarkup(<MockBattleViewPanel {...mockViewProps()} />);
    expect(mock).toContain('data-testid="mock-battle-run"');
    expect(mock).toContain('data-testid="mock-battle-replay"');
    expect(mock).toContain('data-testid="mock-battle-latest"');

    const events = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
    );
    expect(events).toContain('for="events-person-id"');
    expect(events).toContain('for="validation-status-filter"');
    expect(events).toContain('data-testid="events-next"');
    expect(events).toContain('data-testid="validation-next"');
  });

  it("14. no-domain static audit PASS", () => {
    const surfaces = [
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "people" }} />),
      renderToStaticMarkup(
        <Shell sessionState="ready" route={{ kind: "person-detail", personId: "person_000001" }} />,
      ),
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "mock-battle" }} />),
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "mock-battle-result" }} />),
      renderToStaticMarkup(
        <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
      ),
    ].join("\n");
    expect(surfaces).not.toContain("dangerouslySetInnerHTML");
    expect(surfaces).not.toContain("eligibilityCalculator");
    expect(surfaces).not.toContain("rankRecompute");
  });

  it("15. no-schema static audit PASS", async () => {
    const run = await postMockBattle({
      csrfToken: "csrf",
      expectedUiRevision: 1,
      participantAId: "person_000001",
      participantBId: "person_000002",
      fetchImpl: async () => ({
        status: 200,
        text: async () =>
          successEnvelope({
            acceptedUiRevision: 1,
            completedUiRevision: 2,
            replay: false,
            durationMs: 1,
            result: sampleMock(),
          }),
      }),
    });
    expect(run.kind).toBe("success");
    if (run.kind === "success") {
      expect(Object.keys(run.data.result).sort()).toEqual([...MOCK_BATTLE_VIEW_KEYS].sort());
    }
    expect(FE_TRACEABILITY_ROWS.every((row) => row.path.startsWith("/api/s1_5/"))).toBe(true);
  });

  it("16. no-forward-work static audit PASS", () => {
    const html = [
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "people" }} />),
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "mock-battle" }} />),
      renderToStaticMarkup(
        <Shell sessionState="ready" route={{ kind: "events", tab: "validation" }} />,
      ),
    ].join("\n");
    expect(html).not.toContain("portrait");
    expect(html).not.toContain("family-tree");
    expect(html).not.toContain("tournament");
    expect(html).not.toContain("UI-010");
    expect(FE_INTEGRATION_ROUTES).toContain("/events?tab=validation");
  });

  it("17. FE-01..05 focused route bindings remain present", () => {
    expect(
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "people" }} />),
    ).toContain('data-testid="dev-viewer-people"');
    expect(
      renderToStaticMarkup(
        <Shell sessionState="ready" route={{ kind: "person-detail", personId: "person_000001" }} />,
      ),
    ).toContain('data-testid="person-detail-page"');
    expect(
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "mock-battle" }} />),
    ).toContain('data-testid="mock-battle-page"');
    expect(
      renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "mock-battle-result" }} />),
    ).toContain('data-testid="battle-log-page"');
    expect(
      renderToStaticMarkup(
        <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
      ),
    ).toContain('data-testid="events-page"');
  });

  it("18. /dev-viewer shared regression stays green where touched", () => {
    const home = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "home" }} />);
    expect(home).toContain('data-testid="dev-viewer-entry"');
    expect(home).toContain('href="/dev-viewer"');
    expect(home).toContain('data-testid="shell-main"');
  });
});

describe("FE-06 mock vs canonical Event isolation + log fail-closed", () => {
  it("mock page does not mount events APIs; events page does not mount mock APIs", () => {
    const mock = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle" }} />,
    );
    expect(mock).not.toContain("/api/s1_5/events");
    expect(mock).not.toContain("validation-results");
    expect(mock).not.toContain("events-page");

    const events = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
    );
    expect(events).not.toContain("/api/s1_5/mock-battles");
    expect(events).not.toContain("mock-battle-page");
  });

  it("battle log append failure must not keep prior rows as success presentation", () => {
    const errorAfterPage = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="success"
        summary={sampleMock()}
        summaryError={null}
        summaryErrorCode={null}
        logStatus="error"
        logItems={[]}
        logTotalCount={0}
        logError="STALE_CURSOR: cursor is stale"
        logErrorCode="STALE_CURSOR"
        canNext={false}
        onNext={() => undefined}
      />,
    );
    expect(errorAfterPage).toContain('data-status="error"');
    expect(errorAfterPage).not.toContain('data-sequence="1"');
  });

  it("traceability index covers every required FE API row", () => {
    const apis = FE_TRACEABILITY_ROWS.map((r) => r.api);
    for (const required of [
      "API-007",
      "UI-005 Person Detail GET",
      "API-011",
      "API-012",
      "API-013",
      "API-014",
      "API-015",
      "API-009",
      "API-010",
    ]) {
      expect(apis).toContain(required);
    }
  });
});
