# Codex Spec — EOY Conventions Item Authoring (Grade 3, 9 standalone Category-D items)

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-25.
**Preconditions:**
- **EOY P1–P4 merged and verified on `origin/main` (`2fb0f03`).** EOY blueprint APPROVED/LOCKED (`specs/pssa_g3_eoy_blueprint_finalization.md`).
- These are **standalone** `passageId=null` items; they do NOT depend on any EOY passage. The no-reuse checks depend on the foundation bank, the BOY stamina conventions block, **and the MOY conventions bank** (EOY shares two ECs with MOY — see §0.1).
- EOY form assembly remains the next tranche **after** this; it stays blocked until conventions are merged.

**No passage, no figure, no EBSR, no fact-check.** Nine **standalone** Grade-3 conventions items (`passageId = null`), one point each, **9 distinct ECs (no repeats within EOY)**, all **operational** (none analytics-only). These are items **27–35** of the EOY form; the form splits them **S1×5 (grammar, D.1.1.x) / S3×4 (mechanics·spelling, D.1.2.x)** — **assembly-only**, NOT written on the bank items.

## 0. Scope & guardrails

- Author **9 standalone conventions items** only, file-based (`noDbWrite`), all `reviewStatus=PENDING` / `itemStatus=candidate`. Nothing approved/student-facing.
- **Conventions items are registry-EXEMPT:** they carry `errorPattern` (free-form, per distractor) + `ecSkillFamily="conventions"` + `targetConvention` + `targetSubskill`, and **do NOT carry `distractorRole`.** Do **NOT** add or invent `mappingRegistry` roles (the conventions trap: `errorPattern` ≠ `distractorRole` vocab). The class report maps conventions via `ecSkillFamily`/`targetSubskill`, not `distractorRole`.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry, delivery, the figure module, schema, or BOY/foundation/MOY/EOY-P1–P4 content. Do NOT assemble the form, and **do NOT set a section field or `scoringBucket` on the bank items** (section S1/S3 placement is assembly-only — §5).
- STOP and report if anything needs a DB schema change or if an EC cannot be authored within the existing INLINE_DROPDOWN contract.
- Run in a clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path / fail-closed flow (§9). Never `git add -A`.

## 0.1 Source preflight (run FIRST — FAIL-CLOSED)

There is no passage package. Verify the **three existing** conventions sources on `origin/main` so new EOY items do not collide — comparing **content, not filenames**:
- `exemplars/pssa_grade3_conventions/grade3_conventions_backend.json` (foundation conventions bank),
- `exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json` (**BOY stamina conventions `conv_01`–`conv_09`**), and
- `exemplars/pssa_grade3_moy_conventions/backend.json` (**MOY conventions bank**).

**Two EOY ECs are rotated repeats of MOY ECs** — `E03.D.1.1.6` (agreement) and `E03.D.1.2.3` (dialogue). For those two, EOY MUST test a **different facet** with different stems/targets/options than MOY:
- **D.1.1.6:** MOY tested **subject-verb agreement** with a collective-noun + intervening prepositional phrase ("the group of students ___ ready" → *is*). EOY tests the **pronoun-antecedent** facet ("The two hikers packed ___ own water bottles." → *their*, with distractors *his / they / our*).
- **D.1.2.3:** MOY tested a **tag-after** quotation ("___ said Omar." → comma inside quotes before the tag). EOY tests a **tag-first** quotation ("Lily smiled and said, ___" → capitalized first word + end punctuation **inside** the closing quote).

The author and `test-pssa-eoy-conventions.ts` (§7) must programmatically confirm, for every EOY item, that its **normalized `baseTextWithBlanks`** (the actual cloze sentence — **NOT** the generic instructional `stem`, which is shared boilerplate like "Choose the word…" and would yield false non-collisions), its **`targetWordOrPhrase`/correct answer**, and its **option-text set** do not match any item in **any of the three** source files. (When a source file stores the cloze sentence under a different key, compare against that field — the content sentence, not the directions.) If any collision, **STOP**.

