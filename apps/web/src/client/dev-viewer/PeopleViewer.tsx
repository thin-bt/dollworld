import { useCallback, useEffect, useState } from "react";
import {
  loadPeoplePage,
  type FetchLike,
  type ListLoadResult,
  type PeopleListQuery,
} from "./fetch-ui004.js";
import {
  appendPeoplePage,
  formatVisibleRange,
  initialPeoplePageStack,
  pageStackForPageSizeChange,
  popPeoplePage,
  PEOPLE_PAGE_SIZE_DEFAULT,
  type PeoplePageEntry,
  type PeoplePageSize,
} from "./people-paging.js";
import { PeopleViewerView } from "./PeopleViewerView.js";
import type { PersonListItemView } from "./ui004-views.js";

export type PeopleViewerProps = {
  fetchImpl?: FetchLike;
  loadPage?: (
    cursor: string | null,
    limit: PeoplePageSize,
    query: PeopleListQuery,
  ) => Promise<ListLoadResult<PersonListItemView>>;
  /** Bumped by DevViewer after a successful simulation mutation. */
  refreshGeneration?: number;
  /** FE-01: enable row links to `/people/<personId>`. */
  enablePersonNavigation?: boolean;
  personHref?: (personId: string) => string;
};

type ViewerStatus = "loading" | "success" | "empty" | "error" | "stale";

function toApiQuery(input: {
  nameFilter: string;
  stateFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}): PeopleListQuery {
  return {
    name: input.nameFilter.trim().length > 0 ? input.nameFilter.trim() : null,
    state: input.stateFilter.length > 0 ? input.stateFilter : null,
    // Always send explicit sort (personId is a valid explicit sortBy after FIX7).
    sortBy: input.sortBy.length > 0 ? input.sortBy : "personId",
    sortOrder: input.sortOrder,
  };
}

export function PeopleViewer(props: PeopleViewerProps) {
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [items, setItems] = useState<PersonListItemView[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PeoplePageSize>(PEOPLE_PAGE_SIZE_DEFAULT);
  const [pageStack, setPageStack] = useState<PeoplePageEntry[]>(initialPeoplePageStack());
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [uiRevision, setUiRevision] = useState<number | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  // FIX7: current-world viewing default = living only (existing filter; not invented semantics).
  const [stateFilter, setStateFilter] = useState("life:living");
  const [sortBy, setSortBy] = useState("personId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [appliedQuery, setAppliedQuery] = useState<PeopleListQuery>(() =>
    toApiQuery({
      nameFilter: "",
      stateFilter: "life:living",
      sortBy: "personId",
      sortOrder: "asc",
    }),
  );
  const [queryGeneration, setQueryGeneration] = useState(0);

  const runLoad = useCallback(
    async (stack: PeoplePageEntry[], limit: PeoplePageSize, query: PeopleListQuery) => {
      const target = stack[stack.length - 1] ?? { cursor: null, offset: 0 };
      setStatus("loading");
      setErrorText(null);
      setErrorCode(null);
      const loader =
        props.loadPage ??
        ((c: string | null, l: PeoplePageSize, q: PeopleListQuery) =>
          loadPeoplePage(
            props.fetchImpl !== undefined
              ? { cursor: c, limit: l, query: q, fetchImpl: props.fetchImpl }
              : { cursor: c, limit: l, query: q },
          ));
      const result = await loader(target.cursor, limit, query);
      if (result.kind === "failure") {
        // Fail-closed: never keep previous rows as current success.
        setItems([]);
        setTotalCount(0);
        setNextCursor(null);
        setUiRevision(null);
        setErrorCode(result.code);
        setErrorText(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        setStatus(result.code === "STALE_CURSOR" ? "stale" : "error");
        return;
      }
      setItems(result.data.items);
      setTotalCount(result.data.totalCount);
      setNextCursor(result.data.nextCursor);
      setUiRevision(result.uiRevision);
      setPageStack(stack);
      setStatus(result.data.items.length === 0 ? "empty" : "success");
    },
    [props.fetchImpl, props.loadPage],
  );

  // Page size / query / post-mutation refreshes restart from server page 1.
  useEffect(() => {
    void runLoad(pageStackForPageSizeChange(), pageSize, appliedQuery);
  }, [runLoad, pageSize, props.refreshGeneration, appliedQuery, queryGeneration]);

  const currentOffset = pageStack[pageStack.length - 1]?.offset ?? 0;

  const applyQuery = () => {
    if (status === "loading") {
      return;
    }
    setPageStack(pageStackForPageSizeChange());
    setAppliedQuery(toApiQuery({ nameFilter, stateFilter, sortBy, sortOrder }));
    setQueryGeneration((n) => n + 1);
  };

  const freshReload = () => {
    setPageStack(pageStackForPageSizeChange());
    setQueryGeneration((n) => n + 1);
  };

  return (
    <PeopleViewerView
      status={status}
      items={items}
      totalCount={totalCount}
      uiRevision={uiRevision}
      errorText={errorText}
      errorCode={errorCode}
      pageSize={pageSize}
      rangeText={formatVisibleRange({
        offset: currentOffset,
        itemCount: items.length,
        totalCount,
      })}
      pageNumber={pageStack.length}
      canPrev={pageStack.length > 1 && status !== "loading"}
      canNext={nextCursor !== null && status !== "loading"}
      nameFilter={nameFilter}
      stateFilter={stateFilter}
      sortBy={sortBy}
      sortOrder={sortOrder}
      enablePersonNavigation={props.enablePersonNavigation === true}
      {...(props.personHref !== undefined ? { personHref: props.personHref } : {})}
      onPageSizeChange={(next) => {
        if (next === pageSize || status === "loading") {
          return;
        }
        setPageStack(pageStackForPageSizeChange());
        setPageSize(next);
      }}
      onPrev={() => {
        if (pageStack.length <= 1 || status === "loading") {
          return;
        }
        void runLoad(popPeoplePage(pageStack), pageSize, appliedQuery);
      }}
      onNext={() => {
        if (nextCursor === null || status === "loading") {
          return;
        }
        void runLoad(
          appendPeoplePage(pageStack, { nextCursor, loadedItemCount: items.length }),
          pageSize,
          appliedQuery,
        );
      }}
      onNameFilterChange={setNameFilter}
      onStateFilterChange={setStateFilter}
      onSortByChange={setSortBy}
      onSortOrderChange={setSortOrder}
      onApplyQuery={applyQuery}
      onFreshReload={freshReload}
    />
  );
}
