import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Sprint3 S03-057 — browser evidence for ordinary Person Detail 正式門下 (S03-055).
 * Uses accepted tiny preset + API discovery; asserts production route/view bytes only.
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

type ReverseDiscipleFixture = {
  seed: number;
  emptyDisciplesPersonId: string;
  masterWithDisciplesId: string | null;
  formalMasterDiscipleId: string | null;
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

async function fetchPersonDetailFields(
  page: Page,
  personId: string,
): Promise<{
  displayName: string | null;
  formalMasterPersonIds: string[];
  formalDisciplePersonIds: string[];
} | null> {
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
  const row = data as {
    displayName?: unknown;
    formalMasterPersonIds?: unknown;
    formalDisciplePersonIds?: unknown;
  };
  if (!Array.isArray(row.formalMasterPersonIds) || !Array.isArray(row.formalDisciplePersonIds)) {
    return null;
  }
  const formalMasterPersonIds = row.formalMasterPersonIds.filter(
    (id): id is string => typeof id === "string",
  );
  const formalDisciplePersonIds = row.formalDisciplePersonIds.filter(
    (id): id is string => typeof id === "string",
  );
  const displayName = typeof row.displayName === "string" ? row.displayName : null;
  return { displayName, formalMasterPersonIds, formalDisciplePersonIds };
}

async function discoverReverseDiscipleFixture(page: Page): Promise<ReverseDiscipleFixture> {
  for (let seed = ACCEPTED_START_SEED; seed <= SEED_SCAN_MAX; seed += 1) {
    await startTinyPreset(page, seed);
    const personIds = await listPersonIds(page);

    let emptyDisciplesPersonId: string | null = null;
    let masterWithDisciplesId: string | null = null;
    let formalMasterDiscipleId: string | null = null;

    for (const personId of personIds) {
      const fields = await fetchPersonDetailFields(page, personId);
      if (fields === null) {
        continue;
      }
      if (fields.formalDisciplePersonIds.length === 0 && emptyDisciplesPersonId === null) {
        emptyDisciplesPersonId = personId;
      }
      if (fields.formalDisciplePersonIds.length > 0 && masterWithDisciplesId === null) {
        masterWithDisciplesId = personId;
      }
      if (fields.formalMasterPersonIds.length > 0 && formalMasterDiscipleId === null) {
        formalMasterDiscipleId = personId;
      }
    }

    if (emptyDisciplesPersonId !== null) {
      return {
        seed,
        emptyDisciplesPersonId,
        masterWithDisciplesId,
        formalMasterDiscipleId,
      };
    }
  }
  throw new Error(`no reverse-disciple fixture in seeds ${ACCEPTED_START_SEED}..${SEED_SCAN_MAX}`);
}

async function assertMentorshipSectionVisible(page: Page): Promise<void> {
  await expect(page.getByTestId("person-detail-mentorship")).toBeVisible();
  await expect(page.getByTestId("person-detail-mentorship")).toContainText("師弟関係");
  await expect(page.getByTestId("person-detail-formal-disciples")).toBeVisible();
}

test.describe("Sprint3 S03-057 person detail reverse formal-disciple browser evidence (A)", () => {
  test("ordinary /people route shows 正式門下 from accepted fixtures (S03-055)", async ({
    page,
    context,
  }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 1000 });

    await bootstrapAcceptedSession(page, context);
    const fixture = await discoverReverseDiscipleFixture(page);

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

    await openPersonDetail(fixture.emptyDisciplesPersonId);
    await expect(page.getByTestId("person-detail-formal-disciples")).toContainText("なし");
    await expect(
      page.getByTestId("person-detail-formal-disciples").locator('[data-empty="true"]'),
    ).toHaveCount(1);
    await expect(page.getByTestId("person-detail-formal-disciple-link")).toHaveCount(0);

    if (fixture.masterWithDisciplesId !== null) {
      const masterFields = await fetchPersonDetailFields(page, fixture.masterWithDisciplesId);
      expect(masterFields).not.toBeNull();
      const discipleIds = masterFields!.formalDisciplePersonIds;
      expect(discipleIds.length).toBeGreaterThan(0);

      await openPersonDetail(fixture.masterWithDisciplesId);
      await expect(page.getByTestId("person-detail-mentorship")).toContainText("正式門下");
      const links = page.getByTestId("person-detail-formal-disciple-link");
      await expect(links).toHaveCount(discipleIds.length);

      for (const discipleId of discipleIds) {
        const link = page.locator(
          `[data-testid="person-detail-formal-disciple-link"][data-person-id="${discipleId}"]`,
        );
        await expect(link).toHaveCount(1);
        await expect(link).toHaveAttribute("href", `/people/${discipleId}`);
        const discipleFields = await fetchPersonDetailFields(page, discipleId);
        if (discipleFields?.displayName !== null && discipleFields!.displayName!.length > 0) {
          await expect(link).toContainText(discipleFields!.displayName!);
          await expect(link).not.toHaveText(discipleId);
        }
      }

      const firstDiscipleId = discipleIds[0]!;
      const firstLink = links.first();
      await firstLink.click();
      await expect(page.getByTestId("person-detail-page")).toBeVisible();
      await expect(page).toHaveURL(
        new RegExp(`/people/${firstDiscipleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      );
    }

    if (fixture.formalMasterDiscipleId !== null) {
      const fields = await fetchPersonDetailFields(page, fixture.formalMasterDiscipleId);
      expect(fields).not.toBeNull();
      const masterId = fields!.formalMasterPersonIds[0]!;
      await openPersonDetail(fixture.formalMasterDiscipleId);
      const masterLink = page.getByTestId("person-detail-formal-master-link").first();
      await expect(masterLink).toBeVisible();
      await expect(masterLink).toHaveAttribute("href", `/people/${masterId}`);
      await expect(masterLink).toHaveAttribute("data-person-id", masterId);
    }
  });
});
