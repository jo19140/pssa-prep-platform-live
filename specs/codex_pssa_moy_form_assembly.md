# Codex Spec — MOY Form Assembly (Grade 3 diagnostic, 40 delivered / 35 operational)

**Type:** assembler PR (code, not content authoring). **Owner:** Jonathan. **Date:** 2026-06-22.

```
BLOCKED ON:
- MOY conventions merged and audited on origin/main
- exact nine conventions item IDs confirmed from committed exemplars/pssa_grade3_moy_conventions/backend.json
```

**Do NOT implement until both blockers clear.** This spec is for review/queuing now; authoring of the assembler waits for the conventions branch to land and its IDs to be audited.

## 0. Scope & guardrails

- **Extend the existing diagnostic assembler — do NOT create a parallel assembler.** Add a new `GRADE3_MOY_DIAGNOSTIC_BLUEPRINT` and a pinned MOY item-selection/section contract, and teach `assembleDiagnosticFormFromPool(...)` to accept the MOY `blueprintVersion`.
- **Do NOT modify** the BOY `GRADE3_DIAGNOSTIC_BLUEPRINT`, the BOY selected form, the flat foundation path, `pssaScoring.ts`, the distractorRole registry, delivery, schema, or any merged MOY **content** (P1–P4 + conventions bank items). Assembly only.
- **`scoringBucket` is assigned at assembly on `PssaFormItem`, never mutated on the bank item.** The student DTO must not expose the bucket label.
- STOP and report if anything needs a DB schema change.
- Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed flow (§7).

## 0.1 BLOCKED-ON preflight (run FIRST — FAIL-CLOSED)

1. Confirm `origin/main` contains all four MOY content units **and** the conventions tranche (P1, P2, P3, P4, conventions all merged + audited).
2. Read the **nine** conventions item IDs from committed `exemplars/pssa_grade3_moy_conventions/backend.json`; confirm 9 distinct ECs, all `INLINE_DROPDOWN`/1-pt/`passageId:null`. Fill the §3 conventions roster from these exact IDs.
3. Confirm all **31 known** MOY item IDs (§3) exist on `origin/main` with the expected types/points/ECs. If any of the 40 IDs is missing or mismatched, **STOP**.

## 1. Deliverables

- `GRADE3_MOY_DIAGNOSTIC_BLUEPRINT` (new const in `scripts/content/lib/pssa-form-assembly.ts`, alongside — not replacing — `GRADE3_DIAGNOSTIC_BLUEPRINT`).
- MOY support inside `assembleDiagnosticFormFromPool(...)` (branch on `blueprintVersion`); the BOY path stays byte-identical.
- Pinned MOY item-selection/section contract (the 40-ID roster + section placement + bucket map, §3).
- New `scripts/test-pssa-moy-form-assembly.ts` (acceptance tests, §5); wire any tranche hooks in `scripts/test-pssa-content.ts` only if needed.

## 2. `GRADE3_MOY_DIAGNOSTIC_BLUEPRINT`

```
blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1"   // distinct from BOY's "...-g3-v1"
module: "PSSA", subject: "ELA", gradeLevel: 3
deliveredItems: 40
operational:    { items: 35, points: 45 }
analyticsOnly:  { items: 5,  points: 8 }
deliveredPossiblePoints: 53            // 45 + 8; informational only — NEVER a student score
passageUnits: 4                        // P1, P2, P3 (paired group counts as ONE unit), P4
rawPassages: 5                         // P3 contributes two member passages
// section objects mirror GRADE3_DIAGNOSTIC_BLUEPRINT.sections field names (sectionType, label, estimatedMinutes,
// conventionsCount, readingPassages, shortAnswers) + the MOY delivered/op/analytics sub-totals.
// estimatedMinutes are MOY-specific pins that scale with each section's reading load + item count, so the HEAVIEST
// section gets the LONGEST estimate: S2 (1,680 words, 16 items incl. the paired P3 + a short answer) = 70;
// S1 (1,086-word drama + 5 conventions, 12 items) = 55; S3 (687-word museum-map w/ figure + 4 conventions, 12 items) = 50.
sections: [
  { sectionIndex: 1, sectionType: "conventions_reading", label: "Section 1", estimatedMinutes: 55,
    conventionsCount: 5, readingPassages: 1, shortAnswers: 0,
    delivered: 12, operationalItems: 11, operationalPoints: 12, analyticsItems: 1, analyticsPoints: 1 },
  { sectionIndex: 2, sectionType: "reading", label: "Section 2", estimatedMinutes: 70,
    conventionsCount: 0, readingPassages: 2, shortAnswers: 1,
    delivered: 16, operationalItems: 13, operationalPoints: 18, analyticsItems: 3, analyticsPoints: 4 },
  { sectionIndex: 3, sectionType: "conventions_reading", label: "Section 3", estimatedMinutes: 50,
    conventionsCount: 4, readingPassages: 1, shortAnswers: 1,
    delivered: 12, operationalItems: 11, operationalPoints: 15, analyticsItems: 1, analyticsPoints: 3 },
]
operationalAnswerPositionEligibleItems: 29          // 20 reading MCQ + 9 conventions INLINE_DROPDOWN (NOT "29 MCQ")
operationalAnswerPositionDistribution: [8, 7, 7, 7] // A/B/C/D over those 29 position-eligible items
maxCorrectPositionShare: 0.4
maxOperationalReadingMcqEcRepeats: 2                // operational reading-MCQ only (≤ 2)
maxDeliveredReadingMcqEcRepeats: 3                  // delivered reading items, op + analytics (≤ 3)
```

