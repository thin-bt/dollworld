import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Shell } from "../Shell.js";
import type { PersonDetailView } from "../person-detail/ui005-views.js";
import { loadMockBattleLatest, postMockBattle, postMockBattleReplay } from "./fetch-ui006.js";
import { MockBattleViewPanel, type MockBattleViewProps } from "./MockBattleView.js";
import { MOCK_BATTLE_VIEW_KEYS, type MockBattleView } from "./ui006-views.js";

function sampleDetail(
  overrides: Partial<PersonDetailView> & Pick<PersonDetailView, "personId" | "displayName">,
): PersonDetailView {
  return {
    sex: "female",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "active_competitor",
    birthYear: 1,
    age: 20,
    deathYear: null,
    ageAtDeath: null,
    familyId: "family_1",
    lineageId: null,
    currentRank: "D",
    highestRank: "D",
    retirementRank: null,
    qualifiedMaster: false,
    parentPersonIds: [],
    formalMasterPersonIds: [],
    stats: {
      stamina: 10,
      strength: 11,
      skill: 12,
      speed: 13,
      spirit: 14,
      magic: 15,
    },
    aptitudes: { unarmed: 20, sword: 21, magic: 22 },
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    currentMental: 50,
    learningFocusTechniqueId: null,
    statHistory: null,
    techniques: [],
    trainingHistory: { available: true, items: [] },
    ...overrides,
  };
}

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
    uiRevision: 1,
    isUpdating: false,
    refreshRequired: false,
  });
}

function sampleView(overrides: Partial<MockBattleView> = {}): MockBattleView {
  const base: MockBattleView = {
    resultUiRevision: 2,
    sourceWorldUiRevision: 1,
    battleResultSchemaVersion: "0.5.0",
    matchId: "match_1",
    simulationId: "simulation_x",
    battleKind: "mock",
    participantAPersonId: "person_000001",
    participantBPersonId: "person_000002",
    participantAActionSourceIdentity: {},
    participantBActionSourceIdentity: {},
    participantSourceSnapshotHashes: {},
    sourceWorldDate: { year: 1, month: 1, week: 1 },
    battleSeed: 9,
    resultKind: "completed",
    winnerPersonId: "person_000001",
    loserPersonId: "person_000002",
    endReason: "ko",
    endReasonIsJudgeDecision: false,
    judgementApplied: false,
    judgeScore: null,
    turnsExecuted: 3,
    battleInputHash: "a".repeat(64),
    runRuleSnapshotHash: "b".repeat(64),
    sprint1ConfigVersion: "0.1.0",
    sprint1ConfigHash: "c".repeat(64),
    techniqueCatalogDataVersion: "0.1.0",
    techniqueCatalogHash: "d".repeat(64),
    finalState: {},
    finalRngState: { counter: 1 },
    failure: null,
    eventCandidates: [],
    validation: null,
    logTotalCount: 2,
    replayAvailable: true,
  };
  return { ...base, ...overrides };
}

function viewProps(overrides: Partial<MockBattleViewProps> = {}): MockBattleViewProps {
  return {
    candidatesStatus: "success",
    candidates: [
      {
        personId: "person_000001",
        displayName: "A",
        age: 20,
        careerStatus: "trainee",
      },
      {
        personId: "person_000002",
        displayName: "B",
        age: 21,
        careerStatus: "trainee",
      },
    ],
    candidatesError: null,
    participantAId: "person_000001",
    participantBId: "person_000002",
    participantASummaryStatus: "idle",
    participantBSummaryStatus: "idle",
    participantADetail: null,
    participantBDetail: null,
    participantASummaryError: null,
    participantBSummaryError: null,
    samePersonBlocked: false,
    actionPending: false,
    actionError: null,
    actionErrorCode: null,
    latestStatus: "idle",
    latestError: null,
    trustedResult: null,
    replayAvailable: false,
    onParticipantAChange: () => undefined,
    onParticipantBChange: () => undefined,
    onRun: () => undefined,
    onReplay: () => undefined,
    onLatest: () => undefined,
    ...overrides,
  };
}

