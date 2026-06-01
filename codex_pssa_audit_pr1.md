# PSSA ELA Audit/Linter Hardening — PR #1 (Phases 1–2 only)

## Scope guard — read first
This PR is **Phase 1 (detectors) and Phase 2 (root-cause investigation) only.**
- Do **not** start Phase 3 or later.
- Do **not** rewrite, regenerate, approve, or reject any PSSA content.
- Do **not** randomize or mutate answer keys. Audit and report only.
- The only content changes allowed are minimal test fixtures.

## Context
We exported a PSSA ELA audit bundle and received an external audit. Confirmed high-priority issues:
1. Correct-answer position bias — ~87% of single-answer MCQ/conventions items have `correctIndex = 0`.
2. Widespread duplicate item groups.
3. Passages heavily padded with repeated paragraphs/sentences (100 of 101).
4. Manifest counts don't match the underlying files.
5. The current linter reports almost no failures because it lacks the right checks.

Goal: patch the audit/linter layer so it accurately detects these problems and find the generator root cause — **before** any content is regenerated or made student-facing.

---

## Step 0 — Schema mapping (do this BEFORE writing any detector)
Inspect `prisma/schema.prisma` and the existing PSSA export code. Map every conceptual field below to its actual field name, or mark it "does not exist":

`correctIndex`, `studentFacingPrompt`, `studentFacingStimulus`, `itemType`, `gradeLevel`, `subject`, `standardCode`, `sourceType`, `passageId` (item→passage link), `itemStatus`, `reviewStatus`, `licenseStatus`.

**Deliverable:** `pssa_field_mapping.md` — a table of `conceptualName | actualField | location | notes`. Report this and stop for review if more than a few core fields are missing or ambiguous. Do not invent fields.

---

## Phase 1 — cheap, high-signal detectors (audit + report only)

### Task 1 — Manifest-vs-file validation
Verify manifest totals against actual row counts:
- `totalDiagnosticItems` vs `pssa_diagnostic_items.jsonl`
- `totalLessons` vs `pssa_lessons.jsonl`
- `totalPassages` vs `pssa_passages.jsonl`
- `totalStandards` vs `pssa_standards_alignment.csv`
- `totalStudentPreviewEntries` vs `pssa_student_preview.md`

**Emit** `pssa_manifest_validation_report.csv`: `fileName, manifestCount, actualCount, result, notes`
Fail if any mismatch. Add rule `PSSA_MANIFEST_COUNT_MISMATCH`.

### Task 2 — Correct-answer position distribution
For all single-answer selected-choice items, compute `correctIndex` distribution by `gradeLevel`, `subject`, `itemType`, `standardCode`, and `sourceType`.
- **Minimum-N guard:** only evaluate a subgroup if it has **N ≥ 20** items. Smaller subgroups roll up into their parent grade/itemType group; do not flag them individually.
- Flag if any position exceeds **40% overall** or **50% within an eligible (N≥20) subgroup**.

**Emit** `pssa_answer_position_distribution.csv`: `groupKey, totalItems, index0Count, index1Count, index2Count, index3Count, dominantIndex, dominantPct, result, notes`
Add rule `PSSA_ANSWER_POSITION_BIAS`. **Do not randomize answers** — report only.

### Task 3 — Exact duplicate item detection (exact + normalized only)
Normalize and hash: `studentFacingPrompt`, `studentFacingStimulus`, visible answer choices, linked passage id or passage-text hash, `standardCode`/eligibleContent if present.
Detect: exact duplicate stem+choices; exact duplicate stem+same correct answer; duplicate stem with reordered choices; duplicate generated items across generated/database pools.
**Do NOT** use semantic/embedding similarity in this PR — exact and normalized-string matching only.

**Emit** `pssa_duplicate_item_report.csv`: `duplicateGroupId, itemIds, count, gradeLevel, itemType, standardCode, normalizedStem, normalizedChoices, sourceType, severity`
Add rules `PSSA_DUPLICATE_ITEM_EXACT`, `PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES`, `PSSA_DUPLICATE_ITEM_GROUP_TOO_LARGE`.

### Task 4 — Passage repetition / padding detection
For every passage: split into paragraphs and sentences; count repeated paragraphs, repeated sentences, repeated n-gram/phrase blocks; detect retry-and-append artifacts; compute unique-sentence and unique-paragraph ratios.

**Emit** `pssa_passage_repetition_report.csv`: `passageId, title, gradeLevel, wordCount, paragraphCount, uniqueParagraphCount, repeatedParagraphCount, sentenceCount, uniqueSentenceCount, repeatedSentenceCount, uniqueSentenceRatio, repeatedBlocks, result, severity`
Add rules `PSSA_PASSAGE_REPEATED_PARAGRAPH`, `PSSA_PASSAGE_REPEATED_SENTENCE`, `PSSA_PASSAGE_LOW_UNIQUE_SENTENCE_RATIO`, `PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED`.

---

## Phase 2 — Generator root cause (report only, can run in parallel with Phase 1)
Duplicates and padded passages are probably the **same upstream generation bug.** Inspect the generation/import/seed code — don't just rely on the detectors.

Look for logic that: retries and **appends** instead of replacing failed output; loops over standards reusing the same prompt/stem; creates multiple DB records from one generated object; duplicates passages between generated and database pools; fails to dedupe before insert; pads passage length by repeating text; uses deterministic templates with no variation control.

Search terms: `generatePssa`, `PSSA`, `pssaDiagnostic`, `pssaPassage`, `pssaLesson`, `itemGenerator`, `passageGenerator`, `retry`, `append`, `batch`, `seed`, `duplicate`, `upsert`, `createMany`.

**Deliverable** `pssa_generation_root_cause_report.md`: likely source files; suspected bug mechanism; whether the bug is in generation / import / seed / retry / DB insertion; proposed patch plan; whether existing duplicate content should be quarantined before regeneration.
**Report first — do not patch the generator** unless the fix is obvious and safe.

---

## Verification
Check `package.json` first; **create or wire any missing scripts** rather than assuming they exist.
```
npx prisma validate
npx tsc --noEmit
npm run build
npm run content:export-pssa-audit   # create/wire if missing
npm run content:audit-pssa          # create/wire if missing
npm run test:pssa-content           # create/wire if missing
```

## Unit tests to add (this PR only)
1. A set with 90% `correctIndex = 0` (N≥20) fails `PSSA_ANSWER_POSITION_BIAS`; an N<20 subgroup does **not** flag.
2. Two items with the same normalized stem + choices fail duplicate detection.
3. A passage with repeated paragraph blocks fails `PSSA_PASSAGE_REPEATED_PARAGRAPH`.
4. Manifest `totalStandards` ≠ standards CSV rows fails manifest validation.

## Final output required from Codex
1. Files changed.
2. `pssa_field_mapping.md` summary (any missing/renamed fields).
3. New linter rule IDs.
4. New report files produced.
5. Current counts: total items, unique item groups, duplicate item groups, repeated passages, correct-answer distribution summary.
6. Root-cause findings for duplicate/padded generation.
7. Test output.
8. Recommendation: is it safe to proceed to Phase 3+ / regenerate / pilot internally? (Expected answer: not yet — review reports first.)
