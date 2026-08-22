import { describe, expect, it } from "vitest";
import { RAW_BODY_LIMIT_BYTES } from "../shared/ui001-contracts.js";
import { parseJsonBody } from "./json-body.js";

describe("common request JSON parser", () => {
  it("FI-003 rejects invalid JSON and oversized bodies", () => {
    const invalid = parseJsonBody(Buffer.from("{nope", "utf8"), "application/json");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.reason).toBe("json");
    }

    const oversized = parseJsonBody(Buffer.alloc(RAW_BODY_LIMIT_BYTES + 1), "application/json");
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) {
      expect(oversized.reason).toBe("size");
    }

    const badType = parseJsonBody(Buffer.from("{}", "utf8"), "text/plain");
    expect(badType.ok).toBe(false);
    if (!badType.ok) {
      expect(badType.reason).toBe("content_type");
    }
  });

  it("accepts application/json charset=utf-8", () => {
    const parsed = parseJsonBody(Buffer.from('{"a":1}', "utf8"), "application/json; charset=utf-8");
    expect(parsed.ok).toBe(true);
  });
});
