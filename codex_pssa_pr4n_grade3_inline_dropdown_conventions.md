# PSSA PR #4n — Grade 3 Inline Drop-Down + Conventions Rebuild

Production conventions tranche after #4m. Grade 3 only. Inline drop-down + conventions-focused TEI/MCQ surfaces only. No passage regeneration. No reading MCQ/EBSR/MS/HT/MG/DD rewrites. No Grades 4–8. No Short Answer/TDA. No approvals/imports/DB writes. File-only. Commit.

## Rule 0 — safeguard inheritance, adapted for conventions
Re-read the #4j "Safeguard inheritance" section and **section 4a**. **A valid response surface alone is not enough.** Production TEIs inherit source/license compliance, no-copy scanning, `eligibleContent` validity, EC skill-match, clean student preview, reviewer preview with scoring/rationales/gate results, and **batch-level surface-shortcut gates**.

**Important adaptation — most Grade 3 conventions items are standalone sentence-level items, not passage-based.** Therefore: passage-quality gates apply **only** if an item is passage-based; passage-grounding gates **do not** apply to standalone conventions items. Instead each standalone conventions item must pass **convention-specific correctness gates**: the target convention is real; exactly one edit/choice is correct (single-answer); distractors are plausible grade-level error patterns; the item actually tests the assigned conventions EC; the sentence context is sufficient and unambiguous. **Do not use passage gates as fake coverage for passage-free conventions items. Do not let a valid dropdown surface pass if the underlying grammar/spelling/punctuation skill is wrong.**

## Preconditions (stop and report if any is missing)
Confirm: #4j contract committed+pushed and includes `INLINE_DROPDOWN` as a top-level interaction type with conventions subtypes (`single_blank`, `multi_blank`, `spelling`, `grammar_usage`, `punctuation_capitalization`); #4k-fix committed+pushed with the hardened short-word-preserving source scan; #4l and #4m committed+pushed and independently audited; **current branch starts from latest `main` after #4l + #4m have landed.** Do not author #4n from a stale branch.

## Goal
Rebuild the Grade 3 conventions strand using real PSSA-like interaction surfaces instead of a plain templated conventions-MCQ pile. Target: a **9-point Grade 3 conventions tranche**. Use a mix of `INLINE_DROPDOWN`, word-level `HOT_TEXT` (`word_select`), `DRAG_DROP` (`token_placement` / punctuation-token drag), and a small number of standalone conventions MCQ items **only where MCQ is the appropriate surface**. Do not make every conventions item a plain MCQ; do not make every item the same two-blank dropdown pattern.

## Scope & count
Create exactly **9 Grade 3 conventions points.** Recommended mix: **4 INLINE_DROPDOWN + 2 word-HOT_TEXT + 2 punctuation-token DRAG_DROP + 1 standalone conventions MCQ.** If scoring requires a different item/point mapping, preserve exactly 9 total conventions points and report the mapping. All items: `gradeLevel=3`, `subject=ELA`, `itemStatus=candidate`, `reviewStatus=PENDING`, `sourceType=internal_original`, license cleared, `passageId=null` unless the item explicitly uses a passage. Conventions items are a **separate stream** — do NOT fold into the 28 reading MCQ / EBSR / MS / HT / MG / DD counts.

## Retire the old templated conventions MCQs (CONFIRMED — deprecate-and-supersede)
The current Grade 3 pilot contains **12 templated, passage-free conventions MCQs** (generic "Which sentence best demonstrates…" frame). A rebuild must not leave a parallel templated strand active. **Retire them (do NOT delete; do NOT silently hide):**
- set `itemStatus = deprecated_superseded`;
- set `deprecatedReason = "superseded_by_pssa_pr4n_conventions_rebuild"`;
- `supersededByItemIds[]` must be **non-empty** and point **only to new #4n conventions items**; each deprecated item maps to **at least one** replacement covering the same EC or same conventions subskill;
- leave `reviewStatus` as-is; preserve the items in the repo for audit trail.
**Deprecated items must be excluded from:** `getStudentReadyPssaItems()`; the active Grade 3 conventions point count; the student preview; student-ready exports. **Deprecated items must remain visible** in reviewer/audit reports.
This status flip is the ONLY permitted change to existing items; report it in the deprecation table.

