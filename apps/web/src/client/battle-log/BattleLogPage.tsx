import { useCallback, useEffect, useState } from "react";
import type { FetchLike } from "../session-client.js";
import { loadMockBattleLatest } from "../mock-battle/fetch-ui006.js";
import type { MockBattleView } from "../mock-battle/ui006-views.js";
import { loadPersonDetail } from "../person-detail/fetch-ui005.js";
import type { PersonDetailView } from "../person-detail/ui005-views.js";
import { loadBattleLogPage } from "./fetch-ui007.js";
import { BattleLogViewPanel } from "./BattleLogView.js";
import type { BattleLogItemView } from "./ui007-views.js";

export type BattleLogPageProps = {
  fetchImpl?: FetchLike;
};

type DetailLoadState = {
  status: "idle" | "loading" | "success" | "error";
  detail: PersonDetailView | null;
  error: string | null;
  displayName: string | null;
};

async function loadParticipantDetail(
  personId: string,
  fetchImpl: FetchLike | undefined,
): Promise<DetailLoadState> {
  const result = await loadPersonDetail(
    fetchImpl !== undefined ? { personId, fetchImpl } : { personId },
  );
  if (result.kind === "failure") {
    return {
      status: "error",
      detail: null,
      error: result.code !== null ? `${result.code}: ${result.message}` : result.message,
      displayName: null,
    };
  }
  return {
    status: "success",
    detail: result.data,
    error: null,
    displayName: typeof result.data.displayName === "string" ? result.data.displayName : null,
  };
}

