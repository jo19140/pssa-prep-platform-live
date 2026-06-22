# Codex Spec — MOY P4 Item Authoring (Grade 3, drama "The Last Rehearsal")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-22.
**Preconditions:** MOY P1+P2+P3 merged on `main` (P3 at `d29cfcb`). P4 passage package APPROVED: `specs/pssa_g3_moy_p4_passage_package.md` (**1,086 words**, drama). Blueprint locked: `specs/pssa_g3_benchmark_blueprint_moy_eoy.md`.
**Single passage (NOT paired), drama, no figure.** This unit hosts **7 items: 6 operational (7 pts) + 1 analytics-only (1 pt).**

## 0. Scope & guardrails

- Author **one passage (P4) + its 7-item set**, file-based only (`noDbWrite`), all `reviewStatus=PENDING` / `itemStatus=candidate`. Nothing approved/student-facing.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry (`mappingRegistry` in `lib/content/pssaInsightMapping.ts`), delivery, the figure module, schema, or BOY/foundation/MOY-P1/P2/P3 content. Do NOT assemble the form and **do NOT set `scoringBucket`** (assembly-only). P4 only.
- **No paired group** (P4 is single-passage), **no `PssaPassageGroup`/`passageLinks`/`isCrossText`/`requiredEvidenceSlotsJson`**, **no figure**, **no `factCheckNotesJson`** (drama is fictional → `factCheckRequired:false`).
- STOP and report if anything needs a DB schema change.
- Run in a clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), same pattern as P1–P3.

## 0.1 Source-package preflight (run FIRST — FAIL-CLOSED)

Verify the **committed** P4 package in the worktree (`git show HEAD:specs/pssa_g3_moy_p4_passage_package.md`). Each required string checked **individually** via `require_in_commit` (§9). Required:
- status says **APPROVED**; passage body word count = **1,086** (computed programmatically, §9);
- central message reworded — contains `combining everyone's strengths` and Priya's final line `Good thing we each knew how to help`;
- non-overlap note corrected — contains `sharing a hollow log during a storm`;
- seeded evidence present — `frantically`, `butterflies in my stomach`, `back to square one`.

**Reject a stale copy** containing any of: `Good thing nobody listened to just one of us`, `using everyone's ideas`, `woodland characters performing a story` → STOP.

## 1. Deliverables