describe("FE-03 /mock-battle route", () => {
  it("Shell 模擬戦 menu reaches /mock-battle", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle" }} />,
    );
    expect(html).toContain('href="/mock-battle"');
    expect(html).toContain('data-menu-item="模擬戦"');
    expect(html).toContain('data-testid="mock-battle-page"');
    expect(html).toContain('data-menu-active="true"');
  });

  it("preserves A/B candidate order in selectors with human-readable labels", () => {
    const html = renderToStaticMarkup(<MockBattleViewPanel {...viewProps()} />);
    const aIdx = html.indexOf("A · 20歳 · 修行中");
    const bIdx = html.indexOf("B · 21歳 · 修行中");
    expect(aIdx).toBeGreaterThan(-1);
    expect(bIdx).toBeGreaterThan(aIdx);
  });

  it("uses peer participant selector layout instead of VS 3-column grid", () => {
    const html = renderToStaticMarkup(<MockBattleViewPanel {...viewProps()} />);
    expect(html).toContain('data-testid="mock-participant-selectors"');
    expect(html).toContain('class="dw-participant-selectors"');
    expect(html).not.toMatch(/data-testid="mock-participant-selectors"[^>]*class="dw-versus"/);
    expect(html).not.toMatch(/class="dw-versus"[^>]*data-testid="mock-participant-selectors"/);
    const selectorsIdx = html.indexOf('data-testid="mock-participant-selectors"');
    const versusBeforeComparison = html.indexOf('class="dw-versus"', selectorsIdx + 1);
    expect(versusBeforeComparison).toBe(-1);
    expect(html).toContain('data-testid="mock-participant-a"');
    expect(html).toContain('data-testid="mock-participant-b"');
    expect(html).toContain("参加者 A");
    expect(html).toContain("参加者 B");
  });

  it("shows compact A/B combat summaries with Japanese aptitudes, stats, and techniques", () => {
    const detailA = sampleDetail({
      personId: "person_000001",
      displayName: "A",
      currentRank: "C",
      stats: {
        stamina: 30,
        strength: 40,
        skill: 25,
        speed: 20,
        spirit: 15,
        magic: 10,
      },
      aptitudes: { unarmed: 5, sword: 40, magic: 8 },
      techniques: [
        {
          techniqueId: "technique_sword_basic",
          learnedState: "acquired",
          masteryHundredths: 2000,
          definition: {
            category: "sword",
            mentalCost: 5,
            usableRanges: ["close", "middle"],
          },
        },
      ],
    });
    const detailB = sampleDetail({
      personId: "person_000002",
      displayName: "B",
      currentRank: null,
      careerStatus: "trainee",
      stats: {
        stamina: 12,
        strength: 10,
        skill: 11,
        speed: 18,
        spirit: 35,
        magic: 42,
      },
      aptitudes: { unarmed: 7, sword: 6, magic: 45 },
      techniques: [
        {
          techniqueId: "technique_magic_basic",
          learnedState: "acquired",
          masteryHundredths: 2000,
          definition: {
            category: "magic",
            mentalCost: 8,
            usableRanges: ["middle", "long"],
          },
        },
      ],
    });
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          participantASummaryStatus: "success",
          participantBSummaryStatus: "success",
          participantADetail: detailA,
          participantBDetail: detailB,
        })}
      />,
    );
    expect(html).toContain('data-testid="mock-combat-profile-comparison"');
    expect(html).toContain('data-testid="mock-combat-profile-comparison-table"');
    expect(html).toContain("戦闘プロファイル比較");
    expect(html).toContain('data-testid="mock-combat-profile-comparison-a-rank"');
    expect(html).toContain(">C<");
    expect(html).toContain("段位なし");
    expect(html).toContain("格闘");
    expect(html).toContain("剣技");
    expect(html).toContain("魔法");
    expect(html).toContain("体力");
    expect(html).toContain("筋力");
    expect(html).toContain("基本剣技");
    expect(html).toContain("基本魔法");
    expect(html).not.toContain('data-testid="mock-participant-a-summary"');
    expect(html).not.toContain('class="dw-vs"');
    expect(html).toContain("比較サマリーで確認できます");
  });

  it("same-person validation blocks without pointer-only UI", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          participantAId: "person_000001",
          participantBId: "person_000001",
          samePersonBlocked: true,
        })}
      />,
    );
    expect(html).toContain('data-validation="same-person"');
    expect(html).toContain('data-testid="mock-battle-run"');
    expect(html).toMatch(/data-testid="mock-battle-run"[^>]*disabled/);
  });

  it("shows a two-person selection hint while run is blocked for missing picks", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel {...viewProps({ participantAId: "", participantBId: "" })} />,
    );
    expect(html).toContain('data-testid="mock-select-two-hint"');
    expect(html).toMatch(/data-testid="mock-battle-run"[^>]*disabled/);
  });

  it("shows empty-candidate copy without implying world auto-advance", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel {...viewProps({ candidatesStatus: "empty", candidates: [] })} />,
    );
    expect(html).toContain("現在の世界日時では模擬戦候補がいません");
    expect(html).toContain("自動では進みません");
    expect(html).not.toContain("模擬戦の対象年齢まで世界を進めています");
  });

  it("shows one-candidate copy without world auto-advance", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          candidatesStatus: "success",
          candidates: [
            {
              personId: "person_000001",
              displayName: "A",
              age: 40,
              careerStatus: "active_competitor",
            },
          ],
        })}
      />,
    );
    expect(html).toContain('data-testid="mock-candidates-one-only"');
    expect(html).toContain("現在の候補は1人だけです");
    expect(html).not.toContain("模擬戦の対象年齢まで世界を進めています");
  });

  it("FIX7: mock result leads with names and Japanese outcome, not completed/null", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          trustedResult: sampleView({ endReason: "knockout", judgeScore: null }),
          latestStatus: "success",
        })}
      />,
    );
    expect(html).toContain('data-testid="mock-battle-outcome"');
    expect(html).toContain("A が B に勝ちました");
    expect(html).toContain("ノックアウト");
    expect(html).toContain("勝者");
    expect(html).toContain("—");
    expect(html).not.toMatch(/class="dw-sub">completed/);
    expect(html).not.toContain(">null<");
  });

  it("FIX9: replay label is same-seed reproduction; inline result uses compact bars", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          trustedResult: sampleView({
            endReason: "knockout",
            finalState: {
              participantA: {
                currentDurability: 40,
                maxDurability: 100,
                currentMental: 80,
                maxMental: 100,
                injury: "none",
                guarding: false,
                evading: false,
              },
              participantB: {
                currentDurability: 0,
                maxDurability: 100,
                currentMental: 55,
                maxMental: 100,
                injury: "none",
                guarding: false,
                evading: false,
              },
            },
          }),
          latestStatus: "success",
          replayAvailable: true,
        })}
      />,
    );
    expect(html).toContain("同じseedで再現");
    expect(html).not.toContain("同じ条件で再実行");
    expect(html).toContain('data-testid="mock-battle-final-state"');
    expect(html).toContain('data-testid="mock-final-a-durability"');
    expect(html).toContain('data-testid="mock-final-a-mental"');
    expect(html).toContain("battleSeed");
    expect(html).toContain(">9<");
  });

  it("does not use year-advance loading copy for ordinary candidate loading", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          candidatesStatus: "loading",
          candidatesLoadingText: "候補を読み込み中…",
        })}
      />,
    );
    expect(html).toContain("候補を読み込み中…");
    expect(html).not.toContain("模擬戦の対象年齢まで世界を進めています");
  });
});

