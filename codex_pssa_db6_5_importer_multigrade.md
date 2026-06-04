# PSSA DB-6.5 — importer multi-grade generalization (pure refactor; Grade 3 byte-identical; grades 4–8 become "add a manifest")

## Scope / boundary (locked)
DB-6.5 is a REFACTOR, not a feature. It makes the import pipeline grade-parameterized so that importing a future grade = registering a manifest, with zero changes to what Grade 3 produces today. Three deliverables:
1. A **per-grade import manifest registry** in `scripts/content/lib/pssa-import-plan.ts`; `buildPlan(gradeLevel)` replaces zero-arg `buildPlan()`.
2. **`--grade` flag** on `content:import-pssa-items` and `content:write-pssa-items` (explicit, required — no default).
3. **Tests** proving Grade 3 output is byte-identical pre/post refactor (golden contentHash pinning) and that unregistered grades refuse.

**Explicitly NOT in DB-6.5:** no grade 4–8 content, manifests, author scripts, or audit functions (those land with each grade's authoring PRs); no TDA anything; no schema/migration changes; no BEHAVIOR changes to the DB-5 selector, approval CLI, admin review UI, or DB-6 form assembly (GRADE3_BLUEPRINT in `pssa-form-assembly.ts` stays untouched) — the only allowed review-path code change is inside `lib/content/pssaItemReview.ts` per the Ripple section, and if `tsc` proves a direct call site must be updated, that call-site edit may only pass the batch row's `gradeLevel`; no changes to item/passage hashing logic or the audit detectors themselves; no report-format changes for Grade 3.

## The one invariant that matters most (read first)
**`contentHash` values must not change.** The dev DB holds 79 items + 5 passages keyed by hashes; DB-5 approvals and DB-6 form snapshots reference `approvedContentHash`. If the refactor perturbs any `stableStringify` input, every row looks like content drift, re-import refuses, and approval/form snapshots break. Therefore: do not touch `stableStringify`, `hashCanonical`, the canonical item/passage builders' field sets, or field ordering semantics. The acceptance proof is a live no-op re-write (below), plus a golden-hash unit test.

## Manifest shape (in `pssa-import-plan.ts`)
```ts
export type PssaGradeImportManifest = {
  gradeLevel: number;
  files: {
    pilot: string; ebsr: string; tei: string;
    matchingGridDragDrop: string; conventions: string; shortAnswer: string;
    deprecation: string;
  };
  expectedCounts: { passages: number; activeItems: number; deprecatedItems: number; supersessions: number; batches: number };
  batchIds: {
    readingMcq: string; ebsr: string; multiSelect: string; hotText: string;
    matchingGrid: string; dragDrop: string; conventions: string; shortAnswerPool: string;
  };
  conventionItemIdPrefix: string;   // currently "pssa_conv_" — the batchIdFor heuristic, per-manifest not global
  audits: {
    ebsr: (items: any[]) => any;
    tei: (multiSelect: any[], hotText: any[]) => any;
    matchingGridDragDrop: (mg: any[], dd: any[]) => any;
    conventions: (items: any[]) => any;
    shortAnswer: (items: any[]) => any;
  };
};
export const PSSA_GRADE_IMPORT_MANIFESTS: Record<number, PssaGradeImportManifest> = { 3: GRADE3_IMPORT_MANIFEST };
```
`GRADE3_IMPORT_MANIFEST` carries exactly today's values: the current `FILES` paths, counts `{5, 67, 12, 12, 8}`, the current `_grade3` batch ids (including `short_answer_grade3_pool` — note the `_pool` suffix is NOT the generic pattern; carry ids as literal strings per manifest, do NOT derive them from a template, so existing DB batch ids can never silently change), `"pssa_conv_"`, and the five existing `auditGrade3*` functions. Keep `FILES` and `EXPECTED_BATCHES` as deprecated re-exports of the Grade 3 manifest values if anything else imports them (check `assertNoWrites` and tests) — or update those importers; either way `tsc` stays green.

## Refactor requirements
- `buildPlan(gradeLevel: number)`: looks up the manifest; **unregistered grade ⇒ throw `"No PSSA import manifest registered for grade N."`** (fail-closed, never scaffold an empty plan). All hardcoded `_grade3` ids, `gradeLevel: 3` literals (incl. batch-row construction), expected counts, file paths, and audit calls route through the manifest. The `?? 3` fallback in EC resolution (line ~316) becomes the plan's gradeLevel — no silent grade defaulting.
- `batchIdFor(item, manifest)`: same logic, ids from `manifest.batchIds`, conventions heuristic from `manifest.conventionItemIdPrefix`.
- `write-pssa-items.ts`: `--grade` required; the crosswalk ref query filter (`gradeLevel: 3`, line ~135) uses the flag; everything else flows from the plan. `import-pssa-items.ts`: `--grade` required; keep dry-run-only enforcement + `assertNoWrites` self-scan intact (it must still scan BOTH the shared module and the dry-run script).
- Report filenames: Grade 3 keeps the EXACT current names (continuity with committed reports + byte-diff acceptance). Grades ≠ 3 write `_g${N}`-suffixed names. Implement as a manifest-derived report-name helper.
- npm scripts unchanged; invocation becomes e.g. `npm run content:import-pssa-items -- --dry-run --grade 3`.
- **Ripple (verified, in scope): `lib/content/pssaItemReview.ts`** — `currentPlanSourceCorpusHash()` calls `buildPlan()` and is used by BOTH the approval CLI and the admin review UI for batch corpus-hash drift checks. Change it to `currentPlanSourceCorpusHash(gradeLevel: number)` and pass the **batch's own `gradeLevel`** at every call site (the batch row carries it; never assume 3). For grade 3 the returned hash must be UNCHANGED — covered by the golden-hash test and by `test:pssa-db5` / `test:pssa-db5-1` staying green. No other behavior in the review service may change. (Other `pssa-import-plan` importers only pull `AUDIT_CONTRACT_VERSION`/`SOURCE_SCAN_VERSION`/`stableStringify` — verified unaffected: selector, form assembly, assemble CLI.)

## Acceptance (ALL required)
1. **Golden hash test**: pin at least 3 known Grade 3 contentHash values as constants in the test:
   - 1 MCQ item hash and 1 SHORT_ANSWER item hash, copied from `reports/pssa_import_dryrun_items.csv` (committed).
   - 1 passage hash, copied from the `Approved hash snapshot` column of `reports/pssa_db6_assembly_summary.md` (committed; valid golden source because DB-5 stamps `approvedContentHash = contentHash`, e.g. `pssa_psg_g3_the_mural_plan` = `sha256:b5a4ebf1c2057220d73ad63a925607b00c677be0a10f56da1abd1cabe3b0adbb`). There is NO `pssa_import_dryrun_passages.csv` — do not invent one.

   `buildPlan(3)` must reproduce all three exactly.
1b. **Source corpus hash parity test**: BEFORE refactoring, capture the current Grade 3 `currentPlanSourceCorpusHash()` value at the pre-refactor commit and record it in the test as a constant. After the refactor, `currentPlanSourceCorpusHash(3)` must reproduce it exactly. At every call site of this function, the grade argument must come from the batch row's `gradeLevel` — never a literal `3`; assert this by code inspection in the stop-report (list each call site and its argument expression).
2. **Byte-identical dry-run**: run `content:import-pssa-items -- --dry-run --grade 3`; the THREE committed dry-run CSVs (`pssa_import_dryrun_items.csv`, `pssa_import_dryrun_batches.csv`, `pssa_import_dryrun_manifest.csv`) are byte-identical to the committed pre-refactor versions (`git diff --exit-code` on those paths). `pssa_import_dryrun_summary.md` identical modulo run-id/timestamp lines if it has them. If the dry-run emits any report file not listed here, preserve its current committed Grade 3 path/content exactly and report the actual full set.
3. **Live no-op proof**: on the dev DB, `content:write-pssa-items -- --write --env dev --grade 3` is a PURE content no-op (all inserts/updates/deletes = 0 across PssaPassage/PssaItem/PssaItemPassageLink/PssaItemSupersession/PssaItemBatch; a new PssaImportRun row is allowed as run metadata). This is the decisive proof the refactor changed nothing.
4. **Unregistered grade refuses**: `--grade 4` (both scripts) ⇒ the exact manifest error, exit non-zero, no reports written, no DB reads needed.
5. **Manifest validation**: duplicate batch ids within a manifest, or a manifest whose `gradeLevel` disagrees with its registry key ⇒ throw at lookup time (cheap structural asserts).
6. `tsc --noEmit` + `build` + `test:pssa-db5` + `test:pssa-db5-1` + `test:pssa-db6` green (proves no ripple into selector/approval/review-UI/assembly).
7. Scope: `git diff` touches ONLY `pssa-import-plan.ts`, `import-pssa-items.ts`, `write-pssa-items.ts`, `lib/content/pssaItemReview.ts` (the one verified ripple, exactly as described above), the new/updated test file, `package.json` (only if a test script is added). No schema, no migrations, no exemplars, no reports regenerated except the acceptance dry-run.

## Stop — report (paste back for Claude's independent audit)
The manifest type + GRADE3 manifest literal; the buildPlan(grade) diff summary; where each former hardcoding now routes through the manifest (file:line list); golden-hash test values + result; the byte-diff result on the three committed dry-run CSVs (+ the actual emitted report set if it differs); the dev-DB no-op write counts table; the `--grade 4` refusal output; tsc/build/test results. Do NOT add grade 4–8 manifests "while you're in there." Do NOT regenerate or rename Grade 3 reports.

## Win condition
After DB-6.5, "import grade N" is: author grade-N content through the #4-series loop → register one manifest → run the same three commands with `--grade N`. The pipeline stops being quietly Grade-3-shaped, and Grade 3 itself cannot tell the refactor happened.
