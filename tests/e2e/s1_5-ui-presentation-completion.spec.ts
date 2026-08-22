import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Presentation FIX1 browser evidence — does not change UI-010 smoke.
 * Captures Chrome/Edge screenshots under the FIX1 evidence directory.
 */

const EVIDENCE_ROOT = "_handoff-artifacts/audit/current/S1_5-UI-PRESENTATION-FIX1-20260817";
const STEP_WEEKS_ONE_YEAR = 48;
const TRAINEE_MIN_AGE = 8;

type BrowserJson = {
  ok?: boolean;
  status: number;
  body: {
    ok?: boolean;
    uiRevision?: number;
    isUpdating?: boolean;
    data?: Record<string, unknown>;
    error?: { code?: string; message?: string; validation?: unknown };
  };
};

type PersonRow = {
  personId: string;
  age: number | null;
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

async function shot(page: Page, project: string, name: string): Promise<string> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function startWorld(page: Page, seed: number): Promise<void> {
  const { csrf, uiRevision } = await sessionCsrf(page);
  const start = await browserJson(page, {
    url: "/api/s1_5/simulation/start",
    method: "POST",
    csrf,
    body: {
      requestId: crypto.randomUUID(),
      expectedUiRevision: uiRevision,
      presetId: "sprint1-tiny-accepted",
      seed,
    },
  });
  if (start.ok !== true) {
    throw new Error(
      `simulation start failed: ${String(start.status)} ${JSON.stringify(start.body)}`,
    );
  }
}

async function resetWorld(page: Page): Promise<void> {
  const { csrf, uiRevision } = await sessionCsrf(page);
  const reset = await browserJson(page, {
    url: "/api/s1_5/simulation/reset",
    method: "POST",
    csrf,
    body: {
      requestId: crypto.randomUUID(),
      expectedUiRevision: uiRevision,
    },
  });
  if (reset.ok !== true) {
    throw new Error(
      `simulation reset failed: ${String(reset.status)} ${JSON.stringify(reset.body)}`,
    );
  }
}

function parsePersonRows(body: BrowserJson["body"]): PersonRow[] {
  const items = Array.isArray(body.data?.items) ? body.data.items : [];
  const rows: PersonRow[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as { personId?: unknown; age?: unknown };
    if (typeof row.personId !== "string") {
      continue;
    }
    rows.push({
      personId: row.personId,
      age: typeof row.age === "number" ? row.age : null,
    });
  }
  return rows;
}

async function loadPeople(page: Page): Promise<PersonRow[]> {
  const peopleApi = await browserJson(page, { url: "/api/s1_5/people?limit=50" });
  if (peopleApi.ok !== true) {
    throw new Error(`people api ${String(peopleApi.status)} ${JSON.stringify(peopleApi.body)}`);
  }
  return parsePersonRows(peopleApi.body);
}

/**
 * BattleParticipantSnapshot requires birthYear >= 1. Historical living persons
 * have birthYear = 1 - age, so only age-0 persons at world year 1 can later
 * enter a real mock battle. Advance 8 accepted years (48 weeks each) so they
 * become trainees.
 */
async function startWorldWithBattleBornPair(page: Page): Promise<[string, string]> {
  // Production auto-start may already have advanced the session; always reset before probing seeds.
  for (let seed = 42; seed <= 120; seed += 1) {
    await resetWorld(page);
    await startWorld(page, seed);
    const people = await loadPeople(page);
    const infants = people.filter((row) => row.age === 0).map((row) => row.personId);
    if (infants.length >= 2) {
      return [infants[0]!, infants[1]!];
    }
  }
  throw new Error(
    "no accepted tiny-preset seed produced two living age-0 persons (birthYear >= 1)",
  );
}

async function stepAcceptedYears(page: Page, years: number): Promise<void> {
  for (let i = 0; i < years; i += 1) {
    const { csrf, uiRevision } = await sessionCsrf(page);
    const step = await browserJson(page, {
      url: "/api/s1_5/simulation/step",
      method: "POST",
      csrf,
      body: {
        requestId: crypto.randomUUID(),
        expectedUiRevision: uiRevision,
        weeks: STEP_WEEKS_ONE_YEAR,
      },
    });
    if (step.ok !== true) {
      throw new Error(
        `simulation step year ${String(i + 1)} failed: ${String(step.status)} ${JSON.stringify(step.body)}`,
      );
    }
  }
}

async function postCompletedMockBattle(
  page: Page,
  participantAId: string,
  participantBId: string,
): Promise<void> {
  const { csrf, uiRevision } = await sessionCsrf(page);
  const posted = await browserJson(page, {
    url: "/api/s1_5/mock-battles",
    method: "POST",
    csrf,
    body: {
      requestId: crypto.randomUUID(),
      expectedUiRevision: uiRevision,
      participantAId,
      participantBId,
    },
  });
  if (posted.ok !== true) {
    throw new Error(
      `mock battle POST failed: ${String(posted.status)} ${JSON.stringify(posted.body)}`,
    );
  }
  const result = posted.body.data?.result;
  if (typeof result !== "object" || result === null) {
    throw new Error(`mock battle POST missing result: ${JSON.stringify(posted.body)}`);
  }
  const resultKind = (result as { resultKind?: unknown }).resultKind;
  if (resultKind !== "completed") {
    throw new Error(`mock battle resultKind is not completed: ${JSON.stringify(posted.body)}`);
  }
}

async function focusActiveNavByKeyboard(page: Page): Promise<void> {
  const simNav = page.locator('[data-menu-item="シミュレーション"]');
  await expect(simNav).toHaveAttribute("data-menu-active", "true");
  for (let i = 0; i < 24; i += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("data-menu-item") ?? "",
    );
    if (focused === "シミュレーション") {
      await expect(simNav).toBeFocused();
      return;
    }
  }
  throw new Error("keyboard Tab did not reach the active シミュレーション nav");
}

