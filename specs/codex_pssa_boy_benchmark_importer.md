# Codex Spec — BOY/stamina benchmark importer (DB-import path for the BOY diagnostic)

**Type:** import-pipeline extension (completes BOY/MOY/EOY). **Owner:** Jonathan. **Date:** 2026-06-28.
**Goal:** give the BOY diagnostic a real DB-import path. The BOY diagnostic (`GRADE3_DIAGNOSTIC_BLUEPRINT`, `pde-ela-diagnostic-stamina-2025-g3-v1`) pins **stamina-pool** items (`pssa_stamina_item_g3_*`), a SEPARATE content set from the foundation bank — and the stamina pool is the **oldest** diagnostic content, so two item shapes differ from EOY/MOY. Add a `"boy"` benchmark + manifest + the older-shape eligibility support + the CLI allow-list. **Foundation, EOY, and MOY imports stay byte-identical.**

## 0. Why this is a real importer tranche (verified)
- BOY pins `pssa_stamina_item_g3_*` from `exemplars/pssa_grade3_stamina_pilot/` — NOT in the foundation import (which uses `pssa_item_g3_*`). So the stamina pool must be imported under its own benchmark.
- Reuse the proven generalization: `buildDiagnosticBenchmarkPlan(benchmark)` + `PSSA_BENCHMARK_IMPORT_MANIFESTS` + `--benchmark` + benchmark-aware DB-5 drift gate. The schema-aware eligibility validator needs **two additive cases** for the older stamina shapes (below).

## Stamina pool inventory (verified)
- 5 backends: `syrup_released_length`, `boat_literary_released_length`, `owls_paired_released_length`, `rabbit_drama_released_length`, `conventions_mc_block` (under `exemplars/pssa_grade3_stamina_pilot/`).
- **5 passages** (syrup 1, boat 1, rabbit 1 standalone; owls = 2 inside the paired group `pssa_pg_g3_owls_paired_01` members `passage_1`=night / `passage_2`=barn; conventions 0). **39 items.**
- Interaction types: **MCQ 29 (20 reading + 9 MCQ-format conventions), EBSR 4, SHORT_ANSWER 4, MATCHING_GRID 1, DRAG_DROP 1.**
- **6 batches** (verified via `batchIdFor`): MCQ-with-passage → readingMcq (20); MCQ-without-passage → conventions (9); ebsr (4); matchingGrid (1); dragDrop (1); shortAnswer (4).
- 0 deprecated, 0 supersessions. Owls items: `passageGroupId` set, `passageLinks` present, `isCrossText:null`, no `requiredEvidenceSlotsJson` (so readiness passes trivially; the group + its 2 passages still persist).
- **Schema drift (the reason for §3):** stamina **MCQ** items have **no `correctResponseJson`** — they use top-level `correctIndex` + `structuredChoicesJson` (+ `answerChoicesJson`), no `responseSpecJson`. Stamina **SHORT_ANSWER** uses `correctResponseJson.expectedAnswerCore` + `acceptableTextSupport` (not the EOY/MOY `rubric`/`scoreBandExamples` shape). EBSR / MATCHING_GRID / DRAG_DROP already match the newer `correctResponseJson` shapes.

## 1. Scope & guardrails
- Changes confined to the import pipeline + the DB-5 drift resolver + the assemble CLI allow-list + a test + this spec. Do NOT modify scoring, the assembler library, schema, delivery, the seed script, content, or the student-ready selector.
- **Foundation, EOY, and MOY imports stay byte-identical** (regressions: `test-pssa-eoy-importer`, `test-pssa-moy-importer`, `test:pssa-db6-5`, full suite).
- **HARD STOP:** if any stamina item cannot be validated without **inventing a new schema field** or **weakening student-ready rules**, STOP and report the exact item + shape mismatch. Do NOT relax the gate or fabricate a pass.
- Base off the **current `origin/main` tip** (re-fetch). Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — BOY manifest + benchmark wiring (`scripts/content/lib/pssa-import-plan.ts`)
- `PssaImportBenchmark` → add `"boy"`.
- `GRADE3_BOY_IMPORT_MANIFEST`: the 5 stamina backends; BOY-prefixed batchIds `reading_mcq_grade3_boy`, `conventions_grade3_boy`, `ebsr_grade3_boy`, `matching_grid_grade3_boy`, `drag_drop_grade3_boy`, `short_answer_grade3_boy`; `expectedCounts { passages: 5, activeItems: 39, deprecatedItems: 0, supersessions: 0, batches: 6 }`; `expectedTypeCounts { MCQ: 29, EBSR: 4, SHORT_ANSWER: 4, MATCHING_GRID: 1, DRAG_DROP: 1 }`; `conventionItemIdPrefix` = the stamina conventions item-id prefix; no deprecation file.
- Register `PSSA_BENCHMARK_IMPORT_MANIFESTS.boy = { 3: GRADE3_BOY_IMPORT_MANIFEST }`. `buildPlanForBenchmark` dispatches `boy` → `buildDiagnosticBenchmarkPlan("boy")` (grade 3 only). Add a thin `buildBoyPlan()` wrapper if the EOY/MOY wrappers have that pattern.
- Populate the owls passage group + its 2 member passages exactly as EOY/MOY P3 (the group members carry the passages; items carry `passageLinks`).

