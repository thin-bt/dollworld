import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PERSON_DETAIL_VIEW_KEYS, type PersonDetailView } from "./ui005-views.js";
import { loadPersonDetail } from "./fetch-ui005.js";
import { PersonDetailViewPanel } from "./PersonDetailView.js";
import { Shell } from "../Shell.js";

function successEnvelope(data: unknown): string {
  return JSON.stringify({
    apiSchemaVersion: "0.2.0",
    ok: true,
    data,
    uiRevision: 4,
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

const populatedDetail: PersonDetailView = {
  personId: "person_000001",
  displayName: "Alpha",
  sex: "female",
  lifeStatus: "living",
  participationStatus: "active",
  careerStatus: "trainee",
  birthYear: 1,
  age: 12,
  deathYear: null,
  ageAtDeath: null,
  familyId: "family_000001",
  lineageId: null,
  currentRank: null,
  highestRank: null,
  retirementRank: null,
  qualifiedMaster: false,
  parentPersonIds: ["person_000010"],
  formalMasterPersonIds: [],
  formalDisciplePersonIds: [],
  stats: {
    stamina: 1,
    strength: 2,
    skill: 3,
    speed: 4,
    spirit: 5,
    magic: 6,
  },
  aptitudes: { unarmed: 7, sword: 8, magic: 9 },
  temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
  currentMental: 50,
  learningFocusTechniqueId: null,
  statHistory: {
    stamina: { initial: 1, current: 1, last48WeeksDelta: 0, lastWeekDelta: 0 },
  },
  techniques: [
    {
      techniqueId: "technique_magic_basic",
      learnedState: "acquired",
      learningProgressTenths: 1000,
      masteryHundredths: 2000,
      successfulUseCount: 0,
      attemptedUseCount: 0,
      lastPracticedAbsoluteWeek: null,
      acquiredAbsoluteWeek: 0,
      definition: {
        techniqueId: "technique_magic_basic",
        name: "technique_magic_basic",
        category: "magic",
        mentalCost: 8,
        usableRanges: ["middle", "long"],
      },
    },
  ],
  trainingHistory: { available: true, items: [] },
};

const sparseDetail: PersonDetailView = {
  ...populatedDetail,
  personId: "person_000002",
  displayName: "Sparse",
  parentPersonIds: [],
  formalMasterPersonIds: [],
  learningFocusTechniqueId: null,
  techniques: [],
  trainingHistory: { available: true, items: [] },
  statHistory: null,
};

describe("FE-02 direct route and back navigation", () => {
  it("Shell person-detail route mounts exact personId page with keyboard back link", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "person-detail", personId: "person_000001" }} />,
    );
    expect(html).toContain('data-testid="person-detail-page"');
    expect(html).toContain("personId=person_000001");
    expect(html).toContain('data-testid="person-detail-back"');
    expect(html).toContain('href="/people"');
  });
});

describe("FE-02 fetch-ui005", () => {
  it("loads exact UI-005 endpoint for personId", async () => {
    let seen = "";
    const result = await loadPersonDetail({
      personId: "person_000001",
      fetchImpl: async (url) => {
        seen = url;
        return { status: 200, text: async () => successEnvelope(populatedDetail) };
      },
    });
    expect(seen).toBe("/api/s1_5/people/person_000001");
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.personId).toBe("person_000001");
      expect(Object.keys(result.data).sort()).toEqual([...PERSON_DETAIL_VIEW_KEYS].sort());
    }
  });

  it("fail-closed distinct API errors", async () => {
    for (const code of [
      "NOT_FOUND",
      "SESSION_REQUIRED",
      "SIMULATION_NOT_STARTED",
      "STALE_UI_REVISION",
    ] as const) {
      const result = await loadPersonDetail({
        personId: "person_000001",
        fetchImpl: async () => ({
          status: code === "NOT_FOUND" ? 404 : 409,
          text: async () => failureEnvelope(code, code.toLowerCase()),
        }),
      });
      expect(result.kind).toBe("failure");
      if (result.kind === "failure") {
        expect(result.code).toBe(code);
      }
    }
  });

  it("transport_error does not become success", async () => {
    const result = await loadPersonDetail({
      personId: "person_000001",
      fetchImpl: async () => {
        throw new Error("network");
      },
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.message).toBe("transport_error");
    }
  });
});

