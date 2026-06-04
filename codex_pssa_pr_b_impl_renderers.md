# PSSA PR B-impl — two canonical renderers + per-type projected student DTO (admin preview only; no sessions, no scoring, no student routes)

## Context (read first)
Plan of record: `specs/pr-b-tei-player-adapter-plan.md` (Pro-approved, incl. §F2b correction). Visual contract signed off: `exemplars/pssa_item_type_mocks/pr_b_matching_grid_inline_dropdown_mockups.html` — match its interaction behavior; its dashed "renderer contract" annotation panels are MOCK-ONLY and do not ship in any student-facing surface (they MAY appear on the admin fixture page).

## Scope / boundary (locked)
Four deliverables, nothing else:
1. **`lib/content/pssaStudentDto.ts`** — per-interaction-type student-safe PROJECTION of `PssaItem.responseSpecJson` (+ `interactionType/Subtype`, `pointValue`). Deny-by-default at every depth.
2. **Two renderers**: `components/pssa/MatchingGridItem.tsx` (new) and `components/pssa/InlineDropdownItem.tsx` (adapted from archive `components/tei/InlineDropdownItem.tsx` — adapt the UX, NOT its client-scoring or old item shape).
3. **Admin fixture page** `app/admin/pssa-preview/page.tsx` — renders the two new renderers (plus optionally the projected DTOs for the other 7 types as JSON) from FIXTURES and/or reviewer-preview artifacts.
4. **Tests** (`scripts/test-pssa-pr-b-renderers.ts`, npm `test:pssa-pr-b`): recursive DTO leak tests + per-type response-state tests + projection unit tests.

