/**
 * S02-011 fixed-seven streaming serializer with byte-equal reference contract.
 */
import { FIXED_SEVEN_OUTPUT_FILE_NAMES } from "./constants.js";
import type { FixedSevenRunOutput } from "./fixed-seven-projection.js";

export type FixedSevenStreamingChunk = {
  fileName: (typeof FIXED_SEVEN_OUTPUT_FILE_NAMES)[number];
  chunkIndex: number;
  bytes: string;
};

const STREAMING_CHUNK_SIZE = 4096;

export function measureUtf8Bytes(text: string): number {
  let length = 0;
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      index += 1;
      codePoint =
        ((codePoint - 0xd800) << 10) + (text.charCodeAt(index)! - 0xdc00) + 0x10000;
    }
    if (codePoint <= 0x7f) {
      length += 1;
    } else if (codePoint <= 0x7ff) {
      length += 2;
    } else if (codePoint <= 0xffff) {
      length += 3;
    } else {
      length += 4;
    }
  }
  return length;
}

export function serializeFixedSevenToMemoryReference(output: FixedSevenRunOutput): FixedSevenRunOutput {
  const reference = {} as FixedSevenRunOutput;
  for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
    reference[fileName] = output[fileName];
  }
  return reference;
}

export function serializeFixedSevenStreaming(output: FixedSevenRunOutput): FixedSevenStreamingChunk[] {
  const chunks: FixedSevenStreamingChunk[] = [];
  for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
    const text = output[fileName];
    if (text.length === 0) {
      chunks.push({ fileName, chunkIndex: 0, bytes: "" });
      continue;
    }
    let chunkIndex = 0;
    for (let offset = 0; offset < text.length; offset += STREAMING_CHUNK_SIZE) {
      chunks.push({
        fileName,
        chunkIndex,
        bytes: text.slice(offset, offset + STREAMING_CHUNK_SIZE),
      });
      chunkIndex += 1;
    }
  }
  return chunks;
}

export function reassembleFixedSevenFromStreaming(chunks: readonly FixedSevenStreamingChunk[]): FixedSevenRunOutput {
  const buffers = new Map<(typeof FIXED_SEVEN_OUTPUT_FILE_NAMES)[number], string[]>();
  for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
    buffers.set(fileName, []);
  }
  for (const chunk of chunks) {
    const parts = buffers.get(chunk.fileName);
    if (parts === undefined) {
      throw new Error(`unexpected streaming file name: ${chunk.fileName}`);
    }
    parts[chunk.chunkIndex] = chunk.bytes;
  }
  const output = {} as FixedSevenRunOutput;
  for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
    output[fileName] = (buffers.get(fileName) ?? []).join("");
  }
  return output;
}

export function assertFixedSevenStreamingEqualsReference(
  reference: FixedSevenRunOutput,
  streamed: FixedSevenRunOutput,
): void {
  for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
    if (reference[fileName] !== streamed[fileName]) {
      throw new Error(`streaming bytes mismatch for ${fileName}`);
    }
  }
}

export function measureFixedSevenUtf8Bytes(output: FixedSevenRunOutput): number {
  return FIXED_SEVEN_OUTPUT_FILE_NAMES.reduce(
    (sum, fileName) => sum + measureUtf8Bytes(output[fileName]),
    0,
  );
}
