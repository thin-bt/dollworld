import { useCallback, useEffect, useRef, useState } from "react";
import type { FetchLike } from "../session-client.js";
import { loadUiSession } from "../session-client.js";
import { loadSimulation } from "../dev-viewer/fetch-simulation.js";
import { loadPersonDetail } from "../person-detail/fetch-ui005.js";
import { loadEventsPage, loadValidationResultsPage } from "./fetch-ui008.js";
import { EventListView } from "./EventListView.js";
import { ValidationListView } from "./ValidationListView.js";
import { primaryActorPersonId } from "./event-display.js";
import { buildHumanEventCards, hasIncompleteTrainingLifecycleOnPage } from "./event-groups.js";
import type {
  EventListItemView,
  EventsListQuery,
  ValidationListQuery,
  ValidationResultViewItem,
} from "./ui008-views.js";

export type EventsTab = "events" | "validation";

export function parseEventsTab(search: string): EventsTab {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tab = params.get("tab");
  if (tab === "validation") {
    return "validation";
  }
  return "events";
}

export type EventsPageProps = {
  tab?: EventsTab;
  fetchImpl?: FetchLike;
};

type PanelStatus = "loading" | "success" | "empty" | "error" | "stale";

async function resolvePersonNames(
  items: readonly EventListItemView[],
  fetchImpl: FetchLike | undefined,
): Promise<ReadonlyMap<string, string>> {
  const ids = new Set<string>();
  for (const item of items) {
    const personId = primaryActorPersonId(item);
    if (personId !== null) {
      ids.add(personId);
    }
  }
  const entries = await Promise.all(
    [...ids].map(async (personId) => {
      const result = await loadPersonDetail(
        fetchImpl !== undefined ? { personId, fetchImpl } : { personId },
      );
      if (result.kind === "success" && typeof result.data.displayName === "string") {
        return [personId, result.data.displayName] as const;
      }
      return null;
    }),
  );
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (entry !== null) {
      map.set(entry[0], entry[1]);
    }
  }
  return map;
}

