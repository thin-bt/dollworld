import { describe, expect, it } from "vitest";
import { SIMULATION_CORE_PACKAGE_NAME } from "./index.js";

describe("@shared-world/simulation-core", () => {
  it("exposes a package marker that can be imported", () => {
    expect(SIMULATION_CORE_PACKAGE_NAME).toBe("@shared-world/simulation-core");
  });
});
