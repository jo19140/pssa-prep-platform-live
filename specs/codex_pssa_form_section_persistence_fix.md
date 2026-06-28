# Codex Spec — Persist section metadata in the assemble CLI write path

**Type:** bug fix (assemble CLI persistence). **Owner:** Jonathan. **Date:** 2026-06-28.
**Goal:** the assemble CLI `--write` path persists items/passages/buckets correctly but **drops section metadata** — the published EOY form has `hasSections=false`, no `PssaFormSection` rows, and all `PssaFormItem.sectionIndex=null`, even though the EOY assembly result carries 3 sections + per-item/per-passage `sectionIndex`. The EOY diagnostic is a locked **3-section stamina form** (S1 12 items/60min, S2 18/80, S3 15/60) delivered S1→S2→S3 with section progression/review. Persist sections whenever the assembly result provides them. **Foundation forms stay byte-identical** (foundation assembly returns no sections).

## 0. Root cause (verified in code)
- `scripts/content/assemble-pssa-form.ts` `assemble()` → `pssaForm.create` writes `passages`/`items` (no `sectionIndex`) and the form (no `hasSections`, no `sections`). It is foundation-shaped (foundation form is single-section).
- The EOY result (`assembleDiagnosticFormFromPool`/`assembleEoyDiagnosticFormFromPool`) provides `result.sections` (3 rows: `{sectionIndex, sectionType, label, estimatedMinutes}` = 60/80/60), `result.items[].sectionIndex` (12/18/15 split), and `result.passages[].sectionIndex`. Foundation `assemblePssaFormFromPool` returns **no** `sections` and no per-item `sectionIndex`.
- Schema already supports it: `PssaForm.hasSections`, `model PssaFormSection {sectionIndex, sectionType, label, estimatedMinutes, @@unique([formId, sectionIndex])}`, `PssaFormPassage.sectionIndex Int?`, `PssaFormItem.sectionIndex Int?`.

## 1. Scope & guardrails
- Change confined to `scripts/content/assemble-pssa-form.ts`, a **test-fixture repair** in `scripts/test-pssa-eoy-form-assembly.ts` (§2.1), the new test, and this spec. Do NOT modify schema, the assembler library, scoring, the importer, delivery, the student-ready selector, the seed script, or content.
- **Foundation `--write` must stay byte-identical:** no sections when the result has none; `hasSections` stays false; no `PssaFormSection` rows; item/passage `sectionIndex` stay null; selection/contentHash unchanged. Regression: `test:pssa-db6`.
- Clean worktree off the current `origin/main` tip. Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — persist sections (`scripts/content/assemble-pssa-form.ts`)
In the `pssaForm.create` data (and via a small **pure exported helper** `buildPssaFormCreateData(result, args)` so §3 can assert the payload without a DB):
- `hasSections: (result.sections?.length ?? 0) > 0`.
- When `result.sections?.length`, add `sections: { create: result.sections.map(s => ({ sectionIndex: s.sectionIndex, sectionType: s.sectionType, label: s.label, estimatedMinutes: s.estimatedMinutes })) }`. Omit the key entirely when there are no sections.
- `items.create[].sectionIndex: item.sectionIndex ?? null` (added to the existing item create).
- `passages.create[].sectionIndex: passage.sectionIndex ?? null` (added to the existing passage create).
- Extend the post-write assertion: when `result.sections?.length`, assert the created form has exactly that many `PssaFormSection` rows (include `sections: true`).
- Change nothing else in the write path (buckets, hashes, ordering unchanged).

Foundation: `result.sections` is undefined → `hasSections=false`, no `sections` key, item/passage `sectionIndex` null → identical to today.

## 2.1 Deliverable B — stale paired-item fixture repair (ALL tests broken by the readiness tightening)
Multiple existing tests are **already red on `origin/main`**: the merged cross-text readiness fix now requires a cross-text item's persisted **passage links** to cover its passage-group members, but several fixture helpers build items from `raw.passageId` (null for cross-text P3 items) and never carry `raw.passageLinks`, so those items fail readiness (`selected_item_readiness:FAIL ... PENDING_REVIEW`). The real imported DB items DO have these links (the read-only sweep confirmed 45/45 ready), so this is a **fixture-shape gap, not a logic regression**. The selector and assembler are correct — only the fixtures are stale.