## Eligible Content coverage
Use only Grade 3 conventions/language rows from `data/pssa/anchor_ec_crosswalk.csv` (`E03.D.*`). Before authoring, report: target Grade 3 conventions ECs; prior conventions item/point count; prior conventions EC distribution; target #4n EC distribution. If the manifest and crosswalk disagree, stop and report. Across the 9-point tranche cover a balanced set of skills: spelling in context; verb tense / verb form; comparative/superlative form; capitalization of titles or proper nouns; punctuation (commas in a series, end punctuation); sentence grammar/usage; word function where applicable. **No single conventions subskill may exceed 40% of the 9-point tranche** unless the manifest explicitly requires it.

## Unchanged-content proof (hashes)
Before authoring, hash: the five Grade 3 passages; the 28 reading MCQs; the 5 EBSRs; the 5 MS; the 5 HT; the 5 MG; the 5 DD. After authoring, recompute and report. **Acceptance:** all of those hash-identical; the only changed existing content is the 12 templated conventions MCQs flipping to `deprecated_superseded` (report before/after status). Rerun the four passage-quality gates on the five passages to confirm **5/5 PASS and unchanged**.

## Source-compliance scan (hardened, from #4k-fix)
Reuse the hardened scan (preserve short words in raw normalized n-gram matching; separate content-token stream; fail on content-bearing overlap ≥ threshold; allow generic boilerplate only as boilerplate). **Scan:** stems/prompts, standalone sentence text, dropdown base text, dropdown options, hot-text token/sentence text, punctuation-drag sentence text, draggable token labels, MCQ choices, rationales, reviewer-preview notes, scoring notes. **Against:** `reference/pssa-released-items/`, `reference/pssa-item-catalog/`, extracted sampler/corpus text. **Report per item:** matched source, matched field, longest normalized n-gram, overlap score, boilerplate-vs-content. **Acceptance:** all 9 points' content PASS `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; 0 content-bearing released/sampler/DRC text copied.

## INLINE_DROPDOWN schema + gates
**Schema (`interactionType: INLINE_DROPDOWN`):** itemId, gradeLevel, eligibleContent, ecSkillFamily, interactionSubtype, baseTextWithBlanks, blanks[] (blankId, position/index, options[], correctIndex, targetSkill, targetWordOrPhrase|null, rationale, distractorErrorPattern per wrong option), scoring, partialCreditRules, status/source/license + audit metadata. **Subtypes in #4n:** `single_blank`, `multi_blank`, `spelling`, `grammar_usage`, `punctuation_capitalization` (no `reading_phrase` dropdowns unless clearly conventions/language).
**Gates (all blockers):** `PSSA_DROPDOWN_SCHEMA_VALID`; `_EACH_BLANK_VALID` (every blank real + appears in text, no orphan specs); `_ONE_CORRECT_PER_BLANK` (prefer exactly one); `_CONTEXT_FIT` (correct option fits grammatically + semantically); `_DISTRACTORS_ARE_PLAUSIBLE_ERRORS` (dropped ending, doubled letter, wrong tense, S-V agreement, wrong comparative/superlative, capitalization, punctuation, homophone/usage — no nonsense/joke/all-obviously-wrong options); `_CONVENTION_SKILL_MATCH` (extends `PSSA_ITEM_EC_SKILL_MISMATCH`: spelling EC tests spelling, punctuation EC tests punctuation, etc.); `_NO_AMBIGUOUS_CORRECT_OPTION` (no distractor also acceptable; no regional/style alternative equally defensible; no two valid readings); `_PARTIAL_CREDIT_VALID` (multi-blank: explicit totals + per-blank rules; full credit needs all target blanks; no full credit for contradictory answers); `_OPTION_ORDER_DISTRIBUTION` (**batch**: correct option not always first/last; correctIndex distribution balanced; no option-position pattern too often; multi-blank correct-position sequences vary).

