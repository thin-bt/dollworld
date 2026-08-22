import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Shell } from "../Shell.js";
import { EventListView, type EventListViewProps } from "./EventListView.js";
import { buildHumanEventCards } from "./event-groups.js";
import { EventsPage, parseEventsTab } from "./EventsPage.js";
import { loadEventsPage, loadValidationResultsPage } from "./fetch-ui008.js";
import {
  EVENT_ENVELOPE_TOP_LEVEL_KEYS,
  VALIDATION_ISSUE_VIEW_KEYS,
  VALIDATION_RESULT_VIEW_ITEM_KEYS,
  type EventListItemView,
  type ValidationResultViewItem,
} from "./ui008-views.js";
import { ValidationListView, type ValidationListViewProps } from "./ValidationListView.js";

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

function sampleEvent(overrides: Partial<EventListItemView> = {}): EventListItemView {
  const base: EventListItemView = {
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
  };
  return { ...base, ...overrides };
}

function sampleValidation(
  overrides: Partial<ValidationResultViewItem> = {},
): ValidationResultViewItem {
  const base: ValidationResultViewItem = {
    validationOccurrence: 1,
    status: "failure",
    issueCount: 1,
    issues: [{ path: "/stats/stamina", message: "out of range" }],
    result: { ok: false },
  };
  return { ...base, ...overrides };
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

describe("FE-05 /events routes and Shell", () => {
  it("1. /events reaches Event via Shell", () => {
    const home = renderToStaticMarkup(<Shell sessionState="ready" route={{ kind: "home" }} />);
    expect(home).toContain('data-menu-item="イベント"');
    expect(home).toContain('href="/events"');

    const page = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
    );
    expect(page).toContain('data-testid="events-page"');
    expect(page).toContain('data-active-tab="events"');
    expect(page).toContain('data-menu-active="true"');
    expect(page).toContain('data-testid="events-list-panel"');
  });

  it("2. /events?tab=validation reaches Validation; unknown falls back to Event", () => {
    const validation = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "validation" }} />,
    );
    expect(validation).toContain('data-active-tab="validation"');
    expect(validation).toContain('data-testid="validation-list-panel"');
    expect(validation).toContain('href="/events?tab=validation"');
    expect(validation).toContain('href="/events?tab=events"');

    expect(parseEventsTab("")).toBe("events");
    expect(parseEventsTab("?tab=events")).toBe("events");
    expect(parseEventsTab("?tab=validation")).toBe("validation");
    expect(parseEventsTab("?tab=unknown")).toBe("events");
  });

  it("3. Independent Event/Validation panels and tab hrefs coexist", () => {
    const html = renderToStaticMarkup(<EventsPage tab="events" />);
    expect(html).toContain('data-testid="events-list-panel"');
    expect(html).toContain('data-testid="validation-list-panel"');
    expect(html).toContain('data-testid="events-tab-events"');
    expect(html).toContain('data-testid="events-tab-validation"');
    expect(html).toContain("システム検証（開発者向け）");
    expect(html).toContain('data-testid="validation-dev-banner"');
    expect(html).not.toContain("検証結果（正史）");
    expect(html).toContain('data-testid="events-next"');
    expect(html).toContain('data-testid="validation-next"');
  });
});

