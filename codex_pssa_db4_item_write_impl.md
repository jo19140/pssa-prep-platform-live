# PSSA DB-4 (build) — implement the item-bank WRITE path (persist the DB-3 plan, fail-closed)

## Why this spec exists
The DB-4 **operator runbook** (`codex_pssa_db4_devdb_import_write.md`) assumed a working `--write` path on the item importer. It does not exist yet **by design**: DB-3 (`scripts/content/import-pssa-items.ts`) is deliberately write-incapable — `parseArgs` throws `writes are DB-4; run the DB-4 step.` on `--write` (line ~117), and `assertNoWrites()` (line ~537) scans the importer's own source and throws if any Prisma write call is present. This spec implements the actual persistence layer. **Do not weaken or delete the DB-3 guards** — the writer lives in a separate file so DB-3 stays provably read-only.

## What already exists (reuse, do not re-derive)
`buildPlan()` in `import-pssa-items.ts` already produces the full, gated `ImportPlan`: 5 passages, 67 active items, 12 deprecated, 12 supersessions, 8 batches, each item carrying `contentHash`, `ecResolved`, `reviewStatus:"PENDING"`, `itemStatus`, `studentReadyBlockedReason`, `approvalEligible:false`, `alignmentStatus`, `batchId`, `responseSpecJson`/`correctResponseJson`/`scoringJson`/`studentPreviewJson`, `deprecatedReason?`, `supersededByItemIds?`, `gates`, `finalImportEligibility`, `blockedReasons`. The dry-run already confirmed manifest 5/67/12/12/8 and 0 gate failures against the dev DB.

## Architecture (mandatory)
1. **Extract, don't fork.** Move `buildPlan()` + its types + the gate/hash/source-scan helpers into a shared module `scripts/content/lib/pssa-import-plan.ts` (or similar). Both consumers import from it so the plan is **byte-identical** in dry-run and write:
   - `import-pssa-items.ts` (DB-3) — unchanged behavior: still dry-run only, still calls `assertNoWrites()` on **its own** source, still refuses `--write`.
   - **NEW** `scripts/content/write-pssa-items.ts` (DB-4) — the only file allowed to hold Prisma writes. Wire it to npm script `content:write-pssa-items`.
2. **Keep the DB-3 self-scan green — AND extend it to the shared module (BLOCKER).** After extraction, DB-3 imports the shared plan module, so a side effect hidden in that helper could leave DB-3 "green" while actually being impure. `assertNoWrites()` must scan **both** files:
   - `scripts/content/import-pssa-items.ts`
   - `scripts/content/lib/pssa-import-plan.ts`

   **`scripts/content/lib/pssa-import-plan.ts` must be pure/read-only.** It MAY: read source files, run gates, compute hashes, build the `ImportPlan`. It MUST NOT: import the DB writer; call Prisma `create/update/upsert/delete/createMany/deleteMany/updateMany`; call `$executeRaw`/`$queryRaw` for mutation; mutate source files; or run authoring/regeneration as an import side effect. Add an assertion/test that scans both files; DB-3 stays green only if **both** are write-free. Do not import the writer into the DB-3 module or the shared module.
3. **Operator command.** Update the runbook's write command to `npm run content:write-pssa-items -- --write --env dev` (and the immediate re-run for idempotency). Update `codex_pssa_db4_devdb_import_write.md` steps 5–6 to call the new script. Leave the DB-3 dry-run command (step 4) as-is.

## Pre-write gate (fail-closed — refuse the write unless ALL hold)
Before any DB mutation, the writer rebuilds the plan and **refuses to write** (non-zero exit, zero rows touched) unless:
- Manifest is exactly 5 / 67 / 12 / 12 / 8.
- Total gate failures = 0 and `sourceScanFailures = 0` and `hashStable = true`.
- Every active item `finalImportEligibility = "eligible"`, `blockedReasons` empty.
- **No item carries `reviewStatus="APPROVED"`, `itemStatus="pilot_ready"`, or any student-ready/approval state.** If any does, refuse (the importer must never be a back-door to approval).
- Crosswalk is present in the DB: `PssaStandardsCrosswalk = 241`, `PssaCrosswalkPaCoreStandard = 936`. If not, stop with "load the crosswalk (DB-2) first."

## EC resolution → FK (the real DB-aware step)
For every item with an `eligibleContent`, resolve it against the **DB** `PssaStandardsCrosswalk` by natural key `(subject, gradeLevel, eligibleContent, sourceVersionYear=2014)` and set the item's `eligibleContentRefId` FK to that row's id. **Refuse the write if any active item's EC does not resolve** (no item may be imported with an unresolved EC). Deprecated items resolve their EC if present but are **not** recertified as active. Report the resolution count (expect 79/79 active+deprecated, or state the exact split).

