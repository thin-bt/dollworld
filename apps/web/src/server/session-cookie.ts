import { createHmac, timingSafeEqual } from "node:crypto";
import {
  decodeBase64UrlNoPad,
  generateSessionTokenAscii,
  isCanonicalSessionTokenAscii,
  type CsprngBytes,
} from "./csprng.js";

export const CSRF_HEADER_NAME = "x-dollworld-csrf" as const;
export const SESSION_COOKIE_NAME = "dollworld_s15_session" as const;
export const SESSION_COOKIE_PATH = "/api/s1_5" as const;
export const SESSION_ID_GENERATION_MAX_ATTEMPTS = 3 as const;

export function buildSessionSetCookieHeader(input: { sessionId: string; secure: boolean }): string {
  if (!isCanonicalSessionTokenAscii(input.sessionId)) {
    throw new Error("Set-Cookie sessionId is not canonical");
  }
  const parts = [
    `${SESSION_COOKIE_NAME}=${input.sessionId}`,
    `Path=${SESSION_COOKIE_PATH}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (input.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function parseSessionCookieHeader(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined || cookieHeader.length === 0) {
    return undefined;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const name = trimmed.slice(0, eq);
    if (name !== SESSION_COOKIE_NAME) {
      continue;
    }
    const value = trimmed.slice(eq + 1);
    if (!isCanonicalSessionTokenAscii(value)) {
      return undefined;
    }
    return value;
  }
  return undefined;
}

export function computeSessionBindingHash(
  sessionBindingKey: Uint8Array,
  sessionCookieAscii: string,
): string {
  const digest = createHmac("sha256", Buffer.from(sessionBindingKey))
    .update(sessionCookieAscii, "utf8")
    .digest("hex");
  if (digest.length !== 64) {
    throw new Error("sessionBindingHash length invalid");
  }
  return digest;
}

export function csrfTokensEqual(expectedAscii: string, providedAscii: string): boolean {
  const expected = decodeBase64UrlNoPad(expectedAscii);
  const provided = decodeBase64UrlNoPad(providedAscii);
  if (expected === undefined || provided === undefined) {
    return false;
  }
  if (expected.byteLength !== provided.byteLength) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}

export type UniqueSessionIdResult =
  | { ok: true; sessionId: string; attempts: number; csprngCalls: number }
  | {
      ok: false;
      reason: "collision_exhausted" | "csprng_failure";
      attempts: number;
      csprngCalls: number;
      error?: unknown;
    };

export function generateUniqueSessionId(input: {
  csprng: CsprngBytes;
  hasSessionId: (candidate: string) => boolean;
  generateToken?: (csprng: CsprngBytes) => string;
}): UniqueSessionIdResult {
  const generateToken = input.generateToken ?? generateSessionTokenAscii;
  let csprngCalls = 0;
  let attempts = 0;
  try {
    while (attempts < SESSION_ID_GENERATION_MAX_ATTEMPTS) {
      attempts += 1;
      const wrapped: CsprngBytes = (n) => {
        csprngCalls += 1;
        return input.csprng(n);
      };
      const candidate = generateToken(wrapped);
      if (!input.hasSessionId(candidate)) {
        return { ok: true, sessionId: candidate, attempts, csprngCalls };
      }
    }
    return { ok: false, reason: "collision_exhausted", attempts, csprngCalls };
  } catch (error) {
    return { ok: false, reason: "csprng_failure", attempts, csprngCalls, error };
  }
}

export function generateCsrfTokenAscii(csprng: CsprngBytes): string {
  return generateSessionTokenAscii(csprng);
}
