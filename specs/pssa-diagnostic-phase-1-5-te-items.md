# PSSA Diagnostic — Phase 1.5: add two 3-point TE multipoint items (Grade 3 stamina)

> Tracked spec (single source of truth for Phase 1.5 — implement from this file, not from chat). Phase 1 (section schema + GRADE3_DIAGNOSTIC_BLUEPRINT) is merged to main at 17b7a9c.

## Goal
Add exactly two new platform-authored, PSSA-style 3-point TE multipoint items to the Grade 3 stamina pool so a true 45-point diagnostic form is feasible. Grows the candidate pool 37 → 39. The approved 37 items are NOT changed.

## Scoring framing (no engine changes)
- EBSR stays 2 points. Do NOT modify EBSR scoring, pssaScoring.ts, schema, or migrations.
- The two new items are TE multipoint (DRAG_DROP, MATCHING_GRID), NOT EBSR. The TE scoring path already supports 3 points (matching-grid: points = #cells; drag-drop: points = #assignments).
- Platform-authored PSSA-style items, not released-item clones.

## New items
1. pssa_stamina_item_g3_syrup_dd_01 — DRAG_DROP, 3 pts, Syrup passage, EC E03.B-K.1.1.3, reportingCategory B (process/sequence).
2. pssa_stamina_item_g3_boat_mg_01 — MATCHING_GRID, 3 pts, Boat passage, EC E03.A-K.1.1.1, reportingCategory A (key details / cause-effect).

## Authoring format — mirror the canonical script + foundation templates EXACTLY
Use scripts/content/author-pssa-grade3-matching-grid-drag-drop.ts and the working foundation items as the shape:
- MATCHING_GRID → pssa_mg_g3_lantern_01: stem, instructionText, rows[], columns[], selectionRule, bothColumnId, correctCells[], scoring. Each row: {rowId, label, correctColumnId, groundedInPassageId, evidenceQuote, rationale, plausibleWrongRationales}.
- DRAG_DROP → pssa_dd_g3_lantern_01: prompt, instructionText, tokens[], targets[], correctAssignments[], useAllTokens, scoring. Each token: {tokenId, text, isDistractor, groundedInPassage, evidenceQuote, validTargetIds, rationale}.
- Evidence field is evidenceQuote — a verbatim passage substring. Do NOT add evidenceLinks / paragraphIndex / sentenceIndex / startChar / endChar (that is the EBSR format, wrong for TE). The key-free student DTO strips correctColumnId / correctAssignments / evidenceQuote / scoring by projection (existing PR-B path) — do not hand-author a runtime DTO or a new shape.
- STOP if: the authoring format cannot represent totalPoints: 3, or the existing TE scoring path rejects a 3-point DRAG_DROP/MATCHING_GRID, or any scoring/schema/engine change appears necessary.

## Item content (all six evidence quotes verified verbatim against the passages)

### syrup_dd_01 — DRAG_DROP, 3 pts
- prompt: "Put the steps in order to show how the Alvarez family turns sap into syrup." instruction: "Drag each step into the correct order."
- 3 targets (order positions 1/2/3), useAllTokens: true. Present the tokens in a SCRAMBLED (non-correct) display order so the item is not solvable by a presented-order shortcut; correctAssignments still map each token to its order position.
- Order 1 token: "A bucket catches the sap as it drips from the tapped tree." — evidenceQuote: "A bucket or a long plastic tube hangs below to catch the steady drips."
- Order 2 token: "The sap is boiled so the water turns to steam and floats away." — evidenceQuote: "As the sap heats, the water in it turns into steam and floats away into the air."
- Order 3 token: "The finished syrup is poured through a filter and sealed in jars." — evidenceQuote: "it is poured through a filter to remove tiny bits of bark, then sealed into clean jars"
- scoring: totalPoints: 3, 1 pt per correctly placed token (3/2/1/0), partialCreditRules mirroring the lantern drag-drop.

### boat_mg_01 — MATCHING_GRID, 3 pts
- stem: "For each detail, choose what the detail helps explain." instruction: "Choose one column for each row."
- columns: "Why June's boat lasted" / "Why a fancy boat failed". selectionRule: one_per_row. Keep the 2-1 split — do NOT add a third artificial column.
- Row: "Four milk jugs held the boat up over the choppy water." → "Why June's boat lasted" — evidenceQuote: "four milk jugs holding it up like four small, stubborn hands"
- Row: "June tested the boat eleven times to be sure it floated." → "Why June's boat lasted" — evidenceQuote: "Eleven times I tested that boat, and eleven times it floated."
- Row: "A sudden gust tipped the tall ship sideways, and its sail dragged it under." → "Why a fancy boat failed" — evidenceQuote: "a sudden gust tipped it sideways, and its proud sail dragged it straight under"
- 3 rows → 3 correctCells → totalPoints: 3, 1 pt per correctly matched row (3/2/1/0).
- Do NOT create or expose a "Both" column. If the canonical authoring shape requires bothColumnId, set it to null (exactly as the existing two-column / no-both lantern template does) — two columns only.

## EC-repeat note (NOT a Phase 1.5 blocker — Phase 2 constraint)
Both new ECs are already at 2 in the approved pool, so the new items make 3 at the pool level:
- E03.B-K.1.1.3: syrup_03, syrup_sa_01 (+ syrup_dd_01 = 3)
- E03.A-K.1.1.1: boat_05, rabbit_03 (+ boat_mg_01 = 3)
This is allowed at the candidate-pool level. maxReadingEcRepeats: 2 is a per-form gate — enforce it on the Phase 2 selected 45-point form (the form may include at most 2 items per EC; e.g. pick ≤2 of {syrup_03, syrup_sa_01, syrup_dd_01}). Do NOT block Phase 1.5 on this, and do NOT change any existing item's EC.

## Allowed files
- exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json (append syrup_dd_01)
- exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json (append boat_mg_01)
- scripts/test-pssa-content.ts (only tests/assertions for the 39-item pool + TE validation)
- reports/pssa_stamina_content_quality_battery.md (only if regenerated by the battery)
- specs/pssa-diagnostic-phase-1-5-te-items.md (this spec, committed)

## Not allowed
No passage text edits; no edits to the existing 37 approved items; no EBSR/scoring/pssaScoring.ts/schema/migration/delivery/PR/DB-6/foundation changes; no student-report data committed; no official Below Basic/Basic/Proficient/Advanced labeling logic. If existing approved content must change to pass, STOP.

## Verify
1. Existing 37 unchanged — deep-equal, not byte-identical: appending items reflows JSON formatting, so assert the 37 existing item objects + all passage text deep-equal their main state, ignoring the items-array length growth. (No old item text/key/evidence/scoring/EC change; no passage text change.)
2. Exactly 2 new TE items; pool count = 39; both totalPoints: 3; both validate through the existing TE scoring/contract path with no pssaScoring.ts change.
3. All 6 evidenceQuote values are verbatim passage substrings and grounded to the correct passage (groundedInPassageId / groundedInPassage).
4. npm run test:pssa-content enforced + green: enforceableFailures = 0; foundation probe 7/91/12/12/8 hashStable; no correct-is-longest / absolute-language regressions; EBSR Part A still 12 report-only.
5. Run existing TE / PR-B contract tests for DRAG_DROP + MATCHING_GRID scoring (perfect = 3, partial = 2/1, wrong = 0).
6. 45-pt feasibility: 20 reading MCQ (20) + 9 conventions (9) + 2 SA (6) + 2 EBSR×2 (4) + 2 TE×3 (6) = 45.
7. Privacy backstop — student-level anchor-analysis reports (student IDs/names/performance levels) must never be committed. Use git grep (not grep -R), and exclude this spec from the pathspec so its own guard text doesn't self-match:
     matches="$(git grep -n "PSSA ELA: Anchor Analysis by Student" -- . ':!specs/pssa-diagnostic-phase-1-5-te-items.md' || true)"
     test -z "$matches" && echo "privacy grep clean" || { echo "$matches"; exit 1; }
   Expected: privacy grep clean.
8. Scope: git diff --name-only main...HEAD limited to the two fixtures + test-pssa-content.ts + (optional) the report + this spec.

Commands: npx tsc --noEmit ; OPENAI_API_KEY=sk-build-dummy npm run build ; npm run test:pssa-content.

## Stop report
branch; commit SHA; files changed; confirm Phase 1 already on main; the 2 new IDs + types + 3-pt each; confirm the 37 existing items + passages deep-equal main; confirm no EBSR/scoring/schema/engine changes; confirm 6 evidenceQuote verbatim + grounded; confirm existing TE scoring path accepts both 3-point items (no engine change); pool count 39; the 45-pt math; test:pssa-content summary (enforceableFailures = 0); tsc + build results; report regenerated yes/no; git grep privacy result (privacy grep clean, run with this spec excluded from the pathspec).
