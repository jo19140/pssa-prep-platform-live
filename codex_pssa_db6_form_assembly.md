# PSSA DB-6 — blueprint-valid form assembly from the approved pool (fail-closed, deterministic, no student-facing surface)

## Scope / boundary (locked)
DB-6 builds exactly three things and **nothing else**:
1. An **additive schema migration** for governed form tables: `PssaForm`, `PssaFormPassage`, `PssaFormItem`.
2. An **assembler CLI** (`scripts/content/assemble-pssa-form.ts`, npm `content:assemble-pssa-form`) that selects student-ready pool items into a blueprint-valid Grade 3 form. Dry-run default, `--write` explicit.
3. **Tests** (`scripts/test-pssa-db6-form-assembly.ts`, npm `test:pssa-db6`): negative tests + one positive control + determinism proof.

**Explicitly NOT in DB-6:** no student-facing route/render, no wiring to `Assessment`/`AssessmentQuestion`/`TestSession`/assignments, no TEI player, no approval/reject/revoke changes, no review-UI changes, no embedded field-test slot, no grades 4–8, no form *delivery* of any kind. A form row existing in the DB must not make any item reachable by a student — there is still no student surface, and the DB-5 selector remains the only gate. Form↔test-session integration is PR B/C/D territory (see `STATE_TRACK_ROADMAP.md`); these tables must not fork the test-session model — they reference the POOL only.

## Why now / posture
The Grade 3 bank is live and governed (DB-4), approval + fail-closed selector are proven (DB-5/DB-5.1). DB-6 is the pool→form layer the DB-0 doc deferred ("form assembly from the pool; NOT mixed with bank import"). Same discipline as every DB PR: reuse proven logic, never reimplement a predicate, fail closed on anything surprising.

## Reuse existing code (do NOT invent or fork)
- **Student-readiness:** `getStudentReadyPssaItems` / `computeStudentReadyBlockedReason` from `scripts/content/lib/pssa-student-ready-selector.ts`, **unchanged**. The assembler may ONLY draw from items this selector returns, recomputed LIVE at assembly time. Never trust stored `studentReadyBlockedReason`.
- **Constants:** `AUDIT_CONTRACT_VERSION`, `SOURCE_SCAN_VERSION`, `stableStringify` from `scripts/content/lib/pssa-import-plan.ts`.
- **CLI conventions:** mirror `approve-pssa-items.ts` — `--env dev` + `--allow-production` guard, dry-run default, `--write` explicit, classify-then-act, all-or-nothing on any refusal, every decision in the run report.
- **Hashing (PATCH 1 — exact canonical structure, locked by Pro):** the hash input MUST be this canonical object, serialized with `stableStringify`:

```
{
  blueprintVersion,
  gradeLevel,
  module,
  subject,
  totalPoints,
  categoryPoints: { A, B, D },
  passages: [
    { position, passageId, approvedPassageContentHashSnapshot }
  ],
  items: [
    {
      position,
      itemId,
      slotType,
      pointValue,
      passageId: string | null,     // = passageIdSnapshot (primary passage at assembly; null for standalone conventions)
      approvedContentHashSnapshot
    }
  ]
}
```

  Excluded from the hash: `id`, `seed`, timestamps, `assembledAt`, `assembledBy`, `assemblyRunId`, `formStatus`, `invalidatedReason`, `createdAt`, `updatedAt`. Reordering items, reordering passages, changing item-to-passage grouping, changing `slotType`, changing `pointValue`, changing any item `approvedContentHashSnapshot`, or changing any passage `approvedPassageContentHashSnapshot` MUST change `contentHash`.

