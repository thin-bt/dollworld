import { describe, expect, it } from "vitest";
import { parseEvidenceJson } from "./parse-evidence-json.js";

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("parseEvidenceJson", () => {
  it("accepts exactly one object root with JSON whitespace", () => {
    expect(parseEvidenceJson(encode(' \n {"attempts":[],"summary":{"ok":true}}\t'))).toEqual({
      ok: true,
      value: { attempts: [], summary: { ok: true } },
    });
  });

  it("rejects malformed UTF-8, truncation, and trailing values as JSON syntax", () => {
    expect(parseEvidenceJson(new Uint8Array([0xc3, 0x28]))).toMatchObject({
      ok: false,
      code: "STR_JSON_SYNTAX",
    });
    expect(parseEvidenceJson(encode('{"attempts":['))).toMatchObject({
      ok: false,
      code: "STR_JSON_SYNTAX",
    });
    expect(parseEvidenceJson(encode('{"attempts":[]} {}'))).toMatchObject({
      ok: false,
      code: "STR_JSON_SYNTAX",
    });
  });

  it("detects duplicate decoded member names at every nesting level", () => {
    expect(parseEvidenceJson(encode('{"attempts":[{"id":1,"id":1}]}'))).toEqual({
      ok: false,
      code: "STR_DUPLICATE_JSON_KEY",
      instancePointer: "/attempts/0/id",
      message: "evidence bundle contains a duplicate object member name",
    });
    expect(parseEvidenceJson(encode('{"a":1,"\\u0061":2}'))).toMatchObject({
      ok: false,
      code: "STR_DUPLICATE_JSON_KEY",
      instancePointer: "/a",
    });
  });

  it("gives syntax failure priority over an earlier duplicate key", () => {
    expect(parseEvidenceJson(encode('{"a":1,"a":2,"broken":]'))).toMatchObject({
      ok: false,
      code: "STR_JSON_SYNTAX",
    });
  });

  it("escapes duplicate-key diagnostic JSON pointers", () => {
    expect(parseEvidenceJson(encode('{"a/b~c":1,"a/b~c":2}'))).toMatchObject({
      ok: false,
      code: "STR_DUPLICATE_JSON_KEY",
      instancePointer: "/a~1b~0c",
    });
  });

  it("rejects every non-object root with the structural fallback", () => {
    for (const source of ["[]", "null", "true", '"bundle"', "42"]) {
      expect(parseEvidenceJson(encode(source))).toMatchObject({
        ok: false,
        code: "STR_SCHEMA_VIOLATION",
        instancePointer: "",
      });
    }
  });
});
