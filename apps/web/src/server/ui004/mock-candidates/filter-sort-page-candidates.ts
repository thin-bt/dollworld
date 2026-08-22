/**
 * Mock candidates name filter + personId asc + §10C page (PAGE-002 / FIX-004).
 * Future production owner: UI-004 API-011.
 */

import { compareUnicodeCodePoints } from "@shared-world/simulation-core";
import { matchesPeopleNameFilter } from "../people/filter-people.js";
import { pageExclusiveSlice } from "../shared/page-boundary.js";
import type { CandidatesNextPosition, MockCandidatesQuery, PageResult } from "../types/queries.js";
import { classifyCandidateSource, selectEligibleCandidates } from "./classify-candidate-source.js";
import type { CandidateClassification } from "./classify-candidate-source.js";
import type { MockCandidateEligibleInput } from "./mock-candidate-eligible.js";

export type MockCandidateSourceRow = {
  personId: string;
  displayName: string;
  sourceValidationOk: boolean;
  eligibleInput?: MockCandidateEligibleInput;
};

export type MockCandidateMember = {
  personId: string;
  displayName: string;
  careerStatus: MockCandidateEligibleInput["careerStatus"];
  derivedAgeAtWorldDate: number;
};

function toMember(row: MockCandidateSourceRow): MockCandidateMember {
  return {
    personId: row.personId,
    displayName: row.displayName,
    careerStatus: row.eligibleInput!.careerStatus,
    derivedAgeAtWorldDate: row.eligibleInput!.derivedAgeAtWorldDate,
  };
}

export function buildMockCandidatesPage(
  source: readonly MockCandidateSourceRow[],
  query: MockCandidatesQuery,
  cursorNextPosition: CandidatesNextPosition | null,
):
  | { kind: "page"; page: PageResult<MockCandidateMember, CandidatesNextPosition> }
  | { kind: "corruption" }
  | { kind: "stale_cursor" } {
  const classified = source.map((row) => {
    const classification: CandidateClassification =
      row.sourceValidationOk === true && row.eligibleInput !== undefined
        ? classifyCandidateSource({
            sourceValidationOk: true,
            eligibleInput: row.eligibleInput,
          })
        : classifyCandidateSource({ sourceValidationOk: false });
    return { row, classification };
  });

  const selected = selectEligibleCandidates(classified);
  if (!selected.ok) {
    return { kind: "corruption" };
  }

  const named = selected.eligible
    .map((entry) => entry.row)
    .filter((row) => matchesPeopleNameFilter(row.displayName, query.name))
    .map(toMember);

  const sorted = [...named].sort((a, b) => compareUnicodeCodePoints(a.personId, b.personId));

  let startIndex = 0;
  if (cursorNextPosition !== null) {
    const idx = sorted.findIndex((item) => item.personId === cursorNextPosition.personId);
    if (idx < 0) {
      return { kind: "stale_cursor" };
    }
    startIndex = idx + 1;
  }

  const paged = pageExclusiveSlice({
    sortedFiltered: sorted,
    limit: query.limit,
    startIndex,
  });

  const last = paged.items[paged.items.length - 1];
  return {
    kind: "page",
    page: {
      items: paged.items,
      totalCount: paged.totalCount,
      nextPosition: paged.hasNext && last !== undefined ? { personId: last.personId } : null,
    },
  };
}
