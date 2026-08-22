import {
  API_SCHEMA_VERSION,
  type ApiError,
  type ApiFailureEnvelope,
  type CommitState,
} from "../shared/ui001-contracts.js";
import { EnvelopeConstructionError, buildFailureEnvelope, serializeEnvelope } from "./envelope.js";

export type MinimalFallbackInput = {
  apiSchemaVersion: typeof API_SCHEMA_VERSION;
  uiRevision: number | null;
  isUpdating: boolean;
  refreshRequired: boolean;
  commitState: CommitState;
  errorReference: string;
  committedWeeks?: number;
  completedUiRevision?: number;
};

export type EnvelopeSerializerHooks = {
  /** FI-019: force normal failure serializer to throw. */
  failNormalFailureSerializer?: boolean;
  /** FI-020: force minimal fallback serializer to throw. */
  failMinimalFallbackSerializer?: boolean;
};

export class MinimalFallbackFatalError extends Error {
  public override readonly name = "MinimalFallbackFatalError";
}

export function serializeMinimalInternalFailure(input: MinimalFallbackInput): string {
  if (typeof input.errorReference !== "string" || input.errorReference.length === 0) {
    throw new EnvelopeConstructionError("fallback errorReference required");
  }
  const error: ApiError = {
    code: "INTERNAL_ERROR",
    message: "内部処理に失敗しました。",
    commitState: input.commitState,
    errorReference: input.errorReference,
  };
  if (input.commitState === "partial" || input.commitState === "complete") {
    if (input.committedWeeks !== undefined) {
      error.committedWeeks = input.committedWeeks;
    }
    if (input.completedUiRevision !== undefined) {
      error.completedUiRevision = input.completedUiRevision;
    }
  }
  const envelope: ApiFailureEnvelope = {
    apiSchemaVersion: input.apiSchemaVersion,
    ok: false,
    error,
    uiRevision: input.uiRevision,
    isUpdating: input.isUpdating,
    refreshRequired: input.refreshRequired,
  };
  return serializeEnvelope(envelope);
}

export function serializeFailureWithFallback(
  input: {
    error: ApiError;
    uiRevision: number | null;
    isUpdating: boolean;
    refreshRequired: boolean;
    fallbackErrorReference: string;
  },
  hooks: EnvelopeSerializerHooks = {},
): { body: string; usedFallback: boolean } {
  try {
    if (hooks.failNormalFailureSerializer === true) {
      throw new EnvelopeConstructionError("injected normal serializer fault");
    }
    const envelope = buildFailureEnvelope({
      error: input.error,
      uiRevision: input.uiRevision,
      isUpdating: input.isUpdating,
      refreshRequired: input.refreshRequired,
    });
    return { body: serializeEnvelope(envelope), usedFallback: false };
  } catch {
    try {
      if (hooks.failMinimalFallbackSerializer === true) {
        throw new MinimalFallbackFatalError("injected minimal fallback fault");
      }
      return {
        body: serializeMinimalInternalFailure({
          apiSchemaVersion: API_SCHEMA_VERSION,
          uiRevision: input.uiRevision,
          isUpdating: input.isUpdating,
          refreshRequired: input.refreshRequired,
          commitState: "none",
          errorReference: input.fallbackErrorReference,
        }),
        usedFallback: true,
      };
    } catch (fallbackError) {
      if (fallbackError instanceof MinimalFallbackFatalError) {
        throw fallbackError;
      }
      throw new MinimalFallbackFatalError(
        fallbackError instanceof Error ? fallbackError.message : "minimal fallback failed",
      );
    }
  }
}
