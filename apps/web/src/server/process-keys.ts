import { encodeBase64UrlNoPad, nodeCsprngBytes, type CsprngBytes } from "./csprng.js";

export const CURSOR_HMAC_KEY_BYTE_LENGTH = 32 as const;
export const SESSION_BINDING_KEY_BYTE_LENGTH = 32 as const;

export type ProcessCursorKeys = {
  cursorHmacKey: Uint8Array;
  sessionBindingKey: Uint8Array;
};

export type ProcessSecurityContext = ProcessCursorKeys & {
  serverInstanceId: string;
  errorCounter: number;
};

export class ProcessKeyStartupError extends Error {
  public override readonly name = "ProcessKeyStartupError";
}

function requireKeyMaterial(bytes: Uint8Array, expectedLength: number, label: string): Uint8Array {
  if (bytes.byteLength < expectedLength) {
    throw new ProcessKeyStartupError(`${label} must be at least ${String(expectedLength)} bytes`);
  }
  return bytes.slice();
}

export function generateUuidV4(csprng: CsprngBytes): string {
  const bytes = csprng(16);
  if (bytes.byteLength !== 16) {
    throw new ProcessKeyStartupError("serverInstanceId CSPRNG length invalid");
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function createProcessSecurityContext(
  csprng: CsprngBytes = nodeCsprngBytes,
): ProcessSecurityContext {
  let cursorHmacKey: Uint8Array;
  let sessionBindingKey: Uint8Array;
  let serverInstanceId: string;
  try {
    cursorHmacKey = requireKeyMaterial(
      csprng(CURSOR_HMAC_KEY_BYTE_LENGTH),
      CURSOR_HMAC_KEY_BYTE_LENGTH,
      "cursorHmacKey",
    );
    sessionBindingKey = requireKeyMaterial(
      csprng(SESSION_BINDING_KEY_BYTE_LENGTH),
      SESSION_BINDING_KEY_BYTE_LENGTH,
      "sessionBindingKey",
    );
    serverInstanceId = generateUuidV4(csprng);
  } catch (error) {
    if (error instanceof ProcessKeyStartupError) {
      throw error;
    }
    throw new ProcessKeyStartupError(
      error instanceof Error ? error.message : "process key CSPRNG failure",
    );
  }
  if (Buffer.from(cursorHmacKey).equals(Buffer.from(sessionBindingKey))) {
    throw new ProcessKeyStartupError("cursorHmacKey and sessionBindingKey must be independent");
  }
  if (!UUID_V4_PATTERN.test(serverInstanceId)) {
    throw new ProcessKeyStartupError("serverInstanceId is not a canonical UUID v4");
  }
  return {
    cursorHmacKey,
    sessionBindingKey,
    serverInstanceId,
    errorCounter: 0,
  };
}

/** Test helper: independent fixed keys without sharing CSPRNG script with session creation. */
export function createTestProcessSecurityContext(seed = 1): ProcessSecurityContext {
  return createProcessSecurityContext((n) => {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) {
      out[i] = (seed * 17 + i * 31) & 0xff;
    }
    seed += 1;
    return out;
  });
}

export function allocateServerErrorReference(context: ProcessSecurityContext): string {
  if (context.errorCounter === Number.MAX_SAFE_INTEGER) {
    throw new Error("errorReference counter exhausted");
  }
  context.errorCounter += 1;
  return `server:${context.serverInstanceId}:${String(context.errorCounter)}`;
}

/** Test helper: expose key material as opaque base64url (never used on wire). */
export function describeKeyFingerprint(key: Uint8Array): string {
  return encodeBase64UrlNoPad(key.subarray(0, 8));
}
