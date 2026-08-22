/**
 * Compact A/B participant combat summary for Mock Battle (presentation-only).
 * Driven from existing UI-005 PersonDetailView — does not widen candidate exact4.
 */

import type { PersonDetailView } from "../person-detail/ui005-views.js";
import {
  CombatProfileSummary,
  type CombatProfileStatus,
} from "../presentation/CombatProfileSummary.js";

export type ParticipantSummaryStatus = CombatProfileStatus;

export type MockParticipantSummaryProps = {
  side: "a" | "b";
  personId: string;
  status: ParticipantSummaryStatus;
  detail: PersonDetailView | null;
  errorText: string | null;
};

export function MockParticipantSummary(props: MockParticipantSummaryProps) {
  if (props.personId.length === 0 || props.status === "idle") {
    return null;
  }
  return (
    <CombatProfileSummary
      testId={`mock-participant-${props.side}-summary`}
      status={props.status}
      detail={props.detail}
      errorText={props.errorText}
    />
  );
}