## Schema (additive migration ONLY — zero ALTER/DROP on existing tables)
```
PssaForm {
  id, module(TestPrepModule=PSSA), subject("ELA"), gradeLevel(Int),
  blueprintVersion(String)            // e.g. "pde-ela-test-design-2025-g3-v1"
  seed(String)                        // determinism input
  formStatus enum PssaFormStatus { draft | assembled | invalidated }   // fail-closed: nothing implies deliverable
  totalPoints(Int), categoryPointsJson(Json),   // {A,B,D} as assembled
  contentHash(String) @unique,        // see hashing rule above; @@unique makes create-or-no-op race-safe
  auditContractVersion, sourceScanVersion,      // stamped at assembly
  assembledAt, assembledBy(String), assemblyRunId,
  invalidatedReason(String?),         // set when staleness detected
  createdAt, updatedAt
}
PssaFormPassage {
  id, formId FK, passageId FK→PssaPassage, position(Int),
  approvedPassageContentHashSnapshot(String),   // PssaPassage.approvedContentHash at assembly time
  @@unique([formId, position]), @@unique([formId, passageId])
}
PssaFormItem {
  id, formId FK, itemId FK→PssaItem, position(Int),
  pointValue(Int),                    // snapshot at assembly
  slotType enum PssaFormSlotType { reading_1pt | conventions_1pt | multipoint | short_answer },
  approvedContentHashSnapshot(String),// the approvedContentHash at assembly time
  passageIdSnapshot(String?),         // the item's primary passageId at assembly time; null for standalone conventions
  @@unique([formId, position]), @@unique([formId, itemId])
}
```
Follow DB-1 conventions exactly: cuid ids, fail-closed defaults (`formStatus=draft`), indexes on (gradeLevel, formStatus) and FKs, relations declared both sides, enums in schema. If a CHECK constraint is needed, put it in the migration SQL and note it (Prisma can't represent CHECK — same caveat as DB-1).

## Blueprint (Grade 3, authoritative — from `reference/pssa-test-design/pssa_ela_test_design_2025.pdf`, tabulated in `reference/pssa-item-catalog/MASTER_item_type_catalog.md`)
Encode as a typed constant `GRADE3_BLUEPRINT` (do not hardcode inline):
- Total core points: **45**
- Passage-based reading 1-pt items (MC or TE, interchangeable): **19–23**
- Standalone conventions 1-pt items (category D): **exactly 9**
- Multipoint EBSR/TE: **3–4 items, ≥1 two-point AND ≥1 three-point**
- Short Answer: **exactly 2 × 3 pts** (Grade 3 only)
- Passages: **exactly 4** (embedded FT slot out of scope v1)
- Category points: **A(Lit) 15–21 · B(Info) 15–21 · D(Conventions) exactly 9** (A + B must = 36 given total 45 − 9 D)
- TDA: 0 at Grade 3.

## Assembler requirements
### Hard gates (ALL must hold or the run is refused — no partial forms, no relaxation flags)
1. Every selected item is in the LIVE `getStudentReadyPssaItems(grade 3)` result at assembly time.
2. Every passage-based item's passage is one of the form's 4 passages, and that passage itself passes the live readiness predicate (DB-5 recursion already enforces this per item — assert it anyway at the form level).
3. All blueprint counts/ranges above, including category points. Compute category from `eligibleContent` prefix (E03.**A**/**B**/**D**) cross-checked against `reportingCategory` where set; mismatch = refuse the run with the offending itemId named. The assembler must NEVER infer, repair, or pick a winner between the two fields (PATCH 2 — likely bug hotspot; see required negative test).
4. No duplicate items; no item from `deprecated_superseded`/`retired` (structurally impossible via selector — assert anyway).
5. **Form-level surface-shortcut gates** (inherit the #4j §4a lesson at the form layer): across the assembled form's MCQ/EBSR-PartA slots, no answer position holds >40% of correct answers; multipoint correct-pattern variety rules as in the batch gates. The form is a new "batch" a student sees — it must not reintroduce a position shortcut that per-tranche gates already killed.
6. EC variety: no eligibleContent code appears more than twice among 1-pt reading items (prevents one skill dominating a form).
7. Ordering: passages grouped (passage block = its reading 1-pt items then its multipoint items), conventions as a standalone block, the 2 Short Answers last. Deterministic within blocks (by seed), positions written to `PssaFormItem.position`.

### Determinism + idempotency (PATCH 3 — explicit two-command behavior contract)
- `--seed <string>` required. Same seed + same pool state ⇒ byte-identical selection, ordering, and `contentHash`. Prove in tests.
- The CLI has exactly TWO mutation-relevant behaviors; do not blend them:
  - **`assemble --write`** = create-or-no-op by `contentHash`: if a form with the computed `contentHash` already exists with `formStatus=assembled` ⇒ no-op (no new rows, no updates to the existing form, exit 0, report "noop"); otherwise insert a NEW form row. It NEVER mutates, re-points, invalidates, or deletes any existing `assembled` form — not even one produced by the same seed against an older pool state (that older form is `--verify`'s job to invalidate). **Invalidated-collision rule:** if the only hash match is an `invalidated` form, REFUSE — do not resurrect it, do not auto-flip it back to `assembled`, do not insert a duplicate-hash row (the `@unique` forbids it anyway). Identical content reappearing after an invalidation means drift occurred and reverted; that needs a human decision, not silent recovery.
  - **`--verify <formId>`** = staleness check ONLY: recompute every member item's live readiness + compare each item `approvedContentHashSnapshot` to the item's current `approvedContentHash` + compare each `passageIdSnapshot` to the item's current primary passage link + compare each `approvedPassageContentHashSnapshot` to the passage's current `approvedContentHash`; ANY mismatch ⇒ set `formStatus=invalidated` + `invalidatedReason` (with a report). Verify never assembles, repairs, or re-points — invalidate-and-report is its only write.
- Changed pool or changed seed under `assemble --write` ⇒ NEW form row **only if the resulting canonical form content produces a new `contentHash`**; if a different seed converges to byte-identical selected content and ordering, `assemble --write` no-ops by `contentHash`. (`contentHash` is pure content identity; `seed` is provenance, recorded on the form row but excluded from the hash.) The prior form, when one exists, stands until verified stale.

### Refusal + deficit report (expected on today's dev DB)
If the student-ready pool cannot satisfy the blueprint, the CLI **refuses** and emits `reports/pssa_db6_deficit_report.csv`: per blueprint slot, required vs available counts, and the per-item `studentReadyBlockedReason` for near-miss items (PENDING items that would qualify once approved). **This is the expected first result** — the dev DB currently has only a handful of verification approvals. The deficit report doubles as Jonathan's review worklist in `/admin/pssa-review`.

### Known feasibility constraint (encode, don't discover)
Category-A supply is structurally tight: the pool has ONE literary passage (`pssa_psg_g3_the_mural_plan`, ~18 of the pool's 29 A points); the other four passages are informational. Therefore any valid form MUST include the mural passage and concentrate multipoint slots on it. The assembler must (a) surface this in the run report (per-passage category-point table), and (b) refuse with the standard deficit report if A 15–21 is unreachable — do NOT special-case or hardcode the mural passage id. A literary top-up authoring tranche (#4p) is the durable fix and is out of scope here.

## CLI
```
npm run content:assemble-pssa-form -- --env dev --grade 3 --seed g3-form-001 --blueprint pde-ela-test-design-2025-g3-v1 [--dry-run|--write] [--verify <formId>]
```
Dry-run prints the full selection table (itemId, slotType, position, pointValue, category, passageId) + gate results + category totals, writes reports, touches nothing. `--write` wraps all inserts in one transaction with in-tx post-write assertions (rollback on any failure), records an assembly run (reuse `PssaImportRun` pattern or a `provenanceJson` on `PssaForm` — Codex's choice, but report it).

## Negative tests (each must refuse / return zero)
- Pool with 0 student-ready items → refused + deficit report.
- Pool missing the literary passage's items → refused (category A unreachable).
- An item whose `approvedContentHash` drifts after assembly → `--verify` flips form to `invalidated`.
- An item whose primary passage link changes after assembly (≠ `passageIdSnapshot`) → `--verify` flips form to `invalidated`.
- A passage whose `approvedContentHash` drifts after assembly (≠ `approvedPassageContentHashSnapshot`) → `--verify` flips form to `invalidated`.
- Invalidated-collision: pool drifts (form invalidated via `--verify`), pool reverts to the exact prior state, `assemble --write` re-run → REFUSED (no resurrection, no auto-flip, no duplicate-hash insert).
- A form including an item NOT in the live selector result (fixture with stale stored NONE) → refused.
- Conventions count 8 or 10, SA count 1 or 3, multipoint all-two-point (no three-point) → refused.
- **Category-mismatch fixture (PATCH 2):** an item whose `eligibleContent` prefix says B but `reportingCategory` says A (otherwise fully valid) → run refused naming that itemId; assert the assembler did NOT silently classify it as either category or produce a form excluding it.
- **Position-stacking fixture (PATCH 4):** an OTHERWISE-FULLY-VALID fixture pool (all counts, categories, passages, readiness satisfied) where the only defect is MCQ/EBSR-PartA correct answers stacked >40% on one position → refused by the form-level gate specifically. This proves the gate runs across the final assembled form and is not satisfied vicariously by tranche-level batch gates.
- Same seed re-run → identical contentHash (determinism); second `assemble --write` with unchanged pool → no-op with zero row changes.
- Idempotency test (PATCH 3): changed pool does not mutate an existing assembled form; the old form remains `assembled` until `--verify` detects staleness and invalidates it.
- Hash structure test (PATCH 1): swapping two item positions changes contentHash.
- Hash structure test (PATCH 1): keeping item ids the same but changing passage order or item-to-passage grouping changes contentHash.
- Hash structure test (PATCH 1): changing an item's slotType, pointValue, or approvedContentHashSnapshot changes contentHash.
- `--write` against a production-looking DATABASE_URL without `--allow-production` → refused.
Positive control: a fully-approved fixture pool (script-seeded, mirroring real batch composition) → exactly one valid 45-pt form, all gates PASS, byte-stable across re-runs.

`tsc --noEmit` + `build` green.

## Reports (commit to repo)
`reports/pssa_db6_assembly_summary.md` (DB target redacted, seed, blueprint version, selection table, category totals, gate table, contentHash, refusal/deficit state), `reports/pssa_db6_selection.csv`, `reports/pssa_db6_deficit_report.csv` (when refused), `reports/pssa_db6_determinism_proof.csv` (two-run hash comparison).

## Acceptance
Additive-only migration (verify zero ALTER/DROP on existing tables, schema diff clean); assembler draws ONLY from the live DB-5 selector; all blueprint gates + form-level shortcut gate enforced fail-closed; deterministic by seed with byte-identical re-runs; refusal path produces the deficit report; `--verify` staleness flips to `invalidated`, never silently repairs; no student-facing surface, no Assessment/TestSession writes, no approval mutations anywhere; all negative tests refuse; positive control assembles exactly one valid form; `tsc`+`build` green.

## Stop — report (paste back for Claude's independent audit)
Migration SQL + model list; the blueprint constant; the selection algorithm description (how slots are filled + how determinism is achieved); full gate list with where each is enforced; dry-run output on the current dev DB (expected: REFUSED + deficit report — paste the deficit table); negative-test results; determinism proof; `tsc`/`build` results. Do NOT wire any student-facing route. Do NOT approve anything to make the form assemble — the deficit report is the deliverable until human review approves the pool.

## The win condition (reset expectations)
DB-6 success is NOT "a student can take a test." It is: **given an approved pool, the system can deterministically produce a blueprint-valid, governed, hash-snapshotted Grade 3 form — and given today's mostly-unapproved pool, it correctly refuses and tells Jonathan exactly what to review next.** Delivery to a student stays impossible until the TEI player + delivery wiring (PR B/C) exist.
