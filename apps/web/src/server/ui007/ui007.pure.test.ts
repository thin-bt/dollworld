/**
 * UI-007 pure module unit tests (ported/adapted from UI007 prebuild).
 */

import {
  asPersonId,
  asTechniqueId,
  createEmptyBattleActionLogShell,
  type SeededRngState,
  validateBattleActionLog,
} from "@shared-world/simulation-core";
import { describe, expect, it } from "vitest";
import { extractActionLogs } from "./extract-action-logs.js";
import {
  formatMockResultDataIdentity,
  parseMockResultDataIdentity,
  projectBattleLogRevisions,
} from "./mock-result-data-identity.js";
import { mapBattleActionLogToItemView } from "./map-battle-log-item.js";
import { mapBattleLogListDataView } from "./map-battle-log-list.js";
import { buildBattleLogPage } from "./page-battle-log.js";
import { pageExclusiveSlice } from "./page-boundary.js";
import {
  BATTLE_LOG_ITEM_VIEW_KEYS,
  BATTLE_LOG_LIST_DATA_KEYS,
  FORBIDDEN_BATTLE_LOG_ITEM_KEYS,
} from "./types.js";

const RNG: SeededRngState = {
  algorithmVersion: "xoshiro128ss-v1",
  s0: 1,
  s1: 2,
  s2: 3,
  s3: 4,
};

function makeValidActionLog(overrides: {
  actionSequence: number;
  turnNumber?: number;
  actorPersonId?: string;
  requestedAction?: { kind: "use_technique"; techniqueId: string } | { kind: "basic_defense" };
  resolvedAction?: { kind: "use_technique"; techniqueId: string } | { kind: "basic_defense" };
  replacementReason?:
    | "unknown_technique"
    | "unlearned_technique"
    | "requirements_not_met"
    | "insufficient_mental"
    | "unusable_range"
    | "unable_to_act"
    | "opponent_ended_battle"
    | null;
  invalidActionCountDelta?: 0 | 1;
}): unknown {
  const requestedAction = overrides.requestedAction ?? { kind: "basic_defense" as const };
  const resolvedAction =
    overrides.resolvedAction ??
    (requestedAction.kind === "use_technique"
      ? requestedAction
      : { kind: "basic_defense" as const });
  const replacementReason =
    overrides.replacementReason !== undefined ? overrides.replacementReason : null;
  const invalidActionCountDelta =
    overrides.invalidActionCountDelta ??
    (replacementReason === "unknown_technique" ||
    replacementReason === "unlearned_technique" ||
    replacementReason === "requirements_not_met" ||
    replacementReason === "insufficient_mental" ||
    replacementReason === "unusable_range" ||
    replacementReason === "unable_to_act"
      ? 1
      : 0);

  const requested =
    requestedAction.kind === "use_technique"
      ? {
          kind: "use_technique" as const,
          techniqueId: asTechniqueId(requestedAction.techniqueId),
        }
      : { kind: "basic_defense" as const };
  const resolved =
    resolvedAction.kind === "use_technique"
      ? {
          kind: "use_technique" as const,
          techniqueId: asTechniqueId(resolvedAction.techniqueId),
        }
      : { kind: "basic_defense" as const };

  const shell = createEmptyBattleActionLogShell({
    actionSequence: overrides.actionSequence,
    turnNumber: overrides.turnNumber ?? 1,
    actorSide: overrides.actionSequence % 2 === 0 ? "sideA" : "sideB",
    actorPersonId: asPersonId(overrides.actorPersonId ?? "person-a"),
    requestedAction: requested,
    resolvedAction: resolved,
    replacementReason,
    rangeBefore: "close",
    rangeAfter: "close",
    actorDurabilityBefore: 100,
    actorDurabilityAfter: 100,
    actorMentalBefore: 100,
    actorMentalAfter: 100,
    guardingBefore: false,
    guardingAfter: requested.kind === "basic_defense",
    evadingBefore: false,
    evadingAfter: false,
    inBattleConsumptionBefore: 0,
    inBattleConsumptionDelta: 0,
    inBattleConsumptionAfter: 0,
    passiveActionCountDelta: 0,
    invalidActionCountDelta,
    nextHitModifierBefore: 0,
    nextHitModifierAfter: 0,
    nextActivationModifierBefore: 0,
    nextActivationModifierAfter: 0,
    surrenderedAfter: false,
    unableToContinueAfter: false,
    canActAfter: true,
    rngStateBefore: RNG,
    rngStateAfter: RNG,
  });
  // createEmpty freezes; clone for validate round-trip tests.
  const clone = JSON.parse(JSON.stringify(shell)) as Record<string, unknown>;
  if (resolved.kind === "use_technique") {
    clone.activationChance = 50;
    clone.activationRoll = 90;
    clone.activationSucceeded = false;
    clone.activationFailureReason = "failed_activation";
  }
  return clone;
}

