/**
 * Shared result type for UI-005 pure modules.
 * Future owner: UI-005. HTTP mapping is route-layer only.
 */

export type PureOk<T> = { ok: true; value: T };
export type PureFail = { ok: false; code: "INTERNAL_ERROR"; reason: string };
export type PureResult<T> = PureOk<T> | PureFail;

export function ok<T>(value: T): PureOk<T> {
  return { ok: true, value };
}

export function fail(reason: string): PureFail {
  return { ok: false, code: "INTERNAL_ERROR", reason };
}
