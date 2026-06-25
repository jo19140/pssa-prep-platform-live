# Codex Spec — EOY Form Assembly (Grade 3 diagnostic, 45 delivered / 35 operational / 10 analytics)

**Type:** assembler extension (no new content authoring). **Owner:** Jonathan. **Date:** 2026-06-25.
**This is the final EOY tranche** — wiring the locked EOY item bank (P1–P4 + 9 conventions) into the existing diagnostic assembler, mirroring the merged MOY form-assembly path.

## 0. Scope & guardrails

- **Extend the existing diagnostic assembler — do NOT create a parallel assembler.** Add a new `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` const and a pinned EOY item-selection/section contract, and add an `assembleEoyDiagnosticFormFromPool(...)` path that branches on the EOY `blueprintVersion` — mirroring the **MOY** machinery exactly (`assembleMoyDiagnosticFormFromPool*`, `validateMoySelectedForm`, `classifyMoyAssemblyItem`, `expectedMoyBucket`, `sectionForMoyConvention`, `MOY_DIAGNOSTIC_SECTION_ITEM_IDS`, `MOY_ANALYTICS_ITEM_IDS`, `MOY_UNIT_SECTIONS`, `MOY_PASSAGE_ROWS`).
- **The BOY (`GRADE3_DIAGNOSTIC_BLUEPRINT`) and MOY (`GRADE3_MOY_DIAGNOSTIC_BLUEPRINT`) paths must stay BYTE-IDENTICAL** — same assembled rosters, section maps, gate outputs, and `contentHash`. STOP if any BOY/MOY snapshot or `test-pssa-db6` / `test-pssa-moy-form-assembly` assertion changes.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry, delivery, the figure module, schema, or any merged BOY/MOY/EOY **content** (passages/items/exemplars). This tranche touches only the assembler lib + its new EOY test (+ optional `test-pssa-content.ts` wiring). **EOY assembly is exercised via `assembleEoyDiagnosticFormFromPoolForTest` + `scripts/test-pssa-eoy-form-assembly.ts`, exactly as MOY is** — the `scripts/content/assemble-pssa-form.ts` CLI stays **BOY-only** and is **NOT in scope** (§7). **If a CLI edit appears necessary, STOP and report** — do not modify the CLI. **`scoringBucket` is assigned at assembly only** (the 10 AO IDs → `analytics_only`; everything else → `operational`); never write it onto bank items.
- STOP and report on any schema need. Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed (§7). Never `git add -A`.

## 0.1 BLOCKED-ON preflight (run FIRST — FAIL-CLOSED)

This tranche requires the **entire EOY item bank merged on `origin/main`**:
- EOY P1–P4 (merged) **and EOY conventions** (`scripts/content/author-pssa-eoy-conventions.ts` + `exemplars/pssa_grade3_eoy_conventions/`). The conventions merge advances `origin/main` to the audited tip **`a5af04a1671341250eb272758b3a25067d0132e1`**; the worktree base must descend from it. **STOP if `origin/main` does not contain `scripts/content/author-pssa-eoy-conventions.ts`** (conventions not yet merged → assembly pool is incomplete).
- Verify all **45** bank items resolve from the pool: 11 P1 + 8 P2 + 10 P3 + 7 P4 + 9 conventions. STOP if any pinned ID in §3 is absent.

## 1. Deliverables

- `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` (new const in `scripts/content/lib/pssa-form-assembly.ts`, **alongside** — not replacing — the BOY + MOY consts).
- The EOY parallel constants + functions in the same file (`EOY_DIAGNOSTIC_SECTION_ITEM_IDS`, `EOY_ANALYTICS_ITEM_IDS`, `EOY_UNIT_SECTIONS`, `EOY_PASSAGE_ROWS`, `classifyEoyAssemblyItem`, `expectedEoyBucket`, `sectionForEoyConvention`, `validateEoySelectedForm`, `assembleEoyDiagnosticFormFromPool` + `…ForTest`), branched on `blueprintVersion`. BOY + MOY paths untouched.
- `scripts/test-pssa-eoy-form-assembly.ts` (mirror `test-pssa-moy-form-assembly.ts`); wire into the db6 / content test harness as the existing MOY test is wired.

