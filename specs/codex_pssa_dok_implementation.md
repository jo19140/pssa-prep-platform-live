# Codex Spec — Grade-3 DOK Implementation (crosswalk + Diagnostic Insights wiring)

**Type:** additive metadata + reporting wiring. **Owner:** Jonathan. **Date:** 2026-06-26.
**Goal:** make per-item Depth-of-Knowledge (DOK) a real, committed attribute for the Grade-3 diagnostics and **surface it in the teacher Diagnostic Insights view** — with **zero edits to any merged passage, item, scoring, or assembler content.** DOK is a teacher-report attribute and must **never** appear in student-facing output.

## 0. Scope & guardrails

- DOK lives in a **separate `itemId → dokLevel` crosswalk** (`data/pssa/dok_crosswalk_grade3.csv`), joined at the **report layer** by `itemId`. Do **NOT** add a `dokLevel` field to any bank item, author script, exemplar `backend.json`, the assembler, or `pssaScoring.ts`. The 167 G3 bank items stay byte-identical.
- Do NOT modify the distractorRole registry, the figure module, delivery routes, schema, or BOY/MOY/EOY content. DOK affects **reporting only**.
- **DOK is teacher-only.** It must not appear in `projectPssaStudentItem` / the student delivery DTO or any student-facing surface — assert this fail-closed.
- Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed. Never `git add -A`. STOP and report if the UI surface would require a new route or schema change (keep it a read-only addition to the existing teacher Insights panel).

## 0.1 Preflight (FAIL-CLOSED)

- All Grade-3 content is merged on the **current `origin/main` tip** (re-fetch; do not anchor on an old SHA). The committed crosswalk (`data/pssa/dok_crosswalk_grade3.csv`, sha256 `89aee67d0512720bdbde6f24d822389343dda923626f3db12b6b7ed668d2e33b`, **167 rows**) must represent every G3 item — verify EOY, MOY, BOY/Foundation, and conventions items are all present.
- Note the existing **`dokCeiling`** column in `data/pssa/anchor_ec_crosswalk_grade3.csv` (currently unpopulated). The per-item DOK is the *assigned* level; where `dokCeiling` is populated for an EC, **per-item DOK must be ≤ the EC ceiling** (validation §4; SKIP the check for ECs whose ceiling is blank).

## 1. Deliverables

- **`data/pssa/dok_crosswalk_grade3.csv`** (provided; commit verbatim) — columns `itemId,dokLevel,eligibleContent,reportingCategory,benchmark`; 167 rows; `dokLevel ∈ {1,2,3}`; unique `itemId`.
- **`lib/content/pssaDokCrosswalk.ts`** — loader: parse the CSV once, expose `dokLevelFor(itemId): 1|2|3|null` + `loadDokCrosswalk(): Map<string,number>`; validate on load that every `dokLevel ∈ {1,2,3}` and `itemId`s are unique (throw on violation).
- **Report wiring** (additive):
  - `lib/content/pssaStudentReport.ts`: add optional `dokLevel?: 1|2|3|null` to `PssaReportItem`; populate it from the crosswalk where report items are built; add a `byDok` summary to `PssaStudentReport` (`{ dok: 1|2|3; itemCount; operationalPoints; earnedPoints; pendingHumanPoints }[]`, operational items only, mirroring how `byEc` is aggregated).
  - `lib/content/pssaClassReport.ts`: add a class-level `byDok` aggregation to `ClassReport` (sum the per-student operational `byDok`), a `byDokCategory` cross-tab (DOK × `reportingCategory`), and a **separately-named `analyticsByDok`** count for the analytics layer. **`byDok` is operational-points-bearing; `analyticsByDok` is counts only — never fold analytics points into `byDok`.**
- **UI:** `components/pssa/TeacherPssaInsightsPanel.tsx` (+ `TeacherPssaInsightsClient.tsx` if needed) — a **read-only** DOK summary block (per-DOK item counts/points + the DOK × category mini-table). No new route, no new data fetch beyond the existing `ClassReport`. STOP if it can't be a read-only addition.
- **`scripts/test-pssa-dok-crosswalk.ts`** — validation (mirror `test-pssa-ws3c-class-report.ts`); wire into the test harness as the ws3 tests are wired.

## 2. Crosswalk contract

- Loader reads `data/pssa/dok_crosswalk_grade3.csv` (use the existing CSV-reading approach used for `anchor_ec_crosswalk_grade3.csv` — do not add a new CSV dependency).
- `dokLevelFor(itemId)` returns the level or `null` if absent (an item not in the crosswalk reports no DOK rather than throwing — but §4 asserts the EOY/MOY **form** items are all present).

