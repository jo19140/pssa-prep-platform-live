# PSSA PR C — server-side scoring module (pure lib + tests; no routes, no sessions, no legacy-scorer changes)

## Context
Plan of record: `specs/pr-b-tei-player-adapter-plan.md` §F4 (five scoring gaps) + the roadmap PR C rules ("scoring is subordinate to the detector layer"; partial credit explicit; no full credit for unsupported evidence). PR B-impl is merged (bea88b3): renderers emit `{ rowSelections }`, `{ blankSelections }`, etc., and the student DTO is key-free — scoring therefore happens ONLY server-side against `PssaItem.correctResponseJson` + `scoringJson`.

## Scope / boundary (locked)
Two deliverables, nothing else:
1. **`lib/content/pssaScoring.ts`** — a pure, server-only scoring module for PSSA items. A PSSA-specific PARALLEL module: it must not import, modify, wrap, or be imported by `lib/serverScoring.ts`.
2. **Tests** (`scripts/test-pssa-pr-c-scoring.ts`, npm `test:pssa-pr-c`) — canonical rule tables + real-bank coverage + adversarial inputs + no-key-echo.

**Explicitly NOT in PR C:** no modification of `lib/serverScoring.ts` (legacy product keeps its semantics — see EBSR divergence below), `components/StudentTest.tsx`, `app/api/test/*`, `app/api/student/session/route.ts`; no new/changed routes; no `TestSession`/assignment wiring; no schema/migrations; no DB access at all (pure functions over passed-in rows); no client imports (module is server/test-only); no TDA auto-grading and NO `essayGrader` port (PR F); no archive `teiScoring.ts` port (DO-NOT-PORT per plan §F3).

## Canonical inputs (verified against the live bank + importer builder — use these exact shapes)
`correctResponseJson` per type (as built by `correctResponse()` in `scripts/content/lib/pssa-import-plan.ts`):
- MCQ / conventions-MCQ → `{ correctIndex }`
- EBSR → `{ partA: { correctIndex }, partB: { correctIndices } }`
- MULTI_SELECT → `{ correctIndices }`
- HOT_TEXT → `{ correctSpanIds }`
- MATCHING_GRID → `{ correctCells: [{ rowId, columnId }] }`
- DRAG_DROP → `{ correctAssignments: [{ tokenId, targetId }] }`
- INLINE_DROPDOWN → `{ blanks: [{ blankId, correctIndex, correctOption }] }`
- SHORT_ANSWER → `{ expectedAnswerCore, acceptableTextSupport }` (HUMAN-scored; module must not evaluate it)
`scoringJson`: `totalPoints` + structured flags (e.g. EBSR `partAPoints`/`partBPoints`/`requirePartACorrectForFullCredit`). The `partialCreditRules` strings are DOCUMENTATION of the canonical semantics below — encode the semantics in code; do not parse rule text.

## Response payload shapes (from PR B renderers/harness — accept exactly these)
MCQ `{ selectedIndex }` · EBSR `{ partAIndex, partBIndices }` · MULTI_SELECT `{ selectedIndices }` · HOT_TEXT `{ selectedSpanIds }` · MATCHING_GRID `{ rowSelections: { [rowId]: columnId } }` · DRAG_DROP `{ assignments: { [tokenId]: targetId } }` · INLINE_DROPDOWN `{ blankSelections: { [blankId]: optionIndex } }` · SHORT_ANSWER `{ shortResponse }`.

## Result type (no key echo — locked)
```ts
type PssaScoreResult =
  | { status: "scored"; pointsEarned: number; maxPoints: number; detail: string }   // detail = rule-branch id, e.g. "ebsr_partA_plus_one_evidence"
  | { status: "pending_human_scoring"; pointsEarned: null; maxPoints: number; detail: "short_answer_rubric" | "tda_rubric" }
  | { status: "invalid_response"; pointsEarned: 0; maxPoints: number; detail: string };  // malformed/unknown ids — fail closed, never throw to caller for bad STUDENT input
```
The result must NEVER contain correct indices/ids/cells/assignments, option text of the correct answer, rationales, or any `correct*` field. Unknown interactionType or malformed ITEM data (vs. student data) → THROW (`unknown_interaction_type` / `malformed_item_scoring_data`) — item-side problems are fail-closed errors, student-side problems are 0-point results.

