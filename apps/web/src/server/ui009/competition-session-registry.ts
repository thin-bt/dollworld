/** Session-id keyed Sprint2 competition store (isolated from UiSession snapshot shape). */
import {
  cloneCompetitionStore,
  createEmptyCompetitionStore,
  type CompetitionSessionStore,
} from "./competition-store.js";

const stores = new Map<string, CompetitionSessionStore>();

export function getCompetitionStore(sessionId: string): CompetitionSessionStore {
  const existing = stores.get(sessionId);
  if (existing !== undefined) {
    return cloneCompetitionStore(existing);
  }
  return createEmptyCompetitionStore();
}

export function setCompetitionStore(sessionId: string, store: CompetitionSessionStore): void {
  stores.set(sessionId, cloneCompetitionStore(store));
}

export function resetCompetitionStore(sessionId: string): void {
  stores.set(sessionId, createEmptyCompetitionStore());
}

/** Test-only: drop registry row. */
export function deleteCompetitionStore(sessionId: string): void {
  stores.delete(sessionId);
}
