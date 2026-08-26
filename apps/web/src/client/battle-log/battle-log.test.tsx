import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Shell } from "../Shell.js";
import { MOCK_BATTLE_VIEW_KEYS, type MockBattleView } from "../mock-battle/ui006-views.js";
import { loadBattleLogPage } from "./fetch-ui007.js";
import { BattleLogViewPanel } from "./BattleLogView.js";
import { BATTLE_LOG_ITEM_VIEW_KEYS, type BattleLogItemView } from "./ui007-views.js";

function successEnvelope(data: unknown, uiRevision = 2): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data,
    uiRevision,
    isUpdating: false,
  });
}

function failureEnvelope(code: string, message: string): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: false,
    error: { code, message, commitState: "none" },
    uiRevision: null,
    isUpdating: false,
    refreshRequired: false,
  });
}

function sampleItem(seq: number): BattleLogItemView {
  const item = Object.fromEntries(
    BATTLE_LOG_ITEM_VIEW_KEYS.map((key) => [key, null]),
  ) as BattleLogItemView;
  item.sequenceInBattle = seq;
  item.actionSequence = seq;
  item.turnNumber = 1;
  item.actorPersonId = "person_000001";
  item.actorSide = "sideA";
  item.requestedAction = { kind: "basic_attack", profile: "unarmed" };
  item.resolvedAction = { kind: "basic_attack", profile: "unarmed" };
  item.techniqueId = null;
  item.hit = true;
  item.damage = 10;
  item.priority = 0;
  item.rangeBefore = "close";
  item.rangeAfter = "close";
  item.injuryResult = "none";
  item.sourceLogEntry = {
    actorDurabilityBefore: 80,
    actorDurabilityAfter: 80,
    actorMentalBefore: 50,
    actorMentalAfter: 50,
    targetDurabilityBefore: 73,
    targetDurabilityAfter: 63,
    targetMentalBefore: 40,
    targetMentalAfter: 40,
    inBattleConsumptionBefore: 10,
    inBattleConsumptionAfter: 18,
    damage: 10,
    hit: true,
    rangeBefore: "close",
    rangeAfter: "close",
    injuryResult: "none",
  };
  return item;
}

function sampleSummary(): MockBattleView {
  const base = Object.fromEntries(
    MOCK_BATTLE_VIEW_KEYS.map((key) => [key, null]),
  ) as MockBattleView;
  return {
    ...base,
    resultUiRevision: 2,
    sourceWorldUiRevision: 1,
    battleResultSchemaVersion: "0.5.0",
    matchId: "match_1",
    simulationId: "simulation_x",
    battleKind: "mock",
    participantAPersonId: "person_000001",
    participantBPersonId: "person_000002",
    battleSeed: 9,
    resultKind: "completed",
    winnerPersonId: "person_000001",
    loserPersonId: "person_000002",
    endReason: "ko",
    judgeScore: null,
    finalRngState: { counter: 1 },
    logTotalCount: 2,
    replayAvailable: true,
    finalState: {
      status: "completed",
      participantA: {
        personId: "person_000001",
        currentDurability: 80,
        maxDurability: 100,
        currentMental: 45,
        maxMental: 50,
        injury: 0,
        guarding: false,
        evading: false,
        canAct: true,
        surrendered: false,
        unableToContinue: false,
      },
      participantB: {
        personId: "person_000002",
        currentDurability: 0,
        maxDurability: 100,
        currentMental: 20,
        maxMental: 50,
        injury: 12,
        guarding: true,
        evading: true,
        canAct: false,
        surrendered: false,
        unableToContinue: false,
      },
    },
  };
}

describe("FE-04 /mock-battle/result route", () => {
  it("direct result route mounts battle log page with back link", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle-result" }} />,
    );
    expect(html).toContain('data-testid="battle-log-page"');
    expect(html).toContain('data-testid="battle-log-back"');
    expect(html).toContain('href="/mock-battle"');
  });
});