## 1. Deliverables

- New author script `scripts/content/author-pssa-eoy-conventions.ts` (mirror `author-pssa-moy-conventions.ts` — INLINE_DROPDOWN single_blank, standalone).
- Exemplars under `exemplars/pssa_grade3_eoy_conventions/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV); wire `buildEoyConventionsPacket()` into `scripts/test-pssa-content.ts`.
- New `scripts/test-pssa-eoy-conventions.ts` (structure + key plan + error-pattern-quality + no-reuse-vs-3-sources + rotated-EC-differs-from-MOY regression; §7).

## 2. Item modeling (`INLINE_DROPDOWN` / `single_blank`, standalone)

Mirror the canonical conventions shape from `author-pssa-moy-conventions.ts`:
- `interactionType = "INLINE_DROPDOWN"`, `interactionSubtype = "single_blank"`; `pointValue = 1`; **`passageId = null`** (standalone).
- `ecSkillFamily = "conventions"`; `reportingCategory = "D"`; `targetConvention` (human-readable) + `targetSubskill` (snake_case) per §3.1.
- `baseTextWithBlanks` = a short Grade-3 sentence with exactly one `___` blank.
- `blanks` = array of **one** blank object: `{ blankId, position, options[], correctIndex, targetSkill, targetWordOrPhrase, rationale }` (`position = baseTextWithBlanks.indexOf("___")`).
- **`options` = exactly 4** per blank: 1 correct + 3 distractors. Each option `{ text, errorPattern, rationale }`: the correct option has `errorPattern: null`; **each distractor has a DISTINCT, non-null `errorPattern`**. `correctIndex` = the option index per the §5 key plan.
- `scoring` = canonical conventions shape (`{ totalPoints:1, partialCreditRules:[{points:1,…},{points:0,…}], scoringNotes }`); `scoringJson:{totalPoints:1}`. `responseSpecJson = buildPssaResponseSpec(item)`.
- Metadata mirror the conventions bank: `sourceType="internal_original"`, `licenseStatus="cleared_internal_original"`, `reviewStatus=PENDING`, `itemStatus=candidate`; `auditMetadata.noDbWrite=true`. EOY identity in provenance (`benchmarkSeason:"EOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-eoy-v1"`, `unit:"conventions"`).

## 3. Item set (9 items / 9 operational pts — 9 distinct ECs)

| # | Item ID | EC | Skill | Planned section | Key → `correctIndex` |
|---|---|---|---|---|---|
| 27 | `pssa_item_g3_eoy_conv_d112_plurals` | `E03.D.1.1.2` | Regular & irregular plural nouns | S1 | **A → 0** |
| 28 | `pssa_item_g3_eoy_conv_d113_abstract_noun` | `E03.D.1.1.3` | Abstract nouns | S1 | **B → 1** |
| 29 | `pssa_item_g3_eoy_conv_d116_pronoun_agreement` | `E03.D.1.1.6` | Pronoun-antecedent agreement (↺ facet ≠ MOY) | S1 | **A → 0** |
| 30 | `pssa_item_g3_eoy_conv_d117_comparative` | `E03.D.1.1.7` | Comparative/superlative | S1 | **C → 2** |
| 31 | `pssa_item_g3_eoy_conv_d119_sentence_formation` | `E03.D.1.1.9` | Produce compound/complex sentences | S1 | **A → 0** |
| 32 | `pssa_item_g3_eoy_conv_d122_address_commas` | `E03.D.1.2.2` | Commas in addresses | S3 | **D → 3** |
| 33 | `pssa_item_g3_eoy_conv_d123_dialogue` | `E03.D.1.2.3` | Commas & quotation marks in dialogue (↺ facet ≠ MOY) | S3 | **B → 1** |
| 34 | `pssa_item_g3_eoy_conv_d124_possessives` | `E03.D.1.2.4` | Form & use possessives | S3 | **C → 2** |
| 35 | `pssa_item_g3_eoy_conv_d126_spelling` | `E03.D.1.2.6` | Spelling patterns (ending rules) | S3 | **D → 3** |

9 distinct ECs, no repeats within EOY; 9 operational points. **Section (5 S1 / 4 S3) is recorded here for the form plan but NOT written on the bank item** (assembly-only, like `scoringBucket`).

### 3.1 EC → `targetConvention` / `targetSubskill` (all free-form descriptive — NOT registry roles)

| EC | targetConvention | targetSubskill |
|---|---|---|
| D.1.1.2 | regular and irregular plural nouns | `irregular_plural_nouns` |
| D.1.1.3 | abstract nouns | `abstract_nouns` |
| D.1.1.6 | pronoun-antecedent agreement | `pronoun_antecedent_agreement` |
| D.1.1.7 | comparative and superlative adjectives | `comparative_superlative` |
| D.1.1.9 | produce compound and complex sentences | `sentence_formation` |
| D.1.2.2 | commas in addresses | `commas_in_addresses` |
| D.1.2.3 | quotation marks and commas in dialogue | `dialogue_punctuation` |
| D.1.2.4 | form and use possessives | `possessives` |
| D.1.2.6 | spelling patterns and generalizations | `spelling_ending_rules` |

`targetConvention`/`targetSubskill`/`errorPattern` are free-form descriptive strings, **not** `mappingRegistry` keys.

### 3.2 Per-item constructs (PINNED — author to these exact stems/options/keys/error patterns)

**27. D.1.1.2 — irregular plural (key A/0).** Base: `"The farmer counted six ___ beside the pond."`
> `[0] geese` ← **correct (A)** · `[1] gooses` · `[2] goose` · `[3] geeses`
errorPatterns: `[1]` regular `-s` added to an irregular noun · `[2]` singular used where a plural is needed · `[3]` extra `-s` on the already-plural "geese". targetWordOrPhrase `geese`.

**28. D.1.1.3 — abstract noun (key B/1).** Base: `"The children showed great ___ when they shared their snacks."`
> `[0] kind` · `[1] kindness` ← **correct (B)** · `[2] kindly` · `[3] kinder`
errorPatterns: `[0]` adjective used where an abstract noun is needed · `[2]` adverb used where an abstract noun is needed · `[3]` comparative used where an abstract noun is needed. targetWordOrPhrase `kindness`. (Same different-parts-of-speech design as MOY D.1.1.1 — all correctly spelled; the construct is identifying the noun form, NOT spelling.)

**29. D.1.1.6 — pronoun-antecedent agreement (key A/0) — ↺ facet distinct from MOY's subject-verb.** Base: `"The two hikers packed ___ own water bottles."`
> `[0] their` ← **correct (A)** · `[1] his` · `[2] they` · `[3] our`
errorPatterns: `[1]` singular pronoun with a plural antecedent ("two hikers") · `[2]` subject pronoun used where a possessive is needed before "own" · `[3]` first-person pronoun that does not match the antecedent. targetWordOrPhrase `their`. (Plural antecedent "two hikers" makes "their" unambiguous and avoids the singular-"their" debate; "his" is the targeted agreement error.)

**30. D.1.1.7 — superlative for three (key C/2).** Base: `"Of the three kittens, the gray one is the ___."`
> `[0] smaller` · `[1] more small` · `[2] smallest` ← **correct (C)** · `[3] most small`
errorPatterns: `[0]` comparative used when comparing three or more · `[1]` "more" with a short adjective that takes `-er` · `[3]` "most" with a short adjective that takes `-est`. targetWordOrPhrase `smallest`. (Correct is single-word; two distractors are multiword, so the correct option is **not** the lone multiword/longest — outlier-safe.)

**31. D.1.1.9 — produce a compound sentence (key A/0).** Base: `"The sky grew dark, ___"`
> `[0] and the wind began to blow.` ← **correct (A)** · `[1] the wind began to blow.` · `[2] and the wind blowing hard.` · `[3] and the wind blew hard the trees bent.`
errorPatterns: `[1]` comma splice — two complete sentences joined by only a comma · `[2]` fragment — "blowing" has no helping verb, not a complete idea · `[3]` run-on — two complete ideas with no punctuation between them. targetWordOrPhrase `and the wind began to blow.` Keep all four option lengths roughly parallel so the correct one is not the sole longest by >35%.

**32. D.1.2.2 — comma in an address (key D/3).** Base: `"My aunt's new house is in ___."` (the sentence-ending period is fixed **outside** the blank, so the blank tests only the comma between city and state)
> `[0] Tampa Florida` · `[1] Tampa Florida,` · `[2] Tampa, Florida,` · `[3] Tampa, Florida` ← **correct (D)**
errorPatterns: `[0]` missing comma between city and state · `[1]` comma after the state instead of between city and state · `[2]` extra comma after the state at the end. targetWordOrPhrase `Tampa, Florida`. (Comma placement IS the construct → exempt from the punctuation-outlier check, §4.)

**33. D.1.2.3 — dialogue punctuation, tag-first (key B/1) — ↺ facet distinct from MOY's tag-after.** Base: `"Lily smiled and said, ___"`
> `[0] Let's go to the park.` · `[1] "Let's go to the park."` ← **correct (B)** · `[2] "let's go to the park."` · `[3] "Let's go to the park".`
errorPatterns: `[0]` missing quotation marks around the spoken words (capitalization correct, so this option isolates the missing-quotation-mark error only) · `[2]` first word of the quotation not capitalized · `[3]` end punctuation placed outside the closing quotation mark. targetWordOrPhrase `"Let's go to the park."` (Quotation/punctuation IS the construct → exempt from the punctuation-outlier check, §4.)

