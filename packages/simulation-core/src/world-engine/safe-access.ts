/**
 * Safe property reads that convert getter failures into WorldEngineError.
 * Prefer descriptor-based reads so accessors are never evaluated.
 */
import { WorldEngineError, toWorldEngineError, type WorldEngineErrorContext } from "./errors.js";

export function assertPlainObjectInput(
  input: unknown,
  field = "input",
): asserts input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new WorldEngineError(`${field} must be a plain object`, { field });
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new WorldEngineError(`${field} must be a plain object`, { field });
  }
}

/**
 * Read an own enumerable data property without evaluating accessors.
 */
export function readEnumerableDataProperty(
  source: object,
  field: string,
  context: WorldEngineErrorContext = {},
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, field);
  if (descriptor === undefined) {
    throw new WorldEngineError(`${context.field ?? field} is required`, {
      ...context,
      field: context.field ?? field,
    });
  }
  if (descriptor.get !== undefined || descriptor.set !== undefined) {
    throw new WorldEngineError(
      `${context.field ?? field} must be a data property (accessor forbidden)`,
      {
        ...context,
        field: context.field ?? field,
      },
    );
  }
  if (descriptor.enumerable !== true) {
    throw new WorldEngineError(`${context.field ?? field} must be enumerable`, {
      ...context,
      field: context.field ?? field,
    });
  }
  return descriptor.value;
}

export function readOptionalEnumerableDataProperty(
  source: object,
  field: string,
  context: WorldEngineErrorContext = {},
): unknown {
  if (!Object.prototype.hasOwnProperty.call(source, field)) {
    return undefined;
  }
  return readEnumerableDataProperty(source, field, context);
}

/** @deprecated Prefer readEnumerableDataProperty to avoid evaluating getters. */
export function readField(
  source: object,
  field: string,
  context: WorldEngineErrorContext = {},
): unknown {
  try {
    return readEnumerableDataProperty(source, field, context);
  } catch (error) {
    throw toWorldEngineError(error, `failed to read ${field}`, {
      ...context,
      field: context.field ?? field,
    });
  }
}
