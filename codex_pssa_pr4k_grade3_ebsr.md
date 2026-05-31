# PSSA PR #4k — Grade 3 EBSR Production Items

> Renumbered from #4j. The NEW #4j is the mock-only **Complete ELA Item-Type Contract + Mock Pack** (`codex_pssa_pr4j_item_type_contract.md`), which locks the discriminated `responseSpec` union, the `interactionType`/`interactionSubtype` enums, the general item-type gates, and the EBSR family gates against original toy fixtures. **#4k depends on #4j being merged first** — this PR authors the first *real* Grade 3 EBSR tranche against the contract's `interactionType: EBSR` schema and reuses the EBSR family gates defined there (do not redefine them).

**Rule 0 — safeguard inheritance (binding):** before authoring, re-read the "Safeguard inheritance for production TEI / constructed-response items" section in `codex_pssa_pr4j_item_type_contract.md`. Every item here must inherit passage gates, universal item safeguards, passage-grounding gates, MCQ-style subpart gates (EBSR Part A), multi-response/TEI gates (Part B), and `PSSA_ITEM_EC_SKILL_MISMATCH` per surface. A valid response surface alone is NOT sufficient to pass.

**Rule 0a — source-compliance must be a REAL text scan, not flag-based.** #4j's source-compliance gate was metadata/flag-based (acceptable for mock-only). #4k authors real items on the real five Grade 3 passages, so source compliance must actually scan item + passage text against the released/sampler corpus in `reference/pssa-released-items/` and the DRC screenshot catalog, and FAIL (blocker) on any verbatim or near-verbatim match (e.g., normalized n-gram overlap above threshold). Trusting `auditMetadata` flags is NOT sufficient for production. Report the scan method and the longest matched n-gram per item.

**Source-compliance scan details.** Normalize case, punctuation, whitespace, and stopword-only differences. **Scan these fields:** Part A stem; Part A choices; Part B stem; Part B evidence choices; rationales; any item metadata text intended for preview; assigned passage text. **Against:** `reference/pssa-released-items/`; `reference/pssa-item-catalog/` text where available; any extracted sampler/corpus text used by the project. **Allowed generic boilerplate** (do NOT fail solely for standard assessment directions): "Choose two answers", "Which evidence from the passage supports…", "Part One", "Part Two" — but report boilerplate matches separately. **Blocker:** fail on *content-bearing* verbatim/near-verbatim overlap above the documented threshold (stems, choices, rationales, passage text, evidence statements — not generic directions). **Report per item:** matched source file, matched field, longest normalized n-gram, overlap score, and whether the match is boilerplate or content-bearing.

First PRODUCTION authoring tranche. Author 5 real Grade 3 EBSR items against the locked contract; prove on Grade 3 first. No passage regeneration. No Grades 4–8. No conventions/TDA work. No approvals/imports/DB writes. File-only. Commit.

## Context
The Grade 3 slice has real passages and passage-grounded MCQs, but only standard single-answer 4-option MCQs. PSSA ELA also uses Evidence-Based Selected Response (EBSR), a two-part technology-enhanced item:
- Part One: selected-response comprehension question, one correct of four.
- Part Two: "Which evidence from the passage supports the answer in Part One? Choose two." — options are passage evidence spans; one or more correct; partial credit; 2–3 points total.
EBSR is currently at ZERO coverage. This PR adds first-class EBSR support and proves it on Grade 3.

Use ORIGINAL content only. The official PSSA released samplers in `reference/pssa-released-items/raw/` are FORMAT reference only — do NOT copy their passages, stems, choices, or wording into product content (commercial-use restricted).

## Preconditions (all met: #4f-a, #4g, #4h, #4i committed+pushed; latest ebb9f70)
If any precondition is unmet, stop and report. EBSR authoring reuses the #4g grounding machinery and the #4h/#4i EC skill-match logic.

## Scope & count
Grade 3 EBSR reading items only, on the five approved passages (Creek Glowed, Map Under the Bench, Bell That Saved Lunch, Blue Paint for Saturday, Cart That Would Not Turn). Do not modify passage text or existing MCQs (except shared schema/report compat if required). **Proof tranche: exactly 5 EBSR items, 1 per passage.** Do not scale beyond 5 in this PR. EBSR is a SEPARATE item stream — do NOT fold into the existing 28 MCQ count.

