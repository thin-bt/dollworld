import { describe, expect, it } from "vitest";
import { loadRelatedPersonNames } from "./fetch-person-identities.js";

function successEnvelope(items: unknown[], uiRevision = 7): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data: { items },
    uiRevision,
    isUpdating: false,
  });
}

describe("P0 Person Detail related identity request bound", () => {
  it("R=0 performs no identity request", async () => {
    let calls = 0;
    const names = await loadRelatedPersonNames({
      personIds: [],
      uiRevision: 7,
      fetchImpl: async () => {
        calls += 1;
        return { status: 500, text: async () => "" };
      },
    });
    expect(calls).toBe(0);
    expect(names.size).toBe(0);
  });

  it("R>0 deduplicates and performs exactly one minimal batch request", async () => {
    const urls: string[] = [];
    const names = await loadRelatedPersonNames({
      personIds: ["person_000002", "person_000003", "person_000002"],
      uiRevision: 7,
      fetchImpl: async (url) => {
        urls.push(url);
        return {
          status: 200,
          text: async () =>
            successEnvelope([
              { personId: "person_000002", displayName: "Master" },
              { personId: "person_000003", displayName: "Disciple" },
            ]),
        };
      },
    });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("/api/s1_5/people/identities?");
    expect(urls[0]).toContain("uiRevision=7");
    expect(urls[0]).not.toMatch(/\/people\/person_[0-9]+/);
    expect(names.get("person_000002")).toBe("Master");
    expect(names.get("person_000003")).toBe("Disciple");
  });

  it("missing identity stays absent so existing personId fallback remains visible", async () => {
    const names = await loadRelatedPersonNames({
      personIds: ["person_000004", "person_000005"],
      uiRevision: 7,
      fetchImpl: async () => ({
        status: 200,
        text: async () =>
          successEnvelope([{ personId: "person_000004", displayName: "Known" }]),
      }),
    });
    expect(names.get("person_000004")).toBe("Known");
    expect(names.has("person_000005")).toBe(false);
  });
});