**Explicitly NOT in PR B-impl (hard boundaries from the plan + Pro):**
- NO modification of `components/StudentTest.tsx` (the `correctIndices.length` fix is PR D wiring work — document, don't touch).
- NO modification or reuse of `app/api/student/session/route.ts` for PSSA; PSSA must be unreachable through legacy plumbing.
- NO scoring anywhere (client OR server) — scoring is PR C. Renderers emit response payloads; nothing evaluates them.
- NO `TestSession` reads/writes, no assignment wiring, no student-facing route of any kind, no schema/migration changes, no archive `teiScoring.ts` port.

## Deliverable 1 — per-type projection (`pssaStudentDto.ts`)
Input: a `PssaItem`-shaped row (or backend-JSON item). Output: `PssaStudentItemDto`. Exact projections (NOTHING else passes; unknown fields dropped at every depth):
- `MCQ` → `{ prompt, choices: [{ text }] }` (choice order preserved; index is positional)
- `EBSR` → `{ partA: { prompt, choices: [{ text }] }, partB: { instruction, choices: [{ text }], requiredSelectionCount?: number } }`. **Count rule (Pro patch, adjusted to verified data):** `requiredSelectionCount` comes from an explicit numeric responseSpec field ONLY — NEVER derived from `correctIndices`, `correctResponseJson`, or `scoringJson` (banned). VERIFIED FACT: the current Grade 3 `responseSpec.partB` carries only `instruction` TEXT ("Choose two answers.") and `choices` — no numeric field. So when absent: OMIT the field (do not parse instruction text, do not fail the projection — failing closed here would break all 5 real EBSR items and the 79-item leak test); the renderer then gates completeness on ≥1 selection and displays the instruction text verbatim; count enforcement is server-side scoring (PR C). FOLLOW-UP (note in stop-report, do NOT implement): an additive authoring/serializer change adding `partB.requiredSelectionCount` to responseSpec is the durable fix.
- `MULTI_SELECT` (canonical, all 5 bank items are `choose_n_*` checkbox lists) → `{ stem, instructionText, choices: [{ text }], minSelections, maxSelections, exactSelectionCount }`
- **CHECK_TABLE (Pro flag, resolved by repo verification):** `CHECK_TABLE` is a LEGACY StudentTest/diagnostic mode — zero occurrences in the #4j contracts, the import pipeline, or the Grade 3 bank (the canonical table-shaped interaction is MATCHING_GRID, projected above). The projection must NOT define a CHECK_TABLE shape. Fail-closed rule instead: the projection accepts only the canonical `interactionType` values listed here; any unknown type, or a MULTI_SELECT carrying table-like fields (`rows`/`columns`/`cells`), THROWS `unknown_interaction_shape` — a future table-mode multi-select would be a #4j contract amendment, not a silent projection patch.
- `HOT_TEXT` → `{ prompt, instructionText, selectableSpans: [{ spanId, text, paragraphIndex, sentenceIndex, startOffset, endOffset }], requiredSelectionCount }`
- `MATCHING_GRID` → `{ stem, instructionText, selectionRule, rows: [{ rowId, label }], columns: [{ columnId, label }] }`
- `DRAG_DROP` → `{ prompt, instructionText, tokens: [{ tokenId, text }], targets: [{ targetId, label }], useAllTokens }`
- `INLINE_DROPDOWN` → `{ stem, instructionText, baseTextWithBlanks, blanks: [{ blankId, position, options: [{ text }] }] }`
- `SHORT_ANSWER` → `{ stem, instructionText, requiredSupportCount, requiresTextSupport }`
- `CONVENTIONS`-stream items project via their interactionType (they are MCQ/HOT_TEXT/DRAG_DROP/INLINE_DROPDOWN surfaces).
**Banned at every depth (assert in tests):** `correctColumnId`, `correctIndex`, `correctIndices`, `correctSpanIds`, `correctCells`, `correctAssignments`, `supportsPrompt`, `supportsPartA`, `errorPattern`, `evidenceQuote`, `distractorRole`, `rationale`, `targetWordOrPhrase`, `targetSkill`, `answerKey`, `scoringJson`, `correctResponseJson`, and any key matching `/correct/i`. Implement as an explicit per-type field map PLUS a final recursive deny-sweep that throws if a banned key survives (defense in depth — the sweep is a tripwire, not the mechanism).

## Deliverable 2 — renderers (match the signed-off mocks)
Both: consume ONLY `PssaStudentItemDto`; props contain no `correct*` field by type definition; controlled components reporting `onChange(responsePayload)`; submit-gating state exposed (`isComplete`) but no submit ACTION wired (that's session work).
- **MatchingGridItem**: table with `role=grid`; one selection per row (`one_per_row`; `one_per_row_with_explicit_both_column` renders identically — the Both column is just a column); focusable radio cells — Arrow keys move within row, Space/Enter selects; per-row clear button in tab order after the row's cells; screen-reader cell label = row label + column label; answered-count line; payload `{ rowSelections: { [rowId]: columnId } }`.
- **InlineDropdownItem**: native `<select>` per blank embedded in `baseTextWithBlanks` flow; placeholder "Choose…"; `aria-label="Blank n of N"`; options in AUTHORED order (no shuffle); selected state styled; payload `{ blankSelections: { [blankId]: optionIndex } }`. **Responsive acceptance (from sign-off):** readable at 320px-wide column, 200% zoom, and with the longest real Grade 3 option text + 2 blanks in one sentence — no mid-select line break that orphans punctuation (test with a long-options fixture).

## Deliverable 3 — admin fixture page
`requireUser(["ADMIN"])` server-side + middleware (same pattern as `/admin/pssa-review`); rate-limited if it has any API route (prefer NO new API route — static fixtures imported server-side); fixtures = toy items shaped exactly like the bank (may import shapes from `exemplars/` backend JSONs at build time, passing them THROUGH the projection so the page proves the projection live); no `TestSession` model imports anywhere in the page tree; contract/annotation panels allowed here.

## Deliverable 4 — tests (all pure, no DB)
1. **Recursive leak tests**: run every real Grade 3 backend item (all 6 exemplar files, all 79 items) through the projection; assert zero banned keys at any depth of the output (walk recursively). Plus adversarial: plant `correctResponseJson`/`answerKey`/nested `correct*` inside a fixture's rows/blanks/options/spans arrays → projection drops or throws, never passes.
2. **Per-type response-state tests** (Pro's bullet): for MATCHING_GRID, INLINE_DROPDOWN, HOT_TEXT select-N, MULTI_SELECT, DRAG_DROP, EBSR, MCQ/CONVENTIONS, SHORT_ANSWER (CHECK_TABLE removed — legacy-only, see projection section; instead add a negative test: MULTI_SELECT fixture carrying `rows`/`columns`/`cells` → projection throws `unknown_interaction_shape`): construct the projected DTO, simulate a complete student response, assert the response payload serializes correctly WITHOUT any `correct*` field present anywhere in the inputs. **Harness rule (Pro):** for existing surfaces other than MATCHING_GRID and INLINE_DROPDOWN, response-state tests use pure DTO + response-payload helpers/fixtures — they must NOT import, modify, or snapshot `components/StudentTest.tsx`. The goal is proving each projected DTO contains enough key-free data to construct a student response payload; renderer integration into the real student shell remains PR D.
3. **Projection unit tests**: each type maps the documented fields and ONLY those (snapshot the projected shape of one real item per type).
4. **Gating tests**: MatchingGrid `isComplete` false until every row selected; InlineDropdown false until every blank selected.
`tsc --noEmit` + `build` + existing `test:pssa-db5`/`db5-1`/`db6`/`db6-5` all green (no ripple).

## Acceptance
Projection = explicit per-type maps + recursive deny-sweep tripwire; all 79 real items project clean; renderers match the signed-off mock behavior incl. keyboard/a11y spec above; admin page gated and fixture-backed with zero TestSession imports; StudentTest.tsx and student session route byte-untouched (`git diff` proves); no scoring code anywhere in the diff; scope = exactly the 4 deliverables + package.json script.

## Stop — report (for Claude's independent audit)
The projection field maps; the deny-sweep implementation; leak-test output over the 79 real items; per-type response-state test list + results; keyboard-behavior implementation notes for the grid; the responsive/zoom check evidence for inline dropdown; `git diff --stat` proving StudentTest.tsx + student session route untouched; tsc/build/test results.

Additionally report these two evidence blocks verbatim (Pro requirement):
```
CHECK_TABLE search evidence:
- #4j contracts: zero canonical occurrence
- import pipeline: zero canonical occurrence
- Grade 3 bank: zero occurrence
- all 5 MULTI_SELECT items are choose_n_* checkbox-list shapes
```
```
EBSR count evidence:
- all 5 real EBSR responseSpec.partB objects lack numeric requiredSelectionCount
- projection omits requiredSelectionCount when absent
- no instruction-text parsing
- no access to correctIndices/correctResponseJson/scoringJson
```
Do NOT wire sessions, scoring, or any student route. Do NOT "improve" the legacy student session route.
