/**
 * DEV-VIEWER-002 People paging state helpers.
 *
 * The accepted UI-004 `GET /people` contract restricts `limit` to 50 | 100 | 200
 * (SPEC 7.1 §"limitは50／100／200のいずれか" + server parse-query.ts parseLimit).
 * Smaller viewer-local page sizes are therefore not implementable without a
 * server contract change, and client-side slicing of a full page is forbidden.
 */

export const PEOPLE_PAGE_SIZES = [50, 100, 200] as const;
export type PeoplePageSize = (typeof PEOPLE_PAGE_SIZES)[number];
export const PEOPLE_PAGE_SIZE_DEFAULT: PeoplePageSize = 50;

/** Page sizes requested by DEV-VIEWER-002 that the accepted contract rejects. */
export const PEOPLE_PAGE_SIZES_BLOCKED = [5, 10, 25] as const;

export const PEOPLE_PAGE_SIZE_BLOCKED_REASON =
  "BLOCKED: page size 5 / 10 / 25 is not implementable. " +
  "Accepted UI-004 GET /people limit enum is 50 | 100 | 200 only " +
  "(SPEC 7.1 + server parse-query.ts parseLimit). " +
  "Client-side slicing of a server page is forbidden, and no API contract change is allowed.";

/** One entry of the server cursor stack plus the item offset it starts at. */
export type PeoplePageEntry = {
  cursor: string | null;
  offset: number;
};

export function initialPeoplePageStack(): PeoplePageEntry[] {
  return [{ cursor: null, offset: 0 }];
}

/**
 * A cursor encodes the effective query it was created with, so a page-size
 * change invalidates every held cursor (server answers 409 STALE_CURSOR).
 * Paging therefore restarts from the first server page.
 */
export function pageStackForPageSizeChange(): PeoplePageEntry[] {
  return initialPeoplePageStack();
}

export function appendPeoplePage(
  stack: readonly PeoplePageEntry[],
  input: { nextCursor: string; loadedItemCount: number },
): PeoplePageEntry[] {
  const current = stack[stack.length - 1];
  const offset = (current?.offset ?? 0) + input.loadedItemCount;
  return [...stack, { cursor: input.nextCursor, offset }];
}

export function popPeoplePage(stack: readonly PeoplePageEntry[]): PeoplePageEntry[] {
  return stack.length <= 1 ? initialPeoplePageStack() : stack.slice(0, -1);
}

/** 1-based inclusive visible range for ordinary UI, e.g. `1–15 / 全15`. */
export function formatVisibleRange(input: {
  offset: number;
  itemCount: number;
  totalCount: number;
}): string {
  if (input.itemCount === 0) {
    return `表示なし / 全${String(input.totalCount)}`;
  }
  const from = input.offset + 1;
  const to = input.offset + input.itemCount;
  return `${String(from)}–${String(to)} / 全${String(input.totalCount)}`;
}

export function isPeoplePageSize(value: number): value is PeoplePageSize {
  return (PEOPLE_PAGE_SIZES as readonly number[]).includes(value);
}
