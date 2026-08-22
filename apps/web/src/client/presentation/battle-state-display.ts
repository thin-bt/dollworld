/**
 * Presentation helpers for battle participant resources (FIX7 / FIX8).
 * Reads only canonical finalState / BattleActionLog fields already on the wire
 * (MockBattleView.finalState, BattleLogItemView.sourceLogEntry).
 * Does not invent fatigue/injury numeric B/A or evade-success flags.
 */

export type BattleParticipantResources = {
  personId: string | null;
  currentDurability: number | null;
  maxDurability: number | null;
  currentMental: number | null;
  maxMental: number | null;
  injury: number | null;
  fatigue: number | null;
  guarding: boolean | null;
  evading: boolean | null;
  canAct: boolean | null;
  surrendered: boolean | null;
  unableToContinue: boolean | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asPersonId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function readFinalParticipant(
  finalState: unknown,
  key: "participantA" | "participantB",
): BattleParticipantResources | null {
  const root = asRecord(finalState);
  if (root === null) {
    return null;
  }
  const part = asRecord(root[key]);
  if (part === null) {
    return null;
  }
  return {
    personId: asPersonId(part.personId),
    currentDurability: asInt(part.currentDurability),
    maxDurability: asInt(part.maxDurability),
    currentMental: asInt(part.currentMental),
    maxMental: asInt(part.maxMental),
    injury: asInt(part.injury),
    fatigue: asInt(part.fatigue),
    guarding: asBool(part.guarding),
    evading: asBool(part.evading),
    canAct: asBool(part.canAct),
    surrendered: asBool(part.surrendered),
    unableToContinue: asBool(part.unableToContinue),
  };
}

export function readFinalRange(finalState: unknown): string | null {
  const root = asRecord(finalState);
  if (root === null) {
    return null;
  }
  return typeof root.range === "string" ? root.range : null;
}

export function readInitialRange(finalState: unknown): string | null {
  const root = asRecord(finalState);
  if (root === null) {
    return null;
  }
  if (typeof root.initialRange === "string") {
    return root.initialRange;
  }
  return typeof root.range === "string" ? root.range : null;
}

/**
 * Earliest durability/mental "before" values for a person from action log entries.
 */
export function readBattleStartResourcesFromLogs(
  logItems: ReadonlyArray<{
    actorPersonId?: unknown;
    sourceLogEntry?: unknown;
  }>,
  personId: string,
): { durability: number | null; mental: number | null } {
  let durability: number | null = null;
  let mental: number | null = null;
  for (const item of logItems) {
    const log = asRecord(item.sourceLogEntry);
    if (log === null) {
      continue;
    }
    const actorId = typeof item.actorPersonId === "string" ? item.actorPersonId : null;
    if (actorId === personId) {
      if (durability === null) {
        durability = asInt(log.actorDurabilityBefore);
      }
      if (mental === null) {
        mental = asInt(log.actorMentalBefore);
      }
    } else {
      if (durability === null) {
        durability = asInt(log.targetDurabilityBefore);
      }
      if (mental === null) {
        mental = asInt(log.targetMentalBefore);
      }
    }
    if (durability !== null && mental !== null) {
      break;
    }
  }
  return { durability, mental };
}

export function readSourceLogEntry(item: {
  sourceLogEntry?: unknown;
}): Record<string, unknown> | null {
  return asRecord(item.sourceLogEntry);
}

export function resourceBarPercent(current: number | null, max: number | null): number | null {
  if (current === null || max === null || max <= 0) {
    return null;
  }
  const pct = Math.round((current / max) * 100);
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

export function formatResourcePair(current: number | null, max: number | null): string {
  if (current === null && max === null) {
    return "—";
  }
  if (current !== null && max !== null) {
    return `${String(current)} / ${String(max)}`;
  }
  if (current !== null) {
    return String(current);
  }
  return `— / ${String(max)}`;
}

function formatDelta(label: string, before: unknown, after: unknown): string | null {
  if (typeof before !== "number" || typeof after !== "number") {
    return null;
  }
  if (before === after) {
    return null;
  }
  return `${label} ${String(before)} → ${String(after)}`;
}

export type ActionSnapshotStrip = {
  actorDurability: string | null;
  actorMental: string | null;
  targetDurability: string | null;
  targetMental: string | null;
  actorConsumption: string | null;
};

/**
 * After-state snapshot for the action row, joining max* from finalState participants.
 */
export function actionResourceSnapshot(input: {
  sourceLog: Record<string, unknown> | null;
  actorIsA: boolean;
  maxA: { durability: number | null; mental: number | null };
  maxB: { durability: number | null; mental: number | null };
}): ActionSnapshotStrip | null {
  const log = input.sourceLog;
  if (log === null) {
    return null;
  }
  const actorMax = input.actorIsA ? input.maxA : input.maxB;
  const targetMax = input.actorIsA ? input.maxB : input.maxA;
  return {
    actorDurability:
      asInt(log.actorDurabilityAfter) === null
        ? null
        : formatResourcePair(asInt(log.actorDurabilityAfter), actorMax.durability),
    actorMental:
      asInt(log.actorMentalAfter) === null
        ? null
        : formatResourcePair(asInt(log.actorMentalAfter), actorMax.mental),
    targetDurability:
      asInt(log.targetDurabilityAfter) === null
        ? null
        : formatResourcePair(asInt(log.targetDurabilityAfter), targetMax.durability),
    targetMental:
      asInt(log.targetMentalAfter) === null
        ? null
        : formatResourcePair(asInt(log.targetMentalAfter), targetMax.mental),
    actorConsumption: formatDelta(
      "戦闘消耗",
      log.inBattleConsumptionBefore,
      log.inBattleConsumptionAfter,
    ),
  };
}

/**
 * Compact human effect lines from canonical BattleActionLog nested in sourceLogEntry.
 */
export function battleActionEffectLines(input: {
  sourceLog: Record<string, unknown> | null;
  actorName: string;
  targetName: string;
  damage: unknown;
  hit: unknown;
  actionLabel: string;
  activationSucceeded?: unknown;
  activationFailureReason?: unknown;
  activationChance?: unknown;
  activationRoll?: unknown;
  resolvedKind?: string | null;
  activationDiagnostic?: string | null;
}): string[] {
  const lines: string[] = [];
  const log = input.sourceLog;
  const kind = input.resolvedKind ?? null;

  if (input.activationSucceeded === false) {
    const diagnostic =
      typeof input.activationDiagnostic === "string" && input.activationDiagnostic.length > 0
        ? input.activationDiagnostic
        : null;
    if (diagnostic !== null) {
      lines.push(`${input.actorName}：${diagnostic}`);
    } else {
      const reason =
        typeof input.activationFailureReason === "string" &&
        input.activationFailureReason.length > 0
          ? input.activationFailureReason
          : null;
      lines.push(
        reason !== null
          ? `${input.actorName}：技の発動に失敗（${reason}）`
          : `${input.actorName}：技の発動に失敗`,
      );
    }
  }

  if (kind === "no_action") {
    lines.push(`${input.actorName}：行動なし（キャンセル）`);
  } else if (typeof input.damage === "number" && input.hit === true) {
    const targetDur =
      log === null
        ? null
        : formatDelta("耐久", log.targetDurabilityBefore, log.targetDurabilityAfter);
    if (targetDur !== null) {
      lines.push(
        `${input.actorName}の${input.actionLabel} → ${input.targetName}に${String(input.damage)}ダメージ（${targetDur}）`,
      );
    } else {
      lines.push(
        `${input.actorName}の${input.actionLabel} → ${input.targetName}に${String(input.damage)}ダメージ`,
      );
    }
  } else if (input.hit === false) {
    lines.push(`${input.actorName}の${input.actionLabel} → 外れ`);
  } else if (kind === "basic_defense") {
    lines.push(`${input.actorName}：防御`);
  } else if (kind === "evade") {
    lines.push(`${input.actorName}：${input.actionLabel}`);
  } else if (kind === "surrender") {
    lines.push(`${input.actorName}：降伏を宣言`);
  } else if (input.hit === null || input.hit === undefined) {
    if (kind !== "no_action") {
      lines.push(`${input.actorName}：${input.actionLabel}`);
    }
  }

  if (log !== null) {
    const actorMental = formatDelta("精神力", log.actorMentalBefore, log.actorMentalAfter);
    if (actorMental !== null) {
      lines.push(`${input.actorName}：${actorMental}`);
    }
    const actorDur = formatDelta("耐久", log.actorDurabilityBefore, log.actorDurabilityAfter);
    if (
      actorDur !== null &&
      !(
        typeof input.damage === "number" &&
        input.hit === true &&
        log.actorDurabilityBefore === log.targetDurabilityBefore
      )
    ) {
      // Show actor durability change when it is not the mirrored target-damage line.
      if (!(typeof input.damage === "number" && input.hit === true)) {
        lines.push(`${input.actorName}：${actorDur}`);
      } else if (log.actorDurabilityBefore !== log.actorDurabilityAfter) {
        lines.push(`${input.actorName}：${actorDur}`);
      }
    }

    const targetMental = formatDelta("精神力", log.targetMentalBefore, log.targetMentalAfter);
    if (targetMental !== null) {
      lines.push(`${input.targetName}：${targetMental}`);
    }

    const consumption = formatDelta(
      "戦闘消耗",
      log.inBattleConsumptionBefore,
      log.inBattleConsumptionAfter,
    );
    if (consumption !== null) {
      lines.push(`${input.actorName}：${consumption}`);
    }

    if (log.rangeBefore !== log.rangeAfter && log.rangeBefore != null && log.rangeAfter != null) {
      // Range JP labels applied by caller via battleRangeLabel when formatting.
      lines.push(`間合い変更:${String(log.rangeBefore)}→${String(log.rangeAfter)}`);
    }

    if (typeof log.injuryResult === "string" && log.injuryResult.length > 0) {
      // Label via injuryResultLabel at call site when needed; keep raw path for mapping.
      const mapped =
        log.injuryResult === "none"
          ? "負傷なし"
          : log.injuryResult === "minor" || log.injuryResult === "light"
            ? "軽傷"
            : log.injuryResult === "major" || log.injuryResult === "severe"
              ? "重傷"
              : log.injuryResult === "medium"
                ? "中等傷"
                : null;
      if (mapped !== null) {
        lines.push(`負傷: ${mapped}`);
      }
    }
    if (log.surrenderedAfter === true) {
      lines.push(`${input.actorName}：降伏した`);
    }
    if (log.unableToContinueAfter === true) {
      lines.push(`継続不能になった`);
    }
    if (
      log.canActAfter === false &&
      log.surrenderedAfter !== true &&
      log.unableToContinueAfter !== true
    ) {
      lines.push(`${input.actorName}：行動不可になった`);
    }
    if (log.guardingBefore === false && log.guardingAfter === true) {
      lines.push(`${input.actorName}：防御姿勢へ`);
    }
    if (log.guardingBefore === true && log.guardingAfter === false) {
      lines.push(`${input.actorName}：防御姿勢を解いた`);
    }
    if (log.evadingBefore === false && log.evadingAfter === true) {
      lines.push(`${input.actorName}：回避姿勢へ`);
    }
    if (log.evadingBefore === true && log.evadingAfter === false) {
      lines.push(`${input.actorName}：回避姿勢を解いた`);
    }
  }

  return lines;
}

export function participantStatusFlags(part: BattleParticipantResources): string[] {
  const flags: string[] = [];
  if (part.unableToContinue === true) flags.push("継続不能");
  if (part.surrendered === true) flags.push("降伏");
  if (part.guarding === true) flags.push("防御中");
  if (part.evading === true) flags.push("回避中");
  if (part.canAct === false && part.unableToContinue !== true && part.surrendered !== true) {
    flags.push("行動不可");
  }
  if (typeof part.injury === "number" && part.injury > 0) {
    flags.push(`負傷 ${String(part.injury)}`);
  }
  if (typeof part.fatigue === "number" && part.fatigue > 0) {
    flags.push(`疲労 ${String(part.fatigue)}`);
  }
  return flags;
}

/** Final-match summary: omit transient pose (guarding/evading). */
export function participantFinalStatusFlags(part: BattleParticipantResources): string[] {
  const flags: string[] = [];
  if (part.unableToContinue === true) flags.push("継続不能");
  if (part.surrendered === true) flags.push("降伏");
  if (part.canAct === false && part.unableToContinue !== true && part.surrendered !== true) {
    flags.push("行動不可");
  }
  if (typeof part.injury === "number" && part.injury > 0) {
    flags.push(`負傷 ${String(part.injury)}`);
  }
  if (typeof part.fatigue === "number" && part.fatigue > 0) {
    flags.push(`疲労 ${String(part.fatigue)}`);
  }
  return flags;
}

export function injuryResultLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value !== "string" || value.length === 0) {
    return "—";
  }
  const map: Record<string, string> = {
    none: "負傷なし",
    minor: "軽傷",
    major: "重傷",
    light: "軽傷",
    medium: "中等傷",
    severe: "重症",
  };
  return map[value] ?? "—";
}

export function groupLogItemsByTurn<T extends { turnNumber?: unknown }>(
  items: readonly T[],
): { turnNumber: number | string; items: T[] }[] {
  const groups: { turnNumber: number | string; items: T[] }[] = [];
  for (const item of items) {
    const turn =
      typeof item.turnNumber === "number" || typeof item.turnNumber === "string"
        ? item.turnNumber
        : "?";
    const last = groups[groups.length - 1];
    if (last !== undefined && last.turnNumber === turn) {
      last.items.push(item);
    } else {
      groups.push({ turnNumber: turn, items: [item] });
    }
  }
  return groups;
}
