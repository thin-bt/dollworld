/**
 * eventGroup classification / filter (§10B / ACC-115 / FIX-051).
 */

import { fail, ok, type PureResult } from "../result.js";
import type { EventGroup } from "../types.js";

const TECHNIQUE_LEARNING_TYPES = new Set(["technique.learning_progressed", "technique.acquired"]);

export function eventInGroup(eventType: string, group: EventGroup): boolean {
  if (group === "training") {
    return eventType.startsWith("training.");
  }
  return TECHNIQUE_LEARNING_TYPES.has(eventType);
}

export function classifyEventGroup(eventType: string): EventGroup | null {
  if (eventType.startsWith("training.")) {
    return "training";
  }
  if (TECHNIQUE_LEARNING_TYPES.has(eventType)) {
    return "technique_learning";
  }
  return null;
}

export function rejectEventTypeAndGroupConflict(
  eventType: string | null,
  eventGroup: EventGroup | null,
): PureResult<true> {
  if (eventType !== null && eventGroup !== null) {
    return fail("eventType and eventGroup are conflicting_fields", "INVALID_REQUEST");
  }
  return ok(true);
}
