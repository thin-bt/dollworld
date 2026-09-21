import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Sprint3 S03-045 — browser evidence for ordinary Person Detail 師弟関係 (S03-044).
 * Uses accepted tiny preset + API discovery; asserts only user-visible test ids.
 */

const ACCEPTED_START_SEED = 42;
const SEED_SCAN_MAX = 80;

type BrowserJson = {
  ok?: boolean;
  status: number;
  body: {
    ok?: boolean;
    uiRevision?: number;
    data?: Record<string, unknown>;
  };
};

type MentorshipFixture = {
  seed: number;
  qualifiedTrueId: string | null;
  qualifiedFalseId: string;
  formalMasterDiscipleId: string | null;
  emptyFormalMasterId: string;
};

async function browserJson(
  page: Page,
  input: { url: string; method?: string; csrf?: string; body?: unknown },
): Promise<BrowserJson> {
  return page.evaluate(async (spec) => {
    const headers: Record<string, string> = {};
    if (spec.method === "POST") {
      headers["content-type"] = "application/json";
    }
    if (typeof spec.csrf === "string" && spec.csrf.length > 0) {
      headers["x-dollworld-csrf"] = spec.csrf;
    }
    const response = await fetch(spec.url, {
      method: spec.method ?? "GET",
      credentials: "same-origin",
      headers,
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: (await response.json()) as BrowserJson["body"],
    };
  }, input);
}

async function sessionCsrf(page: Page): Promise<{ csrf: string; uiRevision: number }> {
  const session = await browserJson(page, { url: "/api/s1_5/session" });
  expect(session.ok).toBe(true);
  const csrf = typeof session.body.data?.csrfToken === "string" ? session.body.data.csrfToken : "";
  expect(csrf.length).toBeGreaterThan(0);
  return { csrf, uiRevision: session.body.uiRevision ?? 0 };
}

async function bootstrapAcceptedSession(
  page: Page,
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  await context.clearCookies();
  await page.goto("/");
  await expect(page.getByTestId("ui001-shell")).toBeVisible();
}

async function resetSession(page: Page): Promise<void> {
  const { csrf, uiRevision } = await sessionCsrf(page);
  const reset = await browserJson(page, {
    url: "/api/s1_5/simulation/reset",
    method: "POST",
    csrf,
    body: {
      requestId: randomUUID(),
      expectedUiRevision: uiRevision,
    },
  });
  expect(reset.ok).toBe(true);
}

async function startTinyPreset(page: Page, seed: number): Promise<void> {
  await resetSession(page);
  const { csrf, uiRevision } = await sessionCsrf(page);
  const start = await browserJson(page, {
    url: "/api/s1_5/simulation/start",
    method: "POST",
    csrf,
    body: {
      requestId: randomUUID(),
      expectedUiRevision: uiRevision,
      presetId: "sprint1-tiny-accepted",
      seed,
    },
  });
  expect(start.ok).toBe(true);
  await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
    timeout: 120_000,
  });
}

async function listPersonIds(page: Page): Promise<string[]> {
  const peopleApi = await browserJson(page, { url: "/api/s1_5/people?limit=50" });
  expect(peopleApi.ok).toBe(true);
  const items = Array.isArray(peopleApi.body.data?.items) ? peopleApi.body.data.items : [];
  const ids: string[] = [];
  for (const item of items) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as { personId?: unknown }).personId === "string"
    ) {
      ids.push((item as { personId: string }).personId);
    }
  }
  expect(ids.length).toBeGreaterThan(0);
  return ids;
}

async function fetchMentorshipFields(
  page: Page,
  personId: string,
): Promise<{ qualifiedMaster: boolean; formalMasterPersonIds: string[] } | null> {
  const detail = await browserJson(page, {
    url: `/api/s1_5/people/${encodeURIComponent(personId)}`,
  });
  if (detail.ok !== true || detail.body.ok !== true) {
    return null;
  }
  const data = detail.body.data;
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const row = data as { qualifiedMaster?: unknown; formalMasterPersonIds?: unknown };
  if (typeof row.qualifiedMaster !== "boolean" || !Array.isArray(row.formalMasterPersonIds)) {
    return null;
  }
  const formalMasterPersonIds = row.formalMasterPersonIds.filter(
    (id): id is string => typeof id === "string",
  );
  return { qualifiedMaster: row.qualifiedMaster, formalMasterPersonIds };
}

