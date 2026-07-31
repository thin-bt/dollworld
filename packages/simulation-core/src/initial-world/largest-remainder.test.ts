import { describe, expect, it } from "vitest";
import { allocateByLargestRemainderOrdered, expandAllocationToList } from "./largest-remainder.js";

describe("largest-remainder ordered allocation", () => {
  it("assigns surplus by remainder desc then key order", () => {
    const result = allocateByLargestRemainderOrdered({ a: 1, b: 1, c: 1 }, 10, ["a", "b", "c"]);
    expect(result.a + result.b + result.c).toBe(10);
  });

  it("returns zeros for targetCount 0", () => {
    const result = allocateByLargestRemainderOrdered({ x: 5, y: 5 }, 0, ["x", "y"]);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("expandAllocationToList expands counts in key order", () => {
    expect(expandAllocationToList({ a: 2, b: 1 }, ["a", "b"])).toEqual(["a", "a", "b"]);
  });
});