## 3. Reporting semantics

- **Operational-only for points.** `byDok` earned/possible points cover **operational** items (consistent with the form's operational-only scoring); analytics items go into a **distinct `analyticsByDok`** counts-only aggregation (depth of the diagnostic layer) and **never** into `byDok` score totals — mirror the existing operational/analytics split in the report.
- **Per item:** each report item row carries its `dokLevel` (for the item-detail view), joined by `itemId`.
- **No student leakage:** the student delivery DTO and any student-facing report must not include `dokLevel` or a DOK label.

## 4. Validation (`scripts/test-pssa-dok-crosswalk.ts` asserts)

1. The crosswalk loads: 167 rows, `dokLevel ∈ {1,2,3}` for all, `itemId`s unique.
2. **Every item in the assembled EOY form (45) and MOY form (40) resolves to a DOK entry** (build the forms via the existing `assemble*DiagnosticFormFromPoolForTest`, then assert each delivered `itemId` is in the crosswalk).
3. **Per-form distribution matches the pinned crosswalk:** EOY all-items DOK = **12 / 28 / 5**; MOY all-items DOK = **12 / 23 / 5**.
4. `byDok` in a built `PssaStudentReport`/`ClassReport`: operational `byDok` point sums equal the operational total (e.g. EOY operational = 45 pts split across DOK levels); analytics DOK tracked separately and excluded from the score.
5. **Leak-free:** `projectPssaStudentItem` output (and the student-facing report) contains **no** `dokLevel`/DOK label for any item.
6. **Ceiling consistency:** for every item whose EC has a populated `dokCeiling` in `anchor_ec_crosswalk_grade3.csv`, `dokLevel ≤ dokCeiling` (SKIP ECs with blank ceiling).
7. EC↔DOK sanity: every conventions item (`E03.D.*`) is DOK 1; no DOK 4 anywhere.

## 5. Gate battery (fail-closed; local binaries)

```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-dok-crosswalk.ts
./node_modules/.bin/tsx scripts/test-pssa-content.ts
npm run test:pssa-ws3c-class-report 2>/dev/null || ./node_modules/.bin/tsx scripts/test-pssa-ws3c-class-report.ts
npm run test:pssa-pr-b        # student-DTO leak sweep (DOK must not appear)
npm run test:pssa-db6         # form-assembly regression unaffected
echo "all DOK implementation gates passed"
```

## 6. Acceptance criteria — allowed tracked paths only

```
data/pssa/dok_crosswalk_grade3.csv
lib/content/pssaDokCrosswalk.ts
lib/content/pssaStudentReport.ts            (additive: dokLevel on item + byDok)
lib/content/pssaClassReport.ts              (additive: class byDok + byDokCategory)
components/pssa/TeacherPssaInsightsPanel.tsx (read-only DOK summary)
components/pssa/TeacherPssaInsightsClient.tsx (only if needed for the read-only surface)
scripts/test-pssa-dok-crosswalk.ts
scripts/test-pssa-content.ts                (tranche wiring only, if needed)
specs/codex_pssa_dok_implementation.md
```
**Default expected diff = exactly these 7 files:** `data/pssa/dok_crosswalk_grade3.csv`, `lib/content/pssaDokCrosswalk.ts`, `lib/content/pssaStudentReport.ts`, `lib/content/pssaClassReport.ts`, `components/pssa/TeacherPssaInsightsPanel.tsx`, `scripts/test-pssa-dok-crosswalk.ts`, `specs/codex_pssa_dok_implementation.md`. Touch `TeacherPssaInsightsClient.tsx` or `scripts/test-pssa-content.ts` **only if genuinely required, and state why in the report.** Anything else (bank items/exemplars, assembler, scoring, registry, schema, delivery routes) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`. **If wiring `byDok` requires changing report scoring math or a schema field, STOP** — it must be a pure additive aggregation.

## 7. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`); guard+symlink+trap `node_modules`; carry this spec **and** the crosswalk CSV into the worktree (the CSV is committed content, not just a doc), verify the CSV sha256 = `89aee67d0512720bdbde6f24d822389343dda923626f3db12b6b7ed668d2e33b`, commit the spec + CSV, then implement. Run §5 gates → scope-guard to §6 → commit (no merge) → report. **Independent audit before merge** (Claude: run the validation over the real assembled forms, confirm the §4 numbers, leak-free, BOY/MOY/db6 regressions green, reproducibility, exact-SHA-pinned merge).
