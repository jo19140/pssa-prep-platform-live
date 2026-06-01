# Content v3 PR #36 — Lesson Part Generators (Implementation step 13)

Vertical slice. **Phase 3 Entry / `a_e` only.** Build all 8 lesson-part generators end-to-end for one `(phasePosition, dailyTarget)` pair as the verified reference implementation, then the loop replicates to the other Phase 3 Entry targets and later phases in follow-up PRs. Backend content generation + validators + persistence + AI first-look + one CLI script + tests. **No student-facing lesson UI** (that is step 15 / a later PR). **No new prisma models** — the schema already exists. File + DB-write (candidate `PENDING` rows) only. Commit.

> Companion sign-off artifact: `specs/pr36-lesson-EXEMPLAR-phase3-a_e.md`. That worked lesson is the concrete output target. Codex's generators must produce a `Lesson` + 8 `LessonPart` rows that match its shape and pass every gate listed there.

> **For Codex — use this 2026-06-01 spec + exemplar pair only.** Ignore any older PR #36 draft that still mentions L5 / an inflection line, a 25-word warm-up, "heartWords must equal Part 7," `are`/`for` in the lesson, closed-base words in `conceptExamples`, or an open kid-label question. Those were superseded.

---

## Rule 0 — inherit the passage pipeline's discipline (do not reinvent it)

PR #34 (passage generation) and PR #35 (passage review queue) already established the pattern this PR extends. **Reuse, do not duplicate:**

- Word classification + pattern matching: `lib/literacy/passageClassifier.ts` (`classifyPassageWords`, `wordMatchesPattern`, `WordCategory`).
- Audit/quality primitives: `lib/literacy/passageAudit.ts` (`patternCodesFromDailyTarget`, `phaseWordCountBand`, `decodabilityThresholdForPhase`), `lib/literacy/passageQualityAudit.ts` (`runPassageQualityAudit`).
- AI first-look: `lib/content/aiFirstLookReviewer.ts` (`runAIFirstLookReview`, `firstLookReviewToJson`) + the **already-defined** `lessonPartChecklist` in `lib/content/firstLookChecklists/index.ts`.
- Lesson lint/audit helpers: `lib/content/lessonMetadata.ts` (`runLessonLinter`, `auditLessonForApproval`, `deriveLessonMetadata`, `deriveLessonPartMetadata`). **These already encode field-name contracts the generator must satisfy — see "Required `contentJson` field names" below.**
- LLM instrumentation: `lib/decisions/withModelDecisionLogging.ts` (`recordModelDecision`) + `DECISION_TYPES.LESSON_GENERATION` (already exists).
- Approval-readiness gate pattern: mirror `lib/literacy/passageApproval.ts` (`evaluatePassageApprovalReadiness`) with a new `evaluateLessonApprovalReadiness`.

**A valid-looking 8-part lesson is not enough.** The lesson inherits the same gate stack passages carry: every word classifiable into target / prerequisite / heart / vocabulary; zero unclassified; zero blocked-pattern violations; pseudowords clean; transfer chain intact; kid-view copy linter-clean; every generation logged as a `ModelDecision`.

## Preconditions (stop and report if any is missing)

1. `prisma/schema.prisma` contains `Lesson`, `LessonPart`, `DailyTarget`, `PhasePosition`, `Passage`, `DailyTargetMastery` (migration `20260527090000_add_content_v3_foundation` applied). Confirm `LessonPart` has `@@unique([lessonId, partNumber])`.
2. Phase 3 Entry is seeded: `DailyTarget` `code = "a_e"` exists with `reviewStatus = APPROVED` (`scripts/content/seed-phase3-entry.ts`).
3. **At least one `Passage` with `phasePositionId =` Phase 3 Entry AND `reviewStatus = APPROVED` AND a content audit reporting the `a_e` daily target exists in the pool.** This PR *selects* a Part 7 passage from PR #35's approved pool — it does not generate one. If the pool has zero approved Phase 3 a_e passages, **stop and report**: generate + approve passages first (`npm run content:generate-passages -- --phase-position "Phase 3 Entry" --daily-target a_e`, then approve via the queue). Do not silently fabricate a passage inside the lesson generator.
4. `DECISION_TYPES.LESSON_GENERATION` exists. `lessonPartChecklist` exists in the first-look index.
5. **Known dangling scripts — do not import from them.** `package.json` registers `content:audit-lessons` → `scripts/content/audit-lessons.ts` and `content:backfill-lesson-metadata` → `scripts/content/backfill-lesson-metadata.ts`, but **neither file currently exists** (lost in the same version-control event the `lessonMetadata.ts` header documents). Codex must not assume they exist. The lesson-audit logic lives in `lib/content/lessonMetadata.ts` (which does exist). If a CLI audit entrypoint is wanted, (re)create `scripts/content/audit-lessons.ts` as a thin wrapper over `auditLessonForApproval` — but that is optional for this PR and must not block lesson generation.

