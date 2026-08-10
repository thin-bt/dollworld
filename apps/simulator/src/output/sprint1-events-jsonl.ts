import {
  toCanonicalJson,
  validateSprint1EventEnvelope,
  type Sprint1EventEnvelope,
} from "@shared-world/simulation-core";

export type ValidateSprint1EventSequenceOptions = {
  expectedStartSequence?: number;
};

function validateSprint1EventSequence(
  events: readonly Sprint1EventEnvelope[],
  options: ValidateSprint1EventSequenceOptions = {},
): void {
  const expectedStart = options.expectedStartSequence ?? 0;
  for (let index = 0; index < events.length; index += 1) {
    const expectedSequence = expectedStart + index;
    const event = events[index]!;
    const validated = validateSprint1EventEnvelope(event);
    if (!validated.ok) {
      const detail = validated.issues.map((issue) => issue.message).join("; ");
      throw new Error(
        `events[${String(index)}] failed Sprint1 EventEnvelope validation: ${detail}`,
      );
    }
    if (event.sequence !== expectedSequence) {
      throw new Error(
        `events sequence must be contiguous without gaps/duplicates (expected ${String(expectedSequence)}, got ${String(event.sequence)})`,
      );
    }
  }
}

/**
 * Convert Sprint 1 EventEnvelope 0.2.0 events to canonical JSONL (UTF-8, LF, trailing LF).
 */
export function sprint1EventsToJsonl(
  events: readonly Sprint1EventEnvelope[],
  options: ValidateSprint1EventSequenceOptions = {},
): string {
  validateSprint1EventSequence(events, options);
  if (events.length === 0) {
    return "";
  }
  const lines = events.map((event) => toCanonicalJson(event));
  return `${lines.join("\n")}\n`;
}

export function verifySprint1EventsJsonl(text: string): void {
  if (text === "") {
    validateSprint1EventSequence([]);
    return;
  }
  if (text === "\n") {
    throw new Error("events.jsonl must not contain an empty line");
  }
  if (text.includes("\r")) {
    throw new Error("events.jsonl must use LF only (CR found)");
  }
  if (!text.endsWith("\n")) {
    throw new Error("events.jsonl must end with a trailing LF");
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) {
    throw new Error("events.jsonl must not contain empty lines");
  }
  const events: Sprint1EventEnvelope[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[i]!);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`events.jsonl line ${String(i)} is not valid JSON: ${detail}`, {
        cause: error,
      });
    }
    const validated = validateSprint1EventEnvelope(parsed);
    if (!validated.ok) {
      const detail = validated.issues.map((issue) => issue.message).join("; ");
      throw new Error(`events.jsonl line ${String(i)} failed validation: ${detail}`);
    }
    events.push(validated.value);
  }
  validateSprint1EventSequence(events, { expectedStartSequence: 0 });
}
