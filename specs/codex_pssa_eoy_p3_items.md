# Codex Spec — EOY P3 Item Authoring (Grade 3, paired informational "Going to School: Then & Now")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-24.
**Preconditions:** EOY blueprint APPROVED/LOCKED. P3 passage package APPROVED/LOCKED (`specs/pssa_g3_eoy_p3_passage_package.md`, **850 words / 425+425**, paired informational, 16 fact-check records, 10-item evidence + 3 EBSR shapes pinned). EOY P2 merged on `origin/main`.
**Paired informational group (2 members), NO figure, real factual content (`factCheckRequired:true` per member).** Section **S2**. Hosts **10 items: 6 operational (7 pts) + 4 analytics-only (6 pts)** — analytics = AO-1/AO-4/AO-7/AO-8.

## 0. Scope & guardrails

- Author **one paired group (P3) + 10-item set**, file-based (`noDbWrite`), `reviewStatus=PENDING`/`itemStatus=candidate`. Mirror `author-pssa-moy-p3.ts` (the merged MOY paired set) for group + EBSR shape.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry, delivery, the figure module, schema, or BOY/foundation/MOY/EOY-merged content. Do NOT assemble the form, and **do NOT set `scoringBucket`** (assembly-only; the 4 AO items become `analytics_only` at EOY assembly).
- **No figure.** Multipoint items are **EBSR** (item 13 cross-text + AO-7 + AO-8), each **`scoringJson.totalPoints:2`**. No MATCHING_GRID/SA on P3.
- STOP and report on any schema need. Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed (§9).

## 0.1 Source-package preflight (run FIRST — FAIL-CLOSED)

