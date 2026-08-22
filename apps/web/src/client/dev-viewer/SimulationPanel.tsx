import { useCallback, useEffect, useState } from "react";
import type { FetchLike } from "../session-client.js";
import {
  describeMutationResult,
  loadSimulation,
  postReset,
  postStep,
  runMutationWithRefresh,
  type AcceptedStepWeeks,
  type SimulationMutationResult,
  type SimulationSummaryView,
} from "./fetch-simulation.js";
import { SimulationPanelView } from "./SimulationPanelView.js";

export type SimulationPanelProps = {
  csrfToken: string;
  sessionState: string | null;
  /** Bumped by DevViewer after any successful mutation to re-read every panel. */
  refreshGeneration: number;
  fetchImpl?: FetchLike;
  /** Refreshes session + People + Candidates; invoked only after mutation success. */
  onAfterMutation: () => void | Promise<void>;
};

export function SimulationPanel(props: SimulationPanelProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [summary, setSummary] = useState<SimulationSummaryView | null>(null);
  const [uiRevision, setUiRevision] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "failure"; text: string } | null>(
    null,
  );

  const reload = useCallback(async () => {
    setStatus("loading");
    const result = await loadSimulation(
      props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : undefined,
    );
    if (result.kind === "failure") {
      setStatus("error");
      setErrorText(result.code !== null ? `${result.code}: ${result.message}` : result.message);
      setSummary(null);
      setUiRevision(null);
      setIsUpdating(false);
      return;
    }
    setErrorText(null);
    setSummary(result.summary);
    setUiRevision(result.uiRevision);
    setIsUpdating(result.isUpdating);
    setStatus("success");
  }, [props.fetchImpl]);

  useEffect(() => {
    void reload();
  }, [reload, props.refreshGeneration]);

  const runMutation = useCallback(
    async (mutate: (expectedUiRevision: number) => Promise<SimulationMutationResult>) => {
      if (mutating || uiRevision === null) {
        return;
      }
      setMutating(true);
      setFeedback(null);
      const expectedUiRevision = uiRevision;
      try {
        const result = await runMutationWithRefresh({
          mutate: () => mutate(expectedUiRevision),
          refresh: () => props.onAfterMutation(),
        });
        setFeedback(describeMutationResult(result));
      } finally {
        setMutating(false);
      }
    },
    [mutating, uiRevision, props.onAfterMutation],
  );

  const fetchProp = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {};

  return (
    <SimulationPanelView
      status={status}
      summary={summary}
      uiRevision={uiRevision}
      isUpdating={isUpdating}
      sessionState={props.sessionState}
      errorText={errorText}
      mutating={mutating}
      feedback={feedback}
      onStep={(weeks: AcceptedStepWeeks) => {
        void runMutation((expectedUiRevision) =>
          postStep({ csrfToken: props.csrfToken, expectedUiRevision, weeks, ...fetchProp }),
        );
      }}
      onReset={() => {
        void runMutation((expectedUiRevision) =>
          postReset({ csrfToken: props.csrfToken, expectedUiRevision, ...fetchProp }),
        );
      }}
    />
  );
}
