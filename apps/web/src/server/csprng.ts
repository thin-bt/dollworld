import { randomBytes, timingSafeEqual } from "node:crypto";

export type CsprngBytes = (byteLength: number) => Uint8Array;

export function nodeCsprngBytes(byteLength: number): Uint8Array {
  if (!Number.isInteger(byteLength) || byteLength < 1) {
    throw new Error("CSPRNG byteLength must be a positive integer");
  }
  return new Uint8Array(randomBytes(byteLength));
}

export const SESSION_TOKEN_BYTE_LENGTH = 32 as const;
export const SESSION_TOKEN_ASCII_LENGTH = 43 as const;

export function encodeBase64UrlNoPad(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function decodeBase64UrlNoPad(text: string): Uint8Array | undefined {
  if (text.length === 0 || text.includes("=") || !/^[A-Za-z0-9_-]+$/.test(text)) {
    return undefined;
  }
  try {
    const decoded = Buffer.from(text, "base64url");
    if (encodeBase64UrlNoPad(decoded) !== text) {
      return undefined;
    }
    return new Uint8Array(decoded);
  } catch {
    return undefined;
  }
}

export function generateSessionTokenAscii(csprng: CsprngBytes): string {
  const bytes = csprng(SESSION_TOKEN_BYTE_LENGTH);
  if (bytes.byteLength !== SESSION_TOKEN_BYTE_LENGTH) {
    throw new Error("CSPRNG returned unexpected length");
  }
  const encoded = encodeBase64UrlNoPad(bytes);
  if (encoded.length !== SESSION_TOKEN_ASCII_LENGTH) {
    throw new Error("session token encoding length invalid");
  }
  return encoded;
}

export function isCanonicalSessionTokenAscii(value: string): boolean {
  if (value.length !== SESSION_TOKEN_ASCII_LENGTH) {
    return false;
  }
  const decoded = decodeBase64UrlNoPad(value);
  return decoded !== undefined && decoded.byteLength === SESSION_TOKEN_BYTE_LENGTH;
}

export function constantTimeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  return timingSafeEqual(a, b);
}
