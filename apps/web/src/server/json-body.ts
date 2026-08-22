import { RAW_BODY_LIMIT_BYTES } from "../shared/ui001-contracts.js";

export type JsonBodyResult =
  { ok: true; value: unknown } | { ok: false; reason: "content_type" | "size" | "utf8" | "json" };

const ALLOWED_CONTENT_TYPES = new Set(["application/json", "application/json; charset=utf-8"]);

export function normalizeContentType(header: string | undefined): string | undefined {
  if (header === undefined) {
    return undefined;
  }
  return header.trim().toLowerCase();
}

export function isAllowedJsonContentType(header: string | undefined): boolean {
  const normalized = normalizeContentType(header);
  if (normalized === undefined) {
    return false;
  }
  return ALLOWED_CONTENT_TYPES.has(normalized);
}

export function parseJsonBody(raw: Buffer, contentType: string | undefined): JsonBodyResult {
  if (!isAllowedJsonContentType(contentType)) {
    return { ok: false, reason: "content_type" };
  }
  if (raw.byteLength > RAW_BODY_LIMIT_BYTES) {
    return { ok: false, reason: "size" };
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return { ok: false, reason: "utf8" };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "json" };
  }
}
