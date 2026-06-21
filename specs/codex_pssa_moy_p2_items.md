# Codex Spec — MOY P2 Item Authoring (Grade 3, literary narrative "The Stubborn Dough")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-19.
**Preconditions:** MOY P1 merged + verified on `main` (`2a7357c`). P2 passage package APPROVED: `specs/pssa_g3_moy_p2_passage_package.md` (884 words). Blueprint locked: `specs/pssa_g3_benchmark_blueprint_moy_eoy.md`.
**No figure** — P2 is plain literary prose (the figure feature is P1-specific). All 7 P2 items are **operational** (no analytics-only item lives on P2).

## 0. Scope & guardrails

- Author **one passage (P2) + its 7-item set**, file-based only (`noDbWrite`), all `reviewStatus=PENDING` / `itemStatus=candidate`. Nothing approved/student-facing.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry (`mappingRegistry`), delivery, the figure module, BOY/foundation/MOY-P1 content, or schema. Do NOT assemble the form. P2 only.
- STOP and report if anything needs a DB schema change or if secure-pool tagging is ambiguous.
- Run in a clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), same pattern as P1.

## 0.1 Source-package preflight (run FIRST)

Verify the **repository** P2 package (`git show HEAD:specs/pssa_g3_moy_p2_passage_package.md`):
- status says **APPROVED**; passage word count = **884**;
- bread fact correct (failed loaf "dull, heavy thud"; success "light, hollow sound");
- street is **Juniper Street** (no "Maple");
- §7 cautions present (A-V.4.1.1 undefined word; A-K.1.1.3 character→action).
If any fails, **STOP** — do not author from a stale copy.

## 1. Deliverables

