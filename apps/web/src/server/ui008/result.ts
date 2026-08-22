/**
 * Shared result type for UI-008 pure modules.
 * HTTP mapping is route-layer only.
 */

export type PureOk<T> = { ok: true; value: T };
export type PureFail = {
  ok: false;
  code: "INTERNAL_ERROR" | "INVALID_REQUEST" | "STALE_CURSOR";
  reason: string;
};
export type PureResult<T> = PureOk<T> | PureFail;

export function ok<T>(value: T): PureOk<T> {
  return { ok: true, value };
}

export function fail(reason: string, code: PureFail["code"] = "INTERNAL_ERROR"): PureFail {
  return { ok: false, code, reason };
}