Word totals (committed): S1 = 1,086 · S2 = 884 + 796 = 1,680 · S3 = 687 · **Total = 3,453** (use the actual committed total, not the earlier planned 3,465).

## 3. MOY item roster, section placement & `scoringBucket` (pinned — NO shorthand)

**Roster-amendment requirement (do BEFORE implementation, at unblock):** resolve each of the 9 conventions items **by EC, not by backend array position** (a reordered backend must not move a convention to a different section); fill the full conventions item IDs below; commit this roster amendment to the spec, then begin implementing. The conventions **EC→section mapping is LOCKED**:
- **S1 conventions (items 1–5):** `E03.D.1.1.1`, `E03.D.1.1.4`, `E03.D.1.1.5`, `E03.D.1.1.6`, `E03.D.1.1.8` (keys B,D,A,C,A).
- **S3 conventions (items 6–9):** `E03.D.1.2.1`, `E03.D.1.2.3`, `E03.D.1.2.5`, `E03.D.2.1.1` (keys C,B,D,A).

**Section 1 (12 delivered) — P4 drama + conventions 1–5 + AO-2:**
| ID | type | pts | EC | bucket |
|---|---|---|---|---|
| `pssa_item_g3_moy_p4_mcq_ak111` | MCQ | 1 | A-K.1.1.1 | operational |
| `pssa_item_g3_moy_p4_mcq_ak112` | MCQ | 1 | A-K.1.1.2 | operational |
| `pssa_item_g3_moy_p4_mcq_ak113` | MCQ | 1 | A-K.1.1.3 | operational |
| `pssa_item_g3_moy_p4_mcq_av411` | MCQ | 1 | A-V.4.1.1 | operational |
| `pssa_item_g3_moy_p4_mcq_av412` | MCQ | 1 | A-V.4.1.2 | operational |
| `pssa_item_g3_moy_p4_mcq_av412_ao2` | MCQ | 1 | A-V.4.1.2 | **analytics_only** (AO-2) |
| `pssa_item_g3_moy_p4_ebsr_ak113` | EBSR | 2 | A-K.1.1.3 | operational |
| `«conv id for E03.D.1.1.1»` | INLINE_DROPDOWN | 1 | D.1.1.1 | operational |
| `«conv id for E03.D.1.1.4»` | INLINE_DROPDOWN | 1 | D.1.1.4 | operational |
| `«conv id for E03.D.1.1.5»` | INLINE_DROPDOWN | 1 | D.1.1.5 | operational |
| `«conv id for E03.D.1.1.6»` | INLINE_DROPDOWN | 1 | D.1.1.6 | operational |
| `«conv id for E03.D.1.1.8»` | INLINE_DROPDOWN | 1 | D.1.1.8 | operational |

