/**
 * Mock Battle A/B participant comparison summary (presentation followup).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const EVIDENCE_ROOT =
  "_handoff-artifacts/audit/current/S1_5-MOCK-BATTLE-PARTICIPANT-SUMMARY-FOLLOWUP-B2-20260822";

type BrowserJson = {
  ok?: boolean;
  status: number;
  body: {
    ok?: boolean;
    uiRevision?: number;
    data?: Record<string, unknown>;
    error?: { code?: string };
  };
};

async function browserJson(
  page: Page,
  input: { url: string; method?: string; csrf?: string; body?: unknown },
): Promise<BrowserJson> {
  return page.evaluate(async (spec) => {
    const headers: Record<string, string> = {};
    if (spec.method === "POST") headers["content-type"] = "application/json";
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

async function resetWorld(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { csrf, uiRevision } = await sessionCsrf(page);
    const reset = await browserJson(page, {
      url: "/api/s1_5/simulation/reset",
      method: "POST",
      csrf,
      body: { requestId: crypto.randomUUID(), expectedUiRevision: uiRevision },
    });
    if (reset.ok) return;
    if (reset.status === 409 && reset.body.error?.code === "SIMULATION_NOT_STARTED") return;
    if (
      reset.status === 409 &&
      (reset.body.error?.code === "STALE_UI_REVISION" ||
        reset.body.error?.code === "UPDATE_IN_PROGRESS")
    ) {
      await page.waitForTimeout(300);
      continue;
    }
    throw new Error(`reset failed ${String(reset.status)}`);
  }
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
  expect(start.ok).toBe(true);
}

async function shot(page: Page, project: string, name: string): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function writeProbe(
  project: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(EVIDENCE_ROOT, project);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test.describe("S1.5 mock battle participant summary followup", () => {
  test.describe.configure({ timeout: 360_000 });

  test("A/B summaries show distinct combat profiles before run", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    await expect(page.getByTestId("mock-battle-coverage-hint")).toBeVisible();

    const people = await browserJson(page, { url: "/api/s1_5/people?limit=50" });
    expect(people.ok).toBe(true);
    const items = (people.body.data?.items ?? []) as Array<{
      personId: string;
      displayName: string;
      learnedTechniqueCount: number;
      aptitudes: { unarmed: number; sword: number; magic: number };
      stats: Record<string, number>;
    }>;
    const optionValues = await page
      .locator("#mock-participant-a option")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
          .filter((value) => value.length > 0),
      );
    expect(optionValues.length).toBeGreaterThanOrEqual(2);

    const candidates = items.filter((row) => optionValues.includes(row.personId));
    const withTech = candidates.filter((row) => row.learnedTechniqueCount > 0);
    const withoutTech = candidates.filter((row) => row.learnedTechniqueCount === 0);
    expect(withTech.length).toBeGreaterThanOrEqual(1);

    const a =
      withTech.find((row) => row.aptitudes.sword >= row.aptitudes.magic)?.personId ??
      withTech[0]!.personId;
    const b =
      withTech.find((row) => row.personId !== a && row.aptitudes.magic >= row.aptitudes.sword)
        ?.personId ??
      withoutTech.find((row) => row.personId !== a)?.personId ??
      optionValues.find((id) => id !== a)!;

    await page.getByTestId("mock-participant-a").selectOption(a);
    await page.getByTestId("mock-participant-b").selectOption(b);

    const comparison = page.getByTestId("mock-combat-profile-comparison");
    const table = page.getByTestId("mock-combat-profile-comparison-table");
    await expect(comparison).toHaveAttribute("data-status", "success", { timeout: 60_000 });
    await expect(table).toBeVisible({ timeout: 60_000 });

    await expect(table).toContainText("格闘");
    await expect(table).toContainText("剣技");
    await expect(table).toContainText("魔法");
    await expect(table).toContainText("体力");
    await expect(table).toContainText("魔力");
    await expect(table).toContainText("筋力");

    const comparisonHtml = await comparison.innerHTML();
    expect(comparisonHtml).not.toMatch(/technique_[a-z0-9_]+</);

    const tableText = await table.innerText();
    const aRank = await page.getByTestId("mock-combat-profile-comparison-a-rank").innerText();
    const bRank = await page.getByTestId("mock-combat-profile-comparison-b-rank").innerText();
    expect(`${aRank}\n${bRank}`).not.toBe("");

    await shot(page, project, "01-ab-summary-before-run");
    await writeProbe(project, "01-ab-summary-probe", {
      participantA: a,
      participantB: b,
      tableText,
      aRank,
      bRank,
      comparisonHtml,
    });

    // Change B only and confirm comparison refreshes while staying success.
    const otherB = optionValues.find((id) => id !== a && id !== b);
    if (otherB !== undefined) {
      await page.getByTestId("mock-participant-b").selectOption(otherB);
      await expect(comparison).toHaveAttribute("data-status", "success", { timeout: 60_000 });
      const tableText2 = await table.innerText();
      expect(tableText2).not.toBe(tableText);
      await expect(comparison).toHaveAttribute("data-status", "success");
      await shot(page, project, "02-b-changed");
      await writeProbe(project, "02-b-changed-probe", {
        participantB: otherB,
        tableTextBefore: tableText,
        tableTextAfter: tableText2,
      });
    }
  });
});