describe("FE-03 fetch-ui006 API binding", () => {
  it("run posts API-012 only with ordered participants", async () => {
    let seen = "";
    let body = "";
    const mutation = {
      acceptedUiRevision: 1,
      completedUiRevision: 2,
      replay: false,
      durationMs: 1,
      result: sampleView(),
    };
    const result = await postMockBattle({
      csrfToken: "csrf",
      expectedUiRevision: 1,
      participantAId: "person_000001",
      participantBId: "person_000002",
      requestId: "00000000-0000-4000-8000-000000000001",
      fetchImpl: async (url, init) => {
        seen = `${init?.method ?? "GET"} ${url}`;
        body = init?.body ?? "";
        return { status: 200, text: async () => successEnvelope(mutation, 2) };
      },
    });
    expect(seen).toBe("POST /api/s1_5/mock-battles");
    expect(body).toContain('"participantAId":"person_000001"');
    expect(body).toContain('"participantBId":"person_000002"');
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(Object.keys(result.data.result).sort()).toEqual([...MOCK_BATTLE_VIEW_KEYS].sort());
    }
  });

  it("replay posts API-013 and never /mock-battles run path", async () => {
    const urls: string[] = [];
    const mutation = {
      acceptedUiRevision: 2,
      completedUiRevision: 3,
      replay: true,
      durationMs: 1,
      result: sampleView(),
    };
    await postMockBattleReplay({
      csrfToken: "csrf",
      expectedUiRevision: 2,
      fetchImpl: async (url, init) => {
        urls.push(`${init?.method ?? "GET"} ${url}`);
        return { status: 200, text: async () => successEnvelope(mutation, 3) };
      },
    });
    expect(urls).toEqual(["POST /api/s1_5/mock-battles/replay"]);
    expect(urls.some((u) => u === "POST /api/s1_5/mock-battles")).toBe(false);
  });

  it("latest distinguishes NOT_FOUND empty from other errors", async () => {
    const empty = await loadMockBattleLatest({
      fetchImpl: async () => ({
        status: 404,
        text: async () => failureEnvelope("NOT_FOUND", "no latest"),
      }),
    });
    expect(empty.kind).toBe("failure");
    if (empty.kind === "failure") {
      expect(empty.code).toBe("NOT_FOUND");
    }
    const session = await loadMockBattleLatest({
      fetchImpl: async () => ({
        status: 401,
        text: async () => failureEnvelope("SESSION_REQUIRED", "session cookie is required"),
      }),
    });
    expect(session.kind).toBe("failure");
    if (session.kind === "failure") {
      expect(session.code).toBe("SESSION_REQUIRED");
    }
  });

  it("422 pre-start failure remains fail-closed", async () => {
    const result = await postMockBattle({
      csrfToken: "csrf",
      expectedUiRevision: 1,
      participantAId: "person_000001",
      participantBId: "person_000002",
      fetchImpl: async () => ({
        status: 422,
        text: async () =>
          failureEnvelope("BATTLE_PRE_START_FAILURE", "pre-start validation failed"),
      }),
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.code).toBe("BATTLE_PRE_START_FAILURE");
    }
  });
});

describe("FE-03 presentation / safe-text / static audit", () => {
  it("pending disables conflicting actions", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel {...viewProps({ actionPending: true, replayAvailable: true })} />,
    );
    expect(html).toContain('data-status="pending"');
    expect(html).toMatch(/data-testid="mock-battle-run"[^>]*disabled/);
    expect(html).toMatch(/data-testid="mock-battle-replay"[^>]*disabled/);
  });

  it("safe-text escapes malicious winner id text", () => {
    const html = renderToStaticMarkup(
      <MockBattleViewPanel
        {...viewProps({
          trustedResult: sampleView({
            winnerPersonId: "<img src=x onerror=alert(1)>",
          }),
        })}
      />,
    );
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
  });

  it("no seed/rule controls or FE-05/06 leakage", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "mock-battle" }} />,
    );
    expect(html).not.toContain("battleSeed input");
    expect(html).not.toContain("/api/s1_5/events");
    expect(html).not.toContain("validation-results");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });
});
