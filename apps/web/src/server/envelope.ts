import {
  API_SCHEMA_VERSION,
  type ApiError,
  type ApiFailureEnvelope,
  type ApiSuccessEnvelope,
  type CommitState,
  type FieldErrorView,
  type StableErrorCode,
} from "../shared/ui001-contracts.js";

export class EnvelopeConstructionError extends Error {
  public override readonly name = "EnvelopeConstructionError";
}

const SUCCESS_KEYS = ["apiSchemaVersion", "ok", "data", "uiRevision", "isUpdating"] as const;
const FAILURE_KEYS = [
  "apiSchemaVersion",
  "ok",
  "error",
  "uiRevision",
  "isUpdating",
  "refreshRequired",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function assertFiniteNonNegativeInteger(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    !Number.isSafeInteger(value)
  ) {
    throw new EnvelopeConstructionError(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function assertJsonValue(value: unknown, label: string): unknown {
  if (value === undefined) {
    throw new EnvelopeConstructionError(`${label} is undefined`);
  }
  if (typeof value === "function") {
    throw new EnvelopeConstructionError(`${label} is a function`);
  }
  if (typeof value === "bigint") {
    throw new EnvelopeConstructionError(`${label} is bigint`);
  }
  if (typeof value === "symbol") {
    throw new EnvelopeConstructionError(`${label} is symbol`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new EnvelopeConstructionError(`${label} is non-finite`);
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => assertJsonValue(item, `${label}[${index}]`));
  }
  if (!isPlainObject(value)) {
    throw new EnvelopeConstructionError(`${label} is not plain JSON`);
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && (descriptor.get !== undefined || descriptor.set !== undefined)) {
      throw new EnvelopeConstructionError(`${label}.${key} is an accessor`);
    }
    out[key] = assertJsonValue(value[key], `${label}.${key}`);
  }
  return out;
}

const STABLE_CODES: ReadonlySet<StableErrorCode> = new Set([
  "INVALID_REQUEST",
  "SESSION_REQUIRED",
  "REQUEST_FORBIDDEN",
  "NOT_FOUND",
  "SIMULATION_NOT_STARTED",
  "UPDATE_IN_PROGRESS",
  "STALE_UI_REVISION",
  "STALE_CURSOR",
  "REQUEST_ID_CONFLICT",
  "DOMAIN_VALIDATION_FAILED",
  "BATTLE_PRE_START_FAILURE",
  "INTERNAL_ERROR",
]);

const COMMIT_STATES: ReadonlySet<CommitState> = new Set(["none", "partial", "complete"]);

function serializeApiError(error: ApiError): ApiError {
  const keys = Object.keys(error);
  for (const key of keys) {
    if (
      key !== "code" &&
      key !== "message" &&
      key !== "commitState" &&
      key !== "fieldErrors" &&
      key !== "validation" &&
      key !== "committedWeeks" &&
      key !== "completedUiRevision" &&
      key !== "errorReference"
    ) {
      throw new EnvelopeConstructionError(`ApiError unknown key ${key}`);
    }
  }
  if (!STABLE_CODES.has(error.code)) {
    throw new EnvelopeConstructionError("ApiError.code is invalid");
  }
  if (typeof error.message !== "string" || error.message.length === 0) {
    throw new EnvelopeConstructionError("ApiError.message is empty");
  }
  if (!COMMIT_STATES.has(error.commitState)) {
    throw new EnvelopeConstructionError("ApiError.commitState is invalid");
  }
  const built: ApiError = {
    code: error.code,
    message: error.message,
    commitState: error.commitState,
  };
  if (error.fieldErrors !== undefined) {
    if (error.code !== "INVALID_REQUEST") {
      throw new EnvelopeConstructionError("fieldErrors forbidden for this code");
    }
    if (!Array.isArray(error.fieldErrors) || error.fieldErrors.length === 0) {
      throw new EnvelopeConstructionError("fieldErrors must be a non-empty array when present");
    }
    built.fieldErrors = error.fieldErrors.map((item, index) => {
      if (!isPlainObject(item)) {
        throw new EnvelopeConstructionError(`fieldErrors[${index}] is not a plain object`);
      }
      const fieldKeys = Object.keys(item);
      if (
        fieldKeys.length !== 3 ||
        !("field" in item) ||
        !("code" in item) ||
        !("message" in item)
      ) {
        throw new EnvelopeConstructionError(`fieldErrors[${index}] key set invalid`);
      }
      const view = item as FieldErrorView;
      if (
        typeof view.field !== "string" ||
        typeof view.code !== "string" ||
        typeof view.message !== "string"
      ) {
        throw new EnvelopeConstructionError(`fieldErrors[${index}] types invalid`);
      }
      if (view.message.length === 0) {
        throw new EnvelopeConstructionError(`fieldErrors[${index}].message empty`);
      }
      return { field: view.field, code: view.code, message: view.message };
    });
  }
  if (error.validation !== undefined) {
    if (error.code !== "DOMAIN_VALIDATION_FAILED" && error.code !== "BATTLE_PRE_START_FAILURE") {
      throw new EnvelopeConstructionError("validation forbidden for this code");
    }
    built.validation = assertJsonValue(error.validation, "error.validation") as Array<
      Record<string, unknown>
    >;
  }
  if (error.committedWeeks !== undefined) {
    if (error.commitState !== "partial" && error.commitState !== "complete") {
      throw new EnvelopeConstructionError("committedWeeks forbidden unless partial|complete");
    }
    built.committedWeeks = assertFiniteNonNegativeInteger(error.committedWeeks, "committedWeeks");
  }
  if (error.completedUiRevision !== undefined) {
    if (error.commitState !== "partial" && error.commitState !== "complete") {
      throw new EnvelopeConstructionError("completedUiRevision forbidden unless partial|complete");
    }
    built.completedUiRevision = assertFiniteNonNegativeInteger(
      error.completedUiRevision,
      "completedUiRevision",
    );
  }
  if (error.errorReference !== undefined) {
    if (error.code !== "INTERNAL_ERROR") {
      throw new EnvelopeConstructionError("errorReference forbidden unless INTERNAL_ERROR");
    }
    if (typeof error.errorReference !== "string" || error.errorReference.length === 0) {
      throw new EnvelopeConstructionError("errorReference empty");
    }
    built.errorReference = error.errorReference;
  } else if (error.code === "INTERNAL_ERROR") {
    throw new EnvelopeConstructionError("errorReference required for INTERNAL_ERROR");
  }
  return built;
}

export function buildSuccessEnvelope<T>(input: {
  data: T;
  uiRevision: number;
  isUpdating: boolean;
}): ApiSuccessEnvelope<T> {
  const extra = Object.keys(input).filter(
    (k) => k !== "data" && k !== "uiRevision" && k !== "isUpdating",
  );
  if (extra.length > 0) {
    throw new EnvelopeConstructionError("success input has unknown keys");
  }
  const envelope: ApiSuccessEnvelope<T> = {
    apiSchemaVersion: API_SCHEMA_VERSION,
    ok: true,
    data: assertJsonValue(input.data, "data") as T,
    uiRevision: assertFiniteNonNegativeInteger(input.uiRevision, "uiRevision"),
    isUpdating:
      input.isUpdating === true || input.isUpdating === false
        ? input.isUpdating
        : (() => {
            throw new EnvelopeConstructionError("isUpdating must be boolean");
          })(),
  };
  if (Object.keys(envelope).length !== SUCCESS_KEYS.length) {
    throw new EnvelopeConstructionError("success envelope key count");
  }
  return envelope;
}

export function buildFailureEnvelope(input: {
  error: ApiError;
  uiRevision: number | null;
  isUpdating: boolean;
  refreshRequired: boolean;
}): ApiFailureEnvelope {
  if (input.uiRevision !== null) {
    assertFiniteNonNegativeInteger(input.uiRevision, "uiRevision");
  }
  if (input.isUpdating !== true && input.isUpdating !== false) {
    throw new EnvelopeConstructionError("isUpdating must be boolean");
  }
  if (input.refreshRequired !== true && input.refreshRequired !== false) {
    throw new EnvelopeConstructionError("refreshRequired must be boolean");
  }
  const envelope: ApiFailureEnvelope = {
    apiSchemaVersion: API_SCHEMA_VERSION,
    ok: false,
    error: serializeApiError(input.error),
    uiRevision: input.uiRevision,
    isUpdating: input.isUpdating,
    refreshRequired: input.refreshRequired,
  };
  if (Object.keys(envelope).length !== FAILURE_KEYS.length) {
    throw new EnvelopeConstructionError("failure envelope key count");
  }
  return envelope;
}

export function serializeEnvelope(value: ApiSuccessEnvelope<unknown> | ApiFailureEnvelope): string {
  return JSON.stringify(value);
}

const FALLBACK_ERROR_REFERENCE = "server:fallback:0";

export function minimalInternalFailure(
  errorReference: string = FALLBACK_ERROR_REFERENCE,
): ApiFailureEnvelope {
  return {
    apiSchemaVersion: API_SCHEMA_VERSION,
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "内部処理に失敗しました。",
      commitState: "none",
      errorReference,
    },
    uiRevision: null,
    isUpdating: false,
    refreshRequired: false,
  };
}

export class MinimalFallbackFatalError extends Error {
  public override readonly name = "MinimalFallbackFatalError";
}

export function serializeFailureOrFallback(input: {
  error: ApiError;
  uiRevision: number | null;
  isUpdating: boolean;
  refreshRequired: boolean;
  /** Optional FI-019/020 hooks and fallback reference. */
  fallbackErrorReference?: string;
  failNormal?: boolean;
  failMinimal?: boolean;
}): { body: string; usedFallback: boolean } {
  try {
    if (input.failNormal === true) {
      throw new EnvelopeConstructionError("injected normal serializer fault");
    }
    const envelope = buildFailureEnvelope(input);
    return { body: serializeEnvelope(envelope), usedFallback: false };
  } catch {
    try {
      if (input.failMinimal === true) {
        throw new MinimalFallbackFatalError("injected minimal fallback fault");
      }
      const reference = input.fallbackErrorReference ?? FALLBACK_ERROR_REFERENCE;
      return {
        body: serializeEnvelope(minimalInternalFailure(reference)),
        usedFallback: true,
      };
    } catch (error) {
      if (error instanceof MinimalFallbackFatalError) {
        throw error;
      }
      throw new MinimalFallbackFatalError(
        error instanceof Error ? error.message : "minimal fallback failed",
      );
    }
  }
}

export function requestForbiddenEnvelope(input: {
  uiRevision: number | null;
  isUpdating: boolean;
}): ApiFailureEnvelope {
  return buildFailureEnvelope({
    error: {
      code: "REQUEST_FORBIDDEN",
      message: "request origin or host is not allowed",
      commitState: "none",
    },
    uiRevision: input.uiRevision,
    isUpdating: input.isUpdating,
    refreshRequired: false,
  });
}

export function invalidRequestEnvelope(input: {
  uiRevision: number | null;
  isUpdating: boolean;
  message: string;
}): ApiFailureEnvelope {
  return buildFailureEnvelope({
    error: {
      code: "INVALID_REQUEST",
      message: input.message,
      commitState: "none",
    },
    uiRevision: input.uiRevision,
    isUpdating: input.isUpdating,
    refreshRequired: false,
  });
}
