# PSSA DB-4 — Import Grade 3 Bank to a Dev Postgres (first real --write)

**OPERATOR-RUN, NOT CODEX.** Codex may finalize any remaining script wiring/guardrails/verification queries, but the actual `--write` is executed by you (or a trusted operator) against a **disposable local dev Postgres first**. The sandbox cannot snapshot, roll back, or safely hold a `DATABASE_URL`, so the write itself is real-environment work.

**This is the first time ANYTHING in the DB chapter executes for real:** the DB-1 migration was *generated* but never *applied*; the FK + CHECK constraints have never been enforced; DB-2 `--write` never ran; DB-3's DB-aware mode never ran. DB-4 exercises all of it at once — so run it **one checkpoint at a time and stop at the first surprise.**

## Scope / boundary
Import the audited Grade 3 PSSA bank into the governed tables as **fail-closed candidate content** — and nothing more. **Import ≠ approval. Import ≠ student-facing.** No approvals, no student-ready selector, no form assembly, no production writes, no source-file mutation. DB-4 only commits **reports/logs** to the repo (not data).

## Audit-role note (trust model changes here)
Claude's independent audit so far has read code + re-derived results in a sandbox. Claude **cannot** read your dev DB. For DB-4, Claude audits the **script + the assertion queries** (that they check the right things); the **ground truth is your DB output**, which Claude reviews from the reports you run. Run the assertions; paste the reports.

## Preconditions (stop and report if any is missing)
**Branch/repo:** branch from latest `main`; DB-1, DB-2, DB-3 all committed/merged; Grade 3 bank files present.
**Database (dev/local ONLY):** `DATABASE_URL` points to a **dev/local** Postgres; DB name/host clearly identifies dev/local; **production-like environments are REFUSED** (the loaders/importer already refuse prod unless `--allow-production`, which is out of scope here); if shared dev, a **backup/snapshot is taken first**.
**Disposable-DB readiness (preferred path):** a local throwaway DB you can wipe and recreate (e.g. a dedicated `pssa_dev` database). Have a teardown command ready so a bad run is recoverable: drop+recreate the DB, re-run from migration.

## Apply sequence — run line by line, verify each before the next
```
cd ~/pssa-prep-platform-live
git checkout main && git pull --ff-only origin main

# 0. Confirm environment is dev/local — STOP if not. NEVER echo the raw DATABASE_URL
#    (it leaks credentials into logs/screenshots/reports). Print a REDACTED target:
node - <<'NODE'
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const p = new URL(url);
console.log({ protocol: p.protocol, host: p.hostname, port: p.port || "(default)",
  database: p.pathname.replace(/^\//, ""), username: p.username ? "(set)" : "(missing)",
  password: p.password ? "(redacted)" : "(missing)" });
NODE
echo "NODE_ENV=$NODE_ENV  APP_ENV=$APP_ENV"
# NEVER paste or commit an unredacted DATABASE_URL anywhere.

# 1. Schema/migration state.
npx prisma validate
npx prisma migrate status

# 2. Apply the DB-1 migration (FIRST real apply).
#    Shared/dev: migrate deploy. Local dev: migrate dev is fine.
npx prisma migrate deploy
#    >>> CONFIRM the CHECK constraint applied: Prisma can't represent CHECK in schema,
#        so it lives in raw migration SQL — verify it exists on the DB:
#        \d+ "PssaAuditResult"  (psql) should show PssaAuditResult_target_matches_fk_check.

# 2b. PREFLIGHT (fresh disposable DB): the Pssa content tables must be EMPTY before any write.
#     Catches accidental reuse of an old dev DB. Expected on a clean first run:
#       PssaStandardsCrosswalk=0, PssaCrosswalkPaCoreStandard=0, PssaPassage=0,
#       PssaItem=0, PssaItemBatch=0, PssaItemSupersession=0
#     If any is non-zero on the FIRST local proof, STOP and confirm you're not reusing a DB.
#     (On a shared dev DB later, non-zero may be expected — but the first local proof starts clean.)

# 3. Load the crosswalk (FIRST real DB-2 --write).
npm run content:load-pssa-crosswalk -- --write --env dev
#    >>> verify: PssaStandardsCrosswalk = 241, PssaCrosswalkPaCoreStandard = 936.

# 3b. Re-run the crosswalk write — must be a NO-OP (FIRST real DB-2 idempotency proof).
npm run content:load-pssa-crosswalk -- --write --env dev
#    >>> inserts/updates/deletes = 0 on both tables; counts stay 241 / 936.

# 4. DB-aware dry-run (FIRST real DB-3 DB-aware mode) — proves the plan, writes nothing.
npm run content:import-pssa-items -- --dry-run --db-aware --env dev
#    >>> manifest 5/67/12/12/8; 79/79 EC resolve; 0 blocked; wouldInsert matches.

# 5. First real item-bank write.
npm run content:import-pssa-items -- --write --env dev

# 6. Re-run write immediately — must be a NO-OP (idempotency).
npm run content:import-pssa-items -- --write --env dev
```
If any step errors or a count is off, **stop, report, identify/fix the cause, then (on the disposable DB) tear down + rerun from the migration** — do NOT blindly rerun the same failing pipeline, and do not push past a surprise.