async function discoverMentorshipFixture(page: Page): Promise<MentorshipFixture> {
  for (let seed = ACCEPTED_START_SEED; seed <= SEED_SCAN_MAX; seed += 1) {
    await startTinyPreset(page, seed);
    const personIds = await listPersonIds(page);

    let qualifiedTrueId: string | null = null;
    let qualifiedFalseId: string | null = null;
    let formalMasterDiscipleId: string | null = null;
    let emptyFormalMasterId: string | null = null;

    for (const personId of personIds) {
      const fields = await fetchMentorshipFields(page, personId);
      if (fields === null) {
        continue;
      }
      if (fields.qualifiedMaster && qualifiedTrueId === null) {
        qualifiedTrueId = personId;
      }
      if (!fields.qualifiedMaster && qualifiedFalseId === null) {
        qualifiedFalseId = personId;
      }
      if (fields.formalMasterPersonIds.length > 0 && formalMasterDiscipleId === null) {
        formalMasterDiscipleId = personId;
      }
      if (fields.formalMasterPersonIds.length === 0 && emptyFormalMasterId === null) {
        emptyFormalMasterId = personId;
      }
    }

    if (qualifiedFalseId !== null && emptyFormalMasterId !== null) {
      return {
        seed,
        qualifiedTrueId,
        qualifiedFalseId,
        formalMasterDiscipleId,
        emptyFormalMasterId,
      };
    }
  }
  throw new Error(`no mentorship fixture in seeds ${ACCEPTED_START_SEED}..${SEED_SCAN_MAX}`);
}

async function assertMentorshipSectionVisible(page: Page): Promise<void> {
  await expect(page.getByTestId("person-detail-mentorship")).toBeVisible();
  await expect(page.getByTestId("person-detail-mentorship")).toContainText("師弟関係");
  await expect(page.getByTestId("person-detail-qualified-master")).toBeVisible();
  await expect(page.getByTestId("person-detail-formal-masters")).toBeVisible();
}

test.describe("Sprint3 S03-045 person detail mentorship browser evidence (B2)", () => {
  test("ordinary /people route shows 師弟関係 states from accepted fixtures", async ({
    page,
    context,
  }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await bootstrapAcceptedSession(page, context);
    const fixture = await discoverMentorshipFixture(page);

    await page.locator('[data-menu-item="人物"]').click();
    await expect(page).toHaveURL(/\/people$/);
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    const openPersonDetail = async (personId: string): Promise<void> => {
      await page.goto(`/people/${encodeURIComponent(personId)}`);
      await expect(page.getByTestId("person-detail-page")).toBeVisible();
      await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
        "data-status",
        "success",
        {
          timeout: 60_000,
        },
      );
      await assertMentorshipSectionVisible(page);
    };

    await openPersonDetail(fixture.qualifiedFalseId);
    await expect(page.getByTestId("person-detail-qualified-master")).toHaveAttribute(
      "data-qualified-master",
      "false",
    );
    await expect(page.getByTestId("person-detail-qualified-master")).toContainText("なし");

    await openPersonDetail(fixture.emptyFormalMasterId);
    await expect(page.getByTestId("person-detail-formal-masters")).toContainText("なし");
    await expect(page.getByTestId("person-detail-formal-master-link")).toHaveCount(0);

    if (fixture.qualifiedTrueId !== null) {
      await openPersonDetail(fixture.qualifiedTrueId);
      await expect(page.getByTestId("person-detail-qualified-master")).toHaveAttribute(
        "data-qualified-master",
        "true",
      );
      await expect(page.getByTestId("person-detail-qualified-master")).toContainText("あり");
    }

    if (fixture.formalMasterDiscipleId !== null) {
      const fields = await fetchMentorshipFields(page, fixture.formalMasterDiscipleId);
      expect(fields).not.toBeNull();
      const masterId = fields!.formalMasterPersonIds[0]!;
      await openPersonDetail(fixture.formalMasterDiscipleId);
      const link = page.getByTestId("person-detail-formal-master-link").first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", `/people/${masterId}`);
      await link.click();
      await expect(page.getByTestId("person-detail-page")).toBeVisible();
      await expect(page).toHaveURL(
        new RegExp(`/people/${masterId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      );
    }
  });
});
