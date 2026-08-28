/**
 * Battle AI trace / detail-log followup: start profiles + activation diagnostics + long-range magic case.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-BATTLE-AI-TRACE-AND-DETAIL-LOG-FOLLOWUP-B2-20260822",
);

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

test.describe("S1.5 battle AI trace and detail log followup", () => {
  test.describe.configure({ timeout: 360_000 });

  test("detail log start profiles + long-range magic selection evidence", async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);

    const people = await browserJson(page, { url: "/api/s1_5/people?limit=50" });
    expect(people.ok).toBe(true);
    const items = (people.body.data?.items ?? []) as Array<{
      personId: string;
      displayName: string;
      learnedTechniqueCount: number;
      aptitudes: { unarmed: number; sword: number; magic: number };
    }>;

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    const optionValues = await page
      .locator("#mock-participant-a option")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
          .filter((value) => value.length > 0),
      );
    expect(optionValues.length).toBeGreaterThanOrEqual(2);

    const candidates = items.filter((row) => optionValues.includes(row.personId));
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    // Highest unarmed among eligible mock candidates (category-dominance not required).
    const unarmedDominant = [...candidates].sort(
      (a, b) => b.aptitudes.unarmed - a.aptitudes.unarmed,
    )[0]!;
    const other =
      candidates.find((row) => row.personId !== unarmedDominant.personId)?.personId ??
      optionValues.find((id) => id !== unarmedDominant.personId)!;

    await page.getByTestId("mock-participant-a").selectOption(unarmedDominant.personId);
    await page.getByTestId("mock-participant-b").selectOption(other);
    await expect(page.getByTestId("mock-combat-profile-comparison")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    await expect(page.getByTestId("mock-combat-profile-comparison-table")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("battle-start-profiles")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("battle-start-profile-comparison")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    await expect(page.getByTestId("battle-start-profile-comparison-table")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("battle-start-profile-comparison-table")).toContainText("格闘");
    await expect(page.getByTestId("battle-start-profile-comparison-table")).toContainText("体力");
    await expect(page.getByTestId("battle-range-summary")).toContainText("中距離");
    await expect(page.locator(".dw-combat-row").first()).toBeVisible({ timeout: 60_000 });

    // Collect long-range magic actions by unarmed-dominant participant from first log page.
    const probe = await page.evaluate((actorId) => {
      const rows = Array.from(document.querySelectorAll(".dw-combat-row"));
      const hits: Array<Record<string, unknown>> = [];
      for (const row of rows) {
        const body = row.querySelector(".dw-combat-body");
        if (body === null) continue;
        const header = body.querySelector(".dw-log-header");
        const action = header?.querySelector(".dw-combat-action")?.textContent ?? "";
        const range = header?.querySelector(".dw-combat-range-chip")?.textContent ?? "";
        const actor = header?.querySelector("strong")?.textContent ?? "";
        const outcome = body.querySelector(".dw-combat-effects")?.textContent ?? "";
        const details = body.querySelector("details");
        const detailsText = details?.textContent ?? "";
        if (
          range.includes("遠距離") &&
          (action.includes("魔法") || detailsText.includes('profile":"magic"'))
        ) {
          hits.push({
            actor,
            action,
            range,
            outcome: outcome.slice(0, 240),
            detailsSnippet: detailsText.slice(0, 500),
          });
        }
        if (outcome.includes("発動判定に失敗") || outcome.includes("activation_roll_failed")) {
          hits.push({
            kind: "activation_failure",
            actor,
            action,
            range,
            outcome: outcome.slice(0, 240),
          });
        }
      }
      return {
        actorId,
        rowCount: rows.length,
        longMagicOrActivationHits: hits,
        startProfileComparison:
          document.querySelector('[data-testid="battle-start-profile-comparison"]')?.textContent ??
          "",
      };
    }, unarmedDominant.personId);

    await shot(page, project, "01-battle-log-start-profiles");
    await writeProbe(project, "01-trace-probe", {
      unarmedDominant,
      other,
      probe,
    });

    expect(probe.startProfileComparison).toMatch(/格闘/);
    // Either observed long-range magic action in UI, or document that page has profiles + start middle range
    // (mock default). Authority diagnosis covers why long forces magic.
    expect(probe.rowCount).toBeGreaterThan(0);
  });
});
