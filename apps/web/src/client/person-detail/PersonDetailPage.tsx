import { useEffect, useState } from "react";
import type { FetchLike } from "../dev-viewer/fetch-ui004.js";
import { loadPersonDetail } from "./fetch-ui005.js";
import { PersonDetailViewPanel } from "./PersonDetailView.js";
import type { PersonDetailView } from "./ui005-views.js";

export type PersonDetailPageProps = {
  personId: string;
  fetchImpl?: FetchLike;
};

export function PersonDetailPage(props: PersonDetailPageProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [detail, setDetail] = useState<PersonDetailView | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [uiRevision, setUiRevision] = useState<number | null>(null);
  const [personNameById, setPersonNameById] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setDetail(null);
    setErrorText(null);
    setErrorCode(null);
    setUiRevision(null);
    setPersonNameById(new Map());
    void (async () => {
      const result = await loadPersonDetail(
        props.fetchImpl !== undefined
          ? { personId: props.personId, fetchImpl: props.fetchImpl }
          : { personId: props.personId },
      );
      if (cancelled) {
        return;
      }
      if (result.kind === "failure") {
        setDetail(null);
        setUiRevision(null);
        setErrorCode(result.code);
        setErrorText(result.code !== null ? `${result.code}: ${result.message}` : result.message);
        setStatus("error");
        return;
      }
      setDetail(result.data);
      setUiRevision(result.uiRevision);
      setStatus("success");

      const masterIds = result.data.formalMasterPersonIds;
      if (masterIds.length === 0) {
        return;
      }
      const nameEntries = await Promise.all(
        masterIds.map(async (masterId) => {
          const masterResult = await loadPersonDetail(
            props.fetchImpl !== undefined
              ? { personId: masterId, fetchImpl: props.fetchImpl }
              : { personId: masterId },
          );
          if (masterResult.kind !== "success") {
            return null;
          }
          const name = masterResult.data.displayName;
          return typeof name === "string" && name.length > 0 ? ([masterId, name] as const) : null;
        }),
      );
      if (cancelled) {
        return;
      }
      const names = new Map<string, string>();
      for (const entry of nameEntries) {
        if (entry !== null) {
          names.set(entry[0], entry[1]);
        }
      }
      setPersonNameById(names);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.personId, props.fetchImpl]);

  return (
    <PersonDetailViewPanel
      status={status}
      personId={props.personId}
      detail={detail}
      errorText={errorText}
      errorCode={errorCode}
      uiRevision={uiRevision}
      peopleListHref="/people"
      personNameById={personNameById}
    />
  );
}
