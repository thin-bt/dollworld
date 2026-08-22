import { describe, expect, it } from "vitest";
import { advanceSimulationForMockReady, type FetchLike } from "./session-client.js";

function successEnvelope(data: unknown, uiRevision: number): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data,
    uiRevision,
    isUpdating: false,
  });
}

function mockReadyFetch(state: {
  steps: number;
  inFlight: number;
  maxInFlight: number;
}): FetchLike {
  return async (url, init) => {
    const method = init?.method ?? "GET";
    if (url.includes("/session") && method === "GET") {
      return {
        status: 200,
        text: async () =>
          successEnvelope(
            {
              sessionState: "ready",
              csrfToken: "b".repeat(43),
              activeOperation: null,
            },
            1 + state.steps,
          ),
      };
    }
    if (url.includes("/simulation/step") && method === "POST") {
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      state.steps += 1;
      state.inFlight -= 1;
      return {
        status: 200,
        text: async () => successEnvelope({ operation: "step" }, 1 + state.steps),
      };
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
}

describe("advanceSimulationForMockReady", () => {
  it("serializes concurrent advances and skipIfReady avoids a second 8-year run", async () => {
    const state = { steps: 0, inFlight: 0, maxInFlight: 0 };
    const fetchImpl = mockReadyFetch(state);
    const skipIfReady = async () => state.steps >= 8;
    const [first, second] = await Promise.all([
      advanceSimulationForMockReady({ fetchImpl, skipIfReady }),
      advanceSimulationForMockReady({ fetchImpl, skipIfReady }),
    ]);
    expect(first.kind).toBe("success");
    expect(second.kind).toBe("success");
    expect(state.maxInFlight).toBe(1);
    expect(state.steps).toBe(8);
  });

  it("reports year progress 1..8 during an unlocked advance", async () => {
    const state = { steps: 0, inFlight: 0, maxInFlight: 0 };
    const seen: string[] = [];
    const result = await advanceSimulationForMockReady({
      fetchImpl: mockReadyFetch(state),
      onYearProgress: (yearIndex, yearCount) => {
        seen.push(`${String(yearIndex)}/${String(yearCount)}`);
      },
    });
    expect(result.kind).toBe("success");
    expect(seen).toEqual(["1/8", "2/8", "3/8", "4/8", "5/8", "6/8", "7/8", "8/8"]);
    expect(state.steps).toBe(8);
  });
});
