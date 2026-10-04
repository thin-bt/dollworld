export type EvidenceJsonFailureCode =
  "STR_JSON_SYNTAX" | "STR_DUPLICATE_JSON_KEY" | "STR_SCHEMA_VIOLATION";

export type EvidenceJsonParseResult =
  | { ok: true; value: Record<string, unknown> }
  | {
      ok: false;
      code: EvidenceJsonFailureCode;
      instancePointer: string;
      message: string;
    };

type ScannerState = {
  source: string;
  index: number;
  duplicatePointer: string | null;
};

class JsonSyntaxError extends Error {}

function isWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\n" || character === "\r" || character === "\t";
}

function skipWhitespace(state: ScannerState): void {
  while (isWhitespace(state.source[state.index])) {
    state.index += 1;
  }
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function scanString(state: ScannerState): string {
  const start = state.index;
  if (state.source[state.index] !== '"') {
    throw new JsonSyntaxError("expected JSON string");
  }
  state.index += 1;

  while (state.index < state.source.length) {
    const character = state.source[state.index];
    if (character === '"') {
      state.index += 1;
      const token = state.source.slice(start, state.index);
      try {
        return JSON.parse(token) as string;
      } catch {
        throw new JsonSyntaxError("invalid JSON string");
      }
    }
    if (character === "\\") {
      state.index += 1;
      const escape = state.source[state.index];
      if (escape === "u") {
        const digits = state.source.slice(state.index + 1, state.index + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(digits)) {
          throw new JsonSyntaxError("invalid Unicode escape");
        }
        state.index += 5;
        continue;
      }
      if (escape === undefined || !'"\\/bfnrt'.includes(escape)) {
        throw new JsonSyntaxError("invalid JSON escape");
      }
      state.index += 1;
      continue;
    }
    if (character === undefined || character.charCodeAt(0) <= 0x1f) {
      throw new JsonSyntaxError("unescaped control character in JSON string");
    }
    state.index += 1;
  }

  throw new JsonSyntaxError("unterminated JSON string");
}

function scanNumber(state: ScannerState): void {
  const remaining = state.source.slice(state.index);
  const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(remaining);
  if (match === null) {
    throw new JsonSyntaxError("invalid JSON number");
  }
  state.index += match[0].length;
}

function scanLiteral(state: ScannerState, literal: "true" | "false" | "null"): void {
  if (!state.source.startsWith(literal, state.index)) {
    throw new JsonSyntaxError("invalid JSON literal");
  }
  state.index += literal.length;
}

function scanArray(state: ScannerState, pointer: string): void {
  state.index += 1;
  skipWhitespace(state);
  if (state.source[state.index] === "]") {
    state.index += 1;
    return;
  }

  let itemIndex = 0;
  while (true) {
    scanValue(state, `${pointer}/${itemIndex}`);
    itemIndex += 1;
    skipWhitespace(state);
    const separator = state.source[state.index];
    if (separator === "]") {
      state.index += 1;
      return;
    }
    if (separator !== ",") {
      throw new JsonSyntaxError("expected comma or closing bracket");
    }
    state.index += 1;
    skipWhitespace(state);
  }
}

function scanObject(state: ScannerState, pointer: string): void {
  state.index += 1;
  skipWhitespace(state);
  if (state.source[state.index] === "}") {
    state.index += 1;
    return;
  }

  const keys = new Set<string>();
  while (true) {
    const key = scanString(state);
    const memberPointer = `${pointer}/${escapeJsonPointerSegment(key)}`;
    if (keys.has(key) && state.duplicatePointer === null) {
      state.duplicatePointer = memberPointer;
    }
    keys.add(key);
    skipWhitespace(state);
    if (state.source[state.index] !== ":") {
      throw new JsonSyntaxError("expected colon after object member name");
    }
    state.index += 1;
    scanValue(state, memberPointer);
    skipWhitespace(state);
    const separator = state.source[state.index];
    if (separator === "}") {
      state.index += 1;
      return;
    }
    if (separator !== ",") {
      throw new JsonSyntaxError("expected comma or closing brace");
    }
    state.index += 1;
    skipWhitespace(state);
  }
}

function scanValue(state: ScannerState, pointer: string): void {
  skipWhitespace(state);
  const character = state.source[state.index];
  if (character === "{") {
    scanObject(state, pointer);
    return;
  }
  if (character === "[") {
    scanArray(state, pointer);
    return;
  }
  if (character === '"') {
    scanString(state);
    return;
  }
  if (character === "t") {
    scanLiteral(state, "true");
    return;
  }
  if (character === "f") {
    scanLiteral(state, "false");
    return;
  }
  if (character === "n") {
    scanLiteral(state, "null");
    return;
  }
  if (character === "-" || (character !== undefined && /\d/.test(character))) {
    scanNumber(state);
    return;
  }
  throw new JsonSyntaxError("expected JSON value");
}

export function parseEvidenceJson(inputBytes: Uint8Array): EvidenceJsonParseResult {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(inputBytes);
  } catch {
    return {
      ok: false,
      code: "STR_JSON_SYNTAX",
      instancePointer: "",
      message: "evidence bundle is not strict UTF-8",
    };
  }

  const state: ScannerState = { source, index: 0, duplicatePointer: null };
  try {
    scanValue(state, "");
    skipWhitespace(state);
    if (state.index !== source.length) {
      throw new JsonSyntaxError("trailing bytes after JSON root value");
    }
  } catch (error) {
    if (!(error instanceof JsonSyntaxError)) {
      throw error;
    }
    return {
      ok: false,
      code: "STR_JSON_SYNTAX",
      instancePointer: "",
      message: error.message,
    };
  }

  if (state.duplicatePointer !== null) {
    return {
      ok: false,
      code: "STR_DUPLICATE_JSON_KEY",
      instancePointer: state.duplicatePointer,
      message: "evidence bundle contains a duplicate object member name",
    };
  }

  const value = JSON.parse(source) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ok: false,
      code: "STR_SCHEMA_VIOLATION",
      instancePointer: "",
      message: "evidence bundle root must be an object",
    };
  }

  return { ok: true, value: value as Record<string, unknown> };
}