test.describe("S1.5 presentation completion screenshots", () => {
  test("capture home/people/detail/mock/events/focus evidence", async ({ page }, testInfo) => {
    test.setTimeout(360_000);
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    // Production `/` now mirrors /dev-viewer: empty sessions auto-start before the panel mounts.
    await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const [battlePersonA, battlePersonB] = await startWorldWithBattleBornPair(page);
    await page.reload();
    await expect(page.getByTestId("dev-viewer-simulation")).toBeVisible();
    await shot(page, project, "home");

    await focusActiveNavByKeyboard(page);
    const focusPath = await shot(page, project, "keyboard-focus-active-nav");

    const simDetails = page.getByTestId("developer-details").first();
    await simDetails.locator("summary").click();
    await expect(simDetails.locator("details")).toHaveAttribute("open", "");
    const detailsPath = await shot(page, project, "developer-details-open");
    const focusBytes = await readFile(focusPath);
    const detailsBytes = await readFile(detailsPath);
    expect(Buffer.compare(focusBytes, detailsBytes)).not.toBe(0);

    const people = await loadPeople(page);
    expect(people.length).toBeGreaterThan(0);
    const personIds = people.map((row) => row.personId);

    await page.goto("/people");
    await expect(page.getByTestId("dev-viewer-people")).toBeVisible();
    try {
      await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
        timeout: 20_000,
      });
    } catch {
      await page.reload();
      await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
        timeout: 20_000,
      });
    }
    await shot(page, project, "people");

    await page.goto(`/people/${encodeURIComponent(personIds[0]!)}`);
    await expect(page.getByTestId("person-detail-page")).toBeVisible();
    await expect(page.getByTestId("person-detail-status")).toHaveAttribute(
      "data-status",
      "success",
    );
    await shot(page, project, "person-detail");

    await stepAcceptedYears(page, TRAINEE_MIN_AGE);
    await postCompletedMockBattle(page, battlePersonA, battlePersonB);

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-battle-page")).toBeVisible();
    await page.getByTestId("mock-candidates-status").waitFor({ state: "visible" });
    await expect(page.getByTestId("mock-candidates-status")).not.toHaveAttribute(
      "data-status",
      "loading",
      { timeout: 20_000 },
    );
    await page.getByTestId("mock-participant-a").selectOption(battlePersonA);
    await page.getByTestId("mock-participant-b").selectOption(battlePersonB);
    await shot(page, project, "mock-select");

    await page.getByTestId("mock-battle-latest").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("mock-battle-summary")).toContainText("勝者");
    await shot(page, project, "mock-result");

    await page.goto("/mock-battle/result");
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-log-status")).toHaveAttribute("data-status", "success", {
      timeout: 20_000,
    });
    await expect(page.getByTestId("battle-log-items").locator("li")).not.toHaveCount(0);
    await expect(page.getByTestId("battle-log-requested-resolved-0")).toContainText("要求");
    await expect(page.getByTestId("battle-log-requested-resolved-0")).toContainText("解決");
    await shot(page, project, "battle-log");

    await page.goto("/events?tab=events");
    await expect(page.getByTestId("events-page")).toBeVisible();
    await page.getByTestId("events-status").waitFor({ state: "visible" });
    await shot(page, project, "events");

    await page.goto("/events?tab=validation");
    await expect(page.getByTestId("events-page")).toHaveAttribute("data-active-tab", "validation");
    await page.getByTestId("validation-status").waitFor({ state: "visible" });
    await shot(page, project, "validation");
  });
});
