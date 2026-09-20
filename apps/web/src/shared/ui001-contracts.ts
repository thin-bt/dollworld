export const API_SCHEMA_VERSION = "0.2.0" as const;
export const API_PREFIX = "/api/s1_5" as const;
export const DEFAULT_LISTEN_HOST = "127.0.0.1" as const;
export const DEFAULT_LISTEN_PORT = 8787 as const;
export const RAW_BODY_LIMIT_BYTES = 65536 as const;
export const REQUEST_TARGET_LIMIT_BYTES = 8192 as const;

export const MENU_ITEMS = [
  "シミュレーション",
  "人物",
  "模擬戦",
  "大会",
  "ランキング",
  "イベント",
] as const;
export type MenuItem = (typeof MENU_ITEMS)[number];

export const SESSION_DISPLAY_STATES = ["empty", "ready", "updating"] as const;
export type SessionDisplayState = (typeof SESSION_DISPLAY_STATES)[number];

export type StableErrorCode =
  | "INVALID_REQUEST"
  | "SESSION_REQUIRED"
  | "REQUEST_FORBIDDEN"
  | "NOT_FOUND"
  | "SIMULATION_NOT_STARTED"
  | "UPDATE_IN_PROGRESS"
  | "STALE_UI_REVISION"
  | "STALE_CURSOR"
  | "REQUEST_ID_CONFLICT"
  | "DOMAIN_VALIDATION_FAILED"
  | "BATTLE_PRE_START_FAILURE"
  | "INTERNAL_ERROR";

export type CommitState = "none" | "partial" | "complete";

export type FieldErrorView = {
  field: string;
  code: string;
  message: string;
};

export type ApiError = {
  code: StableErrorCode;
  message: string;
  commitState: CommitState;
  fieldErrors?: FieldErrorView[];
  validation?: ReadonlyArray<Record<string, unknown>>;
  committedWeeks?: number;
  completedUiRevision?: number;
  errorReference?: string;
};

export type ApiSuccessEnvelope<T> = {
  apiSchemaVersion: typeof API_SCHEMA_VERSION;
  ok: true;
  data: T;
  uiRevision: number;
  isUpdating: boolean;
};

export type ApiFailureEnvelope = {
  apiSchemaVersion: typeof API_SCHEMA_VERSION;
  ok: false;
  error: ApiError;
  uiRevision: number | null;
  isUpdating: boolean;
  refreshRequired: boolean;
};

export function defaultPublicOrigin(
  host: string = DEFAULT_LISTEN_HOST,
  port: number = DEFAULT_LISTEN_PORT,
): string {
  return `http://${host}:${port}`;
}

export function authorityFromOrigin(origin: string): string {
  const url = new URL(origin);
  return url.host;
}
