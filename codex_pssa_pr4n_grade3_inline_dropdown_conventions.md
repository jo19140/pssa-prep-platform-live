# PSSA PR #4n — Grade 3 Inline Drop-Down + Conventions Rebuild

Production tranche after #4m. Grade 3 only. Conventions (Reporting Category **D**) only, via two surfaces: **INLINE_DROPDOWN** and word-level **HOT_TEXT** (`word_select`). No reading-item rewrites (MCQ/EBSR/MS/HT/MG/DD). No Grades 4–8. No approvals/imports/DB writes. File-only. Commit.

## Rule 0 — safeguard inheritance (binding), with the conventions adaptation
Re-read the #4j "Safeguard inheritance" section incl. **section 4a** (enforced batch-level shortcut gates). **A valid response surface alone is NOT enough.** Conventions items inherit: source/license compliance + the **hardened real no-copy source scan** (#4k-fix); `eligibleContent` validity; `PSSA_ITEM_EC_SKILL_MISMATCH` adapted to the D convention; clean student preview + strict source-leak check; reviewer preview with scoring/rationales/gate results; **batch-level position/surface-shortcut gates** (extend `PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION` to dropdown option-order and word-span position).

**Key adaptation — conventions are PASSAGE-FREE.** Unlike the reading TEIs, standalone conventions items are NOT anchored to one of the five reading passages, so the **passage-grounding gates do not apply** (`PSSA_PASSAGE_*`, passage-grounding, evidence-verbatim-in-passage). They are **replaced** by conventions-specific correctness gates (see below): the stimulus must be original, self-contained, grade-3-appropriate, and the item must genuinely test the named convention. The passage-quality gates are still rerun only to **confirm the five reading passages are unchanged** (conventions items must not touch them).

## Preconditions (stop and report if any is missing)
#4j/#4k-fix/#4l/#4m all committed+pushed to `main` and passed independent audit; **current branch starts from latest `main`** (which now contains #4j–#4m). Do not author #4n from a stale branch.

## Context
The PSSA Grade 3 form carries **9 points of standalone 1-point Conventions (D) items** (20% of the 45-point form). The D strand splits into: **Grammar & Usage** (`E03.D.1.1.x`), **Capitalization / Punctuation / Spelling** (`E03.D.1.2.x`), and **Conventions** (`E03.D.2.1.1.x`). The current Grade 3 pilot still contains **12 templated, passage-free conventions MCQs** using the generic "Which sentence best demonstrates…" frame — unaudited by the newer gates. The live DRC surface delivers conventions largely as **inline drop-downs** (choose the correct spelling/form in a sentence) and **word-level hot-text** (click the misspelled / mis-capitalized word). This PR rebuilds the conventions strand on those two surfaces and retires the templated MCQs.

## Scope & count
Author exactly **10** new Grade 3 conventions items: **5 INLINE_DROPDOWN + 5 word-level HOT_TEXT**, spanning the D subskills (≥1 each of: spelling, capitalization, punctuation, grammar/usage; remaining items distributed across D codes). Each item is a **standalone 1-point** conventions item with an **original self-contained stimulus sentence/short sentence-set** (no reading-passage dependency). Conventions items are a **separate stream** — do NOT fold into the 28 reading MCQs, EBSRs, MS, HT, MG, or DD counts.

**Retire the old 12 templated conventions MCQs (do NOT delete):** set `itemStatus = deprecated_superseded`, add `supersededByItemIds[]` pointing at the new conventions items that cover the same EC, leave `reviewStatus` as-is, and exclude them from `getStudentReadyPssaItems()`. Preserve them in the repo for audit trail. **This deprecation is the ONLY permitted change to existing items.**

## Unchanged-content proof (hashes)
Before authoring, hash: the five Grade 3 passage files; the **28 reading MCQ items**; the 5 EBSRs; the 5 MS; the 5 HT; the 5 MG; the 5 DD. After authoring, recompute and report. **Acceptance:** all of those hashes **unchanged** (the conventions rebuild must not alter any reading item or passage); the only changed existing content is the 12 templated conventions MCQs flipping to `deprecated_superseded` (report their before/after status explicitly). Also rerun the four passage-quality gates on the five passages to confirm **5/5 PASS and unchanged**.

