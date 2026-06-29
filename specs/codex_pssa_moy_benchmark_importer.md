# Codex Spec — MOY benchmark importer (DB-import path for the MOY bank)

**Type:** import-pipeline extension (mirrors the merged EOY importer). **Owner:** Jonathan. **Date:** 2026-06-28.
**Goal:** give the MOY item bank a real DB-import path, exactly as EOY now has. Add a `"moy"` benchmark + `GRADE3_MOY_IMPORT_MANIFEST` + a MOY plan builder + `--benchmark moy`, reusing the EOY machinery. **EOY and foundation imports stay byte-identical.**

## 0. Why this is the EOY pattern again (verified)
- The EOY importer is merged and proven live: `buildEoyPlan` + `buildPlanForBenchmark` + EOY-schema-aware eligibility (`buildEoyImportEligibilityGates` / `validateEoyCorrectResponse`) + `PSSA_BENCHMARK_IMPORT_MANIFESTS` (`foundation`/`eoy`) + `--benchmark` in `write-pssa-items` + benchmark-aware DB-5 drift gate (`benchmarkForBatchId` / `currentPlanSourceCorpusHash` in `lib/content/pssaItemReview.ts`). MOY uses the **same** diagnostic schema (correctResponseJson, evidenceBinding, passage groups, cross-text P3), so the same machinery applies.
- The cross-text readiness (structural coverage) and section-persistence fixes are already merged, so MOY P3 cross-text items and the MOY 3-section form ride on them with no new work there.

## MOY content inventory (verified)
- 5 source backends: `exemplars/pssa_grade3_moy_{p1,p2,p3,p4,conventions}/backend.json`.
- **5 passages** (P1=1, P2=1, P3=2 paired, P4=1, conventions=0), **40 items**.
- Interaction types: **MCQ 23, INLINE_DROPDOWN 9 (conventions), EBSR 3, MATCHING_GRID 2, SHORT_ANSWER 2, DRAG_DROP 1.** → **6 batches.**
- 0 deprecated, 0 supersessions. P3 paired group `pssa_pg_g3_moy_p3_mail_paired` (members `passage_1`=letter_travels, `passage_2`=carrier_day); cross-text items `pssa_item_g3_moy_p3_mcq_bc312`, `pssa_item_g3_moy_p3_ebsr_bc312`.
- **New vs EOY: DRAG_DROP.** The one drag-drop item (`pssa_item_g3_moy_p1_ao5_dd_bc313`) has `correctResponseJson = { correctAssignments: [{ tokenId, targetId }, …] }` and `responseSpecJson = { prompt, instructionText, tokens, targets, useAllTokens }`.

## 1. Scope & guardrails
- Changes confined to the import pipeline + the DB-5 drift resolver + a test + this spec. Do NOT modify scoring, the assembler, schema, delivery, the seed script, content, or the student-ready selector.
- **EOY and foundation imports stay byte-identical** (regressions: `test-pssa-eoy-importer`, `test:pssa-db6-5`, the full PSSA suite).
- Base off the **current `origin/main` tip** (re-fetch). Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — MOY manifest + benchmark wiring (`scripts/content/lib/pssa-import-plan.ts`)
- `PssaImportBenchmark` → add `"moy"` (`"foundation" | "eoy" | "moy"`).
- `GRADE3_MOY_IMPORT_MANIFEST`: the 5 MOY backends; MOY-prefixed batchIds for the 6 present streams — `reading_mcq_grade3_moy`, `ebsr_grade3_moy`, `matching_grid_grade3_moy`, `drag_drop_grade3_moy`, `conventions_grade3_moy`, `short_answer_grade3_moy`; `expectedCounts { passages: 5, activeItems: 40, deprecatedItems: 0, supersessions: 0, batches: 6 }`; `conventionItemIdPrefix: "pssa_item_g3_moy_conv_"`; no deprecation file.
- Register under `PSSA_BENCHMARK_IMPORT_MANIFESTS.moy = { 3: GRADE3_MOY_IMPORT_MANIFEST }`.

