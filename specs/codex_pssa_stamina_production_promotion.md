# Codex Spec — Stamina→BOY content production-promotion + honest importer

**Type:** content-governance promotion (fixture→production) + importer cleanup. **Owner:** Jonathan (attesting). **Date:** 2026-06-28.
**Goal:** the BOY diagnostic content (stamina pool) is **fixture-grade** (27/39 `fixtureOnly:true`, 0 `benchmarkSeason`, missing license/provenance + structural fields, 1 invalid EC, 1 unauthored SA). Promote all 39 stamina items to **production** standard so the BOY importer validates them **honestly** (no importer-side license inheritance or derived-scoring). Then resume the BOY importer (reverting those workarounds). EOY/MOY/foundation unaffected.

> **Attestation boundary:** clearing `fixtureOnly`/`noDbWrite`/`productionImportReady` and stamping `internal_original`/`cleared` on these 39 items is Jonathan's formal attestation that they are release-grade. Do NOT clear these flags or stamp license unless the promotion is applied as specified and the items are content-complete.

## 0. Verified punch-list (per `exemplars/pssa_grade3_stamina_pilot/*.json`, 39 items)
- **Every item:** missing `provenanceJson.benchmarkSeason`; 27 have `fixtureOnly:true`.
- **29 MCQ:** missing `responseSpecJson`, `scoringJson.totalPoints`; most missing `pointValue`.
- **owls_01..06 + rabbit_01..06 (12):** missing `sourceType`, `licenseStatus`, `commercialUseAllowed`, `needsLegalReview`, `reviewStatus`, `itemStatus` (+ provenance entirely).
- **boat_ebsr/sa/mg, owls_ebsr, rabbit_ebsr/sa, syrup_ebsr/sa/dd (9):** missing `needsLegalReview`.
- **owls_06 (SHORT_ANSWER):** empty `correctResponseJson` (no `expectedAnswerCore`/`acceptableTextSupport`); + governance gaps.
- **rabbit_06 (MCQ):** invalid EC `E03.A-C.2.1.2` (the ONLY invalid EC — conv `E03.D.*` and owls `E03.B-C.3.*` are valid); + MCQ structural/governance gaps.
- **conventions_mc_block.json:** `noDbWrite:true`, `productionImportReady:false`.

## 1. Scope & guardrails
- Two work units: (A) a **content promotion** of the 5 stamina backends (deterministic normalization + 2 authored edits); (B) the **BOY importer** with the inherit/derive workarounds **reverted**. Plus a promotion script + tests + this spec.
- **STRUCTURAL fields are derived from the item's OWN existing content** (choices → responseSpec; type → points). **GOVERNANCE fields are set to the standard cleared values** (the attestation). **Do NOT invent answer keys, choices, or EC mappings.** If any item lacks the underlying content to derive a structural field (e.g., an MCQ with no choices), STOP and report it.
- Foundation/EOY/MOY imports + the full PSSA suite stay green/byte-identical.
- Clean worktree off the current `origin/main` tip (re-fetch). Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A1 — promotion script (`scripts/content/promote-stamina-to-boy.ts`, new; idempotent)
Normalizes the 5 stamina backends in place. For **every** item:
- **Governance (attestation):** set `sourceType:"internal_original"`, `licenseStatus:"cleared_internal_original"`, `commercialUseAllowed:true`, `needsLegalReview:false` (only where missing/incorrect); set `reviewStatus:"PENDING"`, `itemStatus:"candidate"` where missing.
- **Provenance:** ensure `provenanceJson` exists; set `provenanceJson.benchmarkSeason:"BOY"`; **delete `provenanceJson.fixtureOnly`**; keep existing `sourcePassageId`, else set it from the item's linked passage / passage group.
- **Structural (derive from existing content only):**
  - `pointValue` if missing: MCQ/INLINE_DROPDOWN → 1; SHORT_ANSWER/EBSR/MATCHING_GRID/DRAG_DROP → the item's authored point value (SA/EBSR=their existing totalPoints; if absent, MATCHING_GRID/EBSR/SA per the existing stamina siblings' values — do NOT guess a multipoint value; STOP if ambiguous).
  - `scoringJson.totalPoints` = `pointValue`; preserve any existing `scoringJson` (e.g. owls_06 `pending_human_scoring`); SA/TDA keep `autoScoringClaim:false` if present.
  - `responseSpecJson` if missing: build the student-facing spec from the item's existing `structuredChoicesJson`/`answerChoicesJson` (MCQ: `{prompt, choices}` with answer-key/evidence STRIPPED), mirroring how EOY/MOY MCQ store `responseSpecJson`. Never include `correctIndex`/evidence in `responseSpecJson`.
