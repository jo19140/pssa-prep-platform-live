# Codex Spec — Benchmark-aware EOY importer (DB-import path for the EOY bank)

**Type:** import-pipeline extension (the EOY true-go-live blocker). **Owner:** Jonathan. **Date:** 2026-06-26.
**Goal:** give the EOY item bank a real DB-import path so `assemble --blueprint …eoy-v1 --write` finds its pinned items. Add a **parallel `buildEoyPlan()`** that reads the per-unit EOY backends and produces the existing `ImportPlan` shape, an **EOY manifest**, and a **`--benchmark` selector** in the writer. Reuse the foundation writer and per-item machinery unchanged. **Foundation import stays byte-identical.**

## 0. Why this shape (verified in code)
- The writer `scripts/content/write-pssa-items.ts` consumes a generic `ImportPlan` (`assertPreWritePlan`, `resolveCrosswalk`, `persistPlan`) and is benchmark-agnostic — **reuse as-is** except for where it obtains the plan.
- Per-item machinery in `scripts/content/lib/pssa-import-plan.ts` (`interactionTypeFor`, `batchIdFor` incl. `INLINE_DROPDOWN→conventions`, `correctResponse`, `buildWouldItem`, crosswalk join, `buildContentQualityGateMap`) already supports all 5 EOY interaction types. The student-ready selector and scoring already support INLINE_DROPDOWN.
- The ONLY foundation-coupled piece is **`buildPlan()`**: it reads 6 homogeneous per-stream files (`pilot`/`ebsr`/`tei.{multiSelectItems,hotTextItems}`/`mgdd.{matchingGridItems,dragDropItems}`/`conventions`/`shortAnswer`) and runs the per-stream audit functions. EOY content is laid out **per passage-unit with mixed types**, so it needs a parallel loader, NOT a manifest path swap.

## EOY content inventory (verified)
- 5 source backends: `exemplars/pssa_grade3_eoy_{p1,p2,p3,p4,conventions}/backend.json`.
- **5 passages** (P1=1 process, P2=1, P3=2 paired, P4=1 drama, conventions=0), **45 items**.
- Item interaction types: **MCQ 26, INLINE_DROPDOWN 9 (conventions), MATCHING_GRID 4, EBSR 4, SHORT_ANSWER 2.**
- 0 deprecated, 0 supersessions. No `scoringBucket` in source (correct — assigned at assembly).
- Each item carries the import-required fields (`sourceType=internal_original`, `licenseStatus=cleared_internal_original`→normalized to `cleared`, `commercialUseAllowed`, `needsLegalReview=false`, `provenanceJson.benchmarkSeason="EOY"`, `eligibleContent`, `correctResponseJson`, type-specific shapes). `productionImportReady`/`noDbWrite` are authoring annotations (currently false/true) — **not importer gates**; this spec authorizes DB import of these backends.

## 1. Scope & guardrails
- Changes confined to the import pipeline + a test + this spec. Do NOT modify `pssaScoring.ts`, the assembler (`pssa-form-assembly.ts`), the registry, schema, delivery, the seed script, the assemble CLI, or any content/exemplar bytes. **Foundation `buildPlan` and its output must stay byte-identical** (regression: `test:pssa-db6-5`).
- Clean worktree off the **current `origin/main` tip** (re-fetch). Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — EOY manifest (`scripts/content/lib/pssa-import-plan.ts`)
**Preserve `buildPlan(3)` exactly.** Do NOT reshape existing foundation callers or the foundation manifest shape. If a benchmark-aware entry point is needed, add a NEW wrapper such as `buildPlanForBenchmark({ grade, benchmark })` that dispatches to the existing `buildPlan(grade)` for `foundation` and to `buildEoyPlan()` for `eoy`. Do not force existing foundation imports onto a changed manifest shape unless tests prove byte-identical output. The existing grade-keyed `lookupPssaGradeImportManifest`/`buildPlan` path must stay byte-identical (protects `test:pssa-db6-5`).

Add `GRADE3_EOY_IMPORT_MANIFEST` and register it under a `(grade, benchmark)` key (a parallel `PSSA_BENCHMARK_IMPORT_MANIFESTS` keyed by benchmark is preferred over mutating `PSSA_GRADE_IMPORT_MANIFESTS`; keep the existing grade-keyed lookup working for foundation, byte-identical):
- `files`: the 5 EOY backends (P1–P4 + conventions); no deprecation file (EOY has none — make `files.deprecation` optional and have `loadDeprecationRows` return `[]` when absent).
- `expectedCounts`: `{ passages: 5, activeItems: 45, deprecatedItems: 0, supersessions: 0, batches: 5 }`.
- `batchIds`: EOY-prefixed, only the streams present — e.g. `reading_mcq_grade3_eoy`, `ebsr_grade3_eoy`, `matching_grid_grade3_eoy`, `short_answer_grade3_eoy`, `conventions_grade3_eoy` (INLINE_DROPDOWN routes here). Keep the registry's duplicate-batch-id guard happy.
- `conventionItemIdPrefix`: EOY uses `pssa_item_g3_eoy_conv_` — set accordingly (do not assume the foundation `pssa_conv_` prefix).

