# PSSA Item Bank → Database: Import Design (Decision Doc)

**Status:** design / decision needed — NOT a Codex spec yet. This is the architecture call to make (with ChatGPT Pro) *before* any migration or importer code is written. Once the schema fork is decided, each step below becomes its own audited PR like the #4j–#4o authoring loop.

## 1. Where we are
The Grade 3 PSSA item bank is complete across all item types (reading MCQ, EBSR, multiple-select, hot-text, matching-grid, drag-drop, inline-dropdown/conventions, Short Answer) and fully audited. **All of it is file-based**: the content lives in `exemplars/pssa_grade3_*/**.json`, every backend flagged `noDbWrite: true`, `productionImportReady: false`, `writesDatabaseRows: false`. Every item is `reviewStatus = PENDING` / `itemStatus = candidate`. **Nothing is in a database; nothing is student-facing.** That is the intended safe state.

To become usable in the product, the items need a governed home in Postgres (via Prisma), an import path, the eligible-content crosswalk loaded, and a deliberate approval step.

## 2. What the database actually has today (grounded in `prisma/schema.prisma`)
- **`Assessment` → `AssessmentPassage` → `AssessmentQuestion`** (migration `20260501153500`). This is a **form-centric** schema: questions belong to a specific `Assessment` (a test form), keyed `@@unique([assessmentId, questionNo])`. `AssessmentQuestion` has `standardCode`, `standardLabel`, `questionType`, `skill`, `difficulty`, and a generic **`questionPayload Json`**. It has **no** `reviewStatus`/`itemStatus`/approval/source/license/audit fields, and **no** concept of a reusable item *pool*.
- **A content-v3 governed item model already exists** (the literacy DiagnosticItem, ~line 821) with exactly the pattern our PSSA pipeline uses: `itemStatus @default("candidate")`, `reviewStatus @default("PENDING")`, both **indexed**, plus `approvedAt`/`approvedById` on sibling models. This is the proven governance shape to mirror.
- **No model stores `interactionType`, `responseSpec`, `eligibleContent`, or `correctResponse`.** The rich PSSA TEI shapes (correctCells, correctSpanIds, quotedSpan, blanks, correctAssignments, rubric, scoreBandExamples, copiedTextCap, etc.) have **no DB home anywhere today**.
- **No standards / eligible-content / crosswalk table.** `anchor_ec_crosswalk.csv` (241 EC rows) lives only as a CSV; `AssessmentQuestion.standardCode` is a free String.

