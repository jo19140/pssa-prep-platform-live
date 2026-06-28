# Codex Spec — Cross-text readiness coverage from persisted structure (schema-free)

**Type:** bug fix (student-ready selector). **Owner:** Jonathan. **Date:** 2026-06-28.
**Goal:** the 2 EOY P3 cross-text items (`pssa_item_g3_eoy_p3_mcq_bc312`, `pssa_item_g3_eoy_p3_ebsr_bc312`) fail readiness with `required_evidence_slots_not_covered`, so the EOY form is 43/45 and won't assemble. Make `pairedRequiredEvidenceSlotsCovered` derive coverage from the **already-persisted** passage-group/member/link structure instead of from per-evidence-link `passageSlot` data that the DB does not store. No schema change, no answer-key leakage, fail-closed.

## 0. Root cause (verified via real-DB sweep)
- `pairedRequiredEvidenceSlotsCovered` (in `scripts/content/lib/pssa-student-ready-selector.ts`) computes `covered` from `pairedEvidenceLinks(item)` — for MCQ `item.structuredChoicesJson[correct].evidenceLinks[].passageSlot`; for EBSR `acceptableSupportEvidenceLinks`/`crossTextSupportRuleJson`/etc.
- **None of that evidence-link data is persisted on `PssaItem`.** The schema has no `structuredChoicesJson`/`evidenceBinding`/`partB` column; `responseSpecJson` is persisted with answer-evidence stripped (correctly — it is student-facing). So on a real DB row `covered = ∅` → coverage fails, even though `requiredEvidenceSlotsJson = ["passage_1","passage_2"]` is persisted and the passage-group members cover both slots with student-ready passages.
- The fixture tests never caught this: they hardcode `studentReadyBlockedReason:"NONE"`, bypassing the selector. The real DB path runs it for the first time.
- **Sweep result (read-only, all 45 EOY rows):** ONLY these 2 items fail, both at readiness. Downstream is clean — student DTO 0 leaks, scoring 0 failures, distractor mapping 0, DOK join 0. So this is the only blocker.
- The function only runs under `if (item.passageGroupId)`; **foundation imported 0 passage groups**, so foundation items never reach this code → foundation readiness is unaffected.

## 1. Scope & guardrails
- Change confined to `scripts/content/lib/pssa-student-ready-selector.ts` + a test + this spec. Do NOT modify schema, the importer, scoring, the assembler, delivery, or any content.
- **Fail-closed.** The fix must STILL reject: missing/empty passage group, a required slot absent from member slots, a member with no/blank slot, a missing linked passage, a linked passage that is not student-ready, or the item not actually linked to a required member's passage.
- No new student-facing data path; the function reads only structural fields (group members, member passages, item passage links). No answer-key leakage.
- Clean worktree off the current `origin/main` tip. Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — structural coverage (`scripts/content/lib/pssa-student-ready-selector.ts`)
Rework `pairedRequiredEvidenceSlotsCovered(item)` so a required slot is **covered** when the persisted structure supports it:
- `required = requiredEvidenceSlots(item)` (unchanged). If empty → `return !item.isCrossText` (unchanged).
- `members = item.passageGroup?.members ?? []`; `memberSlots = Set(members.map(m => String(m.slot ?? "")).filter(Boolean))`. If any `required` slot ∉ `memberSlots` → fail (unchanged).
- For **each** `required` slot:
  - find the member whose `slot` === that slot; if none or `!member.passage` → fail;
  - the member's passage must be student-ready: `explainPssaPassageStudentReadiness(member.passage).reason === "NONE"`, else fail;
  - the item must be linked to that passage: the passage id is in the item's persisted links (`(item.passages ?? []).map(l => l.passage?.id)`), else fail.
- If every required slot passes, return `true`.
- **Do not** require `pairedEvidenceLinks`/`passageSlot` coverage (that data is not persisted). If you keep `pairedEvidenceLinks` as an *additional* satisfier when present, it must not be able to *block* an otherwise structurally-covered item, and must never throw on the EOY shapes.

Rationale: the per-evidence-link verification is an **authoring-time** property (already enforced by the EOY cross-text detectors at authoring/merge) and cannot be reconstructed from the DB. The readiness gate verifies what is persisted and verifiable; it stays fail-closed on every structural gap.

## 3. Validation (`scripts/test-pssa-crosstext-readiness.ts`, new — or extend the existing db5/readiness test)
Build real-shaped fixture rows (mirror the imported P3 shape) and assert via `explainPssaItemStudentReadiness` / `computeStudentReadyBlockedReason`:
- **Positive:** an approved cross-text item with `isCrossText:true`, `requiredEvidenceSlotsJson:["passage_1","passage_2"]`, a passage group whose members `{slot:"passage_1"|"passage_2"}` have student-ready passages, and item passage links to both passages → `reason: "NONE"` (READY). Cover both the MCQ and EBSR P3 shapes.
- **Fail-closed negatives (each must still block):** (a) a required slot missing from member slots; (b) a member with a blank/missing slot; (c) a member passage that is not student-ready; (d) the item not linked to a required member's passage; (e) no passage group at all while `requiredEvidenceSlotsJson` is non-empty.
- **Regression:** existing readiness/selector tests stay green (`test:pssa-db5`, `test-pssa-eoy-importer`, any go-live/e2e readiness fixtures).

## 4. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-crosstext-readiness.ts
npm run test:pssa-db5
./node_modules/.bin/tsx scripts/test-pssa-eoy-importer.ts
npm run test:pssa-db6-5
echo "all cross-text readiness fix gates passed"
```

## 5. Acceptance criteria — allowed tracked paths only
```
scripts/content/lib/pssa-student-ready-selector.ts   (pairedRequiredEvidenceSlotsCovered structural coverage)
scripts/test-pssa-crosstext-readiness.ts             (new)
specs/codex_pssa_crosstext_readiness_fix.md
```
Anything else (schema, importer, scoring, assembler, delivery, content) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 6. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement A + test; §4 gates; scope-guard to §5; commit (no merge); report branch + tip SHA + file list + gate output. **Independent audit before merge** (Claude: confirm the 2 P3 items become READY, all fail-closed negatives still block, foundation/readiness regressions green, exact-SHA-pinned merge).

## 7. After merge — resume the operational run (no re-import, no re-approve)
On `pssa_eoy_live` (45 EOY items approved): pull main, then re-run the EOY assembly dry-run → it should now select all 45 (43→45 ready) → `assemble --write --blueprint …eoy-v1` → seed roster → launch → verify (/45 operational, analytics excluded, Insights+DOK, no leak) → attest.