- **Backend flags:** in `conventions_mc_block.json`, set `noDbWrite:false` (or remove) and `productionImportReady:true`. Set `productionImportReady:true` on the other backends.
- Idempotent (re-running is a no-op). The script must NOT touch stems, choices, correct answers, or ECs (except the two §A2 manual edits, which are applied separately/explicitly).

## 3. Deliverable A2 — authored content fixes (explicit, reviewed)
- **owls_06 (`owls_paired_released_length.json`) SHORT_ANSWER `correctResponseJson`:**
  - `expectedAnswerCore`: "Owls are helpful hunters because their bodies are built to catch prey and because what they catch helps people. The first passage explains that an owl's forward-facing eyes help it judge distance when it dives, and its offset ears help it locate prey, so it hunts well in the dark. The second passage explains that barn owls catch rodents such as mice and rats that would damage a farmer's grain and crops, so the owls help farmers lose less food."
  - `acceptableTextSupport`: `[ {supportId:"owls_06_s1", supportType:"direct_quote", passageSlot:"passage_1", quotedSpan:"An owl's eyes are large and face forward, so the bird can judge distance when it dives toward prey.", detail:"forward-facing eyes help the owl catch prey", connectsToExpectedAnswer:"owls are built to hunt well", independentKey:"hunting_ability"}, {supportId:"owls_06_s2", supportType:"direct_quote", passageSlot:"passage_2", quotedSpan:"Barn owls hunt mostly small mammals such as mice, voles, and rats.", detail:"owls catch rodents that damage crops and grain", connectsToExpectedAnswer:"owls help farmers", independentKey:"helps_farmers"} ]`
  - Keep `scoringJson.totalPoints:3`, pending_human_scoring. (Verify the two `quotedSpan`s appear verbatim in the respective owls passages; if not, STOP.)
- **rabbit_06 (`rabbit_drama_released_length.json`) — FULL ITEM REVISION (approved), not a retag.** The invalid `E03.A-C.2.1.2` + the character-change construct over-concentrated `A-K.1.1.3`. Revise it into a genuine **central-message** item (`E03.A-K.1.1.2`), keeping **correctIndex 1 (B)** so the form's `[8,7,7,7]` answer-position gate holds:
  - **stem:** "What lesson is best shown by what happens in Scene 3?"
  - **structuredChoicesJson / answerChoicesJson (order fixed; correctIndex 1):**
    - 0 "A strong storm can ruin the homes that small animals build." — `distractorRole: "wrong_emphasis"`
    - 1 "Sharing what you have can make things better for everyone." — **isCorrect:true**, `distractorRole: null`
    - 2 "It is best to keep your home to yourself so it stays just right." — `distractorRole: "opposite_claim"`
    - 3 "An animal with prickles should face toward the wall." — `distractorRole: "too_narrow"` (NO absolute language — "always" removed to satisfy `PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR`)
  - `eligibleContent: "E03.A-K.1.1.2"`; `reportingCategory: "A"`; keep pointValue 1, MCQ. Update both `structuredChoicesJson` (with isCorrect/distractorRole/rationale) and `answerChoicesJson` (text array) consistently; regenerate `responseSpecJson` from the new choices (answer key stripped).

