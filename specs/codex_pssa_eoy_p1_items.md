# Codex Spec — EOY P1 Item Authoring (Grade 3, informational single "How Crayons Are Made")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-23.
**Preconditions:** EOY blueprint APPROVED/LOCKED (`specs/pssa_g3_eoy_blueprint_finalization.md`). P1 passage package APPROVED/LOCKED (`specs/pssa_g3_eoy_p1_passage_package.md`, **712 words**, factual claims source-backed, figure + 9 fact-check records, 11-item reserved evidence pinned). MOY merged on `origin/main` (`6420cae`). **Process-figure infrastructure prerequisite merged** (`specs/codex_pssa_process_figure_support.md` / branch `codex/pssa-process-figure-support`): the shared figure contract supports `figureKind:"process"` — **STOP** if `validatePssaFigureFeatureShared` on `origin/main` still rejects a non-map figure.
**Single passage (Category B informational), HAS a process-diagram figure, real factual content (`factCheckRequired:true`).** Section **S3**. Hosts **11 items: 7 operational (11 pts) + 4 analytics-only (8 pts)** — the analytics are AO-2/AO-3/AO-9/AO-10 from the locked blueprint.

## 0. Scope & guardrails

- Author **one passage (P1) + its figure + 11-item set**, file-based (`noDbWrite`), all `reviewStatus=PENDING`/`itemStatus=candidate`.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry, delivery, the figure module, schema, or BOY/foundation/MOY/EOY-blueprint content. Do NOT assemble the form, and **do NOT set `scoringBucket`** (assembly-only; the 4 AO items become `analytics_only` at EOY form assembly).
- **No EBSR on P1.** Multipoint items are **MATCHING_GRID** (B-K.1.1.2 grid, AO-9 grid, AO-10 grid) + **SHORT_ANSWER** (B-K.1.1.3). The figure is the **existing `type:"figure"` feature path — no new player/route**; AO-9 uses the **existing keyboard-operable matching-grid interaction** (not drag-drop).
- STOP and report on any schema need. Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed (§9).

## 0.1 Source-package preflight (run FIRST — FAIL-CLOSED)

Verify the **committed** P1 package (`git show HEAD:specs/pssa_g3_eoy_p1_passage_package.md`):
- status **APPROVED / LOCKED**; passage body word count = **712** (programmatic, §9 — counts the §2 paragraph text **plus the five stage headings**, exact repo helper);
- **no stale terms**: `block of wax`, `Hard wax`, `misshapen`, `uneven shapes`, `trained workers`, `sent to stores` all absent;
- **9 `factCheckNotesJson` records** present (the literal JSON array), each with all seven keys (`claimId/claim/sourceTitle/organization/sourceUrl/claimSupported/dateAccessed`), `claimSupported:true`, HTTPS; the two source domains are `crayola.com` + `madehow.com`;
- the §7 reserved-evidence table (11 rows) + §7.1 pinned grid/AO-9 statements + §3.1 figure spec (`figureKind:"process"`, 5 stages, `order` 1–5, generator-derived `longDescription`, field named `altText`, `stage_pack` for the operational B-C.3.1.3 MCQ) all present; the §7.1 **item-6 grid has exactly 3 statements** and the **AO-9 grid has exactly 3 stage rows (stages 1, 3, 5)**;
- the shared figure contract on `origin/main` already accepts `figureKind:"process"` (prerequisite merged) — STOP if not.
If any fails, **STOP**.

## 1. Deliverables