describe("FE-02 PersonDetailView sparse + populated + safe-text", () => {
  it("populated detail shows identity, 6 abilities, 3 aptitudes, sparse techniques", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000001"
        detail={{
          ...populatedDetail,
          currentRank: "C",
          highestRank: "B",
          retirementRank: null,
        }}
        errorText={null}
        errorCode={null}
        uiRevision={4}
      />,
    );
    expect(html).toContain('data-status="success"');
    expect(html).toContain("Alpha");
    expect(html).toContain('data-testid="person-detail-sex"');
    expect(html).toContain("女");
    expect(html).toContain("stamina");
    expect(html).toContain("unarmed");
    expect(html).toContain("基本魔法");
    expect(html).toContain("魔法");
    expect(html).toContain("中距離・遠距離");
    expect(html).toContain("精神消費");
    expect(html).toContain(">8<");
    expect(html).toContain("習得済");
    expect(html).toContain('data-technique-id="technique_magic_basic"');
    expect(html).not.toMatch(/data-testid="technique-primary-label">technique_magic_basic</);
    // Rank once in primary profile (rankbox); highest rank only in developer details.
    expect(html).toContain("現在段位");
    expect((html.match(/現在段位/g) ?? []).length).toBe(1);
    expect(html).not.toContain("最高段位");
    expect(html).toContain("<dt>highestRank</dt>");
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>");
  });

  it("sparse detail does not invent zero techniques or fake history rows", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000002"
        detail={sparseDetail}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(html).toContain('data-testid="person-detail-techniques"');
    expect(html).toContain("習得した技はまだありません");
    expect(html).not.toContain(">empty</");
    expect(html).not.toContain("technique_invented");
    expect(html).toContain('data-testid="person-detail-statHistory"');
    expect(html).not.toContain("<th>現在</th>");
    expect(html).toContain("能力の推移はまだありません");
    expect(html).not.toContain(">absent</");
  });

  it("error state is fail-closed and distinct", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="error"
        personId="person_000001"
        detail={null}
        errorText="NOT_FOUND: person not found"
        errorCode="NOT_FOUND"
        uiRevision={null}
      />,
    );
    expect(html).toContain('data-status="error"');
    expect(html).toContain('data-error-code="NOT_FOUND"');
    expect(html).not.toContain('data-status="success"');
  });

  it("safe-text escapes malicious displayName", () => {
    const evil = {
      ...populatedDetail,
      displayName: "<script>alert(1)</script>",
    };
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000001"
        detail={evil}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("FIX9: current mental is concise; training history uses Japanese labels", () => {
    const detail = {
      ...populatedDetail,
      currentMental: 92,
      stats: { ...populatedDetail.stats, spirit: 42 },
      trainingHistory: {
        available: true as const,
        items: [
          {
            worldDate: { year: 2, month: 3, weekOfMonth: 1 },
            trainingKind: "rest",
          },
          {
            worldDate: { year: 2, month: 2, weekOfMonth: 4 },
            trainingKind: "train_stat",
            targetStat: "stamina",
          },
          {
            worldDate: { year: 2, month: 2, weekOfMonth: 3 },
            trainingKind: "learn_technique",
          },
          {
            worldDate: { year: 2, month: 2, weekOfMonth: 2 },
            trainingKind: "practice_technique",
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000001"
        detail={detail}
        errorText={null}
        errorCode={null}
        uiRevision={4}
      />,
    );
    expect(html).toContain("現在精神力");
    expect(html).toContain("92");
    expect(html).toContain("92 / 92");
    expect(html).not.toContain("最大 = 50 + 精神");
    expect(html).not.toContain("戦闘中の耐久は試合開始時に算出される戦闘専用の値");
    expect(html).toContain("休養");
    expect(html).toContain("体力の修行");
    expect(html).toContain("技を覚える");
    expect(html).toContain("技を練る");
    expect(html).not.toMatch(/>rest</);
    expect(html).toContain("50 + spirit(42) = 92");
    expect(html).toContain(">精神<");
    expect(html).not.toContain("精神（能力）");
    expect(html).toContain("格闘");
    expect(html).toContain("剣技");
    expect(html).not.toContain(">素手<");
  });
});

describe("FE-02 PersonDetail mentorship visibility", () => {
  it("shows qualified-master state and formal-master links in ordinary UI", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000003"
        detail={{
          ...populatedDetail,
          personId: "person_000003",
          careerStatus: "retired",
          qualifiedMaster: true,
          formalMasterPersonIds: ["person_000099", "person_000100"],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={4}
        personNameById={{
          person_000099: "師範・アルファ",
          person_000100: "師範・ベータ",
        }}
      />,
    );
    expect(html).toContain('data-testid="person-detail-mentorship"');
    expect(html).toContain("師弟関係");
    expect(html).toContain('data-testid="person-detail-qualified-master"');
    expect(html).toContain('data-qualified-master="true"');
    expect(html).toContain("師範資格");
    expect(html).toContain(">あり<");
    expect(html).toContain('data-testid="person-detail-formal-masters"');
    expect(html).toContain('href="/people/person_000099"');
    expect(html).toContain('href="/people/person_000100"');
    expect(html).toContain('data-person-id="person_000099"');
    expect(html).toContain('data-person-id="person_000100"');
    expect(html).toContain(">師範・アルファ<");
    expect(html).toContain(">師範・ベータ<");
    expect(html).toMatch(
      /data-testid="person-detail-formal-masters"[\s\S]*?>師範・アルファ<[\s\S]*?>師範・ベータ</,
    );
    expect(html).not.toContain('data-qualified-master="false"');
  });

  it("formal-master links keep personId href when display names are not yet loaded", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000003"
        detail={{
          ...populatedDetail,
          formalMasterPersonIds: ["person_000099"],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(html).toContain('href="/people/person_000099"');
    expect(html).toContain('data-person-id="person_000099"');
    expect(html).toContain(">person_000099<");
  });

  it("empty mentorship shows なし without inventing masters or misleading labels", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000002"
        detail={{
          ...sparseDetail,
          qualifiedMaster: false,
          formalMasterPersonIds: [],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(html).toContain('data-qualified-master="false"');
    expect(html).toContain('data-testid="person-detail-formal-masters"');
    expect(html).toContain('data-empty="true">なし</span>');
    expect(html).not.toContain('data-testid="person-detail-formal-master-link"');
    expect(html).not.toContain(">あり<");
    expect(html).not.toContain('href="/people/');
  });

  it("shows formal-disciple links for qualified master with zero/one/many disciples", () => {
    const noneHtml = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000010"
        detail={{
          ...sparseDetail,
          qualifiedMaster: true,
          formalMasterPersonIds: [],
          formalDisciplePersonIds: [],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(noneHtml).toContain('data-testid="person-detail-formal-disciples"');
    expect(noneHtml).toMatch(
      /data-testid="person-detail-formal-disciples"[\s\S]*data-empty="true">なし/,
    );
    expect(noneHtml).not.toContain('data-testid="person-detail-formal-disciple-link"');

    const oneHtml = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000010"
        detail={{
          ...sparseDetail,
          qualifiedMaster: true,
          formalDisciplePersonIds: ["person_000020"],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={1}
        personNameById={{ person_000020: "門下・一" }}
      />,
    );
    expect(oneHtml).toContain('href="/people/person_000020"');
    expect(oneHtml).toContain('data-person-id="person_000020"');
    expect(oneHtml).toContain(">門下・一<");

    const manyHtml = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000010"
        detail={{
          ...sparseDetail,
          qualifiedMaster: true,
          formalDisciplePersonIds: ["person_000021", "person_000022"],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={1}
        personNameById={{
          person_000021: "門下・二",
          person_000022: "門下・三",
        }}
      />,
    );
    expect(manyHtml).toMatch(
      /data-testid="person-detail-formal-disciples"[\s\S]*?>門下・二<[\s\S]*?>門下・三</,
    );
  });

  it("formal-disciple links keep personId href when display names are not yet loaded", () => {
    const html = renderToStaticMarkup(
      <PersonDetailViewPanel
        status="success"
        personId="person_000010"
        detail={{
          ...sparseDetail,
          formalDisciplePersonIds: ["person_000020"],
        }}
        errorText={null}
        errorCode={null}
        uiRevision={1}
      />,
    );
    expect(html).toContain('href="/people/person_000020"');
    expect(html).toContain('data-person-id="person_000020"');
    expect(html).toContain(">person_000020<");
  });
});

describe("FE-02 static audit", () => {
  it("no portrait/family-tree/tournament leakage on person detail route shell", () => {
    const html = renderToStaticMarkup(
      <Shell sessionState="ready" route={{ kind: "person-detail", personId: "person_000001" }} />,
    );
    expect(html).not.toContain("portrait");
    expect(html).not.toContain("family-tree");
    expect(html).not.toContain("tournament history");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });
});
