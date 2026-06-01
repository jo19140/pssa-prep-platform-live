# PSSA Legacy Lesson Audit — Detector-First, Read-Only

## Goal

Audit the created V2 PSSA lessons against the current canonical PSSA
passage / item / lesson guardrails before deciding reuse, repair,
re-authoring, or deprecation.

**This is an audit-only spec.**

- Do not activate legacy lessons.
- Do not import lessons into student-ready flows.
- Do not approve lessons.
- Do not mutate lesson content.
- Do not rewrite passages / items.
- Do not write to the DB.
- File-only reports. Commit results to a branch for review.

## Context

The state-track archive branches (see `STATE_TRACK_ROADMAP.md`) contain
substantial PSSA work, including a V2 lesson generator, TEI player
components, TEI scoring, essay grading, audit / regeneration scripts,
and 6 vetted V2 sample lessons in `audit/v2-samples/`.

Those branches are **active future work**, not deprecated. However,
current `main`'s #4j–#4o contracts and gates are canonical, and the
active product surfaces on `main` (test tool, student reports, mockups)
are also canonical. Archive lessons must adapt to both; they do not
override either.

## Scope

Inventory and audit all available legacy PSSA lessons from:

- `audit/v2-samples/*.json` (on `state-track/pssa-v2-lessons-and-tei-player`)
- Prebuilt lesson library exports, if present
- Any V2 lesson fixtures or generated lesson JSONs
- Any DB-exported lesson bundle available in the repo

If a lesson source is inaccessible, report it as `MISSING_SOURCE` rather
than guessing.

## Lesson status

Every legacy lesson starts as:

`legacyStatus = QUARANTINED_REFERENCE_ONLY`

**No legacy lesson may become active / student-ready in this PR.**

## Reports

### 1. Inventory — `pssa_legacy_lesson_inventory.csv`

Columns: `lessonId`, `title`, `grade`, `sourceFile`, `sourceBranch`,
`lessonType`, `passageCount`, `itemCount`, `interactionTypes`,
`hasShortAnswer`, `hasTDA`, `hasMedia`, `hasAudio`, `standardsOrECs`,
`status`, `notes`.

### 2. Canonical mapping — `pssa_legacy_lesson_contract_mapping.csv`

For each lesson and embedded item: `lessonId`, `embeddedItemId`,
`legacyItemType`, `mappedInteractionType`, `mappedInteractionSubtype`,
`mappingResult` (`PASS | WARN | FAIL`), `mappingNotes`.

Map to canonical interaction types: `MCQ`, `EBSR`, `MULTI_SELECT`,
`INLINE_DROPDOWN`, `MATCHING_GRID`, `HOT_TEXT`, `DRAG_DROP`,
`SHORT_ANSWER`, `TDA`.

### 3. Passage audit — `pssa_legacy_lesson_passage_audit.csv`

For every embedded passage, run:

- `PSSA_PASSAGE_CROSS_DUPLICATE`
- `PSSA_PASSAGE_TEMPLATE_SKELETON`
- `PSSA_PASSAGE_TOPIC_COHERENCE`
- `PSSA_PASSAGE_CONCRETENESS`

Columns: `lessonId`, `passageId`, `title`, `grade`, `wordCount`,
`crossDuplicateResult`, `templateSkeletonResult`, `topicCoherenceResult`,
`concretenessResult`, `finalPassageResult`, `notes`.

### 4. Item audit — `pssa_legacy_lesson_item_audit.csv`

For every embedded item, run the canonical gates for its mapped type.

**Universal item gates:** `responseSpec` / schema validity,
`correctResponse` validity, instruction matches response, scoring
validity, source / license compliance, EC validity,
`PSSA_ITEM_EC_SKILL_MISMATCH`, preview renderability, preview leak check.

**For passage-based items:** evidence spans verbatim; answerable only
from assigned passage; no general-knowledge shortcut; no title-only
shortcut; no old templated passage evidence.

**For selected-response / TEI items:** exactly one correct where
single-answer; no extra correct option / span / cell / token; no
unsupported correct option; no equally valid unmarked option;
partial-credit rules explicit; batch-level surface shortcut checks.

**For Short Answer:** prompt requires text support; expected-answer
components valid; support sufficiency; copied-text cap; score-band
examples; no auto-scoring claim unless separately calibrated.

**For TDA:** analytic prompt, not summary / opinion-only; text evidence
requirement; structure / analysis rubric dimensions; writer checklist;
no auto-scoring claim unless separately calibrated.

Columns: `lessonId`, `itemId`, `grade`, `legacyItemType`,
`mappedInteractionType`, `eligibleContent`, `skillMatchResult`,
`groundingResult`, `sourceComplianceResult`, `scoringResult`,
`surfaceShortcutResult`, `previewLeakResult`, `finalItemResult`, `notes`.

