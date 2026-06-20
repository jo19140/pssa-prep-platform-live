# Codex Spec — MOY P1 Item Authoring (Grade 3, informational museum-map passage)

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-18.
**Preconditions:** Phase 4A merged + verified on `main` (`1023b1e`; `PssaFormItem.scoringBucket` live). P1 passage/map package APPROVED: `specs/pssa_g3_moy_p1_passage_package.md`. Blueprint locked: `specs/pssa_g3_benchmark_blueprint_moy_eoy.md`.

> **UNBLOCKED — the figure/map feature is LIVE on `main`** (merge `e7992d2`; `specs/codex_pssa_figure_map_feature.md`). `type:"figure"` is supported and the museum map asset is committed at **`/pssa/figures/g3_moy_p1_museum_map.svg`** (`assetSha256: sha256:430318638b57236332e3c68a6f3620358a24cd912d35c2bef664c91d49811502`). The map is the merged figure feature — do NOT hack it into `heading`/`sidebar` features.

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
- `textFeaturesJson` = a single **`type:"figure"`** feature for the museum map (the merged figure feature). Pin it concretely:
  - `assetPath: "/pssa/figures/g3_moy_p1_museum_map.svg"`; `assetSha256: "sha256:430318638b57236332e3c68a6f3620358a24cd912d35c2bef664c91d49811502"`.
  - `structuredData` = the **already-validated museum map data** (legend; locations with **Family Rest Area on Level 1**; the three relationships Story Stage↔Build Lab adjacent, Art Studio↔Dinosaur Dig adjacent, Quiet Corner↔Build Lab separated; route `entrance → level1_elevator → level2_elevator → dinosaur_dig` excluding stairs; annotations show times `11:00 · 1:00 · 3:00`). **Source it from a shared CONTENT/AUTHORING module, NOT a test file and NOT generic runtime code.** `museumStructuredData()` currently lives in `scripts/test-pssa-figure-map-feature.ts`; **extract it to `scripts/content/lib/pssa-moy-p1-figure-data.ts`** (or a JSON fixture under `exemplars/pssa_grade3_moy_p1/`) that BOTH the figure test and the P1 author script import. Do NOT put MOY-specific museum data in generic `lib/content/` runtime code — the runtime passage just carries the resulting `textFeaturesJson`. Production authoring must NOT import from `scripts/test-*`. Re-point the figure test's import minimally; keep the data byte-identical so the merged digest/assertions still hold.
  - `longDescription` = `generatePssaFigureLongDescription(structuredData)` (generated, validated equal). `altText` concise. `sectionId` = the passage section the map anchors after.
  - Validate via the shared + Node figure validators already on `main`. Do NOT hack the map into `heading`/`sidebar` features.
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
| 8 | **AO-5 (analytics-only) TE (3-pt)** | `E03.B-C.3.1.3` | **DRAG_DROP** | 3 | analytics_only* | **prose + map integration**, 3 assignments — drag each **verbatim passage sentence** to the map feature it supports (rows in §3.2); every row needs BOTH sources |

Operational P1 total: 5 MCQ + 1 TE(3) + 1 SA(3) = 7 items / 11 operational points (matches blueprint S3 P1 slot). AO-5 adds 3 analytics points.

**B-C.3.1.3 / B-C.3.1.1 reconciliation (resolved — was the open flag):** P1 is the only MOY unit with a functional graphic, so it carries **both** B-C.3.1.3 items — item 3 (operational map+words MCQ) and item 8 (AO-5 analytics DRAG_DROP) — on **distinct evidence** (Quiet Corner separation vs. route/show-times/legend). Delivered B-C.3.1.3 on P1 = 2 (1 operational + 1 analytics), within the ≤3 cap. The operational **`E03.B-C.3.1.1`** MCQ (logical connection across sentences/paragraphs) is **reserved for P3**, the paired-informational unit, and is NOT authored on P1. Item 5 stays `E03.B-C.2.1.2` (direct use of a text feature to *locate* information).