## 2. `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` (pinned — mirror the MOY const shape)

```ts
export const GRADE3_EOY_DIAGNOSTIC_BLUEPRINT = {
  blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-eoy-v1",
  module: "PSSA",
  subject: "ELA",
  gradeLevel: 3,
  deliveredItems: 45,
  operational: { items: 35, points: 45 },
  analyticsOnly: { items: 10, points: 16 },
  deliveredPossiblePoints: 61,           // 45 operational + 16 analytics
  passageUnits: 4,
  rawPassages: 5,                        // P3 paired = 2 raw rows
  totalPoints: 45,
  conventionsOnePoint: 9,
  shortAnswerItems: 2,
  shortAnswerPointsEach: 3,
  operationalAnswerPositionEligibleItems: 29,        // 20 reading MCQ + 9 conventions
  operationalAnswerPositionDistribution: [7, 8, 8, 6], // A7/B8/C8/D6 — see NOTE
  maxCorrectPositionShare: 0.4,                       // 8/29 = 0.276 — passes
  maxOperationalReadingMcqEcRepeats: 2,
  maxDeliveredReadingMcqEcRepeats: 3,
  hasSections: true,
  sections: [
    { sectionIndex: 1, sectionType: "conventions_reading", label: "Section 1", estimatedMinutes: 60, conventionsCount: 5, readingPassages: 1, shortAnswers: 0, delivered: 12, operationalItems: 11, operationalPoints: 12, analyticsItems: 1, analyticsPoints: 1 },
    { sectionIndex: 2, sectionType: "reading",             label: "Section 2", estimatedMinutes: 80, conventionsCount: 0, readingPassages: 2, shortAnswers: 1, delivered: 18, operationalItems: 13, operationalPoints: 18, analyticsItems: 5, analyticsPoints: 7 },
    { sectionIndex: 3, sectionType: "conventions_reading", label: "Section 3", estimatedMinutes: 60, conventionsCount: 4, readingPassages: 1, shortAnswers: 1, delivered: 15, operationalItems: 11, operationalPoints: 15, analyticsItems: 4, analyticsPoints: 8 },
  ],
  untimed: true,
  sourcePool: "eoy",
} as const;
```

**NOTE — answer-position distribution `[7, 8, 8, 6]`:** the locked item bank (P1–P4 reading-MCQ keys + the conventions A3/B2/C2/D2 plan) resolves to **A7/B8/C8/D6** across the 29 position-eligible operational items. The earlier blueprint prose target of **A8/B7/C7/D7 was a planning target only**; the final locked bank yields A7/B8/C8/D6, which still passes the hard PSSA-style balance rule (max share 8/29 = 0.276, well under 0.40). **Pin `[7, 8, 8, 6]` — do NOT re-key any merged reading items, and do NOT weaken the gate to a ≤0.40-only check.** The exact-distribution gate is retained (it catches accidental key drift); only the expected value is the actual locked distribution.

## 3. EOY item roster, section placement & `scoringBucket` (pinned — NO shorthand)

`scoringBucket` is assembly-only: the **10 analytics IDs** below → `analytics_only`; all other 35 → `operational`. Mirror `expectedMoyBucket`/`moyBucketFor` as `expectedEoyBucket`/`eoyBucketFor`.

**`EOY_ANALYTICS_ITEM_IDS`** (10):
```
pssa_item_g3_eoy_p4_mcq_av412_ao6      (AO-6, S1, A-V.4.1.2, 1pt)
pssa_item_g3_eoy_p2_mcq_ac211_ao5      (AO-5, S2, A-C.2.1.1, 1pt)
pssa_item_g3_eoy_p3_mcq_bc211_ao1      (AO-1, S2, B-C.2.1.1, 1pt)
pssa_item_g3_eoy_p3_mcq_bv412_ao4      (AO-4, S2, B-V.4.1.2, 1pt)
pssa_item_g3_eoy_p3_ebsr_bk111_ao7     (AO-7, S2, B-K.1.1.1, 2pt)
pssa_item_g3_eoy_p3_ebsr_bc311_ao8     (AO-8, S2, B-C.3.1.1, 2pt)
pssa_item_g3_eoy_p1_mcq_bc212_ao2      (AO-2, S3, B-C.2.1.2, 1pt)
pssa_item_g3_eoy_p1_mcq_bv411_ao3      (AO-3, S3, B-V.4.1.1, 1pt)
pssa_item_g3_eoy_p1_te_bc313_ao9       (AO-9, S3, B-C.3.1.3, 3pt grid)
pssa_item_g3_eoy_p1_te_bv411_ao10      (AO-10, S3, B-V.4.1.1, 3pt grid)
```
(Analytics points: S1 1 + S2 7 + S3 8 = 16 over 10 items.)

