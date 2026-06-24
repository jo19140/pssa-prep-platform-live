# Codex Spec — EOY P2 Item Authoring (Grade 3, literary narrative "The Broken Vase")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-24.
**Preconditions:** EOY blueprint APPROVED/LOCKED (`specs/pssa_g3_eoy_blueprint_finalization.md`). P2 passage package APPROVED/LOCKED (`specs/pssa_g3_eoy_p2_passage_package.md`, **925 words**, third-person-limited narrative, **no figure**, `factCheckRequired:false`, 8-item reserved evidence pinned). EOY P1 merged on `origin/main`.
**Single passage (Category A literary narrative), NO figure, original fiction (`factCheckRequired:false`).** Section **S2**. Hosts **8 items: 7 operational (11 pts) + 1 analytics-only (AO-5, 1 pt).**

## 0. Scope & guardrails

- Author **one passage (P2) + 8-item set**, file-based (`noDbWrite`), all `reviewStatus=PENDING`/`itemStatus=candidate`.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry, delivery, the figure module, schema, or BOY/foundation/MOY/EOY-merged content. Do NOT assemble the form, and **do NOT set `scoringBucket`** (assembly-only; AO-5 becomes `analytics_only` at EOY form assembly).
- **No `type:"figure"` feature** — but `textFeaturesJson` is **non-empty**: it carries exactly one required **literary `figurative_language` feature** (the stomach-knot sentence), because the released-length literary stamina gate (`evaluatePssaPassageStaminaMetadata`) requires `pov` **and** `featureRows(passage).length > 0`. **No EBSR on P2.** Multipoint items are **MATCHING_GRID** (A-K.1.1.3 grid) + **SHORT_ANSWER** (A-K.1.1.2).
- STOP and report on any schema need. Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed (§9).

## 0.1 Source-package preflight (run FIRST — FAIL-CLOSED)

Verify the **committed** P2 package (`git show HEAD:specs/pssa_g3_eoy_p2_passage_package.md`):
- status **APPROVED / LOCKED**; passage body word count = **925** (programmatic, §9 — narrative has **no headings**, so count the §2 paragraph text only with the exact `author-pssa-moy-p1.ts` tokenizer);
- `factCheckRequired:false` intent (no figure, no fact-check records expected);
- the §7 reserved-evidence table (8 rows) + §7.1 pinned **action→plot-role** grid (3 rows: break→Starts the problem / stop-and-walk→Marks the turning point / put-ball-away→Shows the consequence) present;
- vocab targets **`shards`** (A-V.4.1.1) + **"stomach tied in a knot"** (A-V.4.1.2) present; the two A-C.2.1.1 POV facets (identify third person / private-thought access) present.
If any fails, **STOP**.

## 1. Deliverables

