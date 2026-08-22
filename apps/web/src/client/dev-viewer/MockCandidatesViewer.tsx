import { useCallback, useEffect, useState } from "react";
import { loadMockCandidatesPage, type FetchLike, type ListLoadResult } from "./fetch-ui004.js";
import { MockCandidatesViewerView } from "./MockCandidatesViewerView.js";
import type { MockBattleCandidateView } from "./ui004-views.js";

export type MockCandidatesViewerProps = {
  fetchImpl?: FetchLike;
  loadPage?: (cursor: string | null) => Promise<ListLoadResult<MockBattleCandidateView>>;
  /** Bumped by DevViewer after a successful simulation mutation. */
  refreshGeneration?: number;
};

type ViewerStatus = "loading" | "success" | "empty" | "error";

/** Accepted UI-004 default limit (enum 50 | 100 | 200). */
const CANDIDATES_PAGE_LIMIT = 50;

export function MockCandidatesViewer(props: MockCandidatesViewerProps) {
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [items, setItems] = useState<MockBattleCandidateView[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [uiRevision, setUiRevision] = useState<number | null>(null);

  const runLoad = useCallback(
    async (cursor: string | null, stack: (string | null)[]) => {
      setStatus("loading");
      setErrorText(null);
      const loader =
        props.loadPage ??
        ((c: string | null) =>
          loadMockCandidatesPage(
            props.fetchImpl !== undefined
              ? { cursor: c, limit: CANDIDATES_PAGE_LIMIT, fetchImpl: props.fetchImpl }
              : { cursor: c, limit: CANDIDATES_PAGE_LIMIT },
          ));
      const result = await loader(cursor);
      if (result.kind === "failure") {
        setStatus("error");
        setErrorText(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        setItems([]);
        setTotalCount(0);
        setNextCursor(null);
        setUiRevision(null);
        return;
      }
      setItems(result.data.items);
      setTotalCount(result.data.totalCount);
      setNextCursor(result.data.nextCursor);
      setUiRevision(result.uiRevision);
      setCursorStack(stack);
      setStatus(result.data.items.length === 0 ? "empty" : "success");
    },
    [props.fetchImpl, props.loadPage],
  );

  useEffect(() => {
    void runLoad(null, [null]);
  }, [runLoad, props.refreshGeneration]);

  return (
    <MockCandidatesViewerView
      status={status}
      items={items}
      totalCount={totalCount}
      uiRevision={uiRevision}
      errorText={errorText}
      canPrev={cursorStack.length > 1 && status !== "loading"}
      canNext={nextCursor !== null && status !== "loading"}
      onPrev={() => {
        if (cursorStack.length <= 1 || status === "loading") {
          return;
        }
        const nextStack = cursorStack.slice(0, -1);
        const prevCursor = nextStack[nextStack.length - 1] ?? null;
        void runLoad(prevCursor, nextStack);
      }}
      onNext={() => {
        if (nextCursor === null || status === "loading") {
          return;
        }
        void runLoad(nextCursor, [...cursorStack, nextCursor]);
      }}
    />
  );
}
