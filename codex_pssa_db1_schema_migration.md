# PSSA DB-1 — Governed Item-Bank Schema Migration (schema only, no importer)

Implements the DB-1 step of `design_pssa_db_import.md`. **Migration only:** add the governed PSSA item-bank tables + enums + indexes. **No importer, no data load, no crosswalk load, no approval tooling, no form assembly, no student-facing wiring.** Additive migration (new tables only — does not alter `Assessment`/`AssessmentPassage`/`AssessmentQuestion` or any existing model). File-only + Prisma migration. Commit.

## Rule 0 — reconcile, don't reinvent; #4j–#4o contracts are canonical
This schema **starts from the prior art in branch `state-track/pssa-schema-v2`** (`PssaPassage`, `PssaItem`, `PssaStandardsCrosswalk` + `PssaCrosswalkPaCoreStandard`, `PssaAuditResult` + `PssaLinterRun`, `PssaReviewLog`, governance enums). Reuse that governance/crosswalk/audit design **but apply the gap list + the 7 locked DB-0 decisions below**. Where v2 and the #4j–#4o contracts disagree (response modeling, deprecation, versioning), **the contracts win.** Do not import v2's MCQ-centric response fields as the canonical shape.

## Preconditions (stop and report if any is missing)
DB-0 decision doc (`design_pssa_db_import.md`) committed to `main`; branch cut from latest `main`; Prisma + a dev Postgres available for `migrate dev`. Read `state-track/pssa-schema-v2:prisma/schema.prisma` (models around lines 402–640) before writing — adopt its governance shape.

## Scope
Add these Prisma models + enums to `prisma/schema.prisma` and generate ONE additive migration. No row inserts. No changes to existing models. The next PRs (DB-2 crosswalk loader, DB-3 importer) populate these tables — not this one.

## Enums (reuse v2 where present)
`PssaSourceType` (e.g. internal_original | released_sampler | unknown), `PssaLicenseStatus` (cleared | unresolved | restricted), `PssaReviewStatus` (PENDING | APPROVED | REJECTED), `PssaItemStatus` (candidate | pilot_ready | deprecated_superseded | retired), `PssaAlignmentStatus` (ALIGNED | NEEDS_CROSSWALK | ANOMALY), `PssaInteractionType` (MCQ | EBSR | MULTI_SELECT | INLINE_DROPDOWN | MATCHING_GRID | HOT_TEXT | DRAG_DROP | SHORT_ANSWER | TDA), `PssaStreamType` (MCQ | EBSR | MULTI_SELECT | HOT_TEXT | INLINE_DROPDOWN | MATCHING_GRID | DRAG_DROP | CONVENTIONS | SHORT_ANSWER | **TDA** — include TDA even though Grade 3 has none, so the bank supports Grades 4–8), `PssaAuditSeverity` (BLOCKER | WARN | INFO), `PssaAuditResultStatus` (PASS | WARN | FAIL), `PssaStudentReadyBlockedReason` (NONE | PENDING_REVIEW | STALE_AUDIT_CONTRACT | STALE_SOURCE_SCAN | CONTENT_HASH_DRIFT | FAILED_LATEST_AUDIT | DEPRECATED_SUPERSEDED), `PssaPassageRole` (primary | secondary | evidence_source), **`PssaImportMode` (dry_run | write)** — a real enum, not an ambiguous string, **`PssaAuditTargetType` (item | passage | batch)** — the audit-result target discriminator (Pro fix).

## Models

### PssaStandardsCrosswalk (+ join) — the EC crosswalk as a table
**`id String @id @default(cuid())`** (stable PK for clean relations), plus the full crosswalk row (subject, gradeLevel, reportingCategory(+Title), assessmentAnchor(+Title), anchorDescriptor(+Text), eligibleContent, eligibleContentText, dokCeiling?, primaryPaCoreStandardCode?, mappingGranularity, mappingConfidence, sourceDocument, sourceVersionYear, sourceUpdatedYear, sourceAnomalyJson?). `@@unique([subject, gradeLevel, eligibleContent, sourceVersionYear])` (natural key kept alongside the surrogate id); index by anchor, reportingCategory, eligibleContent. `PssaCrosswalkPaCoreStandard` join (crosswalkId, standardCode) for the dual-mapping CC codes; `@@unique([crosswalkId, standardCode])`; **`@@index([standardCode])`** (to query "all ECs linked to this PA Core standard").