## What to persist (transactional, all-or-nothing)
In a single `db.$transaction`, in this order (supersessions last, because every `newItemId` must already resolve to an upserted active item):
1. **`PssaImportRun`** — create the run-metadata row if the implementation records each run.
2. **`PssaPassage`** (5): id, title, text, gradeLevel, subject, passageType, `contentHash`, `reviewStatus="PENDING"`, `itemStatus="candidate"`, `studentReadyBlockedReason="PENDING_REVIEW"`, not approved.
3. **`PssaItemBatch`** (8): `batchId`, `streamType`, `gradeLevel`, `batchGate`, `batchResult`, `itemCount`.
4. **`PssaItem`** (79 = 67 active + 12 deprecated): all item fields incl. `interactionType`, `interactionSubtype`, `gradeLevel`, `subject`, `eligibleContent`, `eligibleContentRefId`, `responseSpecJson`, `correctResponseJson`, `scoringJson`, `studentPreviewJson`, `contentHash`, `batchId` (links to the batch), and governance fields below.
5. **`PssaItemPassageLink`** for each item↔passage relationship.
6. **`PssaItemSupersession`** (12): `oldItemId` → `newItemId` (map from `supersededByItemIds`), `reason`. Every supersession must resolve `newItemId` to an **active** item (the #4n conventions rebuild). Refuse if a supersession points to a missing/deprecated target.
7. **Post-write assertions** inside the same transaction; roll back the whole transaction if any fail.

## Fail-closed governance (enforced at write, not just copied)
- **67 active items:** `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, `approvalEligible=false`, `approvedAt=null`, `reviewedBy=null`.
- **12 deprecated items:** `itemStatus=deprecated_superseded`, `studentReadyBlockedReason=DEPRECATED_SUPERSEDED`, `deprecatedReason` present, `approvalEligible=false`, not student-ready.
- **5 passages:** `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`.
- **Decisive invariants after write:** `APPROVED=0`, `pilot_ready=0`, `studentReadyBlockedReason=NONE → 0`, **student-ready items = 0**. The writer has **no** flag that can set approval/student-ready; that is DB-5.

## Idempotency + drift (re-run must be a content no-op)
- Upsert `PssaPassage`/`PssaItem` by their natural id; compare stored `contentHash` to the freshly computed one (use the same canonical `stableStringify` hashing — immune to JSONB key order, per the DB-2 lesson).
- **Second `--write` with unchanged sources = 0 inserts / 0 updates / 0 deletes** on `PssaPassage`, `PssaItem`, `PssaItemPassageLink`, `PssaItemSupersession`, `PssaItemBatch` (a new `PssaImportRun` row MAY be recorded as run metadata — report it separately, NOT as content mutation).
- If a source `contentHash` differs from the stored row, **FLAG drift in the report and refuse to silently overwrite** (drift is a reviewed event, not an auto-apply).

### No content deletion / no reconciliation (BLOCKER)
DB-4 imports the known Grade 3 bank **once**, fail-closed. It is **not** a sync tool. The writer **must not delete** `PssaPassage`, `PssaItem`, `PssaItemPassageLink`, `PssaItemBatch`, or `PssaItemSupersession` rows — not on the first write, not on re-run. If source files are missing, counts change, links differ, or supersession mappings differ from what's in the DB: **refuse the write, report the drift/mismatch, and do not reconcile by deleting or overwriting governed content.** Deletions/retirements belong to a later explicit governance PR.

## Safety / env
- `--write` requires explicit `--env dev`; refuse production-like `NODE_ENV`/`APP_ENV` unless `--allow-production` (out of scope here); require `DATABASE_URL`. **Never echo the raw `DATABASE_URL`** — print only a redacted target. No source-file mutation. Import ≠ approval ≠ student-facing.

## Reports (commit logs, not data)
Write the runbook's named reports: `reports/pssa_db4_write_summary.md`, `pssa_db4_write_manifest.csv`, `pssa_db4_db_state_assertions.csv`, `pssa_db4_idempotency_report.csv`, `pssa_db4_student_ready_failclosed_report.csv`, `pssa_db4_supersession_report.csv`. The summary includes redacted DB target, crosswalk counts, passage/item counts, active/deprecated split, batch table, supersession count, EC-resolution count, the fail-closed status counts, **student-ready count = 0**, and second-run idempotency result.

## Tests
1. DB-3 importer unchanged: dry-run still prints `0 records written`; `assertNoWrites()` still passes (writer is a separate file).
2. Writer pre-write gate: a synthetic plan with one `finalImportEligibility="blocked"` item → writer refuses, 0 rows written.
3. Writer refuses if an active item's EC doesn't resolve in the DB crosswalk.
4. Writer refuses if crosswalk counts ≠ 241/936.
5. Happy path against a migrated dev DB with crosswalk loaded → 5/67/12/12/8 with exact batch membership; all governance invariants hold; `student-ready=0`.
6. Second `--write` → content no-op (0/0/0); `PssaImportRun` may +1 (reported separately).
7. Drift test: mutate one source item's hash input → writer flags drift and refuses to overwrite.
8. `tsc --noEmit` + `build` green.

## Acceptance
DB-3 stays read-only and green; the new writer persists the plan transactionally and fail-closed; EC resolves to FKs (refuse on any unresolved active EC); after the first write the DB holds 5 passages / 67 active candidate / 12 deprecated / 12 supersession / 8 batches with exact batch membership; `APPROVED=0`, `pilot_ready=0`, `student-ready=0`; the second write is a content no-op; drift is flagged not overwritten; no existing/unrelated table touched; no approval / student-facing selector / form assembly built. `tsc`+`build` green.

## Stop — report (paste back for Claude's independent audit)
The new file + npm script; confirmation DB-3 importer + `assertNoWrites` unchanged and green; the pre-write gate logic; EC-resolution count; the transactional write summary; the exact post-write DB counts (passages/active/deprecated/supersession/batches + batch membership); the fail-closed governance table; **student-ready count (must be 0)**; second-run idempotency counts; drift-test result; `tsc`/`build` results; report paths. Do **not** approve anything, build the student-ready selector (DB-5), or build form assembly (DB-6).
