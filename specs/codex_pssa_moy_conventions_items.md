# Codex Spec — MOY Conventions Item Authoring (Grade 3, 9 standalone Category-D items)

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-22.
**Preconditions:**
- MOY P1–P3 merged and verified on `origin/main`.
- **P4 is independent and is NOT a prerequisite** for this conventions tranche (these are standalone `passageId=null` items; the no-reuse checks depend only on the foundation and BOY conventions banks).
- MOY form assembly remains blocked until **both** P4 and conventions are merged.

Blueprint locked: `specs/pssa_g3_benchmark_blueprint_moy_eoy.md`.
**No passage, no figure, no EBSR, no fact-check.** Nine **standalone** Grade-3 conventions items (`passageId = null`), one point each, **9 distinct ECs (no repeats)**, all **operational** (none analytics-only).

## 0. Scope & guardrails

- Author **9 standalone conventions items** only, file-based (`noDbWrite`), all `reviewStatus=PENDING` / `itemStatus=candidate`. Nothing approved/student-facing.
- **Conventions items are registry-EXEMPT:** they carry `errorPattern` (free-form, per distractor) + `ecSkillFamily="conventions"` + `targetConvention` + `targetSubskill`, and **do NOT carry `distractorRole`.** Do **NOT** add or invent `mappingRegistry` roles (the conventions trap: `errorPattern` ≠ `distractorRole` vocab). The class report maps conventions items via `ecSkillFamily`/`targetSubskill`, not `distractorRole`.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry, delivery, the figure module, schema, or BOY/foundation/MOY-P1–P4 content. Do NOT assemble the form, and **do NOT set a section field or `scoringBucket` on the bank items** (section S1/S3 placement is assembly-only — §5).
- STOP and report if anything needs a DB schema change or if an EC cannot be authored within the existing INLINE_DROPDOWN contract.
- Run in a clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path / fail-closed flow (§9).

## 0.1 Source preflight (run FIRST — FAIL-CLOSED)

There is no passage package. Instead, verify the **two existing** conventions sources on `origin/main` so new MOY items do not collide — comparing **content, not filenames**:
- `exemplars/pssa_grade3_conventions/grade3_conventions_backend.json` (foundation conventions bank), and
- `exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json` (**BOY stamina conventions `conv_01`–`conv_09`**).

The BOY set already covers **adverb function (conv_01), future tense (conv_03), subject-verb agreement (conv_04), title capitalization (conv_06), dialogue punctuation (conv_08), and spelling (conv_09)** — the same ECs as several MOY items. Therefore the MOY items must use **distinct contexts, target words/phrases, and option sets**, not merely non-identical filenames or stems. The author and `test-pssa-moy-conventions.ts` (§7) must programmatically confirm, for every MOY item, that its **normalized stem**, its **`targetWordOrPhrase`/correct answer**, and its **option-text set** do not match any item in either source file (§7 assertion 6).

## 1. Deliverables

