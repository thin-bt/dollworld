import {
  createDefaultSprint2ConfigInput,
  type Sprint2ConfigInput,
} from "@shared-world/simulation-core";

/** Integration schedule used by UI-009 competition progression (bounded F-rank slot). */
export function tinyScheduleConfig(): Sprint2ConfigInput {
  const base = createDefaultSprint2ConfigInput();
  return {
    ...base,
    configVersion: "ui009-competition-integration",
    schedule: {
      normalMonthOffsetsByRank: { F: [0], E: [0], D: [0], C: [0], B: [0] },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
      weekByKind: { normal: 1, open: 1, limited: 2, promotion: 3 },
    },
  };
}