## 3.1 Assembly + BOY-diagnostic-hash consequences (authorized)
The rabbit_06 revision changes the BOY diagnostic canonical, so:
- **EC distribution** (reading MCQ): `A-K.1.1.3` 4→**3** (the designed triple), `A-K.1.1.2` 2→**3** (≤ `maxReadingEcRepeats`=3). `reading_ec_variety` (`overRepeatedEc` empty + `tripleEcOk`: A-K.1.1.3===3 ∧ B-K.1.1.1===3 ∧ all ≤3) now **PASSES**. Re-verify the other pinned BOY gates are still green: `answer_position_distribution` [8,7,7,7], `category_A/B/D_points`, `section_count`/section targets, `passage_group_integrity` (owls in S3), `total_points`.
- **BOY diagnostic contentHash is UNCHANGED (verified 2026-06-28):** the canonical is ID/structure-based (it does not hash raw EC/stem/choice text or SA support), so the rabbit_06 revision and owls_06 SA authoring do NOT move `PRE_PHASE4A_BOY_DIAGNOSTIC_CONTENT_HASH`. **No re-pin — leave the hash constant and do NOT touch `test-pssa-db6-form-assembly.ts` / `test-pssa-go-live.ts`.** (The rabbit_06 EC change is caught by the separate `reading_ec_variety` assembly gate, which now passes 3/3.) The paragraph below is retained only as the guard: IF any field had moved the hash, re-pin justified ONLY by the two authorized content changes.
  - The re-pin must be justified ONLY by the two authorized content changes: (1) rabbit_06 full item revision (stem/choices/EC; correctIndex stays 1), and (2) owls_06 SHORT_ANSWER support authoring (`expectedAnswerCore` + `acceptableTextSupport`).
  - Comment naming both authorized causes: `// content-governance promotion: rabbit_06 message-item revision + owls_06 SA support authoring`.
  - Governance/provenance fields, `benchmarkSeason`, `fixtureOnly` removal, `responseSpecJson`/`scoringJson` backfills, and `productionImportReady`/`noDbWrite` flag changes must NOT independently move the canonical diagnostic hash unless the existing hash function intentionally includes them. **If any non-authorized field moves the hash, STOP and report the exact field and hash input before re-pinning.**

## 4. Deliverable B — BOY importer, workarounds reverted (`pssa-import-plan.ts` + the existing BOY draft)
- Build the BOY benchmark/manifest/plan per `specs/codex_pssa_boy_benchmark_importer.md` (5 passages, 39 items, 6 batches; MCQ top-level `correctIndex` fallback and SA `expectedAnswerCore` validation are legitimate older-shape support and STAY).
- **REVERT** the unauthorized workarounds: NO inheriting license/provenance from a linked passage; NO deriving scoring in the validator. The eligibility gate reads the item's OWN (now-promoted) fields. License gate requires `provenanceJson.benchmarkSeason==="BOY"` on the item itself.
- `--benchmark boy`, `benchmarkForBatchId` BOY, CLI allow-list += `GRADE3_DIAGNOSTIC_BLUEPRINT` (unchanged from the BOY spec).

## 5. Validation (`scripts/test-pssa-boy-importer.ts` + a promotion check)
- After promotion, **all 39 stamina items** have: the 4 license fields, `provenanceJson.benchmarkSeason==="BOY"`, no `fixtureOnly`, `reviewStatus`/`itemStatus`, `responseSpecJson`, `scoringJson.totalPoints`, `pointValue`; every `eligibleContent` joins the crosswalk (incl. rabbit_06 now `E03.A-K.1.1.3`); owls_06 SA non-empty.
- BOY plan **5/39/0/0/6**, type counts 29/4/4/1/1, batch split 20/9/4/1/1/4, **all 39 import-eligible via real fields (no inheritance/derivation)**; owls group persisted; determinism; drift hash.
- Regression: foundation/EOY/MOY importer + full `scripts/test-pssa-*.ts` suite green.