- New author script `scripts/content/author-pssa-moy-conventions.ts` (mirror `author-pssa-grade3-conventions.ts` — INLINE_DROPDOWN single_blank, standalone).
- Exemplars under `exemplars/pssa_grade3_moy_conventions/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV); wire into `scripts/test-pssa-content.ts`.
- New `scripts/test-pssa-moy-conventions.ts` (structure + key plan + error-pattern-quality + no-reuse regression; §7).

## 2. Item modeling (`INLINE_DROPDOWN` / `single_blank`, standalone)

Mirror the canonical conventions shape verified in `grade3_conventions_backend.json`:
- `interactionType = "INLINE_DROPDOWN"`, `interactionSubtype = "single_blank"`; `pointValue = 1`; **`passageId = null`** (standalone).
- `ecSkillFamily = "conventions"`; `targetConvention` (human-readable) + `targetSubskill` (snake_case) per §3.1.
- `baseTextWithBlanks` = a short Grade-3 sentence with exactly one `___` blank.
- `blanks` = array of **one** blank object: `{ blankId, position, options[], correctIndex, targetSkill, targetWordOrPhrase, rationale }`.
- **`options` = exactly 4** per blank: 1 correct + 3 distractors. Each option `{ text, errorPattern, rationale }`: the correct option has `errorPattern: null`; **each distractor has a DISTINCT, non-null `errorPattern`** describing a different grammar/punctuation/spelling/usage mistake. `correctIndex` = the option index per the §5 key plan.
- `scoring` = canonical conventions shape (`{ totalPoints:1, partialCreditRules:[{points:1,…},{points:0,…}], scoringNotes }`).
- Metadata mirror the conventions bank: `sourceType="internal_original"`, `licenseStatus="cleared_internal_original"`, `reviewStatus=PENDING`, `itemStatus=candidate`; `auditMetadata.noDbWrite=true`. MOY identity in provenance (`benchmarkSeason:"MOY"`, `unit:"conventions"`).

> NOTE: existing bank items used **3** options; the MOY set uses **4** per the locked quality requirement. The item-type contract gate (`PSSA_INLINE_DROPDOWN_ONE_CORRECT_PER_BLANK`) validates only that `correctIndex` is in range, so 4 options is contract-valid. If any gate rejects 4 options, **STOP** (do not silently drop to 3).

## 3. Item set (9 items / 9 operational pts — 9 distinct ECs)

| # | EC | Skill | Planned section | Key → `correctIndex` |
|---|---|---|---|---|
| 1 | `E03.D.1.1.1` | Function of nouns/pronouns/verbs/adjectives/adverbs | S1 | **B → 1** |
| 2 | `E03.D.1.1.4` | Regular and irregular verbs | S1 | **D → 3** |
| 3 | `E03.D.1.1.5` | Simple verb tenses | S1 | **A → 0** |
| 4 | `E03.D.1.1.6` | Subject-verb / pronoun-antecedent agreement | S1 | **C → 2** |
| 5 | `E03.D.1.1.8` | Coordinating / subordinating conjunctions | S1 | **A → 0** |
| 6 | `E03.D.1.2.1` | Capitalization in titles | S3 | **C → 2** |
| 7 | `E03.D.1.2.3` | Commas & quotation marks in dialogue | S3 | **B → 1** |
| 8 | `E03.D.1.2.5` | Conventional spelling & suffixes | S3 | **D → 3** |
| 9 | `E03.D.2.1.1` | Word or phrase choice for effect | S3 | **A → 0** |

9 distinct ECs, no repeats; 9 operational points. **Section (5 S1 / 4 S3) is recorded here for the form plan but NOT written on the bank item** (assembly-only, like `scoringBucket`).

### 3.1 EC → `targetConvention` / `targetSubskill` (mirror existing; 3 are new descriptive values, NOT registry roles)

| EC | targetConvention | targetSubskill | status |
|---|---|---|---|
| D.1.1.1 | word function in a sentence | `word_function` | existing |
| D.1.1.4 | regular and irregular verbs | `regular_irregular_verbs` | **new (descriptive)** |
| D.1.1.5 | simple verb tense | `verb_tense` | existing |
| D.1.1.6 | subject-verb agreement | `subject_verb_agreement` | existing |
| D.1.1.8 | coordinating and subordinating conjunctions | `conjunctions` | **new (descriptive)** |
| D.1.2.1 | capitalization in titles | `title_capitalization` | existing |
| D.1.2.3 | quotation marks and commas in dialogue | `dialogue_punctuation` | existing |
| D.1.2.5 | grade-level spelling and suffixes | `spelling_in_context` | existing |
| D.2.1.1 | word or phrase choice for effect | `word_choice_for_effect` | **new (descriptive)** |

`targetConvention`/`targetSubskill`/`errorPattern` are free-form descriptive strings, **not** `mappingRegistry` keys — adding the three new ones is **not** "inventing registry roles."

### 3.2 Per-item constructs (pinned EC/skill/key; sample stems are guidance — author may refine but must keep the EC, key, and 3 distinct error patterns; stems must be NEW)

1. **D.1.1.1 (key B/1)** — blank requires a specific part of speech (an **adverb**). **Use correctly spelled forms from different parts of speech — NO spelling-error distractor** (a misspelling would partly test D.1.2.5, not word function). Pinned example:
   > "The students carried the model ___ across the room."
   > `[0] careful` (adjective) · `[1] carefully` ← **correct (B)** · `[2] care` (noun/verb) · `[3] carefulness` (noun)
   errorPatterns: adjective used where an adverb is needed / base noun-or-verb used where an adverb is needed / `-ness` noun used where an adverb is needed.
2. **D.1.1.4 (key D/3)** — irregular verb **formation** (not generic tense). Pinned example:
   > "Yesterday, Ava ___ her bicycle."
   > `[0] rided` · `[1] ridden` · `[2] rides` · `[3] rode` ← **correct (D)**
   errorPatterns: regular `-ed` added to an irregular verb / past participle used as simple past / present tense used for past.
3. **D.1.1.5 (key A/0)** — **regular** verb selected by a time cue; the correct option must **NOT be the unique longest** choice. Pinned example (correct is one word; a distractor is the two-word form):
   > "Yesterday, the class ___ across the bridge."
   > `[0] crossed` ← **correct (A)** · `[1] crosses` · `[2] will cross` · `[3] crossing`
   errorPatterns: present tense for past / future tense for past / `-ing` form without a helping verb.
4. **D.1.1.6 (key C/2)** — subject-verb agreement with an intervening prepositional phrase. Pinned example:
   > "Today, the group of students ___ ready to begin."
   > `[0] were` · `[1] are` · `[2] is` ← **correct (C)** · `[3] be`
   errorPatterns: plural past verb agreeing with the nearer noun "students" not the head noun "group" / plural present verb agreeing with the nearer noun / base form with no agreement.
5. **D.1.1.8 (key A/0)** — subordinating/coordinating conjunction with **one unambiguous logical relationship** (cause); the surrounding context must make only one option valid. Pinned example:
   > "The path was muddy. Maya wore boots ___ she did not want mud on her socks."
   > `[0] because` ← **correct (A)** · `[1] although` · `[2] or` · `[3] so`
   errorPatterns: contrast conjunction where cause is needed / choice conjunction where cause is needed / result conjunction that reverses cause-and-effect. (The added "she did not want mud on her socks" fixes the causal reading so "although" is no longer grammatically defensible.)
6. **D.1.2.1 (key C/2)** — choose the correctly capitalized **title**. Pinned example:
   > `[0] the secret in the attic` · `[1] The Secret In The Attic` · `[2] The Secret in the Attic` ← **correct (C)** · `[3] The secret in the Attic`
   errorPatterns: all words lowercase / important small words ("In","The") over-capitalized / inconsistent capitalization (first word lowercase, a later word capitalized). (Legitimate capitalization minimal pair — exempt from the capitalization-pattern outlier check per §4.)
7. **D.1.2.3 (key B/1)** — correctly punctuated dialogue (comma inside the quotation marks before the tag). Pinned example (Base: `___ said Omar.`):
   > `[0] "Please close the gate"` · `[1] "Please close the gate,"` ← **correct (B)** · `[2] "Please close the gate",` · `[3] Please close the gate,`
   errorPatterns: missing comma before the dialogue tag / comma placed outside the quotation marks / missing quotation marks. (Legitimate punctuation minimal pair — exempt from the punctuation-amount outlier check per §4.)
8. **D.1.2.5 (key D/3)** — suffix spelling change (drop-e before `-ing`). Pinned example:
   > "Lena is ___ a poster for the fair."
   > `[0] makeing` · `[1] makking` · `[2] makin` · `[3] making` ← **correct (D)**
   errorPatterns: silent `e` kept before `-ing` / consonant doubled incorrectly / final letter(s) dropped.
9. **D.2.1.1 (key A/0)** — most precise **word choice for effect**, with a **strong context clue** in the surrounding sentence. Pinned example:
   > "The puppy ___ across the yard, kicking up dust as it hurried to greet Maya."
   > `[0] raced` ← **correct (A)** · `[1] went` · `[2] strolled` · `[3] proceeded`
   The three distractors are grammatically possible but represent **distinct** weaknesses (NOT three versions of the same "weaker word"): overly general (`went`) / too slow for the context, contradicting "hurried" (`strolled`) / awkwardly formal register (`proceeded`).

## 4. Answer-choice & error-pattern quality (conventions-specific)

- Exactly **4 options** per blank: 1 correct (`errorPattern: null`) + 3 distractors.
- **Each distractor carries a DISTINCT, non-null `errorPattern`** — a different grammar / punctuation / spelling / usage mistake. No two distractors share the same error pattern; **no exact-duplicate option text**.
- **Minimal pairs are appropriate** (and encouraged) for conventions: options may differ only in the exact convention under test — but each option must still differ in the precise convention tested and carry a distinct error pattern (blueprint minimal-pair allowance).
- Keep option **length and structure parallel**; the correct answer must not be identifiable by length/format/oddness.
- Every option has a truthful `rationale`; the correct option's rationale states why it is correct, each distractor's rationale names its error.
- Mirror existing conventions metadata shapes (`ecSkillFamily`/`targetConvention`/`targetSubskill`/`blanks`/`errorPattern`/`rationale`); **do not** invent `distractorRole`s or any registry vocab.
- **No BOY/existing-bank stem or answer-choice reuse** (§0.1); all 9 contexts/target words/option sets are new vs **both** source files.
- **Option-outlier control (enforceable parallelism — meaningful outliers only; exact character-count uniqueness is NOT a clue):** fail an item only when the **correct** option is (i) the **only multiword** option; (ii) the **sole longest or shortest by a substantial margin** (>35% longer/shorter than *every* distractor); (iii) **uniquely different in capitalization or punctuation when that is not the tested construct**; or (iv) **structurally different in part of speech or sentence form** for reasons unrelated to the EC. A merely-unique character count (e.g., `carefully` at 9 chars, `rode` as shortest, `because`, `raced`) is **acceptable** and does not fail. **Exception:** D.1.2.1 (capitalization) is exempt from (iii)-capitalization and D.1.2.3 (punctuation) is exempt from (iii)-punctuation, since those differences ARE the construct.
- Student preview leak-free (no `correctIndex`/`errorPattern`/`rationale`); reviewer preview carries the key + error patterns + rationales.

## 5. Key plan & answer-position distribution

Per-item `correctIndex` is intrinsic and pinned (§3). The planned section split and key sequence:

```
S1 (5 items): B, D, A, C, A   → correctIndex 1,3,0,2,0
S3 (4 items): C, B, D, A      → correctIndex 2,1,3,0
```

Conventions key tally = **A3 / B2 / C2 / D2**. Added to the 20 operational reading MCQ (which finish at A5/B5/C5/D5 after P4), the full 29-MCQ operational distribution is **A8 / B7 / C7 / D7**. **Section assignment is assembly-only** — do not write a section field on the bank items.

## 6. Inherited content gates (Rule 0)

All items inherit: `PSSA_ITEM_EC_SKILL_MISMATCH` (each item tests exactly the convention its EC names — fix the item, never retag the EC), the **INLINE_DROPDOWN item-type contract** (`PSSA_INLINE_DROPDOWN_EACH_BLANK_VALID`, `PSSA_INLINE_DROPDOWN_ONE_CORRECT_PER_BLANK`: one in-range `correctIndex` per blank), source-compliance no-copy scan, and the conventions **minimal-pair allowance** (a near-duplicate option set is permitted **iff** each option differs in the exact convention tested and carries a distinct error pattern — this is the documented exception to the general semantic-near-duplicate rule). WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

Run **fail-closed** (`set -euo pipefail`, newline-separated):

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-moy-conventions.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected
echo "all MOY conventions gates passed"
```