## 3. Deliverable B — `buildEoyPlan()` (`scripts/content/lib/pssa-import-plan.ts`)
A parallel plan builder returning the same `ImportPlan` type `buildPlan` returns:
- Read the 5 EOY backends; concatenate `passages` (5) and `items` (45).
- Group items by `interactionTypeFor` into MCQ / EBSR / MATCHING_GRID / SHORT_ANSWER / INLINE_DROPDOWN; map to batches via the existing `batchIdFor`.
- Build each row with the **existing `buildWouldItem`** (it computes `contentHash`, joins crosswalk, carries provenance/license/sourceType, validates response shape). `deprecatedItems = []`, supersessions `[]`.
- Per-item gates come from the **EOY-schema-aware import-eligibility checks in §4** — NOT the foundation per-stream audits. Reuse `buildContentQualityGateMap` and the generic detectors only where schema-compatible. Do **not** fabricate gate PASS.

## 4. Gate strategy — EOY-schema-aware import eligibility (DECIDED 2026-06-26)
**Do NOT run the foundation per-stream audits (`audits.ebsr`/`tei`/`matchingGridDragDrop`/`conventions`/`shortAnswer`) over EOY streams.** The mismatch is schema-level, not field-location: the foundation audits expect the older authoring shape (`partA.choices[].supportsPartA`, inline `partB.correctIndices`, MultiSelect choice-tuples), while the EOY bank uses the newer diagnostic schema (`correctResponseJson`, `evidenceBinding`, `isCorrect`, `passageLinks`, `requiredEvidenceSlotsJson`, cross-text metadata, `correctCells`, `blanks[].correctIndex`). Adapting EOY into the foundation shape is explicitly rejected (artificial, risks weakening/misreading gates, re-tests authoring quality with the wrong detectors). Verified: `auditGrade3EbsrItems` crashes on EOY EBSR (`indices is not iterable`) because EOY has no inline `partB.correctIndices`.

Instead, `buildEoyPlan` gates each item on **EOY-schema-aware import-eligibility checks**:
- All **45 items present**, non-deprecated, with the **expected interaction-type counts** (MCQ 26, INLINE_DROPDOWN 9, MATCHING_GRID 4, EBSR 4, SHORT_ANSWER 2).
- Every item has `eligibleContent`, `interactionType`, `responseSpecJson`, `correctResponseJson`, `scoringJson.totalPoints`, and provenance/license/commercial-use fields.
- **`correctResponseJson` is valid for each interaction type:** MCQ `correctIndex` in range; EBSR `partA.correctIndex` and `partB.correctIndices` in range of their choice lists; MATCHING_GRID `correctCells` align to declared row/column IDs; INLINE_DROPDOWN every blank's selection (`blanks[].correctIndex`) in range of that blank's `options`; SHORT_ANSWER has the rubric/manual-scoring shape (`rubric` + `scoreBandExamples` / pending-human-scoring).
- Every item's `pointValue` equals `scoringJson.totalPoints`.
- Every `eligibleContent` joins the anchor/crosswalk (the existing crosswalk join).
- Every item is **student-ready / import-eligible** under the importer's own provenance/license/status rules (reuse `buildWouldItem` + the student-ready selector's license gate: `licenseStatus=cleared`, `!needsLegalReview`, `commercialUseAllowed`).
- The already-merged EOY **authoring regression tests** (`test-pssa-eoy-*`, `test-pssa-eoy-e2e-release`, `test-pssa-eoy-form-assembly`) remain green — they are the authoring-quality guarantee; the import gate does not re-litigate it.
- The **generic content-quality gates** (`buildContentQualityGateMap`) still run where schema-compatible.
- **No fabricated PASS** from foundation audits. If an EOY item fails any check above, the plan marks it ineligible and the §6 test fails (surfacing the real item) — do not paper over it.

## 5. Deliverable C — `--benchmark` selection (`scripts/content/write-pssa-items.ts`)
- Add `--benchmark <foundation|eoy>` (default `foundation`). The writer resolves the plan via `buildPlanForBenchmark({ grade, benchmark })` — `foundation` → existing `buildPlan(grade)` (byte-identical), `eoy` → `buildEoyPlan()`. Reject an unknown `--benchmark` value with a clear error. `assertPreWritePlan` reads `plan.manifestConfig.expectedCounts` (already generic → EOY counts flow through). Keep all `--write`/`--env dev`/prod-detection guards. Crosswalk (DB-2) is shared and unchanged.
- Make the plan-selection reachable **without a DB write** (no `--write`) so §6 can assert the EOY plan builds with no DB mutation.