- New author script `scripts/content/author-pssa-moy-p2.ts` (mirror `author-pssa-moy-p1.ts`).
- Exemplars under `exemplars/pssa_grade3_moy_p2/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV); wire into `scripts/test-pssa-content.ts`.
- New `scripts/test-pssa-moy-p2.ts` (structure + distractor-quality regression; §7).

## 2. Passage authoring (`PssaPassage`)

From the approved package (verbatim text; do not rewrite):
- `title` "The Stubborn Dough"; gradeLevel 3; subject ELA; `passageType`/`genre` literary narrative; `pov` third_person.
- `text` = the approved **884-word** passage verbatim. `wordCount` 884.
- **No `textFeaturesJson` figure** (plain prose). (Headings/sidebars not needed either.)
- `staminaBand` = `released_length`; MOY identity in `provenanceJson` (`benchmarkSeason:"MOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-moy-v1"`, `unit:"P2"`).
- Metadata mirror the delivered stamina passages: `sourceType="internal_original"`, `licenseStatus="cleared_internal_original"`, `commercialUseAllowed=true`, `needsLegalReview=false`; `reviewStatus=PENDING`; `itemStatus=candidate`.
- Non-overlap: distinct from BOY (syrup/junk-boat/owls/hollow-log), MOY P1 (museum), foundation. Street renamed Juniper (BOY uses "The Moon Over Maple Street").

## 3. Item set (7 items / 11 operational pts)

Each item has a **distinct primary evidence target**; reading-MCQ EC repeats ≤2; no form EC > 3.

| # | Item | EC | Type | Pts | Key | Primary evidence |
|---|---|---|---|---|---|---|
| 1 | Explicit evidence MCQ | `E03.A-K.1.1.1` | MCQ | 1 | B | "Why did Nadia's first loaf turn out flat and hard?" → she baked after only 20 min, before it rose (pinned §3.2) |
| 2 | Central-message MCQ (**identify**) | `E03.A-K.1.1.2` | MCQ | 1 | D | identify the BEST statement of the lesson (patience + trying again) — *general message only* |
| 3 | Point of view MCQ | `E03.A-C.2.1.1` | MCQ | 1 | A | third-person narration (narrator describes Nadia's feelings) |
| 4 | Context-vocab MCQ | `E03.A-V.4.1.1` | MCQ | 1 | C | target word **"dull"** in "a dull, heavy thud" → a low, unclear/heavy sound (NOT yeast/knead/rise) |
| 5 | Figurative-language MCQ | `E03.A-V.4.1.2` | MCQ | 1 | B | phrase **"the whole house smelled like a warm hug"** → the smell was comforting and pleasant |
| 6 | Character → action TE | `E03.A-K.1.1.3` | MATCHING_GRID | 3 | n/a | match each character to a concrete action (see §3.2) |
| 7 | Central-message **explanation** SA | `E03.A-K.1.1.2` | SHORT_ANSWER | 3 | n/a | explain HOW Nadia's actions + the two loaves develop the message, w/ evidence |

Category-A reconciliation (P2 + P4): A-K.1.1.1 (P2 ×1 + P4 ×1 = 2); A-K.1.1.2 (P2 MCQ + P2 SA + P4 MCQ = 2 MCQ + 1 SA = 3, cap OK); A-K.1.1.3 (P4 MCQ + P4 EBSR + P2 TE = 3, cap OK); A-C.2.1.1 (P2 ×1 = 1); A-V.4.1.1 (P2 ×1 + P4 ×1 = 2); A-V.4.1.2 (P2 ×1 + P4 ×1 = 2). MCQ repeats ≤2 ✓.

### 3.1 Pinned IDs & deterministic MCQ keys

| Slot | Item ID | EC | Type | Key |
|---|---|---|---|---|
| Passage | `pssa_psg_g3_moy_p2_stubborn_dough` | — | literary narrative | — |
| 1 | `pssa_item_g3_moy_p2_mcq_ak111` | A-K.1.1.1 | MCQ | **B** (1) |
| 2 | `pssa_item_g3_moy_p2_mcq_ak112` | A-K.1.1.2 | MCQ | **D** (3) |
| 3 | `pssa_item_g3_moy_p2_mcq_ac211` | A-C.2.1.1 | MCQ | **A** (0) |
| 4 | `pssa_item_g3_moy_p2_mcq_av411` | A-V.4.1.1 | MCQ | **C** (2) |
| 5 | `pssa_item_g3_moy_p2_mcq_av412` | A-V.4.1.2 | MCQ | **B** (1) |
| 6 | `pssa_item_g3_moy_p2_te_ak113` | A-K.1.1.3 | MATCHING_GRID | n/a |
| 7 | `pssa_item_g3_moy_p2_sa_ak112` | A-K.1.1.2 | SHORT_ANSWER | n/a |

MCQ keys (items 1–5): **B, D, A, C, B** → distribution A1/B2/C1/D1, max share 0.4 (cap). Form-level 20-MCQ distribution reconciles at assembly. Do not re-shuffle.

### 3.2 Item constructs (pinned)

**Item 1 (`A-K.1.1.1`) — pinned.** Stem: *"Why did Nadia's first loaf turn out flat and hard?"* Correct idea: **she baked the dough after only twenty minutes, before it had time to rise.** **No distractor may paraphrase "she did not wait long enough" or "the dough had not risen"** (two distractors expressing the same cause is a fail). Distractors must name *different* plausible-but-wrong causes (e.g., the oven was too cool; she used the wrong ingredient; Sam touched it).

**Item 4 (`A-V.4.1.1`) — pinned.** Target = **"dull"**; context = **"a dull, heavy thud"**; correct meaning = **a low, heavy, unclear sound.** Do NOT use *yeast*/*knead*/*rise* (defined) or *stubborn*.

**Item 5 (`A-V.4.1.2`) — pinned.** Target = **"the whole house smelled like a warm hug"**; correct meaning = **the smell was comforting and pleasant.** (Keep "stubborn cloud" out of items 4/5 so the vocab and figurative constructs sit on separate evidence.)

**Items 2 and 7 are both `A-K.1.1.2` but DISTINCT tasks:**
- **Item 2 (MCQ — identify the general message ONLY):** "Which sentence best states the central message of the story?" Correct = a general statement of *patience / trying again pays off*. Distractors = a too-narrow detail, an off-message moral, and a plausible-but-wrong theme. No extended evidence.
- **Item 7 (SA — explain HOW the message is developed):** "Explain how Nadia's actions and her two loaves help develop the message of the story. Use two details from the passage." The strong (3-pt) answer **connects the rushed loaf, the successful loaf, AND Nadia's changed behavior to the message**, using **two passage details with reasoning linking them to the message** (not just listing details, not just naming the message). Rubric **3/2/1/0** + expected core idea + per-band sample responses + acceptable-evidence examples + common incomplete patterns; `autoScoringClaim=false`. Must NOT be answerable by copying one sentence (the explicit lesson sentence was removed from the passage).

**Item 6 (`A-K.1.1.3`) — character → trait-revealing action matching grid (3 rows / 3 pts).** Prompt: *"For each character, choose the action that best shows the character's trait or motivation."*
- **Nadia** → mixes a fresh batch and helps Sam wait
- **Sam** → pokes the dough and repeatedly asks whether it is bigger
- **Abuela** → comforts Nadia and encourages her to try again patiently

Each row's `rationale` must explain **how the action reveals the trait/motivation** (Nadia = determined; Sam = impatient; Abuela = patient/wise) — not merely that the character performed it. Use the **canonical `MatchingGridRow` shape** (`scripts/content/author-pssa-grade3-matching-grid-drag-drop.ts` / `exemplars/pssa_grade3_matching_grid_drag_drop`): per row `rationale: string` + `plausibleWrongRationales: Record<columnId,string>` for every row. Do not invent fields.

## 4. Answer-choice & distractor quality (blueprint §6.2–6.3 — enforced, P1-hardened)

- MCQ: exactly 4 choices (1 correct + 3 distractors). **Each distractor: a DISTINCT misconception, a UNIQUE registered `distractorRole` (no role repeated within an item), a rationale that truthfully matches that role, and a misconception tag.** If two distractors would share a role, minimally revise one choice's text so it embodies a genuinely distinct misconception (do not relabel inaccurately).
- Every `distractorRole` must be a key in `mappingRegistry`.
- Choices balanced in length/grammar/specificity; correct answer not identifiable by length/detail/style; no joke/impossible options.
- Conventions exception N/A (no conventions items here); the semantic near-duplicate rule applies to these reading MCQ.
- **Matching grid:** per-row `rationale` + `plausibleWrongRationales` (canonical), realistic incorrect-placement rationales on every row.
- **SA:** 3/2/1/0 rubric + expected core idea + per-band sample responses + acceptable evidence + common incomplete patterns; `autoScoringClaim=false`.
- Student preview leak-free (no keys/rationales/distractorRoles/correctIndices); reviewer preview has keys.

## 5. Inherited content gates (Rule 0)

All items inherit the full stack: passage grounding (every choice/stem grounded in the P2 text), `PSSA_ITEM_EC_SKILL_MISMATCH` (the question tests the skill its EC names — fix the item, never retag the EC; item 2 = *identify* central message, item 7 = *explain* it, item 3 = POV not purpose), source-compliance no-copy scan, item-type contract per interaction type, batch position-distribution gate. WARN-with-justification ≠ pass.

## 6. Form assembly (NOT here)

All 7 P2 items are `operational` (no analytics_only item on P2). `scoringBucket` is set at assembly (all `operational`). The MOY form content hash already differs from BOY via Phase 4A once any analytics_only item is present elsewhere (P1 AO-5, P3/P4 AOs).

## 7. Gate battery + regression assertions

Run **fail-closed** (`set -euo pipefail`, newline-separated — never `;`-chained, which ignores exit codes):

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-moy-p2.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected by P2 content
echo "all P2 gates passed"
```