**`scripts/test-pssa-moy-conventions.ts` must assert:**
1. Exactly **9 items**, all `INLINE_DROPDOWN`/`single_blank`, `pointValue=1`, **`passageId=null`**, `ecSkillFamily="conventions"`, PENDING/candidate; **no figure/passage/EBSR/fact-check** fields.
2. The **9 ECs are exactly** {D.1.1.1, D.1.1.4, D.1.1.5, D.1.1.6, D.1.1.8, D.1.2.1, D.1.2.3, D.1.2.5, D.2.1.1} with **no repeats**; each carries the §3.1 `targetConvention`/`targetSubskill`.
3. `correctIndex` per item = the §5 plan (1,3,0,2,0,2,1,3,0); resulting key tally **A3/B2/C2/D2**.
4. **No `distractorRole` field** appears on any conventions option (registry-exempt); **no `scoringBucket`/section** field on any item.
5. Each blank has **exactly 4 options**, 1 correct (`errorPattern:null`) + 3 distractors each with a **distinct, non-null `errorPattern`**; no duplicate option text; option lengths roughly parallel.
6. **No-reuse vs BOTH sources** (`exemplars/pssa_grade3_conventions/grade3_conventions_backend.json` **and** `exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json`, conv_01–conv_09): for every MOY item, the **normalized stem**, the **correct `targetWordOrPhrase`**, and the **set of option texts** must differ from every item in both files (not just non-identical filenames/stems).
7. **Option-outlier regression (meaningful outliers only):** for every item, FAIL only if the correct option is (i) the **only multiword** option, (ii) the **sole longest or shortest by >35%** versus every distractor, (iii) **uniquely different in capitalization/punctuation when that is not the EC**, or (iv) **structurally different in part of speech / sentence form** unrelated to the EC. A merely-unique exact character count does **not** fail. **Exempt:** D.1.2.1 from (iii)-capitalization, D.1.2.3 from (iii)-punctuation.
8. EC-skill-match passes for all 9. Student DTO/preview leak-free (no key/errorPattern/rationale).

