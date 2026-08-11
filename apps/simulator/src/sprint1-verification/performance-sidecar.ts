import {
  compareUnicodeCodePoints,
  validateInitialWeeklyTrainingSidecarSnapshot,
  type InitialWeeklyTrainingSidecarSnapshot,
  type PersonId,
  type Sha256Provider,
} from "@shared-world/simulation-core";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { loadTinySprint1Fixtures } from "./fixtures.js";

/**
 * Build a performance InitialWeeklyTrainingSidecarSnapshot by cloning the
 * PersonId-ascending first validated entry from tiny sprint1-input and replacing
 * only personId. Verification/test only — never call from production fallbacks.
 */
export function buildPerformanceSidecarFromTinyTemplate(
  repoRoot: string,
  personIds: readonly PersonId[],
  sha256Provider: Sha256Provider = createNodeSha256Provider(),
): InitialWeeklyTrainingSidecarSnapshot {
  if (personIds.length === 0) {
    throw new Error("performance sidecar factory requires at least one PersonId");
  }

  const fixtures = loadTinySprint1Fixtures(repoRoot, sha256Provider);
  const sourceEntries = [...fixtures.sprint1CliInput.initialWeeklyTrainingSidecar.entries].sort(
    (a, b) => compareUnicodeCodePoints(a.personId, b.personId),
  );
  const template = sourceEntries[0];
  if (template === undefined) {
    throw new Error("tiny sprint1-input sidecar has no entries");
  }

  const uniqueSorted = [...new Set(personIds)].sort(compareUnicodeCodePoints);
  const entries = uniqueSorted.map((personId) => {
    const cloned = structuredClone(template) as typeof template;
    return { ...cloned, personId };
  });

  const snapshotRaw = {
    schemaVersion: fixtures.sprint1CliInput.initialWeeklyTrainingSidecar.schemaVersion,
    entries,
  };
  const validated = validateInitialWeeklyTrainingSidecarSnapshot(snapshotRaw);
  if (!validated.ok) {
    throw new Error(`performance sidecar validation failed: ${JSON.stringify(validated.issues)}`);
  }
  return validated.value;
}