describe("FE-05 API-009 events binding", () => {
  it("4. first page renders accepted fields / source order", async () => {
    const items = [
      sampleEvent({ eventId: "event_a", sequence: 1 }),
      sampleEvent({ eventId: "event_b", sequence: 2 }),
    ];
    let seen = "";
    const result = await loadEventsPage({
      cursor: null,
      limit: 100,
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () => successEnvelope({ items, totalCount: 2, nextCursor: "c2" }),
        };
      },
    });
    expect(seen).toContain("/api/s1_5/events?");
    expect(seen).toContain("limit=100");
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.items.map((i) => i.eventId)).toEqual(["event_a", "event_b"]);
      expect(result.data.totalCount).toBe(2);
      expect(result.data.nextCursor).toBe("c2");
      expect(Object.keys(result.data.items[0]!).sort()).toEqual(
        [...EVENT_ENVELOPE_TOP_LEVEL_KEYS].sort(),
      );
    }
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items,
          totalCount: 2,
          canNext: true,
        })}
      />,
    );
    expect(html.indexOf('data-event-id="event_a"')).toBeLessThan(
      html.indexOf('data-event-id="event_b"'),
    );
    expect(html).toContain("event_a");
    expect(html).toContain("の修行記録");
    expect(html).not.toContain('class="dw-event-what">出来事<');
    expect(html).toContain("1年 1月 第1週");
    expect(html).toContain('data-testid="events-who-event_a"');
    // Raw eventType remains in developer details, not as the primary what label.
    expect(html).toContain("eventType=training_completed");
    expect(html).toContain("training_completed");
    const weekOfMonthHtml = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [
            sampleEvent({
              eventId: "event_weekofmonth",
              worldDate: { year: 12, month: 7, weekOfMonth: 3 },
            }),
          ],
          totalCount: 1,
        })}
      />,
    );
    expect(weekOfMonthHtml).toContain("12年 7月 第3週");
  });

  it("5. person filter is API query; payload-spoofed person is not client-filtered", async () => {
    let seen = "";
    await loadEventsPage({
      cursor: null,
      query: { personId: "person_real" },
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({
              items: [
                sampleEvent({
                  eventId: "spoof",
                  entities: { personIds: ["person_real"] },
                  payload: { text: "person_fake in payload" },
                }),
              ],
              totalCount: 1,
              nextCursor: null,
            }),
        };
      },
    });
    expect(seen).toContain("personId=person_real");
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [
            sampleEvent({
              eventId: "spoof",
              entities: { personIds: ["person_real"] },
              payload: { text: "person_fake in payload" },
            }),
          ],
          totalCount: 1,
        })}
      />,
    );
    expect(html).toContain('data-testid="events-person-ids-spoof"');
    const personIdsBlock = html.slice(
      html.indexOf('data-testid="events-person-ids-spoof"'),
      html.indexOf("</p>", html.indexOf('data-testid="events-person-ids-spoof"')),
    );
    expect(personIdsBlock).toContain("person_real");
    expect(personIdsBlock).not.toContain("person_fake");
  });

  it("6. eventGroup is server-driven; no client classifier", async () => {
    let seen = "";
    await loadEventsPage({
      cursor: null,
      query: { eventGroup: "technique_learning" },
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () => successEnvelope({ items: [], totalCount: 0, nextCursor: null }),
        };
      },
    });
    expect(seen).toContain("eventGroup=technique_learning");
    const html = renderToStaticMarkup(<EventListView {...eventViewProps()} />);
    expect(html).toContain('data-testid="events-event-group"');
    expect(html).toContain("technique_learning");
    expect(html).not.toContain("mastery");
  });

  it("7. Event paging uses accepted nextCursor/totalCount", async () => {
    let seen = "";
    const result = await loadEventsPage({
      cursor: "page2",
      limit: 200,
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({ items: [sampleEvent()], totalCount: 250, nextCursor: "page3" }),
        };
      },
    });
    expect(seen).toContain("cursor=page2");
    expect(seen).toContain("limit=200");
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.totalCount).toBe(250);
      expect(result.data.nextCursor).toBe("page3");
    }
    const html = renderToStaticMarkup(
      <EventListView {...eventViewProps({ status: "success", totalCount: 250, canNext: true })} />,
    );
    expect(html).toContain("totalCount=250");
    expect(html).toContain('data-testid="events-next"');
    expect(html).toContain("このページ 0 件");
    expect(html).not.toContain("取得 250 件");
  });

  it("8. Event loading/empty/error/stale are distinct", () => {
    expect(
      renderToStaticMarkup(<EventListView {...eventViewProps({ status: "loading" })} />),
    ).toContain('data-status="loading"');
    expect(
      renderToStaticMarkup(<EventListView {...eventViewProps({ status: "empty" })} />),
    ).toContain('data-status="empty"');
    expect(
      renderToStaticMarkup(
        <EventListView
          {...eventViewProps({
            status: "error",
            errorCode: "INTERNAL_ERROR",
            errorText: "INTERNAL_ERROR: boom",
          })}
        />,
      ),
    ).toContain('data-status="error"');
    const stale = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "stale",
          errorCode: "STALE_CURSOR",
          errorText: "STALE_CURSOR: stale",
        })}
      />,
    );
    expect(stale).toContain('data-status="stale"');
    expect(stale).toContain('data-testid="events-fresh-reload"');
    expect(stale).not.toContain('data-status="success"');
  });

  it("9. Event stale retry does not trust old rows as current success", async () => {
    const result = await loadEventsPage({
      cursor: "old",
      fetchImpl: async () => ({
        status: 409,
        text: async () => failureEnvelope("STALE_CURSOR", "cursor is stale"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.code).toBe("STALE_CURSOR");
    }
    const stale = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "stale",
          items: [],
          totalCount: 0,
          errorCode: "STALE_CURSOR",
          errorText: "STALE_CURSOR: cursor is stale",
        })}
      />,
    );
    expect(stale).not.toContain('data-testid="events-items"');
    expect(stale).toContain('data-testid="events-fresh-reload"');
  });
});