**Section 2 (16 delivered) — P2 narrative + P3 paired informational + AO-1/3/4:**
| ID | type | pts | EC | bucket |
|---|---|---|---|---|
| `pssa_item_g3_moy_p2_mcq_ak111` | MCQ | 1 | A-K.1.1.1 | operational |
| `pssa_item_g3_moy_p2_mcq_ak112` | MCQ | 1 | A-K.1.1.2 | operational |
| `pssa_item_g3_moy_p2_mcq_ac211` | MCQ | 1 | A-C.2.1.1 | operational |
| `pssa_item_g3_moy_p2_mcq_av411` | MCQ | 1 | A-V.4.1.1 | operational |
| `pssa_item_g3_moy_p2_mcq_av412` | MCQ | 1 | A-V.4.1.2 | operational |
| `pssa_item_g3_moy_p2_te_ak113` | MATCHING_GRID | 3 | A-K.1.1.3 | operational |
| `pssa_item_g3_moy_p2_sa_ak112` | SHORT_ANSWER | 3 | A-K.1.1.2 | operational |
| `pssa_item_g3_moy_p3_mcq_bk112_t1` | MCQ | 1 | B-K.1.1.2 | operational |
| `pssa_item_g3_moy_p3_mcq_bk112_t2` | MCQ | 1 | B-K.1.1.2 | operational |
| `pssa_item_g3_moy_p3_mcq_bk113_t1` | MCQ | 1 | B-K.1.1.3 | operational |
| `pssa_item_g3_moy_p3_mcq_bc311_t1` | MCQ | 1 | B-C.3.1.1 | operational |
| `pssa_item_g3_moy_p3_mcq_bc312` | MCQ | 1 | B-C.3.1.2 | operational |
| `pssa_item_g3_moy_p3_ebsr_bc312` | EBSR | 2 | B-C.3.1.2 | operational |
| `pssa_item_g3_moy_p3_mcq_bv412_ao1` | MCQ | 1 | B-V.4.1.2 | **analytics_only** (AO-1) |
| `pssa_item_g3_moy_p3_mcq_bc211_ao3` | MCQ | 1 | B-C.2.1.1 | **analytics_only** (AO-3) |
| `pssa_item_g3_moy_p3_ebsr_bc311_ao4` | EBSR | 2 | B-C.3.1.1 | **analytics_only** (AO-4) |

**P3 paired group `pssa_pg_g3_moy_p3_mail_paired` (members `passage_1`/`passage_2`) must stay ATOMIC within S2** (one passage unit, two passage rows; all 9 P3 items in S2).

**Section 3 (12 delivered) — P1 museum-map + conventions 6–9 + AO-5:**
| ID | type | pts | EC | bucket |
|---|---|---|---|---|
| `pssa_item_g3_moy_p1_mcq_bk111` | MCQ | 1 | B-K.1.1.1 | operational |
| `pssa_item_g3_moy_p1_mcq_bc211` | MCQ | 1 | B-C.2.1.1 | operational |
| `pssa_item_g3_moy_p1_mcq_bc313` | MCQ | 1 | B-C.3.1.3 | operational |
| `pssa_item_g3_moy_p1_mcq_bv411` | MCQ | 1 | B-V.4.1.1 | operational |
| `pssa_item_g3_moy_p1_mcq_bc212` | MCQ | 1 | B-C.2.1.2 | operational |
| `pssa_item_g3_moy_p1_te_bk112` | MATCHING_GRID | 3 | B-K.1.1.2 | operational |
| `pssa_item_g3_moy_p1_sa_bk113` | SHORT_ANSWER | 3 | B-K.1.1.3 | operational |
| `pssa_item_g3_moy_p1_ao5_dd_bc313` | DRAG_DROP | 3 | B-C.3.1.3 | **analytics_only** (AO-5) |
| `«conv id for E03.D.1.2.1»` | INLINE_DROPDOWN | 1 | D.1.2.1 | operational |
| `«conv id for E03.D.1.2.3»` | INLINE_DROPDOWN | 1 | D.1.2.3 | operational |
| `«conv id for E03.D.1.2.5»` | INLINE_DROPDOWN | 1 | D.1.2.5 | operational |
| `«conv id for E03.D.2.1.1»` | INLINE_DROPDOWN | 1 | D.2.1.1 | operational |

**`scoringBucket = analytics_only` — exactly these 5 IDs (8 pts):** `pssa_item_g3_moy_p1_ao5_dd_bc313` (3) · `pssa_item_g3_moy_p3_mcq_bv412_ao1` (1) · `pssa_item_g3_moy_p3_mcq_bc211_ao3` (1) · `pssa_item_g3_moy_p3_ebsr_bc311_ao4` (2) · `pssa_item_g3_moy_p4_mcq_av412_ao2` (1). **`operational`:** every other item incl. all 9 conventions (35 items / 45 pts).