## Word-level HOT_TEXT schema + gates
**Schema (`interactionType: HOT_TEXT`, `interactionSubtype: word_select`):** itemId, gradeLevel, eligibleContent, ecSkillFamily, prompt, instructionText, sourceSentence, selectableTokens[] (tokenId, text, tokenIndex, isPunctuation), correctTokenIds[], exactSelectionCount, scoring, partialCreditRules, rationale per correct + distractor token, audit metadata.
**Gates:** `PSSA_WORD_HOT_TEXT_SCHEMA_VALID`; `_TOKENS_VALID` (clean, student-selectable, match the source sentence — verbatim in stimulus); `_CORRECT_COUNT_MATCHES_INSTRUCTION`; `_CONVENTION_TARGET_VALID` (correct tokens are truly the target errors/words for the convention); `_NO_INCORRECT_TOKEN_EQUALLY_VALID`; `_SKILL_MATCH`; `_SURFACE_SHORTCUT_DISTRIBUTION` (**batch**: correct tokens not always first/last, not always adjacent, no repeated same-position pattern).

## Punctuation-token DRAG schema + gates
**Schema (`interactionType: DRAG_DROP`, `interactionSubtype: token_placement`):** itemId, gradeLevel, eligibleContent, ecSkillFamily, prompt, instructionText, baseSentenceWithSlots, draggableTokens[] (tokenId, text, tokenType, isDistractor), slots[] (slotId, position/index, capacity, acceptedTokenType), correctAssignments[] (tokenId→slotId), scoring, partialCreditRules, rationale per correct assignment + distractor token, audit metadata.
**Gates:** `PSSA_PUNCT_DRAG_SCHEMA_VALID`; `_ASSIGNMENTS_VALID`; `_SLOT_CAPACITY_VALID`; `_CONVENTION_VALID` (the punctuation/capitalization convention is real + grade-appropriate); `_NO_DISTRACTOR_TOKEN_EQUALLY_VALID`; `_SKILL_MATCH`; `_PARTIAL_CREDIT_VALID` (no full credit for wrong placement); `_SURFACE_SHORTCUT_DISTRIBUTION` (**batch**: correct token not always first draggable; correct slot not always first; token/slot patterns vary).

## Standalone conventions MCQ gates (use only where MCQ is genuinely appropriate)
`PSSA_MCQ_SINGLE_DEFENSIBLE`; `PSSA_CONVENTIONS_MCQ_SKILL_MATCH`; `PSSA_CONVENTIONS_MCQ_DISTRACTOR_ERROR_PATTERN`; no generic distractors; no copied-choice shortcut; no giveaway absolutes; **answer-position distribution enforced** across the conventions-MCQ subset where applicable.

## Shared conventions gates (all blockers)
1. `PSSA_CONVENTIONS_STANDALONE_CONTEXT_VALID` — the sentence gives enough context to determine the convention; no outside knowledge required; not so artificial the tested skill is obvious without understanding.
2. `PSSA_CONVENTIONS_ONE_SKILL_TARGETED` — each item has one primary skill target; do not combine spelling + punctuation + usage so the measured skill is unclear.
3. `PSSA_CONVENTIONS_ERROR_PATTERN_VALID` — every wrong option/token is a plausible grade-level error pattern; report `errorPattern` labels.
4. `PSSA_CONVENTIONS_EC_SKILL_MATCH` — the item tests the skill named by its EC; never retag the EC to match a generated item.
5. `PSSA_CONVENTIONS_NO_AMBIGUITY` — exactly one correct path; no alternate acceptable spelling/grammar/capitalization/punctuation.
6. `PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION` — **batch**: dropdown correct positions vary; hot-text correct token positions vary; drag token/slot positions vary; MCQ answer positions vary; no pattern lets a student guess by screen position.
7. `PSSA_CONVENTIONS_SOURCE_COMPLIANCE_NO_COPY` — real text scan on all sentences, choices, tokens, rationales, preview text.
8. `PSSA_CONVENTIONS_PREVIEW_LEAK_FREE` — student preview source + rendered view contain no answer keys or hidden correctness markers.

