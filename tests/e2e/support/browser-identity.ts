import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Page, TestInfo } from "@playwright/test";

export const EVIDENCE_ROOT =
  "_handoff-artifacts/audit/current/S1_5-UI010-E2E-TOOLING-REMEDIATION-20260817";

export type BrowserIdentityRecord = {
  projectName: string;
  browserName: string;
  browserVersion: string;
  channel: string | undefined;
  userAgent: string;
  baseURL: string | undefined;
  capturedAt: string;
};

export async function captureBrowserIdentity(
  page: Page,
  testInfo: TestInfo,
): Promise<BrowserIdentityRecord> {
  const userAgent = await page.evaluate(() => navigator.userAgent);
  const record: BrowserIdentityRecord = {
    projectName: testInfo.project.name,
    browserName: testInfo.project.name,
    browserVersion: "unknown",
    channel:
      typeof testInfo.project.use.channel === "string" ? testInfo.project.use.channel : undefined,
    userAgent,
    baseURL:
      typeof testInfo.project.use.baseURL === "string" ? testInfo.project.use.baseURL : undefined,
    capturedAt: new Date().toISOString(),
  };

  // Prefer live browser version string when available via CDP-ish evaluate.
  const versionHint = await page.evaluate(() => {
    const match = navigator.userAgent.match(/(?:Chrome|Edg)\/([\d.]+)/);
    return match?.[1] ?? null;
  });
  if (versionHint !== null) {
    record.browserVersion = versionHint;
  }

  const outPath = join(EVIDENCE_ROOT, `browser-identity-${testInfo.project.name}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export function assertChromeIdentity(record: BrowserIdentityRecord): void {
  if (record.projectName !== "chrome") {
    throw new Error(`expected project chrome, got ${record.projectName}`);
  }
  if (record.channel !== "chrome") {
    throw new Error(`expected channel chrome, got ${String(record.channel)}`);
  }
  if (!/Chrome\//.test(record.userAgent) || /Edg\//.test(record.userAgent)) {
    throw new Error(`userAgent is not Google Chrome: ${record.userAgent}`);
  }
}

export function assertEdgeIdentity(record: BrowserIdentityRecord): void {
  if (record.projectName !== "edge") {
    throw new Error(`expected project edge, got ${record.projectName}`);
  }
  if (record.channel !== "msedge") {
    throw new Error(`expected channel msedge, got ${String(record.channel)}`);
  }
  if (!/Edg\//.test(record.userAgent)) {
    throw new Error(`userAgent is not Microsoft Edge: ${record.userAgent}`);
  }
}