### 3.1 Student delivery order within each section (pinned — analytics beside its host, never collected at the end)

- **S1:** `p4_mcq_ak111, p4_mcq_ak112, p4_mcq_ak113, p4_mcq_av411, p4_mcq_av412, p4_mcq_av412_ao2` (AO-2 **adjacent to its A-V.4.1.2 sibling**), `p4_ebsr_ak113`, then conventions D.1.1.1, D.1.1.4, D.1.1.5, D.1.1.6, D.1.1.8.
- **S2:** all P2 items in the §3 order, then all P3 items in the §3 order — the P3 analytics (AO-1, AO-3, AO-4) sit **among the P3 host-passage items**, not after the conventions; the group stays contiguous.
- **S3:** all P1 items in the §3 order with `p1_ao5_dd_bc313` (AO-5) **beside the P1 items** (before conventions), then conventions D.1.2.1, D.1.2.3, D.1.2.5, D.2.1.1.

The **29 answer-position-eligible operational items** (A8/B7/C7/D7) = 20 reading MCQ (P1×5, P2×5, P3×5, P4×5) + 9 conventions INLINE_DROPDOWN. (EBSR / matching-grid / short-answer / drag-drop are multipoint and excluded — see §4 type totals.)

## 4. Dual-bucket validation (the new behavior vs BOY)

Unlike BOY (operational-only delivery), MOY delivers **all 40** items but only 35 are operational. Validation must compute and check the buckets **separately and never combine them**:

```
delivered:       40 items / 53 possible points (across both buckets)   // informational
operational:     35 items / 45 points   ← the student score basis
analytics_only:   5 items /  8 points   ← never added to the student score
```

- `total_points` (operational) gate: sum of `pointValue` over `scoringBucket==operational` items **=== 45**; operational item count **=== 35**.
- `analytics_points` gate: sum over `analytics_only` items **=== 8**; analytics item count **=== 5**; the analytics set === the pinned 5 IDs (§3).
- Section gates: delivered **12 / 16 / 12**; per-section operational and analytics sub-totals per §2.
- `operational EC table` and `analytics EC table` validated **separately** — analytics items never count against operational EC caps. **Two distinct reading-MCQ caps:** `maxOperationalReadingMcqEcRepeats: 2` (operational MCQ only) and `maxDeliveredReadingMcqEcRepeats: 3` (delivered op+analytics).
- `operationalAnswerPositionDistribution`: over the **29 `operationalAnswerPositionEligibleItems`** (= 20 reading MCQ + 9 conventions INLINE_DROPDOWN), `=== [8,7,7,7]` and `maxShare ≤ 0.4`.
- Existing `buildCanonical` already emits `scoringBucket` **only** for `analytics_only` items, so it is part of the content hash — **changing only a bucket changes the MOY form hash** (assert via the hash helper directly, §5).
- `PssaFormItem.scoringBucket` is set on the form row; **no bank-item mutation**. Student DTO carries no bucket label.

**Exact item-type totals (assert all three buckets):**
```
Delivered (40 items / 53 points):
  23 reading MCQ · 9 conventions · 3 EBSR · 3 TE (2 matching-grid + 1 drag-drop) · 2 short-answer
Operational (35 items / 45 points):
  20 reading MCQ · 9 conventions · 2 EBSR · 2 TE (matching-grid) · 2 short-answer
Analytics-only (5 items / 8 points):
  3 reading MCQ (AO-1, AO-2, AO-3) · 1 EBSR (AO-4) · 1 TE drag-drop (AO-5)
```

## 5. Acceptance tests (`scripts/test-pssa-moy-form-assembly.ts`)

