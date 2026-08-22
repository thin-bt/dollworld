import type { ReactNode } from "react";

export type DeveloperDetailsProps = {
  children: ReactNode;
  testId?: string;
  compact?: boolean;
};

export function DeveloperDetails(props: DeveloperDetailsProps) {
  const compactClass = props.compact === true ? " dw-dev-compact" : "";
  return (
    <div className={`dw-dev${compactClass}`} data-testid={props.testId ?? "developer-details"}>
      <details>
        <summary>開発者情報</summary>
        <div className="dw-dev-body">{props.children}</div>
      </details>
    </div>
  );
}