describe("FIX-024 / BRIDGE-046 actionLogs-only", () => {
  it("totalCount ignores turnOrderLogs length divergence", () => {
    const detailed = {
      turnOrderLogs: Array.from({ length: 5 }, (_, i) => ({ i })),
      actionLogs: [
        makeValidActionLog({ actionSequence: 0 }),
        makeValidActionLog({ actionSequence: 1 }),
        makeValidActionLog({ actionSequence: 2 }),
      ],
    };
    const extracted = extractActionLogs(detailed);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) {
      return;
    }
    expect(extracted.value.totalCount).toBe(3);
    expect(extracted.value.turnOrderLogsLength).toBe(5);
    expect(extracted.value.totalCount).toBe(extracted.value.actionLogs.length);
    const page = buildBattleLogPage({
      actionLogs: extracted.value.actionLogs,
      query: { kind: "battle_log", sortKey: "sourceIndex", sortOrder: "asc", limit: 100 },
      cursorNextPosition: null,
    });
    expect(page.ok).toBe(true);
    if (page.ok) {
      expect(page.value.totalCount).toBe(3);
    }
  });
});

describe("FIX-025 / BRIDGE-047 item mapping", () => {
  it("uses resolved techniqueId and keeps requested≠resolved", () => {
    const log = makeValidActionLog({
      actionSequence: 0,
      requestedAction: { kind: "use_technique", techniqueId: "tech-requested" },
      resolvedAction: { kind: "use_technique", techniqueId: "tech-resolved" },
      replacementReason: "unknown_technique",
      invalidActionCountDelta: 1,
    });
    expect(validateBattleActionLog(log).ok).toBe(true);
    const mapped = mapBattleActionLogToItemView(log, 0);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(Object.keys(mapped.value)).toHaveLength(40);
    expect(Object.keys(mapped.value)).toEqual([...BATTLE_LOG_ITEM_VIEW_KEYS]);
    expect(mapped.value.sequenceInBattle).toBe(1);
    expect(mapped.value.techniqueId).toBe("tech-resolved");
    expect(mapped.value.requestedAction).toEqual({
      kind: "use_technique",
      techniqueId: "tech-requested",
    });
    expect(mapped.value.resolvedAction).toEqual({
      kind: "use_technique",
      techniqueId: "tech-resolved",
    });
    expect(mapped.value.replacementReason).toBe("unknown_technique");
    for (const key of FORBIDDEN_BATTLE_LOG_ITEM_KEYS) {
      expect(key in mapped.value).toBe(false);
    }
    expect(Object.keys(mapped.value.sourceLogEntry as object)).toHaveLength(63);
  });

  it("sets techniqueId null when resolved is not use_technique", () => {
    const log = makeValidActionLog({
      actionSequence: 1,
      requestedAction: { kind: "use_technique", techniqueId: "t1" },
      resolvedAction: { kind: "basic_defense" },
      replacementReason: "unknown_technique",
      invalidActionCountDelta: 1,
    });
    const mapped = mapBattleActionLogToItemView(log, 1);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.techniqueId).toBeNull();
      expect(mapped.value.sequenceInBattle).toBe(2);
    }
  });
});

