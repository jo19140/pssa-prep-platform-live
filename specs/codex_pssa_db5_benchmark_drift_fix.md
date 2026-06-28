# Codex Spec — Make the DB-5 approval drift gate benchmark-aware

**Type:** bug fix (approval gate). **Owner:** Jonathan. **Date:** 2026-06-26.
**Goal:** EOY item batches cannot be approved — the DB-5 drift gate recomputes the **foundation** corpus hash for every grade-3 batch, so EOY batches (stamped with the EOY corpus hash at import) always report `batch_source_corpus_hash_drift`. Make the gate compute the corpus hash for the **batch's own benchmark**. Foundation approval must stay byte-identical.

## 0. Root cause (verified in code)
- `lib/content/pssaItemReview.ts` → `pssaBatchDriftDetail()` calls `currentPlanSourceCorpusHash(batch.gradeLevel)`, which does `buildPlan(gradeLevel)` (FOUNDATION plan: 7 passages + 91 active + 12 deprecated) and hashes its passage+item content hashes.
- The EOY importer (`write-pssa-items` persistPlan) stamps EOY batches with `sourceCorpusHash` over the **EOY** plan (5 passages + 45 items, 0 deprecated).
- So for an EOY batch: stored EOY hash ≠ recomputed foundation hash → `batch_source_corpus_hash_drift` → `DB-5 write refused`. (Foundation batches still match foundation → unaffected.) `buildPlan` reads source files, not the DB, so this is independent of foundation+EOY coexistence — an EOY-only DB would also drift.

## 1. Scope & guardrails
- Change confined to `lib/content/pssaItemReview.ts` + a test + this spec. Do NOT modify the importer, scoring, the assembler, schema, delivery, the student-ready selector, or any content.
- **Foundation drift behavior must stay byte-identical** (default benchmark = foundation → identical to today). Regression: `test:pssa-db5` / `test-pssa-db5-approval`.
- Clean worktree off the current `origin/main` tip (re-fetch). Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — benchmark-aware corpus hash (`lib/content/pssaItemReview.ts`)
- Change `currentPlanSourceCorpusHash(gradeLevel)` → `currentPlanSourceCorpusHash(gradeLevel, benchmark: PssaImportBenchmark = "foundation")` and compute the plan via `buildPlanForBenchmark({ grade: gradeLevel, benchmark })` instead of `buildPlan(gradeLevel)`. Keep the exact same hash recipe (`stableStringify([...passages.contentHash, ...activeItems.contentHash, ...deprecatedItems.contentHash].sort())`). With the default `foundation`, existing callers are byte-identical.
- Add a small resolver `benchmarkForBatchId(batchId: string): PssaImportBenchmark` that returns `"eoy"` if the id is one of the EOY manifest's batchIds (use the exported `GRADE3_EOY_IMPORT_MANIFEST.batchIds` / `PSSA_BENCHMARK_IMPORT_MANIFESTS` — membership check, do NOT string-match on an `_eoy` suffix), else `"foundation"`. Extensible to future benchmarks (MOY) by checking each registered non-foundation manifest's batchIds.
- In `pssaBatchDriftDetail`, resolve `const benchmark = benchmarkForBatchId(args.batchId!)` and call `currentPlanSourceCorpusHash(batch.gradeLevel, benchmark)`. Nothing else in the gate changes (audit-contract / source-scan / batch-audit-result checks unchanged).

## 3. Validation (`scripts/test-pssa-db5-benchmark-drift.ts`, new — mirror `test-pssa-db5-approval.ts`)
- `benchmarkForBatchId("reading_mcq_grade3_eoy")` → `"eoy"`; `benchmarkForBatchId("reading_mcq_grade3")` → `"foundation"`; an unknown id → `"foundation"`.
- The **EOY** corpus hash the importer stamps equals `currentPlanSourceCorpusHash(3, "eoy")` (build the EOY plan via `buildPlanForBenchmark({grade:3,benchmark:"eoy"})`, recompute the importer's hash recipe, assert equality) — i.e., **no drift** for a correctly-imported EOY batch.
- The **foundation** corpus hash equals `currentPlanSourceCorpusHash(3, "foundation")` (regression — unchanged from `currentPlanSourceCorpusHash(3)` today).
- A FixtureDb-style `pssaBatchDriftDetail` check (mirror existing db5 test harness) returns `null` (no drift) for a well-formed EOY batch whose `sourceCorpusHash` = the EOY corpus hash, and still flags a tampered/foundation-mismatched hash.

## 4. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-db5-benchmark-drift.ts
npm run test:pssa-db5            # foundation approval gate regression (byte-identical)
./node_modules/.bin/tsx scripts/test-pssa-eoy-importer.ts   # EOY corpus hash unchanged
npm run test:pssa-db6-5
echo "all db5 benchmark-drift fix gates passed"
```

## 5. Acceptance criteria — allowed tracked paths only
```
lib/content/pssaItemReview.ts                 (benchmark-aware corpus hash + batch→benchmark resolver)
scripts/test-pssa-db5-benchmark-drift.ts      (new)
specs/codex_pssa_db5_benchmark_drift_fix.md
```
Anything else (importer, scoring, assembler, schema, delivery, content) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 6. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement A + test; §4 gates; scope-guard to §5; commit (no merge); report branch + tip SHA + file list + gate output. **Independent audit before merge** (Claude: confirm foundation drift byte-identical, EOY batch no-drift via real corpus-hash equality, exact-SHA-pinned merge).

## 7. After merge — resume the operational run (no re-import)
On the existing `pssa_eoy_live` DB (foundation+EOY already imported; 12 passages APPROVED; 45 EOY items PENDING): pull main, then re-run the EOY item-batch approvals (reading_mcq/ebsr/matching_grid/conventions/short_answer `*_grade3_eoy`, `--write --env dev --attest-license-cleared`). They should now pass (no drift) → `pendingItems=0` for EOY → `assemble --write --blueprint …eoy-v1` → seed → launch.
