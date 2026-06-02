# PSSA DB-2 — Crosswalk Loader (PssaStandardsCrosswalk + CC-code join)

Implements DB-2 of `design_pssa_db_import.md`. **Loads the vetted Eligible-Content crosswalk into the governed tables — and ONLY that.** No item import, no passage import, no approval, no student-facing wiring, no schema changes. Idempotent. `--dry-run` default, `--write` required for DB writes. Commit.

## Rule 0 — source of truth, no invention
The crosswalk is **already vetted and canonical** at `data/pssa/anchor_ec_crosswalk.csv` (241 EC rows, grades 3–8, transcribed from the PDE 2014/2017 anchor docs). **Load EXACTLY those rows. Do NOT generate, infer, or "fix" any EC code, anchor, descriptor, or CC mapping.** If a row is malformed, stop and report — do not repair it. The loader is a faithful importer, not an author.

## Preconditions (stop and report if any is missing)
DB-1 schema migration committed/merged to `main` (commit `43fe716`) — `PssaStandardsCrosswalk` + `PssaCrosswalkPaCoreStandard` exist; branch cut from latest `main`; for `--write`, a reachable dev Postgres with the DB-1 migration **applied** (DB-1 generated the migration but could not apply it in CI — `--write` here is the first real apply-dependent step, so it needs a DB where `migrate deploy`/`migrate dev` has run). `--dry-run` needs no DB.

## Source file + exact shape
`data/pssa/anchor_ec_crosswalk.csv`, header (19 columns):
`subject, gradeLevel, reportingCategory, reportingCategoryTitle, assessmentAnchor, assessmentAnchorTitle, anchorDescriptor, anchorDescriptorText, eligibleContent, eligibleContentText, dokCeiling, paCoreStandardCodes, primaryPaCoreStandardCode, mappingGranularity, mappingConfidence, sourceDocument, sourceVersionYear, sourceUpdatedYear, sourceAnomalyJson`.
Known shape (validate against these): **241 data rows**; per-grade `{3:33, 4:37, 5:40, 6:41, 7:43, 8:47}`; reporting categories `A|B|D|E`; **6 rows carry `sourceAnomalyJson`** (the Grade-8 TDA `CC.1.4.7.B→CC.1.4.8.B` anomaly); `paCoreStandardCodes` is **pipe-separated** CC codes (e.g. `CC.1.3.3.A|CC.1.3.3.B|CC.1.3.3.C`); **936 total CC codes** across all rows → 936 join rows.

## Mapping CSV → tables
**`PssaStandardsCrosswalk`** (one row per CSV row): copy `subject, gradeLevel(int), reportingCategory, reportingCategoryTitle, assessmentAnchor, assessmentAnchorTitle, anchorDescriptor, anchorDescriptorText, eligibleContent, eligibleContentText, dokCeiling(nullable), primaryPaCoreStandardCode(nullable), mappingGranularity, mappingConfidence, sourceDocument, sourceVersionYear(int), sourceUpdatedYear(int), sourceAnomalyJson(parse to JSON if present, else null)`. Natural key = `(subject, gradeLevel, eligibleContent, sourceVersionYear)` (the DB-1 `@@unique`).
**`PssaCrosswalkPaCoreStandard`** (one row per CC code): for each row, split `paCoreStandardCodes` on `|`, trim, drop empties, dedupe; insert `(crosswalkId, standardCode)` per the DB-1 `@@unique([crosswalkId, standardCode])`.

## Behavior — three modes (Pro: don't fake DB-relative counts in a no-DB dry-run)
1. **File-only dry-run (default when no DB is available):** parse CSV; run all shape/format/anomaly/no-invention validations; report **canonical source counts** (241 crosswalk rows, 936 CC join rows, per-grade distribution, 6 anomaly rows). **Do NOT claim real insert/update/remove/no-op counts** — there's no DB to compare against. No DB connection.
2. **DB-aware dry-run (when `DATABASE_URL` is set and the DB-1 migration is applied):** compare CSV-derived canonical rows to current DB state; report `wouldInsert / wouldUpdate / wouldRemove / wouldNoop`; prove the reconcile plan **without writing**.
3. **`--write` (DB required):** perform the upserts in a transaction, all-or-nothing on any validation failure; record the run; a re-run after a write must be a **no-op**.

**Idempotent upsert + reconcile.** `PssaStandardsCrosswalk` upsert by natural key; `PssaCrosswalkPaCoreStandard` upsert by `(crosswalkId, standardCode)` with **reconcile** (remove join rows no longer in the CSV, so a corrected CSV leaves no orphan CC codes). **No-op accuracy:** compute a **field-level diff** first — a row whose canonical fields are all identical reports as `noop`, NOT `updated`.

**Write safety:** `--write` requires explicit `--env dev` (or equivalent). **Refuse to write if `NODE_ENV`/`APP_ENV` looks like production** unless `--allow-production` is explicitly passed (production writes are out of scope for DB-2). No item/passage import; no approval; no student-facing change; no `PssaItem`/`PssaPassage` rows touched.