## Required DB state after the first write (exact)
- **Crosswalk:** `PssaStandardsCrosswalk = 241`; `PssaCrosswalkPaCoreStandard = 936`.
- **Bank:** `PssaPassage = 5`; `PssaItem = 79` (active candidate = 67, deprecated_superseded = 12); `PssaItemSupersession = 12`; `PssaItemBatch = 8`.
- **Active batch membership:** `reading_mcq_grade3 = 28`, `ebsr_grade3 = 5`, `multi_select_grade3 = 5`, `hot_text_grade3 = 5`, `matching_grid_grade3 = 5`, `drag_drop_grade3 = 5`, `conventions_grade3 = 9`, `short_answer_grade3_pool = 5`.

## Fail-closed governance checks (the core safety check)
- **All 67 active items:** `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, `approvalEligible=false`, `approvedAt=null`, `reviewedBy=null`.
- **All 12 deprecated:** `itemStatus=deprecated_superseded`, `studentReadyBlockedReason=DEPRECATED_SUPERSEDED`, `deprecatedReason` present, supersession rows resolve to active #4n items, `approvalEligible=false`, not student-ready.
- **All 5 passages:** `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, not approved.
- **The decisive counts:** `APPROVED = 0`; `pilot_ready = 0`; `studentReadyBlockedReason = NONE` → **0**; **student-ready PSSA items = 0**.

## Crosswalk-resolution checks
Every active `PssaItem` with an `eligibleContent` has `eligibleContentRefId` set and resolving to a `PssaStandardsCrosswalk` row; **no item imported with an unresolved EC**; deprecated items resolve EC if present but are not recertified as active.

## Hash / idempotency checks
Every imported passage/item has `contentHash` (excludes governance metadata, import timestamps, approval fields, report paths, run IDs).
**The second write must be a CONTENT no-op. Required (all = 0):** `PssaPassage`, `PssaItem`, `PssaItemPassageLink`, `PssaItemSupersession` inserts/updates/deletes = 0; `PssaItemBatch` inserts/updates/deletes = 0 (unless the implementation intentionally records a *new batch audit run* separately); content drift = 0; blocked = 0.
**Allowed:** a new `PssaImportRun` (and report) row MAY be created if the importer logs every run — if so, **report it separately as run metadata, NOT content mutation.** (This avoids both a false failure from reading "no-op" too literally, and a false pass that hides quietly-updated item rows.) If a source file changes later, DB-4 flags **drift** rather than silently overwriting.

## No-touch checks (baseline timing matters)
**Capture the baseline AFTER the DB-1 migration is applied and BEFORE the DB-2/DB-4 writes** (on a fresh disposable DB, migration setup would otherwise confuse the baseline), then again after the item import. **Ignore** `_prisma_migrations` and the new `Pssa*` tables (intentionally created/filled by DB-1/DB-2/DB-4). **Require unchanged counts for:** `Assessment`, `AssessmentQuestion`, `AssessmentPassage`, Reading-Buddy/content-v3 tables, unrelated `DiagnosticItem` rows, and user/student/teacher/assignment tables.

## Reports (commit these to the repo)
`reports/pssa_db4_write_summary.md`, `reports/pssa_db4_write_manifest.csv`, `reports/pssa_db4_db_state_assertions.csv`, `reports/pssa_db4_idempotency_report.csv`, `reports/pssa_db4_student_ready_failclosed_report.csv`, `reports/pssa_db4_supersession_report.csv`. The summary includes: dev DB name/host (redacted), migration status, crosswalk counts, passage/item counts, active/deprecated split, batch counts, supersession count, EC-resolution count, fail-closed status counts, **student-ready count = 0**, second-run idempotency result, and confirmation no approval/student-facing/form-assembly occurred.

## Teardown / rollback (disposable DB)
If anything is wrong: on the disposable local DB, drop + recreate the database and re-run from step 2. On a shared dev DB, restore from the snapshot taken in preconditions. Never patch-fix a half-written governed table by hand — re-run the idempotent pipeline.

## Acceptance
DB-4 passes only if: the DB-1 migration applied (incl. the CHECK constraint verified present); DB-2 wrote 241 + 936; DB-3 DB-aware dry-run passed pre-write; the first write produced 5 passages / 67 active / 12 deprecated / 12 supersession / 8 batches with the exact batch membership; every active item PENDING/candidate/PENDING_REVIEW; every deprecated deprecated_superseded/DEPRECATED_SUPERSEDED; **APPROVED = 0, pilot_ready = 0, student-ready = 0**; all EC refs / passage links / batch memberships resolve; the second write is a no-op; drift is flagged not overwritten; no existing/unrelated table touched; and no approval / form assembly / student-facing selector was built.

## Stop — report (paste back for Claude's review)
Dev DB target confirmation; migration status (+ CHECK constraint present); DB-2 crosswalk state (241/936); DB-3 DB-aware dry-run state; DB-4 first-write counts; second-write idempotency counts; active/deprecated split; batch table; supersession table; EC-resolution summary; fail-closed governance table; **student-ready count (must be 0)**; untouched existing-table verification; report paths. **Do not approve anything. Do not build the student-ready selector (DB-5). Do not build form assembly (DB-6).**

## The win condition (reset expectations)
DB-4 success is NOT "students can use it." It is: **the audited Grade 3 bank exists in Postgres as governed, fail-closed candidate content, and a second import proves the pipeline is idempotent.** Student exposure is a separate, deliberate approval step (DB-5), and stays fail-closed until then.
