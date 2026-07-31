import type { WorldDate } from "../world-date.js";

export type WorldEngineErrorContext = {
  processorId?: string;
  absoluteWeek?: number;
  worldDate?: WorldDate;
  startSequence?: number;
  weeks?: number;
  years?: number;
  field?: string;
  detail?: string;
  index?: number;
};

export class WorldEngineError extends Error {
  readonly context: WorldEngineErrorContext;
  readonly baseMessage: string;

  constructor(message: string, context: WorldEngineErrorContext = {}) {
    const detail = formatContext(context);
    super(detail.length > 0 ? `${message} (${detail})` : message);
    this.name = "WorldEngineError";
    this.context = context;
    this.baseMessage = message;
  }
}

export function toWorldEngineError(
  error: unknown,
  message: string,
  context: WorldEngineErrorContext = {},
): WorldEngineError {
  if (error instanceof WorldEngineError) {
    return new WorldEngineError(error.baseMessage, {
      ...context,
      ...error.context,
    });
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new WorldEngineError(message, {
    ...context,
    detail,
  });
}

function formatContext(context: WorldEngineErrorContext): string {
  const parts: string[] = [];
  if (context.processorId !== undefined) {
    parts.push(`processorId=${context.processorId}`);
  }
  if (context.absoluteWeek !== undefined) {
    parts.push(`absoluteWeek=${String(context.absoluteWeek)}`);
  }
  if (context.worldDate !== undefined) {
    const d = context.worldDate;
    parts.push(
      `worldDate=${String(d.year)}-${String(d.month)}-W${String(d.weekOfMonth)}@${String(d.absoluteWeek)}`,
    );
  }
  if (context.startSequence !== undefined) {
    parts.push(`startSequence=${String(context.startSequence)}`);
  }
  if (context.weeks !== undefined) {
    parts.push(`weeks=${String(context.weeks)}`);
  }
  if (context.years !== undefined) {
    parts.push(`years=${String(context.years)}`);
  }
  if (context.index !== undefined) {
    parts.push(`index=${String(context.index)}`);
  }
  if (context.field !== undefined) {
    parts.push(`field=${context.field}`);
  }
  if (context.detail !== undefined) {
    parts.push(`detail=${context.detail}`);
  }
  return parts.join(", ");
}