## 3. The core architectural distinction: ITEM POOL vs. FORM
The PSSA work deliberately built a **reusable item pool** (the "pool vs. live form" accounting in #4o: 5 Short-Answer pool items, of which a form draws 2). The existing `Assessment`/`AssessmentQuestion` schema models **forms** (a fixed ordered set of questions for one test), not a pool. These are different layers:
- **Item bank (pool):** governed, reusable, versioned, reviewable items — the thing we built.
- **Form assembly:** selecting/ordering pool items into an `Assessment` that respects the blueprint (e.g., Grade 3 = 19–23 passage 1-pt + 9 conventions + 3–4 EBSR/TE + 2 SA).

Conflating them is the main risk. `AssessmentQuestion` is a *form* row, not a *bank* item.

## 4. Schema options

### Option A — Reuse `AssessmentQuestion` (store PSSA items there)
Map each item to an `AssessmentQuestion` row, packing the TEI response data into `questionPayload Json`.
- **Pro:** no new tables.
- **Con (decisive):** it's form-centric, not a pool — every item would have to belong to a synthetic `Assessment`. It has **no governance fields**, so the fail-closed `reviewStatus/itemStatus` gating the whole pipeline would have to be faked inside the JSON blob (un-indexable, un-queryable, easy to leak). Standards stay free-text. This throws away the governance the pipeline is built on. **Not recommended.**

### Option B — New governed PSSA item-bank tables (recommended)
Add `PssaPassage` and `PssaItem` (+ `PssaEligibleContent`) as a **governed item pool**, mirroring the existing content-v3 governance pattern:
- `PssaItem`: stable `itemId` (the authored ID, unique), `gradeLevel`, `passageId?`, `eligibleContent` (FK → `PssaEligibleContent`), `interactionType`, `interactionSubtype?`, `itemType`, `pointValue`, **typed-but-Json `responseSpec` + `correctResponse`** (the per-surface shapes), `scoringJson`, `previewJson`, `sourceType`/`licenseStatus`, `auditMetadataJson`, and governance: `itemStatus @default("candidate")`, `reviewStatus @default("PENDING")`, `approvedAt?`, `approvedById?`, `supersededByItemIds?`, `deprecatedReason?`, both status fields **indexed**. `contentHash` for idempotent re-import + drift detection.
- `PssaPassage`: stable `passageId`, gradeLevel, title, text, structureType, passage-gate results, governance fields.
- `PssaEligibleContent`: the crosswalk — `eligibleContent` (PK), anchor/descriptor/reportingCategory/dokCeiling/paCoreStandardCodes (the 19 columns of `anchor_ec_crosswalk.csv`).
- **Form assembly stays separate / deferred:** a later layer can reference `PssaItem` from `Assessment`/`AssessmentQuestion` (or a new `PssaForm`) to build blueprint-balanced forms. #B does NOT build forms — it builds the governed bank.
- **Pro:** preserves every governance property the pipeline depends on; queryable/indexable status; clean idempotent import; crosswalk gets a real home; mirrors a pattern already in the schema. **Con:** new tables + migration.

### Option C — Hybrid
New `PssaItem`/`PssaPassage` pool tables (as in B) **and** reuse `Assessment`/`AssessmentQuestion` as the *form* layer that references pool items. This is essentially "B now, form-assembly later using the existing form tables." Likely where we end up; the decision for *this* step is just B (build the bank); the form layer is a separate later decision.

## 5. Recommendation
**Option B — new governed `PssaItem` / `PssaPassage` / `PssaEligibleContent` tables**, mirroring the existing content-v3 governance pattern (`itemStatus`/`reviewStatus` indexed, `approvedAt`/`approvedById`). Defer form assembly to a later step. Rationale: the whole value of the authoring loop is the governance and the typed per-surface response data; `AssessmentQuestion` can hold neither without lossy, un-queryable JSON-stuffing. Build the bank as a first-class governed pool; assemble forms later from it.

## 6. The importer (after the migration)
A single idempotent script `import-pssa-items.ts`:
- reads the audited exemplar JSONs (passages + every item stream);
- **re-runs the gate stack at import** (never import unvetted content — the gates are the contract, not the file flags);
- upserts by stable `itemId`/`passageId`; computes/compares `contentHash` so re-runs are no-ops and drift is flagged;
- imports as `reviewStatus=PENDING` / `itemStatus=candidate` (import ≠ approval);
- only operates on content whose audit is green; writes a per-run import report (added/updated/skipped/failed, with reasons);
- `--dry-run` default, `--write` to commit (the discipline that's been file-only so far carries into the DB).

## 7. The crosswalk load
Load `data/pssa/anchor_ec_crosswalk.csv` (241 EC rows, grades 3–8) into `PssaEligibleContent` first (items FK to it). Idempotent upsert by `eligibleContent`. This is the one piece that is genuinely "load a CSV into a table," and it should run before item import so FK resolution works.

## 8. The approval gate (the real "make it student-facing" switch)
Everything imports as PENDING/candidate. A deliberate, human, auditable step flips vetted items forward:
- `reviewStatus PENDING → APPROVED`, `itemStatus candidate → pilot_ready`, set `approvedAt`/`approvedById`.
- The student-ready selector stays **fail-closed** (returns only APPROVED/pilot_ready), so nothing leaks before the flip.
- Recommended cadence: **per grade, per item-type batch** (the same one-batch-at-a-time discipline as authoring), with a final human review of the reviewer previews before flipping.

## 9. Open questions for Jonathan + ChatGPT Pro
1. **Confirm Option B** (new governed bank tables) over reusing `AssessmentQuestion`.
2. **`responseSpec`/`correctResponse` typing:** Json columns (flexible, fast) vs. per-type normalized tables (queryable, heavier). Recommend Json now, with the discriminated union validated in app code at import — revisit only if you need to query inside response data.
3. **Form assembly:** out of scope for this step — confirm we're building the bank only, forms later.
4. **Approval authority + workflow:** who flips PENDING→APPROVED, against what final review, and at what granularity (item / batch / grade)?
5. **Environment:** import to a dev DB first for a full dry-run + a rendered-preview smoke test before any shared environment.
6. **Idempotency key:** confirm the authored `itemId`s are stable and unique across all streams (they look it — `pssa_<type>_g3_<passage>_NN`), so they're safe as the upsert key.

## 10. Suggested PR sequence (once Option B is confirmed)
1. **DB-1** — migration: `PssaEligibleContent`, `PssaPassage`, `PssaItem` (governed fields, indexes, `contentHash`). Mirror the content-v3 governance pattern.
2. **DB-2** — crosswalk loader (`PssaEligibleContent`), idempotent, dry-run/`--write`.
3. **DB-3** — `import-pssa-items.ts` (re-validate at import, upsert, hash, dry-run default), import the Grade 3 bank into dev.
4. **DB-4** — approval tooling + the fail-closed `getStudentReadyPssaItems()` query against the new tables; a rendered-preview smoke test.
5. **DB-5 (later)** — form assembly from the pool (blueprint-balanced), if/when needed.

Each step gets the same treatment as the authoring PRs: a tight spec, ChatGPT Pro review, Codex implementation, and an independent audit (here the audit is migration-correctness + idempotency + "no unvetted/unapproved item is ever selectable").
