import {
  buildSprint2CompetitiveRecordRuntimeStateFromRecords,
  validateCompetitiveRecord,
  failure,
  success,
  type CompetitiveRecord,
  type Sha256Provider,
  type Sprint1RunSession,
  type ValidationResult,
} from "@shared-world/simulation-core";
import type { CompetitionSessionStore } from "./competition-store.js";

/**
 * Mirror authoritative UI009 competitive records into Sprint1RunRuntimeState for S03-017 qualification wiring.
 */
export function syncCompetitionStoreCompetitiveRecordsIntoWorldRuntime(
  worldSession: Sprint1RunSession,
  store: CompetitionSessionStore,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunSession> {
  const byPersonId = store.state?.competitiveRecordByPersonId;
  if (byPersonId === undefined || Object.keys(byPersonId).length === 0) {
    if (worldSession.runtimeState.sprint2CompetitiveRecordRuntime === undefined) {
      return success(worldSession);
    }
    const { sprint2CompetitiveRecordRuntime, ...runtimeState } = worldSession.runtimeState;
    void sprint2CompetitiveRecordRuntime;
    return success({
      context: worldSession.context,
      runtimeState,
    });
  }

  const records: CompetitiveRecord[] = [];
  for (const [personId, json] of Object.entries(byPersonId).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const validated = validateCompetitiveRecord(json, provider, `/competitiveRecord/${personId}`);
    if (!validated.ok) {
      return failure(validated.issues);
    }
    records.push(validated.value);
  }

  const runtimeStateResult = buildSprint2CompetitiveRecordRuntimeStateFromRecords(
    records,
    provider,
  );
  if (!runtimeStateResult.ok) {
    return runtimeStateResult;
  }

  return success({
    context: worldSession.context,
    runtimeState: {
      ...worldSession.runtimeState,
      sprint2CompetitiveRecordRuntime: runtimeStateResult.value,
    },
  });
}
