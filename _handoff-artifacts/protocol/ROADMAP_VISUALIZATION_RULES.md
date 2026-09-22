# ROADMAP_VISUALIZATION_RULES

authority: coordination-display-rule
scope: dollworld roadmap visualization in ChatGPT / PM coordination
purpose: Prevent stale or misleading roadmap displays by separating long-range roadmap structure from live execution state.

## 1. Trigger

When the user asks to visualize or show the roadmap/current project position/progress, do not determine the current position from `PROJECT_ROADMAP.md` alone.

## 2. Source separation

Treat `PROJECT_ROADMAP.md` as the source for:
- overall phases;
- project intent;
- major dependencies;
- future direction;
- completion image.

Treat live PM / CURRENT / ACTIVE / OUTBOX state as the source for:
- current implementation position;
- current acceptance/audit state;
- current blockers and dependency waits;
- worker activity.

Before rendering a current roadmap view, check the latest available live state, including as applicable:
- PM run / PM current state;
- `ROLE1_CURRENT.md`;
- `ROLE2_CURRENT.md`;
- `ROLE3_CURRENT.md`;
- `CURSOR_ACTIVE_TASK.md`;
- `CURSOR_B2_ACTIVE_TASK.md`;
- relevant OUTBOX / latest status when needed.

If roadmap and live state differ, use live state for the current-position overlay.

## 3. Default visualization form

Use the established card-style roadmap visualization by default.

Top:
- Sprint 0;
- Sprint 1;
- current Sprint.

Middle:
- Backend / API lane;
- Frontend / Browser lane.

Additional current-state cards where relevant:
- PM run;
- Dev Viewer / surface verification;
- current blockers;
- remaining closure steps.

Bottom:
- current Sprint completion path;
- future Sprints.

## 4. Status symbols

- ✅ = completed / accepted / formally closed
- ▶ = actively being worked now
- 🟡 = implementation exists but verification / acceptance / runtime confirmation remains
- 🔒 = waiting on authority or upstream dependency
- 🛠 = auxiliary implementation or improvement in progress
- ⚪ = worker idle / paused
- ⬜ = future phase or genuinely not started
- 🔴 = blocked / stopped

Do not use `⬜` for work that is already implemented but waiting for acceptance. Use `🟡`.

## 5. Implementation vs acceptance

Never collapse these into one state.

Example:
- `🟡 FE-06 — implementation complete / independent acceptance pending`
- `✅ FE-06` only after current authority says it is accepted/closed.

Backend/API implementation completion does not imply Browser/Frontend completion.

## 6. Dev Viewer lane

Display Dev Viewer separately from formal Frontend/Browser scope.

Dev Viewer means:
- thin browser surface for inspecting accepted/available APIs;
- developer/user visual confirmation;
- auxiliary inspection tooling.

Dev Viewer completion MUST NOT be counted as formal Sprint 1.5 Frontend closure unless separate current authority explicitly says so.

## 7. Required ending sections

A roadmap visualization should normally show:
- `現在の残り`;
- `その先`.

## 8. Freshness rule

Before presenting a roadmap as current:
1. read roadmap structure;
2. obtain latest live PM/current/active state available;
3. overlay current state onto roadmap;
4. distinguish implementation, acceptance, authority wait, and idle state.

Do not reuse a previously rendered current-state diagram without checking freshness while the project is actively moving.

## 9. Conflict handling

If `PROJECT_ROADMAP.md` appears stale relative to CURRENT / ACTIVE / accepted status:
- visualize current position from live authority;
- preserve roadmap phase structure;
- flag that the roadmap document may require PM synchronization if the difference is material.

## 10. Display goal

The visualization must answer at a glance:
1. Where is dollworld in the overall project?
2. What is actually complete versus merely implemented?
3. What is blocking or waiting right now?

The default card visualization is the canonical ChatGPT presentation style for this purpose.
