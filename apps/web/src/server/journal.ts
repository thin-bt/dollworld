import type { RequestJournalRecord } from "./ui-session.js";

export type RequestJournalStore = {
  lookup(requestId: string): RequestJournalRecord | undefined;
  write(record: RequestJournalRecord): void;
  size(): number;
};

export type JournalHooks = {
  onLookup?: (requestId: string) => void;
  onWrite?: (record: RequestJournalRecord) => void;
};

export function createRequestJournalStore(
  journal: Map<string, RequestJournalRecord>,
  hooks: JournalHooks = {},
): RequestJournalStore {
  return {
    lookup(requestId: string): RequestJournalRecord | undefined {
      hooks.onLookup?.(requestId);
      return journal.get(requestId);
    },
    write(record: RequestJournalRecord): void {
      hooks.onWrite?.(record);
      journal.set(record.requestId, record);
    },
    size(): number {
      return journal.size;
    },
  };
}