## Validation gates (all blockers; run in both modes)
1. `PSSA_XWALK_ROWCOUNT` — exactly 241 data rows; per-grade distribution matches `{3:33,4:37,5:40,6:41,7:43,8:47}`.
2. `PSSA_XWALK_COLUMNS_VALID` — all 19 columns present, header exact; required fields non-empty (subject, gradeLevel, reportingCategory, assessmentAnchor, anchorDescriptor, eligibleContent, mappingGranularity, mappingConfidence, sourceDocument, sourceVersionYear, sourceUpdatedYear).
3. `PSSA_XWALK_EC_FORMAT` — parse each `eligibleContent` with `^E0([3-8])\.([ABDE])(?:-[A-Z])?\..+$` (allows skill-family suffixes like `A-K`, `B-C`, `B-V`); the **embedded grade `([3-8])` must equal `gradeLevel`**, and the **first category letter `([ABDE])` must equal `reportingCategory`**; `gradeLevel` ∈ 3–8.
4. `PSSA_XWALK_NATURAL_KEY_UNIQUE` — `(subject, gradeLevel, eligibleContent, sourceVersionYear)` unique across the CSV (no dupes).
5. `PSSA_XWALK_CC_FORMAT` — every split CC code matches the anchored pattern `^CC\.\d\.\d\.\d+\.[A-Z]$`; **936 total** CC codes; no empty tokens after split (`||` or trailing `|`).
6. `PSSA_XWALK_ANOMALY_PRESERVED` — **semantic** preservation (JSON is not byte-stable): parse each of the 6 `sourceAnomalyJson` values as JSON, store an equivalent JSON value, do NOT normalize/rewrite the anomaly content, and include the **raw `sourceAnomalyJson` string in the report** for traceability. (The G8 TDA `CC.1.4.7.B→CC.1.4.8.B` anomaly must survive intact.)
7. `PSSA_XWALK_NO_INVENTION` — every loaded EC/anchor/descriptor/CC value appears in the CSV; the loader introduces zero values not present in the source (diff the would-be-written set against the CSV).
8. `PSSA_XWALK_IDEMPOTENT` — **file-only mode** proves deterministic canonical output only (same CSV → same parsed/validated canonical set). **DB-aware dry-run / write mode** proves table-state idempotency: after a write, a second write with an unchanged CSV must be a no-op (0 added / 0 updated / 0 removed).

## Tests
1. **File-only dry-run:** clean CSV → reports 241 **canonical** crosswalk rows, 936 **canonical** CC join rows, per-grade distribution, 6 anomaly rows, 0 validation errors → PASS. (Does NOT report insert/update/remove/noop in file-only mode.)
1b. **DB-aware dry-run:** clean CSV against an empty migrated DB → `wouldInsert` 241 crosswalk + 936 CC join rows, 0 errors → PASS.
2. `--write` then `--write` again (unchanged CSV) → second run is a no-op (0/0/0) → PASS idempotency.
3. CSV with a duplicate natural key → FAIL `PSSA_XWALK_NATURAL_KEY_UNIQUE` (abort, no partial write).
4. CSV with a malformed EC code (e.g. `E03.Z.9`) → FAIL `PSSA_XWALK_EC_FORMAT`.
5. CSV row count ≠ 241 / grade distribution off → FAIL `PSSA_XWALK_ROWCOUNT`.
6. A CC token that doesn't match the pattern, or an empty token from `||` → FAIL `PSSA_XWALK_CC_FORMAT`.
7. Remove a CC code from a row + re-run `--write` → that orphan join row is removed (reconcile), crosswalk row updated, others unchanged.
8. `sourceAnomalyJson` that isn't valid JSON → FAIL `PSSA_XWALK_ANOMALY_PRESERVED`.
9. `--write` with no DB / DB-1 migration not applied → fail clearly with a message to apply the migration first (do not partially write).

## Reports
- `reports/pssa_crosswalk_load_report.csv` — per crosswalk row: subject, gradeLevel, eligibleContent, ccCodeCount, anomalyPresent, rawSourceAnomalyJson, result, notes, and a `dbAction` column = **`N/A` (or `canonical_source_only`) in file-only mode**; `insert | update | noop | remove` in DB-aware/write mode.
- `reports/pssa_crosswalk_load_summary.md` — mode (dry_run|write), env, total crosswalk rows + CC rows, per-grade table, anomaly count, added/updated/removed/noop counts, all 8 validation-gate results, idempotency confirmation.

## Verification
```
npx tsc --noEmit
npm run build
npm run <crosswalk loader> -- --dry-run     # default; full validation + report, no DB
# (--write runs only where a dev DB with the DB-1 migration applied exists)
```

## Acceptance
- Loader script added + wired to an npm script; file-only dry-run is the default; `--write` is explicit.
- **File-only acceptance (no DB required):** 241 canonical crosswalk rows parsed; 936 canonical CC-code rows parsed; exact per-grade distribution `{3:33,4:37,5:40,6:41,7:43,8:47}`; 6 anomaly rows; all 8 validation gates PASS (0 failures); **zero invented EC/anchor/CC values** (everything traces to the CSV).
- **DB-aware / write acceptance (dev DB with DB-1 migration applied):** `wouldInsert/wouldUpdate/wouldRemove/wouldNoop` reported; `--write` is transactional (all-or-nothing); a second write with an unchanged CSV is a no-op; orphan CC-code joins are reconciled.
- No `PssaItem`/`PssaPassage` rows touched; no approval; no student-facing change; no schema change.
- `tsc` + `build` green; file-only dry-run green.

## Stop — report
Loader path + npm script; dry-run counts (crosswalk rows, CC rows, per-grade table, anomaly count); the 8 validation-gate results; idempotency/reconcile confirmation; confirmation zero invented values; confirmation no items/passages/approvals/student-facing changes; whether `--write` was run (and against which env) or only `--dry-run`; report paths. **Do not import PSSA items (that is DB-3). Do not approve anything. Do not wire student-facing selection.**