### PssaPassage — governed passage
From v2: id, title, gradeLevel, subject, passageType, text(@db.Text), wordCount, source/license fields (sourceType, sourceName?, sourceCitation?, licenseStatus, commercialUseAllowed, needsLegalReview), governance (reviewStatus, itemStatus, approvedAt?, reviewedBy?), provenanceJson, retiredAt?, createdAt, updatedAt. **ADD (DB-0 locks):** `contentHash`, `latestAuditContentHash?`, `approvedContentHash?`, `auditContractVersion?`, `sourceScanVersion?`, `latestSourceCorpusHash?`, `latestAuditResult?`, `latestAuditAt?`, **`studentReadyBlockedReason PssaStudentReadyBlockedReason @default(PENDING_REVIEW)`** (fail-closed). Fail-safe defaults: `reviewStatus @default(PENDING)`, `itemStatus @default(candidate)`, `licenseStatus @default(unresolved)`, `commercialUseAllowed @default(false)`, `needsLegalReview @default(true)`. Relations: items via `PssaItemPassageLink`. Indexes: `[gradeLevel, subject, reviewStatus, itemStatus]`, `[sourceType, licenseStatus]`, `[retiredAt]`, `[contentHash]`.

### PssaItem — governed item (reconciled to #4j–#4o)
**Keep from v2:** id, module, subject, gradeLevel, standardCode, assessmentAnchor?, eligibleContent?, reportingCategory?, dokLevel?, itemType, skill, difficultyBand?, source/license fields, reviewStatus, itemStatus, alignmentStatus, approvalEligible, approvedAt?, reviewedBy?, studentPreviewJson?, generationBatchId?, provenanceJson, retiredAt?, createdAt, updatedAt.
**REPLACE v2's MCQ-centric response fields** (`answerChoicesJson`/`correctAnswer`/`correctIndex`/`expectedResponseJson`) **with the discriminated contract shape:** `interactionType PssaInteractionType`, `interactionSubtype String?`, `responseSpecJson Json` (the per-surface response spec), `correctResponseJson Json` (indices/spans/cells/assignments/rubric — shape keyed by interactionType, validated in app code at import, NOT in DB), `scoringJson Json`, `pointValue Int`. (Keep `studentPreviewJson` for the leak-checked student view; reviewer data stays out of it.)
**ADD versioning + governance (DB-0 locks):** `responseSpecVersion`, `auditContractVersion`, `sourceScanVersion`, `contentHash`, `latestAuditContentHash?`, `approvedContentHash?`, `latestSourceCorpusHash?`, `latestAuditResult?`, `latestAuditAt?`, `importedFromFile?`, `importRunId?`, **`studentReadyBlockedReason PssaStudentReadyBlockedReason @default(PENDING_REVIEW)`** (fail-closed by default — new imports are blocked until approval clears them to `NONE`), `deprecatedReason?`, `batchId?`. **Crosswalk FK (explicit):** keep the denormalized `eligibleContent String?` for reporting AND add `eligibleContentRefId String?` + `eligibleContentRef PssaStandardsCrosswalk? @relation(fields: [eligibleContentRefId], references: [id])` (the governed relation points to the real crosswalk row). **Fail-safe defaults:** `reviewStatus @default(PENDING)`, `itemStatus @default(candidate)`, `approvalEligible @default(false)`, `licenseStatus @default(unresolved)`, `commercialUseAllowed @default(false)`, `needsLegalReview @default(true)` (the importer sets these properly for `internal_original` content later).
**Relations:** `batch PssaItemBatch?`, `passages PssaItemPassageLink[]`, `auditResults PssaAuditResult[]`, `reviewLogs PssaReviewLog[]`, `supersededBy/supersedes` via `PssaItemSupersession`. (Drop v2's `PssaLesson` relations — out of scope here.)
**Indexes:** `[gradeLevel, subject, reviewStatus, itemStatus, studentReadyBlockedReason]` (selector-friendly), `[auditContractVersion, sourceScanVersion]` (stale-contract sweeps), `[interactionType, interactionSubtype]`, `[standardCode, assessmentAnchor, eligibleContent]`, `[eligibleContentRefId]`, `[alignmentStatus, approvalEligible]`, `[batchId]`, `[importRunId]`, `[contentHash]`, `[retiredAt]`.

### PssaItemPassageLink — multi-passage (REAL table, DB-0 lock #2)
`id, itemId, passageId, role PssaPassageRole, sortOrder Int, createdAt`. FKs to PssaItem + PssaPassage (onDelete Cascade). `@@unique([itemId, passageId, role])`; index `[itemId]`, `[passageId, role]`. (A single-passage item has one `primary` link.)

### PssaItemBatch — batch membership (DB-0 lock #3)
`id, gradeLevel, subject, streamType PssaStreamType, auditContractVersion, sourceScanVersion, sourceCorpusHash, importRunId?, batchAuditResult PssaAuditResultStatus?, batchAuditNotes?, createdAt`. Items FK via `PssaItem.batchId`. Index `[gradeLevel, subject, streamType, auditContractVersion]`, `[importRunId]`. (Holds the tranche-level certification: EBSR position distribution, MS/HT/grid/drag shortcut, conventions shortcut.)

### PssaItemSupersession — queryable deprecation (DB-0 lock #7)
`id, oldItemId, newItemId, reason, createdAt`. Two FKs to PssaItem — **use explicit Prisma relation names** to avoid ambiguous-self-relation errors: `oldItem` relation `"PssaItemSupersededOld"`, `newItem` relation `"PssaItemSupersededNew"` (with the matching back-relation fields on `PssaItem`). `@@unique([oldItemId, newItemId])`; index `[oldItemId]`, `[newItemId]`. (#4n: 12 old conventions MCQs → 9 new — queryable, not JSON.)

### PssaImportRun — import-run tracking (DB-0 lock #4/#5)
`id, runKey @unique, mode PssaImportMode, env, auditContractVersion, sourceScanVersion, sourceCorpusHash, sourceCorpusManifestJson, addedCount, updatedCount, skippedCount, failedCount, reportPath?, createdAt`. (Populated by DB-3/DB-4; created here so items can FK `importRunId`.)

### PssaAuditResult + PssaLinterRun — per-rule audit results (item/passage/batch)
`PssaLinterRun`: id, runKey @unique, batchId?, sourceBundlePath?, auditContractVersion, sourceScanVersion, sourceCorpusHash, totalResults, blockerCount, createdAt. **`PssaAuditResult` must target item OR passage OR batch — with RELIABLE uniqueness (Pro blocker fix).** Nullable columns inside a `@@unique` do NOT enforce "exactly one target" in Postgres (multiple NULLs slip through), so use a **target discriminator**: `targetType PssaAuditTargetType`, `targetId String`, plus optional `itemId?`/`passageId?`/`batchId?` FKs (for relational joins only). Other fields: id, linterRunId, ruleId, severity PssaAuditSeverity, result PssaAuditResultStatus, message(@db.Text), evidenceJson?, createdAt. **`@@unique([targetType, targetId, linterRunId, ruleId])`** (reliable — no nullables in the key). Indexes: `[targetType, targetId, result, severity]`, `[itemId, result, severity]`, `[passageId, result, severity]`, `[batchId, ruleId]`, `[linterRunId]`. **Add a DB-level CHECK constraint in the migration SQL** (allowed — new `Pssa*` table) ensuring `targetType` matches exactly one non-null FK: `item⇒itemId set & passageId/batchId null`, `passage⇒passageId set & others null`, `batch⇒batchId set & others null`. (Records item findings + **passage-gate findings** cross-duplicate/template-skeleton/topic-coherence/concreteness + **batch-gate findings** EBSR position distribution / TEI shortcut. #4k-fix lesson: each EBSR item was individually grounded but the *batch* was gameable — the batch-gate result must be storable.)

### PssaReviewLog — review action log (from v2)
id, **`itemId?`, `passageId?`, `batchId?`** (exactly one target in app code — so review/approval history can target an item, a passage, OR a batch, since `PssaItemBatch` is first-class), action, reviewerUserId?, notes?(@db.Text), editDiffJson?, createdAt. FKs (onDelete Cascade). Indexes `[itemId, createdAt]`, `[passageId, createdAt]`, `[batchId, createdAt]`. (Drop v2's lessonId.)

## Explicit relations (remove ambiguity)
Wire these FKs explicitly: `PssaItem.importRunId → PssaImportRun.id`; `PssaItemBatch.importRunId → PssaImportRun.id`; `PssaItem.batchId → PssaItemBatch.id`; `PssaLinterRun.batchId → PssaItemBatch.id`; `PssaAuditResult.linterRunId → PssaLinterRun.id`; `PssaItem.eligibleContentRefId → PssaStandardsCrosswalk.id`; `PssaItemPassageLink.itemId/passageId → PssaItem/PssaPassage`; `PssaItemSupersession` self-relations named as above. (FK `onDelete` conservative — `Restrict`/`SetNull` for governance tables; `Cascade` only for join/log children of an item/passage.)

## Migration requirements
- `npx prisma migrate dev --name add_pssa_governed_item_bank` against a **dev DB** — additive, new tables only.
- **`ALTER TABLE` is allowed ONLY for newly created `Pssa*` tables** (Prisma uses it to add FKs/constraints among the new tables — that's expected and fine). **No `ALTER TABLE` may target any pre-existing table** (`Assessment`, `AssessmentQuestion`, `AssessmentPassage`, `Passage`, `DiagnosticItem`, etc.). The additive-only check is specifically: no ALTER/DROP against pre-existing tables, and no row inserts.
- `npx prisma generate` succeeds; the Prisma client types compile.
- Do NOT insert any rows. Do NOT wire any selector or app code to these tables in this PR.

## Tests
1. `npx prisma validate` passes; schema is valid.
2. Migration applies cleanly to a fresh dev DB; `prisma migrate status` clean.
3. A type-level smoke test (no DB writes) confirms the new models + enums are importable from the generated client and that `PssaItem` exposes `interactionType`, `responseSpecJson`, `correctResponseJson`, `contentHash`, `batchId`, `studentReadyBlockedReason`.
4. Confirm the migration SQL contains zero `ALTER TABLE`/`DROP` against any **pre-existing** table and zero row inserts (ALTER among the new `Pssa*` tables is expected and allowed).

## Verification
```
npx prisma validate
npx prisma migrate dev --name add_pssa_governed_item_bank
npx prisma generate
npx tsc --noEmit
npm run build
```

## Acceptance
- New models added exactly as specified; enums present; indexes present; **all 7 DB-0 locks reflected** (PssaStandardsCrosswalk canonical name; PssaItemPassageLink real table; PssaItemBatch + PssaItem.batchId; sourceCorpusHash on import/audit-run; latestAuditContentHash + approvedContentHash on PssaItem; studentReadyBlockedReason enum; PssaItemSupersession table).
- `PssaItem` uses the discriminated `interactionType` + `responseSpecJson`/`correctResponseJson` shape (NOT v2's MCQ-centric fields).
- **Fail-closed defaults present:** `studentReadyBlockedReason @default(PENDING_REVIEW)`, `reviewStatus @default(PENDING)`, `itemStatus @default(candidate)`, `approvalEligible @default(false)`, conservative license defaults — so a freshly-imported row is blocked until approval clears it. The schema carries the fields the DB-5 selector will need (`contentHash`, `latestAuditContentHash`, `approvedContentHash`, `auditContractVersion`, `sourceScanVersion`) to enforce: student-ready only if `contentHash = latestAuditContentHash = approvedContentHash` AND `auditContractVersion`/`sourceScanVersion` current. DB-1 does NOT build that selector — only the schema support.
- `PssaAuditResult` uses `targetType + targetId` for uniqueness (no nullable-column unique key) + a CHECK constraint matching `targetType` to exactly one non-null FK; `PssaImportMode` and `PssaAuditTargetType` are enums; `PssaStreamType` includes TDA; `PssaItemSupersession` self-relations are explicitly named; `PssaReviewLog` supports item/passage/batch targets; `PssaCrosswalkPaCoreStandard.standardCode` is indexed.
- **Fail-closed by default (safety-critical) — new `PssaItem`/`PssaPassage` rows are blocked:** `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, `approvalEligible=false`, `commercialUseAllowed=false`, `needsLegalReview=true`, `licenseStatus=unresolved`.
- Migration is additive-only (ALTER allowed only among new `Pssa*` tables); zero ALTER/DROP against existing tables; no rows inserted; no importer/selector/app wiring.
- `prisma validate` + `migrate dev` + `generate` + `tsc` + `build` all green on dev.

## Stop — report
The migration filename; the full list of models + enums added; the index list per model; confirmation the SQL is additive-only (no ALTER on existing tables, no row inserts); confirmation `PssaItem` uses the discriminated response shape; confirmation the 7 DB-0 locks are all present; `prisma validate`/`migrate dev`/`generate`/`tsc`/`build` results. **Do not build the crosswalk loader (DB-2), the importer (DB-3), the approval selector (DB-5), or any form assembly. Do not insert data. Do not wire student-facing selection.**