**First enumerate the full set:** run the entire PSSA test suite on the branch and identify EVERY test that fails solely because a paired/cross-text fixture item lacks `passages` links (readiness recompute ≠ NONE). Known so far: `test-pssa-eoy-form-assembly` (already repaired), `test-pssa-go-live`; likely also `test-pssa-eoy-e2e-release`, `test-pssa-moy-form-assembly`, `test-pssa-dok-crosswalk`. Confirm by running them; do not guess.

**Apply the identical, mechanical repair to each affected fixture helper:** when an item has `raw.passageLinks`, populate the ready item's `passages` from those links — resolve each `passageLink.passageId` to the fixture passage and emit `{ passageId, passage }` entries (mirroring the real `PssaItemPassageLink` shape), so cross-text items carry their passage links and pass readiness exactly as the real DB rows do.
- Do NOT weaken any assertion, change the assembler, the selector, or any product code. Purely make the fixtures faithful to the imported shape.
- **Report the exact list of test files repaired.** Every repaired file must contain ONLY this fixture-shape change.

## 3. Validation (`scripts/test-pssa-form-section-persistence.ts`, new)
Assert against `buildPssaFormCreateData(...)` (DB-free):
- **EOY** (build the real EOY result via the fixture EOY pool used in `test-pssa-eoy-form-assembly`, or a representative result): `hasSections === true`; exactly **3** section rows with `sectionIndex 1/2/3`, `estimatedMinutes [60,80,60]`; per-item `sectionIndex` split **12/18/15**; every delivered item `sectionIndex` non-null; the P3 paired unit items all in section 2; analytics buckets unchanged (35 operational / 10 analytics_only).
- **Foundation** (BOY `assemblePssaFormFromPool` result, or a sectionless result): `hasSections === false`; **no** `sections` create key; every item/passage `sectionIndex` null. Proves byte-identical persistence shape.

## 4. Gate battery (fail-closed; local binaries)
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-form-section-persistence.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-form-assembly.ts
./node_modules/.bin/tsx scripts/test-pssa-go-live.ts
npm run test:pssa-db6        # foundation form write/assembly byte-identical
# FULL PSSA suite must be green (confirms no remaining stale-fixture casualties from the readiness tightening):
for t in scripts/test-pssa-*.ts; do echo "== $t =="; ./node_modules/.bin/tsx "$t" || exit 1; done
echo "all section-persistence fix gates + full PSSA suite passed"
```

## 5. Acceptance criteria — allowed tracked paths only
```
scripts/content/assemble-pssa-form.ts            (section persistence + buildPssaFormCreateData helper)
scripts/test-pssa-form-section-persistence.ts    (new)
specs/codex_pssa_form_section_persistence_fix.md
scripts/test-pssa-*.ts                           (stale paired-item fixture repair ONLY: carry passageLinks → ready passages;
                                                  exactly the tests red from this gap — enumerate and list them in the report)
```
The only allowed change to any `scripts/test-pssa-*.ts` file is the `passageLinks → passages` fixture-shape repair (§2.1). No assertion, logic, assembler, selector, or product-code changes. Report the exact list of repaired test files.
Anything else (schema, assembler lib, scoring, importer, delivery, content) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 6. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement A + test; §4 gates; scope-guard to §5; commit (no merge); report branch + tip SHA + file list + gate output. **Independent audit before merge** (Claude: confirm EOY persists hasSections+3 sections+12/18/15 sectionIndex, foundation byte-identical, db6 green, exact-SHA-pinned merge).

## 7. After merge — republish + verify (no re-import, no re-approve)
On `pssa_eoy_live` (45 EOY items approved): pull main, then re-assemble (the prior sectionless form will be a different `contentHash`? No — contentHash is content-derived and unchanged; the existing assembled form row can be left or replaced). Re-run `assemble --write --blueprint …eoy-v1 --seed g3-eoy-001 --env dev` and verify the DB form: `hasSections=true`, 3 `PssaFormSection` rows (60/80/60), item `sectionIndex` split 12/18/15, P3 atomic in S2, buckets 35/10. Then seed roster → launch → verify the 3-section delivery + Insights/DOK → attest.
> Note: if the existing sectionless form (same `seed`/`contentHash`) causes a `noop`/collision on re-write, drop that one `PssaForm` row (dev DB only) or use a new `--seed` so the corrected form persists; confirm before launch.