**`EOY_DIAGNOSTIC_SECTION_ITEM_IDS`** = `[[S1…],[S2…],[S3…]]`, 12 / 18 / 15 (mirror the MOY array-of-arrays shape):

**Section 1 (12):**
```
pssa_item_g3_eoy_p4_mcq_ak111
pssa_item_g3_eoy_p4_mcq_ak113
pssa_item_g3_eoy_p4_mcq_av411
pssa_item_g3_eoy_p4_mcq_av412
pssa_item_g3_eoy_p4_mcq_ak112
pssa_item_g3_eoy_p4_ebsr_ak113
pssa_item_g3_eoy_p4_mcq_av412_ao6
pssa_item_g3_eoy_conv_d112_plurals
pssa_item_g3_eoy_conv_d113_abstract_noun
pssa_item_g3_eoy_conv_d116_pronoun_agreement
pssa_item_g3_eoy_conv_d117_comparative
pssa_item_g3_eoy_conv_d119_sentence_formation
```
**Section 2 (18):**
```
pssa_item_g3_eoy_p2_mcq_ak111
pssa_item_g3_eoy_p2_mcq_ac211
pssa_item_g3_eoy_p2_mcq_av411
pssa_item_g3_eoy_p2_mcq_av412
pssa_item_g3_eoy_p2_mcq_ak112
pssa_item_g3_eoy_p2_te_ak113
pssa_item_g3_eoy_p2_sa_ak112
pssa_item_g3_eoy_p2_mcq_ac211_ao5
pssa_item_g3_eoy_p3_mcq_bk112
pssa_item_g3_eoy_p3_mcq_bc211
pssa_item_g3_eoy_p3_mcq_bv412
pssa_item_g3_eoy_p3_mcq_bk113
pssa_item_g3_eoy_p3_mcq_bc312
pssa_item_g3_eoy_p3_ebsr_bc312
pssa_item_g3_eoy_p3_mcq_bc211_ao1
pssa_item_g3_eoy_p3_mcq_bv412_ao4
pssa_item_g3_eoy_p3_ebsr_bk111_ao7
pssa_item_g3_eoy_p3_ebsr_bc311_ao8
```
**Section 3 (15):**
```
pssa_item_g3_eoy_p1_mcq_bk111
pssa_item_g3_eoy_p1_mcq_bc212
pssa_item_g3_eoy_p1_mcq_bc311
pssa_item_g3_eoy_p1_mcq_bv411
pssa_item_g3_eoy_p1_mcq_bc313
pssa_item_g3_eoy_p1_te_bk112
pssa_item_g3_eoy_p1_sa_bk113
pssa_item_g3_eoy_p1_mcq_bc212_ao2
pssa_item_g3_eoy_p1_mcq_bv411_ao3
pssa_item_g3_eoy_p1_te_bc313_ao9
pssa_item_g3_eoy_p1_te_bv411_ao10
pssa_item_g3_eoy_conv_d122_address_commas
pssa_item_g3_eoy_conv_d123_dialogue
pssa_item_g3_eoy_conv_d124_possessives
pssa_item_g3_eoy_conv_d126_spelling
```

**`EOY_UNIT_SECTIONS`** (4 units → section):
```
pssa_psg_g3_eoy_p4_borrowed_bike  → 1
pssa_psg_g3_eoy_p2_broken_vase    → 2
pssa_pg_g3_eoy_p3_school_paired   → 2   (paired GROUP id is the unit)
pssa_psg_g3_eoy_p1_crayons        → 3
```