\* **`scoringBucket` is NOT written on the bank item.** Items 1–7 author as ordinary candidates; AO-5 (#8) authors as an ordinary `B-C.3.1.3` TE. The `operational` vs `analytics_only` role is assigned to AO-5's slot **at MOY form assembly** on `PssaFormItem.scoringBucket` (Phase 4A). The "bucket" column above is the *intended assembly role*, recorded here for the assembler — not a field on `PssaItem`.

**EC-label correctness (locked):** text-features/search-tools = `E03.B-C.2.1.2` (item 5); info-from-map+words = `E03.B-C.3.1.3` (items 3 and 8, on distinct evidence). Do not swap these.

**Map / prose dependency (honest definition — these items embed the passage text *in the item*):**
- **Item 5** (`B-C.2.1.2`) — **figure-only**: locate the Family Rest Area using the map key/label. Fails if the figure is removed.
- **Items 3 and 8** (`B-C.3.1.3`) — **passage-derived text + figure integration.** Item 3 quotes the Quiet Corner sentence in its stem; AO-5's drag tokens are verbatim passage sentences. So each must fail if **the figure is removed** OR if **its quoted/drag-token text is removed** — but do **NOT** claim they fail merely because the full passage *body* is removed (the needed words are already in the item). They still validly test `B-C.3.1.3`: the student combines passage words with map information.
- **Items 1, 2, 4, 6, 7** — **passage-only**: answerable from the passage text; remain answerable when the figure is removed.
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
Prompt: *"Drag each sentence from the passage to the map feature that best supports it."*

Drag tokens are **short verbatim passage excerpts** (paragraph numbers are ambiguous — paragraph 3 carries two adjacency relationships — and the player does not visibly number paragraphs):

- *"The workers place each exhibit name on the floor map so visitors can see what is upstairs and what is on the ground floor."* → **Level 1 and Level 2 headings**
- *"They mark the elevator clearly because the green accessible route uses the elevator, not the stairs."* → **Accessible route through the elevator**
- *"The Story Stage sign lists show times..."* → **11:00 · 1:00 · 3:00**

Each row pairs a real passage sentence with a real map feature, so the row fails if either the passage or the map is removed. The three rows stay distinct from item 3 (Quiet Corner) and item 5 (Family Rest Area). Distractor map-feature targets (e.g., the stairs, Quiet Corner, Family Rest Area) each carry a registered `distractorRole` + rationale.

**Item 3 (`E03.B-C.3.1.3`) — pinned stem (narrowed to one sentence).**
- Stem: *"Read this sentence from paragraph 2: 'The Quiet Corner, where families read and rest, was placed far from the noise.' Which detail from the map best supports this decision?"*
- Correct idea: **the Quiet Corner is separated from the Build Lab.**
- The stem quotes the specific sentence (paragraph 2 describes several decisions), so the student must read that decision AND inspect the map detail. It cannot be answered from prose or map alone.

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
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts              # detector stack incl. the new tranche
npx tsx scripts/test-pssa-figure-map-feature.ts   # figure unchanged + still valid (re-pointed import)
npx tsx scripts/test-pssa-moy-p1.ts               # NEW — automates the dependency claims below
npm run test:pssa-pr-c                             # scoring still green
npm run test:pssa-pr-b                             # key-free renderers/DTO still green
```

**Create `scripts/test-pssa-moy-p1.ts`** that *automates* the source-dependency proof (do NOT leave it as a manual claim) via each item's authored evidence binding — NOT a new DB schema (STOP and report if a DB schema change would be required). Use the **honest** definition (items 3 & 8 embed their passage text in the item):

- **Item 5 (figure-only):** fails if the **figure** is removed.
- **Items 3 and 8 (passage-derived text + figure):** fail if the **figure** is removed; fail if the item's **quoted stem text / verbatim drag-token text** is removed; do **NOT** assert they fail merely because the full passage *body* is removed.
- **Items 1, 2, 4, 6, 7 (passage-only):** remain answerable when the figure is removed.

Plus: confirm every `distractorRole` used is a key in `mappingRegistry`; confirm the answer-position distribution is balanced; EC-skill-match all 8 (item 2 = POV, not purpose); student preview leak-free; reviewer preview has keys.

## 7.1 Mechanical safeguards (run before the stop report)

**Author run in canonical `noDbWrite` mode.** Execute the author script the way sibling scripts run (direct execution, file-only):

```
npx tsx scripts/content/author-pssa-moy-p1.ts
```

Confirm it writes **only** the required `exemplars/pssa_grade3_moy_p1/*` outputs and performs **no DB mutation** (no Prisma client import/usage; `backend.json` carries `noDbWrite: true` / `productionImportReady: false`, mirroring `author-pssa-grade3-short-answer.ts`).

**Exact allowed-path scope guard (before commit):**

```
git diff --name-only origin/main...HEAD
# MUST be limited to the allowed paths in §8. STOP on any BOY fixture, scoring, schema, registry, delivery, or unrelated file.
git status --short
# Only the two known WIP files may remain untracked.
```

## 8. Acceptance criteria

- 1 passage (687 words, map in `textFeaturesJson`) + 8 items, all `PENDING`/`candidate`, file-based, `noDbWrite`.
- EC/type/points exactly per §3; EC labels correct (B-C.2.1.2 vs B-C.3.1.3); distinct primary evidence targets (per §3 rule); map/prose dependency holds per the three-way §7 gate.
- All gates 0 FAIL / 0 unresolved WARN; every distractorRole is a registry key; positions balanced; source scan clean (original); EC-skill-match pass for all 8.
- Scope clean — **allowed tracked paths only:**
  - `scripts/content/author-pssa-moy-p1.ts`
  - `scripts/content/lib/pssa-moy-p1-figure-data.ts`
  - `scripts/test-pssa-moy-p1.ts`
  - `scripts/test-pssa-figure-map-feature.ts` (import re-point only)
  - `scripts/test-pssa-content.ts` (tranche wiring only)
  - `exemplars/pssa_grade3_moy_p1/*`
  - `specs/codex_pssa_moy_p1_items.md`
  - (plus the 2 known untracked WIP files stay untracked). Zero changes to BOY/foundation content, scoring, the registry, the figure module, or schema.
- Student preview leak-free (no keys/rationales/distractorRoles/correct indices); reviewer preview has keys.

## 9. Process

**Sequence (blocked first step):** figure/map feature PR → merge + regression verification on `main` → encode the approved museum map as the `figure` feature → author all eight P1 items → gate battery → human review.

Spec → (optional ChatGPT Pro review) → Codex authors on the real Mac repo → independent audit (EC-skill-match on all 8, map-only vs prose separation actually enforced, distractorRole registry membership, position distribution, source originality, SA rubric completeness) → human content review → approval. Commit from terminal (`rm -f .git/index.lock` if needed); do not stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.