Verify the **committed** P3 package:
- status **APPROVED / LOCKED**; **Text 1 = 425 and Text 2 = 425 words** (programmatic, §9 — count each member's §2 prose separately with the exact `author-pssa-moy-p1.ts` tokenizer; combined 850);
- **16 `factCheckNotesJson` records** present (the literal JSON array), each with all keys (`claimId/claim/sourceTitle/organization/sourceUrl/claimSupported/dateAccessed/passageSlot`), `claimSupported:true`, HTTPS; **8 → `passage_1` (loc.gov), 8 → `passage_2` (nces.ed.gov)**;
- the §7 reserved-evidence table (10 rows) + §7.1 three pinned EBSR span sets present; the **six EBSR correct spans** are verbatim substrings of their member text;
- paired contract (members `informational`/no `staminaBand`; group `paired_informational`/`released_length`).
If any fails, **STOP**.

## 1. Deliverables

- `scripts/content/author-pssa-eoy-p3.ts` (mirror `author-pssa-moy-p3.ts` — paired group + members + EBSR + cross-text evidence + per-member `factCheckNotesJson`).
- Exemplars under `exemplars/pssa_grade3_eoy_p3/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit_report.csv) + wire into `scripts/test-pssa-content.ts`.
- `scripts/test-pssa-eoy-p3.ts` (paired structure + EBSR + per-choice evidence + viewpoint-synthesis + six-span uniqueness regression; §7).

## 2. Group + member authoring

From the approved package (**verbatim text; do not rewrite**):
- **Group** `pssa_pg_g3_eoy_p3_school_paired`: `groupType:"paired_informational"`, `genre:"paired_informational"`, **`staminaBand:"released_length"`**, title "Going to School: Then & Now", **`wordCount: 850`** (= p1.wordCount + p2.wordCount), **`domainVocabularyLoad:"medium"`**; two `paired_member` features `{type:"paired_member", slot, title}`; each member's `passageContentHashSnapshot` **(must equal that member's actual `contentHash`)**; group `contentHash` = `stableHash({id, groupType, title, members:[p1.contentHash, p2.contentHash]})` (the test **recomputes and compares** it, not merely checks presence) — mirror MOY P3.
- **Member `passage_1`** `pssa_psg_g3_eoy_p3_school_long_ago`: title "School Long Ago"; `passageType:"informational"`, `genre:"informational"`, **no `staminaBand`**, **`domainVocabularyLoad:"medium"`**, **`textFeaturesJson:[]`**; **425-word** text verbatim; `wordCount` 425; `factCheckRequired:true` + the **8 `passage_1`** records; `provenanceJson` `{benchmarkSeason:"EOY", blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-eoy-v1", unit:"P3", passageSlot:"passage_1"}`.
- **Member `passage_2`** `pssa_psg_g3_eoy_p3_school_today`: title "School Today"; same shape (`informational`, no `staminaBand`, `domainVocabularyLoad:"medium"`, `textFeaturesJson:[]`); **425-word** text verbatim; `wordCount` 425; the **8 `passage_2`** records; `passageSlot:"passage_2"`.
- Metadata `internal_original`/`cleared_internal_original`/`commercialUseAllowed:true`/`needsLegalReview:false`; PENDING/candidate. Non-overlap per package §8.

## 3. Item set (10 items) — IDs, types, keys, reserved evidence

Every item carries `passageGroupId:"pssa_pg_g3_eoy_p3_school_paired"`. Reserved evidence LOCKED in package §7/§7.1.

| # | Item ID | EC | Type | Pts | Bucket | Key | Reserved evidence (pkg §7) |
|---|---|---|---|---|---|---|---|
| 8 | `pssa_item_g3_eoy_p3_mcq_bk112` | B-K.1.1.2 | MCQ | 1 | operational | **B** (1) | Text 1 main-idea gist — `whole_passage_synthesis` p1 |
| 9 | `pssa_item_g3_eoy_p3_mcq_bc211` | B-C.2.1.1 | MCQ | 1 | operational | **D** (3) | Text 1 viewpoint (limited-but-valuable) — `whole_passage_synthesis` p1 |
| 10 | `pssa_item_g3_eoy_p3_mcq_bv412` | B-V.4.1.2 | MCQ | 1 | operational | **A** (0) | "heart" = central place (p1) |
| 11 | `pssa_item_g3_eoy_p3_mcq_bk113` | B-K.1.1.3 | MCQ | 1 | operational | **C** (2) | historical sequence (schools grew → attendance laws → 1920 ages 8–14), p1 |
| 12 | `pssa_item_g3_eoy_p3_mcq_bc312` | B-C.3.1.2 | MCQ | 1 | operational | **B** (1) | materials difference: slate (p1) vs online textbooks (p2) |
| 13 | `pssa_item_g3_eoy_p3_ebsr_bc312` | B-C.3.1.2 | **EBSR** (cross-text) | 2 | operational | PartA **B** (1) | shared purpose — §7.1 |
| AO-1 | `pssa_item_g3_eoy_p3_mcq_bc211_ao1` | B-C.2.1.1 | MCQ | 1 | **analytics_only** | **A** (0) | Text 2 viewpoint (tools help but teachers central) — `whole_passage_synthesis` p2 |
| AO-4 | `pssa_item_g3_eoy_p3_mcq_bv412_ao4` | B-V.4.1.2 | MCQ | 1 | **analytics_only** | **C** (2) | "window" = a way to reach new things (p2) |
| AO-7 | `pssa_item_g3_eoy_p3_ebsr_bk111_ao7` | B-K.1.1.1 | **EBSR** | 2 | **analytics_only** | PartA **A** (0) | explicit lunch — §7.1 (p1) |
| AO-8 | `pssa_item_g3_eoy_p3_ebsr_bc311_ao8` | B-C.3.1.1 | **EBSR** | 2 | **analytics_only** | PartA **C** (2) | devices → own pace — §7.1 (p2) |

Operational = 5 MCQ×1 + 1 EBSR×2 = **7 pts** (6 items). Analytics = 2 MCQ×1 + 2 EBSR×2 = **6 pts** (4 items). **No `scoringBucket` in authoring.** MCQ keys (8–12) **B,D,A,C,B**; analytics MCQ AO-1/AO-4 **A,C**; EBSR Part-A keys 13/AO-7/AO-8 **B,A,C**. Per-form A8/B7/C7/D7 reconciles at EOY assembly. EC repeats within P3: B-C.2.1.1 ×2, B-C.3.1.2 ×2, B-V.4.1.2 ×2 — within caps.

## 4. Paired + viewpoint contract

- **Items 8, 9, AO-1 use `evidenceKind:"whole_passage_synthesis"`** with `passageSlot` (8/9 → `passage_1`, AO-1 → `passage_2`; **no fabricated `quotedSpan`** on a synthesis link). **Comprehension-kind split:** **item 8 = `comprehensionKind:"synthesis"`** (a factual whole-text **main-idea** synthesis — the detector recognizes `synthesis` separately and does **not** require a rationale); **items 9 and AO-1 = `comprehensionKind:"interpretation"` (or `"inference"`) + a non-empty `comprehensionKindRationale`** (author **viewpoint**; inference/interpretation without it → `PSSA_MCQ_COMPREHENSION_KIND_RATIONALE_REQUIRED` BLOCKER). **#8 (gist) and #9 (evaluative viewpoint) are distinct constructs**; `test-pssa-eoy-p3.ts` asserts their correct-answer texts (and the #9/AO-1 rationales) differ. **AO-1 ≠ #9** (Text 2 stance: tools help but teachers/training central).
- **Paired-item linkage contract (mirror MOY P3):** the **two cross-text items, #12 and #13**, set `passageId:null`, `isCrossText:true`, `requiredEvidenceSlotsJson:["passage_1","passage_2"]`, and **two `passageLinks`**. **Every other item (8/9/10/11/AO-1/AO-4/AO-7/AO-8) is single-text:** `passageId` = its member id, `isCrossText:false`, **no** `requiredEvidenceSlotsJson`, **one** `passageLink`. `passageLinks` are `{passageId, role:"primary", sortOrder}` for **MCQ** items and `{passageId, role:"primary"}` (**no `sortOrder`**) for **EBSR** items.
- **Item 12** = a single **materials difference** (MCQ), spans slate (p1) + online-textbook (p2). **Item 13** = the **shared-purpose** cross-text EBSR (§7.1). The two B-C.3.1.2 items use distinct surfaces and the dedicated purpose sentences are **not the primary evidence** for #9/AO-1.
- Cross-text item 13's `partB` must include **both slots** and its correct set is **one span per text** (asserted locally in `test-pssa-eoy-p3.ts`); single-text EBSRs AO-7 (p1) / AO-8 (p2) use one slot.

## 5. Answer-choice / EBSR / per-choice-evidence quality (P2-hardened detector contract)

- **Per-choice evidence (BLOCKERs `PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED` / `PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED` / `PSSA_MCQ_EVIDENCE_SPAN_REUSED`):** **every MCQ structured choice (all 4)** carries a non-empty `rationale` + ≥1 `evidenceLink`, `isCorrect:boolean`, correct choice **`distractorRole:null`** (explicit), incorrect choices **distinct registered `distractorRole`s**; choices link **distinct spans**. Literal `evidenceLink`s carry `quotedSpan` + integer **zero-based** `paragraphIndex`/`sentenceIndex` + `startChar`/`endChar` with **`passage.text.slice(startChar,endChar)===quotedSpan`** (paragraph/sentence indices are within the cited **member**); whole-passage-synthesis links use `evidenceKind:"whole_passage_synthesis"` + `passageSlot`. Cross-text links additionally carry `passageSlot`. Assert `hasBlockingPassageSpecificityFailure(buildMcqPassageSpecificityReport(readingMcq, members)) === false`.
- **EBSR** (13, AO-7, AO-8) — mirror MOY P3: `interactionType:"EBSR"`; `partA` (single-best MCQ, choices with role/rationale) → `correctResponseJson.partA.correctIndex`; `partB` `responseSpecJson.partB.choices[]` (each `{text, passageSlot}`) + `correctResponseJson.partB.correctIndices` + `requiredSelectionCount:2`; `scoringJson:{totalPoints:2}`; `passageLinks` `{passageId, role}`. Pin exactly the §7.1 Part-A answers and the two Part-B correct spans each; **no "and/or"**; the **six** correct Part-B spans are pairwise distinct and distinct from the MCQ anchors (asserted locally in `test-pssa-eoy-p3.ts`).
- Student preview leak-free.

## 6. Inherited content gates (Rule 0)

Passage grounding; `PSSA_ITEM_EC_SKILL_MISMATCH` (#8 main-idea, #9/AO-1 author POV, #11 sequence, #12/#13 compare-contrast, AO-8 logical connection, AO-7 explicit); `PSSA_DOMAIN_FACT_CHECK_REQUIRED` per member (informational + the 8 records each → **PASS**); item-type contracts; source-compliance no-copy; batch position-distribution. WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

```
set -euo pipefail
npx tsc --noEmit
npx tsx scripts/content/author-pssa-eoy-p3.ts
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-eoy-p3.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6
echo "all EOY P3 gates passed"
```

**`scripts/test-pssa-eoy-p3.ts` asserts:** (1) group `paired_informational`/`released_length` + two members (`informational`, no `staminaBand`, each `wordCount===425`, `factCheckRequired:true`, 8 complete records, domains loc.gov/nces.ed.gov) + 10 items; types/ECs/points per §3; MCQ keys B,D,A,C,B + AO-1/AO-4 A,C; EBSR Part-A keys B,A,C; no `scoringBucket`. (2) Every MCQ: all 4 choices have `isCorrect`+`rationale`+≥1 `evidenceLink`; correct `distractorRole:null`, incorrect distinct registered roles; literal links zero-based + `slice===quotedSpan`; no span reuse; `hasBlockingPassageSpecificityFailure(...)===false`. (3) #8 vs #9 distinct constructs; #8/#9/AO-1 use `whole_passage_synthesis`; **#8 sets `comprehensionKind:"synthesis"`**; **#9/AO-1 set `interpretation`/`inference` with non-empty `comprehensionKindRationale`**. (4) EBSR shapes per §7.1: item 13 cross-text `partB` spans both slots with one correct per text; AO-7 two `passage_1` lunch sentences; AO-8 two `passage_2` device/own-pace spans; every correct Part-B span verbatim; six spans pairwise distinct + distinct from MCQ anchors. (5) **Paired checks — implemented as LOCAL assertions in `test-pssa-eoy-p3.ts` (mirror `test-pssa-moy-p3.ts`; do NOT import paired-gate helpers):** **group shape** (`groupType`/`genre` = `paired_informational`, `staminaBand:"released_length"`, exactly two `paired_member` features, member `passageContentHashSnapshot`s, group `contentHash`); **each member** `passageType:"informational"`/`genre:"informational"`/no `staminaBand`/`wordCount===425`/`factCheckRequired:true`/8 records; **`evaluatePssaDomainFactCheckRequired(member)==="PASS"`** and **`evaluatePssaPassageStaminaMetadata(member) === "SKIP"`** (both imported from `scripts/content/lib/pssa-stamina-gates.ts` — the only gate functions imported); **item-13 evidence slots** (Part B spans both `passage_1` and `passage_2`, exactly one correct per member); **paired lookback** (evidence across the item set touches both member slots and multiple evidence surfaces); **multipoint overlap** (the six correct EBSR Part-B spans pairwise distinct + distinct from MCQ anchors). **Do NOT import** `evaluatePssaPairedGroupStaminaMetadata`/`evaluatePssaRequiredEvidenceSlots`/`evaluatePssaPairedSectionLookbackBalance`/`evaluatePssaPairedMultipointEvidenceOverlap` — those helpers exist in `pssa-paired-passage-gates.ts` but couple to `PairedPassageGroupInput`/`PairedItemInput`; the merged MOY P3 test uses local assertions, so do the same. Any new shared paired-gate helper = a separate infra branch → STOP. (6) **EBSR scorer smoke** (mirror MOY P3): for **each** of items 13, AO-7, AO-8, a fully-correct response (`partA.correctIndex` + the two `partB.correctIndices`) through `scorePssaItem` returns `{status:"scored", pointsEarned:2, maxPoints:2, detail:"ebsr_full_credit"}`. (7) EC-skill-match passes; **student preview leak-free** — denylist includes `correctIndex`, `correctCells`, `partA`/`partB` correct indices, `isCorrect`, `distractorRole`, rationales, `comprehensionKind`/`comprehensionKindRationale`, `evidenceBinding`, `evidenceLinks`, `quotedSpan`, **`correctResponseJson`, `answerKey`, `factCheckNotesJson`, `claimId`, `sourceUrl`** (MOY P3 guards fact-check data from the student preview); and the **reviewer preview** is asserted to **contain** the answer keys/rationales and **all 16 fact-check records**.

## 7.1 Mechanical safeguards
- Author run (`noDbWrite`): `npx tsx scripts/content/author-pssa-eoy-p3.ts` writes ONLY `exemplars/pssa_grade3_eoy_p3/*`.
- Scope guard before + after commit limited to §8 paths.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-eoy-p3.ts
scripts/test-pssa-eoy-p3.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_eoy_p3/*
specs/codex_pssa_eoy_p3_items.md
specs/pssa_g3_eoy_p3_passage_package.md
```
Anything else (BOY/foundation/MOY/EOY-P1/P2/blueprint, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. **No figure asset / no `public/pssa/figures` path.**

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`); the two P3 specs are **not yet tracked**, so copy BOTH into the worktree and commit them (hash-pinned in the handoff) so §0.1 reads the approved package. Absolute-path, fail-closed (same pattern as EOY P2). Committed-source verification asserts each member body == **425** (temp-file python), 16 records (8/8, loc.gov + nces.ed.gov), the six EBSR spans verbatim, and the paired contract; exact spec-commit-set check; then preflight (§0.1) → author → §7 gates → scope guard → commit (no merge) → report. Independent audit before merge; pinned-merge flow (exact audited tip + base, exact file-set contract, gates on the merged result, reproducibility regeneration, race guards) as used for EOY P1/P2.