## Source-compliance scan (hardened, from #4k-fix)
Reuse the hardened scan (preserve short words in raw normalized n-gram matching; separate content-token stream; fail on content-bearing overlap ≥ threshold; allow generic boilerplate only as boilerplate). **Scan:** stems, instructions, the stimulus sentence(s), every drop-down option, every selectable word/span, rationales, reviewer-preview notes. **Against:** `reference/pssa-released-items/`, `reference/pssa-item-catalog/`, extracted sampler/corpus text. **Report per item:** matched source file, matched field, longest normalized n-gram, overlap score, boilerplate-vs-content. **Acceptance:** 10/10 PASS `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; 0 content-bearing released/sampler/DRC text copied.

## INLINE_DROPDOWN schema (`interactionType: INLINE_DROPDOWN`)
Fields: itemId, gradeLevel, eligibleContent (a D code), ecSkillFamily (`conventions_grammar` | `conventions_caps_punct_spell` | `conventions`), interactionSubtype (`spelling` | `grammar_usage` | `punctuation_capitalization`), `passageId: null` (standalone), stimulusText (the sentence with blank markers), blanks[] (blankId, position, options[] {text, isCorrect, errorPattern|null}, correctOptionId), scoring, partialCreditRules, rationale per blank (why the correct option is correct), distractor rationale per option (the error pattern it represents), audit metadata. Use 1–3 blanks per item; each blank has its own option list.

### INLINE_DROPDOWN authoring
Each item: original self-contained grade-3 sentence; each blank has **exactly one** correct option; distractors are **plausible real error patterns** for the target convention (doubled/dropped letters for spelling; wrong tense/number for grammar; missing/extra comma or apostrophe for punctuation; wrong case for capitalization) — never random or nonsense; the correct choice is decidable from the sentence context; the item genuinely tests the **named D convention** (a spelling item must hinge on spelling, not meaning). **Vary the target convention across the five** (≥1 spelling, ≥1 grammar/usage, ≥1 punctuation, ≥1 capitalization).

## Word-level HOT_TEXT conventions schema (`interactionType: HOT_TEXT`, `interactionSubtype: word_select`)
Fields: itemId, gradeLevel, eligibleContent (a D code), ecSkillFamily, interactionSubtype `word_select`, `passageId: null`, prompt, instructionText ("Click the word that is spelled incorrectly" / "…that should be capitalized" / "…that needs a comma"), stimulusText (the original sentence), selectableSpans[] (spanId, text, charOffset, isCorrect, errorPattern|null), correctSpanIds[], minSelections, maxSelections, exactSelectionCount, scoring, partialCreditRules, rationale per correct span, rationale per distractor span, audit metadata.

### Word-level HOT_TEXT authoring
Each item: original self-contained grade-3 sentence; selectable spans are **whole words verbatim in the item's own stimulus** (the "verbatim-in-passage" check becomes "verbatim-in-stimulus", since there is no reading passage); the correct word(s) carry the actual error (misspelling, wrong case, missing punctuation context); distractor words are correctly formed; exact number of correct words matches the instruction; the item genuinely tests the named D convention. **Vary the convention across the five.**

## Conventions-specific gates (replace passage-grounding; all blockers)
1. `PSSA_CONVENTIONS_SELF_CONTAINED` — stimulus is original toy content, self-contained, grade-3-appropriate; **no dependency on any reading passage**; no copied released text; selectable spans / blank positions resolve within the stimulus.
2. `PSSA_CONVENTIONS_EXACTLY_ONE_CORRECT_EDIT` — each blank has exactly one correct option; each word-select instruction has exactly the stated number of correct (error-bearing) words; no second defensible answer.
3. `PSSA_CONVENTIONS_DISTRACTORS_ARE_REAL_ERROR_PATTERNS` — every distractor option/word is a **plausible, labeled error pattern** for the target convention (`errorPattern` set and sensible); no random/nonsense distractors; no distractor that is actually also correct.
4. `PSSA_CONVENTIONS_TARGET_SKILL_TESTED` — the item hinges on the **named D convention**: a `spelling` item turns on spelling (not meaning/usage); a `punctuation_capitalization` item turns on punctuation/case; a `grammar_usage` item turns on tense/number/agreement. Extends `PSSA_ITEM_EC_SKILL_MISMATCH` to category D.

## Inherited surface gates
**INLINE_DROPDOWN:** `PSSA_DROPDOWN_EACH_BLANK_VALID`, `_ONE_CORRECT_PER_BLANK`, `_CONTEXT_FIT` (the correct option fits the sentence), `_DISTRACTORS_ARE_PLAUSIBLE_ERRORS`, plus `PSSA_ITEM_RESPONSE_SPEC_VALID`, `_CORRECT_RESPONSE_VALID`, `_INSTRUCTION_MATCHES_RESPONSE`, `_SCORING_VALID`, `_PREVIEW_RENDERABLE`, `_SOURCE_COMPLIANCE_NO_COPY`, `_TYPE_INTERACTION_CONSISTENT`.
**Word-level HOT_TEXT:** reuse `PSSA_HOT_TEXT_SCHEMA_VALID`, `_SELECTABLE_SPANS_VALID` (verbatim **in stimulus**), `_CORRECT_SPANS_EXIST`, `_CORRECT_COUNT_MATCHES_INSTRUCTION`, `_NO_INCORRECT_SPAN_EQUALLY_VALID`, `_PARTIAL_CREDIT_VALID` (the `_SUPPORTS_SKILL`/`_SKILL_MATCH` checks become "the selected word carries the target convention error").

## Batch shortcut gates (extend `PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION`)
- **INLINE_DROPDOWN option-order**: across the 5 dropdown items (and their blanks), the correct option is **not always the first (or always the last) option**; no single option position holds >60% of correct answers; ≥3 distinct correct-position patterns where feasible. (Repeated generated items can otherwise create "always pick option 2".)
- **Word-level HOT_TEXT position**: across the 5 word-select items, the correct (error) word is **not always the first/last word** of the stimulus, nor always the same sentence position; ≥3 distinct positions where feasible.
Report both as **batch** verdicts, not per-item 5/5.

## Tests
**INLINE_DROPDOWN:** valid spelling dropdown → PASS; blank with two correct options → FAIL `_ONE_CORRECT_PER_BLANK`; distractor that is also correct → FAIL `PSSA_CONVENTIONS_DISTRACTORS_ARE_REAL_ERROR_PATTERNS`; random/nonsense distractor → FAIL same; spelling EC but the item actually turns on word meaning → FAIL `PSSA_CONVENTIONS_TARGET_SKILL_TESTED`; five items all correct = option index 0 → FAIL the dropdown option-order shortcut.
**Word-level HOT_TEXT:** valid misspelled-word select → PASS; correctSpanId not in stimulus → FAIL `_SELECTABLE_SPANS_VALID`; count mismatch → FAIL `_CORRECT_COUNT_MATCHES_INSTRUCTION`; an unmarked word is also misspelled → FAIL `_NO_INCORRECT_SPAN_EQUALLY_VALID`; five items all correct = first word → FAIL the word-position shortcut.
**Conventions/self-contained:** item references a reading passage or copies released text → FAIL `PSSA_CONVENTIONS_SELF_CONTAINED` / source compliance.
**Source compliance:** copied stimulus sentence / copied option with short words interspersed → FAIL `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; generic instruction alone ("Click the word…") → NOT a fail.
**Partial credit:** missing rules → FAIL `_PARTIAL_CREDIT_VALID`; full credit for a wrong blank/word → FAIL.
**Deprecation:** a templated conventions MCQ flipped to `deprecated_superseded` is excluded by `getStudentReadyPssaItems()`; its `supersededByItemIds` resolve to real new items.