### Valid-but-wrong vs. malformed (PATCH 2 — locked, no blurring)
Valid-but-wrong student responses → `{ status: "scored", pointsEarned: 0 }`. Malformed student responses → `{ status: "invalid_response", pointsEarned: 0 }`. **Malformed means:** non-object payload, missing required top-level response field, wrong field type, duplicate ids/indices where uniqueness is required, out-of-domain id/index (validated against `responseSpecJson`), or any extra top-level/nested field not in the accepted response shape. Top-level `{}` is always `invalid_response`. Empty selection containers are VALID zero-point responses only when wrapped in the correct shape:
- EBSR `{ partAIndex, partBIndices: [] }` · MULTI_SELECT `{ selectedIndices: [] }` · HOT_TEXT `{ selectedSpanIds: [] }` · MATCHING_GRID `{ rowSelections: {} }` · DRAG_DROP `{ assignments: {} }` · INLINE_DROPDOWN `{ blankSelections: {} }`
- MCQ has NO valid empty shape: missing, non-integer, or out-of-range `selectedIndex` → `invalid_response`; an in-range wrong `selectedIndex` → scored 0.

## Canonical scoring semantics (locked — encode exactly; every branch gets a test)
- **MCQ (1 pt):** valid in-range integer `selectedIndex`: equals `correctIndex` → 1; in-range but wrong → scored 0; missing, non-integer, or out-of-range → `invalid_response`.
- **EBSR (2 pts):** Let A = partA correct; let B_hits = |partBIndices ∩ correctIndices|; require `partBIndices` has NO duplicates and NO index outside the choice range (else `invalid_response`); any selection count other than `correctIndices.length` is allowed input but scores by the rules below (no-extra principle: a wrong pick is a wrong pick).
  - 2 pts: A ∧ partB exactly equals correctIndices (set equality).
  - 1 pt: (A ∧ B_hits ≥ 1 ∧ partB has no incorrect picks ∧ not full set) OR (¬A ∧ partB exactly equals correctIndices).
  - 0 pts: everything else — including **A correct with zero correct evidence** (this is the canonical divergence from `lib/serverScoring.ts`, which would award 1; that legacy behavior stays UNCHANGED in the legacy module — the divergence must be documented in a code comment and proven by a test that runs BOTH modules on the same fixture and asserts the different results).
- **MULTI_SELECT / HOT_TEXT:** selections must be a SUBSET of correct (any incorrect pick → 0; "no extra selections" is absolute). Two VERIFIED bank patterns (do not assume only one):
  - **Graded** (`totalPoints === |correct set|`, e.g. 2-pt reading MS/HT): points = number of correct picks when subset (full set → totalPoints; one correct, nothing else → 1; empty → 0).
  - **All-or-nothing** (`totalPoints === 1 < |correct set|`, e.g. the 1-pt conventions HOT_TEXT with TWO correct spans): full set → 1; anything else → 0.