## Student preview leak check
The student-facing preview **source** must not contain: `correctIndex`, `correctIndices`, `correctTokenIds`, `correctAssignments`, `correctOption`, `data-correct`, `data-c`, `data-answer`, `answerKey`, `rationale`, `skillMatchResult`, `sourceComplianceResult`, audit metadata, or hidden reviewer metadata. If interactive behavior needs answer data, put it in a reviewer/debug preview, not the student preview.

## Tests
**INLINE_DROPDOWN:** valid single-blank spelling → PASS; valid multi-blank → PASS; text has two blanks but one blank spec → FAIL `_EACH_BLANK_VALID`; two grammatically acceptable options → FAIL `_NO_AMBIGUOUS_CORRECT_OPTION`; nonsense/implausible distractors → FAIL `_DISTRACTORS_ARE_PLAUSIBLE_ERRORS`; spelling EC tests punctuation/tense → FAIL `_CONVENTION_SKILL_MATCH`; correct option always index 0 across five blanks → FAIL `_OPTION_ORDER_DISTRIBUTION`; multi-blank missing scoring rules → FAIL `_PARTIAL_CREDIT_VALID`.
**WORD_HOT_TEXT:** valid choose-two-misspelled → PASS; count mismatch → FAIL `_CORRECT_COUNT_MATCHES_INSTRUCTION`; unmarked token also misspelled → FAIL `_NO_INCORRECT_TOKEN_EQUALLY_VALID`; capitalization EC asks for misspelled words → FAIL `_SKILL_MATCH`; all items use first two tokens → FAIL `_SURFACE_SHORTCUT_DISTRIBUTION`.
**PUNCTUATION_TOKEN_DRAG:** valid comma-in-series → PASS; assignment to nonexistent slot → FAIL `_ASSIGNMENTS_VALID`; capacity exceeded → FAIL `_SLOT_CAPACITY_VALID`; distractor punctuation also acceptable → FAIL `_NO_DISTRACTOR_TOKEN_EQUALLY_VALID`; punctuation EC actually tests capitalization → FAIL `_SKILL_MATCH`; full credit despite wrong placement → FAIL `_PARTIAL_CREDIT_VALID`; all items use first token + first slot → FAIL `_SURFACE_SHORTCUT_DISTRIBUTION`.
**Source compliance:** dropdown sentence / option / hot-text sentence / drag sentence copied from released text (incl. short words) → FAIL; generic boilerplate ("Choose the correct answer") alone → NOT a fail; production control: all #4n items report 0 content-bearing overlap.
**Deprecation:** a `deprecated_superseded` conventions item must NOT appear in `getStudentReadyPssaItems()` (closes the loophole where the status flips but the student-ready selector still leaks the old items); its `supersededByItemIds` resolve to real new #4n items covering the same EC/subskill.

## Adversarial validation (≥5 novel fixtures NOT used in authoring)
1. INLINE_DROPDOWN valid schema but two options acceptable in context → FAIL ambiguity gate.
2. INLINE_DROPDOWN correct option fits but EC is wrong → FAIL skill-match.
3. WORD_HOT_TEXT all tokens valid but one unmarked token also satisfies the prompt → FAIL no-extra-correct gate.
4. PUNCTUATION_TOKEN_DRAG valid surface but a distractor punctuation is also acceptable by standard usage → FAIL no-equally-valid-distractor gate.
5. Batch shortcut: all conventions items use first option/token/slot → FAIL `PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION`.
Report these in test output.