- `scripts/content/author-pssa-eoy-p1.ts` (mirror `author-pssa-moy-p1.ts` — single-passage informational WITH a figure feature + `factCheckNotesJson`).
- Exemplars under `exemplars/pssa_grade3_eoy_p1/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV) + the figure asset; wire into `scripts/test-pssa-content.ts`.
- `scripts/test-pssa-eoy-p1.ts` (structure + figure + fact-check + reserved-evidence regression; §7).

## 2. Passage + figure authoring

From the approved package (**verbatim text; do not rewrite**):
- `id` = `pssa_psg_g3_eoy_p1_crayons`; `title` "How Crayons Are Made"; gradeLevel 3; subject ELA; `genre` = `informational_description`; **712-word** text verbatim; `wordCount` 712. **The `eoyP1PassageText` string embeds the five stage headings** ("Melting the Wax", "Adding the Color", "Filling the Molds", "Pushing Out and Checking", "Wrapping and Packing") inline with the paragraphs — the repo helper `wordCount(text)` (= `(text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length`, the exact `author-pssa-moy-p1.ts` helper) must return **712** over the full string (696 paragraph words + 16 heading words = 712, exact-helper verified); assert `wordCount === 712`.
- **Figure** in `textFeaturesJson` (`type:"figure"`, `figureKind:"process"`), pinned fields (per the generalized shared contract):
  - `featureId: "eoy_p1_crayon_process"` (the field is `featureId`, **not** `figureFeatureId`).
  - `title: "How a Crayon Is Made"` (mandatory; also rendered as an SVG `<text>` label).
  - `sectionId: "section_0_intro"` — **verify fail-closed** that this id is in `buildPssaStaminaSectionMap(passage).map(s => s.sectionId)` before pinning (the intro-headed passage yields `section_0_intro`; STOP if absent).
  - `assetPath: "/pssa/figures/g3_eoy_p1_crayon_process.svg"`; `assetSha256` = `sha256:<64-hex>` computed from the committed SVG via `computePssaFigureAssetSha256`.
  - `altText` = the literal package §3.1 string (author-supplied, **not** generated).
  - `structuredData.stages` = **exactly 5** records, `order` 1–5, `targetId` `stage_melt`/`stage_color`/`stage_mold`/`stage_check`/`stage_pack`, `label` + `caption` per package §3.1.
  - `longDescription` = **`generatePssaFigureLongDescription(structuredData)`** (the deterministic process generator output — do **not** hand-write it); it must equal the package §3.1 pinned generated string.
  - SVG `<text>` labels must include `title` + **every stage `label` AND every stage `caption`** — i.e. `[figure.title, ...stages.flatMap((s) => [s.label, s.caption])]` (node-side `assertSvgLabelsMatchStructuredData`, generalized by the prerequisite); allowlist-compliant; **no color-only meaning**.
  - Validate via the shared `validatePssaFigureFeatureShared` + node `validatePssaFigureAssetNode` paths (mirror MOY P1's call sites).
- `factCheckRequired:true` + the **9 `factCheckNotesJson` records** pasted verbatim from package §3 (reviewer-only; `PSSA_DOMAIN_FACT_CHECK_REQUIRED` gate enforces). Sources: Crayola manufacturing FAQ, Crayola science FAQ, MadeHow.
- `staminaBand` = `released_length`; EOY identity in `provenanceJson` (`benchmarkSeason:"EOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-eoy-v1"`, `unit:"P1"`); metadata `internal_original`/`cleared_internal_original`/`commercialUseAllowed:true`/`needsLegalReview:false`; PENDING/candidate.
- Non-overlap: distinct from BOY + all MOY content (package §8).

## 3. Item set (11 items) — IDs, types, keys, reserved evidence

Reserved evidence is **LOCKED in package §7 / §7.1** — author to those exact anchors; do not reuse a primary sentence, heading function, diagram fact, or vocab word across selected-response items.

| # | Item ID | EC | Type | Pts | Bucket (assembly) | Key | Reserved evidence (pkg §7) |
|---|---|---|---|---|---|---|---|
| 1 | `pssa_item_g3_eoy_p1_mcq_bk111` | B-K.1.1.1 | MCQ | 1 | operational | **C** (2) | pigment colors the wax |
| 2 | `pssa_item_g3_eoy_p1_mcq_bc212` | B-C.2.1.2 | MCQ | 1 | operational | **A** (0) | headings as locators |
| 3 | `pssa_item_g3_eoy_p1_mcq_bc311` | B-C.3.1.1 | MCQ | 1 | operational | **D** (3) | incomplete mixing → bubbles |
| 4 | `pssa_item_g3_eoy_p1_mcq_bv411` | B-V.4.1.1 | MCQ | 1 | operational | **B** (1) | "harden" (melting context) |
| 5 | `pssa_item_g3_eoy_p1_mcq_bc313` | B-C.3.1.3 | MCQ | 1 | operational | **C** (2) | double-paper detail → locate stage 5 (`stage_pack`) |
| 6 | `pssa_item_g3_eoy_p1_te_bk112` | B-K.1.1.2 | MATCHING_GRID | 3 | operational | n/a | main-idea/detail — **3 scored rows** (§7.1 statements) |
| 7 | `pssa_item_g3_eoy_p1_sa_bk113` | B-K.1.1.3 | SHORT_ANSWER | 3 | operational | n/a | sequence (≥2 steps + reasoning) |
| 8 | `pssa_item_g3_eoy_p1_mcq_bc212_ao2` | B-C.2.1.2 | MCQ | 1 | **analytics_only** | **A** (0) | the diagram/captions as organizer (≠ #2) |
| 9 | `pssa_item_g3_eoy_p1_mcq_bv411_ao3` | B-V.4.1.1 | MCQ | 1 | **analytics_only** | **D** (3) | "batch" (≠ #4) |
| 10 | `pssa_item_g3_eoy_p1_te_bc313_ao9` | B-C.3.1.3 | MATCHING_GRID | 3 | **analytics_only** | n/a | stage→statement — **3 scored rows** (stages 1, 3, 5; §7.1, non-caption) |
| 11 | `pssa_item_g3_eoy_p1_te_bv411_ao10` | B-V.4.1.1 | MATCHING_GRID | 3 | **analytics_only** | n/a | match *evenly / runny / recast* to meanings — **3 scored rows** |

Operational = 5 MCQ×1 + 1 grid×3 + 1 SA×3 = **11 pts** (7 items). Analytics = 2 MCQ×1 + 2 grid×3 = **8 pts** (4 items). **No `scoringBucket` set in authoring.** MCQ keys — operational (1–5) **C, A, D, B, C** (per-passage A1/B1/C2/D1, max 0.40); analytics (8,9) **A, D**. Per-form A8/B7/C7/D7 reconciles at assembly. EC counts per blueprint (B-K.1.1.2=2, B-K.1.1.3=2, B-C.2.1.2 delivered 2, B-V.4.1.1 delivered 3, B-C.3.1.3 delivered 2, etc. — all ≤3, already reconciled).

## 4. Figure + accessibility contract

- Operational **B-C.3.1.3 MCQ (item 5)** = the **double-layer-paper-makes-stronger** passage detail → identify the wrapping stage (**order 5, `stage_pack`**); **not answerable from the stage-5 caption** (caption names only label/sort/box). AO-9 (item 10) = a **three-stage→statement mapping** (stages 1, 3, 5; §7.1), each anchored to a **non-caption** passage detail. (The figure itself still carries all **5** stages with `order` 1–5; AO-9 scores only 3 of them — see the grid-scoring contract in §5.)
- The figure carries readable labels, a literal author-supplied `altText`, and a **generator-derived `longDescription`**; using the passage together with the long description preserves full answerability without seeing the SVG or color. AO-9 uses the existing **keyboard-operable matching grid** (no drag-drop). **No item answerable solely from color.**
- `test-pssa-eoy-p1.ts` asserts: figure has 5 stages with `order` 1–5 + the pinned `targetId`s; `longDescription`/`altText` equal the package literals; item-5 evidence is the double-paper detail bound to `stage_pack`; AO-9's **three** statements are **not** equal to (or paraphrase of) any caption and are disjoint from items 1–9/AO-10 anchors.

## 5. Answer-choice & distractor / TE quality (blueprint §6.2–6.3 — P1–P4-hardened)

- MCQ distractor rule: 4 choices = 1 correct + 3 incorrect. **Each of the three incorrect choices has a distinct, registered `distractorRole`** (∈ `mappingRegistry` reading roles), with a truthful role-aligned rationale. **`distractorRole` IS the misconception tag** — do not invent a separate "misconception" field. **The correct choice carries no `distractorRole`** (the field is set only on the three incorrect choices). Minimally revise choice text (never relabel) if two incorrect choices would share a role; balanced length/style; no near-duplicates.
- **Matching grids** (items 6, 10, 11) — engine-pinned scoring (do **not** invent a mechanism): `pssaScoring.ts` scores `MATCHING_GRID` by awarding **1 point per correct scored row** and **requires `maxPoints === number of scored cells`** (else `malformed`); detail tags `matching_grid_full_credit` / `_partial` / `_zero`. Therefore each 3-point grid has **exactly 3 scored rows**: `scoringJson: {"totalPoints": 3}`; `correctResponseJson.correctCells` = **exactly 3** `{rowId, columnId}` entries (one correct `columnId` per scored row — the scorer reads `correctCells`, verified against `exemplars/pssa_grade3_moy_p2` `pssa_item_g3_moy_p2_te_ak113`); `rows` (and `columns`) under their keys per the canonical `MatchingGridRow` shape (mirror the MOY P2 grid). Per-row `rationale` + `plausibleWrongRationales: Record<columnId,string>` for every scored row. Item 6 = classify each of the **3** §7.1 statements Main-idea vs Supporting-detail (columns = the 2 classification labels); item 10 = match the **3** numbered stages (1, 3, 5) each to its §7.1 passage statement (columns = candidate statements, ≥3); item 11 = match each of *evenly/runny/recast* to its meaning (columns = candidate meanings, 3 correct + plausible-wrong). **STOP and report** only if a required mapping cannot be expressed as 3 scored cells worth 3 points (it can — this is the engine's native contract).
- **SA** (item 7): `rubric` (4-band) + `scoreBandExamples` (3/2/1/0) + `expectedAnswerCore` + `acceptableTextSupport` + `commonIncompletePatterns` (**all supported by the shared item contract — verified against MOY P2 SA**); `requiresTextSupport`/`requiredSupportCount` as in MOY P1/P2; `scoringJson: {"totalPoints": 3, "autoScoringClaim": false}` **and** `auditMetadata.autoScoringClaim: false` (mirror `author-pssa-moy-p1.ts` lines 379–380 — `autoScoringClaim:false` lives in `scoringJson` + `auditMetadata`, **not** a top-level item field); must require ≥2 ordered steps + reasoning (not one copied line).
- Student preview leak-free (no keys/rationales/`distractorRole`/`correctIndex`/`factCheckNotesJson`); reviewer preview carries keys + rationales + records.

## 6. Inherited content gates (Rule 0)

Full stack: passage grounding (every choice/stem grounded in the P1 text/figure), `PSSA_ITEM_EC_SKILL_MISMATCH` (item 6 = main-idea/detail NOT sequence; item 3 = logical cause/effect; item 2/8 = text features), `PSSA_DOMAIN_FACT_CHECK_REQUIRED` (the 9 records), figure-feature integrity + accessibility, item-type contracts (INLINE/grid/SA), source-compliance no-copy, batch position-distribution. WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-eoy-p1.ts
npx tsx scripts/test-pssa-process-figure-feature.ts   # prerequisite regression must stay green
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected by EOY P1 content
echo "all EOY P1 gates passed"
```

**`scripts/test-pssa-eoy-p1.ts` asserts:** (1) 1 passage (`wordCount===712` via the exact repo helper, `informational_description`, `released_length`, figure present, `factCheckRequired:true`, 9 complete records) + 11 items; types/ECs/points per §3; op MCQ keys C,A,D,B,C; analytics MCQ A,D; no `scoringBucket` on any item. (2) Every MCQ has **exactly 3 distinct registered `distractorRole`s on its 3 incorrect choices, and the correct choice has no `distractorRole`**. (3) Figure: `figureKind:"process"`, **exactly 5** stages in ascending `order` 1–5/pinned `targetId`s; `altText` = package literal; `longDescription` equals **both** `generatePssaFigureLongDescription(structuredData)` **and** the package §3.1 pinned generated string; the committed SVG passes `validatePssaFigureAssetNode` (its `<text>` labels contain `title` + every stage `label` and `caption`). (4) Item 5 bound to the double-paper detail + `stage_pack`, **not** caption-answerable. (5) AO-9's **3** statements (stages 1, 3, 5) ≠ captions (verbatim or paraphrase) and disjoint from items 1–9/AO-10; item 6's **3** grid statements per §7.1; AO-10 words = *evenly/runny/recast*, disjoint from *harden*(#4)/*batch*(#9). (6) Each 3-pt grid has `scoringJson.totalPoints===3` and **exactly 3 `correctResponseJson.correctCells`** (`maxPoints===correctCells.length`); each scored row has `plausibleWrongRationales`; SA has the 4-band 3/2/1/0 rubric, `commonIncompletePatterns`, and `autoScoringClaim:false` in **both** `scoringJson` and `auditMetadata`. (7) EC-skill-match passes; student DTO/preview leak-free (no keys/records). (8) `scorePssaItem` smoke: a fully-correct response to each grid returns `matching_grid_full_credit` with `pointsEarned===3`.

## 7.1 Mechanical safeguards
- Author run (`noDbWrite`): `npx tsx scripts/content/author-pssa-eoy-p1.ts` writes ONLY `exemplars/pssa_grade3_eoy_p1/*`.
- Scope guard before + after commit: `git diff --name-only HEAD` / `git diff --name-only origin/main...HEAD` limited to the §8 paths.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-eoy-p1.ts
scripts/test-pssa-eoy-p1.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_eoy_p1/*
public/pssa/figures/g3_eoy_p1_crayon_process.svg
specs/codex_pssa_eoy_p1_items.md
specs/pssa_g3_eoy_p1_passage_package.md
```
Anything else (BOY/foundation/MOY/EOY-blueprint, scoring, registry, **figure module — already generalized by the merged prerequisite; do NOT modify it here**, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`); carry BOTH P1 docs into the worktree and commit them so §0.1 reads the approved 712-word package. Absolute-path, fail-closed (same pattern as the MOY specs):

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-eoy-p1-items
cd "$PRIMARY"; git fetch origin
if git show-ref --verify --quiet refs/heads/codex/pssa-eoy-p1-items; then echo "STOP: branch exists"; exit 1; fi
test ! -e "$WORKTREE" || { echo "STOP: worktree path exists"; exit 1; }
git worktree add "$WORKTREE" -b codex/pssa-eoy-p1-items origin/main
cd "$WORKTREE"
test "$(git branch --show-current)" = "codex/pssa-eoy-p1-items"
test -z "$(git status --short)"
cp "$PRIMARY/specs/pssa_g3_eoy_p1_passage_package.md" "$PRIMARY/specs/codex_pssa_eoy_p1_items.md" specs/
git add specs/pssa_g3_eoy_p1_passage_package.md specs/codex_pssa_eoy_p1_items.md
git diff --name-only HEAD     # expect exactly the 2 spec docs
git commit -m "EOY P1: approved passage package + item-authoring spec"
```

**Committed-source verification (FAIL-CLOSED)** — after both docs committed: `require_in_commit` each of `block of wax`/`Hard wax`/`misshapen`/`uneven shapes`/`trained workers`/`sent to stores` is **absent** from the package; the package contains `APPROVED / LOCKED`, the 9 `claimId`s (`t1-paraffin-pigment`…`t1-wrap-pack` + `t1-premeasured-pigment`), `stage_pack`, `order`, `altText`; and assert the package body word count == **712**. **Word-count method (temp-file python, not a heredoc pipe):** `git show HEAD:specs/pssa_g3_eoy_p1_passage_package.md` → temp file; slice the region from the line `## 2. Passage` to the next standalone `---`; keep paragraph lines **and** the `###` heading text (strip the `#` markers and `**` bold markers); count with `re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?", region)`; assert `== 712`. (This is the exact `author-pssa-moy-p1.ts` `wordCount` tokenization; the author embeds the 5 headings in `eoyP1PassageText` so the item's `wordCount` field equals this.) Exactly-two-file commit-set check. STOP on any miss.

Then: preflight (§0.1) → author (passage + figure + 9 records + 11 items) → §7 gates → scope guard → commit (no merge) → report. Independent audit before merge.
