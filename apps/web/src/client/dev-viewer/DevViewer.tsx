import { useCallback, useEffect, useState } from "react";
import { MockCandidatesViewer } from "./MockCandidatesViewer.js";
import { PeopleViewer } from "./PeopleViewer.js";
import { SimulationPanel } from "./SimulationPanel.js";
import type { FetchLike as ListFetchLike } from "./fetch-ui004.js";
import {
  ensureReadySimulation,
  loadUiSession,
  type FetchLike as SessionFetchLike,
  type UiSessionResult,
} from "../session-client.js";

export type DevViewerProps = {
  fetchImpl?: SessionFetchLike & ListFetchLike;
  /** When true (default), empty sessions are started via accepted POST /simulation/start. */
  autoStartIfEmpty?: boolean;
};

type GateStatus = "loading" | "ready" | "error";

/**
 * Developer-only UI-003/UI-004 surface viewer. Not production game UI.
 * Establishes UI-002 session (cookie) before any People/Candidates fetch.
 * Deliberately excludes UI-005 PersonDetail and UI-006 mock battle APIs.
 */
export function DevViewer(props: DevViewerProps = {}) {
  const autoStartIfEmpty = props.autoStartIfEmpty !== false;
  const [gate, setGate] = useState<GateStatus>("loading");
  const [sessionState, setSessionState] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setGate("loading");
      setErrorText(null);
      const fetchOpts = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : undefined;
      let session: UiSessionResult = await loadUiSession(fetchOpts);
      if (cancelled) {
        return;
      }
      if (session.kind === "failure") {
        setGate("error");
        setErrorText(
          session.code !== null ? `${session.code}: ${session.message}` : session.message,
        );
        return;
      }
      if (session.sessionState === "empty" && autoStartIfEmpty) {
        session = await ensureReadySimulation({
          csrfToken: session.csrfToken,
          expectedUiRevision: session.uiRevision,
          ...(props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {}),
        });
        if (cancelled) {
          return;
        }
        if (session.kind === "failure") {
          setGate("error");
          setErrorText(
            session.code !== null ? `${session.code}: ${session.message}` : session.message,
          );
          return;
        }
      }
      setSessionState(session.sessionState);
      setCsrfToken(session.csrfToken);
      setGate("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [props.fetchImpl, autoStartIfEmpty]);

  /** Post-mutation refresh: re-read session, then remount-refresh every list panel. */
  const refreshAfterMutation = useCallback(async () => {
    const session = await loadUiSession(
      props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : undefined,
    );
    if (session.kind === "success") {
      setSessionState(session.sessionState);
      setCsrfToken(session.csrfToken);
      setErrorText(null);
    } else {
      setErrorText(session.code !== null ? `${session.code}: ${session.message}` : session.message);
    }
    setRefreshGeneration((generation) => generation + 1);
  }, [props.fetchImpl]);

  const fetchProps =
    props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl as ListFetchLike } : {};
  const sessionFetchProps = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {};

  return (
    <div data-testid="dev-viewer-root">
      <header>
        <h1>Dollworld Dev Viewer</h1>
        <p data-testid="dev-viewer-badge">
          developer / debug — accepted UI-002 / UI-003 / UI-004 API surface only
        </p>
        <p data-testid="dev-viewer-session-gate" data-gate={gate}>
          session gate: {gate}
          {sessionState !== null ? ` (${sessionState})` : ""}
        </p>
        {errorText !== null ? (
          <p data-testid="dev-viewer-session-error" data-error={errorText}>
            {errorText}
          </p>
        ) : null}
        <p>
          <a href="/" data-testid="dev-viewer-back-shell">
            ← Shell
          </a>
        </p>
      </header>
      <main>
        {gate === "loading" ? (
          <p data-testid="dev-viewer-session-loading">Initializing session…</p>
        ) : null}
        {gate === "ready" && csrfToken !== null ? (
          <>
            <SimulationPanel
              csrfToken={csrfToken}
              sessionState={sessionState}
              refreshGeneration={refreshGeneration}
              onAfterMutation={refreshAfterMutation}
              {...sessionFetchProps}
            />
            <hr />
            <PeopleViewer refreshGeneration={refreshGeneration} {...fetchProps} />
            <hr />
            <MockCandidatesViewer refreshGeneration={refreshGeneration} {...fetchProps} />
          </>
        ) : null}
        <p data-testid="dev-viewer-excluded-ui005">
          PersonDetail (UI-005) is not exposed in DEV-VIEWER-002: no current authority explicitly
          releases UI-005 for viewer use.
        </p>
        <p data-testid="dev-viewer-excluded-ui006">
          Mock battle POST/replay/latest (UI-006) are not exposed in DEV-VIEWER-002.
        </p>
      </main>
    </div>
  );
}