**`scripts/test-pssa-moy-p2.ts` must assert (P2-focused; authored evidence binding, NOT new DB schema — STOP if schema needed):**
1. 1 passage (884 words, PENDING/candidate, released_length, **no figure feature**) + 7 items; types/ECs/points per §3; MCQ keys = B,D,A,C,B.
2. Every MCQ has **3 distinct** `distractorRole` values; every role ∈ `mappingRegistry`; each distractor rationale nonblank and role-aligned (reuse the P1 role-content checks).
3. The matching-grid row carries `plausibleWrongRationales` for likely incorrect placements (only naming wrong columns).
4. Items 2 (MCQ) and 7 (SA), both A-K.1.1.2, are genuinely distinct — assert item 2's binding is *identify-message-only* while item 7's binding requires **≥2 passage details + reasoning connecting them to the message** (the rushed loaf, the successful loaf, and Nadia's changed behavior). A binding that only flips a boolean is NOT sufficient.
5. EC-skill-match passes for all reading MCQ.
6. Student DTO/preview leak-free.

## 7.1 Mechanical safeguards (before the stop report)

- Author run (canonical `noDbWrite`): `npx tsx scripts/content/author-pssa-moy-p2.ts` — writes ONLY `exemplars/pssa_grade3_moy_p2/*`, no DB mutation (`backend.json` `noDbWrite:true`/`productionImportReady:false`).
- Scope guard before commit: `git diff --name-only HEAD` (catches staged+unstaged); `git status --short`. Allowed paths only (§8).
- After commit: `git diff --name-only origin/main...HEAD` and `git status --short` — the branch-wide diff must remain limited to the **six allowed path patterns** in §8 (which include both committed spec docs).

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-moy-p2.ts
scripts/test-pssa-moy-p2.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_moy_p2/*
specs/codex_pssa_moy_p2_items.md
specs/pssa_g3_moy_p2_passage_package.md
```
(Six allowed path patterns total — including the passage package committed in §9.) Anything else (BOY/foundation/MOY-P1, scoring, registry, figure module, schema) → STOP. The 2 known WIP files do not exist in a fresh worktree.

- 1 passage (884w, no figure) + 7 items per §3; EC/type/points/keys exact; A-K.1.1.2 MCQ ≠ SA (distinct evidence); unique registry-key roles per MCQ; grid rationales canonical; SA rubric complete; leak-free; noDbWrite; scope clean; all gates + regression green.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`). Both P2 docs are **new/untracked** in the current working dir (not yet on `main`), so carry BOTH into the worktree and commit them so the §0.1 preflight reads the approved 884-word Juniper passage (not a stale/missing DRAFT/Maple version):

```
cd /Users/diaz/pssa-prep-platform-live && git fetch origin
git show-ref --verify --quiet refs/heads/codex/pssa-moy-p2-items && { echo "STOP: branch exists"; exit 1; }
test ! -e ../pssa-moy-p2-items || { echo "STOP: worktree path exists"; exit 1; }
git worktree add ../pssa-moy-p2-items -b codex/pssa-moy-p2-items origin/main
cp specs/pssa_g3_moy_p2_passage_package.md specs/codex_pssa_moy_p2_items.md ../pssa-moy-p2-items/specs/
cd ../pssa-moy-p2-items
git add specs/pssa_g3_moy_p2_passage_package.md specs/codex_pssa_moy_p2_items.md
git diff --name-only HEAD     # expect exactly the 2 spec docs
git commit -m "MOY P2: approved passage package + item-authoring spec"
```

**Mandatory post-Step-0 committed-source verification (FAIL-CLOSED)** — run after both P2 docs are committed in the clean worktree. A single `grep -E "a|b|c"` only proves *one* string exists; check each required string individually and exit non-zero on any miss:

```
require_in_commit() {
  file="$1"; text="$2"
  if ! git show "HEAD:$file" | grep -qF "$text"; then
    echo "STOP: required committed text missing"; echo "File: $file"; echo "Text: $text"; exit 1
  fi
}

require_in_commit specs/codex_pssa_moy_p2_items.md "npm run test:pssa-db6"
require_in_commit specs/codex_pssa_moy_p2_items.md "specs/pssa_g3_moy_p2_passage_package.md"
require_in_commit specs/codex_pssa_moy_p2_items.md "a dull, heavy thud"
require_in_commit specs/codex_pssa_moy_p2_items.md "smelled like a warm hug"
require_in_commit specs/pssa_g3_moy_p2_passage_package.md "the contrast between the two loaves reinforces the central message"

if git show HEAD:specs/pssa_g3_moy_p2_passage_package.md | grep -qF "central message stated"; then
  echo "STOP: stale P2 passage package was committed"; exit 1
fi

# the documentation commit must contain EXACTLY the two intended files:
git show --name-only --pretty=format: HEAD | sed '/^$/d'
# expect exactly:
#   specs/codex_pssa_moy_p2_items.md
#   specs/pssa_g3_moy_p2_passage_package.md

echo "committed-source verification passed"
```

**If any check fails, STOP.** Re-copy both documents from the primary working tree (`/Users/diaz/pssa-prep-platform-live/specs/`), amend the documentation commit, and rerun this verification before authoring.

Then: preflight (§0.1) → author → gates → scope guard → commit (no merge) → report. Independent audit before merge. After merge: `git worktree remove ../pssa-moy-p2-items`.