**Positive assertions:**
1. **Exact 40 delivered item IDs** = the §3 roster (P1 8 + P2 7 + P3 9 + P4 7 + conventions 9), no extras/omissions.
2. **Operational totals**: exactly **35 items / 45 points** (`scoringBucket==operational`).
3. **Analytics totals**: exactly **5 items / 8 points**, and the analytics ID set === the pinned 5.
4. **Exact item-type totals** for all three buckets per §4 (delivered 23 MCQ/9/3/3/2; operational 20/9/2/2/2; analytics 3/0/1/1/0).
5. **Sections delivered 12 / 16 / 12**, with per-section op/analytics sub-totals per §2.
6. **5 `PssaFormPassage` rows total** — **S1: P4 only (1)**; **S2: P2 + both P3 member passages (3), P3 counted as ONE passage unit**; **S3: P1 only (1)**.
7. **P3 paired group atomic in S2** (both members + all 9 P3 items in S2; group not split).
8. **Conventions placement by EC**: D.1.1.1/D.1.1.4/D.1.1.5/D.1.1.6/D.1.1.8 in S1; D.1.2.1/D.1.2.3/D.1.2.5/D.2.1.1 in S3.
9. **`operationalAnswerPositionDistribution` `A8/B7/C7/D7`** over the 29 `operationalAnswerPositionEligibleItems` (20 reading MCQ + 9 conventions); `maxShare ≤ 0.4`.
10. **Separate EC caps (mind the domain — the count-3 set is over ALL operational items, not MCQ-only):**
    - **all operational items at EC count 3** = exactly **{E03.A-K.1.1.2, E03.A-K.1.1.3, E03.B-K.1.1.2}**, none above 3;
    - **operational reading-MCQ-only maximum = 2** (no operational reading-MCQ EC exceeds 2);
    - **all delivered items at EC count 3** = the three above **+ E03.A-V.4.1.2**, none above 3.
11. **Deterministic JSON + hash**: same inputs → identical canonical + `contentHash`.
12. **Bucket-hash sensitivity via the helper directly**: build two canonicals that differ **only** in one item's `scoringBucket` and assert `computePssaFormContentHash` differs. (Do **not** push a deliberately invalid bucket-swapped form through full assembly validation just to compare hashes.)
13. **Student delivery order** matches §3.1 (analytics items adjacent to their host-passage items, not collected at section end).

**Negative assertions (each must FAIL assembly/validation):**
14. wrong analytics bucket assignment (an AO item marked operational, or a non-AO item marked analytics_only) → fail.
15. an analytics item counted operationally (operational total becomes 36/46) → fail.
16. a missing analytics item (only 4 analytics) → fail.
17. an extra delivered item (41 items) → fail.
18. a convention assigned to the wrong section (e.g., D.1.1.8 placed in S3) → fail.
19. a P3 member/group split across sections → fail.
20. any item with missing/null `scoringBucket` after assembly → fail.

**Section metadata + word loads (assert exactly):**
21. Section `estimatedMinutes` = **55 / 70 / 50** (S1/S2/S3); `sectionType` = conventions_reading / reading / conventions_reading; `label` = Section 1/2/3.
22. Section reading word loads = **S1 1,086 · S2 1,680 · S3 687 · total 3,453** (S2 = P2 884 + P3 796).

**Regression:**
23. **No bank-item `scoringBucket` mutation** (bank backend bytes unchanged; bucket lives only on the form row).
24. **Student DTO has no bucket label** (no `scoringBucket`/`analytics_only` leakage in the student projection).
25. **BOY byte-identical**: the BOY `GRADE3_DIAGNOSTIC_BLUEPRINT` assembly + `contentHash` and the foundation flat path are unchanged.

## 6. Gate battery (fail-closed)

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts        # content/detector battery (explicit)

# (a) EXECUTABLE DTO bucket-leak check — remove any stale DTO FIRST, require a fresh nonempty one,
#     then grep it (a missing/stale file must NOT pass as "clean"):
DTO="${TMPDIR:-/tmp}/moy_student_dto.json"
rm -f "$DTO"
npx tsx scripts/test-pssa-moy-form-assembly.ts   # must write the assembled student DTO to "$DTO"
test -s "$DTO" || { echo "STOP: MOY student DTO was not freshly produced"; exit 1; }
if grep -niE "scoringBucket|analytics_only" "$DTO"; then
  echo "STOP: scoringBucket label leaked into the student DTO"; exit 1
fi

npm run test:pssa-db6        # BOY/foundation form assembly byte-identical (regression)
npm run test:pssa-pr-c       # scoring (operational-only earned/total) unaffected
npm run test:pssa-pr-b       # leak sweep (no bucket label in student projection)

# (b) EXECUTABLE repo-wide student-data guard (restored from the earlier diagnostic phases) —
#     no student-level PSSA report data may be committed. Exclude the known command-bearing specs
#     (which contain the literal phrase only inside THIS guard) to avoid the prior false positive:
matches="$(
  git grep -n "PSSA ELA: Anchor Analysis by Student" -- . \
    ':!specs/pssa-diagnostic-phase-1-5-te-items.md' \
    ':!specs/pssa-diagnostic-phase-2-section-aware-assembler.md' \
    ':!specs/pssa-diagnostic-phase-3-section-gated-delivery.md' \
    ':!specs/codex_pssa_moy_form_assembly.md' \
    || true
)"
if test -z "$matches"; then echo "privacy grep clean"; else echo "$matches"; echo "STOP: student-level PSSA report data found"; exit 1; fi