**34. D.1.2.4 — plural possessive (key C/2).** Base: `"All three ___ kites were tangled in the tree."`
> `[0] girls` · `[1] girl's` · `[2] girls'` ← **correct (C)** · `[3] girls's`
errorPatterns: `[0]` plural with no apostrophe (no ownership shown) · `[1]` singular possessive where plural owners are meant · `[3]` extra `-s` after the plural possessive. targetWordOrPhrase `girls'`. (Apostrophe placement IS the construct → exempt from the punctuation-outlier check, §4.)

**35. D.1.2.6 — spelling, doubling rule before `-ing` (key D/3).** Base: `"The children were ___ across the open field."`
> `[0] runing` · `[1] runnning` · `[2] runnig` · `[3] running` ← **correct (D)**
errorPatterns: `[0]` final consonant not doubled before `-ing` · `[1]` consonant doubled too many times · `[2]` letters dropped from the `-ing` ending (all three distractors stay `-ing` spelling errors — no tense/grammar shortcut). targetWordOrPhrase `running`.

## 4. Answer-choice & error-pattern quality (conventions-specific)

- Exactly **4 options** per blank: 1 correct (`errorPattern: null`) + 3 distractors, **each with a DISTINCT, non-null `errorPattern`**; no exact-duplicate option text.
- **Minimal pairs are appropriate** for conventions (options differing only in the exact convention under test); each option must still carry a distinct error pattern and a truthful `rationale` (correct option states why correct; each distractor names its error).
- Mirror existing conventions metadata shapes; **do not** invent `distractorRole`s or any registry vocab.
- **No reuse** of any **`baseTextWithBlanks` cloze sentence** / correct answer / option-text set vs **all three** source files (§0.1) — compare the content sentence, not the generic `stem`; the two rotated ECs (D.1.1.6, D.1.2.3) must also differ from the **MOY** versions by facet (§0.1).
- **Option-outlier control (meaningful outliers only — exact character count is NOT a clue):** fail an item only when the **correct** option is (i) the **only multiword** option; (ii) the **sole longest or shortest by >35%** versus *every* distractor; (iii) **uniquely different in capitalization or punctuation when that is not the tested construct**; or (iv) **structurally different in part of speech / sentence form** unrelated to the EC. **Exempt:** D.1.2.2 / D.1.2.3 / D.1.2.4 from (iii)-punctuation (comma/quote/apostrophe placement IS their construct).
- Student preview leak-free (no `correctIndex`/`errorPattern`/`rationale`); reviewer preview carries the key + error patterns + rationales.

