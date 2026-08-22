/**
 * Client mirrors of UI-008 EventEnvelope exact11 + ValidationResultViewItem exact5.
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

export type EventListItemView = {
  schemaVersion: string;
  eventId: string;
  simulationId: string;
  sequence: number;
  eventType: string;
  importance: unknown;
  worldDate: unknown;
  origin: unknown;
  sourceProcessor: string;
  entities: { personIds?: unknown; [key: string]: unknown };
  payload: unknown;
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
  result: unknown;
};

export type EventsListQuery = {
  personId?: string | null;
  eventGroup?: "training" | "technique_learning" | null;
  eventType?: string | null;
  year?: number | null;
  month?: number | null;
  week?: number | null;
};

export type ValidationListQuery = {
  status?: "success" | "failure" | null;
};
