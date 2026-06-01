# Content v3 Lesson Gate Mutation Checklist

These one-line mutations must make `npm run test:content-v3` fail. They prove the
PR #36 lesson-generator tests are not tautological.

1. `lessonAudit.ts`: make `LESSON_WARMUP_NO_TODAY_PATTERN` always pass.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, warm-up `"cake"` adversarial case.
2. `lessonAudit.ts`: widen `LESSON_PART3_PSEUDOWORD_COUNT` to accept `pseudowords.length >= 1`.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, three-pseudoword adversarial case.
3. `lessonAudit.ts`: delete or bypass the `rControlled.length === 0` push for `LESSON_PART5_NO_RCONTROLLED`.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, Part 5 `"for"` adversarial case.
4. `lessonAudit.ts`: weaken `YES_NO_STEM` so `Can`, `Would`, or `Has` no longer match.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, full Part 8 yes/no stem list.
5. `pseudowordValidator.ts`: make `validatePseudowordCandidate` always return `valid: true`.
   - Expected failing test: `scripts/test-content-v3-lesson-pipeline.ts` and spec-conformance pseudoword collision cases for `kape`, `drane`, and `brade`.
6. `lessonAudit.ts`: make `LESSON_PART3_REAL_WORD_COUNT` accept 9 real words.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, nine-real-word adversarial case.
7. `lessonAudit.ts`: remove `LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART`.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, `have` tagged as target.
8. `lessonAudit.ts`: remove `LESSON_PART_FIRST_LOOK_REQUIRED` from `evaluateLessonApprovalReadiness`.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, missing first-look blocker case.
9. `lessonAudit.ts`: make `LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED` always pass.
   - Expected failing test: `scripts/test-content-v3-lesson-spec-conformance.ts`, mutated Part 7 unclassified/blocked passage case.
10. `lessonAudit.ts`: allow any Part 8 question count.
    - Expected failing test: `scripts/test-content-v3-lesson-pipeline.ts`, existing Part 8 count and open-ended checks.
