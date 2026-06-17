Here's the complete WS3-D-pre-0 prompt with the three guardrails folded in. First save the spec to `specs/pssa-lesson-metadata-enrichment.md`, then paste this:

```text
Implement WS3-D-pre-0: enrich Grade 3 lesson metadata for PSSA assign-from-report.
Single source of truth = specs/pssa-lesson-metadata-enrichment.md. Read it fully first.
If the spec is missing, STOP and report. Do not invent it.

This is a metadata-only patch to the prebuilt lesson library:
- NO lesson content changes
- NO schema/migration changes
- NO scoring/report/engine changes
- NO UI changes
- NO assignment action
- NO bridge implementation yet

BRANCH: feat/pssa-lesson-metadata-enrichment

SCOPE:
1. Update the LessonSeed type in lib/prebuiltLessonLibrary.ts:
   - keep standardCode: string
   - add optional standardCodes?: string[]
   - add optional pssaBridgeTags?: string[]
   If scopeLesson(...) has a SEPARATE input/options type from LessonSeed, add standardCodes?: string[] and pssaBridgeTags?: string[] there too. Keep it additive and local to lib/prebuiltLessonLibrary.ts. Do NOT use `as any` to bypass typing.
2. Add standardCodes and pssaBridgeTags to the 18 Grade 3 lessons only.
3. Add a small Grade-3 lesson-metadata audit test.
4. Commit the spec at specs/pssa-lesson-metadata-enrichment.md.

DO NOT TOUCH: lesson content, prisma schema, migrations, scoring/report/engine modules, UI, grades 4-8 lessons.

CONTROLLED TOP-LEVEL TAGS:
Every Grade 3 lesson must contain exactly ONE top-level bridge tag from:
- key_ideas_evidence
- craft_structure
- vocabulary
- conventions
- writing_tda
Only the first four (the locked WS3-B report clusters) are report-eligible for BOY reading/conventions Diagnostic Insights. writing_tda stays in the library but is excluded from PSSA reading/conventions report suggestions until a future writing/TDA report exists.

GRADE 3 LESSON METADATA TO APPLY:
Capitalization and Titles:
  standardCodes = ["CC.1.4.3.F"]
  pssaBridgeTags = ["conventions","capitalization","titles"]
Commas in a Series:
  standardCodes = ["CC.1.4.3.F"]
  pssaBridgeTags = ["conventions","commas","punctuation","series_commas"]
Complete Sentences:
  standardCodes = ["CC.1.4.3.F"]
  pssaBridgeTags = ["conventions","sentence_formation","complete_sentences"]
Author's Purpose:
  standardCodes = ["CC.1.2.3.D","CC.1.2.3.H"]
  pssaBridgeTags = ["craft_structure","authors_purpose","point_of_view","authors_reasons"]
Cause and Effect:
  standardCodes = ["CC.1.2.3.C"]
  pssaBridgeTags = ["key_ideas_evidence","cause_effect","connections","sequence"]
Compare and Contrast:
  standardCodes = ["CC.1.2.3.I"]
  pssaBridgeTags = ["craft_structure","compare_contrast","paired_text"]
Text Features:
  standardCodes = ["CC.1.2.3.E","CC.1.2.3.G"]
  pssaBridgeTags = ["craft_structure","text_features","graphics","search_tools"]
Character Traits and Actions:
  standardCodes = ["CC.1.3.3.C"]
  pssaBridgeTags = ["key_ideas_evidence","character_traits","character_actions","sequence"]
Poetry Lines and Stanzas:
  standardCodes = ["CC.1.3.3.E"]
  pssaBridgeTags = ["craft_structure","poetry_structure","stanzas","text_parts"]
Sequence of Events:
  standardCodes = ["CC.1.3.3.C"]
  pssaBridgeTags = ["key_ideas_evidence","sequence","events","story_events"]
Story Elements:
  standardCodes = ["CC.1.3.3.C","CC.1.3.3.A"]
  pssaBridgeTags = ["key_ideas_evidence","story_elements","characters","plot","central_message"]
Opinion Reasons:
  standardCodes = ["CC.1.4.3.G","CC.1.4.3.I"]
  pssaBridgeTags = ["writing_tda","opinion_writing","opinion_reasons","writing"]
Paragraph Organization:
  standardCodes = ["CC.1.4.3.J"]
  pssaBridgeTags = ["writing_tda","paragraph_organization","writing_structure","writing"]
Context Clues:
  standardCodes = ["CC.1.2.3.F","CC.1.3.3.F"]
  pssaBridgeTags = ["vocabulary","context_clues","word_meaning","literal_nonliteral"]
Multisyllable Word Parts:
  standardCodes = ["CC.1.1.3.D"]
  pssaBridgeTags = ["vocabulary","word_analysis","multisyllable_words","foundational"]
Prefixes and Suffixes:
  standardCodes = ["CC.1.1.3.D","CC.1.2.3.F"]
  pssaBridgeTags = ["vocabulary","prefixes_suffixes","word_parts","morphology"]
Short and Long Vowel Patterns:
  standardCodes = ["CC.1.1.3.D"]
  pssaBridgeTags = ["vocabulary","phonics","vowel_patterns","foundational"]
Synonyms and Antonyms:
  standardCodes = ["CC.1.2.3.F","CC.1.3.3.F"]
  pssaBridgeTags = ["vocabulary","word_relationships","synonyms_antonyms","shades_of_meaning"]

AUDIT / ACCEPTANCE (Grade 3 ONLY — do NOT require these fields on grades 4-8):
1. All 18 Grade 3 lessons have standardCodes with at least one entry.
2. All 18 Grade 3 lessons have pssaBridgeTags with at least one entry.
3. Each Grade 3 lesson has EXACTLY ONE top-level bridge tag — verify by intersecting pssaBridgeTags with {key_ideas_evidence, craft_structure, vocabulary, conventions, writing_tda} and asserting the intersection size is exactly 1 (do NOT rely only on the first array element). Also assert the first tag IS that top-level tag.
4. The two writing lessons (Opinion Reasons, Paragraph Organization) have top-level tag writing_tda and NONE of the four report-cluster tags.
5. The 16 report-eligible Grade 3 lessons each carry exactly one of: key_ideas_evidence, craft_structure, vocabulary, conventions.
6. No lesson content changed.
7. Existing standardCode remains present for backward compatibility.
8. No schema/migration/scoring/report/UI changes.
9. Audit output deterministic.
10. The real Grade 3 lesson list equals the 18 in the spec (else STOP).

RUN:
- npx tsc --noEmit
- existing lesson/content tests if present
- PSSA suite if relevant
- confirm no schema/migration diff

STOP and report if:
- LessonSeed (or scopeLesson input) shape makes additive fields unsafe
- any existing code assumes standardCodes/pssaBridgeTags cannot exist
- adding these fields requires schema/migration changes
- any lesson content would need to change
- the real Grade 3 lesson list differs from the 18 listed

STOP REPORT:
- branch + commit SHA
- files changed (confirm only lib/prebuiltLessonLibrary.ts + test + spec)
- exact Grade 3 metadata coverage table (18 lessons)
- proof each Grade 3 lesson has exactly one top-level bridge tag (by set intersection)
- proof writing_tda lessons carry no report-cluster tag
- proof standardCode retained
- proof no lesson content changed
- proof grades 4-8 not required to have the new fields
- tsc/test results; no schema/migration diff
```

That's the whole paste. When Codex returns the stop report, paste it here and I'll audit at source — confirming only the library file + test changed, the additive fields landed safely (on `LessonSeed` and any `scopeLesson` input type, no `as any`), all 18 lessons carry exactly one top-level tag, the two writing lessons are walled off from the reading clusters, and `standardCode` is retained.