export function BattleLogPage(props: BattleLogPageProps) {
  const [summaryStatus, setSummaryStatus] = useState<"loading" | "success" | "empty" | "error">(
    "loading",
  );
  const [summary, setSummary] = useState<MockBattleView | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryErrorCode, setSummaryErrorCode] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<"loading" | "success" | "empty" | "error">("loading");
  const [logItems, setLogItems] = useState<BattleLogItemView[]>([]);
  const [logTotalCount, setLogTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [logErrorCode, setLogErrorCode] = useState<string | null>(null);
  const [personNameById, setPersonNameById] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  const [participantADetailStatus, setParticipantADetailStatus] =
    useState<DetailLoadState["status"]>("idle");
  const [participantBDetailStatus, setParticipantBDetailStatus] =
    useState<DetailLoadState["status"]>("idle");
  const [participantADetail, setParticipantADetail] = useState<PersonDetailView | null>(null);
  const [participantBDetail, setParticipantBDetail] = useState<PersonDetailView | null>(null);
  const [participantADetailError, setParticipantADetailError] = useState<string | null>(null);
  const [participantBDetailError, setParticipantBDetailError] = useState<string | null>(null);

  const loadLog = useCallback(
    async (cursor: string | null, append: boolean) => {
      setLogStatus("loading");
      setLogError(null);
      setLogErrorCode(null);
      const result = await loadBattleLogPage(
        props.fetchImpl !== undefined
          ? { cursor, limit: 100, fetchImpl: props.fetchImpl }
          : { cursor, limit: 100 },
      );
      if (result.kind === "failure") {
        // Fail-closed on paging too: never keep prior rows as trusted current success.
        setLogItems([]);
        setLogTotalCount(0);
        setNextCursor(null);
        if (result.code === "NOT_FOUND" && !append) {
          setLogStatus("empty");
          return;
        }
        setLogStatus("error");
        setLogErrorCode(result.code);
        setLogError(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        return;
      }
      setLogItems((prev) => (append ? [...prev, ...result.data.items] : result.data.items));
      setLogTotalCount(result.data.totalCount);
      setNextCursor(result.data.nextCursor);
      setLogStatus(result.data.items.length === 0 && !append ? "empty" : "success");
    },
    [props.fetchImpl],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setSummaryStatus("loading");
      setLogStatus("loading");
      setParticipantADetailStatus("idle");
      setParticipantBDetailStatus("idle");
      const latest = await loadMockBattleLatest(
        props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {},
      );
      if (cancelled) {
        return;
      }
      if (latest.kind === "failure") {
        setSummary(null);
        setLogItems([]);
        if (latest.code === "NOT_FOUND") {
          setSummaryStatus("empty");
          setLogStatus("empty");
          return;
        }
        setSummaryStatus("error");
        setSummaryErrorCode(latest.code);
        setSummaryError(
          latest.code !== null ? `${latest.code}: ${latest.message}` : latest.message,
        );
        setLogStatus("error");
        setLogErrorCode(latest.code);
        setLogError(latest.code !== null ? `${latest.code}: ${latest.message}` : latest.message);
        return;
      }
      setSummary(latest.data);
      setSummaryStatus("success");

      const idA =
        typeof latest.data.participantAPersonId === "string"
          ? latest.data.participantAPersonId
          : "";
      const idB =
        typeof latest.data.participantBPersonId === "string"
          ? latest.data.participantBPersonId
          : "";
      if (idA.length > 0) {
        setParticipantADetailStatus("loading");
      }
      if (idB.length > 0) {
        setParticipantBDetailStatus("loading");
      }
      void Promise.all([
        idA.length > 0
          ? loadParticipantDetail(idA, props.fetchImpl)
          : Promise.resolve<DetailLoadState>({
              status: "idle",
              detail: null,
              error: null,
              displayName: null,
            }),
        idB.length > 0
          ? loadParticipantDetail(idB, props.fetchImpl)
          : Promise.resolve<DetailLoadState>({
              status: "idle",
              detail: null,
              error: null,
              displayName: null,
            }),
      ]).then(([a, b]) => {
        if (cancelled) {
          return;
        }
        setParticipantADetailStatus(a.status);
        setParticipantADetail(a.detail);
        setParticipantADetailError(a.error);
        setParticipantBDetailStatus(b.status);
        setParticipantBDetail(b.detail);
        setParticipantBDetailError(b.error);
        const names = new Map<string, string>();
        if (idA.length > 0 && a.displayName !== null) {
          names.set(idA, a.displayName);
        }
        if (idB.length > 0 && b.displayName !== null) {
          names.set(idB, b.displayName);
        }
        setPersonNameById(names);
      });

      const log = await loadBattleLogPage(
        props.fetchImpl !== undefined
          ? { cursor: null, limit: 100, fetchImpl: props.fetchImpl }
          : { cursor: null, limit: 100 },
      );
      if (cancelled) {
        return;
      }
      if (log.kind === "failure") {
        setLogItems([]);
        if (log.code === "NOT_FOUND") {
          setLogStatus("empty");
          return;
        }
        setLogStatus("error");
        setLogErrorCode(log.code);
        setLogError(log.code !== null ? `${log.code}: ${log.message}` : log.message);
        return;
      }
      setLogItems(log.data.items);
      setLogTotalCount(log.data.totalCount);
      setNextCursor(log.data.nextCursor);
      setLogStatus(log.data.items.length === 0 ? "empty" : "success");
    })();
    return () => {
      cancelled = true;
    };
  }, [props.fetchImpl]);

  return (
    <BattleLogViewPanel
      summaryStatus={summaryStatus}
      summary={summary}
      summaryError={summaryError}
      summaryErrorCode={summaryErrorCode}
      logStatus={logStatus}
      logItems={logItems}
      logTotalCount={logTotalCount}
      logError={logError}
      logErrorCode={logErrorCode}
      canNext={nextCursor !== null && logStatus === "success"}
      personNameById={personNameById}
      participantADetail={participantADetail}
      participantBDetail={participantBDetail}
      participantADetailStatus={participantADetailStatus}
      participantBDetailStatus={participantBDetailStatus}
      participantADetailError={participantADetailError}
      participantBDetailError={participantBDetailError}
      onNext={() => {
        if (nextCursor !== null) {
          void loadLog(nextCursor, true);
        }
      }}
    />
  );
}
