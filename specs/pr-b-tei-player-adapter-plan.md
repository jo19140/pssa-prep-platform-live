# PR B — TEI player adapter plan (investigation deliverable, per STATE_TRACK_ROADMAP)

Status: PLAN ONLY — no code in this PR. Produced 2026-06-04 from direct comparison of
(a) archive `components/tei/*` + `lib/teiScoring.ts` on `state-track/pssa-v2-lessons-and-tei-player`,
(b) the canonical `responseSpec` union (#4j, as serialized by `scripts/content/lib/pssa-import-plan.ts` into `PssaItem.responseSpecJson`),
(c) the ACTIVE player/scoring surfaces on `main`: `components/StudentTest.tsx` (812 lines), `app/api/student/session/route.ts`, `app/api/test/{start,answer,submit}`, `lib/serverScoring.ts`.

## Headline findings

### F1 — The live player already covers most of the TEI surface. Extend it; do not port the archive player.
`StudentTest.tsx` renders, today: `MCQ`/`CONVENTIONS`, `EBSR` (two-part), `HOT_TEXT`, `MULTI_SELECT` (incl. a `CHECK_TABLE` interaction mode), `DRAG_DROP` (mapping + categories), `SHORT_RESPONSE` — with accessibility read-aloud text per type. Missing vs. the Grade 3 bank: **canonical MATCHING_GRID and INLINE_DROPDOWN renderers**. (Note: `StudentTest.tsx` ~line 444 has a legacy inline-dropdown-ish branch under `DRAG_DROP` with `interactionMode === "INLINE_DROPDOWN"` — it is NOT the canonical `responseSpec.INLINE_DROPDOWN` renderer and must not be conflated with or extended into one; the canonical renderer is new work.) The roadmap's no-parallel-player rule is therefore cheap to honor: the adapter is (1) a payload-mapping layer + (2) two new renderers + (3) targeted fixes, not a player port.

### F2 — BLOCKER-CLASS: the live delivery path ships answer keys to the browser.
`app/api/student/session/route.ts` returns `AssessmentQuestion.questionPayload` RAW (`return payload` / `{ ...payload }`), and `StudentTest.tsx` provably depends on the key being present (line ~160: `maxSelections = currentQuestion.correctIndices.length`). Acceptable for the legacy diagnostic product; a hard violation of the PSSA student-preview leak gates. **PSSA delivery must NOT reuse this path.** A new sanitized DTO is required.

### F2b — CORRECTION (verified 2026-06-04): `responseSpecJson` is NOT key-free either. The DTO must be a per-type PROJECTION, not a pass-through.
Direct inspection of the bank + the `responseSpec()` serializer in `pssa-import-plan.ts` (~lines 351–355) shows several types pass authoring-rich structures through raw:
- **MATCHING_GRID**: `rows` passed raw — every row carries **`correctColumnId`** (the full answer key) plus `evidenceQuote`.
- **HOT_TEXT**: `selectableSpans` passed raw — each span carries **`supportsPrompt`** (true ⇒ correct span), `distractorRole`, `rationale`.
- **MULTI_SELECT**: `choices` passed raw — each choice carries **`supportsPrompt`**, `distractorRole`, `rationale` (key derivable).
- **INLINE_DROPDOWN**: `correctIndex`/`rationale` stripped, but `options[].errorPattern` survives (**null ⇒ correct option** — key derivable) along with `targetWordOrPhrase`/`targetSkill`.
- **DRAG_DROP / MCQ**: tokens/targets/choices pass through whatever authoring fields they carry — must be audited per-field, not assumed clean.
Additionally, the DB-5.1 `sanitizeStudentPreview` is a TOP-LEVEL key allowlist: allowlisted keys (`choices`, `tokens`, `blanks`, …) retain their nested contents. Fine for the admin review UI (admins see the reviewer block anyway); **insufficient as the student DTO pattern.**
**Requirement for PR B-impl:** the student-safe DTO is a per-interaction-type explicit field PROJECTION (deny-by-default at every depth): rows → `{rowId, label}`; columns → `{columnId, label}`; spans → `{spanId, text, offsets}`; choices → `{text}` (+ index order); blanks → `{blankId, position, options: [{text}]}`; tokens/targets → id + display text only. The recursive planted-key leak test (gate section) must ALSO assert these real field names (`correctColumnId`, `supportsPrompt`, `errorPattern`, `evidenceQuote`, `distractorRole`, `rationale`, `targetWordOrPhrase`) are absent from every depth of the serialized DTO — these are live leaks in real data, not hypothetical plants.
The DTO is then: form structure + passages + per-item projected spec + `interactionType/Subtype` + `pointValue` — nothing else.

### F3 — The archive player is REFERENCE-ONLY, with one ADAPT candidate.
The archive renderers score CLIENT-SIDE (`submitResponse` → `scoreItem(item, raw)` in the browser, key shipped in `item` props) — a worse leak than F2, and its scoring matches by normalized TEXT (`arraysEqualIgnoreOrder` on strings) while canonical `correctResponseJson` is index/id-based (`correctIndices`, `correctSpanIds`, `correctCells`, `correctAssignments`, `blanks[].correctIndex`). Disposition per file:

| Archive file | Disposition | Why |
|---|---|---|
| `InlineDropdownItem.tsx` | **ADAPT** | Fills a real gap; rework to `responseSpec.INLINE_DROPDOWN` (`baseTextWithBlanks` + `blanks[].options`, key stripped), server-scored |
| `EvidenceMappingItem.tsx`, `DragDropTableItem.tsx` | **REFERENCE** for a NEW MatchingGrid renderer | PSSA matching grid is select-per-row-cell (one_per_row / explicit-Both column), not drag-into-table; a thin checkbox/radio grid is simpler and matches `responseSpec.MATCHING_GRID` (`rows`, `columns`, `selectionRule`) — answers the roadmap's open question: **new renderer, not reuse** |
| `MultipleChoiceItem`, `MultiSelectItem`, `HotText*`, `DragDrop*`, `TwoPartEBSRItem` | REFERENCE-ONLY | Live player already covers these |
| `types.tsx` (`ItemShell`, `FeedbackPanel`, `SubmitButton`) | REFERENCE-ONLY | UX patterns fine; the `submitResponse` client-scoring path must not be ported |
| `lib/teiScoring.ts` | **DO-NOT-PORT** | Client-side + text-matching + old kebab type strings (`"two-part-ebsr"`); canonical scoring derives from `correctResponseJson`/`scoringJson` |
| `lib/essayGrader.ts` | Defer to PR F | TDA/CR grading is its own reconciliation |

### F4 — `lib/serverScoring.ts` is the right home for scoring, with five PSSA gaps (PR C scope).
It already scores server-side, keyed by uppercase type, with partial credit for EBSR and DRAG_DROP. Gaps vs. the canonical contracts: (1) no MATCHING_GRID, (2) no INLINE_DROPDOWN, (3) HOT_TEXT scores a SINGLE span (`selectedSpanIndex`) but canonical hot-text is select-N via `correctSpanIds`, (4) partial credit is hardcoded per type instead of driven by `scoringJson.partialCreditRules`, (5) `SHORT_RESPONSE` uses a keyword heuristic — **forbidden for PSSA SA** (`autoScoringClaim=false`; #4o): SA must route to human scoring via the existing TDA `pending_tda_grading` pattern (teacher scores against the 3/2/1/0 rubric; `TeacherTdaScoringPanel` is the precedent surface).

### F5 — Session/form bridge is PR D's decision; PR B/C must not preempt it.
`TestSession` is keyed to `assessmentId`. `PssaForm` (DB-6) is pool-referencing and deliberately not wired to delivery. Two options exist (new `pssaFormId` on TestSession vs. materializing a form into an `Assessment` reference); both touch schema, so per the roadmap, **PR D decides**. PR B/C should build the renderer/scoring layers against an interface (`deliverableForm` DTO) that either bridge can satisfy.

## Proposed implementation sequence (post-sign-off; each its own Codex spec + audit)
1. **PR B-impl — renderers + sanitized preview/deliverable-form DTO adapter (no sessions, no scoring, no student delivery):** mapping layer `responseSpecJson` → existing `StudentTest` question props (fixing the `correctIndices.length` dependency to use `responseSpec` counts: `exactSelectionCount`/`maxSelections`/`requiredSupportCount`); new `MatchingGridItem`; adapted `InlineDropdownItem`; sanitized DTO with allowlist + adversarial leak test; storybook-style fixture page behind ADMIN for visual sign-off (NOT student-routed). "Delivery" naming is reserved for post-PR-D work — until the bridge exists, this DTO serves admin preview and the future deliverable-form interface only.
2. **PR C — scoring reconciliation:** extend `scoreAssessmentQuestion` (or a PSSA-typed sibling) for the 5 gaps, driven by `correctResponseJson`/`scoringJson`; SA→human-scoring queue; scoring unit tests per type incl. partial-credit rules and an adversarial no-key-in-response-echo test.
3. **PR D — schema/session bridge** (separate decision doc, then migration).
Mock-before-Codex applies to PR B-impl: per-type visual mockups (MATCHING_GRID + INLINE_DROPDOWN at minimum, ideally all eight against real Grade 3 items via the reviewer-preview artifacts) get Jonathan's sign-off before the build spec ships.

## Gate inheritance (binding on PR B-impl/C, per #4j §4a + DB-5.1 precedent; Pro hardening 2026-06-04)
- Student DTO: key-allowlist + planted-key adversarial test (extend, don't re-derive, the DB-5.1 sanitizer).
- **Legacy-route quarantine (Pro):** PR B-impl must NOT modify or reuse `app/api/student/session/route.ts` for PSSA. Any PSSA preview/demo route must be admin-only, fixture-backed or reviewer-preview-backed, and must not create or read `TestSession` rows. No "sanitize a little" inside legacy plumbing — PSSA must be unreachable through it.
- **Recursive DTO leak test (Pro):** not just top-level allowlist — plant `correctResponseJson`, `correctIndices`, `correctSpanIds`, `correctCells`, `correctAssignments`, `correctIndex`, `answerKey`, `scoringJson`, and nested `correct*` fields at multiple depths (inside rows/blanks/options arrays where TEI specs hide leaks), then assert none survive serialization.
- **Per-type response-state tests (Pro):** acceptance includes proving every renderer serializes a student response WITHOUT any `correct*` prop present: MATCHING_GRID, INLINE_DROPDOWN, HOT_TEXT select-N, MULTI_SELECT, CHECK_TABLE mode, DRAG_DROP, EBSR, MCQ/CONVENTIONS, SHORT_RESPONSE.
- Renderers must consume `responseSpec` ONLY; any prop named like `correct*` in a student-route component is a review-blocking defect.
- Scoring lives server-side; `/api/test/answer`-style minimal response (no key echo).
- Delivery of an item requires it to be in the LIVE `getStudentReadyPssaItems` result at serve time (selector recompute at delivery, same rule DB-6 applies at assembly).

## Resume conditions check (roadmap §Resume)
1. #4n merged ✓ (conventions rebuild on main). 2. #4o merged ✓ (short-answer gates on main). 3. Content-v3 shipped through PR #36 ✓ (now through Phase 4 foundation). **All resume conditions for the reconciliation sprint are satisfied.**