- `scripts/content/author-pssa-eoy-p2.ts` (mirror `author-pssa-moy-p2.ts` — single-passage literary narrative, **no figure**, `factCheckRequired:false`).
- Exemplars under `exemplars/pssa_grade3_eoy_p2/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit_report.csv) + wire into `scripts/test-pssa-content.ts`.
- `scripts/test-pssa-eoy-p2.ts` (structure + POV-split + reserved-evidence + grid + SA regression; §7).

## 2. Passage authoring

From the approved package (**verbatim text; do not rewrite**):
- `id` = `pssa_psg_g3_eoy_p2_broken_vase`; `title` "The Broken Vase"; gradeLevel 3; subject ELA; `passageType` `literary`; `genre` = `literary_narrative`; **`pov: "third_person"`**; **925-word** text verbatim; `wordCount` 925 (recompute with the repo helper and assert `=== 925`).
- **Required literary feature (NOT a figure) — pin completely:** `textFeaturesJson` carries **exactly one** `figurative_language` feature:
  ```ts
  { type: "figurative_language", featureText: "his stomach tied in a knot", sectionId: "paragraph_05", mustUseInItem: true, linkedByItemIds: ["pssa_item_g3_eoy_p2_mcq_av412"] }
  ```
  The stomach-knot is in the **5th** narrative paragraph, and `buildParagraphSectionMap` names literary sections `paragraph_01`, `paragraph_02`, … → **`paragraph_05`**. `featureText` is an exact passage substring (item 17's anchor); `mustUseInItem:true` + the item-17 link make `evaluatePssaTextFeatureItemLink` return **PASS** (not SKIP). `test-pssa-eoy-p2.ts` asserts **`passage.pov === "third_person"`** and **deep-equals the single feature object** above (and `textFeaturesJson.length === 1`, no `type:"figure"`).
- `factCheckRequired:false`; **no `factCheckNotesJson`** (→ `evaluatePssaDomainFactCheckRequired` returns **SKIP**).
- `staminaBand` = `released_length`; EOY identity in `provenanceJson` (`benchmarkSeason:"EOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-eoy-v1"`, `unit:"P2"`); metadata `internal_original`/`cleared_internal_original`/`commercialUseAllowed:true`/`needsLegalReview:false`; PENDING/candidate.
- Non-overlap: distinct from BOY + all MOY content + EOY P1/P3/P4 (package §8).

## 3. Item set (8 items) — IDs, types, keys, reserved evidence

Reserved evidence is **LOCKED in package §7 / §7.1** — author to those exact anchors; no two selected-response items reuse a primary sentence, POV facet, plot action, or vocabulary word.

| # | Item ID | EC | Type | Pts | Bucket (assembly) | Key | Reserved evidence (pkg §7) |
|---|---|---|---|---|---|---|---|
| 14 | `pssa_item_g3_eoy_p2_mcq_ak111` | A-K.1.1.1 | MCQ | 1 | operational | **A** (0) | why the vase mattered / where it came from |
| 15 | `pssa_item_g3_eoy_p2_mcq_ac211` | A-C.2.1.1 | MCQ | 1 | operational | **B** (1) | POV = third person (narrator outside, names Mateo) |
| 16 | `pssa_item_g3_eoy_p2_mcq_av411` | A-V.4.1.1 | MCQ | 1 | operational | **C** (2) | word meaning "shards" |
| 17 | `pssa_item_g3_eoy_p2_mcq_av412` | A-V.4.1.2 | MCQ | 1 | operational | **D** (3) | figurative "stomach tied in a knot" |
| 18 | `pssa_item_g3_eoy_p2_mcq_ak112` | A-K.1.1.2 | MCQ | 1 | operational | **B** (1) | inferred message (confession + Abuela's line; no stated maxim) |
| 19 | `pssa_item_g3_eoy_p2_te_ak113` | A-K.1.1.3 | MATCHING_GRID | 3 | operational | n/a | action→plot-role — **3 scored rows** (§7.1) |
| 20 | `pssa_item_g3_eoy_p2_sa_ak112` | A-K.1.1.2 | SHORT_ANSWER | 3 | operational | n/a | theme + ≥2 distinct details (hide-plan rejection / safe cleanup / new-use) |
| AO-5 | `pssa_item_g3_eoy_p2_mcq_ac211_ao5` | A-C.2.1.1 | MCQ | 1 | **analytics_only** | **C** (2) | what limited POV reveals — Mateo's private thoughts (≠ #15) |

Operational = 5 MCQ×1 + 1 grid×3 + 1 SA×3 = **11 pts** (7 items). Analytics = 1 MCQ×1 = **1 pt**. **No `scoringBucket` set in authoring.** MCQ keys — operational (14–18) **A, B, C, D, B** (per-passage A1/B2/C1/D1); analytics (AO-5) **C**. Per-form A8/B7/C7/D7 reconciles at EOY assembly. EC counts within P2 (A-C.2.1.1=2 [#15+AO-5], A-K.1.1.2=2 [#18 MCQ + #20 SA], others ≤1) — all within blueprint caps.

## 4. POV-split + narrative-evidence contract

- **Operational A-C.2.1.1 (item 15)** = *identify the point of view*: the story is told by a **narrator outside the story** who names Mateo and reports events ("Mateo was not supposed to play ball…"); the correct choice is **third person** (the storyteller is not a character).
- **AO-5 (A-C.2.1.1)** = *what third-person-limited narration lets the reader know* — the reader is shown **Mateo's private thoughts Abuela cannot see**. **AO-5 is pinned to one exact span: the empty-shelf thought** (`quotedSpan` = "reaching to dust the shelf and finding the empty spot bare"). **AO-5 must NOT reuse item-17's stomach-knot line or item-19's actions, and its span must be absent from item-20's support.**
- `test-pssa-eoy-p2.ts` asserts the two POV items bind to **different** evidence spans, AO-5's `quotedSpan` is exactly the empty-shelf span (a substring of §2), and that span does not appear in item-20's `acceptableTextSupport` and ≠ item-17 / item-19 anchors.

## 5. Answer-choice & distractor / TE / SA quality

- **MCQ** (items 14–18, AO-5): 4 choices = 1 correct + 3 incorrect. **Each of the three incorrect choices has a distinct, registered `distractorRole`** (∈ `mappingRegistry` reading roles); `distractorRole` IS the misconception tag (no separate field). **The correct choice sets `distractorRole: null`** (explicit `null`, not omitted — the detector checks `distractorRole !== null`). Truthful role-aligned rationales; minimally revise (never relabel) if two incorrect choices would share a role; balanced length/style (no correct-is-longest); no near-duplicates.
- **Per-choice evidence (executable — `PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED` + `PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED` + `PSSA_MCQ_EVIDENCE_SPAN_REUSED` are BLOCKERs):**
  - **Every structured choice — all 4, not just the correct one — carries a non-empty `rationale` and ≥1 `evidenceLink`.** Each choice is marked **`isCorrect: boolean`**; the **correct choice sets `distractorRole: null`** (explicit `null`, not omitted) and each **incorrect choice a distinct registered `distractorRole`**.
  - Choices must link to **distinct spans** (no shared single span). **Literal `evidenceLink`s carry integer `paragraphIndex`, `sentenceIndex`, `startChar`, `endChar`** alongside `quotedSpan`. Items 14/15/16/17/AO-5 use literal `evidenceKind:"quoted_span"` links.
  - **Literal coordinates are zero-based:** `paragraphIndex` and `sentenceIndex` are **zero-based array indices** (the detector indexes `sentenceGrid[paragraphIndex][sentenceIndex]` and requires the span be found in that cited sentence); `startChar` is **inclusive**, `endChar` is **exclusive**, and **`passage.text.slice(startChar, endChar)` must exactly equal `quotedSpan`** (the detector fails otherwise). Note: the literary text-feature `sectionId` (`"paragraph_05"`) uses the 1-based `paragraph_NN` section-map naming, which is separate from these zero-based evidence-link coordinates.
  - **Item 18 (inferred theme):** set top-level **`comprehensionKind:"inference"` + `comprehensionKindRationale:"<specific explanation>"`** (the detector reads `comprehensionKindRationale`; an inference/interpretation item missing it is a BLOCKER). Item 18's **correct** choice uses `evidenceKind:"whole_passage_synthesis"`; its three **distractors still carry rationale + their own evidence links**.
  - **AO-5** correct-choice span = exactly **"reaching to dust the shelf and finding the empty spot bare"** (substring of §2); the test asserts it is **absent from item 20's `acceptableTextSupport`** and ≠ item-17 / item-19 anchors.
  - The author asserts **`hasBlockingPassageSpecificityFailure(buildMcqPassageSpecificityReport(readingMcq, passages)) === false`** for the P2 reading MCQs.
- **Matching grid** (item 19) — engine-pinned: `scoringJson:{"totalPoints":3}`; `correctResponseJson.correctCells` = **exactly 3** `{rowId,columnId}` (one correct column per scored row; `pssaScoring.ts` requires `maxPoints === correctCells.length`, 1 pt/correct row). `rows` = the 3 §7.1 actions; `columns` = the 3 plot-roles (Starts the problem / Marks the turning point / Shows the consequence). Per-row `rationale` + `plausibleWrongRationales: Record<columnId,string>` for every scored row. Mirror the MOY P2 grid shape.
- **SA** (item 20): `rubric` (4-band `points3/2/1/0`) + `scoreBandExamples` (3/2/1/0) + `expectedAnswerCore` + `acceptableTextSupport` + `commonIncompletePatterns`; `requiresTextSupport`/`requiredSupportCount` per MOY P2 SA; `scoringJson:{"totalPoints":3,"autoScoringClaim":false}` **and** `auditMetadata.autoScoringClaim:false`. Must require the **inferred lesson + ≥2 distinct supporting details** drawn from the §7 item-20 set (hide-plan rejection / safe cleanup / new-use), **avoiding item-18's confession/Abuela-line anchor**.
- Student preview leak-free (no keys/rationales/`distractorRole`/`correctIndex`/`correctCells`/rubric/evidence spans); reviewer preview carries keys + rationales.

## 6. Inherited content gates (Rule 0)

Full stack: passage grounding (every choice/stem grounded in the P2 text), `PSSA_ITEM_EC_SKILL_MISMATCH` (item 18/20 = theme/message NOT plot-sequence; item 19 = sequence/character-arc; item 15/AO-5 = POV; item 17 = figurative), item-type contracts (MCQ/grid/SA), source-compliance no-copy, batch position-distribution. **No fact-check gate** (original fiction, `factCheckRequired:false`). WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

```
set -euo pipefail
npx tsc --noEmit
npx tsx scripts/content/author-pssa-eoy-p2.ts   # regenerate the committed exemplars before tests
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-eoy-p2.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + MOY + EOY P1 regression unaffected
echo "all EOY P2 gates passed"
```

**`scripts/test-pssa-eoy-p2.ts` asserts:** (1) 1 passage (`wordCount===925` via the exact repo helper, `literary_narrative`, `released_length`, **no figure**, `factCheckRequired:false`, no `factCheckNotesJson`) + 8 items; types/ECs/points per §3; op MCQ keys A,B,C,D,B; analytics AO-5 key C; no `scoringBucket` on any item. (2) Every MCQ has **all 4 structured choices, each with a non-empty `rationale` + ≥1 `evidenceLink`**; the **3 incorrect choices carry distinct registered `distractorRole`s and the correct choice `distractorRole: null` (explicit)**; literal links carry integer `paragraphIndex`/`sentenceIndex`/`startChar`/`endChar`; **no span reused**; and `hasBlockingPassageSpecificityFailure(buildMcqPassageSpecificityReport(readingMcq, passages)) === false`. (3) The two A-C.2.1.1 POV items bind to **distinct** evidence; **AO-5's correct-choice `quotedSpan` is exactly "reaching to dust the shelf and finding the empty spot bare"**, ≠ item-17/item-19 anchors and **absent from item-20's `acceptableTextSupport`**. (4) Item 19: `scoringJson.totalPoints===3`, **exactly 3 `correctCells`**, the 3 rows = the §7.1 actions, columns = the 3 plot-roles; each scored row has `plausibleWrongRationales`. (5) Item 20: 4-band rubric + `scoreBandExamples` + `commonIncompletePatterns`; `autoScoringClaim:false` in **both** `scoringJson` and `auditMetadata`; support set ≠ item-18 anchor and ≠ AO-5's empty-shelf span. (6) Reserved-evidence non-overlap across all 8 items (no shared primary sentence / POV facet / plot action / vocab word). (7) **Item 18** sets top-level `comprehensionKind:"inference"` + a non-empty `comprehensionKindRationale`; its correct choice uses `evidenceKind:"whole_passage_synthesis"` and its 3 distractors each carry their own `rationale` + `evidenceLink`s (items 14/15/16/17/AO-5 use literal `quoted_span` links). (8) **Stamina gates** (import from `scripts/content/lib/pssa-stamina-gates`): `evaluatePssaPassageStaminaMetadata(passage) === "PASS"`, `evaluatePssaTextFeatureIntegrity(passage, items) === "PASS"`, `evaluatePssaTextFeatureItemLink(passage, items) === "PASS"`, `evaluatePssaSectionLookbackBalance(passage, items) === "PASS"`, `evaluatePssaDomainFactCheckRequired(passage) === "SKIP"`. **Meaningful lookback:** because item 18's `whole_passage_synthesis` link adds *every* paragraph section (so the gate alone is trivially satisfied), the test **separately** asserts that the **quoted-span MCQs excluding item 18** (items 14/15/16/17/AO-5) cite evidence from **≥2 distinct `paragraph_NN` sections**. (9) EC-skill-match passes; **student DTO/preview leak-free** — no `correctIndex`, `correctCells`, `isCorrect`, `distractorRole`, rationales, `comprehensionKind`, `comprehensionKindRationale`, `rubric`, `scoreBandExamples`, `expectedAnswerCore`, `acceptableTextSupport`, `commonIncompletePatterns`, `auditMetadata`, `evidenceBinding`, `evidenceLinks`, or `quotedSpan` in any student-facing output.

## 7.1 Mechanical safeguards
- Author run (`noDbWrite`): `npx tsx scripts/content/author-pssa-eoy-p2.ts` writes ONLY `exemplars/pssa_grade3_eoy_p2/*`.
- Scope guard before + after commit: `git diff --name-only` limited to the §8 paths.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-eoy-p2.ts
scripts/test-pssa-eoy-p2.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_eoy_p2/*
specs/codex_pssa_eoy_p2_items.md
specs/pssa_g3_eoy_p2_passage_package.md
```
Anything else (BOY/foundation/MOY/EOY-P1/EOY-blueprint, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. **No figure asset / no `public/pssa/figures` path** (P2 has no figure).

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`); carry BOTH P2 docs into the worktree and commit them (they are not yet tracked) so §0.1 reads the approved 925-word package. Absolute-path, fail-closed (same pattern as the P1 spec). The committed-source verification asserts the package body word count == **925** (temp-file python, not a heredoc pipe), `factCheckRequired:false`, the §7.1 three action→plot-role rows, and the two distinct POV facets; exact spec-commit-set check; then preflight (§0.1) → author → §7 gates → scope guard → commit (no merge) → report. Independent audit before merge; pinned-merge flow (exact audited tip + base, exact file-set contract, gates on the merged result, reproducibility regeneration, race guards) as used for EOY P1.