## 3. Deliverable B — older-shape eligibility (extend the schema-aware validator, ADDITIVE)
Extend the correct-response validator so the stamina shapes validate against **existing fields only** (no new schema fields):
- **MCQ:** accept the stamina shape — when `correctResponseJson` is absent, validate `Number.isInteger(item.correctIndex)` and `correctIndex` in range of `structuredChoicesJson` (or `answerChoicesJson`). Keep the existing `correctResponseJson.correctIndex` path for EOY/MOY (which carry both). Real in-range check, fail-closed.
- **SHORT_ANSWER:** accept the stamina shape — valid when `correctResponseJson.expectedAnswerCore` is a non-empty string AND `correctResponseJson.acceptableTextSupport` is a non-empty array (each support entry well-formed). Keep the existing EOY/MOY `rubric`/`scoreBandExamples` path. Fail-closed.
- EBSR / MATCHING_GRID / DRAG_DROP unchanged (their stamina shapes already match). Required-fields/pointValue/crosswalk/license/non-deprecated checks unchanged.
- These are additive shape-fallbacks; EOY/MOY items keep validating exactly as before (their tests must stay byte-identical).

## 4. Deliverable C — `--benchmark boy` + CLI allow-list (`write-pssa-items.ts`, `assemble-pssa-form.ts`)
- `write-pssa-items`: accept `--benchmark boy`; route to `buildPlanForBenchmark({grade, benchmark:"boy"})`; reject unknown; guards unchanged.
- `assemble-pssa-form` `resolveAllowedGrade3BlueprintVersion`: **add `GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion`** to the allow-list. The existing dispatch (`assembleGrade3FormFromPool` → `assembleDiagnosticFormFromPool`) already handles the BOY diagnostic blueprint. Foundation/MOY/EOY allow-list entries unchanged.

## 5. Deliverable D — BOY in the DB-5 drift gate (`lib/content/pssaItemReview.ts`)
- `benchmarkForBatchId` returns `"boy"` for the 6 BOY manifest batchIds (membership), after the EOY/MOY checks; else falls through unchanged. `currentPlanSourceCorpusHash(grade,"boy")` uses the BOY plan.

## 6. Validation (`scripts/test-pssa-boy-importer.ts`, new — mirror eoy/moy importer tests)
- BOY plan returns **5 passages, 39 active, 0 deprecated, 0 supersessions, 6 batches**; type counts `MCQ 29 / EBSR 4 / SHORT_ANSWER 4 / MATCHING_GRID 1 / DRAG_DROP 1`; batch split readingMcq 20 / conventions 9 / ebsr 4 / matchingGrid 1 / dragDrop 1 / shortAnswer 4.
- **All 39 items import-eligible** with no blocking §3 failure (the real proof the older-shape MCQ/SA validation passes honestly). If ANY item fails, STOP and report it.
- Owls paired group persisted (`pssa_pg_g3_owls_paired_01`, 2 members); determinism; crosswalk join for every BOY `eligibleContent`.
- `benchmarkForBatchId` → `"boy"` for the 6 batchIds; `currentPlanSourceCorpusHash(3,"boy")` == the importer's BOY corpus hash (no drift).
- Regression: `test-pssa-eoy-importer`, `test-pssa-moy-importer`, `test:pssa-db6-5` byte-identical.

## 7. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-boy-importer.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-importer.ts
./node_modules/.bin/tsx scripts/test-pssa-moy-importer.ts
npm run test:pssa-db5
npm run test:pssa-db6-5
for t in scripts/test-pssa-*.ts; do echo "== $t =="; ./node_modules/.bin/tsx "$t" || exit 1; done
echo "all BOY importer gates + full suite passed"
```

## 8. Acceptance criteria — allowed tracked paths only
```
scripts/content/lib/pssa-import-plan.ts     (BOY manifest + plan dispatch + MCQ/SA older-shape eligibility; foundation/EOY/MOY byte-identical)
scripts/content/write-pssa-items.ts         (--benchmark boy only)
scripts/content/assemble-pssa-form.ts       (allow-list += GRADE3_DIAGNOSTIC_BLUEPRINT only)
lib/content/pssaItemReview.ts               (benchmarkForBatchId recognizes BOY; foundation/EOY/MOY unchanged)
scripts/test-pssa-boy-importer.ts           (new)
specs/codex_pssa_boy_benchmark_importer.md
```
Anything else → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 9. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement A–D + test; §7 gates (incl. full suite); scope-guard to §8; commit (no merge); report branch + tip SHA + file list + gate output + the BOY 6-stream eligibility report + confirmation foundation/EOY/MOY byte-identical. **If any stamina item fails eligibility without an existing-field validation, STOP and report the shape.** **Independent audit before merge** (Claude: BOY 39/39 eligible via real older-shape checks, foundation/EOY/MOY byte-identical, drift gate BOY-aware, CLI accepts the BOY diagnostic blueprint, full suite green, exact-SHA-pinned merge).

## 10. After merge — operational BOY run (fresh disposable dev DB)
Same runbook, `--benchmark boy`: fresh DB → migrate → crosswalk → import foundation + `--benchmark boy` → approve BOY (passages + 6 BOY batches, `--attest-license-cleared`) → `assemble --write --blueprint pde-ela-diagnostic-stamina-2025-g3-v1 --seed g3-boy-001 --env dev` → verify 3 sections + buckets → seed roster → launch → verify operational score + Insights/DOK + leak. Completes BOY/MOY/EOY for grade 3.
