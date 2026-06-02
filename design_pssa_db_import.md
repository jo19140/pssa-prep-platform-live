# PSSA Item Bank → Database: Import Design (DB-0 Decision Doc)

**Status:** decision doc (DB-0) — the architecture record for the DB chapter. ChatGPT-Pro-reviewed and approved (Option B). Each step below becomes its own audited PR like the #4j–#4o authoring loop. **DB-1 (schema migration) is already built, audited, and merged to main** (commit `43fe716`).

## 1. Where we are
The Grade 3 PSSA item bank is complete across all item types (reading MCQ, EBSR, multiple-select, hot-text, matching-grid, drag-drop, inline-dropdown/conventions, Short Answer) and fully audited. **All of it is file-based**: content lives in `exemplars/pssa_grade3_*/**.json`, every backend flagged `noDbWrite: true`, `productionImportReady: false`. Every item is `reviewStatus = PENDING` / `itemStatus = candidate`. **Nothing is in a database; nothing is student-facing.** That is the intended safe state. To become usable, the items need a governed home in Postgres (Prisma), an import path, the eligible-content crosswalk loaded, and a deliberate approval step.

## 2. What the database had before DB-1 (grounded in `prisma/schema.prisma`)
- **`Assessment` → `AssessmentPassage` → `AssessmentQuestion`** — a **form-centric** schema: questions belong to a specific `Assessment` (a test form), keyed `@@unique([assessmentId, questionNo])`, with a generic `questionPayload Json`. **No** `reviewStatus`/`itemStatus`/approval/source/license/audit fields, and **no** reusable item-pool identity.
- A content-v3 governed item model already existed (literacy DiagnosticItem) with the pattern our pipeline uses: `itemStatus @default("candidate")`, `reviewStatus @default("PENDING")`, both indexed, with `approvedAt`/`approvedById` siblings — the governance shape to mirror.
- **No** model stored `interactionType` / `responseSpec` / `eligibleContent` / `correctResponse`. The rich PSSA TEI shapes had **no DB home**.
- **No** standards/eligible-content/crosswalk table; `anchor_ec_crosswalk.csv` (241 EC rows) lived only as CSV.

## 2.5 PRIOR ART — `state-track/pssa-schema-v2` already drafted most of Option B
The archived branch **`state-track/pssa-schema-v2`** (commit `f105e35`) already defined a near-complete governed PSSA schema: `PssaPassage`, `PssaItem`, `PssaStandardsCrosswalk` (+ `PssaCrosswalkPaCoreStandard` join), `PssaAuditResult` + `PssaLinterRun`, `PssaReviewLog`, and governance enums — all with source/license/`reviewStatus`/`itemStatus`/`alignmentStatus`/`approvalEligible`/`approvedAt` and indexes. **This de-risked DB-1 (~80% of the governed schema already designed).** But it predates #4j–#4o, so it had gaps:

### Gap analysis — v2 schema vs. the final #4j–#4o contracts (closed in DB-1)
1. **No discriminated TEI response model.** v2 `PssaItem` was MCQ-centric (`answerChoicesJson`/`correctAnswer`/`correctIndex`). **Added** `interactionType`, `interactionSubtype`, `responseSpecJson`, `correctResponseJson` (discriminated union validated in app code at import).
2. **No versioning** — added `responseSpecVersion`, `auditContractVersion`, `sourceScanVersion`, `contentHash`, `importedFromFile`, `importRunId`, `latestAuditResult`, `latestAuditAt`.
3. **No deprecation/supersession** — added queryable `PssaItemSupersession` (`oldItemId`, `newItemId`, `reason`) + `deprecatedReason` on the item.
4. **Single-passage only** — added the real `PssaItemPassageLink` join (`itemId`, `passageId`, `role: primary|secondary|evidence_source`).
5. **No import-run table** — added `PssaImportRun`.
6. **`pointValue`** — added (pool-vs-form accounting, #4o).
**Reconciliation rule:** reuse v2's governance/crosswalk/audit design, but the **#4j–#4o contracts are canonical** — where they disagree, the contracts win.

## 3. The core architectural distinction: ITEM POOL vs. FORM
The PSSA work built a **reusable item pool** (pool-vs-form, #4o: 5 SA pool items, a form draws 2). The existing `Assessment`/`AssessmentQuestion` schema models **forms** (a fixed ordered set for one test), not a pool. **Item bank (pool)** = governed, reusable, reviewable, versioned items. **Form assembly** = selecting/ordering pool items into an `Assessment` per the blueprint. `AssessmentQuestion` is a *form* row, not a *bank* item.

## 4. Schema options
- **Option A — reuse `AssessmentQuestion`.** Form-centric, no governance fields, standards as free-text, would force governance into an un-queryable JSON blob. **Rejected** — defeats the fail-closed guardrails.
- **Option B — new governed `PssaItem`/`PssaPassage`/`PssaStandardsCrosswalk` (+ audit/supersession/import-run/batch) tables (recommended).** Preserves governance + typed per-surface response data; mirrors a proven pattern; gives the crosswalk a real home.
- **Option C — hybrid.** New pool tables + reuse `Assessment`/`AssessmentQuestion` as the *form* layer referencing pool items. "B now, form assembly later."

## 5. Recommendation (ChatGPT Pro: APPROVED — Option B now, Option C long-term)
**Option B — governed `PssaItem`/`PssaPassage`/`PssaStandardsCrosswalk` (+ audit-run + supersession + import-run + batch) tables**, **starting from `state-track/pssa-schema-v2` and reconciling to the #4j–#4o contracts** per §2.5. Mirror the governance pattern. Defer form assembly (Option C, later). Rationale: the value of the authoring loop is governance + typed per-surface response data; `AssessmentQuestion` can hold neither without lossy JSON-stuffing.

### Versioning rule
Stamp each imported item/passage with `responseSpecVersion`, `auditContractVersion`, `sourceScanVersion`, `contentHash`, `importedFromFile`, `importRunId`, `latestAuditResult`, `latestAuditAt`. **Import validity is tied to the current `auditContractVersion`.** If the audit contract changes, previously-imported items become **non-student-ready until revalidated** — *no grandfathering of content*. (The contracts evolved across #4j–#4o — #4k-fix hardened source scanning + added batch position-bias checks; #4n added deprecation rules. Record which gate version certified each item.)

### `contentHash` definition
`contentHash` = hash of **canonicalized item/passage content ONLY**, excluding `importedAt`, `approvedAt`, `approvedById`/`reviewedBy`, `reviewStatus`, `itemStatus`, audit timestamps, `importRunId`, and generated report paths — so harmless metadata changes don't look like content drift.

### 5.1 Locked DB-0 schema decisions (Pro amendments — all implemented in DB-1)
1. **Canonical crosswalk model = `PssaStandardsCrosswalk`** (full EC row) + `PssaCrosswalkPaCoreStandard` join for CC codes; `PssaItem.eligibleContentRefId` FK to it (+ denormalized `eligibleContent` string). (`PssaEligibleContent` name retired.)
2. **`PssaItemPassageLink` is a REAL table** (`role: primary|secondary|evidence_source`, `sortOrder`), not JSON.
3. **`PssaItemBatch` stores batch membership** (`streamType`, `auditContractVersion`, `sourceScanVersion`, `sourceCorpusHash`, `batchAuditResult`) + `PssaItem.batchId` — batch-gate certs (EBSR position distribution, MS/HT/grid/drag shortcut) must survive item moves.
4. **Track `sourceCorpusHash` + `sourceCorpusManifestJson`** on import/audit-run (a scan result depends on the corpus, not just the algorithm).
5. **Tie approval to content hash** — `latestAuditContentHash` + `approvedContentHash` on `PssaItem`; approval invalidated if content changes after approval.
6. **Computed `studentReadyBlockedReason`** enum (`NONE | PENDING_REVIEW | STALE_AUDIT_CONTRACT | STALE_SOURCE_SCAN | CONTENT_HASH_DRIFT | FAILED_LATEST_AUDIT | DEPRECATED_SUPERSEDED`) so the admin UI can explain why an item isn't selectable; **defaults to `PENDING_REVIEW`** (fail-closed).
7. **`PssaItemSupersession` table** (queryable deprecation), plus `deprecatedReason` on the item.
*(Pro's later DB-1 patch also fixed `PssaAuditResult` to use a `targetType`+`targetId` discriminator with a CHECK constraint — nullable columns inside a unique key don't enforce "exactly one target" in Postgres.)*

## 6. The importer (DB-3/DB-4)
A single idempotent `import-pssa-items.ts`:
- reads the audited exemplar JSONs;
- **HARD RULE — never import on the file's `auditMetadata`/flags.** Re-run the full gate stack at import: passage gates; responseSpec/schema; EC skill-match; source scan; preview-leak; item-family gates; deprecation/supersession; **and batch-level shortcut/position gates with tranche context** (batch gates are tranche results — import a stream *as its batch*, not one item in isolation);
- upserts by stable `itemId`/`passageId`; compares `contentHash` (canonical) → re-runs are no-ops, drift flagged not overwritten;
- imports as `reviewStatus=PENDING`/`itemStatus=candidate` (import ≠ approval); stamps versioning + `importRunId`;
- per-run import report; `--dry-run` default, `--write` to commit.

## 7. The crosswalk load (DB-2)
Load `data/pssa/anchor_ec_crosswalk.csv` (241 EC rows, grades 3–8) into `PssaStandardsCrosswalk` (+ the CC-code join) first, so item FK resolution works. Idempotent upsert by EC natural key.

## 8. The approval gate (the real "make it student-facing" switch) — DB-5
Everything imports PENDING/candidate. A deliberate, human, auditable step flips vetted items: `reviewStatus PENDING → APPROVED`, `itemStatus candidate → pilot_ready`, set `approvedAt`/`approvedById`, clear `studentReadyBlockedReason → NONE`.
- The student-ready selector stays **fail-closed**. Selectable ONLY if `reviewStatus=APPROVED` AND `itemStatus=pilot_ready` AND `auditContractVersion=current` AND `sourceScanVersion=current` AND `contentHash = latestAuditContentHash` AND `contentHash = approvedContentHash` (and not deprecated).
- **Explicit negative tests (required):** PENDING/candidate, stale-contract, stale-source-scan, content-hash-drifted, deprecated-superseded, or failed-latest-audit items NEVER appear in `getStudentReadyPssaItems()` — each maps to a `studentReadyBlockedReason`.
- Cadence: per grade, per item-type batch; final human review of reviewer previews before flipping. Do NOT auto-approve the bank.

## 9. Open questions (mostly resolved)
1. ~~Option B~~ — confirmed. 2. `responseSpec`/`correctResponse` typing — Json columns, discriminated union validated in app code (revisit only if we need to query inside response data). 3. Form assembly — out of scope, bank only. 4. **Approval authority + workflow** — who flips PENDING→APPROVED, against what final review, at what granularity (open for DB-5). 5. Environment — dev DB first, full dry-run + rendered-preview smoke test before any shared env. 6. Idempotency key — authored `itemId`s are stable/unique across streams; safe as the upsert key.

## 10. PR sequence (Pro's numbering)
- **DB-0** — merge this decision doc.
- **DB-0.5** — archive reconciliation (vs `state-track/pssa-schema-v2` + `pssa-governance-and-tranche1`); adopt governance/crosswalk/audit design, apply the §2.5 gap list, keep #4j–#4o canonical. *(Done — folded into DB-1.)*
- **DB-1** — schema migration only (governed PSSA tables, joins, batch, supersession, import/audit-run, review log; indexes; CHECK). **DONE + audited + merged (commit `43fe716`).**
- **DB-2** — crosswalk loader → `PssaStandardsCrosswalk`; idempotent; dry-run default, `--write` required.
- **DB-3** — `import-pssa-items.ts` **dry-run**: full re-validation incl. batch gates, no writes.
- **DB-4** — importer **`--write` against a dev DB** (also the first real apply of the DB-1 migration). Acceptance: all content PENDING/candidate; **zero student-ready rows**; re-run no-op if hashes unchanged; drift flagged.
- **DB-5** — approval tooling + fail-closed `getStudentReadyPssaItems()` + the negative tests; rendered-preview smoke test. Do not auto-approve.
- **DB-6 (later)** — form assembly from the pool; NOT mixed with bank import.

Each step gets the authoring-loop treatment: spec → ChatGPT Pro review → Codex → independent audit (here: migration-correctness + idempotency + re-validation-at-import + "no unvetted, unapproved, or stale-contract item is ever selectable").

## 11. The big principle
**Database import is NOT the moment content becomes student-facing.** It is only the moment audited *candidate* content gets a governed home. Student-facing is a separate, deliberate, human, per-batch approval — kept fail-closed and tied to the current audit-contract version.