## 5. Key plan & answer-position distribution

Per-item `correctIndex` is pinned (§3). Planned section split and key sequence:

```
S1 (5 items): 27=A 28=B 29=A 30=C 31=A   → correctIndex 0,1,0,2,0
S3 (4 items): 32=D 33=B 34=C 35=D        → correctIndex 3,1,2,3
```

Conventions key tally = **A3 / B2 / C2 / D2** (no position exceeds 3 → passes the standalone ≤0.4 position gate). **Section assignment and any form-level A/B/C/D reconciliation are assembly-only** — do not write a section field on the bank items.

## 6. Inherited content gates (Rule 0)

All items inherit: `PSSA_ITEM_EC_SKILL_MISMATCH` (each item tests exactly the convention its EC names — fix the item, never retag the EC), the **INLINE_DROPDOWN item-type contract** (`PSSA_INLINE_DROPDOWN_EACH_BLANK_VALID`, `PSSA_INLINE_DROPDOWN_ONE_CORRECT_PER_BLANK`: one in-range `correctIndex` per blank), source-compliance no-copy scan, and the conventions **minimal-pair allowance** (near-duplicate option sets permitted iff each option differs in the exact convention tested and carries a distinct error pattern). Standalone conventions MCQs are **excluded** from `buildMcqPassageSpecificityReport` (passageId=null). WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

