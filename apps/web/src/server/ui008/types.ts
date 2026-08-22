/**
 * UI-008 events / validation query and view shapes (§10–10G).
 */

export const EVENT_ENVELOPE_TOP_LEVEL_KEYS = [
  "schemaVersion",
  "eventId",
  "simulationId",
  "sequence",
  "eventType",
  "importance",
  "worldDate",
  "origin",
  "sourceProcessor",
  "entities",
  "payload",
] as const;

export const VALIDATION_ISSUE_VIEW_KEYS = ["path", "message"] as const;
export const VALIDATION_RESULT_VIEW_ITEM_KEYS = [
  "validationOccurrence",
  "status",
  "issueCount",
  "issues",
  "result",
] as const;
export const PAGED_LIST_DATA_KEYS = ["items", "totalCount", "nextCursor"] as const;

export type PageLimit = 100 | 200;
export type EventGroup = "training" | "technique_learning";

export type EventsQuery = {
  kind: "events";
  year: number | null;
  month: number | null;
  week: number | null;
  personId: string | null;
  eventType: string | null;
  eventGroup: EventGroup | null;
  sortKey: "sequence";
  sortOrder: "desc";
  limit: PageLimit;
};

export type ValidationQuery = {
  kind: "validation";
  status: "success" | "failure" | null;
  sortKey: "validationOccurrence";
  sortOrder: "asc";
  limit: PageLimit;
};

export type EventsNextPosition = { sequence: number };
export type ValidationNextPosition = { validationOccurrence: number };

export type EventListItemView = {
  schemaVersion: string;
  eventId: string;
  simulationId: string;
  sequence: number;
  eventType: string;
  importance: unknown;
  worldDate: { year: number; month: number; weekOfMonth: number };
  origin: unknown;
  sourceProcessor: string;
  entities: { personIds: readonly string[]; [key: string]: unknown };
  payload: Record<string, unknown>;
};

export type ValidationIssueView = {
  path: string;
  message: string;
};

export type ValidationResultViewItem = {
  validationOccurrence: number;
  status: "success" | "failure";
  issueCount: number;
  issues: ValidationIssueView[];
  result: Record<string, unknown>;
};

export type PagedListDataView = {
  items: unknown[];
  totalCount: number;
  nextCursor: string | null;
};
