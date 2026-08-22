import { useCallback, useEffect, useState } from "react";
import { loadMockCandidatesPage, type FetchLike } from "../dev-viewer/fetch-ui004.js";
import type { MockBattleCandidateView } from "../dev-viewer/ui004-views.js";
import { loadPersonDetail } from "../person-detail/fetch-ui005.js";
import type { PersonDetailView } from "../person-detail/ui005-views.js";
import { loadUiSession } from "../session-client.js";
import { loadMockBattleLatest, postMockBattle, postMockBattleReplay } from "./fetch-ui006.js";
import { MockBattleViewPanel } from "./MockBattleView.js";
import type { ParticipantSummaryStatus } from "./MockParticipantSummary.js";
import type { MockBattleView } from "./ui006-views.js";

export type MockBattlePageProps = {
  fetchImpl?: FetchLike;
};

export function MockBattlePage(props: MockBattlePageProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [uiRevision, setUiRevision] = useState(0);
  const [candidatesStatus, setCandidatesStatus] = useState<
    "loading" | "success" | "empty" | "error"
  >("loading");
  const [candidatesLoadingText, setCandidatesLoadingText] = useState("候補を読み込み中…");
  const [candidates, setCandidates] = useState<MockBattleCandidateView[]>([]);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [participantAId, setParticipantAId] = useState("");
  const [participantBId, setParticipantBId] = useState("");
  const [participantASummaryStatus, setParticipantASummaryStatus] =
    useState<ParticipantSummaryStatus>("idle");
  const [participantBSummaryStatus, setParticipantBSummaryStatus] =
    useState<ParticipantSummaryStatus>("idle");
  const [participantADetail, setParticipantADetail] = useState<PersonDetailView | null>(null);
  const [participantBDetail, setParticipantBDetail] = useState<PersonDetailView | null>(null);
  const [participantASummaryError, setParticipantASummaryError] = useState<string | null>(null);
  const [participantBSummaryError, setParticipantBSummaryError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<
    "idle" | "loading" | "success" | "empty" | "error"
  >("idle");
  const [latestError, setLatestError] = useState<string | null>(null);
  const [trustedResult, setTrustedResult] = useState<MockBattleView | null>(null);
  const [replayAvailable, setReplayAvailable] = useState(false);

  const samePersonBlocked =
    participantAId.length > 0 && participantBId.length > 0 && participantAId === participantBId;

  const bootstrap = useCallback(async () => {
    setCandidatesStatus("loading");
    setCandidatesLoadingText("候補を読み込み中…");
    setCandidatesError(null);
    const fetchOpts = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {};
    try {
      const session = await loadUiSession(fetchOpts);
      if (session.kind !== "success") {
        setCandidatesStatus("error");
        setCandidatesError(
          session.code !== null ? `${session.code}: ${session.message}` : session.message,
        );
        return;
      }
      setCsrfToken(session.csrfToken);
      setUiRevision(session.uiRevision);

      const loadCandidates = async () =>
        loadMockCandidatesPage(
          props.fetchImpl !== undefined
            ? { cursor: null, limit: 50, fetchImpl: props.fetchImpl }
            : { cursor: null, limit: 50 },
        );

      const page = await loadCandidates();
      if (page.kind === "failure") {
        setCandidates([]);
        setCandidatesStatus("error");
        setCandidatesError(page.code !== null ? `${page.code}: ${page.message}` : page.message);
        return;
      }

      // FIX6: never auto-advance the world from candidate load (0 / 1 / >=2).
      // World progression is only via explicit simulation controls.
      setCandidates(page.data.items);
      setUiRevision(page.uiRevision);
      setCandidatesStatus(page.data.items.length === 0 ? "empty" : "success");
    } catch (error) {
      setCandidates([]);
      setCandidatesStatus("error");
      setCandidatesError(error instanceof Error ? error.message : "candidates_load_failed");
    }
  }, [props.fetchImpl]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    let cancelled = false;
    if (participantAId.length === 0) {
      setParticipantASummaryStatus("idle");
      setParticipantADetail(null);
      setParticipantASummaryError(null);
      return;
    }
    setParticipantASummaryStatus("loading");
    setParticipantASummaryError(null);
    void loadPersonDetail(
      props.fetchImpl !== undefined
        ? { personId: participantAId, fetchImpl: props.fetchImpl }
        : { personId: participantAId },
    ).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.kind === "failure") {
        setParticipantADetail(null);
        setParticipantASummaryStatus("error");
        setParticipantASummaryError(
          result.code !== null ? `${result.code}: ${result.message}` : result.message,
        );
        return;
      }
      setParticipantADetail(result.data);
      setParticipantASummaryStatus("success");
      setUiRevision(result.uiRevision);
    });
    return () => {
      cancelled = true;
    };
  }, [participantAId, props.fetchImpl]);

  useEffect(() => {
    let cancelled = false;
    if (participantBId.length === 0) {
      setParticipantBSummaryStatus("idle");
      setParticipantBDetail(null);
      setParticipantBSummaryError(null);
      return;
    }
    setParticipantBSummaryStatus("loading");
    setParticipantBSummaryError(null);
    void loadPersonDetail(
      props.fetchImpl !== undefined
        ? { personId: participantBId, fetchImpl: props.fetchImpl }
        : { personId: participantBId },
    ).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.kind === "failure") {
        setParticipantBDetail(null);
        setParticipantBSummaryStatus("error");
        setParticipantBSummaryError(
          result.code !== null ? `${result.code}: ${result.message}` : result.message,
        );
        return;
      }
      setParticipantBDetail(result.data);
      setParticipantBSummaryStatus("success");
      setUiRevision(result.uiRevision);
    });
    return () => {
      cancelled = true;
    };
  }, [participantBId, props.fetchImpl]);

  const clearTrustedOnFailure = () => {
    setTrustedResult(null);
    setReplayAvailable(false);
  };

  const onRun = async () => {
    if (
      actionPending ||
      samePersonBlocked ||
      csrfToken === null ||
      participantAId.length === 0 ||
      participantBId.length === 0
    ) {
      return;
    }
    setActionPending(true);
    setActionError(null);
    setActionErrorCode(null);
    try {
      const result = await postMockBattle(
        props.fetchImpl !== undefined
          ? {
              csrfToken,
              expectedUiRevision: uiRevision,
              participantAId,
              participantBId,
              fetchImpl: props.fetchImpl,
            }
          : {
              csrfToken,
              expectedUiRevision: uiRevision,
              participantAId,
              participantBId,
            },
      );
      if (result.kind === "failure") {
        clearTrustedOnFailure();
        setActionErrorCode(result.code);
        setActionError(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        return;
      }
      setTrustedResult(result.data.result);
      setReplayAvailable(result.data.result.replayAvailable === true);
      setUiRevision(result.data.completedUiRevision);
      setLatestStatus("success");
    } catch (error) {
      clearTrustedOnFailure();
      setActionErrorCode(null);
      setActionError(error instanceof Error ? error.message : "mock_battle_run_failed");
    } finally {
      setActionPending(false);
    }
  };

  const onReplay = async () => {
    if (actionPending || csrfToken === null || !replayAvailable) {
      return;
    }
    setActionPending(true);
    setActionError(null);
    setActionErrorCode(null);
    try {
      const result = await postMockBattleReplay(
        props.fetchImpl !== undefined
          ? {
              csrfToken,
              expectedUiRevision: uiRevision,
              fetchImpl: props.fetchImpl,
            }
          : { csrfToken, expectedUiRevision: uiRevision },
      );
      if (result.kind === "failure") {
        clearTrustedOnFailure();
        setActionErrorCode(result.code);
        setActionError(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        return;
      }
      setTrustedResult(result.data.result);
      setReplayAvailable(result.data.result.replayAvailable === true);
      setUiRevision(result.data.completedUiRevision);
      setLatestStatus("success");
    } catch (error) {
      clearTrustedOnFailure();
      setActionErrorCode(null);
      setActionError(error instanceof Error ? error.message : "mock_battle_replay_failed");
    } finally {
      setActionPending(false);
    }
  };

  const onLatest = async () => {
    if (actionPending) {
      return;
    }
    setActionPending(true);
    setLatestStatus("loading");
    setLatestError(null);
    setActionError(null);
    setActionErrorCode(null);
    try {
      const result = await loadMockBattleLatest(
        props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {},
      );
      if (result.kind === "failure") {
        clearTrustedOnFailure();
        if (result.code === "NOT_FOUND") {
          setLatestStatus("empty");
          setLatestError(null);
          return;
        }
        setLatestStatus("error");
        setLatestError(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        return;
      }
      setTrustedResult(result.data);
      setReplayAvailable(result.data.replayAvailable === true);
      setUiRevision(result.uiRevision);
      setLatestStatus("success");
    } catch (error) {
      clearTrustedOnFailure();
      setLatestStatus("error");
      setLatestError(error instanceof Error ? error.message : "mock_battle_latest_failed");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <MockBattleViewPanel
      candidatesStatus={candidatesStatus}
      candidatesLoadingText={candidatesLoadingText}
      candidates={candidates}
      candidatesError={candidatesError}
      participantAId={participantAId}
      participantBId={participantBId}
      participantASummaryStatus={participantASummaryStatus}
      participantBSummaryStatus={participantBSummaryStatus}
      participantADetail={participantADetail}
      participantBDetail={participantBDetail}
      participantASummaryError={participantASummaryError}
      participantBSummaryError={participantBSummaryError}
      samePersonBlocked={samePersonBlocked}
      actionPending={actionPending}
      actionError={actionError}
      actionErrorCode={actionErrorCode}
      latestStatus={latestStatus}
      latestError={latestError}
      trustedResult={trustedResult}
      replayAvailable={replayAvailable}
      onParticipantAChange={setParticipantAId}
      onParticipantBChange={setParticipantBId}
      onRun={() => {
        void onRun();
      }}
      onReplay={() => {
        void onReplay();
      }}
      onLatest={() => {
        void onLatest();
      }}
    />
  );
}
