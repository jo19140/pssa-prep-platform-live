# PSSA DB-3 — Item Importer (DRY-RUN ONLY)

Implements DB-3 of `design_pssa_db_import.md`. Build `import-pssa-items.ts`: read the audited file-based Grade 3 bank, **re-run the full gate stack at import**, compute canonical hashes, resolve crosswalk refs, map every record to the DB-1 governed shape, and produce a complete **would-import** report. **DB-3 writes NOTHING to any database** (writing is DB-4). Idempotent/transactional `--write` code may be *present* but is NOT exercised here. File-only. Commit.

## Rule 0 — the gates are the contract, not the file flags
**Never import based on a file's `auditMetadata` / `productionImportReady` / `noDbWrite` flags.** At import, **re-run the actual gate functions** that authored/audited each stream — and **REUSE the existing exported gate code** (`scripts/content/author-pssa-grade3-*.ts`, `scripts/audit/*`); do NOT reimplement or fork a copy (a forked gate drifts from the contract). If a gate function isn't cleanly importable, the minimal refactor is to **export** it from where it lives — not to duplicate it. **Gate-import safety:** any imported gate/detector must be **pure and side-effect-free**. If a gate currently lives inside an authoring script that writes files or runs authoring logic at module load, **refactor the detector into a pure module first** — DB-3 may import detectors/validators but must NEVER trigger authoring, passage regeneration, file mutation, or DB mutation as a side effect of importing a module (a top-level `main()` that runs on import is disqualifying). Re-run, at minimum: passage-quality gates (per passage); schema/responseSpec validity; instruction-matches-response; EC skill-match; source scan (hardened); preview-leak; every item-family gate; deprecation/supersession checks; **and the batch-level gates with tranche context** (EBSR answer-position distribution, MULTI_SELECT/HOT_TEXT/MATCHING_GRID/DRAG_DROP/CONVENTIONS surface-shortcut, MCQ answer-position). A record that fails any re-run gate is reported as **blocked-from-import**, never silently passed.

## Preconditions (stop and report if any is missing)
DB-1 schema + DB-2 crosswalk loader committed/merged to `main`; branch cut from latest `main`. The crosswalk source (`data/pssa/anchor_ec_crosswalk.csv`) and all Grade 3 bank files are present. (DB-3 does not require a live DB — file-only dry-run; a DB-aware dry-run is optional if `DATABASE_URL` + the DB-1 migration are available.)

