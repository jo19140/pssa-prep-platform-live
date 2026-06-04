# PSSA DB-5 — CLI approval tool + fail-closed student-ready selector (+ exhaustive negative tests)

## Scope / boundary (decisions locked by ChatGPT Pro)
DB-5 builds exactly three things and **nothing else**:
1. A **CLI approval tool** (operator-run, like the rest of the pipeline) — per-item approval with a batch-level convenience pass, every decision logged to `PssaReviewLog`.
2. A **fail-closed student-ready selector** as a **pure data-layer function** `getStudentReadyPssaItems(...)` — callable by tests and dev/admin scripts only.
3. **Exhaustive negative tests** + one positive control proving exactly what is and isn't student-ready.

**Explicitly NOT in DB-5:** no web/admin UI, no `/api/...` route, no student dashboard/assignment wiring, no form assembly (DB-6). The UI later becomes a thin wrapper over the proven approval function (DB-5.1). **Approval is the first action in the whole project that can make content student-reachable — keep the surface minimal and auditable.**

## Why this is safe to do now
DB-4 left every item fail-closed: `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, `approvalEligible=false`, `approvedAt=null`, `approvedContentHash=null`, and (already populated) `latestAuditResult=PASS`, `latestAuditContentHash=contentHash`, `auditContractVersion="pssa-db3-import-v1"`, `sourceScanVersion="pssa-source-scan-v1"`. Batches carry `batchAuditResult`, `sourceCorpusHash`, and matching versions. So approval is a status-flip + hash-stamp over already-audited rows — no re-audit needed — and the selector can compute readiness from first principles.

## Reuse the existing constants (do not hardcode strings)
Import `AUDIT_CONTRACT_VERSION` and `SOURCE_SCAN_VERSION` from `scripts/content/lib/pssa-import-plan.ts`. "Current contract/scan" means **equality to these exported constants**. If they ever bump, already-approved items must become non-student-ready at selection time (see selector).

## Real schema fields (use these exact names)
`PssaItem`: reviewStatus(PssaReviewStatus PENDING|APPROVED|REJECTED), itemStatus(PssaItemStatus candidate|pilot_ready|deprecated_superseded|retired), studentReadyBlockedReason(enum NONE|PENDING_REVIEW|STALE_AUDIT_CONTRACT|STALE_SOURCE_SCAN|CONTENT_HASH_DRIFT|FAILED_LATEST_AUDIT|DEPRECATED_SUPERSEDED), approvalEligible, approvedAt, reviewedBy, approvedContentHash, contentHash, latestAuditContentHash, latestAuditResult(PssaAuditResultStatus), auditContractVersion, sourceScanVersion, licenseStatus, needsLegalReview, commercialUseAllowed, batchId, retiredAt, deprecatedReason.
`PssaItemBatch`: batchAuditResult, auditContractVersion, sourceScanVersion, sourceCorpusHash.
`PssaReviewLog`: itemId, passageId, batchId, action, reviewerUserId, notes, editDiffJson, createdAt.
`PssaPassage`: reviewStatus, itemStatus, studentReadyBlockedReason, contentHash, latestAuditContentHash, approvedContentHash(if present; if PssaPassage lacks approvedContentHash, approve passages via reviewStatus/itemStatus/blockedReason only — confirm in schema and report which fields exist).

---

## Part A — Approval CLI (`scripts/content/approve-pssa-items.ts`, npm `content:approve-pssa-items`)

### Command shape + target modes (PATCH 1 — passages are approvable too)
DB-4 imported **passages** as fail-closed candidate content (PENDING/candidate), and the selector requires linked passages to be approved. So the CLI must approve **passages as well as items** — otherwise approving items alone yields zero student-ready (the positive test would fail). Support four `--target` modes:
- `--target passage --passage <passageId>`
- `--target passages --grade 3` (all Grade 3 passages)
- `--target item --item <itemId>`
- `--target batch --batch <batchId>` (batch convenience over items)
```
# correct operator order: approve passages FIRST, then item batches
npm run content:approve-pssa-items -- --env dev --target passages --grade 3 --reviewer "jonathan" --reason "G3 passages" --dry-run
npm run content:approve-pssa-items -- --env dev --target passages --grade 3 --reviewer "jonathan" --reason "G3 passages" --write
npm run content:approve-pssa-items -- --env dev --target batch --batch ebsr_grade3 --reviewer "jonathan" --reason "G3 EBSR stream" --dry-run
npm run content:approve-pssa-items -- --env dev --target batch --batch ebsr_grade3 --reviewer "jonathan" --reason "G3 EBSR stream" --write
```
Flags: `--env dev` (required for `--write`; refuse production-like NODE_ENV/APP_ENV unless `--allow-production`, out of scope), `--target passage|passages|item|batch`, plus the matching `--passage`/`--grade`/`--item`/`--batch`, `--reviewer <id>` (required), `--reason <text>` (required), `--action approve|reject|revoke` (default approve), `--attest-license-cleared` (see license section), `--dry-run` (default) / `--write`. Never echo raw `DATABASE_URL`.

### Passage approval predicate (same fail-closed shape as items)
A passage is eligible to approve only if: `reviewStatus=PENDING`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, `latestAuditResult=PASS`, `auditContractVersion=AUDIT_CONTRACT_VERSION`, `sourceScanVersion=SOURCE_SCAN_VERSION`, `contentHash=latestAuditContentHash`, `approvedContentHash IS NULL` (unless already-approved no-op), not retired/deprecated, license gate passes. **Passage approval mutation:** `reviewStatus=APPROVED`, `itemStatus=pilot_ready`, `approvedAt=now()`, `reviewedBy=<reviewer>`, `approvedContentHash=contentHash` (PssaPassage has this field), `studentReadyBlockedReason=NONE`; write a `PssaReviewLog` row with `passageId`.

### Approval is PER ITEM (batch is just a bulk loop over items)
`--batch` approves **every eligible item in that batch**, but internally approves each item one-by-one and writes **one `PssaReviewLog` row per item**. Batch approval is **not** a shortcut around per-item checks.

### Classify-then-act (PATCH 2 — idempotency vs all-or-nothing)
Before applying the all-or-nothing rule, **classify each selected row** into one of three buckets (this resolves the conflict between "refuse if any item isn't PENDING" and "re-running is a no-op"):
1. **eligible_to_approve** — PENDING/candidate/PENDING_REVIEW, `approvedContentHash IS NULL`, and every approval predicate below passes.
2. **already_approved_noop** — must satisfy the SAME full readiness predicate as `getStudentReadyPssaItems` for that target (PATCH 6 — the no-op bucket must not be looser than the selector, or the CLI would report a "clean no-op" on a row the selector still blocks). It may run inside the CLI rather than through the selector query, but the conditions are identical:
   - **Items:** `reviewStatus=APPROVED`, `itemStatus=pilot_ready`, `approvalEligible=true`, `studentReadyBlockedReason=NONE`, `approvedContentHash=contentHash=latestAuditContentHash`, `auditContractVersion=AUDIT_CONTRACT_VERSION`, `sourceScanVersion=SOURCE_SCAN_VERSION`, `latestAuditResult=PASS`, `licenseStatus=cleared`, `needsLegalReview=false`, `commercialUseAllowed=true`, not `deprecated_superseded`, not `retired`, `retiredAt IS NULL`, linked passages ready (if passage-linked), batch ready (if batch-gated).
   - **Passages:** `reviewStatus=APPROVED`, `itemStatus=pilot_ready`, `studentReadyBlockedReason=NONE`, `approvedContentHash=contentHash=latestAuditContentHash`, `auditContractVersion=AUDIT_CONTRACT_VERSION`, `sourceScanVersion=SOURCE_SCAN_VERSION`, `latestAuditResult=PASS`, `licenseStatus=cleared`, `needsLegalReview=false`, `commercialUseAllowed=true`.
3. **refused** — anything else, INCLUDING a row that is APPROVED/pilot_ready but fails any no-op readiness check above (e.g. `approvalEligible=false`, unresolved license, stale version, hash drift, unready passage/batch). **Never silently skip a row that looks approved but is not actually student-ready** — classify it `refused`.

Dry-run reports all three buckets. **Write behavior:** if ANY selected row is `refused`, abort the whole run with zero writes; otherwise approve the `eligible_to_approve` rows and **skip** `already_approved_noop` rows (do not restamp `approvedAt`, do not duplicate `PssaReviewLog`). If every selected row is `already_approved_noop`, exit 0 and report a clean no-op.

### Pre-approval predicate (defines `eligible_to_approve`) — for each selected item ALL must hold:
- `reviewStatus = PENDING`, `itemStatus = candidate`, `studentReadyBlockedReason = PENDING_REVIEW`
- `latestAuditResult = PASS`
- `auditContractVersion = AUDIT_CONTRACT_VERSION` and `sourceScanVersion = SOURCE_SCAN_VERSION` (current)
- `contentHash = latestAuditContentHash` (no drift since audit)
- `approvedContentHash IS NULL` (not already approved)
- not `deprecated_superseded`, not `retired`, `retiredAt IS NULL`
- `eligibleContentRefId IS NOT NULL` when `eligibleContent` is set (EC resolved)
- **License/legal gate (PATCH 3 — precise):** refuse if `licenseStatus ≠ cleared` or `needsLegalReview = true` or `commercialUseAllowed = false`, UNLESS the reviewer passes `--attest-license-cleared`. `--attest-license-cleared` is allowed **only for `sourceType = internal_original`** (first-party content); it is **forbidden** for `released_sampler` and `unknown` (those need real legal clearance, out of scope). When attested on internal_original, set `licenseStatus = cleared`, `needsLegalReview = false`, `commercialUseAllowed = true`, and write a `PssaReviewLog` note capturing: reviewer id, timestamp, attestation text, affected itemId/passageId, and BOTH the prior and new `(licenseStatus, needsLegalReview, commercialUseAllowed)`. Never leave an item half-cleared. Report each item's license triple in the dry-run table. (Real enums: `PssaLicenseStatus = cleared|unresolved|restricted`; `PssaSourceType = internal_original|released_sampler|unknown`.)

### Batch-level precondition (when `--batch` is used)
The batch row itself must be current and clean: `batchAuditResult = PASS`, `auditContractVersion = AUDIT_CONTRACT_VERSION`, `sourceScanVersion = SOURCE_SCAN_VERSION`. **Corpus-hash equality (PATCH 2 — recompute, don't just check presence):** the CLI must recompute the current `sourceCorpusHash` using the shared import-plan logic (`stableStringify` of the sorted passage+item `contentHash` set) and compare it to the stored `PssaItemBatch.sourceCorpusHash`. **Refuse the batch approval if** `sourceCorpusHash` is missing OR the recomputed value differs from the stored one. (This preserves the tranche-level certifications — EBSR position distribution, MS/HT/grid/drag/conventions shortcut gates — that per-item checks alone can't see; source compliance depends on the corpus scanned, not just the scan algorithm.)

### Approval mutation (in a transaction, per item)
Set: `reviewStatus = APPROVED`, `itemStatus = pilot_ready`, `approvalEligible = true`, `approvedAt = now()`, `reviewedBy = <reviewer>`, `approvedContentHash = contentHash`, `studentReadyBlockedReason = NONE`. Write a `PssaReviewLog` row per item: `action="APPROVED"`, `reviewerUserId=<reviewer>`, `notes=<reason>`, `itemId`, `batchId`. (Optionally a batch-level summary log row with `batchId` only.)

### Reject + revoke (PATCH 4 — explicit mutations, governance symmetry)
Approval must not be a one-way trap. Both fail-closed and logged; rejected/revoked rows must NEVER appear in `getStudentReadyPssaItems()`.
- `--action reject`: `reviewStatus=REJECTED`, `itemStatus=candidate`, `studentReadyBlockedReason=PENDING_REVIEW`, `approvalEligible=false`, `approvedAt=null`, `approvedContentHash=null`, `reviewedBy=<reviewer>`; `PssaReviewLog` `action="REJECTED"`. (PENDING_REVIEW is imperfect semantically for "rejected," but the enum has no REJECTED value — do NOT add an enum/migration just for this; the review-log records the true REJECTED action.)
- `--action revoke`: an already-APPROVED row back to `reviewStatus=PENDING`, `itemStatus=candidate`, clears `approvedAt`/`approvedContentHash`/`reviewedBy`, `approvalEligible=false`, `studentReadyBlockedReason=PENDING_REVIEW`; `PssaReviewLog` `action="REVOKED"`. Revoking a **passage** must drop its linked items from the student-ready set (verified by a test).

### Idempotency
Implemented via the classify-then-act buckets above: `already_approved_noop` rows are skipped (no re-stamp, no duplicate log). A second identical run changes nothing and exits 0.

### Reports
`reports/pssa_db5_approval_dryrun.csv` (per item: itemId, batchId, each predicate check pass/fail, licenseStatus, would-approve), `reports/pssa_db5_approval_write_summary.md` (reviewer, batch, counts approved/skipped/refused, per-item review-log ids).

---

## Part B — Fail-closed selector (pure function, e.g. `scripts/content/lib/pssa-student-ready-selector.ts`)

Provide a shared pure predicate and a query:
- `computeStudentReadyBlockedReason(item, batch, passages, { auditContractVersion, sourceScanVersion })` → returns `NONE` only if the item passes EVERY check below, else the **first** applicable blocking enum. Used by the selector (authoritative) and available to refresh the stored field.
- `getStudentReadyPssaItems(db, filter)` → returns ONLY items whose computed reason is `NONE`. **Compute readiness live — never trust the stored `studentReadyBlockedReason=NONE` alone**, so a post-approval version bump or hash drift is caught at selection time.

### An item is student-ready ONLY if ALL hold
- `reviewStatus = APPROVED` AND `itemStatus = pilot_ready` AND `approvalEligible = true` (PATCH 1 — DB-4 imported everything `approvalEligible=false`; DB-5 is the only step that flips it, so the selector must require it)
- `studentReadyBlockedReason` (recomputed) = `NONE`
- `approvedContentHash IS NOT NULL` AND `contentHash = approvedContentHash` AND `contentHash = latestAuditContentHash`
- `auditContractVersion = AUDIT_CONTRACT_VERSION` AND `sourceScanVersion = SOURCE_SCAN_VERSION`
- `latestAuditResult = PASS`
- **License clearance (PATCH 3):** `licenseStatus = cleared` AND `needsLegalReview = false` AND `commercialUseAllowed = true`. (If not cleared, the computed blocked reason is `PENDING_REVIEW` — the enum has no legal-specific value — but the selector report must show the legal reason.)
- NOT `deprecated_superseded`, NOT `retired`, `retiredAt IS NULL`
- **Passage readiness (for passage-linked items):** every linked passage is `reviewStatus=APPROVED`/`itemStatus=pilot_ready`, hash-current (`contentHash = latestAuditContentHash = approvedContentHash`), license-cleared, not stale/deprecated.
- **Batch readiness (PATCH 5 — for batch-gated streams EBSR/MS/HT/MG/DD/conventions):** the item's batch has `batchAuditResult = PASS`, `auditContractVersion = AUDIT_CONTRACT_VERSION`, `sourceScanVersion = SOURCE_SCAN_VERSION`, and `sourceCorpusHash IS NOT NULL` (present). Note: `sourceCorpusHash` is recomputed from the corpus at write time (not an exported constant), so the **selector requires it present** (hot path); **exact corpus-hash equality is verified at APPROVAL time** instead — the approval CLI recomputes the current corpus hash via the shared import plan (`stableStringify` of sorted passage+item hashes) and refuses the batch if the stored `sourceCorpusHash` differs. (Full equality-at-selection deferred to DB-5.1.)

Mapping of failures → enum: pending/candidate→`PENDING_REVIEW`; stale contract→`STALE_AUDIT_CONTRACT`; stale scan→`STALE_SOURCE_SCAN`; hash mismatch (any of the three)→`CONTENT_HASH_DRIFT`; `latestAuditResult≠PASS`→`FAILED_LATEST_AUDIT`; deprecated/retired→`DEPRECATED_SUPERSEDED`.

---

## Part C — Tests (the heart of DB-5)

### Negative tests — each of these must return ZERO from `getStudentReadyPssaItems` / compute to a blocking reason:
PENDING/candidate; APPROVED but not pilot_ready; pilot_ready but reviewStatus≠APPROVED; APPROVED+pilot_ready+hashes-current but `approvalEligible=false`; batch PASS/current versions but recomputed `sourceCorpusHash` differs from stored (approval refused, 0 writes); `studentReadyBlockedReason≠NONE`; stale `auditContractVersion`; stale `sourceScanVersion`; `contentHash≠latestAuditContentHash`; `contentHash≠approvedContentHash`; `approvedContentHash` null; `latestAuditResult=FAIL` (and WARN if used); `deprecated_superseded`; `retired`/`retiredAt` set; REJECTED item; passage not approved; passage hash stale; passage not license-cleared; batch `batchAuditResult≠PASS`; batch version stale; batch `sourceCorpusHash` null; license not cleared (`licenseStatus≠cleared` OR `needsLegalReview=true` OR `commercialUseAllowed=false`).

### Positive control (exactly one path returns the item):
A fully-approved, hash-current (contentHash=approvedContentHash=latestAuditContentHash), audit-current, passage-ready, batch-ready item **is** returned.

### CLI tests:
- Dry-run over the seeded Grade 3 batches prints correct three-bucket classification (eligible/already_approved_noop/refused) and writes 0 rows.
- **Item-approved-but-passage-not:** approve the EBSR items WITHOUT approving their passages → selector returns 0 (proves passage readiness is enforced).
- Approve passages then the EBSR batch → selector returns exactly the 5 EBSR items; everything else blocked.
- Re-run `--write` → all `already_approved_noop`, no restamp, no duplicate review-log rows, exit 0.
- A batch with one synthetic non-eligible (`refused`) item → whole run refused, 0 writes.
- `--action revoke` on an item returns it to PENDING and it leaves the student-ready set; `--action revoke` on a passage drops its linked items from the set.
- `--attest-license-cleared` on a `released_sampler`/`unknown` item → refused (attestation only valid for internal_original).
- **No-op bucket strictness:** an APPROVED/pilot_ready item with `approvalEligible=false` → classified `refused`, NOT `already_approved_noop`.
- **No-op bucket strictness:** an APPROVED/pilot_ready item with unresolved license → classified `refused`, NOT `already_approved_noop`.

`tsc --noEmit` + `build` green.

## Operator verification (dev Docker Postgres, after merge)
```
# 0. BEFORE anything: getStudentReadyPssaItems(grade 3) must return 0.
# 1. Approve the 5 Grade 3 passages first (selector requires approved passages).
npm run content:approve-pssa-items -- --env dev --target passages --grade 3 --reviewer "jonathan" --reason "G3 passages" --attest-license-cleared --dry-run
npm run content:approve-pssa-items -- --env dev --target passages --grade 3 --reviewer "jonathan" --reason "G3 passages" --attest-license-cleared --write
# 1b. After passages approved but NO items approved: selector STILL returns 0.
# 2. Approve one item stream.
npm run content:approve-pssa-items -- --env dev --target batch --batch ebsr_grade3 --reviewer "jonathan" --reason "G3 EBSR" --attest-license-cleared --dry-run
npm run content:approve-pssa-items -- --env dev --target batch --batch ebsr_grade3 --reviewer "jonathan" --reason "G3 EBSR" --attest-license-cleared --write
```
Live psql assertions: passages 5 APPROVED/pilot_ready/NONE; the 5 EBSR items APPROVED/pilot_ready/NONE with `approvedContentHash=contentHash`; **`getStudentReadyPssaItems(grade 3)` returns exactly those 5** (0 before any approval, 0 after passages-only); other 62 active items still blocked; `PssaReviewLog` has rows for the 5 passages + 5 items. Then `--action revoke` one EBSR passage → those EBSR items drop back out of the student-ready set.

## Acceptance
CLI approves **passages and items** per-row (batch = bulk loop) only when every locked predicate holds; classify-then-act (eligible/already_approved_noop/refused) makes re-runs a true no-op while keeping all-or-nothing on any `refused`; every decision logged to `PssaReviewLog`; license attestation precise (internal_original only, full before/after logged); reject/revoke present, explicit, and fail-closed; selector is a pure function computing readiness **live** (not trusting stored NONE) and returns only fully-ready items with passage + batch + license readiness enforced; **approving items without their passages yields zero student-ready**; every negative test returns zero and the single positive control returns the item; no UI, no API route, no form assembly; `tsc`+`build` green.

## Stop — report (for Claude's independent audit)
The CLI file + npm script; the approval predicate + mutation; license/legal handling decision; the selector function + the exact readiness predicate; the full negative-test list with results + the positive control; idempotency + revoke behavior; dry-run/write reports; `tsc`/`build` results. Do **not** build the web UI (DB-5.1), an API route, or form assembly (DB-6). Do not approve anything in production.