echo "all MOY form-assembly gates passed"
```

## 7. Process (run only after the blockers clear)

Clean worktree off `origin/main`, absolute-path fail-closed (same pattern as the content specs):

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-moy-form-assembly
cd "$PRIMARY"
git fetch origin
if git show-ref --verify --quiet refs/heads/codex/pssa-moy-form-assembly; then echo "STOP: branch exists"; exit 1; fi
test ! -e "$WORKTREE" || { echo "STOP: worktree path exists"; exit 1; }
git worktree add "$WORKTREE" -b codex/pssa-moy-form-assembly origin/main
cd "$WORKTREE"
test "$(git branch --show-current)" = "codex/pssa-moy-form-assembly"
test -z "$(git status --short)"

# Pin the audited base: the worktree must descend from the audited MOY content commit ae09b0b.
BASE="$(git rev-parse origin/main)"
git merge-base --is-ancestor ae09b0b "$BASE" || { echo "STOP: audited MOY content commit ae09b0b is not in the worktree base"; exit 1; }

cp "$PRIMARY/specs/codex_pssa_moy_form_assembly.md" specs/
git add specs/codex_pssa_moy_form_assembly.md
git diff --name-only HEAD     # expect exactly the 1 spec doc (still BLOCKED ON + «conv id …» placeholders)
git commit -m "MOY form assembly: spec"
```

The roster amendment (next) **replaces all nine `«conv id …»` placeholders by EC (each exactly once) AND flips BOTH blocked passages** so the committed source of truth is accurate:
- the `BLOCKED ON:` header block → `BLOCKERS CLEARED on origin/main at ae09b0b. / Nine conventions IDs resolved and verified by EC.`
- the `Do NOT implement until both blockers clear.` paragraph → `Blockers cleared — assembler implementation proceeds per this committed spec.` (Both content tranches merged on `origin/main` at `ae09b0b`; the nine conventions IDs resolved and verified by EC.)

The amendment commit must contain **exactly the one spec file** (checked at the top of Stage 2). The **final scope report uses `"$BASE"..HEAD`** (not `origin/main...HEAD`) so a later movement of `origin/main` cannot distort the branch diff.

**Committed-source verification — STAGE 1 (immediately after the spec commit, FAIL-CLOSED):** the documentation commit must contain **exactly** the one spec file.

```bash
actual="$(git show --name-only --pretty=format: HEAD | sed '/^$/d' | sort)"
expected="specs/codex_pssa_moy_form_assembly.md"
if [ "$actual" != "$expected" ]; then
  echo "STOP: documentation commit is not exactly the one spec doc"
  echo "--- actual ---"; printf '%s\n' "$actual"; exit 1
fi
echo "stage-1 committed-source verification passed"
```

Then: §0.1 BLOCKED-ON preflight (confirm conventions merged + read the 9 IDs) → **commit the §3 roster amendment (resolve all 9 conventions IDs by EC; replace every `«conv id …»` placeholder)** → run STAGE 2 below → implement the MOY blueprint + assembler branch → §5 tests → §6 gates → scope guard (allowed paths: `scripts/content/lib/pssa-form-assembly.ts`, `scripts/test-pssa-moy-form-assembly.ts`, `scripts/test-pssa-content.ts` wiring, `specs/codex_pssa_moy_form_assembly.md`) → commit (no merge) → report. Independent audit before merge. After merge: `git worktree remove /Users/diaz/pssa-moy-form-assembly`.

**Committed-source verification — STAGE 2 (after the roster amendment is committed, BEFORE implementation, FAIL-CLOSED):** no placeholders may remain, and every resolved convention ID must exist in `backend.json` mapped to its **locked EC** (not an array position).

