import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

/**
 * FIX4 runtime functional regression: Events rows after UI week step,
 * and mock battle via 模擬戦を開始 (not API POST + 最新結果).
 */

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-RUNTIME-FUNCTIONAL-REGRESSION-FIX4-20260819",
);
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

async function eventsTotalCount(page: Page): Promise<number> {
  const eventsApi = await browserJson(page, { url: "/api/s1_5/events?limit=100" });
  if (eventsApi.ok !== true) {
    throw new Error(`events api ${String(eventsApi.status)} ${JSON.stringify(eventsApi.body)}`);
  }
  const total = eventsApi.body.data?.totalCount;
  if (typeof total !== "number") {
    throw new Error(`events api missing totalCount: ${JSON.stringify(eventsApi.body)}`);
  }
  return total;
}

async function startWorldWithBattleBornPair(page: Page): Promise<[string, string]> {
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

async function waitEventsPageReady(page: Page): Promise<void> {
  await expect(page.getByTestId("events-page")).toBeVisible();
  await expect(page.getByTestId("events-status")).toHaveAttribute("data-status", "success", {
    timeout: 60_000,
  });
}

async function waitEventsRows(page: Page): Promise<void> {
  await waitEventsPageReady(page);
  await expect(page.getByTestId("events-items").locator("li")).not.toHaveCount(0);
  await expect(page.locator(".dw-event-when").first()).toBeVisible();
  await expect(page.locator(".dw-event-what").first()).toBeVisible();
}

async function writeNetworkNote(project: string, name: string, payload: unknown): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test.describe("S1.5 runtime functional regression FIX4", () => {
  test("Events UI week path + mock battle Run CTA", async ({ page }, testInfo) => {
    test.setTimeout(360_000);
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await expect(page.getByTestId("session-state")).toHaveAttribute("data-session-state", "ready", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    await resetWorld(page);
    await startWorld(page, 47);
    await page.reload();
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });

    const eventsAtStart = await browserJson(page, { url: "/api/s1_5/events?limit=100" });
    expect(eventsAtStart.ok).toBe(true);
    expect(typeof eventsAtStart.body.data?.totalCount).toBe("number");
    expect(eventsAtStart.body.data?.totalCount).toBeGreaterThan(0);
    await writeNetworkNote(project, "network-events-after-start", {
      status: eventsAtStart.status,
      totalCount: eventsAtStart.body.data?.totalCount,
      itemCount: Array.isArray(eventsAtStart.body.data?.items)
        ? eventsAtStart.body.data.items.length
        : 0,
    });

    await page.goto("/events?tab=events");
    // At time-zero, API totalCount includes technical init events; human cards may be empty (FIX8/FIX12).
    await waitEventsPageReady(page);
    await expect(page.getByTestId("events-tab-events")).toHaveText("出来事（正史）");
    await shot(page, project, "events-after-start");

    await page.goto("/");
    await expect(page.getByTestId("simulation-step-1")).toBeEnabled();
    const beforeElapsed = await page.getByTestId("simulation-elapsed-weeks").innerText();
    await page.getByTestId("simulation-step-1").click();
    await expect(page.getByTestId("simulation-feedback")).toHaveAttribute("data-kind", "success", {
      timeout: 60_000,
    });
    await expect
      .poll(async () => page.getByTestId("simulation-elapsed-weeks").innerText(), {
        timeout: 60_000,
      })
      .not.toBe(beforeElapsed);
    await shot(page, project, "home-after-ui-week");

    const eventsAfterWeek = await browserJson(page, { url: "/api/s1_5/events?limit=100" });
    expect(eventsAfterWeek.ok).toBe(true);
    expect(Number(eventsAfterWeek.body.data?.totalCount)).toBeGreaterThan(
      Number(eventsAtStart.body.data?.totalCount),
    );
    await writeNetworkNote(project, "network-events-after-ui-week", {
      status: eventsAfterWeek.status,
      totalCount: eventsAfterWeek.body.data?.totalCount,
      previousTotalCount: eventsAtStart.body.data?.totalCount,
    });

    await page.goto("/events?tab=events");
    await waitEventsRows(page);
    await shot(page, project, "events-after-ui-week");

    await page.goto("/events?tab=validation");
    await expect(page.getByTestId("events-page")).toHaveAttribute("data-active-tab", "validation");
    await expect(page.getByTestId("validation-status")).not.toHaveAttribute(
      "data-status",
      "loading",
      { timeout: 20_000 },
    );
    await shot(page, project, "validation");

    const [battlePersonA, battlePersonB] = await startWorldWithBattleBornPair(page);
    await stepAcceptedYears(page, TRAINEE_MIN_AGE);
    const eventsBeforeMock = await eventsTotalCount(page);

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-battle-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "確認専用模擬戦" })).toBeVisible();
    await expect(page.getByTestId("mock-battle-run")).toHaveText("模擬戦を開始");
    await expect(page.getByTestId("mock-candidates-status")).not.toHaveAttribute(
      "data-status",
      "loading",
      { timeout: 120_000 },
    );
    await expect(page.getByTestId("mock-select-two-hint")).toBeVisible();
    await expect(page.getByTestId("mock-battle-run")).toBeDisabled();
    await page.getByTestId("mock-participant-a").selectOption(battlePersonA);
    await page.getByTestId("mock-participant-b").selectOption(battlePersonB);
    await expect(page.getByTestId("mock-battle-run")).toBeEnabled();
    await shot(page, project, "mock-select");

    const postWait = page.waitForResponse((response) => {
      if (response.request().method() !== "POST") {
        return false;
      }
      const url = response.url();
      return url.includes("/api/s1_5/mock-battles") && !url.includes("/replay");
    });
    await page.getByTestId("mock-battle-run").click();
    const posted = await postWait;
    expect(posted.ok()).toBe(true);
    const postedBody = (await posted.json()) as BrowserJson["body"];
    await writeNetworkNote(project, "network-mock-battle-post", {
      status: posted.status(),
      ok: postedBody.ok,
      resultKind:
        typeof postedBody.data?.result === "object" && postedBody.data.result !== null
          ? (postedBody.data.result as { resultKind?: unknown }).resultKind
          : null,
    });
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("mock-battle-summary")).toContainText("勝者");
    await shot(page, project, "mock-result");

    const eventsAfterMock = await eventsTotalCount(page);
    expect(eventsAfterMock).toBe(eventsBeforeMock);

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page).toHaveURL(/\/mock-battle\/result$/);
    await expect(page.getByTestId("battle-log-page")).toBeVisible();
    await expect(page.getByTestId("battle-log-status")).toHaveAttribute("data-status", "success", {
      timeout: 20_000,
    });
    await expect(page.getByTestId("battle-log-items").locator("li")).not.toHaveCount(0);
    await shot(page, project, "battle-log");
  });
});
