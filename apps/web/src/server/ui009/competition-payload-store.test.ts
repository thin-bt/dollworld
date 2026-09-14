import { describe, expect, it } from "vitest";
import { createEmptyDetailedLogPayloadStore } from "@shared-world/simulation-core";
import {
  persistDetailedLogPayloadStore,
  restoreDetailedLogPayloadStore,
} from "./competition-payload-store.js";

describe("UI-009 competition detailed-log payload persistence", () => {
  it("preserves prior match payloads when the next match restores and persists the store", () => {
    const firstMatchStore = createEmptyDetailedLogPayloadStore();
    firstMatchStore.entries.set("hash-match-1", {
      detailedLogHash: "hash-match-1",
      canonicalUtf8Bytes: "payload-match-1",
    });

    const persistedAfterFirstMatch = persistDetailedLogPayloadStore(firstMatchStore);
    const restoredForSecondMatch = restoreDetailedLogPayloadStore(
      persistedAfterFirstMatch as unknown as Record<string, unknown>,
    );
    expect(restoredForSecondMatch).not.toBeNull();
    if (restoredForSecondMatch === null) {
      return;
    }

    restoredForSecondMatch.entries.set("hash-match-2", {
      detailedLogHash: "hash-match-2",
      canonicalUtf8Bytes: "payload-match-2",
    });

    const persistedAfterSecondMatch = persistDetailedLogPayloadStore(restoredForSecondMatch);
    expect(persistedAfterSecondMatch.entries).toEqual([
      {
        detailedLogHash: "hash-match-1",
        canonicalUtf8Bytes: "payload-match-1",
      },
      {
        detailedLogHash: "hash-match-2",
        canonicalUtf8Bytes: "payload-match-2",
      },
    ]);
  });

  it("rejects duplicate hashes instead of silently replacing persisted payloads", () => {
    const emptyStore = createEmptyDetailedLogPayloadStore();
    const duplicatePayload = {
      schemaVersion: emptyStore.schemaVersion,
      entries: [
        { detailedLogHash: "duplicate", canonicalUtf8Bytes: "first" },
        { detailedLogHash: "duplicate", canonicalUtf8Bytes: "second" },
      ],
    };

    expect(
      restoreDetailedLogPayloadStore(duplicatePayload as unknown as Record<string, unknown>),
    ).toBeNull();
  });
});
