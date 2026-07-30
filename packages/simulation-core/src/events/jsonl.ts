import { toCanonicalJson } from "../canonical-json.js";
import type { EventEnvelope } from "./types.js";
import { validateEventSequence, type ValidateEventSequenceOptions } from "./validate.js";

/**
 * Convert events to canonical JSONL (UTF-8 text, LF lines, trailing LF).
 * Empty input yields empty string.
 */
export function eventsToJsonl(
  events: readonly EventEnvelope[],
  options: ValidateEventSequenceOptions = {},
): string {
  validateEventSequence(events, options);
  if (events.length === 0) {
    return "";
  }
  const lines = events.map((event) => toCanonicalJson(event));
  return `${lines.join("\n")}\n`;
}