- **MATCHING_GRID (totalPoints = #rows = #correctCells):** +1 per row where `rowSelections[rowId] === correctCells[rowId]`; unanswered/wrong rows 0; unknown rowId or columnId in the response → `invalid_response`.
- **DRAG_DROP:** per-token equality `assignments[tokenId] === correctAssignments[tokenId]` (covers `order` — order_N targets — and `category` with distractor tokens: a placed distractor earns nothing and does not invalidate). Two VERIFIED bank patterns:
  - **Graded** (`totalPoints === |correctAssignments|`, e.g. 3-pt reading drag-drop): +1 per correct placement.
  - **All-or-nothing** (`totalPoints === 1 < |correctAssignments|`, e.g. the 1-pt conventions punctuation drags with TWO assignments): all placements correct → 1; else 0.
  Unknown token/target ids → `invalid_response`.
- **INLINE_DROPDOWN (1 pt):** ALL blanks must match their `correctIndex` → 1; any blank wrong or missing → 0 (single-defensible-answer rule from #4n).
- **SHORT_ANSWER:** ALWAYS `pending_human_scoring` with `maxPoints` from scoringJson. NO keyword heuristics, NO length checks, NO copied-text detection in this module (the copied-text cap is applied by the human rubric flow). Add `TDA` to the type union now, also always pending (grades 4–8 future).

## Hard rules
- `maxPoints` always from `scoringJson.totalPoints` — never derived from correctResponse sizes alone.
- **Item-side consistency checks are TYPE-SPECIFIC (PATCH 3 — verified against the live bank; violations → `malformed_item_scoring_data` throw):**
  - MCQ / conventions-MCQ: `totalPoints === 1`; `correctIndex` integer within `responseSpec.choices` range.
  - EBSR: `totalPoints === 2`; partA `correctIndex` in range; partB `correctIndices` non-empty, unique, every index within `responseSpec.partB.choices`; structured flags (`partAPoints`, `partBPoints`, `requirePartACorrectForFullCredit`) must not contradict the canonical semantics above.
  - MULTI_SELECT / HOT_TEXT: correct ids/indices unique and inside the responseSpec domain; `totalPoints === |correct set|` (graded) OR `totalPoints === 1` (all-or-nothing) — both patterns exist in the bank ((2,2)×5 MS; (2,2)×5 + (1,1) + (1,2) HT); any OTHER (totalPoints, set-size) combination → throw.
  - MATCHING_GRID: `totalPoints === row count === correctCells.length`; exactly one correct cell per row; all row/column ids exist in responseSpec.
  - DRAG_DROP: assignment token ids unique and exist in responseSpec; targets exist in responseSpec; `totalPoints === |correctAssignments|` (graded, (3,3)×5) OR `totalPoints === 1` (all-or-nothing, (1,2)×2); other combinations → throw. Distractor tokens legitimately exist in responseSpec but not in `correctAssignments`.
  - INLINE_DROPDOWN: `totalPoints === 1`; every blank has a valid `correctIndex` within its authored options.
  - SHORT_ANSWER / TDA: `maxPoints` from `scoringJson.totalPoints`; no automatic correctness validation attempted.
- Module is pure: inputs are `(item: PssaScorableItem, response: unknown)`; no imports from Prisma, no DB, no fetch.
```ts
type PssaScorableItem = {
  interactionType: string;
  correctResponseJson: unknown;
  scoringJson: unknown;
  responseSpecJson?: unknown; // runtime-required for machine-scored types; optional for SA/TDA
};
```
- **`responseSpecJson` is REQUIRED for every machine-scored interaction type (PATCH 1)** and is used ONLY to validate the allowed response domain: choice counts, span ids, row ids, column ids, token ids, target ids, blank ids, option ranges. Without it the scorer cannot distinguish "wrong but valid" from "out-of-domain" (EBSR index 7 vs. a 4-choice item; unknown spanId; unknown rowId; distractor token vs. unknown token; option index range). Missing/malformed `responseSpecJson` on a machine-scored item → `malformed_item_scoring_data` throw. For `SHORT_ANSWER`/`TDA`, `responseSpecJson` may be absent — result is still `pending_human_scoring` with `maxPoints` from `scoringJson.totalPoints`.
- "Scoring subordinate to detectors": this module never re-runs or overrides audit gates; it scores only what approval + the selector already certified. Note this in the module docblock.

## Tests (all pure; npm `test:pssa-pr-c`)
1. **Rule-table tests**: every branch above per type, incl. the 1-pt EBSR disjunction both ways, MS/HT one-correct-no-extras=1 vs one-correct-plus-one-wrong=0, the all-or-nothing variants on REAL conventions items (1-pt HT with 2 correct spans: full set=1, one-of-two=0; 1-pt DD with 2 assignments: both=1, one=0), grid partial rows, drag-drop order + category-with-distractors, dropdown all-or-nothing, and the empty-container-valid vs `{}`-invalid distinction per type.
2. **Real-bank coverage**: for each of the 79 items, build the CORRECT response from `correctResponseJson` → assert full `totalPoints`; build one systematically wrong response → assert 0 or partial per rules; SA items → `pending_human_scoring`.
3. **Adversarial inputs**: duplicates in partB/selectedIndices, out-of-range indices, unknown rowId/tokenId/blankId, null/undefined/string-typed payloads, empty objects → `invalid_response` (never throw, never NaN, never negative or > maxPoints).
4. **No-key-echo test**: recursively walk every result object from tests 1–3:
   - no keys matching `/correct/i`, `answerKey`, `rationale`, or scoring/key names;
   - no array/object value deep-equal to correct ids/indices/cells/assignments;
   - no string value equal to a correct id, token id, target id, row id, column id, span id, blank id, or correct option text;
   - numeric `pointsEarned`/`maxPoints` are allowed and must NOT be compared against scalar correctIndex values (no false-fail on score numbers);
   - `detail` must come from the fixed branch-id enum.
5. **Legacy-divergence test**: same EBSR fixture through `scorePssaItem` (0 pts for A-only) and legacy `scoreAssessmentQuestion` (1 pt) — assert both, proving the legacy module is untouched and the divergence is intentional.
6. **Fail-closed tests**: unknown type throws; rows/totalPoints mismatch throws.
`tsc --noEmit` + `build` + all existing `test:pssa-*` suites green. `git diff` must show exactly: the new lib file, the new test file, package.json script line.

## Stop — report (for Claude's independent audit)
The full rule-table implementation; the EBSR divergence comment + test output; real-bank coverage counts (79/79, full-credit + wrong-response results per type); adversarial test list + results; no-key-echo proof; `git diff --stat`; tsc/build/test outputs. Do NOT touch serverScoring.ts, any route, any component. Do NOT auto-score SHORT_ANSWER/TDA under any flag.
