/**
 * FE-06 non-production traceability metadata (test/evidence only).
 * Does not own runtime state or widen API/DTO semantics.
 */

export type FeTraceRow = {
  feId: "FE-01" | "FE-02" | "FE-03" | "FE-04" | "FE-05";
  surface: string;
  route: string;
  uiOwner: string;
  api: string;
  method: "GET" | "POST";
  path: string;
};

export const FE_TRACEABILITY_ROWS: readonly FeTraceRow[] = [
  {
    feId: "FE-01",
    surface: "People list",
    route: "/people",
    uiOwner: "UI-004",
    api: "API-007",
    method: "GET",
    path: "/api/s1_5/people",
  },
  {
    feId: "FE-02",
    surface: "Person detail",
    route: "/people/<personId>",
    uiOwner: "UI-005",
    api: "UI-005 Person Detail GET",
    method: "GET",
    path: "/api/s1_5/people/:personId",
  },
  {
    feId: "FE-03",
    surface: "Mock candidates",
    route: "/mock-battle",
    uiOwner: "UI-004",
    api: "API-011",
    method: "GET",
    path: "/api/s1_5/mock-battles/candidates",
  },
  {
    feId: "FE-03",
    surface: "Mock run",
    route: "/mock-battle",
    uiOwner: "UI-006",
    api: "API-012",
    method: "POST",
    path: "/api/s1_5/mock-battles",
  },
  {
    feId: "FE-03",
    surface: "Mock replay",
    route: "/mock-battle",
    uiOwner: "UI-006",
    api: "API-013",
    method: "POST",
    path: "/api/s1_5/mock-battles/replay",
  },
  {
    feId: "FE-03",
    surface: "Mock latest",
    route: "/mock-battle",
    uiOwner: "UI-006",
    api: "API-014",
    method: "GET",
    path: "/api/s1_5/mock-battles/latest",
  },
  {
    feId: "FE-04",
    surface: "Battle log",
    route: "/mock-battle/result",
    uiOwner: "UI-007",
    api: "API-015",
    method: "GET",
    path: "/api/s1_5/mock-battles/latest/log",
  },
  {
    feId: "FE-05",
    surface: "Events",
    route: "/events",
    uiOwner: "UI-008",
    api: "API-009",
    method: "GET",
    path: "/api/s1_5/events",
  },
  {
    feId: "FE-05",
    surface: "Validation results",
    route: "/events?tab=validation",
    uiOwner: "UI-008",
    api: "API-010",
    method: "GET",
    path: "/api/s1_5/validation-results",
  },
] as const;

export const FE_INTEGRATION_ROUTES = [
  "/people",
  "/people/<personId>",
  "/mock-battle",
  "/mock-battle/result",
  "/events",
  "/events?tab=events",
  "/events?tab=validation",
] as const;

export const FE_SHELL_NAV = [
  { label: "人物", href: "/people" },
  { label: "模擬戦", href: "/mock-battle" },
  { label: "イベント", href: "/events" },
] as const;