- New author script `scripts/content/author-pssa-moy-p4.ts` (mirror `author-pssa-moy-p2.ts` — single-passage literary, no figure).
- Exemplars under `exemplars/pssa_grade3_moy_p4/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV); wire into `scripts/test-pssa-content.ts`.
- New `scripts/test-pssa-moy-p4.ts` (structure + EBSR + distractor-quality regression; §7).

## 2. Passage authoring (`PssaPassage`)

From the approved package (**verbatim text; do not rewrite**):
- `id` = `pssa_psg_g3_moy_p4_last_rehearsal`; `title` "The Last Rehearsal"; gradeLevel 3; subject ELA; `genre` = `drama`; `passageType` = `literary` (mirror the canonical drama exemplar `rabbit_drama_released_length.json`).
- `text` = the approved **1,086-word** script verbatim (character list, **SETTING**, scene headings, dialogue, italic stage directions all included); `wordCount` 1086.
- **No `textFeaturesJson` figure** (no figure feature; drama conventions live inline in `text`).
- `staminaBand` = `released_length`; `factCheckRequired:false` (no `factCheckNotesJson` — fictional drama).
- MOY identity in `provenanceJson` (`benchmarkSeason:"MOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-moy-v1"`, `unit:"P4"`).
- Metadata mirror the delivered stamina passages: `sourceType="internal_original"`, `licenseStatus="cleared_internal_original"`, `commercialUseAllowed=true`, `needsLegalReview=false`; `reviewStatus=PENDING`; `itemStatus=candidate`.
- Non-overlap: distinct from BOY (incl. its **woodland drama** — animals sharing a hollow log in a storm), MOY P1 (museum, figure), MOY P2 (narrative "The Stubborn Dough"), MOY P3 (paired mail), foundation.

## 3. Item set (7 items — 6 operational / 7 pts + 1 analytics-only / 1 pt)

Each item has a **distinct primary evidence target** (§7.1 of the package is LOCKED); reading-MCQ EC repeats ≤2; no form EC > 3. Every item links to the single passage `pssa_psg_g3_moy_p4_last_rehearsal` (via `passageId`).

| # | Construct | EC | Type | Pts | Bucket (assembly) | Key |
|---|---|---|---|---|---|---|
| 1 | What happens to the backdrop | `E03.A-K.1.1.1` | MCQ | 1 | operational | **D** (3) |
| 2 | Identify the inferred central message | `E03.A-K.1.1.2` | MCQ | 1 | operational | **A** (0) |
| 3 | Marcus's motivation | `E03.A-K.1.1.3` | MCQ | 1 | operational | **B** (1) |
| 4 | Meaning of **frantically** | `E03.A-V.4.1.1` | MCQ | 1 | operational | **C** (2) |
| 5 | Meaning of **"butterflies in my stomach"** | `E03.A-V.4.1.2` | MCQ | 1 | operational | **D** (3) |
| 6 | Priya's idea → Marcus's turning point | `E03.A-K.1.1.3` | EBSR | 2 | operational | Part A **B** (1) |
| 7 | AO-2: **"back to square one"** | `E03.A-V.4.1.2` | MCQ | 1 | **analytics_only** | **A** (0) |

Operational = 5 MCQ × 1 + 1 EBSR × 2 = **7 pts** (6 items). Analytics-only = 1 MCQ × 1 = **1 pt**. The author script sets **NO** `scoringBucket` (assembly-only).

**Operational MCQ key plan (items 1–5): D, A, B, C, D** → per-passage distribution A1/B1/C1/D2, max share **0.40** (cap met). This completes the full MOY operational-reading-MCQ distribution at **A5/B5/C5/D5** on the already-pinned P1–P3 keys. AO-2 (item 7) key **A** (analytics). Do not re-shuffle.

**Form-level Category-A EC reconciliation with P2 (caps respected):**
- `A-K.1.1.1`: P2 ×1 + P4 ×1 = **2**.
- `A-K.1.1.2`: P2 MCQ + P2 SA + P4 MCQ = **2 MCQ + 1 SA = 3** (cap OK).
- `A-K.1.1.3`: P2 TE grid + P4 MCQ + P4 EBSR = **3** (cap OK).
- `A-V.4.1.1`: P2 ×1 + P4 ×1 = **2**.
- `A-V.4.1.2`: P2 ×1 + P4 operational ×1 = **2 operational**, plus **AO-2 analytics_only** (does not count toward the operational cap; Phase 4A). Reading-MCQ operational repeats ≤2 ✓.

### 3.0 Item modeling — single passage, evidence kind (NEW vs P3)

P4 is **single-passage**: every item carries `passageId = pssa_psg_g3_moy_p4_last_rehearsal`, **no** `passageGroupId`, **no** `passageLinks`, **no** `isCrossText`, **no** `requiredEvidenceSlotsJson`, **no** `passageSlot` on EBSR Part B (single text). Use the canonical single-passage drama shapes verified against `rabbit_drama_released_length.json`.

Evidence kind (`evidenceBinding.evidenceKind`; drama-appropriate; no fabricated `quotedSpan` offsets):

| # | EC | Type | evidenceKind | anchor |
|---|---|---|---|---|
| 1 | A-K.1.1.1 | MCQ | `stage_direction` | the gust + tear stage direction |
| 2 | A-K.1.1.2 | MCQ | `whole_passage_synthesis` | inferred message (whole play) |
| 3 | A-K.1.1.3 | MCQ | `spoken_line` | Marcus's lines |
| 4 | A-V.4.1.1 | MCQ | `quoted_span` | "frantically" in its stage direction |
| 5 | A-V.4.1.2 | MCQ | `quoted_span` | "butterflies in my stomach" |
| 6 | A-K.1.1.3 | EBSR | Part A `section_synthesis` (Scene 2); Part B `spoken_line` per choice | turning point |
| 7 | A-V.4.1.2 | MCQ | `quoted_span` | "back to square one" |

### 3.1 Pinned IDs & deterministic keys

| Slot | Item ID | EC | Type | Key |
|---|---|---|---|---|
| Passage | `pssa_psg_g3_moy_p4_last_rehearsal` | — | drama | — |
| 1 | `pssa_item_g3_moy_p4_mcq_ak111` | A-K.1.1.1 | MCQ | **D** (3) |
| 2 | `pssa_item_g3_moy_p4_mcq_ak112` | A-K.1.1.2 | MCQ | **A** (0) |
| 3 | `pssa_item_g3_moy_p4_mcq_ak113` | A-K.1.1.3 | MCQ | **B** (1) |
| 4 | `pssa_item_g3_moy_p4_mcq_av411` | A-V.4.1.1 | MCQ | **C** (2) |
| 5 | `pssa_item_g3_moy_p4_mcq_av412` | A-V.4.1.2 | MCQ | **D** (3) |
| 6 | `pssa_item_g3_moy_p4_ebsr_ak113` | A-K.1.1.3 | EBSR | Part A **B** (1) |
| 7 | `pssa_item_g3_moy_p4_mcq_av412_ao2` | A-V.4.1.2 | MCQ | **A** (0) |

### 3.2 Item constructs (pinned — honor §7.1 of the package + the locked evidence reservations)

**Item 1 (`A-K.1.1.1`) — key D.** Stem: *what happens to the castle backdrop?* Correct: **a gust of wind blows in and the painted castle tears down the middle.** Distractors name plausible-but-wrong events (Marcus knocks it over with the ladder; the paint is still wet and smears; someone steps through the gate). Evidence = the tear stage direction (`stage_direction`).

**Item 2 (`A-K.1.1.2`) — key A.** Stem: *which sentence best states the central message?* Correct: a general statement that **listening to one another and combining everyone's strengths can solve a problem** (better than giving up or sticking to one plan). Distractors = a too-narrow detail (always keep a spare backdrop), an off-message moral (hard work always pays off), a plausible-but-wrong theme (it is best to follow the original plan). Must be **inferred** — not a copied stated moral. (Anchor: resolution + Priya's "Good thing we each knew how to help.")

**Item 3 (`A-K.1.1.3`) — key B.** Stem: *why does Marcus want to repaint the same castle?* Correct: **he is proud of the three weeks he spent and wants it to look just as he planned.** Distractors = wrong motivation (he wants to finish before Jada; he dislikes Priya's idea of teamwork; he is afraid of the dark stage). Evidence = Marcus's spoken lines ("I spent three weeks on this castle"; "It won't look real. Mine looked real."). **This item tests MOTIVATION; the turning point is reserved for item 6 (§7.1).**

**Item 4 (`A-V.4.1.1`) — key C.** Target = **"frantically"** in "*(pacing frantically back and forth)*". Correct meaning = **in a fast, worried, out-of-control way.** Distractors = plausible misreads (slowly and calmly; quietly; angrily). Undefined, context-supported (Jada is panicking about the show).

**Item 5 (`A-V.4.1.2`, operational) — key D.** Target = **"butterflies in my stomach"** (Jada, Scene 1). Correct meaning = **a nervous, fluttery feeling.** Distractors = literal misread (real insects); wrong feeling (very hungry; very sleepy). **Distinct phrase from item 7.**

**Item 6 (`A-K.1.1.3`, EBSR, 2 pts) — Part A key B. §4 pins the Part B contract.**
- **Part A** (1 correct + 3 distractors, 3 distinct roles) — **foreground character ACTIONS (the `A-K.1.1.3` skill), not generic problem/solution.** Stem: *"How do Priya's and Marcus's actions help the students begin solving the backdrop problem?"* Correct (**B**) = **"Priya proposes a simpler design, and Marcus agrees to listen and try it."** (Aligns exactly with the two correct Part B excerpts: Priya proposes the new design, then Marcus says "...Okay. Show me what you mean.") Distractors (3 distinct roles) = Marcus repaints the original castle by himself (abandoned plan); the students cancel the show (Jada's rejected idea); Ms. Reyes fixes the backdrop for them (unsupported).
- **Part B** (single-passage; choices are bare `text`, **no `passageSlot`**): §4.

**Item 7 (AO-2, `A-V.4.1.2`, analytics) — key A.** Target = **"back to square one"** (Marcus, Scene 2). Correct meaning = **back to the beginning, having to start over.** Distractors = literal/wrong (back to a square shape; back to the first row of seats; finished and done). **Separate phrase from item 5 — the two figurative items must not test the same expression.**

## 4. EBSR Part B contract (item 6 — single-passage, drama)

Use only the **existing** canonical single-passage EBSR shape (verified against `rabbit_drama_released_length.json`); do NOT add `passageSlot`/`passageGroupId`, and do NOT touch scoring.

1. **Exactly 4 Part B choices, all verbatim** spoken lines from the passage; `requiredSelectionCount = 2`.
2. **Two correct excerpts (pinned verbatim at author time from the committed passage; substring-checked):**
   - Priya — `What if we don't copy the old one? What if we build something new — together?`
   - Marcus — `...Okay. Show me what you mean.`