## Adversarial validation (≥4 novel fixtures NOT used in authoring)
1. INLINE_DROPDOWN, valid surface, but a distractor spelling is also an accepted spelling → FAIL `PSSA_CONVENTIONS_EXACTLY_ONE_CORRECT_EDIT`.
2. INLINE_DROPDOWN tagged `spelling` but the only thing distinguishing options is meaning → FAIL `PSSA_CONVENTIONS_TARGET_SKILL_TESTED`.
3. Word-level HOT_TEXT, all words verbatim, correct count right, but two words are misspelled and only one is marked → FAIL `_NO_INCORRECT_SPAN_EQUALLY_VALID`.
4. Five dropdown items whose correct option is always the first option → FAIL the option-order shortcut batch gate.
Report these in test output.

## Reports
- `pssa_conventions_grade3_inline_dropdown_audit_report.csv` — itemId, gradeLevel, eligibleContent, ecSkillFamily, interactionSubtype, stimulusText, blankCount, correctOptionIds, eachBlankValidResult, oneCorrectPerBlankResult, contextFitResult, distractorErrorPatternResult, exactlyOneEditResult, targetSkillTestedResult, selfContainedResult, partialCreditResult, sourceComplianceResult, finalResult, notes.
- `pssa_conventions_grade3_word_hot_text_audit_report.csv` — itemId, gradeLevel, eligibleContent, ecSkillFamily, prompt, instructionText, correctSpanIds, spansVerbatimInStimulusResult, correctCountResult, noIncorrectSpanEquallyValidResult, distractorErrorPatternResult, targetSkillTestedResult, selfContainedResult, partialCreditResult, sourceComplianceResult, finalResult, notes.
- `pssa_conventions_grade3_surface_shortcut_report.csv` — tranche, interactionType, itemCount, correctOptionPositionPatterns / correctWordPositionPatterns, result, severity, notes.
- `pssa_conventions_grade3_deprecation_report.csv` — old itemId, oldStatusBefore, oldStatusAfter (`deprecated_superseded`), supersededByItemIds, ecCovered.
- Update the Grade 3 vertical-slice summary: passages; 28 reading MCQs; EBSRs; MS; HT; MG; DD; **new conventions stream (10)**; deprecated conventions (12); all gate counts; source-scan summary; shortcut summary; the D-skill coverage table.

