# PSSA PR #4o — Grade 3 Short Answer (Constructed Response)

Production constructed-response tranche after #4n. Grade 3 only. **Short Answer only.** No passage regeneration. No reading-MCQ/EBSR/MS/HT/MG/DD/conventions rewrites. No Grades 4–8. No approvals/imports/DB writes. File-only. Commit.

## Scope note — why Short Answer, not TDA
Per the PDE/DRC test design, **Grade 3 uses Short Answer (2 × 3-point) and has NO TDA; TDA is Grades 4–8 only.** So a Grade-3-scoped PR builds Short Answer. The TDA gate framework already exists (mock-proven in the #4j contract: `PSSA_TDA_RUBRIC_VALID`, `_ANALYTIC_PROMPT_VALID`, `_NOT_SUMMARY_OR_OPINION_ONLY`, etc.); **TDA *production* is deferred to the future Grades 4–8 work**, not this PR. This PR completes the Grade 3 item-type surface by adding its only constructed-response type.

## Rule 0 — safeguard inheritance (binding)
Re-read the #4j "Safeguard inheritance" section + **section 4a**. **A valid response surface alone is not enough.** Short Answer is **passage-based reading constructed response**, so unlike the conventions PR it DOES inherit the passage-quality and passage-grounding gates. Each item inherits: passage-quality gates (rerun on the assigned passage); passage-grounding (the expected answer + acceptable text support are drawn from the assigned passage; quoted support spans verbatim); source/license compliance + the hardened no-copy source scan (#4k-fix); `eligibleContent` validity; `PSSA_ITEM_EC_SKILL_MISMATCH` adapted to the reading skill; clean student preview + strict source-leak check; reviewer preview with rubric/expected-answer/gate results.

**Surface-shortcut note.** Short Answer has no displayed answer positions, so the batch position/option-order shortcut gates do not apply. The SA-equivalent anti-shortcut is the **copied-text cap** (a response made only of copied passage text earns ≤1) — that gate replaces position-distribution here.

## Scope boundary — rubric-STRUCTURE validation, NOT auto-scoring
This PR validates Short Answer **rubric metadata, expected-response components, acceptable text support, the copied-text cap, score-band example rendering, and previews.** It does **NOT** claim production automated scoring of student responses. Automated/AI scoring and rubric calibration against real anchor papers is a separate later effort. All score-band example responses are **original toy responses written for this PR** — no released/anchor-paper student-response text is copied (use rubric *behavior* from `reference/pssa-test-design/constructed_response_scoring.md`, not copied anchors).

## Preconditions (stop and report if any is missing)
#4j/#4k-fix/#4l/#4m/#4n committed+pushed to `main` and independently audited; **current branch starts from latest `main`** (which now contains #4j–#4n). Do not author from a stale branch.

## Context
The Grade 3 form carries **2 Short-Answer items at 3 points each (6 points)**, reading, passage-based. Official scoring (transcribed in `reference/pssa-test-design/constructed_response_scoring.md`): **3** = correct answer + text-based support + specific accurate details; **2** = partial (some task awareness + ≥1 text detail, minor inaccuracy tolerated); **1** = incomplete/misreads task or no text details — **OR a response made entirely of copied text**; **0** = insufficient/inaccurate throughout. This PR authors a Grade 3 Short-Answer proof tranche held to those rubric requirements.

## Scope & count
Author exactly **5 Grade 3 Short-Answer items, 1 per approved passage** (The Night the Creek Glowed; A Map Under the Bench; The Bell That Saved Lunch; Blue Paint for Saturday; The Cart That Would Not Turn). 3 points each. (A live form draws 2 from the pool; 5 gives a one-per-passage proof set consistent with the EBSR/MS/HT/MG/DD pattern.) Short Answer is a **separate stream** — do NOT fold into any prior count. Align each to a Grade 3 reading EC (key-ideas / cite-evidence / inference) exact from `data/pssa/anchor_ec_crosswalk.csv`; vary the EC/skill across the five.

**Form blueprint / pool accounting (the 5 are a POOL, not a live form).** Report: `shortAnswerPoolCount = 5`; `shortAnswerDrawCount = 2`; `shortAnswerPointsPerItem = 3`; `activeFormShortAnswerPoints = 6`; `poolShortAnswerPoints = 15`. **Acceptance:** the Grade 3 active-form blueprint counts only **2 Short-Answer items / 6 points**; the vertical-slice summary may show the 5 pool items but must **NOT** report 15 active Short-Answer form points; student-ready form assembly draws **2** from the pool unless the blueprint explicitly changes.

**Pre-authoring Short Answer inventory.** Before authoring, search for existing Grade 3 SHORT_ANSWER / constructed-response items. Report: existing Grade 3 Short-Answer count; existing active count; existing deprecated/quarantined count; EC distribution if any. **If any active old Grade 3 Short-Answer items exist, stop and report** unless this PR explicitly deprecates/supersedes/quarantines them. **Acceptance:** active old Grade 3 Short-Answer items = 0; new #4o pool = 5; live-form draw = 2.

## Passage gate rerun + unchanged-content hashes
Rerun the four passage-quality gates on the five passages (acceptance: 5/5 PASS, unchanged). Hash before/after: the five passages; the 28 reading MCQs; the 5 EBSRs; the 5 MS; the 5 HT; the 5 MG; the 5 DD; the 9 conventions items; **and the 12 deprecated conventions MCQs.** **Acceptance:** all prior **content** files are hash-identical; the only new/changed files are #4o Short-Answer content, SA gate/test code, reports, student/reviewer previews, and the updated vertical-slice summary; **no prior item or passage content is mutated.** **For the 12 deprecated conventions MCQs specifically:** they remain hash-identical, `itemStatus` stays `deprecated_superseded`, `deprecatedReason` stays set, `supersededByItemIds` stay intact, and none reappear in student-ready selectors, previews, exports, or active point counts (prove #4o did not accidentally reactivate them).

## Source-compliance scan (hardened, from #4k-fix)
Reuse the hardened scan. **Scan:** stems/prompts, the expected-answer text, acceptable-support statements, every score-band example response, rationales, reviewer-preview notes, the assigned passage text. **Against:** `reference/pssa-released-items/`, `reference/pssa-item-catalog/`, extracted sampler/corpus text. **Report per item:** matched source, matched field, longest normalized n-gram, overlap score, boilerplate-vs-content. **Acceptance:** 5/5 PASS `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; 0 content-bearing released/sampler/DRC/anchor text copied.

## SHORT_ANSWER schema (`interactionType: SHORT_ANSWER`)
Fields: itemId, gradeLevel, passageId, eligibleContent (reading EC), ecSkillFamily, interactionSubtype (`text_supported_short_answer`), stem, instructionText, `requiresTextSupport: true`, expectedAnswerCore (the correct claim), acceptableTextSupport[] (the passage details/quotes that earn credit; `quotedSpan` for any that are direct quotes, verbatim in the assigned passage), rubric (the 3/2/1/0 descriptors instantiated for this item), `copiedTextCap: true` + copiedTextCapRule, scoreBandExamples[] (band 3/2/1/0 → an original toy response illustrating that band, with a one-line why), scoring (totalPoints=3, partialCreditRules), audit metadata. `reviewStatus=PENDING`, `itemStatus=candidate`, `sourceType=internal_original`, license cleared.

## SHORT_ANSWER authoring
Each item: the prompt **requires both an answer and text-based support** (not a one-word recall that could reach 3 without explanation); the expected answer is decidable from and grounded in the assigned passage; `acceptableTextSupport` lists the specific passage details/quotes that earn credit (direct quotes verbatim in the passage); the 3/2/1/0 rubric is instantiated with item-specific expectations; the copied-text cap is encoded (a verbatim-only lift earns ≤1); each of the four score bands has an **original toy** example response. The item genuinely tests the assigned reading EC. **Vary across the five** (main idea + support, cite-evidence, inference, character/sequence, compare-within-text), each on a different passage.

**Copied-text cap clarification (do not turn the cap into a "no quotes" rule).** The cap applies to a response made **entirely or almost entirely of lifted passage text with no student explanation**. Legitimate quotation is fine: a response that includes quoted or closely-paraphrased evidence **plus an original explanation** answering the prompt is eligible for full credit. And a prompt that merely asks students to copy two sentences is itself defective — it must FAIL `PSSA_SA_PROMPT_REQUIRES_TEXT_SUPPORT`.

## SHORT_ANSWER gates (all blockers)
1. `PSSA_SA_SCHEMA_VALID` — required fields present; passageId resolves; rubric + scoring + status/license metadata present.
2. `PSSA_SA_RUBRIC_VALID` — the 3/2/1/0 descriptors are all present and item-specific (not a generic copy); totals valid (3-point).
3. `PSSA_SA_PROMPT_REQUIRES_TEXT_SUPPORT` — `requiresTextSupport=true` and the prompt genuinely demands an answer + support; a one-word recall cannot reach 3.
4. `PSSA_SA_EXPECTED_RESPONSE_COMPONENTS_VALID` — `expectedAnswerCore` present + passage-grounded; `acceptableTextSupport` non-empty; each direct-quote `quotedSpan` appears **verbatim in the assigned passage**.
5. `PSSA_SA_COPIED_TEXT_CAP_ENCODED` — `copiedTextCap=true` with an explicit rule capping verbatim-only responses at ≤1; scoring cannot award ≥2 to a copy-only response.
6. `PSSA_SA_SCORE_BAND_EXAMPLES_RENDERABLE` — all four bands (3/2/1/0) have a renderable original toy example; the band-1 example includes a copy-only case demonstrating the cap; examples are not copied from released anchors.
7. `PSSA_SA_SKILL_MATCH` — extends `PSSA_ITEM_EC_SKILL_MISMATCH`: the prompt + expected answer test the assigned reading EC skill (a cite-evidence EC requires evidence; a main-idea EC requires the central idea; not merely a valid code).
7a. `PSSA_SA_SUPPORT_SUFFICIENCY_VALID` — if the prompt asks for two details, `acceptableTextSupport` contains **at least two independent** support details (prefer ≥3 where the passage allows, so scoring isn't too narrow); each support detail connects to `expectedAnswerCore` (not merely topic-adjacent); support details are **independent, not duplicate phrasings** of the same evidence; the band-3 example includes the expected answer **plus the required number of supports**; the band-2 example shows **partial** support and does not accidentally satisfy the band-3 rule. (Catches the constructed-response version of "evidence exists but not enough to justify the score.")
8. Inherited (reuse, do not redefine): passage-quality gates on the assigned passage; passage-grounding (answer + support from the assigned passage; no general-knowledge-only answer; no old-templated-passage support); `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; `PSSA_ITEM_PREVIEW_RENDERABLE`; `PSSA_ITEM_TYPE_INTERACTION_CONSISTENT` (SHORT_ANSWER ⇒ constructed_response itemType); `PSSA_ITEM_GRADE_TYPE_COMPATIBLE` (SHORT_ANSWER allowed at Grade 3).

## Student preview leak check
The student-facing preview **source** must not contain: `expectedAnswerCore`, `acceptableTextSupport`, `rubric`, `scoreBandExamples`, `copiedTextCapRule`, `quotedSpan`, `data-correct`, `answerKey`, `rationale`, `skillMatchResult`, `sourceComplianceResult`, audit metadata, or hidden reviewer metadata. The student preview shows only: the passage, the stem, the instruction, and a response box. Answer/rubric data lives only in the reviewer preview.

## Tests
1. Valid SA (answer + ≥2 acceptable text-support details; 3/2/1/0 rubric; copied-text cap; four toy band examples) → PASS.
2. Rubric missing a band (e.g., no 0-point descriptor) → FAIL `PSSA_SA_RUBRIC_VALID`.
3. Prompt is a one-word recall not requiring support → FAIL `PSSA_SA_PROMPT_REQUIRES_TEXT_SUPPORT`.
4. `acceptableTextSupport` empty, or a direct-quote `quotedSpan` not verbatim in the passage → FAIL `PSSA_SA_EXPECTED_RESPONSE_COMPONENTS_VALID`.
5. Scoring allows ≥2 for a copy-only response, or `copiedTextCap` missing → FAIL `PSSA_SA_COPIED_TEXT_CAP_ENCODED`.
6. A score band lacks an example, or the band-1 copy-only example is missing → FAIL `PSSA_SA_SCORE_BAND_EXAMPLES_RENDERABLE`.
7. EC says cite-evidence but the prompt asks only for a personal opinion → FAIL `PSSA_SA_SKILL_MATCH`.
8. Expected answer answerable from general knowledge without the passage → FAIL passage-grounding.
9. A score-band example or stem copied from released/anchor text (incl. short words) → FAIL source compliance.
10. Student preview source contains `expectedAnswerCore`/`rubric`/`scoreBandExamples` → FAIL preview-leak.
11. Copied-text behavior: a copy-only response scores ≤1; a response with quoted evidence **plus** original explanation and two valid supports is eligible for 3; a prompt that only asks students to copy two sentences → FAIL `PSSA_SA_PROMPT_REQUIRES_TEXT_SUPPORT`.
12. Support sufficiency: prompt asks for two details but `acceptableTextSupport` has only one (or two duplicate phrasings of the same evidence) → FAIL `PSSA_SA_SUPPORT_SUFFICIENCY_VALID`; band-2 example that actually satisfies the band-3 rule → FAIL same.

## Adversarial validation (≥4 novel fixtures NOT used in authoring)
1. SA whose expected answer is correct but `acceptableTextSupport` is empty → FAIL `_EXPECTED_RESPONSE_COMPONENTS_VALID`.
2. SA with a full 3/2/1/0 rubric but scoring that would award 2 to a verbatim copy → FAIL `_COPIED_TEXT_CAP_ENCODED`.
3. SA tagged a key-ideas EC but the prompt only asks the student to retype a sentence → FAIL `_PROMPT_REQUIRES_TEXT_SUPPORT` / `_SKILL_MATCH`.
4. SA whose band-3 toy example is actually a copy-only lift (should be ≤1) → FAIL `_SCORE_BAND_EXAMPLES_RENDERABLE` (band misassigned).
Report these in test output.

## Reports
- `pssa_short_answer_grade3_audit_report.csv` — itemId, gradeLevel, passageId, passageTitle, eligibleContent, ecSkillFamily, stem, requiresTextSupport, expectedAnswerCorePresent, acceptableTextSupportCount, quotedSpansVerbatimResult, rubricValidResult, promptRequiresSupportResult, copiedTextCapResult, scoreBandExamplesResult, skillMatchResult, groundingResult, sourceComplianceResult, previewLeakResult, finalResult, notes.
- `pssa_short_answer_grade3_source_scan_report.csv` — itemId, field, matchedSource, longestNormalizedNgram, overlapScore, boilerplateOrContent, result, notes.
- Update the Grade 3 vertical-slice summary: passages; 28 reading MCQs; EBSR; MS; HT; MG; DD; conventions (9, + 12 deprecated); **new Short Answer (5)**; all gate counts; source-scan summary; EC coverage; **a full Grade 3 item-type completeness table** (every PSSA Grade 3 item type now present).

## Previews
**Student preview:** the 5 SA items — passage + stem + instruction + response box only; no expected answer, rubric, support, or examples (source + rendered). **Reviewer preview:** per item — passage, eligibleContent, stem, expectedAnswerCore, acceptableTextSupport (with verbatim quotes), the 3/2/1/0 rubric, the four toy score-band examples (incl. the copy-only band-1 case), copied-text-cap rule, skill-match result, source-compliance result, grounding result, final audit result.

## Acceptance
- 5 new Grade 3 Short-Answer items, 1 per passage, 3 points each, each tagged to a real Grade 3 reading EC (varied skills).
- **Pool accounting:** active old Grade 3 Short-Answer items = 0; new pool = 5; live-form draw = 2; **active form Short-Answer points = 6 (NOT 15)**; the summary reports pool count / draw count / points-per-item / active-form points / pool points.
- **Support sufficiency:** every item passes `PSSA_SA_SUPPORT_SUFFICIENCY_VALID` (≥ required independent supports, band-3 example includes answer + supports, band-2 stays partial).
- **Deprecated conventions untouched:** the 12 conventions MCQs remain hash-identical, `deprecated_superseded`, with reason + supersededBy intact, and absent from all student-ready selectors/previews/exports/active counts.
- 5/5 PASS all SHORT_ANSWER gates + inherited gates; 5/5 PASS source-compliance real scan.
- Every direct-quote `acceptableTextSupport` span verbatim in the assigned passage; copied-text cap encoded on all five; all four score bands have original toy examples (no copied anchor text).
- 5/5 assigned passages PASS the four passage-quality gates and are unchanged.
- Unchanged hashes for passages, 28 reading MCQs, 5 EBSRs, 5 MS, 5 HT, 5 MG, 5 DD, 9 conventions items; 12 conventions MCQs remain `deprecated_superseded`.
- 0 released/sampler/DRC/anchor content-bearing text copied; no general-knowledge-only items.
- Student preview leak-free (source + rendered); reviewer preview complete.
- `WARN_WITH_JUSTIFICATION` does not count as clean — zero FAIL and zero unresolved WARN.
- No passage text changed; no prior item rewrites; no Grades 4–8; no approvals/imports/DB writes.
- **This PR validates rubric structure + previews only — it makes no automated-scoring claim.**

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit: Short-Answer items; SA gate code; tests; reports; student + reviewer previews; updated vertical-slice summary. Do not leave untracked files.

## Stop — report
#4j–#4n inheritance/unchanged confirmation; 5 Short-Answer item IDs; passage→item mapping; EC distribution; per-item rubric-valid / prompt-requires-support / copied-text-cap / score-band-examples / skill-match results; quoted-support verbatim counts; source-compliance scan summary; passage-gate rerun (5/5 unchanged); the unchanged-hash table; final Short-Answer audit table; the **Grade 3 item-type completeness table** (MCQ, EBSR, multiple-select, hot-text, matching-grid, drag-drop, inline-dropdown/conventions, Short Answer — all present; **plus an explicit row: TDA = N/A for Grade 3, production deferred to Grades 4–8** — so a future reviewer does not read "TDA missing" as a defect); student + reviewer preview paths; confirmations (no prior content changed, no Grades 4–8, no approvals/imports/DB writes; no auto-scoring claim). **After #4o passes independent audit, the Grade 3 item bank is complete across all PSSA item types; the next milestone is the governed-schema migration + crosswalk import (the ops gate to anything student-facing) — out of scope for this PR.**