3. **Two distractors, each tied to a Part A misconception (not random lines):**
   - one tied to **Jada's desire to cancel** (e.g., the verbatim line `A torn castle on stage is worse than no play at all.`);
   - one tied to **Marcus's initial resistance** (e.g., the verbatim line `It won't look real. Mine looked real.`).
4. **Pinned order** `[Priya-correct, Jada-cancel-distractor, Marcus-correct, Marcus-resist-distractor]` → **`correctResponseJson.partB.correctIndices = [0, 2]`**; **`correctResponseJson.partA.correctIndex = 1`** (key B).
5. **Scoring unchanged — canonical 2-pt EBSR** (`scoringJson`): `{ totalPoints:2, partAPoints:1, partBPoints:1, requirePartACorrectForFullCredit:true, partialCreditRules:[…] }` exactly as the existing 2-pt EBSR convention. If unclear, **STOP** rather than inventing values.
6. **Every Part B choice text appears character-for-character in the passage** (author verifies each via substring check and STOPs on any miss). The two distractors support plausible Part A misreads (cancel / repaint-alone).

## 5. Answer-choice & distractor quality (blueprint §6.2–6.3 — enforced, P1–P3-hardened)

- MCQ: exactly 4 choices (1 correct + 3 distractors). **Each distractor: a DISTINCT misconception, a UNIQUE registered `distractorRole` (no role repeated within an item), a truthful rationale matching that role, and a misconception tag.** Minimally revise choice **text** (never relabel inaccurately) if two would share a role.
- **EBSR Part A** (item 6): same rule — 1 correct + **3 distinct registered roles**.
- Every `distractorRole` ∈ `mappingRegistry` (reading roles: `wrong_section`, `wrong_emphasis`, `opposite_claim`, `too_narrow`, `plausible_misreading`, `unsupported_inference`).
- No duplicate-cause / semantic near-duplicate distractors (esp. item 3's wrong motivations must be genuinely different; items 5 vs 7 must not test the same phrase).
- Four-option balance in wording/length/specificity; correct answer not identifiable by length/detail/style; no joke/impossible options.
- **All EBSR excerpts verbatim and anchored** (§4); Part B distractors aligned to Part A misconceptions.
- Student preview leak-free (no keys/rationales/distractorRoles/`correctIndices`); reviewer preview has keys + rationales.

## 6. Inherited content gates (Rule 0)

All items inherit the full stack: passage grounding (every choice/stem grounded in the P4 script), `PSSA_ITEM_EC_SKILL_MISMATCH` (the question tests the skill its EC names — fix the item, never retag: item 2 = *identify* central message, item 3 = *motivation* not POV/plot, item 6 = character/turning-point with evidence), drama **item-type contract** (spoken-line vs stage-direction handling), source-compliance no-copy scan, batch position-distribution gate. WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

Run **fail-closed** (`set -euo pipefail`, newline-separated — never `;`-chained):

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-moy-p4.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected by P4 content
echo "all P4 gates passed"
```