## 6. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsx scripts/content/promote-stamina-to-boy.ts   # idempotent promotion
git diff --stat exemplars/pssa_grade3_stamina_pilot/                  # review the content delta
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-boy-importer.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-importer.ts
./node_modules/.bin/tsx scripts/test-pssa-moy-importer.ts
npm run test:pssa-db5
npm run test:pssa-db6-5
for t in scripts/test-pssa-*.ts; do echo "== $t =="; ./node_modules/.bin/tsx "$t" || exit 1; done
echo "all stamina-promotion + BOY importer gates + full suite passed"
```

## 7. Acceptance criteria — allowed tracked paths
```
exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json
exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json
exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json
exemplars/pssa_grade3_stamina_pilot/rabbit_drama_released_length.json
exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json
scripts/content/promote-stamina-to-boy.ts
scripts/content/lib/pssa-import-plan.ts          (BOY manifest/plan; workarounds reverted; foundation/EOY/MOY byte-identical)
scripts/content/write-pssa-items.ts              (--benchmark boy)
scripts/content/assemble-pssa-form.ts            (allow-list += GRADE3_DIAGNOSTIC_BLUEPRINT)
lib/content/pssaItemReview.ts                    (benchmarkForBatchId BOY)
scripts/test-pssa-boy-importer.ts                (new)
scripts/test-pssa-content.ts                     (stamina freeze: accommodate authorized metadata/structural promotion + rabbit_06 revision; keep all content-bearing freezes)
scripts/test-pssa-db6-form-assembly.ts           (ONLY the EC-triple assertion at line ~473: expand the "approved three-times" set to the new intended triples; hash pin + all other assertions UNTOUCHED)
specs/codex_pssa_stamina_production_promotion.md
(NOTE: test-pssa-go-live.ts is NOT in the change set — the BOY diagnostic hash is unchanged, no re-pin.)

### §3.2 db6 EC-triple assertion update (authorized, narrow)
Consequence of the approved rabbit_06 → `E03.A-K.1.1.2` revision: A-K.1.1.2 becomes a THIRD reading EC at 3. The assembler `reading_ec_variety` gate passes (two required triples at 3 + all ≤3). Update ONLY `test-pssa-db6-form-assembly.ts` line ~473:
- expected set `["E03.A-K.1.1.3", "E03.B-K.1.1.1"]` → `["E03.A-K.1.1.2", "E03.A-K.1.1.3", "E03.B-K.1.1.1"]` (sorted); message → "the approved three ECs repeat three times".
- Do NOT change lines 471–472 (A-K.1.1.3=3, B-K.1.1.1=3 — still hold), the hash pin, or any other assertion. If any OTHER db6 assertion fails, STOP and report.
```
Anything else → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` / `wip-dashboards-session-review.md`. Never `git add -A`.

## 7.1 Required no-content-drift report
```
No-content-drift report:
- Passage text unchanged.
- All item stems/choices/keys/ECs unchanged EXCEPT rabbit_06.
- All correctResponseJson/scoring support unchanged EXCEPT owls_06.
- Governance/provenance/structural promotion fields changed only as authorized.
- No importer-side governance inheritance or derived scoring remains.
```

## 8. Process
Clean-worktree from `origin/main`; carry+commit this spec; run promotion script + apply §A2; implement/clean the BOY importer; §6 gates incl. full suite; scope-guard to §7; commit (no merge); report branch + tip SHA + file list + the stamina content diff summary + the BOY 6-stream eligibility report (39/39 via real fields) + confirmation foundation/EOY/MOY byte-identical. **STOP on any item that can't be promoted from its own content without inventing answer/EC data.** **Independent audit before merge** (Claude: every item production-complete, 39/39 eligible without inheritance/derivation, owls_06 spans verbatim, rabbit_06 EC valid, full suite green, exact-SHA-pinned merge).

## 9. After merge — operational BOY run (fresh disposable dev DB)
`--benchmark boy`: fresh DB → migrate → crosswalk → import foundation + `--benchmark boy` → approve BOY (passages + 6 batches, `--attest-license-cleared`) → `assemble --write --blueprint pde-ela-diagnostic-stamina-2025-g3-v1 --seed g3-boy-001 --env dev` → verify sections/buckets → seed → launch → verify score + Insights/DOK + leak. Completes BOY/MOY/EOY.
