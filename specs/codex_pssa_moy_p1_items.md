# Codex Spec — MOY P1 Item Authoring (Grade 3, informational museum-map passage)

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-18.
**Preconditions:** Phase 4A merged + verified on `main` (`1023b1e`; `PssaFormItem.scoringBucket` live). P1 passage/map package APPROVED: `specs/pssa_g3_moy_p1_passage_package.md`. Blueprint locked: `specs/pssa_g3_benchmark_blueprint_moy_eoy.md`.

> **BLOCKED ON: the figure/map feature PR** (`specs/codex_pssa_figure_map_feature.md`) merged + verified on `main`. The platform's `textFeaturesJson` currently supports only `heading`/`sidebar` features — there is no visual-map type. P1's map-dependent items (3, 5, 8) genuinely require a renderable, accessible map, so **P1 item authoring does not start until the figure/map feature is live on `main`.** Do NOT represent the map with heading/sidebar hacks.

## 0. Scope & guardrails

- Author **one passage (P1) + its item set** for MOY, **file-based only** (`noDbWrite`), all `reviewStatus=PENDING` / `itemStatus=candidate`. Nothing approved, nothing student-facing.
- **Do NOT** modify `lib/content/pssaScoring.ts`, the distractorRole registry (`mappingRegistry` in `lib/content/pssaInsightMapping.ts`), the delivery flow, or any existing BOY/foundation content.
- **Do NOT** assemble the MOY form or set `scoringBucket` here — that happens at form assembly (see §6).
- **Do NOT** author P3/P4 or other MOY units. P1 only.
- Diagnostic-secure pool: tag P1 content as stamina/diagnostic-secure consistent with how the BOY stamina pool is tagged (`staminaBand` on `PssaPassage`; mirror the existing delivered-BOY items' provenance/tags). If the secure-pool tagging convention is ambiguous in the repo, STOP and report rather than guessing.
- **STOP and report** if authoring requires a schema change (it should not — `PssaPassage.textFeaturesJson` already exists for the map).

## 0.1 Source-package preflight (run FIRST — do not author from a stale copy)

Before authoring, verify the **repository** source package `specs/pssa_g3_moy_p1_passage_package.md` (not any rendered/uploaded copy):

- status says **"APPROVED — Phase 4A verified on `main`"**
- passage word count = **687**
- text-features/search-tools is **`E03.B-C.2.1.2`**
- map+words is **`E03.B-C.3.1.3`**
- Art Studio placement is **NOT** listed as map-only evidence
- §8.1 contains the final evidence allocation

If any check fails, **STOP** — do not author from a stale rendered copy. (Rendered file cards have lagged the on-disk file before; trust `git show HEAD:specs/...`.)

## 1. Deliverables

- New author script: `scripts/content/author-pssa-moy-p1.ts` (mirror the structure of `author-pssa-grade3-short-answer.ts` / `author-pssa-grade3-tei.ts`).
- Exemplars under `exemplars/pssa_grade3_moy_p1/`: `backend.json`, `student_preview.md`, `reviewer_preview.md`, `answer_key_and_rubric.md`, plus an audit CSV.
- Wire the new tranche into the gate runner (`scripts/test-pssa-content.ts`) like the prior tranches.

## 2. Passage authoring (`PssaPassage`)

From the approved package (do not rewrite the prose):

- `title` = "A Map for a Day of Discovery"; `gradeLevel` 3; `subject` "ELA"; `passageType`/`genre` = informational.
- `text` = the approved 687-word passage (verbatim from package §2). `wordCount` = 687.
- `textFeaturesJson` = the functional floor map (package §3), encoded as the **`type:"figure"` text feature delivered by the figure/map feature PR** (`specs/codex_pssa_figure_map_feature.md`): the committed map asset + digest + `altText` + `longDescription` + `structuredData` (legend, locations/levels, route, show times). All map facts items 3/5/8 depend on (show times, Family Rest Area location, level headings, accessible route) live in this feature and its accessible equivalent. Do NOT hack the map into `heading`/`sidebar` features. (This is why authoring is blocked on that PR — see preconditions.)
- `factCheckNotesJson` = package §4 (fully fictional museum; concepts accurate; no citation needed).
- `staminaBand` = `released_length` — the **same existing value BOY uses**. Do NOT invent a new value/enum (e.g., not "MOY", not "full_seat"). Record the MOY benchmark identity in `provenanceJson` instead: `{ benchmarkSeason: "MOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1", unit: "P1" }`.
- **Metadata — mirror the exact values the delivered stamina passages use** (do NOT invent): `sourceType="internal_original"`, `licenseStatus="cleared_internal_original"`, `commercialUseAllowed=true`, `needsLegalReview=false`, `reviewStatus=PENDING`, `itemStatus=candidate`. Copy `genre`/`domainVocabularyLoad` conventions from the same exemplars.
- **Non-overlap:** no reuse of BOY delivered passages (syrup-making, junk-boat race, owls, hollow log) or topics; civic/indoor map-reading. (Foundation bank's "A Map Under the Bench" is a different pool/genre — not an overlap.)

## 3. Item set (8 items on P1) — EC, type, bucket, reserved evidence

Per blueprint + package §8.1. **Each item must have a distinct *primary* evidence target:**
- Do not reuse the same keyed sentence, map fact, or TE row as the *primary* evidence for another selected-response item.
- Broader thematic overlap is allowed when the tested construct differs.
- The short answer may synthesize multiple passage details, but its required core evidence must not simply duplicate the matching-grid rows.

Pinned primary evidence (see §3.2 for constructs):

```
Item 1: why Art Studio is beside Dinosaur Dig
Item 2: author's view that a clear, tested map is worth the effort
Item 3: Quiet Corner separation from Build Lab
Item 4: context meaning of "wander"
Item 5: locate Family Rest Area
Item 6: main idea supported by planning, map clarity, and visitor ease
Item 7: create map → add features → test → revise
Item 8: three map+prose integrations (see §3.2)
```

| # | Item | EC | Type | Pts | Bucket* | Evidence (reserved) |
|---|---|---|---|---|---|---|
| 1 | Operational MCQ | `E03.B-K.1.1.1` | MCQ | 1 | operational | prose: answer w/ explicit textual evidence — **why the Art Studio is beside the Dinosaur Dig** (para 3: dig for bones, then draw the dinosaur). Prose-only. |
| 2 | Operational MCQ | `E03.B-C.2.1.1` | MCQ | 1 | operational | prose: **author's point of view** about clear museum maps (NOT author's purpose — see §3.2) |
| 3 | **Operational map+words MCQ** | `E03.B-C.3.1.3` | MCQ | 1 | operational | **prose + map (integration):** para 2 says the Quiet Corner was placed away from the noise; the map shows it separated from the Build Lab — the student must use both |
| 4 | Operational MCQ | `E03.B-V.4.1.1` | MCQ | 1 | operational | prose: context meaning of **"wander"** (para 6) — an *undefined* word (unlike *legend*/*symbol*, which the text defines, so those make weak context-clue items) |
| 5 | **Operational map MCQ** | `E03.B-C.2.1.2` | MCQ | 1 | operational | **map**: use the map **key/label** to *locate* the **Family Rest Area**. Text-features/search-tools skill. (Show times are reserved for AO-5; Quiet Corner for item 3 — do not reuse.) |
| 6 | Operational TE (3-pt) | `E03.B-K.1.1.2` | MATCHING_GRID | 3 | operational | prose: main idea + key details about the workers' planning |
| 7 | Operational SA (3-pt) | `E03.B-K.1.1.3` | SHORT_ANSWER | 3 | operational | prose: sequence / cause-effect (arrange → make map → test → revise) |
| 8 | **AO-5 (analytics-only) TE (3-pt)** | `E03.B-C.3.1.3` | **DRAG_DROP** | 3 | analytics_only* | **prose + map integration**, 3 assignments — drag each **paragraph number** (3, 5, 7) to the map feature it gives more info about; every row needs BOTH sources (exact rows in §3.2) |

Operational P1 total: 5 MCQ + 1 TE(3) + 1 SA(3) = 7 items / 11 operational points (matches blueprint S3 P1 slot). AO-5 adds 3 analytics points.

**B-C.3.1.3 / B-C.3.1.1 reconciliation (resolved — was the open flag):** P1 is the only MOY unit with a functional graphic, so it carries **both** B-C.3.1.3 items — item 3 (operational map+words MCQ) and item 8 (AO-5 analytics DRAG_DROP) — on **distinct evidence** (Quiet Corner separation vs. route/show-times/legend). Delivered B-C.3.1.3 on P1 = 2 (1 operational + 1 analytics), within the ≤3 cap. The operational **`E03.B-C.3.1.1`** MCQ (logical connection across sentences/paragraphs) is **reserved for P3**, the paired-informational unit, and is NOT authored on P1. Item 5 stays `E03.B-C.2.1.2` (direct use of a text feature to *locate* information).

\* **`scoringBucket` is NOT written on the bank item.** Items 1–7 author as ordinary candidates; AO-5 (#8) authors as an ordinary `B-C.3.1.3` TE. The `operational` vs `analytics_only` role is assigned to AO-5's slot **at MOY form assembly** on `PssaFormItem.scoringBucket` (Phase 4A). The "bucket" column above is the *intended assembly role*, recorded here for the assembler — not a field on `PssaItem`.

**EC-label correctness (locked):** text-features/search-tools = `E03.B-C.2.1.2` (item 5); info-from-map+words = `E03.B-C.3.1.3` (items 3 and 8, on distinct evidence). Do not swap these.

**Map / prose dependency (do not cross):**
- **Item 5** (`B-C.2.1.2`) — pure **map** text-feature lookup: locate the Family Rest Area using the map **key/label**. Must fail if the map is removed.
- **Items 3 and 8** (`B-C.3.1.3`) — require **BOTH** prose and map (integration). Each must fail if *either* the map is removed *or* the prose is ignored — they cannot be answered from one source alone.
- **Items 1, 2, 4, 6, 7** — **prose-only**; must be answerable from the text and must NOT require the map.
- Floor placement of Art Studio / Dinosaur Dig is stated in prose (package §8.1) → never used as map-only evidence. The truly map-only facts available are: show times, Family Rest Area location, symbol meanings, exact accessible-route path.

## 3.1 Pinned IDs & deterministic MCQ key-position plan

Author with these exact IDs (deterministic, reproducible):

| Slot | Item ID | EC | Type | Correct key (MCQ) |
|---|---|---|---|---|
| Passage | `pssa_psg_g3_moy_p1_museum_map` | — | informational + map | — |
| 1 | `pssa_item_g3_moy_p1_mcq_bk111` | B-K.1.1.1 | MCQ | **A** (index 0) |
| 2 | `pssa_item_g3_moy_p1_mcq_bc211` | B-C.2.1.1 | MCQ | **B** (index 1) |
| 3 | `pssa_item_g3_moy_p1_mcq_bc313` | B-C.3.1.3 | MCQ (map+words) | **C** (index 2) |
| 4 | `pssa_item_g3_moy_p1_mcq_bv411` | B-V.4.1.1 | MCQ | **D** (index 3) |
| 5 | `pssa_item_g3_moy_p1_mcq_bc212` | B-C.2.1.2 | MCQ (map locate) | **A** (index 0) |
| 6 | `pssa_item_g3_moy_p1_te_bk112` | B-K.1.1.2 | MATCHING_GRID | n/a |
| 7 | `pssa_item_g3_moy_p1_sa_bk113` | B-K.1.1.3 | SHORT_ANSWER | n/a |
| 8 | `pssa_item_g3_moy_p1_ao5_dd_bc313` | B-C.3.1.3 | DRAG_DROP (analytics) | n/a |

MCQ key positions (items 1–5): **A, B, C, D, A** → distribution A=2, B=1, C=1, D=1 → max share 0.4 = the `maxCorrectPositionShare` cap (passes). These are the pinned per-passage positions; the **form-level** 20-MCQ distribution is reconciled to the blueprint target at assembly. Codex must not re-shuffle these keys.

## 3.2 Item 2 construct & AO-5 rows (pinned)

**Item 2 (`E03.B-C.2.1.1`) — point of view, NOT purpose.** Determine the author's point of view about clear museum maps.
- Suggested stem: *"Which statement best describes the author's point of view about a clear museum map?"*
- Correct idea: a clear, carefully tested map is worth the work because it helps visitors move through the museum more easily.
- Do **NOT** phrase it as "Why did the author write this passage?" — that tests purpose, not POV, and would fail EC-skill-match for `B-C.2.1.1`.

**AO-5 (`E03.B-C.3.1.3`, DRAG_DROP) — prompt & rows.**
Prompt: *"Drag each statement from the passage to the map feature that best supports it."*

Prompt: *"Read paragraphs 3, 5, and 7. Drag each paragraph number to the map feature that gives more information about that paragraph."*

- **Paragraph 3** → Art Studio beside Dinosaur Dig
- **Paragraph 5** → Level headings and the elevator route
- **Paragraph 7** → Story Stage show times

Using paragraph *numbers* (not reproduced claims) as the drag tokens forces the student to read each paragraph AND inspect the map — the row fails if either the passage or the map is removed. The three rows stay distinct from item 3 (paragraph 2 / Quiet Corner) and item 5 (Family Rest Area lookup). Distractor map-feature targets (e.g., Quiet Corner, the stairs, the Family Rest Area) each carry a registered `distractorRole` + rationale.

**Item 3 (`E03.B-C.3.1.3`) — pinned stem (forces integration via paragraph reference).**
- Stem: *"Read paragraph 2. Which detail from the map best supports the workers' decision described in that paragraph?"*
- Correct idea: **the Quiet Corner is located far from the Build Lab.**
- The stem references the paragraph rather than restating its claim, so the student must read **both** paragraph 2 (the decision) and the map (the supporting detail). It cannot be answered from prose or map alone.

## 4. Answer-choice & distractor quality (blueprint §6.2–6.3 — enforced)

Every selected-response item:
- Exactly 4 choices (MCQ): 1 correct + 3 plausible distractors, each a **distinct misconception** (true-but-doesn't-answer, wrong part of passage/map, opposite, overly literal, unsupported inference, wrong-context vocabulary).
- Each distractor carries: a **`distractorRole`** (MUST be a key in `mappingRegistry` — unregistered roles make the class report throw), a **rationale**, **passage/map evidence**, and a misconception/error-pattern tag.
- Choices balanced in length/grammar/specificity; correct answer not identifiable by length/detail/style; no joke/impossible options.
- Batch **answer-position distribution** balanced across A/B/C/D (reuse the existing position-distribution gate; correct answers must not cluster).
- **TE (matching grid / drag-drop):** incorrect mappings reflect realistic misunderstandings; each row carries a rationale; no artificial filler tokens beyond the canonical format.
- **SA (#7):** no choices — provide a 3/2/1/0 rubric, expected core idea, sample responses at each score level, acceptable evidence examples, and common incomplete/incorrect patterns. `autoScoringClaim=false`.
- **AO-5 held to the same bar** as operational items — not a lower-quality experimental question.

## 5. Inherited content gates (Rule 0 — full stack)

All P1 items inherit the existing gate stack: passage grounding (every choice/stem grounded in P1 text or its map), evidence-span verbatim where used, `PSSA_ITEM_EC_SKILL_MISMATCH` (the question must test the skill its EC names — fix the item to match the EC, never retag the EC), passage cross-duplicate/template/coherence/concreteness, source-compliance no-copy scan, item-type contract (`pssa-item-type-contract.ts`) for each interaction type, and the batch position/surface-shortcut distribution gates. WARN-with-justification ≠ pass: acceptance = 0 FAIL + 0 unresolved WARN.

## 6. Form assembly (NOT in this PR — note for the next step)

After P1 (and later P3/P4) are authored, gated, and human-approved, the MOY form is assembled by the diagnostic assembler, which sets `PssaFormItem.scoringBucket = analytics_only` for AO-5 and `operational` for items 1–7. The content hash will then differ from BOY (analytics_only present), as designed in Phase 4A.

## 7. Gate battery (run all; paste output)

```
npx tsc --noEmit
npx tsx scripts/test-pssa-content.ts              # detector stack incl. the new tranche
npx tsx scripts/audit/pssa-item-type-contract.ts  # item-type contract (if run standalone)
npm run test:pssa-pr-c                             # scoring still green
```
Plus: confirm every `distractorRole` used is a key in `mappingRegistry`; confirm the answer-position distribution is balanced. **Confirm source dependency exactly:**

- **Item 5 is map-only:**
  - fails if the map is removed
  - does not require prose evidence beyond the student-facing directions
- **Items 3 and 8 are map+prose integration:**
  - fail if the map is removed
  - fail if the relevant prose context is removed
  - cannot be answered from either source alone
- **Items 1, 2, 4, 6, and 7 are prose-only:**
  - remain answerable if the map is removed

## 8. Acceptance criteria

- 1 passage (687 words, map in `textFeaturesJson`) + 8 items, all `PENDING`/`candidate`, file-based, `noDbWrite`.
- EC/type/points exactly per §3; EC labels correct (B-C.2.1.2 vs B-C.3.1.3); distinct primary evidence targets (per §3 rule); map/prose dependency holds per the three-way §7 gate.
- All gates 0 FAIL / 0 unresolved WARN; every distractorRole is a registry key; positions balanced; source scan clean (original); EC-skill-match pass for all 8.
- Scope clean: only the new author script + `exemplars/pssa_grade3_moy_p1/` + test wiring; zero changes to BOY/foundation content, scoring, registry, or schema.
- Student preview leak-free (no keys/rationales/distractorRoles/correct indices); reviewer preview has keys.

## 9. Process

**Sequence (blocked first step):** figure/map feature PR → merge + regression verification on `main` → encode the approved museum map as the `figure` feature → author all eight P1 items → gate battery → human review.

Spec → (optional ChatGPT Pro review) → Codex authors on the real Mac repo → independent audit (EC-skill-match on all 8, map-only vs prose separation actually enforced, distractorRole registry membership, position distribution, source originality, SA rubric completeness) → human content review → approval. Commit from terminal (`rm -f .git/index.lock` if needed); do not stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.