## Goal

A deterministic-where-possible, LLM-where-necessary generator that, given `(phasePositionId, dailyTargetId)`, produces one candidate `Lesson` with 8 `LessonPart` rows (`reviewStatus = "PENDING"`), each part's `contentJson` / `kidVisibleCopy` / `tutorVisibleCopy` populated, every word tagged, the Part 7 passage selected from the approved pool and re-audited against this lesson's daily target, the whole lesson run through the AI first-look reviewer, and every model call logged. The lesson is then reviewable by the same human-review pattern PR #35 built for passages (the review **queue UI** for lessons is step 14 / a later PR — this PR stops at producing audited `PENDING` lessons + the programmatic approval-readiness gate).

## Scope & count (this PR)

- Exactly **one daily target: `a_e`** (Phase 3 Entry). One reference `Lesson`.
- All **8 part-generators**, each independently gated.
- One CLI: `scripts/content/generate-lessons.ts` (mirrors `generate-passages.ts`, supports `--mock-model` so tests run without an API key).
- One programmatic gate: `lib/literacy/lessonApproval.ts`.
- Tests: `scripts/test-content-v3-lesson-pipeline.ts`, wired into `npm run test:content-v3`.
- **Out of scope:** other daily targets, other phases, Track B morphology generation, the lesson review queue UI, the student lesson runtime, re-teach runtime, autopilot. Build the generators target-parameterized internally (read everything from the `DailyTarget` row, hardcode nothing about `a_e`) so the replicate-loop is a data change, not a code change — but **only `a_e` is generated and tested in this PR.**

## Architecture (new files)

```
lib/literacy/
  lessonGenerator.ts          # orchestrates the 8 part-generators for a (phasePosition, dailyTarget)
  lessonParts/
    part1Warmup.ts            # cumulative code review (NO target pattern)
    part2Concept.ts           # explicit target instruction
    part3Decoding.ts          # contrastive word lines + pseudowords
    part4HeartVocab.ts        # heart-word preview + vocabulary
    part5Sentences.ts         # sentence-level application
    part6Encoding.ts          # dictation words + sentences
    part7ConnectedText.ts     # SELECTS an approved passage + re-audits
    part8Comprehension.ts     # open-ended discussion questions
  lessonAudit.ts              # per-part + whole-lesson mechanical audit (wraps lessonMetadata helpers)
  lessonApproval.ts           # evaluateLessonApprovalReadiness (mirror passageApproval.ts)
  pseudowordValidator.ts      # shared: a_e-only, phonotactic, reject real-word homophones
lib/content/lessonPartGenerators/
  prompts.ts                  # per-part prompt builders + promptKeys (LLM parts only)
scripts/content/
  generate-lessons.ts         # CLI, --mock-model supported
scripts/
  test-content-v3-lesson-pipeline.ts
```

Parts 1, 3 (real-word lines), 4 (word selection), 6 are **primarily deterministic** — assembled from the `DailyTarget` pattern codes + the classified word inventory, with the LLM used only for natural-language framing copy. Parts 2 (concept phrasing), 5 (sentences), 7 (passage is pre-generated; only the framing is new), 8 (questions) lean on the LLM but every output is **re-classified and gated** before it can be stored. Where the LLM is used, wrap it in `recordModelDecision({ decisionType: DECISION_TYPES.LESSON_GENERATION, ... })` with a stable `promptKey` and structured `inputContext` (phase number, daily target code, part number — never the filled prompt or PII).

## Required `contentJson` field names (contract with existing helpers — do not rename)

`lib/content/lessonMetadata.ts` already reads specific keys. The generator MUST populate them or the existing linter fails:

| Part | Required `contentJson` keys | Read by |
|---|---|---|
| 1 | `warmupWords: string[]` | `runLessonLinter` → `LESSON_WARMUP_NO_TODAY_PATTERN` (BLOCKER) |
| 2 | `conceptExamples: string[]` | same check (warmup ∩ conceptExamples must be ∅) |
| 6 | `dictatedWords: string[]` (≥ 6) | `runLessonLinter` → `LESSON_ENCODING_MINIMUM_ITEMS` (BLOCKER) |
| 7 | `contentAuditJson` with `words[]`, `unclassifiedCount`, `heartWordsUsedInConnectedText: string[]` | `auditLessonForApproval` → `LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED`, `LESSON_HEART_WORDS_PREVIEWED` |
| 4 | `heartWordsPreviewedThisLesson: string[]`, `heartWordsAssumedKnown: string[]` | `LESSON_HEART_WORDS_PREVIEWED` cross-check (bucketed — see Part 4) |

Beyond these, each part also carries `wordTagsJson` (every word → `{category, matchedPattern?}`) so the per-part audit is mechanical, plus the two copy fields (`kidVisibleCopy`, `tutorVisibleCopy`) and `designNotes`. Extend `lessonMetadata.ts` checks where noted below, but **keep existing rule IDs and field names stable** — other tests depend on them.

## Per-part generator contracts + gates

All gates are BLOCKERs unless marked. Every gate failure pushes a stable rule code so the audit/test layer can pattern-match.

### Part 1 — Warm-up (cumulative code review)
- **Input:** `dailyTarget.allowedPatternCodes`, prior-phase closed-syllable inventory.
- **Output:** `warmupWords` (10–15), all tagged `prerequisite`; kid label `"Warm-up"`.
- **Gates:** `LESSON_PART1_NO_TARGET_PATTERN` — zero words match any `targetPatternCodes(dailyTarget)` (reuse `wordMatchesPattern`); `LESSON_PART1_ALL_PREREQUISITE` — every word classifies as `prerequisite` (no `unclassified`, no `target`). Aligns with first-look `PART1_NO_TARGET_PATTERN`.

### Part 2 — Explicit target instruction
- **Output:** `conceptStatement` (kid-view, plain language — "the a says its name — ay" with an **em-dash, never a slash**; **never** `/eɪ/`), `conceptExamples` (3–5, **target-pattern words only** — e.g. `["cape","ate","mane","tape","hate"]`), and `demonstrationPairs` (closed-base → a_e minimal pairs, e.g. `["cap","cape"]`).
- **Field discipline (load-bearing):** `runLessonLinter` intersects `warmupWords` with `conceptExamples` to catch today's-target leakage into the warm-up. Therefore `conceptExamples` must contain **only target-pattern words**; the closed-base contrast words (`cap`, `at`, `man`, …) live in `demonstrationPairs`, never in `conceptExamples`, or the linter false-flags.
- **Gates:** `LESSON_PART2_SINGLE_CONCEPT` — exactly one target concept (the daily target); `LESSON_PART2_DEMO_MINIMAL_PAIRS` — each demo pair is `(prerequisite closed base, target a_e word)` differing only by silent-e; `LESSON_KIDVIEW_NO_NOTATION` — `kidVisibleCopy` passes the §5.12 linter (no slashes, macrons, breves, IPA). Phoneme notation allowed only in `tutorVisibleCopy`.

### Part 3 — Word-level decoding (contrastive lines)
- **Output:** required lines L1–L4 per §5.4. L1 target-isolation (4–5), L2 minimal-pair contrast (target vs. recently-taught), L3 cumulative review + target sprinkle, L4 pseudowords (8–10). `wordTagsJson` tags every token. **L5 inflection is DEFERRED** to a later morphology PR (resolved Open Question 3): Track B morphology is out of scope for #36, so do not generate an inflection line in v1.
- **Counting rule:** `LESSON_PART3_REAL_WORD_COUNT` counts **L1–L3 only** (target = 15–20 real words). Pseudowords (L4) are counted separately by `LESSON_PART3_PSEUDOWORD_COUNT` (8–10). With L5 deferred there is no third count to reconcile.
- **Gates:** `LESSON_PART3_CONTRASTIVE_STRUCTURE` — L1–L4 present, each line's category profile correct, **no L5 present in v1**; `LESSON_PART3_REAL_WORD_COUNT` (L1–L3 = 15–20) + `LESSON_PART3_PSEUDOWORD_COUNT` (L4 = 8–10); `LESSON_PART3_PSEUDOWORD_CLEAN` — every pseudoword passes `pseudowordValidator` (see below). Aligns with first-look `PART3_CONTRASTIVE_STRUCTURE`, `PART3_PSEUDOWORD_CLEAN`.

