# PSSA Generation Root-Cause Report

Scope: PR #1 Phase 2 investigation only. No generator, import, seed, answer-key, approval, or review-state changes were made.

## Likely Source Files

| File | Role | Finding |
|---|---|---|
| `lib/diagnosticGenerator.ts` | Deterministic PSSA ELA diagnostic generator | Most likely source of padded/repeated passages and answer-position bias. |
| `scripts/seed-pilot-diagnostics.ts` | Seeds generated diagnostics for grades 6-7 | Deletes and reinserts child passages/questions, so it preserves generator output exactly. It is idempotent for fixed pilot IDs but does not dedupe generated content. |
| `app/api/teacher/diagnostic/route.ts` | Creates assigned diagnostics from `generateDiagnosticAssessment()` | Creates a fresh assessment every request, so generated/database pools can contain many copies of identical deterministic diagnostics. |
| `lib/prebuiltLessonLibrary.ts` | Prebuilt lesson library seed/update | Has duplicate-removal support elsewhere, but lesson practice content uses reusable templates and can contribute duplicate practice items. Not the main passage-padding source. |

## Suspected Bug Mechanisms

1. Passage padding is caused by `buildToTarget()` in `lib/diagnosticGenerator.ts`.

The function starts from a small seed array, then repeatedly appends paragraphs from a finite extension bank:

```ts
while (wordCount(paragraphs.join("\n\n")) < target) {
  paragraphs.push(extension[index % extension.length]);
  index += 1;
}
```

For grade-level targets as high as 1,950 words and extension banks of only four or five paragraphs, this necessarily repeats the same paragraphs until the target is reached. `trimToTarget()` then cuts the repeated text at the target. This is generation padding, not a database insert issue.

2. Correct-answer position bias is caused by deterministic templates in `lib/diagnosticGenerator.ts`.

Most single-answer MCQ builders set `correctIndex: 0`. Some conventions fixtures vary the index, but the dominant generated pattern puts the correct answer first.

3. Duplicate generated/database pools are caused by deterministic generation plus repeated persistence.

`generateDiagnosticAssessment(grade)` is deterministic. The export includes generated in-memory diagnostics and database assessments. Any database assessment created from the same generator will match generated content exactly. `app/api/teacher/diagnostic/route.ts` creates a new `Assessment` every request, while `scripts/seed-pilot-diagnostics.ts` reseeds fixed pilot assessments. Neither path dedupes against existing content before insert because they are assignment/seed flows, not content-bank governance flows.

4. Duplicate item stems are also partly template driven.

Several item builders reuse generic stems such as "Which answer best explains..." or fixed TEI prompts across standards/passages. This is expected to create exact duplicates when grade, passage, type, and standard align across generated/database pools.

## Bug Classification

| Area | Classification |
|---|---|
| Passage repetition/padding | Generation bug in deterministic passage expansion. |
| Correct-answer position bias | Generation/template bug in answer-key placement. |
| Generated/database duplicate groups | Generation plus persistence/export composition issue. |
| DB insertion | Not the primary root cause; insert paths preserve generated output and can multiply deterministic copies. |
| Retry/append bug | No LLM retry-and-append path found for PSSA diagnostics; the append behavior is deterministic passage padding. |

## Proposed Patch Plan For Later Phases

1. Quarantine or hide duplicate/padded database assessments before using them for students.
2. Replace `buildToTarget()` padding with grade-specific original passage drafts or a non-repeating expansion strategy that fails closed if unique text is insufficient.
3. Add generator-level answer-position balancing for selected-choice items while preserving answer-key integrity.
4. Add pre-insert duplicate checks for generated assessments created through teacher/admin routes.
5. Update export defaults to separate generated baseline content from database content when auditors need one pool at a time.

## Quarantine Recommendation

Yes. Existing duplicate/padded PSSA diagnostic content should be quarantined or kept internal-only before regeneration or pilot use. Do not proceed to Phase 3+ until the new detector reports have been reviewed.
