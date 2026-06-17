
Here's the complete amend prompt to paste. First re-save the updated spec to specs/pssa-lesson-metadata-enrichment.md, then paste:

text
Amend WS3-D-pre-0: continue on the existing branch feat/pssa-lesson-metadata-enrichment.
Updated source of truth = specs/pssa-lesson-metadata-enrichment.md (re-read it fully). If missing, STOP and report.

Still metadata-only: NO lesson content, NO schema/migration, NO scoring/report/engine, NO UI, NO bridge implementation.

CHANGE 1 — expand the controlled top-level bridge tag union to 7:
  "key_ideas_evidence" | "craft_structure" | "vocabulary" | "conventions" | "writing_tda" | "foundational_support" | "exclude_from_grade3_bridge"
Only the first four are report-eligible clusters. The other three are in-library-but-excluded from the grade-3 PSSA report bridge.

CHANGE 2 — RE-TAG one already-tagged Table-A lesson (it was tagged vocabulary in the prior commit; change it):
Short and Long Vowel Patterns:
  standardCodes=["CC.1.1.3.D"]
  pssaBridgeTags=["foundational_support","vowel_patterns","phonics"]

CHANGE 3 — add metadata to the 9 generated core grade-3 lessons. Match by EXACT skill string. Apply to the GRADE-3 instances only (a grade-3 skill->tags lookup applied when gradeLevel===3); do NOT touch grades 4-8; no `as any`. Note the TDA skill string is "TDA Evidence and Explanation", not "TDA".

Main Idea:
  standardCodes=["CC.1.2.3.A"]
  pssaBridgeTags=["key_ideas_evidence","main_idea","key_details","central_idea"]
Inference:
  standardCodes=["CC.1.2.3.B","CC.1.3.3.B"]
  pssaBridgeTags=["key_ideas_evidence","inference","text_evidence","prove_answer","unsupported_inference"]
Text Evidence:
  standardCodes=["CC.1.2.3.B","CC.1.3.3.B"]
  pssaBridgeTags=["key_ideas_evidence","text_evidence","cite_evidence","prove_answer"]
Theme:
  standardCodes=["CC.1.3.3.A"]
  pssaBridgeTags=["key_ideas_evidence","theme","central_message","lesson_moral","key_details"]
Point of View:
  standardCodes=["CC.1.2.3.D","CC.1.3.3.D"]
  pssaBridgeTags=["craft_structure","point_of_view","author_point_of_view","narrator","speaker"]
Connotation and Figurative Language:
  standardCodes=["CC.1.2.3.F","CC.1.3.3.F"]
  pssaBridgeTags=["vocabulary","figurative_language","nonliteral_language","word_meaning","literal_nonliteral"]
Pronoun Agreement and Shifts:
  standardCodes=["CC.1.4.3.F"]
  pssaBridgeTags=["exclude_from_grade3_bridge","pronoun_shift","grammar"]
Formal and Informal Style:
  standardCodes=["CC.1.4.3.K"]
  pssaBridgeTags=["exclude_from_grade3_bridge","style","language_use"]
TDA Evidence and Explanation:
  standardCodes=["CC.1.4.3.S"]
  pssaBridgeTags=["writing_tda","text_dependent_analysis","text_evidence","writing"]

CHANGE 4 — update the metadata audit to cover EVERY grade-3 lesson emitted by buildPrebuiltLessonSeeds() (27: literal scopeLesson + generated core) with the new 7-tag set.

ACCEPTANCE:
1. Every grade-3 lesson from buildPrebuiltLessonSeeds() (27) has standardCodes with >=1 entry and pssaBridgeTags with >=1 entry.
2. Each grade-3 lesson has exactly ONE top-level tag: intersect pssaBridgeTags with the 7-tag set and assert size == 1; also assert the first tag is that top tag.
3. Exactly 21 report-eligible lessons, each with one of: key_ideas_evidence (8), craft_structure (5), vocabulary (5), conventions (3).
4. Exactly 6 excluded lessons carry a non-cluster top tag and NO cluster tag:
   - foundational_support (1): Short and Long Vowel Patterns
   - writing_tda (3): Opinion Reasons, Paragraph Organization, TDA Evidence and Explanation
   - exclude_from_grade3_bridge (2): Pronoun Agreement and Shifts, Formal and Informal Style
5. No lesson content changed; existing standardCode retained.
6. Grades 4-8 NOT required to have the new fields; shared generators still work for all grades.
7. No schema/migration/scoring/report/UI changes.
8. The real grade-3 set from buildPrebuiltLessonSeeds() is 27 (else STOP).

RUN:
- npx tsc --noEmit
- the metadata audit test
- PSSA suite if relevant
- confirm no schema/migration diff

STOP and report if: the real grade-3 lesson set differs from 27; a core skill string differs from the list above; tagging would require touching shared generators in a way that affects grades 4-8; any content/schema change appears necessary.

STOP REPORT:
- branch + commit SHA
- files changed (only lib/prebuiltLessonLibrary.ts + test + spec)
- FULL 27-lesson coverage table (skill -> top tag -> standardCodes)
- proof of the 21 report-eligible / 6 excluded split with exact counts (8/5/5/3 and 1/3/2)
- proof Short and Long Vowel Patterns is re-tagged foundational_support (no longer vocabulary)
- proof exactly one top-level tag per grade-3 lesson
- proof the 6 excluded lessons carry no cluster tag
- proof Connotation has no "connotation" tag
- proof no lesson content changed
- proof grades 4-8 untouched
- tsc/test results; no schema/migration diff
When Codex returns the stop report, paste it here and I'll re-audit at source — the 21/6 split, the Vowel-Patterns re-tag, the two excluded conventions lessons carrying no cluster tag, Connotation clean, and grades 4–8 untouched.