## 6. Validation (`scripts/test-pssa-eoy-importer.ts`, new — mirror `test-pssa-db6-5-importer-multigrade.ts`)
- `buildEoyPlan()` returns 5 passages, 45 active items, 0 deprecated, 0 supersessions, the expected batch set; counts match `expectedCounts`.
- **Determinism:** two `buildEoyPlan()` runs produce identical sorted content hashes.
- **All 45 items import-eligible** with **no blocking import-eligibility failure** (the §4 checks): present + non-deprecated + expected type counts (MCQ 26 / INLINE_DROPDOWN 9 / MATCHING_GRID 4 / EBSR 4 / SHORT_ANSWER 2); required fields present; `correctResponseJson` valid-and-in-range per type; `pointValue === scoringJson.totalPoints`; license/provenance clean. This is the real proof the gate passed honestly on the EOY schema.
- Crosswalk join: every EOY `eligibleContent` resolves against the loaded crosswalk keys.
- Foundation regression: `buildPlan(3)` output is unchanged (`test:pssa-db6-5` green).
- **CLI selector (direct):** assert default / no `--benchmark` behaves as `foundation`; `--benchmark foundation` is identical to default; `--benchmark eoy` selects `buildEoyPlan()`; an unknown `--benchmark` value rejects. (Test `buildPlanForBenchmark` and the writer's arg parse directly — DB-free.)
- **No-write writer dry run:** run/simulate `write-pssa-items --grade 3 --benchmark eoy` WITHOUT `--write` and assert it builds the EOY plan (5 passages / 45 items) with **no DB mutation** (no `--write` ⇒ no PrismaClient writes). Proves the CLI reaches the plan without touching a dev DB.

## 7. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-eoy-importer.ts
npm run test:pssa-db6-5      # foundation importer byte-identical
npm run test:pssa-db6        # full BOY/foundation form-assembly regression (broad coverage; this touches import plumbing)
./node_modules/.bin/tsx scripts/test-pssa-content.ts
echo "all EOY importer gates passed"
```

## 8. Acceptance criteria — allowed tracked paths only
```
scripts/content/lib/pssa-import-plan.ts     (EOY manifest + buildEoyPlan; foundation path byte-identical)
scripts/content/write-pssa-items.ts         (--benchmark selector only; foundation default unchanged)
scripts/test-pssa-eoy-importer.ts           (new)
specs/codex_pssa_eoy_benchmark_importer.md
```
Anything else (assembler, scoring, schema, delivery, seed, content/exemplars) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 9. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement A–C + test; §7 gates; scope-guard to §8; commit (no merge); report branch + tip SHA + file list + gate output.

**Required: EOY import-eligibility report** — one row per stream (MCQ, EBSR, MATCHING_GRID, SHORT_ANSWER, INLINE_DROPDOWN conventions): item count, and the result of the §4 checks (required-fields present, `correctResponseJson` valid-and-in-range, `pointValue===totalPoints`, crosswalk join, license/provenance, student-ready eligibility). Confirm foundation per-stream audits were NOT run over EOY. **If any item fails any §4 check, STOP — do not commit** (report the item and the failing check).

**Independent audit before merge** (Claude: confirm foundation byte-identical, 45/45 eligible via the real §4 schema-aware checks, determinism, no fabricated PASS, the per-stream eligibility report, exact-SHA-pinned merge).

## 10. After merge — resume the operational run
Against the existing disposable `pssa_eoy_release` DB (crosswalk + foundation already imported/approved; do NOT re-import foundation, do NOT re-run on an approval-bearing DB beyond the additive EOY import):
1. `npm run content:write-pssa-items -- --write --env dev --grade 3 --benchmark eoy` → 5 passages + 45 items imported.
2. Approve EOY (passages + the 5 EOY batches, `--attest-license-cleared`).
3. `assemble --write --blueprint pde-ela-diagnostic-stamina-2025-g3-eoy-v1 --seed g3-eoy-001 --env dev` → formId.
4. `seed-pssa-roster-demo --env dev --formId <id>` → launch/verify (operational /45, analytics excluded, Insights+DOK, no leak) → attest releasable.

> NOTE re step 1 on `pssa_eoy_release`: that DB already holds approved foundation rows. Importing EOY into it is **additive** (new item IDs, new batches). If the foundation importer's idempotency/approval guard refuses to run against an approval-bearing DB even for an additive benchmark, use a fresh disposable DB and import BOTH foundation and EOY before the approval pass. Confirm the importer's approval-guard behavior during the operational run; STOP if it blocks.
