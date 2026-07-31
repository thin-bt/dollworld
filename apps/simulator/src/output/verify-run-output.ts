import {
  validateEventEnvelope,
  validateEventSequence,
  type EventEnvelope,
} from "@shared-world/simulation-core";
import type { RunOutputContents } from "./atomic-write.js";
import { FIXED_OUTPUT_FILE_NAMES } from "./fixed-files.js";
import { YEARLY_STATISTICS_COLUMNS } from "./yearly-statistics.js";

function assertLfWithTrailingNewline(text: string, label: string): void {
  if (text.includes("\r")) {
    throw new Error(`${label} must use LF only (CR found)`);
  }
  if (!text.endsWith("\n")) {
    throw new Error(`${label} must end with a trailing LF`);
  }
}

function verifyJsonFile(text: string, label: string): void {
  assertLfWithTrailingNewline(text, label);
  JSON.parse(text);
}

function verifyYearlyStatisticsCsv(text: string): void {
  assertLfWithTrailingNewline(text, "yearly-statistics.csv");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length < 1) {
    throw new Error("yearly-statistics.csv is missing a header row");
  }
  const header = lines[0]!.split(",");
  if (header.length !== YEARLY_STATISTICS_COLUMNS.length) {
    throw new Error(
      `yearly-statistics.csv header column count mismatch: expected ${String(YEARLY_STATISTICS_COLUMNS.length)}, got ${String(header.length)}`,
    );
  }
  for (let i = 0; i < YEARLY_STATISTICS_COLUMNS.length; i += 1) {
    if (header[i] !== YEARLY_STATISTICS_COLUMNS[i]) {
      throw new Error(
        `yearly-statistics.csv header mismatch at column ${String(i)}: expected ${YEARLY_STATISTICS_COLUMNS[i]}, got ${header[i] ?? ""}`,
      );
    }
  }
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const cols = lines[rowIndex]!.split(",");
    if (cols.length !== header.length) {
      throw new Error(
        `yearly-statistics.csv row ${String(rowIndex)} column count mismatch: expected ${String(header.length)}, got ${String(cols.length)}`,
      );
    }
  }
}

function verifyEventsJsonl(text: string): void {
  if (text === "") {
    validateEventSequence([], { expectedStartSequence: 0 });
    return;
  }
  if (text === "\n") {
    throw new Error("events.jsonl must not contain an empty line");
  }
  assertLfWithTrailingNewline(text, "events.jsonl");
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) {
    throw new Error("events.jsonl must not contain empty lines");
  }
  const events: EventEnvelope[] = [];
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
    const event = parsed as EventEnvelope;
    validateEventEnvelope(event);
    events.push(event);
  }
  validateEventSequence(events, { expectedStartSequence: 0 });
  for (let i = 0; i < events.length; i += 1) {
    if (events[i]!.sequence !== i) {
      throw new Error(
        `events.jsonl sequence must be contiguous without gaps/duplicates (expected ${String(i)}, got ${String(events[i]!.sequence)})`,
      );
    }
  }
}

/**
 * Re-validate reloaded fixed-7 contents before atomic rename.
 */
export function verifyReloadedRunOutputContents(contents: RunOutputContents): void {
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    if (typeof contents[name] !== "string") {
      throw new Error(`missing reloaded content for ${name}`);
    }
  }
  verifyJsonFile(contents["run-metadata.json"], "run-metadata.json");
  verifyJsonFile(contents["initial-world.json"], "initial-world.json");
  verifyJsonFile(contents["final-world.json"], "final-world.json");
  verifyJsonFile(contents["validation-report.json"], "validation-report.json");
  verifyJsonFile(contents["performance.json"], "performance.json");
  verifyYearlyStatisticsCsv(contents["yearly-statistics.csv"]);
  verifyEventsJsonl(contents["events.jsonl"]);
}