## Previews
**Student preview:** the 10 conventions items; no answer keys, correct option IDs, correct span IDs, error-pattern labels, rationales, or internal metadata in rendered view **or source** (strict leak check, same banned-token list as #4m). **Reviewer preview:** per item — stimulus, interactionType/subtype, eligibleContent, correct option/word, error-pattern labels, rationales, scoring + partial-credit rules, target-skill-tested result, source-compliance result, shortcut result, final audit result.

## Acceptance
- 10 new Grade 3 conventions items (5 INLINE_DROPDOWN + 5 word-level HOT_TEXT) covering ≥1 each of spelling, capitalization, punctuation, grammar/usage, each tagged to a real `E03.D.*` EC.
- 10/10 PASS source-compliance real scan; 10/10 PASS conventions-specific gates; 10/10 PASS their inherited surface gates.
- The 5-item INLINE_DROPDOWN tranche PASSes the dropdown option-order batch gate; the 5-item word-HOT_TEXT tranche PASSes the word-position batch gate (both **batch** verdicts).
- 12 templated conventions MCQs flipped to `deprecated_superseded` with resolving `supersededByItemIds`; excluded from student-ready; preserved in repo.
- Unchanged hashes for passages, 28 reading MCQs, 5 EBSRs, 5 MS, 5 HT, 5 MG, 5 DD; passage gates 5/5 PASS and unchanged.
- 0 released/sampler/DRC content-bearing text copied; no reading-passage dependency in any conventions item.
- No reading-item rewrites; no Grades 4–8; no approvals/imports/DB writes.
- `WARN_WITH_JUSTIFICATION` does not count as clean — zero FAIL and zero unresolved WARN required.
- Student preview leak-free (source + rendered); reviewer preview complete.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit: conventions items; deprecation flips; INLINE_DROPDOWN + word-HOT_TEXT gate code; tests; reports; student + reviewer previews; vertical-slice summary. Do not leave untracked files.

## Stop — report
#4j–#4m inheritance confirmation; 10 new conventions item IDs; D-EC coverage table; inline-dropdown correct-option-position distribution; word-hot-text correct-word-position distribution; both batch shortcut results; source-compliance scan summary; the deprecation table (12 old → status + supersededBy); the unchanged-hash table (passages + 28 MCQs + EBSR/MS/HT/MG/DD); passage-gate rerun (5/5 unchanged); final inline-dropdown audit table; final word-hot-text audit table; student + reviewer preview paths; confirmations (no reading items changed, no Grades 4–8, no approvals/imports/DB writes). **Do not proceed to #4o until #4n passes independent audit.**
