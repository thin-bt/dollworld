import { describe, expect, it } from "vitest";
import {
  buildSuccessEnvelope,
  EnvelopeConstructionError,
  serializeFailureOrFallback,
} from "./envelope.js";

describe("common success/failure envelope", () => {
  it("FI-004 rejects unknown keys, undefined, and accessors before serialize", () => {
    expect(() =>
      buildSuccessEnvelope({
        data: { ok: true, extra: 1, unknown: true },
        uiRevision: 0,
        isUpdating: false,
      }),
    ).not.toThrow();

    expect(() =>
      buildSuccessEnvelope({
        data: { value: undefined as unknown as string },
        uiRevision: 0,
        isUpdating: false,
      }),
    ).toThrow(EnvelopeConstructionError);

    const accessorDto = {};
    Object.defineProperty(accessorDto, "hidden", {
      get() {
        return 1;
      },
      enumerable: true,
    });
    expect(() =>
      buildSuccessEnvelope({
        data: accessorDto,
        uiRevision: 0,
        isUpdating: false,
      }),
    ).toThrow(EnvelopeConstructionError);

    expect(() =>
      buildSuccessEnvelope({
        data: { n: 1 },
        uiRevision: 0,
        isUpdating: false,
        leaked: true,
      } as unknown as { data: { n: number }; uiRevision: number; isUpdating: boolean }),
    ).toThrow(EnvelopeConstructionError);
  });

  it("FI-005 uses a minimal INTERNAL_ERROR fallback and does not recurse", () => {
    const result = serializeFailureOrFallback({
      error: {
        code: "REQUEST_FORBIDDEN",
        message: "",
        commitState: "none",
        unexpected: true,
      } as never,
      uiRevision: null,
      isUpdating: false,
      refreshRequired: false,
    });
    expect(result.usedFallback).toBe(true);
    const body = JSON.parse(result.body) as {
      ok: boolean;
      error: { code: string; errorReference: string; commitState: string; message: string };
      uiRevision: null;
      isUpdating: boolean;
      refreshRequired: boolean;
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.commitState).toBe("none");
    expect(body.error.errorReference).toBe("server:fallback:0");
    expect(body.error.message).toBe("内部処理に失敗しました。");
    expect(body.uiRevision).toBe(null);
    expect(body.isUpdating).toBe(false);
    expect(body.refreshRequired).toBe(false);
    expect(Object.keys(body)).toEqual([
      "apiSchemaVersion",
      "ok",
      "error",
      "uiRevision",
      "isUpdating",
      "refreshRequired",
    ]);
  });
});