## Reports
- `pssa_conventions_grade3_audit_report.csv` — itemId, gradeLevel, eligibleContent, ecSkillFamily, interactionType, interactionSubtype, pointValue, stem/prompt, targetConvention, errorPatternLabels, correctResponseShape, skillMatchResult, contextValidResult, ambiguityResult, distractorErrorPatternResult, partialCreditResult, sourceComplianceResult, surfaceShortcutResult, previewLeakResult, finalResult, notes.
- `pssa_conventions_grade3_surface_shortcut_report.csv` — tranche, itemCount, dropdownCorrectIndexDistribution, hotTextCorrectTokenPositionPatterns, tokenDragAssignmentPatterns, mcqAnswerPositionDistribution, result, severity, notes.
- `pssa_conventions_grade3_source_scan_report.csv` — itemId, field, matchedSource, longestNormalizedNgram, overlapScore, boilerplateOrContent, result, notes.
- `pssa_conventions_grade3_deprecation_report.csv` — oldItemId, oldStatusBefore, oldStatusAfter, deprecatedReason, oldEc, oldSubskill, supersededByItemIds, newEc, newSubskill, mappingNotes.
- Update the Grade 3 vertical-slice summary: passages; 28 reading MCQs; EBSR; MS; HT; MG; DD; **new conventions stream (9 pts)**; deprecated conventions (12); all gate counts; source-scan + shortcut summaries; D-skill coverage table.

## Previews
**Student preview:** all conventions items; no answer keys, rationales, hidden correctness metadata, or internal audit fields (source + rendered). **Reviewer preview:** per item — interactionType/subtype; EC; target convention; correct response; distractor/error-pattern rationales; scoring + partial-credit rules; source scan result; skill-match result; surface-shortcut result; final audit result.

## Acceptance
- Exactly 9 Grade 3 conventions points authored; item/point mapping reported; mix includes INLINE_DROPDOWN + ≥1 other conventions-appropriate TEI surface.
- 100% PASS source-compliance real scan; 100% PASS EC skill-match; 100% PASS convention-specific correctness gates; 100% PASS ambiguity checks; 100% PASS partial-credit/scoring checks.
- The conventions tranche PASSes `PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION` **as a batch**.
- **Deprecation counts:** active Grade 3 conventions stream = exactly **9 points**; deprecated conventions MCQs = exactly **12**; active old templated conventions MCQs = **0**. Each of the 12 flipped to `deprecated_superseded` with `deprecatedReason` set and non-empty `supersededByItemIds` pointing only to new #4n items (each mapped to ≥1 replacement covering the same EC/subskill); excluded from student-ready / active count / preview / exports; preserved in repo; visible in audit reports. The deprecation report lists oldItemId, old EC, old subskill, new superseding itemId(s), new EC/subskill, and mapping notes.
- Unchanged hashes for passages, 28 reading MCQs, 5 EBSRs, 5 MS, 5 HT, 5 MG, 5 DD; passage gates 5/5 PASS and unchanged.
- Student preview leak-free (source + rendered); reviewer preview complete.
- `WARN_WITH_JUSTIFICATION` does not count as clean — zero FAIL and zero unresolved WARN required.
- No passage text changed; no reading MCQs changed; no EBSR/MS/HT/MG/DD changed; no Grades 4–8; no approvals/imports/DB writes.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit: conventions items; deprecation flips; INLINE_DROPDOWN + word-HOT_TEXT + punctuation-DRAG + conventions-MCQ gate code; tests; reports; student + reviewer previews; vertical-slice summary. Do not leave untracked files.

## Stop — report
#4j contract/inheritance confirmation; #4k-fix/#4l/#4m unchanged confirmation; 9-point conventions item/point table; interactionType distribution; EC distribution; target-convention distribution; error-pattern distribution; dropdown correct-index distribution; word-hot-text token-position distribution; punctuation-drag token/slot distribution; conventions surface-shortcut batch result; source-compliance scan summary; the deprecation table (12 old → status + supersededBy); the unchanged-hash table; passage-gate rerun (5/5 unchanged); final conventions audit table; student + reviewer preview paths; confirmations (no passage/reading/TEI content changed, no Grades 4–8, no approvals/imports/DB writes). **Do not proceed to #4o until #4n passes independent audit.**
