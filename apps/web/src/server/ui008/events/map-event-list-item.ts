/**
 * EventEnvelope direct-wire map (§10E / FIX-068 / ACC-132).
 * DB-012: bind to validateSprint1EventEnvelope from simulation-core.
 */

import {
  toCanonicalJson,
  validateSprint1EventEnvelope,
  type Sprint1EventEnvelope,
} from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "../result.js";
import { EVENT_ENVELOPE_TOP_LEVEL_KEYS, type EventListItemView } from "../types.js";

export function mapEventListItem(event: Sprint1EventEnvelope): PureResult<EventListItemView> {
  const wire = JSON.parse(toCanonicalJson(event)) as Record<string, unknown>;
  const keys = Object.keys(wire);
  if (keys.length !== EVENT_ENVELOPE_TOP_LEVEL_KEYS.length) {
    return fail(`EventEnvelope must be exact11, got ${keys.length}`);
  }
  for (const key of EVENT_ENVELOPE_TOP_LEVEL_KEYS) {
    if (!(key in wire)) {
      return fail(`EventEnvelope missing key: ${key}`);
    }
  }
  for (const key of keys) {
    if (!(EVENT_ENVELOPE_TOP_LEVEL_KEYS as readonly string[]).includes(key)) {
      return fail(`EventEnvelope unknown key: ${key}`);
    }
  }
  return ok(wire as EventListItemView);
}

/**
 * Validate one committed stream row. Invalid → INTERNAL_ERROR (never skip; FI-062).
 */
export function validateAndMapEvent(raw: unknown): PureResult<EventListItemView> {
  const validated = validateSprint1EventEnvelope(raw);
  if (!validated.ok) {
    return fail("committed EventEnvelope failed Sprint1 validator");
  }
  return mapEventListItem(validated.value);
}
