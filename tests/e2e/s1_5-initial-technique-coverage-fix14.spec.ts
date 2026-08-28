/**
 * FIX14 Chrome+Edge: time-zero technique coverage on ordinary active roster.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveE2eEvidenceDir } from "./support/evidence-output-root.js";

const EVIDENCE_ROOT = resolveE2eEvidenceDir(
  "_handoff-artifacts/audit/current/S1_5-INITIAL-ACTIVE-TECHNIQUE-COVERAGE-FIX14-B2-20260822/retry-G076-embedded",
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
  const summary = start.body.data?.summary as Record<string, unknown> | undefined;
  expect(summary?.techniqueCatalogDataVersion).toBe("techniques-0.1.1");
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

test.describe("S1.5 FIX14 initial technique coverage", () => {
  test.describe.configure({ timeout: 360_000 });

  test("time-zero people + mock coverage", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("ui001-shell")).toBeVisible();
    await resetWorld(page);
    await startWorld(page, 42);
    await page.goto("/");
    await expect(page.getByTestId("simulation-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    await shot(page, project, "01-home-time-zero");

    await page.goto("/people");
    await expect(page.getByTestId("people-status")).toHaveAttribute("data-status", "success", {
      timeout: 60_000,
    });
    const people = await browserJson(page, { url: "/api/s1_5/people?limit=50" });
    expect(people.ok).toBe(true);
    const items = (people.body.data?.items ?? []) as Array<{
      personId: string;
      displayName: string;
      learnedTechniqueCount: number;
      aptitudes: { unarmed: number; sword: number; magic: number };
    }>;
    const withTech = items.filter((row) => row.learnedTechniqueCount > 0);
    const withoutTech = items.filter((row) => row.learnedTechniqueCount === 0);
    expect(withTech.length).toBeGreaterThanOrEqual(3);
    expect(withoutTech.length).toBeGreaterThanOrEqual(1);
    await shot(page, project, "02-people");
    await writeProbe(project, "02-people-probe", {
      withTechCount: withTech.length,
      withoutTechCount: withoutTech.length,
      withTech: withTech.map((row) => ({
        personId: row.personId,
        displayName: row.displayName,
        learnedTechniqueCount: row.learnedTechniqueCount,
        aptitudes: row.aptitudes,
      })),
    });

    // Open first technique holder detail
    const holderId = withTech[0]!.personId;
    await page.goto(`/people/${encodeURIComponent(holderId)}`);
    await expect(page.getByTestId("person-detail-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("person-detail-techniques")).not.toContainText(
      "習得した技はまだありません",
    );
    await shot(page, project, "03-person-holder");

    await page.goto("/mock-battle");
    await expect(page.getByTestId("mock-candidates-status")).toHaveAttribute(
      "data-status",
      "success",
      { timeout: 60_000 },
    );
    await expect(page.getByTestId("mock-battle-coverage-hint")).toBeVisible();
    const optionValues = await page
      .locator("#mock-participant-a option")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node instanceof HTMLOptionElement ? node.value : ""))
          .filter((value) => value.length > 0),
      );
    expect(optionValues.length).toBeGreaterThanOrEqual(2);
    const holderInCandidates = withTech.some((row) => optionValues.includes(row.personId));
    const controlInCandidates = withoutTech.some((row) => optionValues.includes(row.personId));
    expect(holderInCandidates).toBe(true);
    expect(controlInCandidates).toBe(true);

    const a = withTech.find((row) => optionValues.includes(row.personId))!.personId;
    const b =
      withoutTech.find((row) => optionValues.includes(row.personId))?.personId ??
      optionValues.find((id) => id !== a)!;
    await page.getByTestId("mock-participant-a").selectOption(a);
    await page.getByTestId("mock-participant-b").selectOption(b);
    await page.getByTestId("mock-battle-run").click();
    await expect(page.getByTestId("mock-battle-result")).toBeVisible({ timeout: 120_000 });
    await shot(page, project, "04-mock-result");

    await page.getByTestId("mock-battle-open-result").click();
    await expect(page.getByTestId("battle-log-page")).toBeVisible({ timeout: 60_000 });
    const initialRange = await page.getByTestId("battle-range-summary").textContent();
    await shot(page, project, "05-battle-log");
    await writeProbe(project, "05-battle-probe", {
      participantA: a,
      participantB: b,
      initialRangeText: initialRange,
    });
    expect(initialRange ?? "").toMatch(/開始間合い/);
    expect(initialRange ?? "").toMatch(/中距離/);
    expect(initialRange ?? "").not.toMatch(/開始間合い 密着/);
  });
});
