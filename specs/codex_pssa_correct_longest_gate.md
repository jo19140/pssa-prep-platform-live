# Codex Spec — Aggregate answer-length bias gate (mid-p) + June narrator hotfix

**Type:** audit-gate addition + content hotfix. **Owner:** Jonathan. **Date:** 2026-06-28.
**Goal:** two independent reviews (Pro + a second pass) plus Claude's own recomputation confirmed a real **answer-length bias**: across 107 single-select sets the correct answer is the strictly-longest choice **40.2%** of the time (released Grade-3 baseline ≈ 11%), concentrated in **MOY reading (76.9%)** and **EBSR Part A (72.7%)**; **BOY reading is clean (25.0%, chance)**. The existing `PSSA_MCQ_CORRECT_IS_LONGEST` is a **per-item margin** detector (only blocks when the key is ≥2 words / ≥15% chars longer) and excludes EBSR Part A + inline-dropdowns — so the *distributional* bias slips through. Add a **form-level aggregate gate** (mid-p exact binomial) that measures it deterministically, and hotfix the BOY "June" narrator bug in the same pass. **This gate is a measurement/tracking gate — do NOT wire it into `assembleDiagnosticFormFromPool`'s ok-gating (that would red the live MOY/EOY forms).**

## 0. Verified statistics (independently reproduced; use as the acceptance table)
Strict-longest-correct, upper **mid-p** under Binomial(n, p0=0.25), α=0.05:
| scope | k/n | strict% | exact tail | **mid-p** | gate |
|---|---|---|---|---|---|
| BOY reading (MCQ, cat A/B) | 6/24 | 25.0% | 0.578 | **0.485** | **PASS** |
| MOY reading | 20/26 | 76.9% | 0.000 | **0.000** | FAIL |
| EOY reading | 12/30 | 40.0% | 0.0507 | **0.0361** | FAIL |
| EBSR Part A (pooled, all forms) | 8/11 | 72.7% | 0.0012 | **0.0007** | FAIL |
(The EOY 12/30 knife-edge is why mid-p is required: exact tail 0.0507 would NOT block; mid-p 0.0361 blocks.)

## 1. Deliverable A — mid-p evaluator (`scripts/audit/pssa-audit-detectors.ts`)
Add a pure exported `evaluateCorrectLongestMidP(sets, { p0: 0.25, alpha: 0.05 })` — **`scopeMinN` is carried per scope, NOT a single hardcoded arg**:
- `sets`: array of `{choices:[{text,correct}]}` single-select sets. For each: `strictLongest = len(correct) > max(len(others))` using **character length of trimmed text**.
- Compute `k=#strictLongest`, `n=#sets`, exact upper-tail `P(X>=k)` and upper **mid-p** = `P(X>k) + 0.5·P(X=k)` for `X~Binomial(n, p0)` (implement via a stable log-choose binomial pmf; no external dep).
- **Operator (pinned): `block = n >= scopeMinN && midP < alpha`, `alpha = 0.05`.**
- **Per-scope `scopeMinN`:** per-form **reading** scopes → `scopeMinN = 20`; **pooled EBSR Part A** → `scopeMinN = 1` (waive the floor so 8/11 is not diluted below the denominator); **conventions / inline-dropdown** → report separately, never fold into the reading signal.
- Return `{ scope, n, k, strictPct, exactTail, midP, alpha, scopeMinN, block }`.
- Add `collectSingleSelectSets(items, {kinds})` yielding sets for MCQ (`choices`) and EBSR Part A (`partA.choices` keyed by `correctResponseJson.partA.correctIndex`). Do not count matching-grid/drag-drop rows.
- **This is ADDITIVE** to the existing per-item `PSSA_MCQ_CORRECT_IS_LONGEST` gate — do not modify or replace it.

## 2. Deliverable B — measurement gate + test (`scripts/test-pssa-correct-longest-gate.ts`, new)
- Build the three benchmark forms via the existing `assemble*DiagnosticFormFromPoolForTest` (or the fixture pools already used by the importer tests) and compute, per form, the **reading-MCQ** scope; and compute the **EBSR Part A pooled** scope across all three benchmarks.
- Assert the **current pinned state** (so the suite stays green while documenting the debt and BOY-clean):
  - `BOY reading` (6/24, scopeMinN 20): `block === false` (mid-p ≈ 0.485) — **block-clean**.
  - `MOY reading` (20/26, scopeMinN 20): `block === true` (mid-p ≈ 2.2e-8) — tracked debt.
  - `EOY reading` (12/30, scopeMinN 20): `block === true` (mid-p ≈ 0.0361) — tracked debt.
  - `EBSR Part A pooled` (8/11, scopeMinN 1): `block === true` (mid-p ≈ 0.000657) — tracked debt.