```bash
test -n "${BASE:-}" || { echo "STOP: BASE is not set (run Step 1 in the same session)"; exit 1; }

# (0) the roster-amendment commit must contain EXACTLY the one spec file:
actual="$(git show --name-only --pretty=format: HEAD | sed '/^$/d' | sort)"
test "$actual" = "specs/codex_pssa_moy_form_assembly.md" || { echo "STOP: amendment commit is not exactly the spec"; printf '%s\n' "$actual"; exit 1; }

# All content checks run in Python on SCOPED regions (header = before "## 0."; roster = §3) so the §7
# verification code's own literals (which quote these very strings) cannot self-match. Backend from PINNED BASE.
git show "${BASE}:exemplars/pssa_grade3_moy_conventions/backend.json" > "${TMPDIR:-/tmp}/conv.json"
SPEC="$(git show HEAD:specs/codex_pssa_moy_form_assembly.md)" CONV="${TMPDIR:-/tmp}/conv.json" python3 - <<'PY' || exit 1
import os,json,sys
spec=os.environ["SPEC"]; conv=json.load(open(os.environ["CONV"]))
bad=[]
# scoped regions (exclude §7 verification code, which quotes these strings)
header=spec.split("## 0.")[0]
def block(a,b):
    i=spec.find(a); j=spec.find(b,i+1) if i>=0 else -1
    return spec[i:j] if i>=0 and j>=0 else ""
roster=block("## 3. MOY item roster","## 4.")
s1=block("Section 1 (12 delivered)","Section 2 (16 delivered)")
s3=block("Section 3 (12 delivered)","### 3.1")
# (1) header wording flipped (checked in the HEADER region only):
if "BLOCKED ON:" in header: bad.append("stale 'BLOCKED ON:' remains in header")
if "Do NOT implement until both blockers clear" in header: bad.append("stale 'Do NOT implement' paragraph remains in header")
if "BLOCKERS CLEARED on origin/main at ae09b0b" not in header: bad.append("cleared header wording missing")
if "Blockers cleared — assembler implementation proceeds" not in header: bad.append("cleared paragraph wording missing")
# (2) no unresolved placeholders left in the §3 roster:
if "«conv id" in roster: bad.append("unresolved «conv id …» placeholder remains in the §3 roster")
# (3) committed backend shape: exactly 9 items / 9 locked ECs / no dup / type / points / standalone:
items=conv["items"]
LOCKED={"E03.D.1.1.1","E03.D.1.1.4","E03.D.1.1.5","E03.D.1.1.6","E03.D.1.1.8",
        "E03.D.1.2.1","E03.D.1.2.3","E03.D.1.2.5","E03.D.2.1.1"}
ecs=[it.get("eligibleContent") for it in items]
if len(items)!=9: bad.append(f"backend has {len(items)} items, expected 9")
if len(set(ecs))!=len(ecs): bad.append("duplicate EC in backend")
if set(ecs)!=LOCKED: bad.append(f"backend ECs {sorted(set(ecs))} != locked {sorted(LOCKED)}")
for it in items:
    iid=it.get("id") or it.get("itemId")
    if it.get("interactionType")!="INLINE_DROPDOWN": bad.append(f"{iid}: interactionType != INLINE_DROPDOWN")
    if it.get("pointValue")!=1: bad.append(f"{iid}: pointValue != 1")
    if it.get("passageId") not in (None,""): bad.append(f"{iid}: passageId not null")
# (4) each S1/S3 ID pinned inside its section block, resolved by EC:
by_ec={it["eligibleContent"]:(it.get("id") or it.get("itemId")) for it in items}
for sec,(eclist,blk) in {"S1":(["E03.D.1.1.1","E03.D.1.1.4","E03.D.1.1.5","E03.D.1.1.6","E03.D.1.1.8"],s1),
                         "S3":(["E03.D.1.2.1","E03.D.1.2.3","E03.D.1.2.5","E03.D.2.1.1"],s3)}.items():
    if not blk: bad.append(f"{sec} roster block not found in spec"); continue
    for ec in eclist:
        iid=by_ec.get(ec)
        if not iid: bad.append(f"{sec}:{ec} has no item in backend"); continue
        if iid not in blk: bad.append(f"{sec}:{ec} -> {iid} not pinned inside the {sec} roster block")
if bad: print("STOP: stage-2 verification failed:\n  "+"\n  ".join(bad)); sys.exit(1)
print("stage-2 verification passed: header flipped, no roster placeholders, backend shape valid, 9 IDs resolve by EC in their section blocks")
PY
```

> Note: the assembler edits `scripts/content/lib/pssa-form-assembly.ts`, a **shared** file — the scope guard must show the BOY blueprint/const block and the foundation path **unchanged** (diff limited to the additive MOY const + the `blueprintVersion` branch). Any change to BOY lines → STOP.