### Part 4 — Heart words + vocabulary
- **Heart words are tracked in three buckets** (resolves the earlier "MUST equal" vs. "subset" contradiction):
  - `heartWordsPreviewedThisLesson: string[]` — newly previewed today (3–5; high-frequency irregular from `HighFrequencyWord` where `isRegular = false` and `introducedAtPhase ≤ phaseNumber`).
  - `heartWordsAssumedKnown: string[]` — canonical HFW assumed mastered from prior lessons (e.g. `a`, `the`, `to`, `I`); **not** re-previewed every lesson.
  - `heartWordsUsedInConnectedText: string[]` — derived from the Part 7 audit (the heart words actually in the story).
- Plus 2–3 `vocabulary` items — **meaning-preview words, stored in `contentJson.vocabulary` (or `semanticRole: "vocabulary"`).** If a vocabulary-preview word is fully decodable under `allowedPatternCodes` (e.g. `gift`, `pal`), its `WordAudit.category` stays whatever the shared classifier assigns (`prerequisite`) — do **not** force decodable words into `WordAudit.category = "vocabulary"`. The "vocabulary" role and the `WordAudit.category` are separate axes; only genuinely non-decodable meaning words would carry `WordAudit.category = "vocabulary"`.
- **The gate** (`LESSON_HEART_WORDS_PREVIEWED`, existing, reused — extend its body to the bucketed form): `heartWordsUsedInConnectedText \ heartWordsAssumedKnown ⊆ heartWordsPreviewedThisLesson`. Do **not** require previewing every canonical HFW (`a`, `the`, `to`, `I`) in every lesson. **For PR #36 shared pre-generated lessons, `heartWordsAssumedKnown` is the canonical always-known HFW set — nothing student-specific.** Per-student HFW mastery checks belong later, at assignment/delivery time, and must not affect shared lesson generation.
- **Other gates:** `LESSON_PART4_HEART_COUNT` — `heartWordsPreviewedThisLesson` is 3–5; `LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART` — any silent-e *exception* word (short-vowel VCe: `have, give, live, come, some, done, gone, love`) appearing anywhere in the lesson is tagged `heart`, never `target` (the classifier's a_e regex matches `have` — this gate prevents mis-decoding; resolves Open Question 2).

### Part 5 — Sentence-level reading
- **Output:** 5–8 sentences, 4–12 words each; every word is `target` / `prerequisite` / previewed-or-assumed-known `heart` / allowed vocabulary-preview word (matching the exemplar's use of assumed-known `a`, `the`, `to`, `I`).
- **Gates:** `LESSON_PART5_SENTENCE_COUNT` (5–8) + `LESSON_PART5_SENTENCE_LENGTH` (4–12 words); `LESSON_PART5_ALL_CLASSIFIED` — zero `unclassified`, zero blocked-pattern violations (reuse `classifyPassageWords` per sentence); `LESSON_PART5_NO_RCONTROLLED` — no r-controlled vowels at Phase 3 Entry (exclude `for, or, ar, er, ir, ur` words; see Open Question 4).

### Part 6 — Encoding / dictation
- **Output:** `dictatedWords` (≥ 6, mix target + prerequisite), `dictatedSentences` (≥ 2, target-loaded).
- **Gates:** `LESSON_ENCODING_MINIMUM_ITEMS` (existing, reused, ≥ 6 words); `LESSON_PART6_DICTATION_TARGET_REVIEW` — includes ≥ 1 target word AND ≥ 1 prerequisite review word AND ≥ 2 sentences. Aligns with first-look `DICTATION_TARGET_REVIEW`.

### Part 7 — Connected text (SELECT from approved pool, re-audit)
- **Fixture boundary (do not violate):** the Part 7 passage in the exemplar is a **test fixture representing an already-approved `Passage` row**. The generator **selects** it from the approved pool and **re-audits** it; it must **never** create, generate, or hardcode connected-text inline. Tests seed an approved Phase 3 a_e `Passage` and assert the generator picks it.
- **Behavior:** Query `Passage` where `phasePositionId = lesson.phasePositionId AND reviewStatus = "APPROVED" AND retiredAt = null` and whose stored audit names this `dailyTarget`. Pick one (deterministic: highest `decodabilityScore`, tie-break lowest `id`; record the choice — resolves Open Question 5). Set `Lesson.passageId`. **Re-run `auditPassage` against THIS lesson's daily target** (a passage approved for the pool must still be re-verified against the specific target's `blockedPatternCodes`). Emit `heartWordsUsedInConnectedText` from the re-audit for the Part 4 bucket gate.
- **Output:** `contentJson.passageId`, `contentJson.contentAuditJson` (the re-audit), `heartWordsUsedInConnectedText`, `connectedTextMode` capability flags (`INDEPENDENT` / `ASSISTED` per §5.10 — flags only; runtime scoring is a later PR).
- **Single category per token:** each `WordAudit` token has exactly one `category`. Classifier precedence (already in `classifyPassageWords`) checks the heart set first, so canonical HFW (`a`, `the`, `to`, `I`) classify as `heart`, never also `prerequisite`. Audit summaries must not list a token under two categories.
- **Gates:** `LESSON_PART7_PASSAGE_APPROVED` — selected passage is APPROVED + not retired; `LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED` (existing, reused) — re-audit `unclassifiedCount === 0`; `LESSON_PART7_NO_BLOCKED_PATTERNS` — re-audit `blockedPatternViolations` empty against this target; `LESSON_PART7_DECODABILITY_THRESHOLD` — `decodabilityScore ≥ decodabilityThresholdForPhase(phaseNumber)`. If no approved passage qualifies → fail this lesson with `LESSON_PART7_NO_APPROVED_PASSAGE` and skip (do not generate text inline).

### Part 8 — Comprehension & language extension
- **Output:** 3–5 questions, kid label `"Talk about it"`.
- **Gates:** `LESSON_PART8_QUESTION_COUNT` (3–5); `LESSON_PART8_OPEN_ENDED` — reject any question whose first token is a yes/no auxiliary/copula: `Did, Do, Does, Is, Was, Were, Are, Am, Can, Could, Will, Would, Should, Has, Have, Had, May, Might` (case-insensitive, word-boundary anchored); ≥ 1 retell/recall + ≥ 1 language-extension question. Aligns with first-look `OPEN_ENDED_DISCUSSION` (INFO → raise to WARNING here).

### Whole-lesson gates (in `lessonAudit.ts` + `lessonApproval.ts`)
- `LESSON_EIGHT_PARTS_ORDERED` — exactly parts 1–8, unique `partNumber`, prescribed order.
- `LESSON_TRANSFER_CHAIN_INTACT` (§5.2) — parts present for: read words (3) → read sentences (5) → spell (6) → connected text (7) → discuss (8). Missing any → BLOCKER.
- `LESSON_KIDVIEW_LINTER_CLEAN` — every part's `kidVisibleCopy` passes the §5.12 linter (no phoneme notation, no phase/position/framework codes, no curriculum-metadata phrases, no scoring labels). **RESOLVED kid-label rule (per §5.12, do not re-litigate):** the linter **allows `a_e` only when it appears as the `DailyTarget.kidVisibleLabel`/lesson title** (e.g. "New thing to learn: a_e words"). It must still reject phoneme notation, slash notation, macrons, phase/position/framework codes (`Phase 3 Entry`, `PA_PSSA_ELA`, `closed_short_a`), and design metadata anywhere in kid view. Aligns with first-look `NO_KID_METADATA`, `NO_INTERNAL_LABELS`, `TUTOR_COPY_SEPARATED`.
- `LESSON_PART_FIRST_LOOK_REQUIRED` — every `LessonPart` must carry a non-null `firstLookReviewModelDecisionId`. If any part lacks it (first-look never ran or failed to persist), the lesson can **never** become ready-to-serve. Mirrors PR #35's strictness about stale/missing first-look on passages.
- `evaluateLessonApprovalReadiness(lesson)` returns `{ approvable, blockers[] }` — mirror `evaluatePassageApprovalReadiness`, and include `LESSON_PART_FIRST_LOOK_REQUIRED` in the blocker set. A human reviewer (later PR) cannot approve while `blockers` is non-empty; the approve button is disabled, exactly like passages.

## Pseudoword validator (`lib/literacy/pseudowordValidator.ts`)

Shared, reusable. A candidate pseudoword PASSES only if **all** hold:
1. Matches the target pattern only — `wordMatchesPattern(word, targetCode)` true; matches none of `blockedPatternCodes`.
2. **Not a real English word** — check against the lemma + forms in `HighFrequencyWord`, the closed-word set, and a bundled common-word list (CMUdict-derived, `data/phonogram/cmudict.json` is already present). Reject `lathe`, `nape`, `cape`, `mane`, etc.
3. **Not a homophone/near-spelling of a real word** — reject `drane`≈drain, `brade`≈braid, `kape`≈cape, `daye`≈day. Use a simple edit-distance-1 + rime-match heuristic against the common-word list; log rejected candidates with the matched real word.
4. Phonotactically plausible (legal English onset/coda; reuse CMUdict phoneme data where available).

Return `{ valid, reason, collidesWith? }` per candidate so tests and the audit can assert *why* a pseudoword was rejected.

## Persistence

Mirror `generatePassagesForTarget`. In one transaction per lesson: create the `Lesson` (`reviewStatus` defaulting to `PENDING` semantics — a lesson is "ready to serve" only when every `LessonPart` is APPROVED, computed at query time per §7.1), create 8 `LessonPart` rows (`reviewStatus = "PENDING"`), set `Lesson.passageId`. Then call `runAIFirstLookReview({ artifactType: "LESSON_PART", artifactId: <each part id>, metadata, contentForReview })` so every part ships to human review with an AI pre-read attached (the `lessonPartChecklist` is already wired). Store `firstLookReviewModelDecisionId` on each part.

**Two distinct failure modes — handle separately:**
1. **Mechanical BLOCKER gate fails during generation** (before persistence): **do not persist** — return the failure reasons (like `auditFailureReasons` does for passages) and let the CLI retry/report. Nothing reaches the DB.
2. **First-look fails AFTER the rows are persisted** (mechanical gates passed, rows created, then first-look errors or never attaches for some part): **keep the candidate `Lesson` + parts as `PENDING`** (so a human/debugger can inspect them), but the missing `firstLookReviewModelDecisionId` makes `evaluateLessonApprovalReadiness` return the `LESSON_PART_FIRST_LOOK_REQUIRED` blocker — so the lesson can never become ready-to-serve. Preference: keep-but-block over delete, matching PR #35's passage discipline. (First-look capture itself stays best-effort/non-blocking per AGENTS.md, but the *approval gate* is hard.)

## CLI + npm wiring

`scripts/content/generate-lessons.ts`, mirroring `generate-passages.ts`:
```
npm run content:generate-lessons -- --phase-position "Phase 3 Entry" --daily-target a_e [--count 1] [--mock-model]
```
- `--mock-model`: deterministic mock model runners for every LLM part (so the test suite runs with no API key), and a mock first-look runner returning APPROVE (same pattern as `generate-passages.ts`).
- Add to `package.json` scripts: `"content:generate-lessons": "tsx scripts/content/generate-lessons.ts"`.
- Print a JSON summary per lesson: inserted lesson id, per-part gate results, audit summary, first-look recommendation.

## Tests (`scripts/test-content-v3-lesson-pipeline.ts`, add to `test:content-v3`)

Deterministic, mock-model, no network. Assert PASS and the **specific failing rule code** on each negative:
- **Happy path:** generate the `a_e` lesson with mock model + a seeded approved Phase 3 a_e passage → 8 parts, all content gates PASS, **all 8 parts carry a non-null `firstLookReviewModelDecisionId`**, `evaluateLessonApprovalReadiness().approvable` is initially **false only because parts are `PENDING`** (not because of content blockers and not because of `LESSON_PART_FIRST_LOOK_REQUIRED`); content blockers empty.
- **Part 1:** warmup containing `cake` → FAIL `LESSON_PART1_NO_TARGET_PATTERN`.
- **Part 2:** `kidVisibleCopy` containing `/eɪ/` → FAIL `LESSON_KIDVIEW_NO_NOTATION`; demo pair that isn't a minimal pair → FAIL `LESSON_PART2_DEMO_MINIMAL_PAIRS`; `conceptExamples` containing a closed-base word (`cap`) → FAIL (target-only field discipline) — and a warm-up word equal to a true `conceptExamples` target word still correctly FAILs `LESSON_WARMUP_NO_TODAY_PATTERN`.
- **Kid-view linter (resolved label rule):** `kidVisibleCopy` = "New thing to learn: a_e words" → **PASS** (pattern label as title is allowed); `kidVisibleCopy` containing `/eɪ/` or a slash → **FAIL** `LESSON_KIDVIEW_NO_NOTATION`; `kidVisibleCopy` containing "Phase 3 Entry" (or `closed_short_a`, `PA_PSSA_ELA`) → **FAIL** `LESSON_KIDVIEW_LINTER_CLEAN` (phase/framework code).
- **Single-category audit:** Part 7 re-audit assigns `a`/`the`/`to`/`I` to `heart` only (assumed-known), never also `prerequisite` — assert no token appears in two category lists.
- **Part 3:** missing the pseudoword line → FAIL `LESSON_PART3_CONTRASTIVE_STRUCTURE`; pseudoword `kape` → FAIL `LESSON_PART3_PSEUDOWORD_CLEAN` with `collidesWith: "cape"`; 9 real words → FAIL `LESSON_PART3_REAL_WORD_COUNT`.
- **Part 4 (bucketed heart words):** Part 7 uses heart word `said` that is in neither `heartWordsPreviewedThisLesson` nor `heartWordsAssumedKnown` → FAIL `LESSON_HEART_WORDS_PREVIEWED`; Part 7 uses `the`/`to` (in `heartWordsAssumedKnown`) and they are NOT previewed → still PASS (must not require previewing assumed-known HFW); `have` tagged `target` → FAIL `LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART`.
- **Part 5:** sentence with `for` → FAIL `LESSON_PART5_NO_RCONTROLLED`; a 14-word sentence → FAIL `LESSON_PART5_SENTENCE_LENGTH`.
- **Part 6:** 5 dictated words → FAIL `LESSON_ENCODING_MINIMUM_ITEMS`; no dictated sentences → FAIL `LESSON_PART6_DICTATION_TARGET_REVIEW`.
- **Part 7:** no approved passage in pool → FAIL `LESSON_PART7_NO_APPROVED_PASSAGE` (lesson not persisted); selected passage containing a blocked `i_e` word under re-audit → FAIL `LESSON_PART7_NO_BLOCKED_PATTERNS`.
- **Part 8:** question "Did Dave make a cake?" → FAIL `LESSON_PART8_OPEN_ENDED`; 2 questions → FAIL `LESSON_PART8_QUESTION_COUNT`.
- **Part 3 L5 deferred:** a generated lesson containing an inflection line (L5) → FAIL `LESSON_PART3_CONTRASTIVE_STRUCTURE` (v1 expects L1–L4 only).
- **First-look required:** a persisted lesson where one part's `firstLookReviewModelDecisionId` is null → `evaluateLessonApprovalReadiness().blockers` includes `LESSON_PART_FIRST_LOOK_REQUIRED`; the lesson is never ready-to-serve. Also: first-look capture persistence throwing must NOT roll back the already-persisted candidate (best-effort capture), but MUST leave the approval gate blocked.
- **Whole lesson:** 7 parts → FAIL `LESSON_EIGHT_PARTS_ORDERED`; missing Part 6 → FAIL `LESSON_TRANSFER_CHAIN_INTACT`.
- **Instrumentation equality fixture** (per AGENTS.md): wrapped vs. unwrapped lesson generation with a deterministic fake model returns deep-equal output, including when `recordModelDecision` capture persistence throws (capture is best-effort, non-blocking). No filled prompt or PII in `inputContextJson`.

## Seed fix (bundle into this PR)

`lib/content/phase3EntrySeed.ts` — the `a_e` target's `exampleNonwords` includes **`lathe`** and **`nape`**, which are real English words and fail the new `pseudowordValidator`. Replace with clean non-words (e.g. `["zake", "mave", "pame", "vade", "sape"]`) and add a unit assertion that every `exampleNonwords` entry passes `pseudowordValidator` for its target. (Optional but recommended: assert the same for all five Phase 3 Entry targets — `i_e`, `o_e`, `u_e`, `e_e` — to catch the same class of error before those targets are generated.)

## Acceptance criteria (trace to spec §10 "Lessons" + §5)

- Lesson has 8 parts in prescribed order; daily target is the single `a_e` pattern.
- Warm-up (Part 1) contains zero a_e words. Part 3 uses contrastive line structure. Pseudowords use a_e only and are not real words / real-word near-spellings.
- Every word in the lesson is tagged target / prerequisite / heart / vocabulary; zero unclassified.
- Part 7 passage is selected from the **approved** pool, re-audited, decodability ≥ phase threshold, zero unpreviewed non-target words.
- Part 6 ≥ 6 dictation words + ≥ 2 sentences. Part 8 questions open-ended.
- No `LessonPart` with `reviewStatus != APPROVED` is ever marked ready-to-serve; readiness is computed (every part APPROVED). The query-layer guard (`reviewStatus: "APPROVED", retiredAt: null`) is asserted.
- Every generation call logged as a `ModelDecision` (`DECISION_TYPES.LESSON_GENERATION`) with a stable `promptKey`, structured params, no filled prompt/PII; equality fixture present.
- Kid-view copy passes the §5.12 linter on every part. `evaluateLessonApprovalReadiness` returns content-blocker-free for the happy-path lesson.

## What Codex should NOT do

1. Do **not** add new prisma models or run a migration — the schema exists.
2. Do **not** generate the Part 7 passage inline; **select** from PR #35's approved pool and re-audit. No approved passage → fail and report.
3. Do **not** generate lesson content at student request-time (pre-generation + review only, per §11.2).
4. Do **not** build the lesson **review-queue UI** or the student **lesson runtime** — those are later steps (14, 15+). Stop at audited `PENDING` lessons + the programmatic approval gate.
5. Do **not** allow a broad-category target; daily target stays the one `a_e` pattern.
6. Do **not** put phoneme notation, phase/position codes, scoring labels, or design notes in any `kidVisibleCopy`.
7. Do **not** rename existing `lessonMetadata.ts` rule IDs or the `contentJson` field names (`warmupWords`, `conceptExamples`, `dictatedWords`) — extend, don't break.
8. Do **not** ingest any commercial structured-literacy program's word lists/lessons (§11.1). Generate from the seeded pattern codes + NDL HFW + CMUdict only.
9. Do **not** hardcode `a_e` behavior in generator logic — read from the `DailyTarget` row so the replicate-loop is data-only. (But generate/test only `a_e` here.)
10. Do **not** store filled prompts or student PII in `ModelDecision.inputContextJson` (§11.11).

## Open questions for Jonathan

**Resolved by the 2026-06-01 review (now baked into the spec):**
- **Q2 — `have`-class exception words:** ✅ Resolved. Silent-e exception list (`have, give, live, come, some, done, gone, love`) is a hard "tag as heart, never target" constraint (`LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART`).
- **Q3 — Part 3 L5 inflection:** ✅ Resolved → **deferred** to a later morphology PR; v1 generates L1–L4 only.
- **Q4 — r-controlled exclusion:** ✅ Resolved → **hard-excluded** at Phase 3 Entry (`LESSON_PART5_NO_RCONTROLLED`); `for`, `are`, etc. do not appear in Parts 5/6/7.
- **Q5 — Part 7 selection when multiple qualify:** ✅ Resolved → deterministic by highest `decodabilityScore`, tie-break lowest `id`.
- **Heart-word semantics:** ✅ Resolved → three buckets (`previewedThisLesson` / `assumedKnown` / `usedInConnectedText`); gate = `used \ assumedKnown ⊆ previewedThisLesson`.

- **Kid-facing pattern label:** ✅ Resolved → **`a_e words` stays** per §5.12. The kid-view linter allows `a_e` only as the `DailyTarget.kidVisibleLabel`/title and rejects notation + phase/framework codes. Not open; do not re-litigate.

- **Part 2 demonstration style:** ✅ Resolved → **closed-base → a_e minimal pairs** for this vertical slice (makes the silent-e job visible). Future PRs may revisit presentation style; Codex implements minimal pairs for #36 and should not treat this as open.

**Still genuinely open:** none that block Codex. Proceed.
