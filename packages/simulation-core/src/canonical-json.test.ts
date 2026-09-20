import { describe, expect, it } from "vitest";
import {
  canonicalize,
  appendCanonicalJson,
  hashCanonicalValueUtf8,
  toCanonicalJson,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const provider = createNodeSha256Provider();

describe("canonical JSON", () => {
  it("is independent of object key order, whitespace, and newlines", () => {
    const a = { b: 1, a: { d: 2, c: 3 }, list: [1, 2] };
    const b = { list: [1, 2], a: { c: 3, d: 2 }, b: 1 };

    expect(toCanonicalJson(a)).toBe(toCanonicalJson(b));
    expect(toCanonicalJson(a)).toBe('{"a":{"c":3,"d":2},"b":1,"list":[1,2]}');
  });

  it("preserves array order", () => {
    expect(toCanonicalJson({ values: ["b", "a", "c"] })).toBe('{"values":["b","a","c"]}');
    expect(toCanonicalJson({ values: ["b", "a", "c"] })).not.toBe(
      toCanonicalJson({ values: ["a", "b", "c"] }),
    );
  });

  it("normalizes -0 to 0 and rejects non-finite numbers", () => {
    expect(toCanonicalJson({ n: -0 })).toBe('{"n":0}');
    expect(() => toCanonicalJson({ n: Number.NaN })).toThrow(/non-finite/);
    expect(() => toCanonicalJson({ n: Number.POSITIVE_INFINITY })).toThrow(/non-finite/);
  });

  it("sorts keys by Unicode code points recursively", () => {
    const canonical = canonicalize({
      ζ: 1,
      a: { z: 1, a: 2 },
      A: 3,
    }) as Record<string, unknown>;

    expect(Object.keys(canonical)).toEqual(["A", "a", "ζ"]);
    expect(Object.keys(canonical["a"] as Record<string, unknown>)).toEqual(["a", "z"]);
  });

  it("keeps integer-form keys in Unicode code point order, not JS index order", () => {
    expect(toCanonicalJson({ "10": "ten", "2": "two" })).toBe('{"10":"ten","2":"two"}');
    expect(toCanonicalJson({ "2": "two", "10": "ten" })).toBe('{"10":"ten","2":"two"}');
  });

  it("preserves a __proto__ JSON key as data", () => {
    const value = JSON.parse('{"__proto__":1,"a":2}') as Record<string, unknown>;
    expect(toCanonicalJson(value)).toBe('{"__proto__":1,"a":2}');
    expect(toCanonicalJson(value)).toContain('"__proto__":1');

    const canonical = canonicalize(value) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(canonical, "__proto__")).toBe(true);
    expect(canonical["__proto__"]).toBe(1);
  });

  it("sorts nested integer-form keys by Unicode code points", () => {
    expect(toCanonicalJson({ outer: { "10": 1, "2": 2 } })).toBe('{"outer":{"10":1,"2":2}}');
    expect(toCanonicalJson({ outer: { "2": 2, "10": 1 } })).toBe('{"outer":{"10":1,"2":2}}');
  });

  it("appendCanonicalJson matches toCanonicalJson", () => {
    const value = {
      b: 1,
      a: { d: 2, c: 3 },
      list: [{ sequence: 2 }, { sequence: 1 }],
    };
    let appended = "";
    appendCanonicalJson(value, (chunk) => {
      appended += chunk;
    });
    expect(appended).toBe(toCanonicalJson(value));
  });

  it("hashCanonicalValueUtf8 matches hashUtf8(toCanonicalJson) for bounded values", () => {
    const value = {
      eventEnvelopeSchemaVersion: "0.2.0",
      nextSequence: 99,
      nested: [{ z: 1, a: 2 }],
    };
    expect(hashCanonicalValueUtf8(provider, value)).toBe(provider.hashUtf8(toCanonicalJson(value)));
  });
});