describe("FIX-008 sourceIndex paging", () => {
  it("covers 0/100/101/200/201 boundaries via pageExclusiveSlice + buildBattleLogPage", () => {
    const cases: Array<{
      n: number;
      limit: 100 | 200;
      expectedItems: number;
      hasNext: boolean;
      nextSourceIndex?: number;
    }> = [
      { n: 0, limit: 100, expectedItems: 0, hasNext: false },
      { n: 100, limit: 100, expectedItems: 100, hasNext: false },
      { n: 101, limit: 100, expectedItems: 100, hasNext: true, nextSourceIndex: 99 },
      { n: 200, limit: 200, expectedItems: 200, hasNext: false },
      { n: 201, limit: 200, expectedItems: 200, hasNext: true, nextSourceIndex: 199 },
    ];
    for (const c of cases) {
      const sliced = pageExclusiveSlice({
        sortedFiltered: Array.from({ length: c.n }, (_, i) => i),
        limit: c.limit,
        startIndex: 0,
      });
      expect(sliced.totalCount).toBe(c.n);
      expect(sliced.items).toHaveLength(c.expectedItems);
      expect(sliced.hasNext).toBe(c.hasNext);

      const actionLogs = Array.from({ length: c.n }, (_, i) =>
        makeValidActionLog({ actionSequence: i, turnNumber: Math.floor(i / 2) + 1 }),
      );
      const page = buildBattleLogPage({
        actionLogs,
        query: {
          kind: "battle_log",
          sortKey: "sourceIndex",
          sortOrder: "asc",
          limit: c.limit,
        },
        cursorNextPosition: null,
      });
      expect(page.ok, `n=${c.n}`).toBe(true);
      if (page.ok) {
        expect(page.value.totalCount).toBe(c.n);
        expect(page.value.items).toHaveLength(c.expectedItems);
        if (c.hasNext) {
          expect(page.value.nextPosition).toEqual({ sourceIndex: c.nextSourceIndex });
        } else {
          expect(page.value.nextPosition).toBeNull();
        }
      }
    }

    const actionLogs = Array.from({ length: 101 }, (_, i) =>
      makeValidActionLog({ actionSequence: i, turnNumber: Math.floor(i / 2) + 1 }),
    );
    const page1 = buildBattleLogPage({
      actionLogs,
      query: { kind: "battle_log", sortKey: "sourceIndex", sortOrder: "asc", limit: 100 },
      cursorNextPosition: null,
    });
    expect(page1.ok).toBe(true);
    if (page1.ok && page1.value.nextPosition) {
      const page2 = buildBattleLogPage({
        actionLogs,
        query: { kind: "battle_log", sortKey: "sourceIndex", sortOrder: "asc", limit: 100 },
        cursorNextPosition: page1.value.nextPosition,
      });
      expect(page2.ok).toBe(true);
      if (page2.ok) {
        expect(page2.value.items).toHaveLength(1);
        expect(page2.value.items[0]?.sequenceInBattle).toBe(101);
        expect(page2.value.nextPosition).toBeNull();
      }
    }
  });
});

describe("PAGE-014 exact4 + revision separation", () => {
  it("maps exact4 wrapper and allows result < session revision", () => {
    const actionLogs = [
      makeValidActionLog({ actionSequence: 0 }),
      makeValidActionLog({ actionSequence: 1 }),
    ];
    const page = buildBattleLogPage({
      actionLogs,
      query: { kind: "battle_log", sortKey: "sourceIndex", sortOrder: "asc", limit: 100 },
      cursorNextPosition: null,
    });
    expect(page.ok).toBe(true);
    if (page.ok) {
      const wrapped = mapBattleLogListDataView({
        items: page.value.items,
        totalCount: page.value.totalCount,
        nextCursor: null,
        resultUiRevision: 5,
      });
      expect(wrapped.ok).toBe(true);
      if (wrapped.ok) {
        expect(Object.keys(wrapped.value)).toEqual([...BATTLE_LOG_LIST_DATA_KEYS]);
        expect(wrapped.value.resultUiRevision).toBe(5);
      }
    }
    expect(projectBattleLogRevisions({ sessionUiRevision: 10, resultUiRevision: 5 }).ok).toBe(true);
    expect(projectBattleLogRevisions({ sessionUiRevision: 4, resultUiRevision: 5 }).ok).toBe(false);
  });
});

describe("ACC-166 dataIdentity helpers", () => {
  it("formats/parses mock-result identity", () => {
    const formatted = formatMockResultDataIdentity(2);
    expect(formatted.ok).toBe(true);
    if (formatted.ok) {
      expect(formatted.value).toBe("mock-result:2");
    }
    expect(parseMockResultDataIdentity("mock-result:2").ok).toBe(true);
    expect(parseMockResultDataIdentity("mock-result:01").ok).toBe(false);
    expect(parseMockResultDataIdentity("simulation:x").ok).toBe(false);
  });
});