describe("FE-04 fetch-ui007", () => {
  it("loads API-015 and preserves item key set / order", async () => {
    let seen = "";
    const items = [sampleItem(1), sampleItem(2)];
    const result = await loadBattleLogPage({
      cursor: null,
      limit: 100,
      fetchImpl: async (url) => {
        seen = url;
        return {
          status: 200,
          text: async () =>
            successEnvelope({
              items,
              totalCount: 2,
              nextCursor: null,
              resultUiRevision: 2,
            }),
        };
      },
    });
    expect(seen).toContain("/api/s1_5/mock-battles/latest/log?");
    expect(seen).toContain("limit=100");
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.items.map((i) => i.sequenceInBattle)).toEqual([1, 2]);
      expect(Object.keys(result.data.items[0]!).sort()).toEqual(
        [...BATTLE_LOG_ITEM_VIEW_KEYS].sort(),
      );
    }
  });

  it("fail-closed for STALE_CURSOR / SESSION_REQUIRED", async () => {
    for (const code of ["STALE_CURSOR", "SESSION_REQUIRED"] as const) {
      const result = await loadBattleLogPage({
        cursor: "x",
        fetchImpl: async () => ({
          status: 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(result.kind).toBe("failure");
      if (result.kind === "failure") {
        expect(result.code).toBe(code);
      }
    }
  });
});

describe("FE-04 BattleLogView grouping / sparse / safe-text", () => {
  it("renders actor/requested/outcome groups with human-readable labels", () => {
    const html = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="success"
        summary={sampleSummary()}
        summaryError={null}
        summaryErrorCode={null}
        logStatus="success"
        logItems={[sampleItem(1), sampleItem(2)]}
        logTotalCount={2}
        logError={null}
        logErrorCode={null}
        canNext={false}
        onNext={() => undefined}
        personNameById={{ person_000001: "勝者花子", person_000002: "敗者太郎" }}
      />,
    );
    expect(html).toContain('data-testid="battle-log-actor-0"');
    expect(html).toContain('data-testid="battle-log-requested-resolved-0"');
    expect(html).toContain('data-testid="battle-log-outcome-0"');
    expect(html).toContain("勝者花子");
    expect(html).toContain("<strong>勝者花子</strong>");
    expect(html).toContain("基本攻撃（格闘）");
    expect(html).toContain("命中");
    expect(html).toContain("耐久 73 → 63");
    expect(html).toContain("近距離");
    expect(html).toContain("先手（通常の行動順）");
    expect(html).toContain("精神力");
    expect(html).toContain('data-testid="battle-participant-status"');
    expect(html).toContain('data-testid="battle-status-a-durability"');
    expect(html).toContain("80 / 100");
    expect(html).toContain('data-testid="battle-log-turn-1"');
    expect(html).toContain('data-testid="battle-log-turn-state-1"');
    expect(html).toContain('data-testid="battle-log-terminal"');
    expect(html).toContain("負傷なし");
    expect(html).not.toContain("防御中");
    expect(html).not.toContain("回避中");
    expect(html).toContain('data-testid="battle-log-next"');
    expect(html).toMatch(/data-testid="battle-log-next"[^>]*disabled/);
    expect(html).toContain('data-testid="battle-log-items-dev"');
    expect(html).toContain("sideA");
    expect(html).toContain("—"); // judge unset
    expect(html).toContain("<details>");
    expect(html).not.toContain('class="dw-event-item"');
    expect(html.indexOf('data-sequence="1"')).toBeLessThan(html.indexOf('data-sequence="2"'));
  });

  it("shows battle-start profiles and localizes activation_roll_failed with chance/roll", () => {
    const failed = sampleItem(3);
    failed.resolvedAction = { kind: "use_technique", techniqueId: "technique_magic_basic" };
    failed.requestedAction = failed.resolvedAction;
    failed.techniqueId = "technique_magic_basic";
    failed.activationSucceeded = false;
    failed.activationFailureReason = "activation_roll_failed";
    failed.activationChance = 35;
    failed.activationRoll = 90;
    failed.hit = null;
    failed.damage = null;
    failed.rangeBefore = "long";
    failed.rangeAfter = "long";
    failed.strategyCandidateScores = [
      { action: { kind: "basic_attack", profile: "magic" }, score: 1200 },
      { action: { kind: "approach" }, score: 80 },
    ];

    const detailA = {
      personId: "person_000001",
      displayName: "勝者花子",
      sex: "female",
      lifeStatus: "living",
      participationStatus: "active",
      careerStatus: "active_competitor",
      birthYear: 1,
      age: 20,
      deathYear: null,
      ageAtDeath: null,
      familyId: "f1",
      lineageId: null,
      currentRank: "C",
      highestRank: "C",
      retirementRank: null,
      qualifiedMaster: false,
      parentPersonIds: [],
      formalMasterPersonIds: [],
      stats: {
        stamina: 30,
        strength: 40,
        skill: 20,
        speed: 15,
        spirit: 10,
        magic: 5,
      },
      aptitudes: { unarmed: 50, sword: 10, magic: 5 },
      temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
      currentMental: 50,
      learningFocusTechniqueId: null,
      statHistory: null,
      techniques: [
        {
          techniqueId: "technique_alpha",
          learnedState: "acquired",
          masteryHundredths: 2000,
          definition: { category: "unarmed", mentalCost: 5, usableRanges: ["contact", "close"] },
        },
      ],
      trainingHistory: { available: true, items: [] },
    };

    const html = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="success"
        summary={sampleSummary()}
        summaryError={null}
        summaryErrorCode={null}
        logStatus="success"
        logItems={[failed]}
        logTotalCount={1}
        logError={null}
        logErrorCode={null}
        canNext={false}
        onNext={() => undefined}
        personNameById={{ person_000001: "勝者花子", person_000002: "敗者太郎" }}
        participantADetail={detailA as never}
        participantBDetail={detailA as never}
        participantADetailStatus="success"
        participantBDetailStatus="success"
        participantADetailError={null}
        participantBDetailError={null}
      />,
    );
    expect(html).toContain('data-testid="battle-start-profiles"');
    expect(html).toContain('data-testid="battle-start-profile-comparison"');
    expect(html).toContain("格闘");
    expect(html).toContain("基本格闘");
    expect(html).not.toContain("開始耐久");
    expect(html).toContain("発動判定に失敗（出目 90 / 成功上限 35%）。命中判定は行われていません");
    expect(html).toContain('data-testid="battle-log-items-dev"');
    expect(html).toContain("strategyCandidateScores");
    expect(html).not.toMatch(/技を使う（technique_magic_basic）/);
  });

  it("enables next when canNext is true", () => {
    const html = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="success"
        summary={sampleSummary()}
        summaryError={null}
        summaryErrorCode={null}
        logStatus="success"
        logItems={[sampleItem(1)]}
        logTotalCount={20}
        logError={null}
        logErrorCode={null}
        canNext={true}
        onNext={() => undefined}
      />,
    );
    expect(html).toContain('data-testid="battle-log-next"');
    expect(html).toContain('aria-disabled="false"');
    expect(html).not.toMatch(/data-testid="battle-log-next"[^>]*\sdisabled(=|\s|>)/);
  });

  it("distinguishes no-latest empty from error", () => {
    const empty = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="empty"
        summary={null}
        summaryError={null}
        summaryErrorCode={null}
        logStatus="empty"
        logItems={[]}
        logTotalCount={0}
        logError={null}
        logErrorCode={null}
        canNext={false}
        onNext={() => undefined}
      />,
    );
    expect(empty).toContain('data-status="empty"');
    const error = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="error"
        summary={null}
        summaryError="INTERNAL_ERROR: corrupt"
        summaryErrorCode="INTERNAL_ERROR"
        logStatus="error"
        logItems={[]}
        logTotalCount={0}
        logError="INTERNAL_ERROR: corrupt"
        logErrorCode="INTERNAL_ERROR"
        canNext={false}
        onNext={() => undefined}
      />,
    );
    expect(error).toContain('data-status="error"');
    expect(error).not.toContain('data-status="success"');
  });

  it("safe-text escapes malicious actor id", () => {
    const evil = sampleItem(1);
    evil.actorPersonId = "<script>alert(1)</script>";
    const html = renderToStaticMarkup(
      <BattleLogViewPanel
        summaryStatus="success"
        summary={sampleSummary()}
        summaryError={null}
        summaryErrorCode={null}
        logStatus="success"
        logItems={[evil]}
        logTotalCount={1}
        logError={null}
        logErrorCode={null}
        canNext={false}
        onNext={() => undefined}
      />,
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("static audit: no domain calculator / event insertion / FE-05", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle-result" }} />,
    );
    expect(html).not.toContain("dangerouslySetInnerHTML");
    expect(html).not.toContain("/api/s1_5/events");
    expect(html).not.toContain("validation-results");
  });
});