- Print a per-scope report table with columns: **scope · n · strict-longest count · strict-longest rate · exact upper-tail p · upper mid-p · alpha · scopeMinN · block · tracked-debt** (both exact-tail and mid-p, so EOY's exact 0.0507 vs mid-p 0.0361 is never re-litigated). This table is the remediation worklist.
- **As each remediation tranche lands, flip that scope's assertion to `block === false`** — this test is the literal stopping condition.
- **Keep the gate OUT of live assembly.** Do NOT wire it into `assembleDiagnosticFormFromPool` or any production/live form-assembly path until MOY and EOY remediation lands — the live MOY/EOY forms must keep assembling. This pass: BOY block-clean; MOY/EOY/EBSR pinned tracked-debt.

## 3. Deliverable C — June narrator hotfix (`exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json`)
The boat passage never names the narrator, but 7 items (`boat_01/02/03/05/ebsr_01/sa_01/mg_01`) call her "June". **The ONLY passage text change allowed:**
`So when I signed up for this year's race,` → `So when I, June Reyes, signed up for this year's race,`

**June acceptance criteria (pinned):**
- The BOY boat passage introduces "June Reyes" **before** any item reference to June.
- Items MAY keep "June" (now grounded in the passage); existing item-side she/her MAY remain (now tied to the grounded named protagonist).
- No BOY boat item may introduce a NEW unsupported name, relationship, event, or fact.
- No item IDs, answer keys, ECs, rationales, rubrics, scoring specs, or TE structures change as part of the June fix.
- No other passage text changes. This is a BOY content change, part of the promoted BOY content.

## 4. Scope & guardrails
- Allowed paths: `scripts/audit/pssa-audit-detectors.ts`, `scripts/test-pssa-correct-longest-gate.ts` (new), `exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json`, this spec — plus the existing BOY tranche files. Do NOT modify the assembler, importer, scoring, schema, or any other content/item. STOP on anything else.
- **Preserve no-drift:** outside the one BOY boat clause and the new audit/gate files — foundation, MOY, and EOY content **byte-identical**; existing per-item `PSSA_MCQ_CORRECT_IS_LONGEST` behavior intact; **NO MOY/EOY answer-choice remediation this pass** (that is the later remediation tranches, §7).
- If this rides on the pending BOY promotion branch, the boat backend edit is additive to that content; re-run the BOY importer + no-content-drift check (only the June clause + the earlier authorized rabbit_06/owls_06 changes).
- Clean worktree off current `origin/main`; preserve `codex/teacher-lessons-tab-pr1`; guard+symlink+trap `node_modules`; never `git add -A`.

## 5. Gates
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-correct-longest-gate.ts     # BOY block-clean; MOY/EOY/EBSR tracked-fail per §0
for t in scripts/test-pssa-*.ts; do echo "== $t =="; ./node_modules/.bin/tsx "$t" || exit 1; done
echo "correct-longest gate + June hotfix gates passed"
```

## 6. Process
Clean-worktree flow; carry+commit this spec; implement A–C; §5 gates; scope-guard; commit (no merge); report branch + tip SHA + file list + the per-scope mid-p table + confirmation the June clause appears before item references and no other content changed. **Independent audit before merge** (Claude: reproduce the four mid-p values, confirm BOY block-clean + MOY/EOY/EBSR tracked, June fix verbatim, no other content drift, exact-SHA-pinned merge).

## 7. After this lands — remediation order (separate tranches, each re-running §2 as the stopping condition)
1. **MOY reading** — re-author distractors to parallel length/form until `MOY reading` mid-p ≥ 0.05 (flip its assertion).
2. **EBSR Part A** — same, across the pooled EBSR Part A stems.
3. **EOY reading** — the School-Long-Ago/Today paired-text cluster first (biggest margins: EOY 23/20/24/29/35/21).
Each remediation tranche re-imports/re-assembles/re-launches the affected live form and flips its scope to block-clean.