**`scripts/test-pssa-moy-p4.ts` must assert:**
1. 1 passage (1086 words, PENDING/candidate, `genre=drama`/`passageType=literary`, `released_length`, **no figure feature**, `factCheckRequired:false`, **no `factCheckNotesJson`**) + 7 items; types/ECs/points per §3.
2. Operational MCQ keys (items 1–5) = **D,A,B,C,D**; AO-2 (item 7) key **A**; EBSR Part A key **B**, Part B `correctIndices=[0,2]`. No `scoringBucket` field on any item.
3. Single-passage modeling: every item has `passageId` and **no** `passageGroupId`/`passageLinks`/`isCrossText`/`requiredEvidenceSlotsJson`; EBSR Part B choices have **no** `passageSlot`.
4. Every MCQ **and EBSR Part A** has **3 distinct** `distractorRole` values; every role ∈ `mappingRegistry`; each rationale nonblank and role-aligned.
5. EBSR (item 6): exactly 4 Part B choices, `requiredSelectionCount=2`, **all verbatim** in the passage; the two correct excerpts are the pinned Priya + Marcus lines; the two distractors are the Jada-cancel + Marcus-resist lines; `correctIndices=[0,2]`; canonical `scoringJson` (2/1/1, `requirePartACorrectForFullCredit:true`).
6. Distinct evidence: item 3 (Marcus motivation) and item 6 (turning point) do **not** share the same correct evidence; items 5 and 7 test **different** figurative phrases ("butterflies in my stomach" ≠ "back to square one").
7. EC-skill-match passes for all reading MCQ. Student DTO/preview leak-free.