## Import inventory (the Grade 3 governed bank, all on `main`)
Source files → governed records:
- `exemplars/pssa_grade3_pilot/pilot_backend.json` → **5 passages** + **28 reading MCQ** (`candidate`) + **12 conventions MCQ** (`deprecated_superseded`).
- `exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json` → **5 EBSR**.
- `exemplars/pssa_grade3_tei/grade3_tei_backend.json` → **5 MULTI_SELECT + 5 HOT_TEXT**.
- `exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json` → **5 MATCHING_GRID + 5 DRAG_DROP**.
- `exemplars/pssa_grade3_conventions/grade3_conventions_backend.json` → **9 conventions** (INLINE_DROPDOWN / HOT_TEXT word / DRAG_DROP token / MCQ).
- `exemplars/pssa_grade3_short_answer/grade3_short_answer_backend.json` → **5 SHORT_ANSWER**.
- `exemplars/pssa_grade3_conventions/pssa_conventions_grade3_deprecation_report.csv` → **12 supersession mappings** (old→new).
**Expected totals:** 5 `PssaPassage`; **67 active `PssaItem`** (28 MCQ + 5 EBSR + 5 MS + 5 HT + 5 MG + 5 DD + 9 conventions + 5 SA); **12 deprecated `PssaItem`**; **12 `PssaItemSupersession`** rows; passage links; and `PssaItemBatch` rows for the gated streams. Report the manifest and these counts; if the live files disagree with these counts, stop and report (don't import a surprise count).

## Mapping file → DB-1 governed shape
For each item build a `PssaItem` candidate row:
- identity/standards: `itemId` (stable upsert key), `gradeLevel`, `subject`, `standardCode`, `assessmentAnchor`, `eligibleContent`, `reportingCategory`, `dokLevel`, `itemType`, `skill`, `interactionType`, `interactionSubtype`, `pointValue`.
- **discriminated response:** `responseSpecJson`, `correctResponseJson`, `scoringJson`, `studentPreviewJson` (the leak-checked student view only).
- **crosswalk resolution:** set `eligibleContentRefId` by resolving the item's `eligibleContent` against the loaded `PssaStandardsCrosswalk` natural key `(subject, gradeLevel, eligibleContent, sourceVersionYear)`. In **file-only** mode, resolve against the canonical CSV (`data/pssa/anchor_ec_crosswalk.csv`); in **DB-aware** mode, resolve against the table. **An item whose EC does not resolve is blocked-from-import** (gate `PSSA_IMPORT_EC_RESOLVES`).
- **versioning/provenance:** `responseSpecVersion`, `auditContractVersion`, `sourceScanVersion`, `sourceCorpusHash` (+ `sourceCorpusManifestJson` on the run), `importedFromFile`, `importRunId`, `contentHash`, `latestAuditResult`, `latestAuditAt`, `provenanceJson`.
- **fail-closed governance (must be set):** `reviewStatus=PENDING`, `itemStatus=candidate` (or `deprecated_superseded` for the 12), `studentReadyBlockedReason=PENDING_REVIEW`, `approvalEligible=false`, `alignmentStatus` per crosswalk resolution, conservative license fields. **Import never sets APPROVED / pilot_ready / NONE.**
Passages → `PssaPassage` similarly (governed + `contentHash` + fail-closed). Multi-passage items → `PssaItemPassageLink` rows (role primary/secondary). Each gated stream → one `PssaItemBatch` (grade, subject, streamType, contract/scan versions, sourceCorpusHash, `batchAuditResult` = the re-run batch-gate result); items carry `batchId`. **Expected `PssaItemBatch` records (count = 8 unless the implementation documents a different canonical split):** `reading_mcq_grade3`, `ebsr_grade3`, `multi_select_grade3`, `hot_text_grade3`, `matching_grid_grade3`, `drag_drop_grade3`, `conventions_grade3`, `short_answer_grade3_pool`. Every active item carries the `batchId` for its stream; the 12 deprecated conventions MCQs do **not** count as active `conventions_grade3` batch members. Deprecated 12 → `PssaItemSupersession (oldItemId, newItemId, reason)` from the deprecation report, with `deprecatedReason` on the item.

## `contentHash` (canonical, per DB-0)
`contentHash` = hash of the **canonicalized item/passage content ONLY** — exclude `importedAt`/`approvedAt`/`reviewedBy`/`reviewStatus`/`itemStatus`/`studentReadyBlockedReason`/audit timestamps/`importRunId`/report paths. Stable across re-runs; used as the idempotency/drift key at DB-4.

## Re-validation gates at import (all blockers; reuse existing gate code)
General: `PSSA_IMPORT_MANIFEST_VALID` (file inventory matches expected counts); `PSSA_IMPORT_RESPONSE_SHAPE_VALID` (responseSpec/correctResponse match the `interactionType`); `PSSA_IMPORT_EC_RESOLVES` (eligibleContentRefId resolves to a crosswalk row); `PSSA_IMPORT_FAILCLOSED_DEFAULTS` (every record PENDING/candidate/PENDING_REVIEW; none APPROVED/pilot_ready); `PSSA_IMPORT_NO_LEAK` (no `studentPreviewJson` contains answer keys/rationales/correctness markers); `PSSA_IMPORT_SOURCE_COMPLIANCE` (hardened source scan re-run, 0 content-bearing copies); `PSSA_IMPORT_HASH_STABLE` (re-running the importer yields identical `contentHash` per record).
Per-stream (re-run the existing family + batch gates): EBSR (schema/Part-A/Part-B-verbatim/supports/count/skill/partial + **answer-position distribution batch**); MULTI_SELECT, HOT_TEXT, MATCHING_GRID, DRAG_DROP (family gates + **surface-shortcut distribution batch**); CONVENTIONS (correctness + **shortcut distribution batch**); SHORT_ANSWER (rubric/support-sufficiency/copied-text-cap/skill); MCQ (single-defensible/distractor + **answer-position distribution batch**).
### Deprecated-item handling (BLOCKER clarification — do NOT recertify retired items as active)
The **67 active items must pass the current active item-family gates.** The **12 deprecated conventions MCQs are imported ONLY as deprecated/superseded audit-trail records** — they are **NOT** required to pass the current active conventions gates (they were intentionally retired by #4n; the importer preserves them for history, it does not re-author them). For each deprecated item DB-3 sets/verifies ONLY: `itemStatus = deprecated_superseded`; `reviewStatus` is not APPROVED/pilot_ready; **`studentReadyBlockedReason = DEPRECATED_SUPERSEDED`** (definite — DB-1 has the value; gives the admin/reporting layer the right reason); `approvalEligible = false`; `deprecatedReason` present; `supersededByItemIds` exist and resolve to real active #4n items; the item is excluded from every student-ready projection; `contentHash` stable; `eligibleContent` resolves if present; no preview leak in any student-facing projection. Gate `PSSA_IMPORT_DEPRECATION_VALID` covers these. **Deprecated items must neither be blocked because they fail modern active gates, nor "fixed" back into active content.**

## Modes (no writes in DB-3)
1. **File-only dry-run (default):** read files, re-run all gates, resolve EC against the CSV, build the would-import record set, compute hashes, **report**. No DB. Report **canonical would-import counts** (5 passages / 67 active / 12 deprecated / 12 supersession / N batches) and every gate result.
2. **DB-aware dry-run (optional; `DATABASE_URL` + migration):** additionally compare the would-import set to current DB state and report `wouldInsert/wouldUpdate/wouldNoop` by stable `itemId`/`contentHash`. Still **no writes**.
3. `--write` code MAY exist (for DB-4) but **must not run in DB-3**. If `--write` is passed, **exit before any mutation path is reachable** with "writes are DB-4; run the DB-4 step." If a Prisma client is initialized for DB-aware dry-run, it may perform **reads only**. Add a code assertion + a test proving DB-3 performs **zero** `create`/`update`/`upsert`/`delete`/`createMany`/`executeRaw` calls in any mode.

## Tests
1. File-only dry-run on the real bank → manifest matches (5/67/12/12), all re-run gates PASS, EC resolves for all, hashes stable on a second run → PASS.
2. An item mutated so its `interactionType` and `correctResponseJson` disagree → blocked by `PSSA_IMPORT_RESPONSE_SHAPE_VALID`.
3. An item with an EC not in the crosswalk → blocked by `PSSA_IMPORT_EC_RESOLVES`.
4. A fixture item pre-set to `reviewStatus=APPROVED` → blocked by `PSSA_IMPORT_FAILCLOSED_DEFAULTS` (import must never carry approval).
5. A `studentPreviewJson` containing a correct answer → blocked by `PSSA_IMPORT_NO_LEAK`.
6. An EBSR batch fixture with all Part-A correct = A → blocked by the re-run EBSR answer-position distribution batch gate (proves batch context is real, not per-item).
7. A deprecated item whose `supersededByItemIds` points to a non-imported id → blocked by `PSSA_IMPORT_DEPRECATION_VALID`.
8. `--write` passed in DB-3 → refused with the DB-4 message; nothing written.
9. Re-run → identical `contentHash` set (`PSSA_IMPORT_HASH_STABLE`).

## Reports
- `reports/pssa_import_dryrun_manifest.csv` — sourceFile, recordType(passage|item|deprecated|supersession|batch), count, expectedCount, match.
- `reports/pssa_import_dryrun_items.csv` — itemId, interactionType, interactionSubtype, gradeLevel, eligibleContent, ecResolved, contentHash, reviewStatus, itemStatus, studentReadyBlockedReason, batchId, perGateResults summary, finalImportEligibility(eligible|blocked), blockedReasons, dbAction(N/A in file-only).
- `reports/pssa_import_dryrun_batches.csv` — batchId, streamType, gradeLevel, batchGate, batchResult, itemCount.
- `reports/pssa_import_dryrun_summary.md` — mode, counts (5/67/12/12/N), every gate's PASS/FAIL tally, EC-resolution summary, hash-stability confirmation, and an explicit line: **0 records written (DB-3 is dry-run only)**.

## Verification
```
npx tsc --noEmit
npm run build
npm run <importer> -- --dry-run         # file-only; full re-validation + report, no DB
```

## Acceptance
- `import-pssa-items.ts` added + npm script; **file-only dry-run is the default; DB-3 performs zero DB writes** (even if `--write` is passed, it's refused).
- File-only dry-run on the real Grade 3 bank: manifest matches **5 passages / 67 active items / 12 deprecated / 12 supersession / 8 batches** (`reading_mcq_grade3`, `ebsr_grade3`, `multi_select_grade3`, `hot_text_grade3`, `matching_grid_grade3`, `drag_drop_grade3`, `conventions_grade3`, `short_answer_grade3_pool`).
- **67 active items PASS all current active item-family + batch gates.** **12 deprecated items PASS the deprecation/supersession/import-governance checks ONLY** (not re-certified against active conventions gates, not "fixed" into active content).
- **Every item's EC resolves** to a crosswalk row; every would-import record is fail-closed (PENDING/candidate/PENDING_REVIEW, none APPROVED/pilot_ready); no preview leaks; source scan 0 copies; `contentHash` stable across two runs.
- Gates are **re-used existing functions**, not reimplemented copies; batch gates run with tranche context.
- No DB writes; no approvals; no student-facing wiring; no schema change; no changes to the file-based bank content.
- `tsc` + `build` + file-only dry-run green.

## Stop — report
Importer path + npm script; the manifest table (expected vs actual: 5 passages / 67 active / 12 deprecated / 12 supersession / 8 batches); per-stream gate PASS/FAIL tallies (active items) + deprecation-governance results (12 deprecated, not active-gated); EC-resolution count (all 67+12 resolve?); fail-closed confirmation (0 APPROVED/pilot_ready in the would-import set); preview-leak + source-scan results; hash-stability confirmation; confirmation gates were re-used not reimplemented; confirmation **0 records written**; report paths. **Do not write to any database — that is DB-4. Do not approve anything. Do not wire student-facing selection.**
