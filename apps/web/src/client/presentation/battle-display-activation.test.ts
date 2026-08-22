import { describe, expect, it } from "vitest";
import { battleActivationFailureLabel, formatActivationDiagnostic } from "./battle-display.js";

describe("activation presentation", () => {
  it("localizes activation_roll_failed as activation failure distinct from hit", () => {
    expect(battleActivationFailureLabel("activation_roll_failed")).toBe("発動判定に失敗");
    expect(
      formatActivationDiagnostic({
        activationSucceeded: false,
        activationFailureReason: "activation_roll_failed",
        activationChance: 40,
        activationRoll: 77,
      }),
    ).toBe("発動判定に失敗（出目 77 / 成功上限 40%）。命中判定は行われていません");
  });
});