export function EventsPage(props: EventsPageProps) {
  const tab = props.tab ?? "events";

  // --- Event panel state (independent) ---
  const [eventStatus, setEventStatus] = useState<PanelStatus>("loading");
  const [eventItems, setEventItems] = useState<EventListItemView[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventNext, setEventNext] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventErrorCode, setEventErrorCode] = useState<string | null>(null);
  const [personIdFilter, setPersonIdFilter] = useState("");
  const [eventGroupFilter, setEventGroupFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");
  const [yearOptionsMax, setYearOptionsMax] = useState<number | null>(null);
  const [filterHint, setFilterHint] = useState<string | null>(null);
  const [appliedEventsQuery, setAppliedEventsQuery] = useState<EventsListQuery>({});
  const [eventGen, setEventGen] = useState(0);
  const [personNameById, setPersonNameById] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  const [boundaryContext, setBoundaryContext] = useState<EventListItemView[]>([]);
  const [suppressLifecycleKeys, setSuppressLifecycleKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const suppressLifecycleKeysRef = useRef<ReadonlySet<string>>(new Set());

  // --- Validation panel state (independent) ---
  const [validationStatus, setValidationStatus] = useState<PanelStatus>("loading");
  const [validationItems, setValidationItems] = useState<ValidationResultViewItem[]>([]);
  const [validationTotal, setValidationTotal] = useState(0);
  const [validationNext, setValidationNext] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationErrorCode, setValidationErrorCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedValidationQuery, setAppliedValidationQuery] = useState<ValidationListQuery>({});
  const [validationGen, setValidationGen] = useState(0);
  const [activeTab, setActiveTab] = useState<EventsTab>(tab);

  const selectTab = useCallback((next: EventsTab) => {
    const href = next === "validation" ? "/events?tab=validation" : "/events?tab=events";
    if (typeof window !== "undefined" && typeof window.history?.pushState === "function") {
      window.history.pushState({ feEventsTab: next }, "", href);
    }
    setActiveTab(next);
  }, []);

  const loadEvents = useCallback(
    async (cursor: string | null, query: EventsListQuery) => {
      setEventStatus("loading");
      setEventError(null);
      setEventErrorCode(null);
      const freshPage = cursor === null;
      if (freshPage) {
        suppressLifecycleKeysRef.current = new Set();
        setSuppressLifecycleKeys(new Set());
        setBoundaryContext([]);
      }
      try {
        const result = await loadEventsPage(
          props.fetchImpl !== undefined
            ? { cursor, limit: 100, query, fetchImpl: props.fetchImpl }
            : { cursor, limit: 100, query },
        );
        if (result.kind === "failure") {
          setEventItems([]);
          setBoundaryContext([]);
          setEventTotal(0);
          setEventNext(null);
          setPersonNameById(new Map());
          setEventErrorCode(result.code);
          setEventError(
            result.code !== null ? `${result.code}: ${result.message}` : result.message,
          );
          setEventStatus(result.code === "STALE_CURSOR" ? "stale" : "error");
          return;
        }

        let peekItems: EventListItemView[] = [];
        if (
          result.data.nextCursor !== null &&
          hasIncompleteTrainingLifecycleOnPage(result.data.items)
        ) {
          const peek = await loadEventsPage(
            props.fetchImpl !== undefined
              ? {
                  cursor: result.data.nextCursor,
                  limit: 100,
                  query,
                  fetchImpl: props.fetchImpl,
                }
              : { cursor: result.data.nextCursor, limit: 100, query },
          );
          if (peek.kind === "success") {
            peekItems = peek.data.items;
          }
        }

        // Suppress only keys already shown on a *previous* page.
        // Do NOT pass keys emitted on this page into EventListView — rebuild would
        // hide the same-page lifecycle cards (FIX12 wipe: contentlessHidden≈page size).
        const suppressForBuild = freshPage ? new Set<string>() : suppressLifecycleKeysRef.current;
        const built = buildHumanEventCards(result.data.items, undefined, {
          boundaryContext: peekItems,
          suppressLifecycleKeys: suppressForBuild,
        });
        const forNextPage = new Set(suppressForBuild);
        for (const key of built.emittedLifecycleKeys) {
          forNextPage.add(key);
        }
        suppressLifecycleKeysRef.current = forNextPage;

        setEventItems(result.data.items);
        setBoundaryContext(peekItems);
        setSuppressLifecycleKeys(suppressForBuild);
        setEventTotal(result.data.totalCount);
        setEventNext(result.data.nextCursor);
        setEventStatus(result.data.items.length === 0 ? "empty" : "success");
        const nameSource =
          peekItems.length > 0 ? [...result.data.items, ...peekItems] : result.data.items;
        void resolvePersonNames(nameSource, props.fetchImpl).then(setPersonNameById);
      } catch (error) {
        setEventItems([]);
        setBoundaryContext([]);
        setEventTotal(0);
        setEventNext(null);
        setPersonNameById(new Map());
        setEventErrorCode(null);
        setEventError(error instanceof Error ? error.message : "events_load_failed");
        setEventStatus("error");
      }
    },
    [props.fetchImpl],
  );

  const loadValidation = useCallback(
    async (cursor: string | null, query: ValidationListQuery) => {
      setValidationStatus("loading");
      setValidationError(null);
      setValidationErrorCode(null);
      try {
        const result = await loadValidationResultsPage(
          props.fetchImpl !== undefined
            ? { cursor, limit: 100, query, fetchImpl: props.fetchImpl }
            : { cursor, limit: 100, query },
        );
        if (result.kind === "failure") {
          setValidationItems([]);
          setValidationTotal(0);
          setValidationNext(null);
          setValidationErrorCode(result.code);
          setValidationError(
            result.code !== null ? `${result.code}: ${result.message}` : result.message,
          );
          setValidationStatus(result.code === "STALE_CURSOR" ? "stale" : "error");
          return;
        }
        setValidationItems(result.data.items);
        setValidationTotal(result.data.totalCount);
        setValidationNext(result.data.nextCursor);
        setValidationStatus(result.data.items.length === 0 ? "empty" : "success");
      } catch (error) {
        setValidationItems([]);
        setValidationTotal(0);
        setValidationNext(null);
        setValidationErrorCode(null);
        setValidationError(error instanceof Error ? error.message : "validation_load_failed");
        setValidationStatus("error");
      }
    },
    [props.fetchImpl],
  );

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadSimulation(
        props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : undefined,
      );
      if (cancelled || result.kind !== "success") {
        return;
      }
      const year = result.summary.worldDate.year;
      if (Number.isInteger(year) && year >= 1) {
        setYearOptionsMax(year);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.fetchImpl, eventGen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onPopState = () => {
      setActiveTab(parseEventsTab(window.location.search));
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    void loadEvents(null, appliedEventsQuery);
  }, [loadEvents, appliedEventsQuery, eventGen]);

  useEffect(() => {
    void loadValidation(null, appliedValidationQuery);
  }, [loadValidation, appliedValidationQuery, validationGen]);

  return (
    <section
      className="dw-card dw-events-page"
      data-testid="events-page"
      data-active-tab={activeTab}
    >
      <h2>出来事</h2>
      <p className="dw-lead">世界の正史として記録された出来事を閲覧します。</p>
      <nav className="dw-tabs" aria-label="出来事" data-testid="events-tabs">
        <a
          href="/events?tab=events"
          data-testid="events-tab-events"
          data-tab-active={activeTab === "events" ? "true" : "false"}
          aria-current={activeTab === "events" ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            selectTab("events");
          }}
        >
          出来事（正史）
        </a>
      </nav>
      <nav
        className="dw-tabs dw-tabs-dev"
        aria-label="システム検証（開発者向け）"
        data-testid="events-dev-tabs"
      >
        <a
          href="/events?tab=validation"
          data-testid="events-tab-validation"
          data-tab-active={activeTab === "validation" ? "true" : "false"}
          aria-current={activeTab === "validation" ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            selectTab("validation");
          }}
        >
          システム検証（開発者向け）
        </a>
      </nav>

      <div className="dw-events-pane" hidden={activeTab !== "events"}>
        <EventListView
          status={eventStatus}
          items={eventItems}
          boundaryContext={boundaryContext}
          suppressLifecycleKeys={suppressLifecycleKeys}
          totalCount={eventTotal}
          errorText={eventError}
          errorCode={eventErrorCode}
          personIdFilter={personIdFilter}
          eventGroupFilter={eventGroupFilter}
          yearFilter={yearFilter}
          monthFilter={monthFilter}
          weekFilter={weekFilter}
          yearOptionsMax={yearOptionsMax}
          filterHint={filterHint}
          canNext={eventNext !== null && eventStatus !== "loading"}
          loading={eventStatus === "loading"}
          personNameById={personNameById}
          onPersonIdFilterChange={setPersonIdFilter}
          onEventGroupFilterChange={setEventGroupFilter}
          onYearFilterChange={(value) => {
            setYearFilter(value);
            setFilterHint(null);
          }}
          onMonthFilterChange={(value) => {
            setMonthFilter(value);
            setFilterHint(null);
          }}
          onWeekFilterChange={(value) => {
            setWeekFilter(value);
            setFilterHint(null);
          }}
          onApplyQuery={() => {
            const yearNum = Number.parseInt(yearFilter, 10);
            const monthNum = Number.parseInt(monthFilter, 10);
            const weekNum = Number.parseInt(weekFilter, 10);
            const yearOk =
              yearFilter.trim().length === 0 ||
              (Number.isInteger(yearNum) &&
                yearNum >= 1 &&
                (yearOptionsMax === null || yearNum <= yearOptionsMax));
            const monthOk =
              monthFilter.trim().length === 0 ||
              (Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12);
            const weekOk =
              weekFilter.trim().length === 0 ||
              (Number.isInteger(weekNum) && weekNum >= 1 && weekNum <= 4);
            if (!yearOk || !monthOk || !weekOk) {
              setFilterHint(
                "年・月・週の組み合わせが正しくありません。世界暦の年と、1〜12月・第1〜4週から選んでください。",
              );
              return;
            }
            if (
              (monthFilter.trim().length > 0 || weekFilter.trim().length > 0) &&
              yearFilter.trim().length === 0
            ) {
              setFilterHint("月や週で絞り込むときは、先に年を選んでください。");
              return;
            }
            setFilterHint(null);
            setAppliedEventsQuery({
              personId: personIdFilter.trim().length > 0 ? personIdFilter.trim() : null,
              eventGroup:
                eventGroupFilter === "training" || eventGroupFilter === "technique_learning"
                  ? eventGroupFilter
                  : null,
              year: yearFilter.trim().length > 0 ? yearNum : null,
              month: monthFilter.trim().length > 0 ? monthNum : null,
              week: weekFilter.trim().length > 0 ? weekNum : null,
            });
            setEventGen((n) => n + 1);
          }}
          onResetToNewest={() => {
            setPersonIdFilter("");
            setEventGroupFilter("");
            setYearFilter("");
            setMonthFilter("");
            setWeekFilter("");
            setFilterHint(null);
            suppressLifecycleKeysRef.current = new Set();
            setSuppressLifecycleKeys(new Set());
            setBoundaryContext([]);
            setAppliedEventsQuery({});
            setEventGen((n) => n + 1);
          }}
          onNext={() => {
            if (eventNext !== null) {
              void loadEvents(eventNext, appliedEventsQuery);
            }
          }}
          onFreshReload={() => {
            setEventGen((n) => n + 1);
          }}
          onRecoverSession={() => {
            void (async () => {
              const session = await loadUiSession(
                props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : undefined,
              );
              if (session.kind === "success") {
                setFilterHint(null);
                setEventGen((n) => n + 1);
                return;
              }
              setFilterHint("セッションを再接続できませんでした。ホームからやり直してください。");
            })();
          }}
        />
      </div>
      <div className="dw-validation-pane" hidden={activeTab !== "validation"}>
        <ValidationListView
          status={validationStatus}
          items={validationItems}
          totalCount={validationTotal}
          errorText={validationError}
          errorCode={validationErrorCode}
          statusFilter={statusFilter}
          canNext={validationNext !== null && validationStatus !== "loading"}
          loading={validationStatus === "loading"}
          onStatusFilterChange={setStatusFilter}
          onApplyQuery={() => {
            setAppliedValidationQuery({
              status:
                statusFilter === "success" || statusFilter === "failure" ? statusFilter : null,
            });
            setValidationGen((n) => n + 1);
          }}
          onNext={() => {
            if (validationNext !== null) {
              void loadValidation(validationNext, appliedValidationQuery);
            }
          }}
          onFreshReload={() => {
            setValidationGen((n) => n + 1);
          }}
        />
      </div>
    </section>
  );
}