**`EOY_PASSAGE_ROWS`** (5 raw rows; mirror `MOY_PASSAGE_ROWS` shape `{ position, passageId, passageUnitId, sectionIndex }`):
```
1  pssa_psg_g3_eoy_p4_borrowed_bike    unit=pssa_psg_g3_eoy_p4_borrowed_bike   S1
2  pssa_psg_g3_eoy_p2_broken_vase      unit=pssa_psg_g3_eoy_p2_broken_vase     S2
3  pssa_psg_g3_eoy_p3_school_long_ago  unit=pssa_pg_g3_eoy_p3_school_paired    S2
4  pssa_psg_g3_eoy_p3_school_today     unit=pssa_pg_g3_eoy_p3_school_paired    S2
5  pssa_psg_g3_eoy_p1_crayons          unit=pssa_psg_g3_eoy_p1_crayons         S3
```

### 3.1 Student delivery order within each section
Mirror MOY: each analytics item is delivered **beside its host passage unit within its section**, never collected at the end. The §3 section arrays already interleave each AO next to its unit's operational items (P4 ops then AO-6; P2 ops then AO-5; P3 ops then AO-1/4/7/8; P1 ops then AO-2/3/9/10) — preserve that order.

## 4. Dual-bucket validation (`validateEoySelectedForm` — mirror `validateMoySelectedForm`)

Same gate set as MOY, with EOY-pinned expected values (all confirmed against the locked bank):
- `delivered_count` = 45; `delivered_points` = 61.
- `operational_total` = 35 items / 45 points; `analytics_total` = 10 items / 16 points.
- `passage_count` = 4 units / 5 raw rows.
- `answer_position_distribution`: eligible = 29, detail **exactly `[7, 8, 8, 6]`**, maxShare ≤ 0.40 (retain the exact-match check; expected = the const value).
- `operational_ec_caps`: operational EC-at-3 set **exactly `["E03.A-K.1.1.2", "E03.A-K.1.1.3"]`**, `max(operationalEcCounts) === 3`, max operational reading-MCQ EC repeat ≤ 2.
- `delivered_ec_caps`: delivered EC-at-3 set **exactly `["E03.A-K.1.1.2", "E03.A-K.1.1.3", "E03.A-V.4.1.2", "E03.B-V.4.1.1"]`**, max delivered reading-MCQ repeat ≤ 3.
- `conventions_count` = 9; `short_answer_count` = 2 (each 3pt); `multipoint`: 2 EBSR (2pt) + 2 TE grids (3pt) operational + the 2 analytics EBSR (AO-7/8) + 2 analytics grids (AO-9/10).
- Per-section gates: each section's delivered / operational items / operational points / analytics items / analytics points match §2; conventions land in S1 (5) + S3 (4); `estimatedMinutes` 60/80/60.
- `scoringBucket` correctness: every item's resolved bucket equals `expectedEoyBucket(id)` (the 10 AO IDs analytics_only; rest operational).
- **Scoring stays operational-only**: earned/total points exclude analytics (the existing `scorePssaForm` path is unchanged — analytics never contribute to the score, only to diagnostics).

## 5. Acceptance tests (`scripts/test-pssa-eoy-form-assembly.ts`, mirror the MOY test)

1. `assembleEoyDiagnosticFormFromPoolForTest` over the full merged pool returns a valid form: 45 delivered, 35 operational/45pts, 10 analytics/16pts, 61 delivered-possible.
2. All §4 gates return PASS; the EOY `contentHash` is stable across two assemblies (deterministic ordering).
3. Section maps equal §3 exactly (12/18/15; the pinned ID arrays); `EOY_UNIT_SECTIONS` + `EOY_PASSAGE_ROWS` as pinned.
4. `scoringBucket`: the 10 AO IDs resolve `analytics_only`, the other 35 `operational`; no bank item carries `scoringBucket`.
5. Answer-position distribution = `[7,8,8,6]`, maxShare 0.276; operational/delivered EC-at-3 sets exactly as §4.
6. **Operational-only scoring**: a fully-correct response set scores 45/45 operational; analytics items contribute 0 to earned/total.
7. **Student DTO leak-free**: no `scoringBucket` (or any bucket label) appears in the student projection for any of the 45 items.
8. **BOY + MOY byte-identical**: the BOY `GRADE3_DIAGNOSTIC_BLUEPRINT` and MOY `GRADE3_MOY_DIAGNOSTIC_BLUEPRINT` assemblies + `contentHash`es + section maps + gate outputs are unchanged (assert against the existing snapshots).

