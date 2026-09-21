/**
 * S03-017 resolve authoritative Sprint2 competitive records for live qualification wiring.
 */
import type { Sprint1RunRuntimeState } from "../sprint1/sprint1-run-session.js";
import { competitiveRecordsByPersonIdFromRuntime } from "./live-sprint2-competitive-record-runtime-state.js";
import type { CompetitiveRecordsByPersonId } from "./derive-master-qualification-record.js";

export function resolveLiveCompetitiveRecordsForQualification(
  runtimeState: Pick<Sprint1RunRuntimeState, "sprint2CompetitiveRecordRuntime">,
): CompetitiveRecordsByPersonId | undefined {
  return competitiveRecordsByPersonIdFromRuntime(runtimeState.sprint2CompetitiveRecordRuntime);
}
