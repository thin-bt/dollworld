import { asRunId, type RunId } from "@shared-world/simulation-core";

const RUN_ID_PATTERN = /^run_\d{8}T\d{6}\d{3}Z_\d{4}$/;

export type Clock = () => Date;

export type RunIdGenerator = {
  next: () => RunId;
};

/**
 * Format UTC instant as YYYYMMDDTHHMMSSmmmZ (ASCII, no separators beyond T/Z).
 */
export function formatRunIdTimestamp(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  const millis = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${year}${month}${day}T${hour}${minute}${second}${millis}Z`;
}

export function isValidRunIdFormat(value: string): boolean {
  return RUN_ID_PATTERN.test(value);
}

export const RUN_ID_FORMAT_REGEX = RUN_ID_PATTERN;

/**
 * Process-local RunId generator. Same millisecond → increment 4-digit sequence.
 * Sequence resets when the millisecond timestamp changes.
 */
export function createRunIdGenerator(clock: Clock = () => new Date()): RunIdGenerator {
  let lastTimestamp = "";
  let sequence = 0;

  return {
    next(): RunId {
      const timestamp = formatRunIdTimestamp(clock());
      if (timestamp === lastTimestamp) {
        sequence += 1;
        if (sequence > 9999) {
          throw new Error("runId sequence overflow within the same millisecond");
        }
      } else {
        lastTimestamp = timestamp;
        sequence = 0;
      }
      const seq = String(sequence).padStart(4, "0");
      return asRunId(`run_${timestamp}_${seq}`);
    },
  };
}