### 5. Lesson-level audit — `pssa_legacy_lesson_level_audit.csv`

Lesson-specific gates:

- `PSSA_LESSON_SCHEMA_VALID` — required metadata, grade, objective,
  passage / item references, scoring, review status.
- `PSSA_LESSON_OBJECTIVE_EC_MATCH` — lesson objective matches the ECs
  actually practiced and assessed.
- `PSSA_LESSON_SEQUENCE_COHERENCE` — flow is coherent: introduction →
  instruction / model → practice → assessment / response.
- `PSSA_LESSON_SCAFFOLDING_VALID` — scaffolding helps without giving
  away answers.
- `PSSA_LESSON_PRACTICE_ALIGNED` — practice aligns with objective and
  target ECs.
- `PSSA_LESSON_FEEDBACK_VALID` — feedback / rationales explain the
  skill, don't contradict passage or key.
- `PSSA_LESSON_NO_ANSWER_LEAK` — student-facing text, HTML, data
  attributes, audio scripts, captions, and preview source do not reveal
  keys / rationales / internal metadata.
- `PSSA_LESSON_MEDIA_RELEVANCE` — images / audio / video support the
  lesson without introducing unsupported facts or distracting from
  the skill.
- `PSSA_LESSON_MEDIA_SOURCE_COMPLIANCE` — media prompts, captions, alt
  text, scripts pass the no-copy / source compliance scan.
- `PSSA_LESSON_TEI_RENDERABLE` — embedded TEI surfaces render under the
  current `responseSpec` and the active student test player or have a
  clear adapter gap.
- `PSSA_LESSON_SCORE_MODEL_VALID` — lesson scoring aggregates embedded
  items correctly; doesn't confuse item pool points with active form
  points.
- `PSSA_LESSON_GOVERNANCE_COMPATIBLE` — lesson cannot be approved
  unless all embedded passages / items and lesson-level gates pass.

Columns: `lessonId`, `title`, `grade`, `objective`, `lessonSchemaResult`,
`objectiveEcMatchResult`, `sequenceCoherenceResult`,
`scaffoldingResult`, `practiceAlignmentResult`, `feedbackResult`,
`answerLeakResult`, `mediaRelevanceResult`,
`mediaSourceComplianceResult`, `teiRenderableResult`,
`scoreModelResult`, `governanceCompatibilityResult`, `finalLessonResult`,
`recommendedDisposition`, `notes`.

### 6. Disposition summary — `pssa_legacy_lesson_disposition_summary.csv`

For each lesson, assign one disposition:

- `PASS_REUSABLE` — Lesson and embedded content pass current gates.
  Still not student-ready until governance / schema integration allows
  activation.
- `REPAIRABLE` — Lesson structure useful but has fixable issues (minor
  metadata, mapping, preview, or scoring problems).
- `REAUTHOR_CONTENT` — Infrastructure / format useful, but passages /
  items fail current content gates and should be re-authored.
- `INFRA_ONLY` — Lesson itself should not be reused, but renderer /
  scoring / generator patterns are useful.
- `DEPRECATE_OR_QUARANTINE` — Lesson is too far from current contracts
  or contains content that should not be repaired.

## Acceptance

- All legacy lessons inventoried.
- All embedded passages audited against the four passage gates.
- All embedded items mapped to canonical `interactionType` or marked
  `UNMAPPABLE`.
- All embedded items audited against current item gates where mappable.
- Source-compliance scan runs over lesson, passage, item, feedback,
  media / caption / alt text, and preview fields.
- Student-preview leak check runs over lesson-level previews / source.
- No legacy lesson activated, imported, approved, or mutated.
- All six reports generated.

## Stop report

At end of run, print: total lessons found; lessons by grade; item-type
distribution; passage PASS / WARN / FAIL counts; item PASS / WARN /
FAIL counts; lesson-level PASS / WARN / FAIL counts; unmappable legacy
item types; source-compliance findings; preview-leak findings; media
findings; recommended dispositions distribution; promising-for-reuse
list; quarantine/deprecate list; confirmation that no lesson was
activated / imported / approved / mutated.

## Decision rule (post-audit)

- Lesson passes everything → migration candidate, not automatic
  student-ready.
- Lesson structure good, embedded content fails → keep structure,
  re-author content.
- Lesson only gives useful UI / scoring / generator ideas → mark
  `INFRA_ONLY`.
- Too far from new contracts → quarantine / deprecate.

## Scheduling

Spec ships in PR A as a read-only document. Audit run scheduled
post-#4o per the resume conditions in `STATE_TRACK_ROADMAP.md`. A
pre-PR-A reconnaissance run was performed on branch
`recon/pssa-legacy-lesson-audit-pre-pr-a`; its reports are provisional
and superseded by the audit-of-record rerun once v2-samples are
reachable on `state-track/pssa-v2-lessons-and-tei-player`.

---

*Last updated: 2026-06-01.*
