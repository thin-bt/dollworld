/**
 * Committed Event Stream source (API-009 / §10E.3).
 * Only worldEngineRuntime.runtimeState.eventStream — never mock eventCandidates.
 */

import type { Sprint1RunSession } from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "../result.js";
import type { EventListItemView } from "../types.js";
import { validateAndMapEvent } from "./map-event-list-item.js";

export function buildEventsSourceFromStream(input: {
  stream: readonly unknown[];
  simulationId: string;
}): PureResult<readonly EventListItemView[]> {
  if (!Array.isArray(input.stream)) {
    return fail("eventStream is not an array");
  }
  const items: EventListItemView[] = [];
  for (let i = 0; i < input.stream.length; i += 1) {
    const mapped = validateAndMapEvent(input.stream[i]);
    if (!mapped.ok) {
      return mapped;
    }
    if (mapped.value.sequence !== i) {
      return fail("eventStream sequence must be contiguous from 0");
    }
    if (mapped.value.simulationId !== input.simulationId) {
      return fail("event simulationId must equal runtime simulationId");
    }
    items.push(mapped.value);
  }
  return ok(items);
}

export function buildEventsSource(
  runtime: Sprint1RunSession,
): PureResult<readonly EventListItemView[]> {
  return buildEventsSourceFromStream({
    stream: runtime.runtimeState.eventStream,
    simulationId: runtime.context.simulationId,
  });
}