## 6. Gate battery (fail-closed)

Sibling worktrees have **no `node_modules`** — bare `npx` falls back to the global stub and fails. Symlink from `$PRIMARY` (§8) and invoke the **local** binaries explicitly; `npm run` scripts resolve `tsx` via the symlinked `node_modules/.bin`:

```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-content.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-form-assembly.ts
./node_modules/.bin/tsx scripts/test-pssa-moy-form-assembly.ts   # MOY assembly BYTE-IDENTICAL (regression)
npm run test:pssa-db6                            # BOY/foundation form assembly byte-identical (regression)
npm run test:pssa-pr-c                           # scoring (operational-only earned/total) unaffected
npm run test:pssa-pr-b                           # leak sweep (no bucket label in student projection)
echo "all EOY form-assembly gates passed"
```

Plus the **DTO bucket-leak check** (mirror the MOY spec §6): remove any stale student-DTO dump first, regenerate a fresh nonempty one, then grep it to confirm no `scoringBucket`/bucket label leaks into student projection; and the **repo-wide student-data guard** (no student-level PSSA report data committed).

## 7. Acceptance criteria — allowed tracked paths only

```
scripts/content/lib/pssa-form-assembly.ts        (add EOY const + EOY parallel symbols only; BOY/MOY paths byte-identical)
scripts/test-pssa-eoy-form-assembly.ts
scripts/test-pssa-content.ts                     (tranche wiring only, if needed)
specs/codex_pssa_eoy_form_assembly.md
```
Anything else (any merged content/exemplars, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 8. Process

Clean-worktree flow from `origin/main` **after EOY conventions is merged** (preserve `codex/teacher-lessons-tab-pr1`). Absolute-path, fail-closed:

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-eoy-form-assembly
cd "$PRIMARY"; git fetch origin
# preflight: conventions MUST be merged (assembly pool complete)
git cat-file -e origin/main:scripts/content/author-pssa-eoy-conventions.ts 2>/dev/null || { echo "STOP: EOY conventions not on origin/main yet"; exit 1; }
if git show-ref --verify --quiet refs/heads/codex/pssa-eoy-form-assembly; then echo "STOP: branch exists"; exit 1; fi
test ! -e "$WORKTREE" || { echo "STOP: worktree path exists"; exit 1; }
git worktree add "$WORKTREE" -b codex/pssa-eoy-form-assembly origin/main
cd "$WORKTREE"
test "$(git branch --show-current)" = "codex/pssa-eoy-form-assembly"
test -z "$(git status --short)"
# sibling worktree has no node_modules — guard the source, symlink, trap cleanup
test -d "$PRIMARY/node_modules" || { echo "STOP: $PRIMARY/node_modules missing"; exit 1; }
ln -s "$PRIMARY/node_modules" node_modules
trap 'rm -f "$WORKTREE/node_modules"' EXIT
# gate battery invokes ./node_modules/.bin/tsc and ./node_modules/.bin/tsx (NOT bare npx — §6)
cp "$PRIMARY/specs/codex_pssa_eoy_form_assembly.md" specs/
git add specs/codex_pssa_eoy_form_assembly.md
git diff --name-only HEAD     # expect exactly the 1 spec doc
git commit -m "EOY form assembly: spec"
```

Then: §0.1 preflight → implement EOY blueprint + parallel symbols + validate/assemble + EOY test → §6 gates (incl. BOY/MOY byte-identical regression) → scope guard → commit (no merge) → report. **Independent audit before merge** (Claude: assemble the EOY form + run all gates over the real pool, confirm BOY/MOY snapshots unchanged, reproducibility, exact-SHA-pinned merge).
