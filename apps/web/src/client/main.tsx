import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./presentation.css";
import { DevViewer } from "./dev-viewer/DevViewer.js";
import { parseEventsTab } from "./events/EventsPage.js";
import { Shell, type ShellRoute } from "./Shell.js";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("root element is missing");
}

function parseClientRoute(pathname: string, search: string): { kind: "dev-viewer" } | ShellRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dev-viewer") {
    return { kind: "dev-viewer" };
  }
  if (path === "/events") {
    return { kind: "events", tab: parseEventsTab(search) };
  }
  if (path === "/mock-battle/result") {
    return { kind: "mock-battle-result" };
  }
  if (path === "/mock-battle") {
    return { kind: "mock-battle" };
  }
  if (path === "/people") {
    return { kind: "people" };
  }
  if (path.startsWith("/people/")) {
    const rest = path.slice("/people/".length);
    if (rest.length > 0 && !rest.includes("/")) {
      try {
        return { kind: "person-detail", personId: decodeURIComponent(rest) };
      } catch {
        return { kind: "person-detail", personId: rest };
      }
    }
  }
  return { kind: "home" };
}

const route = parseClientRoute(window.location.pathname, window.location.search);

createRoot(root).render(
  <StrictMode>{route.kind === "dev-viewer" ? <DevViewer /> : <Shell route={route} />}</StrictMode>,
);