## 7.1 Mechanical safeguards (before the stop report)

- Author run (canonical `noDbWrite`): `npx tsx scripts/content/author-pssa-moy-conventions.ts` — writes ONLY `exemplars/pssa_grade3_moy_conventions/*`, no DB mutation.
- Scope guard before commit: `git diff --name-only HEAD`; `git status --short`. Allowed paths only (§8).
- After commit: `git diff --name-only origin/main...HEAD` and `git status --short` — limited to the **five allowed path patterns** in §8.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-moy-conventions.ts
scripts/test-pssa-moy-conventions.ts
scripts/test-pssa-content.ts             (tranche wiring only)
exemplars/pssa_grade3_moy_conventions/*
specs/codex_pssa_moy_conventions_items.md
```
(Five allowed path patterns total — no passage package for this tranche.) Anything else (BOY/foundation/MOY-P1–P4, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.

- 9 standalone conventions items per §3 (distinct ECs, no repeats); INLINE_DROPDOWN/single_blank; 4 options each with distinct error patterns; `correctIndex` plan A3/B2/C2/D2; registry-exempt (no `distractorRole`); no section/`scoringBucket`; new non-reused stems; leak-free; noDbWrite; scope clean; all gates + regression green.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`). **One** spec doc to seed (no passage package this tranche). Absolute-path, fail-closed:

```bash
set -euo pipefail

PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-moy-conventions-items

cd "$PRIMARY"
git fetch origin

if git show-ref --verify --quiet refs/heads/codex/pssa-moy-conventions-items; then
  echo "STOP: branch exists"
  exit 1
fi

test ! -e "$WORKTREE" || {
  echo "STOP: worktree path exists"
  exit 1
}

git worktree add "$WORKTREE" \
  -b codex/pssa-moy-conventions-items \
  origin/main

cd "$WORKTREE"

test "$(git branch --show-current)" = "codex/pssa-moy-conventions-items"
test -z "$(git status --short)"

cp "$PRIMARY/specs/codex_pssa_moy_conventions_items.md" specs/

git add specs/codex_pssa_moy_conventions_items.md
git diff --name-only HEAD     # expect exactly the 1 spec doc
git commit -m "MOY conventions: item-authoring spec"
```

**Mandatory post-Step-0 committed-source verification (FAIL-CLOSED):**

```bash
require_in_commit() {
  file="$1"; text="$2"
  if ! git show "HEAD:$file" | grep -qF "$text"; then
    echo "STOP: required committed text missing"; echo "File: $file"; echo "Text: $text"; exit 1
  fi
}

require_in_commit specs/codex_pssa_moy_conventions_items.md "npm run test:pssa-db6"
require_in_commit specs/codex_pssa_moy_conventions_items.md "A3 / B2 / C2 / D2"
require_in_commit specs/codex_pssa_moy_conventions_items.md "registry-EXEMPT"
require_in_commit specs/codex_pssa_moy_conventions_items.md "passageId = null"
require_in_commit specs/codex_pssa_moy_conventions_items.md "P4 is independent and is NOT a prerequisite"

# the documentation commit must contain EXACTLY the one intended file — COMPARE, don't just print:
actual="$(git show --name-only --pretty=format: HEAD | sed '/^$/d' | sort)"
expected="specs/codex_pssa_moy_conventions_items.md"
if [ "$actual" != "$expected" ]; then
  echo "STOP: documentation commit file set is not exactly the one spec doc"
  echo "--- actual ---"; printf '%s\n' "$actual"
  echo "--- expected ---"; printf '%s\n' "$expected"
  exit 1
fi

echo "committed-source verification passed"
```

**If any check fails, STOP.** Re-copy the spec from `/Users/diaz/pssa-prep-platform-live/specs/`, amend the documentation commit, and rerun before authoring.

Then: preflight (§0.1) → author → gates → scope guard → commit (no merge) → report. Independent audit before merge. After merge: `git worktree remove /Users/diaz/pssa-moy-conventions-items`.