## 3. Deliverable B — MOY plan builder
**Preferred: generalize `buildEoyPlan` into a benchmark-parametric builder** (e.g. `buildBenchmarkPlan(benchmark)`), used by both EOY and MOY, so the eligibility logic isn't duplicated. Move the per-benchmark **expected interaction-type counts** into the manifest (e.g. `expectedTypeCounts`) so the builder reads them (EOY `{MCQ:26, INLINE_DROPDOWN:9, MATCHING_GRID:4, EBSR:4, SHORT_ANSWER:2}`; MOY `{MCQ:23, INLINE_DROPDOWN:9, MATCHING_GRID:2, EBSR:3, SHORT_ANSWER:2, DRAG_DROP:1}`). If generalizing risks EOY drift, instead add a parallel `buildMoyPlan()` mirroring `buildEoyPlan` — but the EOY importer test MUST stay byte-identical either way.
- `buildPlanForBenchmark` dispatches `moy` → the MOY plan (grade 3 only; throw otherwise), `eoy` → EOY, `foundation` → `buildPlan`.
- Reuse the existing `buildWouldItem` / `batchIdFor` (already maps DRAG_DROP) / crosswalk / `buildContentQualityGateMap` / passage-group population (the writer's `persistPlan` already persists `plan.passageGroups` — populate them for MOY P3 exactly as EOY does).

## 4. Deliverable C — DRAG_DROP eligibility (extend the schema-aware validator)
Add a `DRAG_DROP` case to the correct-response validator (the EOY `validateEoyCorrectResponse`, generalized): valid when `correctResponseJson.correctAssignments` is a non-empty array and **every** `{tokenId, targetId}` references a declared token and target in `responseSpecJson.tokens` / `responseSpecJson.targets`. This is additive — EOY has no DRAG_DROP, so EOY behavior is unchanged. All other §4-style checks (required fields, pointValue===totalPoints, crosswalk join, license/provenance, non-deprecated, type counts) apply unchanged.

## 5. Deliverable D — `--benchmark moy` (`scripts/content/write-pssa-items.ts`)
- Accept `--benchmark moy` (alongside `foundation|eoy`); reject unknown. Routes through `buildPlanForBenchmark({ grade, benchmark:"moy" })`. All prod-safety/dev guards unchanged.

## 6. Deliverable E — MOY in the DB-5 drift gate (`lib/content/pssaItemReview.ts`)
- `benchmarkForBatchId(batchId)` must return `"moy"` for the MOY manifest batchIds (membership against `GRADE3_MOY_IMPORT_MANIFEST.batchIds` / the registry), `"eoy"` for EOY, else `"foundation"`. `currentPlanSourceCorpusHash(grade, "moy")` then uses the MOY plan. Foundation/EOY behavior unchanged.

## 7. Validation (`scripts/test-pssa-moy-importer.ts`, new — mirror `test-pssa-eoy-importer.ts`)
- The MOY plan returns **5 passages, 40 active items, 0 deprecated, 0 supersessions, 6 batches**; type counts `MCQ 23 / INLINE_DROPDOWN 9 / EBSR 3 / MATCHING_GRID 2 / SHORT_ANSWER 2 / DRAG_DROP 1`.
- **All 40 items import-eligible** with no blocking §4 failure (the real proof — incl. the DRAG_DROP item passing the new correctAssignments check, and the MOY P3 cross-text items).
- Determinism (two runs, identical sorted hashes); crosswalk join for every MOY `eligibleContent`.
- `benchmarkForBatchId` maps the 6 MOY batchIds → `"moy"`; `currentPlanSourceCorpusHash(3,"moy")` equals the importer's MOY corpus hash (no drift).
- Regression: EOY importer + foundation (`test-pssa-eoy-importer`, `test:pssa-db6-5`) unchanged.

## 8. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-moy-importer.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-importer.ts   # EOY byte-identical
npm run test:pssa-db5                                        # drift gate (foundation/eoy/moy)
npm run test:pssa-db6-5
# FULL PSSA suite green:
for t in scripts/test-pssa-*.ts; do echo "== $t =="; ./node_modules/.bin/tsx "$t" || exit 1; done
echo "all MOY importer gates + full suite passed"
```

## 9. Acceptance criteria — allowed tracked paths only
```
scripts/content/lib/pssa-import-plan.ts     (MOY manifest + benchmark plan builder + DRAG_DROP eligibility; EOY/foundation byte-identical)
scripts/content/write-pssa-items.ts         (--benchmark moy only)
lib/content/pssaItemReview.ts               (benchmarkForBatchId recognizes MOY; foundation/EOY unchanged)
scripts/test-pssa-moy-importer.ts           (new)
specs/codex_pssa_moy_benchmark_importer.md
```
Anything else → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 10. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement A–E + test; §8 gates (incl. full suite); scope-guard to §9; commit (no merge); report branch + tip SHA + file list + gate output + the MOY per-stream eligibility report (6 streams, item counts, §4 results) + confirmation EOY/foundation byte-identical. **Independent audit before merge** (Claude: MOY 40/40 eligible via real checks incl DRAG_DROP, EOY/foundation byte-identical, drift gate MOY-aware, full suite green, exact-SHA-pinned merge).

## 11. After merge — operational MOY run (fresh disposable dev DB)
Same runbook as EOY, `--benchmark moy`: fresh DB → migrate → crosswalk → import foundation + `--benchmark moy` → approve MOY (passages + 6 MOY batches, `--attest-license-cleared`) → `assemble --write --blueprint pde-ela-diagnostic-stamina-2025-g3-moy-v1 --seed g3-moy-001 --env dev` → verify 3 sections + 40 items + buckets → seed roster → launch → verify operational score + Insights/DOK + leak. (MOY blueprint operational/analytics split per the locked MOY blueprint.)