describe("FE-05 API-010 validation binding", () => {
  it("10. renders generic accepted status/issues only", async () => {
    let seen = "";
    const items = [
      sampleValidation(),
      sampleValidation({
        validationOccurrence: 2,
        status: "success",
        issueCount: 0,
        issues: [],
      }),
    ];
    const result = await loadValidationResultsPage({
      cursor: null,
      query: { status: "failure" },
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () => successEnvelope({ items, totalCount: 2, nextCursor: null }),
        };
      },
    });
    expect(seen).toContain("/api/s1_5/validation-results?");
    expect(seen).toContain("status=failure");
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(Object.keys(result.data.items[0]!).sort()).toEqual(
        [...VALIDATION_RESULT_VIEW_ITEM_KEYS].sort(),
      );
      expect(Object.keys(result.data.items[0]!.issues[0]!).sort()).toEqual(
        [...VALIDATION_ISSUE_VIEW_KEYS].sort(),
      );
    }
    const html = renderToStaticMarkup(
      <ValidationListView {...validationViewProps({ status: "success", items, totalCount: 2 })} />,
    );
    expect(html).toContain("/stats/stamina");
    expect(html).toContain("out of range");
    expect(html).toContain('data-validation-item-status="failure"');
  });

  it("11. no invented Validation common fields", () => {
    const html = renderToStaticMarkup(
      <ValidationListView
        {...validationViewProps({
          status: "success",
          items: [sampleValidation()],
          totalCount: 1,
        })}
      />,
    );
    expect(html).not.toContain("sourceProcessor");
    expect(html).not.toContain("canContinue");
    expect(html).not.toMatch(/data-code=|dt>code</);
  });

  it("12. Validation paging uses own nextCursor/totalCount", async () => {
    let seen = "";
    const result = await loadValidationResultsPage({
      cursor: "v2",
      limit: 100,
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({
              items: [sampleValidation()],
              totalCount: 40,
              nextCursor: "v3",
            }),
        };
      },
    });
    expect(seen).toContain("cursor=v2");
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.totalCount).toBe(40);
      expect(result.data.nextCursor).toBe("v3");
    }
    const html = renderToStaticMarkup(
      <ValidationListView
        {...validationViewProps({ status: "success", totalCount: 40, canNext: true })}
      />,
    );
    expect(html).toContain("totalCount=40");
    expect(html).toContain('data-testid="validation-next"');
  });

  it("13-15. Validation states independent from Event; cross-corruption blocked", () => {
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

    const both = renderToStaticMarkup(<EventsPage tab="events" />);
    expect(both).toContain('data-testid="events-list-panel"');
    expect(both).toContain('data-testid="validation-list-panel"');
  });

  it("16. reset/new-session invalid cursors are not presented as current success", async () => {
    for (const code of ["STALE_CURSOR", "SESSION_REQUIRED"] as const) {
      const result = await loadValidationResultsPage({
        cursor: "x",
        fetchImpl: async () => ({
          status: 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(result.kind).toBe("failure");
      if (result.kind === "failure") {
        expect(result.code).toBe(code);
      }
    }
    const stale = renderToStaticMarkup(
      <ValidationListView
        {...validationViewProps({
          status: "stale",
          items: [sampleValidation()],
          errorCode: "STALE_CURSOR",
          errorText: "stale",
        })}
      />,
    );
    expect(stale).not.toContain('data-testid="validation-items"');
    expect(stale).toContain('data-testid="validation-fresh-reload"');
  });
});

describe("FE-05 safe-text / keyboard / static audit", () => {
  it("17. no mock-battle mixing on events page", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
    );
    expect(html).not.toContain("/api/s1_5/mock-battles");
    expect(html).not.toContain("mock-battle-page");
    expect(html).not.toContain("battle-log-page");
  });

  it("18. malicious server strings render literally", () => {
    const evilEvent = sampleEvent({
      eventId: "evil",
      eventType: "<img src=x onerror=alert(1)>",
      entities: { personIds: ["<script>alert(1)</script>"] },
    });
    const eventHtml = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({ status: "success", items: [evilEvent], totalCount: 1 })}
      />,
    );
    expect(eventHtml).toContain("contentlessHidden=1");
    expect(eventHtml).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(eventHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(eventHtml).not.toContain("<img src=x");
    expect(eventHtml).not.toContain("<script>alert(1)</script>");
    expect(eventHtml).not.toContain('data-testid="events-items"');

    const evilValidation = sampleValidation({
      issues: [{ path: "<b>path</b>", message: "<script>x</script>" }],
    });
    const validationHtml = renderToStaticMarkup(
      <ValidationListView
        {...validationViewProps({
          status: "success",
          items: [evilValidation],
          totalCount: 1,
        })}
      />,
    );
    expect(validationHtml).toContain("&lt;b&gt;path&lt;/b&gt;");
    expect(validationHtml).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(validationHtml).not.toContain("<script>x</script>");
  });

  it("19. keyboard operation for tabs/filters/paging/retry", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "events" }} />,
    );
    expect(html).toMatch(/href="\/events\?tab=events"/);
    expect(html).toMatch(/href="\/events\?tab=validation"/);
    expect(html).toContain('for="events-person-id"');
    expect(html).toContain('for="events-event-group"');
    expect(html).toContain('for="validation-status-filter"');
    expect(html).toContain('data-testid="events-apply-query"');
    expect(html).toContain('data-testid="events-next"');
    expect(html).toContain('data-testid="validation-next"');
    const stale = renderToStaticMarkup(
      <EventListView {...eventViewProps({ status: "stale", errorText: "stale" })} />,
    );
    expect(stale).toMatch(/type="button"[^>]*data-testid="events-fresh-reload"/);
  });

  it("20. static audit: no domain calculator / schema / backend / FE-06", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "events", tab: "validation" }} />,
    );
    expect(html).not.toContain("dangerouslySetInnerHTML");
    expect(html).not.toContain("portrait");
    expect(html).not.toContain("family-tree");
    expect(html).not.toContain("tournament");
    expect(html).not.toContain("FE-06");
    expect(html).toContain('data-testid="events-page"');
    expect(html).toContain('data-testid="validation-list-panel"');
  });

  it("21. Event transport throw is failure, not a silent empty list", async () => {
    const result = await loadEventsPage({
      cursor: null,
      fetchImpl: async () => {
        throw new Error("boom");
      },
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.message).toBe("transport_error");
    }
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "error",
          errorText: "transport_error",
          items: [],
          totalCount: 0,
        })}
      />,
    );
    expect(html).toContain('data-status="error"');
    expect(html).not.toContain('data-status="empty"');
    expect(html).not.toContain('data-testid="events-items"');
  });

  it("FIX6: training.action_selected card shows Japanese summary + result, raw type in developer info", () => {
    const item = sampleEvent({
      eventId: "event_action",
      eventType: "training.action_selected",
      entities: { personIds: ["person_000001"] },
      payload: {
        personId: "person_000001",
        action: "train_stat",
        targetStat: "stamina",
        targetTechniqueId: null,
        forced: false,
      },
    });
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [item],
          totalCount: 1,
          personNameById: { person_000001: "テスト花子" },
        })}
      />,
    );
    expect(html).toContain("テスト花子");
    expect(html).toContain("テスト花子が体力の修行を行った");
    expect(html).toContain("能力を鍛える");
    expect(html).toContain("対象: 体力");
    expect(html).toContain("eventType=training.action_selected");
    expect(html).not.toMatch(/class="dw-event-what">training\.action_selected</);
    expect(html).not.toMatch(/class="dw-event-what">出来事</);
  });

  it("FIX8: training choice + rest_applied group into one ordinary card", () => {
    const choice = sampleEvent({
      eventId: "event_choice",
      sequence: 1,
      eventType: "training.action_selected",
      entities: { personIds: ["person_000002"] },
      payload: { action: "rest" },
    });
    const applied = sampleEvent({
      eventId: "event_rest",
      sequence: 2,
      eventType: "training.rest_applied",
      entities: { personIds: ["person_000002"] },
      payload: {
        reason: "weekly_rest",
        fatigue: { before: 40, after: 20, delta: -20 },
        condition: { before: 50, after: 55, delta: 5 },
      },
    });
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [choice, applied],
          totalCount: 2,
          personNameById: { person_000002: "休息太郎" },
        })}
      />,
    );
    expect(html).toContain("休息太郎は今週の修行を休んだ");
    expect(html).toContain("疲労 40→20");
    expect(html.match(/class="dw-event-item"/g)?.length ?? 0).toBe(1);
    expect(html).toContain("&quot;related&quot;");
  });

  it("FIX8: person.initialized is excluded from ordinary list", () => {
    const init = sampleEvent({
      eventId: "event_init",
      eventType: "person.initialized",
      entities: { personIds: ["person_000001"] },
      payload: {},
    });
    const training = sampleEvent({
      eventId: "event_train",
      eventType: "training.action_selected",
      entities: { personIds: ["person_000001"] },
      payload: { action: "train_stat", targetStat: "stamina" },
    });
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [init, training],
          totalCount: 2,
          personNameById: { person_000001: "初期花子" },
        })}
      />,
    );
    expect(html).not.toContain("に関する記録");
    expect(html).toContain("初期花子が体力の修行を行った");
    expect(html).toContain("technical=1");
  });

  it("FIX6: training.rest_applied card shows rest result deltas", () => {
    const item = sampleEvent({
      eventId: "event_rest",
      eventType: "training.rest_applied",
      entities: { personIds: ["person_000002"] },
      payload: {
        reason: "weekly_rest",
        fatigue: { before: 40, after: 20, delta: -20 },
        condition: { before: 50, after: 55, delta: 5 },
      },
    });
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [item],
          totalCount: 1,
          personNameById: { person_000002: "休息太郎" },
        })}
      />,
    );
    expect(html).toContain("休息太郎");
    expect(html).toContain("休息太郎は今週の修行を休んだ");
    expect(html).toContain("週間休息");
    expect(html).toContain("疲労 40→20");
    expect(html).toContain("training.rest_applied");
  });

  it("FIX6: person link falls back to personId when name map is missing", () => {
    const item = sampleEvent({
      eventId: "event_fallback",
      eventType: "training.action_selected",
      entities: { personIds: ["person_orphan"] },
      payload: { action: "rest" },
    });
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [item],
          totalCount: 1,
        })}
      />,
    );
    expect(html).toContain("person_orphan");
    expect(html).toContain("休む");
  });

  it("FIX9: ordinary meta shows page card count, not raw fetched total", () => {
    const items = [
      sampleEvent({
        sequence: 100,
        eventId: "event_new",
        eventType: "training.action_selected",
        entities: { personIds: ["person_000001"] },
        payload: { action: "train_stat", targetStat: "stamina" },
        worldDate: { year: 3, month: 6, weekOfMonth: 2 },
      }),
      sampleEvent({
        sequence: 0,
        eventId: "event_old",
        eventType: "person.initialized",
        entities: { personIds: ["person_000001"] },
        payload: {},
        worldDate: { year: 1, month: 1, weekOfMonth: 1 },
      }),
    ];
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items,
          totalCount: 147,
          personNameById: { person_000001: "最新花子" },
        })}
      />,
    );
    expect(html).toContain("このページ 1 件");
    expect(html).not.toContain("取得 147 件");
    expect(html).toContain("totalCount=147");
    expect(html).toContain('data-testid="events-year"');
    expect(html).toContain('data-testid="events-month"');
    expect(html).toContain('data-testid="events-week"');
    expect(html).toContain('data-testid="events-reset-newest"');
    expect(html).toContain("最新へ戻す");
    expect(html).toContain("sequence 降順");
  });

  it("FIX10: desc-ordered training lifecycle merges into one ordinary card", () => {
    const choice = sampleEvent({
      eventId: "event_choice",
      sequence: 10,
      eventType: "training.action_selected",
      entities: { personIds: ["person_000003"] },
      worldDate: { year: 2, month: 4, week: 2 },
      payload: { action: "train_stat", targetStat: "strength" },
    });
    const growth = sampleEvent({
      eventId: "event_growth",
      sequence: 11,
      eventType: "training.stat_growth_applied",
      entities: { personIds: ["person_000003"] },
      worldDate: { year: 2, month: 4, week: 2 },
      payload: { targetStat: "strength", before: 10, after: 11 },
    });
    const condition = sampleEvent({
      eventId: "event_condition",
      sequence: 12,
      eventType: "training.condition_updated",
      entities: { personIds: ["person_000003"] },
      worldDate: { year: 2, month: 4, week: 2 },
      payload: { fatigue: { before: 10, after: 20 } },
    });
    // Observer page order is newest-first (FIX9).
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [condition, growth, choice],
          totalCount: 3,
          personNameById: { person_000003: "筋力花子" },
        })}
      />,
    );
    expect(html.match(/class="dw-event-item"/g)?.length ?? 0).toBe(1);
    expect(html).toContain("筋力花子が筋力の修行を行った");
    expect(html).toContain("筋力");
    expect(html).toContain("値 10→11");
    expect(html).toContain("疲労 10→20");
    expect(html).not.toContain("コンディションが更新された");
    expect(html).not.toContain("筋力が成長した");
    expect(html).toContain("&quot;related&quot;");
    expect(html).toContain("training.stat_growth_applied");
    expect(html).toContain("training.condition_updated");
  });

  it("FIX10: SESSION_REQUIRED is human-readable; raw code stays in developer info", () => {
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "error",
          errorCode: "SESSION_REQUIRED",
          errorText: "SESSION_REQUIRED: session cookie is required",
          onRecoverSession: () => undefined,
        })}
      />,
    );
    expect(html).toContain("閲覧セッションがありません");
    expect(html).toContain('data-testid="events-recover-session"');
    expect(html).not.toContain("取得に失敗しました: SESSION_REQUIRED");
    expect(html).toContain('data-testid="events-error-dev"');
    expect(html).toContain("SESSION_REQUIRED: session cookie is required");
  });

  it("FIX10: year control is a bounded select, not free text", () => {
    const html = renderToStaticMarkup(
      <EventListView {...eventViewProps({ yearOptionsMax: 4, yearFilter: "2" })} />,
    );
    expect(html).toMatch(/<select[^>]*data-testid="events-year"/);
    expect(html).toContain(">4年<");
    expect(html).toContain(">1年<");
    expect(html).not.toMatch(/<input[^>]*data-testid="events-year"/);
  });

  it("FIX11: page-edge growth orphan joins action from boundaryContext", () => {
    const growth = sampleEvent({
      eventId: "event_growth_edge",
      sequence: 100,
      eventType: "training.stat_growth_applied",
      entities: { personIds: ["person_edge"] },
      worldDate: { year: 4, month: 1, week: 1 },
      payload: { targetStat: "strength", before: 70, after: 71 },
    });
    const choice = sampleEvent({
      eventId: "event_choice_edge",
      sequence: 99,
      eventType: "training.action_selected",
      entities: { personIds: ["person_edge"] },
      worldDate: { year: 4, month: 1, week: 1 },
      payload: { action: "train_stat", targetStat: "strength" },
    });
    const orphanOnly = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [growth],
          totalCount: 2,
          personNameById: { person_edge: "セシリア・ウィンストン" },
        })}
      />,
    );
    expect(orphanOnly).toContain("筋力が成長した");

    const joined = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [growth],
          boundaryContext: [choice],
          totalCount: 2,
          personNameById: { person_edge: "セシリア・ウィンストン" },
        })}
      />,
    );
    expect(joined.match(/class="dw-event-item"/g)?.length ?? 0).toBe(1);
    expect(joined).toContain("セシリア・ウィンストンが筋力の修行を行った");
    expect(joined).toContain("値 70→71");
    expect(joined).not.toContain("筋力が成長した");
  });

  it("FIX11: suppressLifecycleKeys hides already-emitted lifecycle on next page", () => {
    const choice = sampleEvent({
      eventId: "event_choice_next",
      sequence: 99,
      eventType: "training.action_selected",
      entities: { personIds: ["person_edge"] },
      worldDate: { year: 4, month: 1, week: 1 },
      payload: { action: "train_stat", targetStat: "strength" },
    });
    const html = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [choice],
          totalCount: 2,
          suppressLifecycleKeys: new Set(["person_edge|4-1-1"]),
          personNameById: { person_edge: "セシリア・ウィンストン" },
        })}
      />,
    );
    expect(html).not.toContain("修行を行った");
    expect(html.match(/class="dw-event-item"/g)?.length ?? 0).toBe(0);
  });

  it("FIX12: same-page suppress of emitted keys wipes ordinary cards; previous-only does not", () => {
    const choice = sampleEvent({
      eventId: "event_choice_same",
      sequence: 50,
      eventType: "training.action_selected",
      entities: { personIds: ["person_same"] },
      worldDate: { year: 3, month: 2, week: 1 },
      payload: { action: "train_stat", targetStat: "spirit" },
    });
    const growth = sampleEvent({
      eventId: "event_growth_same",
      sequence: 51,
      eventType: "training.stat_growth_applied",
      entities: { personIds: ["person_same"] },
      worldDate: { year: 3, month: 2, week: 1 },
      payload: { targetStat: "spirit", before: 10, after: 11 },
    });
    const names = { person_same: "セシリア・ウィンストン" };
    const shown = buildHumanEventCards([choice, growth], names, {
      suppressLifecycleKeys: new Set(),
    });
    expect(shown.cards.length).toBe(1);
    expect(shown.hiddenContentless.length).toBe(0);
    expect(shown.emittedLifecycleKeys).toEqual(["person_same|3-2-1"]);

    const wiped = buildHumanEventCards([choice, growth], names, {
      suppressLifecycleKeys: new Set(shown.emittedLifecycleKeys),
    });
    expect(wiped.cards.length).toBe(0);
    expect(wiped.hiddenContentless.length).toBe(2);

    const htmlOk = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [choice, growth],
          totalCount: 2,
          suppressLifecycleKeys: new Set(),
          personNameById: names,
        })}
      />,
    );
    expect(htmlOk.match(/class="dw-event-item"/g)?.length ?? 0).toBe(1);
    expect(htmlOk).toContain("contentlessHidden=0");
    expect(htmlOk).toContain("修行を行った");

    const htmlWipe = renderToStaticMarkup(
      <EventListView
        {...eventViewProps({
          status: "success",
          items: [choice, growth],
          totalCount: 2,
          suppressLifecycleKeys: new Set(shown.emittedLifecycleKeys),
          personNameById: names,
        })}
      />,
    );
    expect(htmlWipe.match(/class="dw-event-item"/g)?.length ?? 0).toBe(0);
    expect(htmlWipe).toContain("contentlessHidden=2");
  });
});
