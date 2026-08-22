/**
 * Compact two-participant final/turn-end battle state panels (FIX8 / FIX9).
 */

import {
  formatResourcePair,
  participantFinalStatusFlags,
  resourceBarPercent,
  type BattleParticipantResources,
} from "./battle-state-display.js";

function ResourceMeter(props: {
  label: string;
  current: number | null;
  max: number | null;
  testId?: string;
}) {
  const pct = resourceBarPercent(props.current, props.max);
  return (
    <div className="dw-resource" data-testid={props.testId}>
      <div className="dw-resource-label">
        <span>{props.label}</span>
        <span>{formatResourcePair(props.current, props.max)}</span>
      </div>
      <div className="dw-resource-track" aria-hidden="true">
        <div
          className="dw-resource-fill"
          style={{ width: pct === null ? "0%" : `${String(pct)}%` }}
          data-pct={pct === null ? "" : String(pct)}
        />
      </div>
    </div>
  );
}

function SideCard(props: {
  name: string;
  part: BattleParticipantResources | null;
  showFinalFlags: boolean;
  sideTestId: string;
}) {
  const flags =
    props.showFinalFlags && props.part !== null ? participantFinalStatusFlags(props.part) : [];
  return (
    <div className="dw-fighter dw-battle-status-card" data-testid={props.sideTestId}>
      <p className="dw-battle-status-name">{props.name}</p>
      {props.part === null ? (
        <p className="dw-sub">状態データなし</p>
      ) : (
        <>
          <ResourceMeter
            label="耐久"
            current={props.part.currentDurability}
            max={props.part.maxDurability}
            testId={`${props.sideTestId}-durability`}
          />
          <ResourceMeter
            label="精神力"
            current={props.part.currentMental}
            max={props.part.maxMental}
            testId={`${props.sideTestId}-mental`}
          />
          {flags.length > 0 ? (
            <ul className="dw-badge-row" data-testid={`${props.sideTestId}-flags`}>
              {flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

export type BattleVersusStatusProps = {
  nameA: string;
  nameB: string;
  partA: BattleParticipantResources | null;
  partB: BattleParticipantResources | null;
  /** Final match summary: omit transient pose flags. */
  showFinalFlags?: boolean;
  rangeLabel?: string | null;
  testId: string;
  sideATestId?: string;
  sideBTestId?: string;
  compact?: boolean;
};

export function BattleVersusStatus(props: BattleVersusStatusProps) {
  return (
    <div
      className={
        props.compact === true
          ? "dw-versus dw-battle-status dw-battle-status-compact"
          : "dw-versus dw-battle-status"
      }
      data-testid={props.testId}
    >
      <SideCard
        name={props.nameA}
        part={props.partA}
        showFinalFlags={props.showFinalFlags !== false}
        sideTestId={props.sideATestId ?? `${props.testId}-a`}
      />
      <div className="dw-vs" aria-hidden="true">
        VS
        {props.rangeLabel !== undefined &&
        props.rangeLabel !== null &&
        props.rangeLabel.length > 0 ? (
          <div className="dw-sub">{props.rangeLabel}</div>
        ) : null}
      </div>
      <SideCard
        name={props.nameB}
        part={props.partB}
        showFinalFlags={props.showFinalFlags !== false}
        sideTestId={props.sideBTestId ?? `${props.testId}-b`}
      />
    </div>
  );
}

/** Build participant resources from ActionLog after-values + max from final participants. */
export function resourcesFromActionAfter(input: {
  sourceLog: Record<string, unknown> | null;
  actorIsA: boolean;
  maxA: BattleParticipantResources | null;
  maxB: BattleParticipantResources | null;
}): { partA: BattleParticipantResources | null; partB: BattleParticipantResources | null } {
  const log = input.sourceLog;
  if (log === null) {
    return { partA: null, partB: null };
  }
  const asInt = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const durA = asInt(input.actorIsA ? log.actorDurabilityAfter : log.targetDurabilityAfter);
  const menA = asInt(input.actorIsA ? log.actorMentalAfter : log.targetMentalAfter);
  const durB = asInt(input.actorIsA ? log.targetDurabilityAfter : log.actorDurabilityAfter);
  const menB = asInt(input.actorIsA ? log.targetMentalAfter : log.actorMentalAfter);
  const partA: BattleParticipantResources = {
    personId: input.maxA?.personId ?? null,
    currentDurability: durA,
    maxDurability: input.maxA?.maxDurability ?? null,
    currentMental: menA,
    maxMental: input.maxA?.maxMental ?? null,
    injury: null,
    fatigue: null,
    guarding: null,
    evading: null,
    canAct: null,
    surrendered: null,
    unableToContinue: null,
  };
  const partB: BattleParticipantResources = {
    personId: input.maxB?.personId ?? null,
    currentDurability: durB,
    maxDurability: input.maxB?.maxDurability ?? null,
    currentMental: menB,
    maxMental: input.maxB?.maxMental ?? null,
    injury: null,
    fatigue: null,
    guarding: null,
    evading: null,
    canAct: null,
    surrendered: null,
    unableToContinue: null,
  };
  return { partA, partB };
}
