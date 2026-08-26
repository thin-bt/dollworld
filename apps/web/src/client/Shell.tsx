import { useCallback, useEffect, useState } from "react";
import { MENU_ITEMS, type SessionDisplayState } from "../shared/ui001-contracts.js";
import { BattleLogPage } from "./battle-log/BattleLogPage.js";
import { PeopleViewer } from "./dev-viewer/PeopleViewer.js";
import { SimulationPanel } from "./dev-viewer/SimulationPanel.js";
import { EventsPage, type EventsTab } from "./events/EventsPage.js";
import { MockBattlePage } from "./mock-battle/MockBattlePage.js";
import { PersonDetailPage } from "./person-detail/PersonDetailPage.js";
import { ensureReadySimulation, loadUiSession } from "./session-client.js";

export type { EventsTab };

export type ShellRoute =
  | { kind: "home" }
  | { kind: "people" }
  | { kind: "person-detail"; personId: string }
  | { kind: "mock-battle" }
  | { kind: "mock-battle-result" }
  | { kind: "events"; tab: EventsTab };

export type ShellProps = {
  sessionState?: SessionDisplayState;
  route?: ShellRoute;
};

function sessionAllowsReadRoutes(state: SessionDisplayState): boolean {
  return state === "ready" || state === "updating";
}

function menuHref(item: (typeof MENU_ITEMS)[number]): string | null {
  if (item === "人物") {
    return "/people";
  }
  if (item === "模擬戦") {
    return "/mock-battle";
  }
  if (item === "イベント") {
    return "/events";
  }
  if (item === "シミュレーション") {
    return "/";
  }
  return null;
}

export function Shell({
  sessionState: initialState = "empty",
  route = { kind: "home" },
}: ShellProps) {
  const [sessionState, setSessionState] = useState<SessionDisplayState>(initialState);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [navigationEpoch, setNavigationEpoch] = useState(0);
  const [homeRefresh, setHomeRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Same accepted lifecycle as /dev-viewer: acquire UI-002 session, then if empty
      // start the accepted default simulation before mounting read/mutation panels.
      let result = await loadUiSession();
      if (cancelled) {
        return;
      }
      if (result.kind !== "success") {
        setCsrfToken(null);
        setLoadError(
          result.message === "transport_error" ? "session_transport" : "session_unavailable",
        );
        return;
      }
      if (result.sessionState === "empty") {
        result = await ensureReadySimulation({
          csrfToken: result.csrfToken,
          expectedUiRevision: result.uiRevision,
        });
        if (cancelled) {
          return;
        }
        if (result.kind !== "success") {
          setCsrfToken(null);
          setLoadError(
            result.message === "transport_error" ? "session_transport" : "session_unavailable",
          );
          return;
        }
      }
      setSessionState(result.sessionState);
      setCsrfToken(result.csrfToken);
      setLoadError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigationEpoch]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setNavigationEpoch((n) => n + 1);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const refreshHome = useCallback(async () => {
    const result = await loadUiSession();
    if (result.kind === "success") {
      setSessionState(result.sessionState);
      setCsrfToken(result.csrfToken);
      setLoadError(null);
    } else {
      setLoadError(
        result.message === "transport_error" ? "session_transport" : "session_unavailable",
      );
    }
    setHomeRefresh((n) => n + 1);
  }, []);

  const peopleActive = route.kind === "people" || route.kind === "person-detail";
  const mockActive = route.kind === "mock-battle" || route.kind === "mock-battle-result";
  const eventsActive = route.kind === "events";
  const homeActive = route.kind === "home";

  return (
    <div
      className="dw-shell"
      data-testid="ui001-shell"
      data-navigation-epoch={String(navigationEpoch)}
    >
      <header className="dw-header">
        <div className="dw-brand">
          <h1>Dollworld</h1>
          <p
            className="dw-session"
            data-testid="session-state"
            data-session-state={sessionState}
            hidden
          >
            {sessionState}
          </p>
          {loadError !== null ? (
            <p data-testid="session-load-error" data-error={loadError}>
              セッション取得に失敗しました
            </p>
          ) : null}
        </div>
        <nav className="dw-nav" aria-label="共通メニュー">
          <ul data-testid="common-menu">
            {MENU_ITEMS.map((item) => {
              const href = menuHref(item);
              const isPeople = item === "人物";
              const isMock = item === "模擬戦";
              const isEvents = item === "イベント";
              const isHome = item === "シミュレーション";
              const active =
                (isHome && homeActive) ||
                (isPeople && peopleActive) ||
                (isMock && mockActive) ||
                (isEvents && eventsActive);
              return (
                <li key={item}>
                  {href !== null ? (
                    <a
                      href={href}
                      data-menu-item={item}
                      data-menu-active={active ? "true" : "false"}
                      aria-current={active ? "page" : undefined}
                    >
                      {item}
                    </a>
                  ) : (
                    <span data-menu-item={item}>{item}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main
        className="dw-main"
        key={navigationEpoch}
        data-testid="shell-main"
        data-route-kind={route.kind}
      >
        {sessionState === "empty" ? (
          <p className="dw-status" data-status={loadError !== null ? "error" : "loading"}>
            {loadError !== null ? "セッション取得に失敗しました" : "読み込み中…"}
          </p>
        ) : null}
        {sessionState === "ready" && csrfToken !== null && route.kind === "home" ? (
          <SimulationPanel
            csrfToken={csrfToken}
            sessionState={sessionState}
            refreshGeneration={homeRefresh}
            onAfterMutation={refreshHome}
          />
        ) : null}
        {sessionAllowsReadRoutes(sessionState) && route.kind === "people" ? (
          <PeopleViewer enablePersonNavigation={true} />
        ) : null}
        {sessionAllowsReadRoutes(sessionState) && route.kind === "person-detail" ? (
          <PersonDetailPage personId={route.personId} />
        ) : null}
        {sessionState === "ready" && route.kind === "mock-battle" ? <MockBattlePage /> : null}
        {sessionAllowsReadRoutes(sessionState) && route.kind === "mock-battle-result" ? (
          <BattleLogPage />
        ) : null}
        {sessionAllowsReadRoutes(sessionState) && route.kind === "events" ? (
          <EventsPage tab={route.tab} />
        ) : null}
      </main>
    </div>
  );
}