Run **fail-closed** (`set -euo pipefail`, newline-separated):

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-eoy-conventions.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected
echo "all EOY conventions gates passed"
```

**`scripts/test-pssa-eoy-conventions.ts` must assert:**
1. Exactly **9 items**, all `INLINE_DROPDOWN`/`single_blank`, `pointValue=1`, **`passageId=null`**, `ecSkillFamily="conventions"`, `reportingCategory="D"`, PENDING/candidate; **no figure/passage/EBSR/fact-check** fields; the pinned item IDs of §3.
2. The **9 ECs are exactly** {D.1.1.2, D.1.1.3, D.1.1.6, D.1.1.7, D.1.1.9, D.1.2.2, D.1.2.3, D.1.2.4, D.1.2.6} with **no repeats**; each carries the §3.1 `targetConvention`/`targetSubskill`.
3. `correctIndex` per item = the §5 plan (0,1,0,2,0,3,1,2,3); resulting key tally **A3/B2/C2/D2**.
4. **No `distractorRole` field** on any option (registry-exempt); **no `scoringBucket`/section** field on any item.
5. Each blank has **exactly 4 options**, 1 correct (`errorPattern:null`) + 3 distractors each with a **distinct, non-null `errorPattern`**; no duplicate option text.
6. **No-reuse vs ALL THREE sources** (`grade3_conventions_backend.json`, `conventions_mc_block.json` conv_01–09, **and `pssa_grade3_moy_conventions/backend.json`**): for every EOY item, the **normalized `baseTextWithBlanks`** (the cloze sentence — **prioritize this field, NOT the generic `stem`**; the canonical builder stores the actual sentence separately from the boilerplate direction, and the MOY test's `stem`-priority precedence would compare directions rather than content — do not copy that precedence), the **correct `targetWordOrPhrase`**, and the **set of option texts** differ from every item in all three files. **Plus rotated-EC checks:** the D.1.1.6 item's `targetSubskill` is `pronoun_antecedent_agreement` (≠ MOY's `subject_verb_agreement`) and its stem/options differ from MOY's D.1.1.6 item; the D.1.2.3 item is tag-first (stem contains `said,` before the blank) and differs from MOY's D.1.2.3 item.
7. **Option-outlier regression (meaningful outliers only):** for every item, FAIL only on (i) correct = only multiword, (ii) sole longest/shortest by >35%, (iii) unique capitalization/punctuation when not the EC, or (iv) structural POS/sentence-form difference unrelated to the EC. **Exempt:** D.1.2.2 / D.1.2.3 / D.1.2.4 from (iii)-punctuation.
8. EC-skill-match passes for all 9. Student DTO/preview leak-free (no key/errorPattern/rationale).

## 7.1 Mechanical safeguards (before the stop report)

- Author run (`noDbWrite`): `npx tsx scripts/content/author-pssa-eoy-conventions.ts` — writes ONLY `exemplars/pssa_grade3_eoy_conventions/*`, no DB mutation.
- Scope guard before commit: `git diff --name-only HEAD`; `git status --short`. Allowed paths only (§8).
- After commit: `git diff --name-only origin/main...HEAD` and `git status --short` — limited to the five allowed path patterns in §8.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-eoy-conventions.ts
scripts/test-pssa-eoy-conventions.ts
scripts/test-pssa-content.ts             (tranche wiring only)
exemplars/pssa_grade3_eoy_conventions/*
specs/codex_pssa_eoy_conventions_items.md
```
(Five allowed path patterns total — no passage package for this tranche.) Anything else (BOY/foundation/MOY/EOY-P1–P4, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

- 9 standalone conventions items per §3 (distinct ECs, no repeats); INLINE_DROPDOWN/single_blank; 4 options each with distinct error patterns; `correctIndex` plan A3/B2/C2/D2; registry-exempt (no `distractorRole`); no section/`scoringBucket`; new non-reused stems vs all three sources; rotated ECs differ from MOY by facet; leak-free; noDbWrite; scope clean; all gates + regression green.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`). **One** spec doc to seed (no passage package this tranche). Absolute-path, fail-closed:

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-eoy-conventions-items
cd "$PRIMARY"; git fetch origin
if git show-ref --verify --quiet refs/heads/codex/pssa-eoy-conventions-items; then echo "STOP: branch exists"; exit 1; fi
test ! -e "$WORKTREE" || { echo "STOP: worktree path exists"; exit 1; }
git worktree add "$WORKTREE" -b codex/pssa-eoy-conventions-items origin/main
cd "$WORKTREE"
test "$(git branch --show-current)" = "codex/pssa-eoy-conventions-items"
test -z "$(git status --short)"
ln -s "$PRIMARY/node_modules" node_modules
cp "$PRIMARY/specs/codex_pssa_eoy_conventions_items.md" specs/
git add specs/codex_pssa_eoy_conventions_items.md
git diff --name-only HEAD     # expect exactly the 1 spec doc
git commit -m "EOY conventions: item-authoring spec"
```

**Committed-source verification (FAIL-CLOSED)** — after the spec is committed: `require_in_commit` each of `A3 / B2 / C2 / D2`, `registry-EXEMPT`, `passageId = null`, `pronoun_antecedent_agreement`, `npm run test:pssa-db6`; and assert the documentation commit contains **exactly** the one spec file (`git show --name-only --pretty=format: HEAD` == `specs/codex_pssa_eoy_conventions_items.md`). STOP on any miss.

Then: preflight (§0.1) → author → §7 gates → scope guard → commit (no merge) → report. **Independent audit before merge** (Claude runs the pinned-merge: exact audited tip + base SHA pins, exact file-set diff contract, gates incl. the real detector reports over the actual items + no-reuse-vs-3-sources, reproducibility regeneration, remote verification before guarded cleanup).
