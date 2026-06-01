# PSSA PR #4 — Grade 6 Tranche 1 Fixes (do not scale yet)

The Grade 6 tranche is structurally strong — EC alignment exact, answer-position balanced, passages clean, governance correct, TDA rubrics item-specific. Independent audit found one systematic flaw plus a minor one. Fix the Grade 6 tranche only, add the linter gates, re-export the four packet files, and STOP for re-review. Do not generate other grades until the corrected tranche is approved.

## Issue 1 — Correct-answer length bias (must fix)
In 9 of 13 MCQs the correct answer is the single longest choice (69%; chance ≈ 25%). This is an exploitable test-taking cue, the same class of problem as the old answer-A bias.

Revise answer choices so length does not signal correctness — lengthen distractors and/or tighten correct answers. Do NOT pad distractors with filler or make them silly; balance must come from cleaner wording. Within each item, the four choices should be roughly comparable in length and specificity.

Target after revision: the correct answer is the single longest choice in ≤ 35% of the tranche's MCQs.

## Issue 2 — Absolute-language distractors (must fix)
Two non-correct distractors use the absolute term "every":
- `seed_mcq_02` choice B
- `seed_mcq_03` choice C

Reword them as plausible wrong-emphasis / partial-understanding distractors, with no absolute terms (never, always, only, every, all, none, must, cannot).

## Add hard linter gates (so this cannot recur at scale)

### PSSA_MCQ_CORRECT_IS_LONGEST
- Per item — **blocker**: fail if the correct choice is the single longest by **2+ words OR 15%+ character length**.
- Per item — **warning**: warn if the correct choice is the single longest by **only 1 word**.
- Per batch — **blocker**: fail if the correct choice is the single longest in **more than 35%** of MCQs.

### PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR
- Fail if a **non-correct** choice contains any of: never, always, only, every, all, none, must, cannot (word-boundary matching, so substrings like "generally" or "alloy" do not false-trigger).
- If the **correct** answer contains one of these terms because the passage genuinely supports it, flag for **human review** rather than auto-rejecting.

## Tests to add
- A batch where the correct answer is longest in 70% of MCQs → fails the batch blocker.
- A batch where the correct answer is longest in ≤ 35% of MCQs → passes.
- A single item where the correct answer is longest by 2+ words → fails (blocker).
- A single item where the correct answer is longest by 1 word → warns (not blocker).
- A distractor containing "every" → fails.
- A distractor containing "never" → fails.
- A revised wrong-emphasis distractor with no absolute language → passes.
- Word-boundary check: "generally" / "alloy" in a distractor → does NOT trigger.

## Re-export (keep PENDING)
Re-export all four, every item at `reviewStatus = PENDING`, `itemStatus = candidate`:
- `exemplars/pssa_grade6_tranche1/tranche1_student_preview.md`
- `exemplars/pssa_grade6_tranche1/tranche1_backend.json`
- `exemplars/pssa_grade6_tranche1/tranche1_answer_key_and_rubric.md`
- `exemplars/pssa_grade6_tranche1/tranche1_audit_report.md`

The audit report must now show:
- correct-answer-longest rate: ≤ 35% of MCQs (and per-item blocker/warning counts)
- absolute-language distractors: 0
- answer-position distribution: still balanced (no position > 40%)
- EC alignment: still exact for all 16
- passages: still clean (no repetition/padding)
- student preview: no answers, rationales, or rubric

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
```

## Stop
Report the corrected length distribution, the two reworded distractors, and test results. Do not generate additional grades or scale to ~40/grade until the corrected tranche is re-reviewed.
