# ROLE3-S03-PERSON-DETAIL-TRANSMISSION-CONTRACT-GAP-20260924-R29

result-class: PRODUCT_GAP_CONFIRMED
sprint: Sprint3
role: Role3
control-authority: GitHub
checked-at: 2026-09-24T18:39:57+09:00

## Fresh canonical findings

1. `PROJECT_ROADMAP.md` keeps Sprint3 `流派・系譜` and `技の教示・継承` as product scope, with the outcome that knowledge/techniques visibly continue to later people.
2. `SPRINT3_STATUS.md` remains `REOPENED_FIX_REQUIRED`; its two named browser residuals are S03-006 ordinary parent guidance and S03-010 long-run OTL consumption. Those residuals do not prove the separate lineage/provenance presentation obligation.
3. Current `apps/web/src/client/person-detail/ui005-views.ts` declares `PERSON_DETAIL_VIEW_KEYS` as exact26 and exposes only relationship IDs (`formalMasterPersonIds`, `formalDisciplePersonIds`), current techniques, and training history. It has no accepted-teaching/provenance projection binding master + technique + disciple, and no original-technique founder/source-technique provenance field.
4. Therefore current Person Detail can show who is master/disciple and which techniques exist, but its read-model contract cannot represent the transmission lineage required to observe *which technique passed from whom to whom* or the provenance chain of an original technique. This is a source-level contract gap, not merely missing CSS/presentation.

## Required implementation boundary

The already-prepared transmission-lineage implementation must include the server/client Person Detail read-model contract, not only JSX rendering:

- project accepted teaching history into deterministic read-only lineage entries binding masterPersonId, disciplePersonId, techniqueId and stable temporal/order evidence already persisted by Sprint3;
- exclude refused/skipped teaching from inherited-lineage claims;
- project existing original-technique founder/source-technique provenance where available;
- keep server `PERSON_DETAIL_VIEW_KEYS` and client mirror exact-key validation synchronized;
- render a normal-user `技の伝承・系譜` section with explicit empty state and deterministic ordering;
- add contract/unit tests plus ordinary browser acceptance proving the visible chain;
- do not add Sprint4 marriage/birth/genealogy semantics or invent a new school-name taxonomy.

## Dispatch disposition

Cursor A is already PREPARED for `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1`; Cursor B2 is already PREPARED for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`. Do not overwrite either lane. When a compatible lane becomes genuinely free after Inbox + Active + heartbeat reconciliation, dispatch the existing transmission-lineage implementation task with this result as additional source-contract evidence.

## Closure guard

Do not close Sprint3 solely because the two browser residuals currently named in `SPRINT3_STATUS.md` pass. `流派・系譜` remains explicit Sprint3 scope, and the current exact26 Person Detail contract cannot express technique transmission provenance. Closure requires terminal implementation/browser evidence for this obligation or an explicit canonical scope decision superseding it.
