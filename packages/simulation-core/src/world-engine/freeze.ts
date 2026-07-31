/**
 * Engine-owned deep freeze. Only objects processed here are trusted by validators.
 * Caller Object.freeze alone never enters the trusted set.
 */
import { WorldEngineError, toWorldEngineError } from "./errors.js";

const trustedDeepFrozen = new WeakSet<object>();

export function isTrustedDeepFrozen(value: object): boolean {
  return trustedDeepFrozen.has(value);
}

export function freezeDeepTrusted<T>(value: T): T {
  try {
    freezeDeepRecursive(value, new WeakSet<object>());
    return value;
  } catch (error) {
    throw toWorldEngineError(error, "failed to freeze world engine state", { field: "state" });
  }
}

function freezeDeepRecursive(value: unknown, visiting: WeakSet<object>): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (trustedDeepFrozen.has(value)) {
    return;
  }
  if (visiting.has(value)) {
    throw new WorldEngineError("circular reference while freezing state", { field: "state" });
  }

  visiting.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        throw new WorldEngineError("Symbol keys are not allowed while freezing state", {
          field: "state",
          detail: String(key),
        });
      }
      if (Array.isArray(value) && key === "length") {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined) {
        continue;
      }
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        throw new WorldEngineError("accessor properties are not allowed while freezing state", {
          field: "state",
          detail: String(key),
        });
      }
      freezeDeepRecursive(descriptor.value, visiting);
    }
  } finally {
    visiting.delete(value);
  }

  if (!Object.isFrozen(value)) {
    Object.freeze(value);
  }
  trustedDeepFrozen.add(value);
}