## 7.1 Mechanical safeguards (before the stop report)

- Author run (canonical `noDbWrite`): `npx tsx scripts/content/author-pssa-moy-p4.ts` — writes ONLY `exemplars/pssa_grade3_moy_p4/*`, no DB mutation (`backend.json` `noDbWrite:true`/`productionImportReady:false`).
- Scope guard before commit: `git diff --name-only HEAD`; `git status --short`. Allowed paths only (§8).
- After commit: `git diff --name-only origin/main...HEAD` and `git status --short` — limited to the **six allowed path patterns** in §8.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-moy-p4.ts
scripts/test-pssa-moy-p4.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_moy_p4/*
specs/codex_pssa_moy_p4_items.md
specs/pssa_g3_moy_p4_passage_package.md
```
(Six allowed path patterns total — including the passage package committed in §9.) Anything else (BOY/foundation/MOY-P1/P2/P3, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.

- 1 drama passage (1086w, no figure, no fact-check records) + 7 items per §3; EC/type/points/keys exact; single-passage modeling; EBSR 4 verbatim Part B choices / `correctIndices=[0,2]` / canonical 2-pt scoring; item 3 ≠ item 6 evidence; item 5 ≠ item 7 phrase; unique registry-key roles per MCQ/EBSR-Part-A; **no `scoringBucket`**; leak-free; noDbWrite; scope clean; all gates + regression green.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`). Both P4 docs are **new/untracked**, so carry BOTH into the worktree and commit them so the §0.1 preflight reads the approved 1,086-word package:

```
set -euo pipefail

PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-moy-p4-items

cd "$PRIMARY"
git fetch origin

if git show-ref --verify --quiet refs/heads/codex/pssa-moy-p4-items; then
  echo "STOP: branch exists"
  exit 1
fi

test ! -e "$WORKTREE" || {
  echo "STOP: worktree path exists"
  exit 1
}

git worktree add "$WORKTREE" \
  -b codex/pssa-moy-p4-items \
  origin/main

cd "$WORKTREE"

test "$(git branch --show-current)" = "codex/pssa-moy-p4-items"
test -z "$(git status --short)"

cp \
  "$PRIMARY/specs/pssa_g3_moy_p4_passage_package.md" \
  "$PRIMARY/specs/codex_pssa_moy_p4_items.md" \
  specs/

git add \
  specs/pssa_g3_moy_p4_passage_package.md \
  specs/codex_pssa_moy_p4_items.md

git diff --name-only HEAD
# expect exactly the two spec docs

git commit -m \
  "MOY P4: approved drama passage package + item-authoring spec"
```

**Mandatory post-Step-0 committed-source verification (FAIL-CLOSED)** — run after both P4 docs are committed in the clean worktree. Check each required string individually and exit non-zero on any miss:

```
require_in_commit() {
  file="$1"; text="$2"
  if ! git show "HEAD:$file" | grep -qF "$text"; then
    echo "STOP: required committed text missing"; echo "File: $file"; echo "Text: $text"; exit 1
  fi
}

# item spec self-references + key gate strings
require_in_commit specs/codex_pssa_moy_p4_items.md "npm run test:pssa-db6"
require_in_commit specs/codex_pssa_moy_p4_items.md "specs/pssa_g3_moy_p4_passage_package.md"
require_in_commit specs/codex_pssa_moy_p4_items.md "D, A, B, C, D"

# approved package preflight strings (message + non-overlap + seeded evidence)
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "APPROVED"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "combining everyone's strengths"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "Good thing we each knew how to help"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "sharing a hollow log during a storm"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "frantically"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "butterflies in my stomach"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "back to square one"

# EBSR item-6 evidence lines (2 correct + 2 distractors) must exist verbatim before authoring
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "What if we don't copy the old one? What if we build something new — together?"
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "...Okay. Show me what you mean."
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "A torn castle on stage is worse than no play at all."
require_in_commit specs/pssa_g3_moy_p4_passage_package.md "It won't look real. Mine looked real."

# reject stale wording that the approved revisions removed
for bad in \
  "Good thing nobody listened to just one of us" \
  "using everyone's ideas" \
  "woodland characters performing a story"
do
  if git show HEAD:specs/pssa_g3_moy_p4_passage_package.md |
     grep -qF "$bad"; then
    echo "STOP: stale P4 package wording was committed ($bad)"
    exit 1
  fi
done

# ASSERT passage body word count == 1086 from the committed package.
# NOTE: dump to a temp file first — a `git show ... | python3 - <<'PY'` pipe does NOT work,
# because the heredoc replaces stdin, so the piped package never reaches Python.
git show HEAD:specs/pssa_g3_moy_p4_passage_package.md > "${TMPDIR:-/tmp}/p4pkg.md"
P4PKG="${TMPDIR:-/tmp}/p4pkg.md" python3 - <<'PY' || exit 1
import os, re, sys
txt = open(os.environ["P4PKG"]).read()
body = txt.split("## 2. Passage")[1].split("## 3. Source")[0]
n = len(re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z]+)?", body))
if n != 1086:
    print(f"STOP: committed P4 passage word count {n} != 1086"); sys.exit(1)
print(f"word count OK: {n}")
PY

# the documentation commit must contain EXACTLY the two intended files — COMPARE, don't just print:
actual="$(git show --name-only --pretty=format: HEAD | sed '/^$/d' | sort)"
expected="$(printf '%s\n' specs/codex_pssa_moy_p4_items.md specs/pssa_g3_moy_p4_passage_package.md | sort)"
if [ "$actual" != "$expected" ]; then
  echo "STOP: documentation commit file set is not exactly the two spec docs"
  echo "--- actual ---"; printf '%s\n' "$actual"
  echo "--- expected ---"; printf '%s\n' "$expected"
  exit 1
fi

echo "committed-source verification passed"
```

**If any check fails, STOP.** Re-copy both documents from the primary working tree (`/Users/diaz/pssa-prep-platform-live/specs/`), amend the documentation commit, and rerun this verification before authoring.

Then: preflight (§0.1) → author → gates → scope guard → commit (no merge) → report. Independent audit before merge. After merge: `git worktree remove /Users/diaz/pssa-moy-p4-items`.
