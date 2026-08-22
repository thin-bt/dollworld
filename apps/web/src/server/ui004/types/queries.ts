/**
 * UI-004 prebuild — query shapes mirroring SPEC CanonicalGetQuery people/mock_candidates.
 * Future production owner: UI-004 (API-007 / API-011).
 * Does NOT include cursor HMAC / signing codec (UI-002).
 */

export const PERSON_STATE_FILTERS = [
  "life:living",
  "life:deceased",
  "participation:waiting",
  "participation:active",
  "participation:stopped",
  "career:child",
  "career:trainee",
  "career:active_competitor",
  "career:retired",
] as const;

export type PersonStateFilter = (typeof PERSON_STATE_FILTERS)[number];

export const PEOPLE_SORT_KEYS = [
  "personId",
  "stamina",
  "strength",
  "skill",
  "speed",
  "spirit",
  "magic",
  "unarmed",
  "sword",
  "magicAptitude",
] as const;

export type PeopleSortKey = (typeof PEOPLE_SORT_KEYS)[number];

export type PageLimit = 50 | 100 | 200;

export type PeopleQuery = {
  kind: "people";
  name: string | null;
  state: PersonStateFilter | null;
  sortKey: PeopleSortKey;
  sortOrder: "asc" | "desc";
  limit: PageLimit;
};

export type MockCandidatesQuery = {
  kind: "mock_candidates";
  name: string | null;
  sortKey: "personId";
  sortOrder: "asc";
  limit: PageLimit;
};

export type PeopleNextPosition = { personId: string } | { value: number; personId: string };

export type CandidatesNextPosition = { personId: string };

export type PageResult<TItem, TPosition> = {
  items: readonly TItem[];
  totalCount: number;
  /** Unsigned exclusive next position; signing is UI-002 / route layer. */
  nextPosition: TPosition | null;
};