## EBSR schema (`itemType: EBSR`)
Top-level: itemId, gradeLevel, passageId, eligibleContent, ecSkillFamily, partA, partB, scoring, audit metadata. Metadata: `reviewStatus=PENDING`, `itemStatus=candidate`, `sourceType=internal_original`, license cleared, no copied released-item text.
- `partA`: stem; choices[]; correctIndex; evidenceNeededDescription; rationale; distractorRationales; distractorRoles.
- `partB`: stem; instruction (e.g. "Choose two answers"); choices[] (each an evidence statement); correctIndices[]; `quotedSpan` for each option (verbatim passage text); evidenceRole for each option; rationale for each option.
- `scoring`: totalPoints (2 or 3); partAPoints; partBPoints; partialCreditRules; `requirePartACorrectForFullCredit` (explicit true/false); scoringNotes.

## Authoring requirements
Align each EBSR to an evidence-oriented Grade 3 reading EC (Part One's skill; e.g. cite-evidence / key-ideas / inference), exact from `data/pssa/anchor_ec_crosswalk.csv`.
**Part One:** answerable only from the assigned passage; tests the assigned EC skill; exactly one defensible correct answer; three plausible passage-specific distractors; passes existing MCQ gates (no generic distractors, no copied-choice shortcut, no absolute giveaway, no length/position shortcut, no generic stem frame).
**Part Two:** asks for evidence supporting the Part One answer; each option's `quotedSpan` appears verbatim in the SAME assigned passage; correct options genuinely support the Part One correct answer; incorrect options are real passage details that do NOT support it; correct-count matches the instruction; no evidence from old templated passages or sampler text.

## EBSR gates (all blockers; prove on the 5 Grade 3 items)
1. `PSSA_EBSR_SCHEMA_VALID` — partA/partB/scoring present; partA.correctIndex valid; partB.correctIndices nonempty; all choice indices valid; status/license metadata present.
2. `PSSA_EBSR_PART_A_SINGLE_DEFENSIBLE` — exactly one correct Part One answer; distractors plausible but wrong; answer supported by passage; no generic/giveaway choices. (Reuse MCQ gates.)
3. `PSSA_EBSR_PART_B_VERBATIM_EVIDENCE` — every Part Two option has a `quotedSpan` that appears verbatim in the assigned passage; none from old templated passages or sampler text. (Reuse the evidence-span-found machinery.)
4. `PSSA_EBSR_PART_B_SUPPORTS_PART_A` — every correct Part Two option supports the Part One correct answer; no incorrect option equally supports it (Part Two must be uniquely defensible); evidence is specific, not merely topic-related. Deterministic where possible; LLM judge only for ambiguous links and may NOT override a clear deterministic FAIL.
5. `PSSA_EBSR_CORRECT_COUNT_MATCHES_INSTRUCTION` — "Choose two" → exactly two correct; "Choose one" → exactly one; displayed instruction, `correctIndices`, and scoring metadata agree.
6. `PSSA_EBSR_SKILL_MATCH` — extends `PSSA_ITEM_EC_SKILL_MISMATCH` to EBSR: Part One tests the assigned EC skill; Part Two provides evidence for that same claim; not a valid EC code over a different skill.
7. `PSSA_EBSR_PARTIAL_CREDIT_VALID` — scoring totals valid; partial-credit rules explicit; partA+partB points sum to totalPoints; no full credit for unsupported evidence.

## Reports & previews
`pssa_ebsr_grade3_audit_report.csv` (itemId, gradeLevel, passageId, passageTitle, eligibleContent, ecSkillFamily, partAStem, partACorrectIndex, partAResult, partBStem, partBCorrectIndices, partBInstruction, correctCountMatchesInstruction, allPartBSpansFound, supportLinkResult, skillMatchResult, scoringResult, finalEbsrResult, notes). Plus a Grade 3 EBSR student preview (passage + Part One + choices + Part Two + choices; NO keys/rationales/metadata), a reviewer preview (correct answers, every `quotedSpan`, why each correct evidence supports Part One and each incorrect does not, skill-match result, scoring rules, gate results), and an EBSR vertical-slice summary.

## Acceptance
5 EBSR items, exactly 1 per passage; 5/5 PASS on all seven EBSR gates; **5/5 PASS `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY` under the real production text scan** (reported as a gate result, not a narrative confirmation); 100% Part Two spans verbatim in the assigned passage; 0 released-item text copied; 0 old-templated-passage evidence; no passage text changed; no Grades 4–8 changes; no approvals/imports/DB writes.

**Passage gate rerun (required).** Before accepting any EBSR item, rerun the four passage-quality gates on the five assigned Grade 3 passages: `PSSA_PASSAGE_CROSS_DUPLICATE`, `PSSA_PASSAGE_TEMPLATE_SKELETON`, `PSSA_PASSAGE_TOPIC_COHERENCE`, `PSSA_PASSAGE_CONCRETENESS`. Acceptance requires **5/5 assigned passages PASS all four**. Include the passage-gate table in the EBSR vertical-slice summary. (The Wilson failure started when good items sat on bad passages — prove that cannot recur.)

## Tests
1. Valid EBSR (one correct Part A; "Choose two" with exactly two verbatim-found supporting spans) → PASS.
2. Part B span not in passage → FAIL `PSSA_EBSR_PART_B_VERBATIM_EVIDENCE`.
3. "Choose two" but one or three correct → FAIL `PSSA_EBSR_CORRECT_COUNT_MATCHES_INSTRUCTION`.
4. Part B evidence is real passage text but doesn't support Part A → FAIL `PSSA_EBSR_PART_B_SUPPORTS_PART_A`.
5. A distractor evidence option also supports Part A (not uniquely defensible) → FAIL `PSSA_EBSR_PART_B_SUPPORTS_PART_A`.
6. EBSR with vocabulary EC but Part A asks main idea → FAIL `PSSA_EBSR_SKILL_MATCH`.
7. partA+partB points ≠ totalPoints, or missing partial rules → FAIL `PSSA_EBSR_PARTIAL_CREDIT_VALID`.
8. **Source-compliance negative fixture:** an EBSR item whose Part A stem or a choice contains a content-bearing phrase copied from released-sampler text → FAIL `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`. (And confirm a generic direction like "Choose two answers" alone does NOT trigger the blocker.)

## Adversarial validation (novel fixtures NOT used in authoring)
In addition to the unit tests, add at least three adversarial fixtures distinct from the five authored items, and report them in the test output:
1. EBSR where Part B has two verbatim passage spans, but one correct span supports only the topic, not the Part A answer → FAIL `PSSA_EBSR_PART_B_SUPPORTS_PART_A`.
2. EBSR where an *incorrect* Part B option also supports Part A (not uniquely defensible) → FAIL `PSSA_EBSR_PART_B_SUPPORTS_PART_A`.
3. EBSR with a valid response surface and valid verbatim evidence spans, but Part A tests the wrong EC skill → FAIL `PSSA_EBSR_SKILL_MATCH`.
This keeps the EBSR gates from being tuned only to the five authored items (the same generalization check #4j passed).

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit schema, EBSR authoring output, audit logic, tests, reports, previews, summaries. Do not leave untracked files.

## Grade 3 vertical-slice summary (include in the EBSR summary output)
Report the final Grade 3 reading state: 5 approved passages (with the passage-gate rerun table, 5/5 PASS); 28 existing MCQ reading items unchanged; 5 new EBSR items; total Grade 3 reading item streams by type; confirmation the existing MCQ audit still passes if rerun; confirmation EBSR is a separate stream and NOT folded into the 28-MCQ count.

## Stop
Report: EBSR rule IDs added; the 5 Grade 3 EBSR item IDs; passage→EBSR mapping; EC distribution; Part B correct-count distribution; evidence-span-found counts; support-link PASS/WARN/FAIL; skill-match PASS/WARN/FAIL; scoring-validation table; passage-gate rerun table (5/5); source-compliance scan results (matched source/field/longest n-gram/overlap/boilerplate-vs-content per item); the 3 adversarial fixtures and their FAIL results; student + reviewer preview paths; confirmation no sampler text copied; confirmation no passages changed; confirmation no Grades 4–8 changes; confirmation no approvals/imports/DB writes. Do not proceed to Grades 4–8. Do not scale EBSR beyond the 5 Grade 3 proof items.
