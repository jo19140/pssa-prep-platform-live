# Content v3 PR #38 — Lesson Content Parameterization (Phase 3 Entry, all 5 targets)

Remove the **a_e content hardcoding** from the lesson-part generators and make all five Phase 3 Entry targets (`a_e, i_e, o_e, u_e, e_e`) data-driven from a single per-target content module, then run the full PR #36 gate stack + the spec-conformance test against **all five**. No new Prisma models, no review-queue UI, no lesson runtime, no LLM content generation. Branch from latest `main` (PR #36 merged; PR #37 + the spec-conformance branch should be merged first — confirm in preconditions). Commit.

> Companion sign-off artifact: `specs/pr38-content-parameterization-WORKED.md` — the validated per-target content (every passage/line/sentence/dictation checked against the real `classifyPassageWords`). Build the content module from it verbatim.
>
> **For Codex — use this 2026-06-01 spec + worked artifact pair only.**

## Rule 0 — preserve a_e behavior exactly

a_e is merged and gate-passing. After migrating a_e content into the new data module, the generated a_e lesson must be **equivalent** to today's output — compare the **normalized generated lesson content** (the part `contentJson`/`kidVisibleCopy` values: warm-up, demo pairs, decoding lines, sentences, dictation, passage text, title, questions), not DB row IDs/timestamps. The existing a_e tests, the golden exemplar, and the spec-conformance test must still pass unchanged. Migrating a_e to the data path is a refactor, not a content change.

## Preconditions (stop and report if missing)

1. On latest `main`. PR #37 (hardened validator + clean seed nonwords for all 5 targets) is merged — confirm `phase3EntrySeed.ts` has 8 valid `exampleNonwords` per target. The spec-conformance test (`scripts/test-content-v3-lesson-spec-conformance.ts`) is present.
2. The part generators still carry hardcoded a_e constants: `DEMONSTRATION_PAIRS` (part2Concept), `LINE_2`/`LINE_3` (part3Decoding), `SENTENCES` (part5Sentences), `DICTATED_WORDS`/`DICTATED_SENTENCES` (part6Encoding), `QUESTIONS` (part8Comprehension), the mock a_e passage in `scripts/content/generate-lessons.ts`, and hardcoded heart/vocab in `buildLessonGeneratorContext`.

## 1. New per-target content module — `lib/content/phase3EntryLessonContent.ts`

Export a map keyed by daily-target `code`:

```ts
export type Phase3EntryLessonContent = {
  demonstrationPairs: { closed: string; target: string }[];
  contrastiveLine2: string[];          // Part 3 L2 (target vs. closed/prior contrast)
  contrastiveLine3: string[];          // Part 3 L3 (cumulative review + target sprinkle)
  sentences: string[];                 // Part 5 (5–8, 4–12 words each)
  dictatedWords: string[];             // Part 6 (>=6, >=1 target + >=1 prerequisite)
  dictatedSentences: string[];         // Part 6 (>=2)
  comprehensionQuestions: { question: string; questionType: string }[]; // Part 8 (3–5, open-ended)
  heartWordsPreviewedThisLesson: string[];   // ["said","was","they"]
  heartWordsAssumedKnown: string[];          // ["I","a","the","to"]
  vocabulary: string[];                // meaning-preview words (decodable; WordAudit stays prerequisite/target)
  mockPassageText: string;             // Part 7 approved-passage fixture (45–80 words, classifier- AND quality-audited)
  mockPassageTitle: string;            // kid-visible story title, stored per target (NOT derived); target-pattern words only
};

export const PHASE_3_ENTRY_LESSON_CONTENT: Record<string, Phase3EntryLessonContent> = { /* a_e, i_e, o_e, u_e, e_e */ };
```

Populate **all five** entries. a_e = the current hardcoded content, moved here unchanged. i_e/o_e/u_e/e_e = the validated content from the worked artifact §2, **verbatim** (it was classifier-validated; do not paraphrase or substitute words — substitutions risk unclassified/blocked tokens).

## 2. Parameterize the generators (read from the module, delete the a_e constants)

For each, replace the hardcoded constant with a lookup `PHASE_3_ENTRY_LESSON_CONTENT[ctx.dailyTarget.code]`:

- `part2Concept.ts`: `demonstrationPairs` and the teaching examples from the module (`conceptExamples` stays `ctx.targetWords`).
- `part3Decoding.ts`: L2 = `contrastiveLine2`, L3 = `contrastiveLine3` (L1 stays `ctx.targetWords`, L4 stays `ctx.pseudowords`). The line tagging must classify per the **active target**, not hardcoded a_e word lists. **L2 minimal-pair rule:** L2 is closed-base → target minimal pairs; use **3–4 pairs depending on target availability**. e_e has only 3 clean minimal pairs (`pet→Pete, them→theme, met→mete`) so its L2 is **6 words**, not 8 — **do not pad L2 with non-minimal pairs** (`got→note`, `hem→scheme` classify fine but are pedagogically wrong). Real-word count still holds: e_e L1(5)+L2(6)+L3(7)=18 ∈ [15,20]; other targets L1(5)+L2(8)+L3(7)=20.
- `part4HeartVocab.ts`: heart buckets + `vocabulary` from the module (currently from ctx — route ctx through the module).
- `part5Sentences.ts`: `sentences` from the module.
- `part6Encoding.ts`: `dictatedWords` / `dictatedSentences` from the module.
- `part7ConnectedText.ts`: unchanged in logic (still selects an approved passage + re-audits), but **delete the `titleFromPassage` a_e ("Dave's Cake") special-case** and use `PHASE_3_ENTRY_LESSON_CONTENT[code].mockPassageTitle` (stored per target — do not derive titles from passage text). The title is kid-visible, so it must pass the §5.12 kid-view linter (the stored titles use only target-pattern words).
- `part8Comprehension.ts`: `comprehensionQuestions` from the module.
- `lessonGenerator.ts` `buildLessonGeneratorContext`: `heartWordsPreviewedThisLesson`, `heartWordsAssumedKnown`, `vocabularyWords` from the module (remove the a_e hardcodes).
- `part1Warmup.ts`: **unchanged** — warm-up stays shared closed-syllable words. (Verify: no warm-up word matches any X_e pattern — closed words never end in silent-e, so this holds for all five. Keep the `LESSON_WARMUP_NO_TODAY_PATTERN` gate.)

Hard rule: generators must be **fully target-agnostic** — no remaining string literal that is a_e-specific content. The only per-target data lives in the module.

## 3. Per-target mock approved passages — `scripts/content/generate-lessons.ts`

Generalize `ensureMockApprovedPassage` to seed an approved mock `Passage` for **any** Phase 3 Entry target (not just a_e), using `PHASE_3_ENTRY_LESSON_CONTENT[code].mockPassageText`. Re-audit it via `auditPassage` against that target and throw if it fails the gate.

**Idempotency (required — PR #34/#35 quality gate rejects near-duplicates):** before inserting, look up an existing non-retired APPROVED mock passage for the same phase position + daily target + normalized text (or a stable `sourceMetadataJson` mock key) and **reuse it** if present; insert only if none exists. Without this, the second `--mock-model` run fails because the new insert is a near-duplicate of the first. Run the **full** `auditPassage` — including the quality gate (`uniqueSentenceRatio`, `repeatedTrigrams`, `repeatedSentences`, near-duplicate check) — before approving/seeding.

## 4. Run the gate stack against all five targets

> **Classifier validation is necessary but NOT sufficient.** The worked artifact's `classifyPassageWords` + `runPassageQualityAudit` checks prove decodability and quality, but Codex must run the **full** `auditGeneratedLessonDraft` and the spec-conformance test against all five targets. Those are what catch non-minimal demo pairs / Part 3 contrast pairs, Part 3 counts, Part 5 r-controlled words, Part 7 audit failures, Part 8 yes/no questions, and the heart-bucket rule. A non-minimal pair like `got→note` is classifier-clean but pedagogically wrong — the gate stack is the backstop.

- **Pipeline test** (`scripts/test-content-v3-lesson-pipeline.ts`): loop all five Phase 3 Entry targets; for each, build the draft (deterministic runner) and assert `auditGeneratedLessonDraft(...).canPersist === true`. Every target must pass every PR #36 BLOCKER gate (warm-up clean, Part 3 contrastive + counts + clean pseudowords, heart-bucket rule, Part 5 no-r-controlled + classified, Part 6 dictation min + target/prereq, Part 7 zero-unclassified + decodable, Part 8 open-ended).
- **Spec-conformance test** (`scripts/test-content-v3-lesson-spec-conformance.ts`): parameterize the existing a_e conformance checks to run for **all five** targets — independent re-audit of Parts 1/3/5/7 via `classifyPassageWords` against each target's seed codes, and the full-CMUdict pseudoword oracle per target. The CMUdict caveat list stays a_e-only (`mave`/`nace`/`sape→seip`) — the i_e/o_e/u_e/e_e nonwords were chosen absent from CMUdict, so they need **no** caveats; if any non-a_e pseudoword hits CMUdict, that's a real failure, not a caveat.

## 5. Hardcoded-content regression test (makes "remove a_e hardcoding" mechanically verifiable)

Add a test/script (e.g. `scripts/test-content-v3-no-hardcoded-content.ts`, wired into `test:content-v3`) that greps the production generator files — `lib/literacy/lessonParts/*.ts` and `lib/literacy/lessonGenerator.ts` — for known a_e fixture strings (`Dave`, `Jane`, `cake`, `lake`, `Dave's Cake`, `cap`, `cape`, and the removed constant names `DEMONSTRATION_PAIRS`/`SENTENCES`/`DICTATED_WORDS`/`QUESTIONS`/`LINE_2`/`LINE_3`) and **fails** if any are found. Allow such strings only in `lib/content/phase3EntryLessonContent.ts`, test files, and `specs/`. This is the standing proof that all per-target content lives in the data module and the generators are target-agnostic.

## What Codex should NOT do

1. Do **not** change a_e content (Rule 0). a_e output stays identical.
2. Do **not** paraphrase/substitute the i_e/o_e/u_e/e_e content — use the worked-artifact words verbatim (they're classifier-validated; new words risk unclassified/blocked tokens). If a gate fails, fix the generator wiring, not the validated content.
3. Do **not** add LLM content generation, review-queue UI, lesson runtime, Prisma models, or migrations.
4. Do **not** leave any a_e-specific string literal in the generators (e.g. "Dave's Cake" title, DICTATED_WORDS) — all per-target data lives in the module.
5. Do **not** widen or add CMUdict caveats for the new targets.

## Acceptance criteria

- `lib/content/phase3EntryLessonContent.ts` exists with all five targets; generators read from it; no hardcoded a_e content constants remain.
- a_e lesson output is unchanged; existing a_e tests + golden exemplar + spec-conformance (a_e) still green.
- For all five targets: `auditGeneratedLessonDraft().canPersist === true`; independent classifier re-audit of Parts 1/3/5/7 clean (zero unclassified, zero blocked, decodability ≥ phase threshold); each Part 7 passage passes the full `auditPassage` **quality** gate (uniqueSentenceRatio 1.0, no repeated trigrams/sentences); CMUdict pseudoword oracle clean (no new caveats).
- Per-target `mockPassageTitle` stored in the module and used by Part 7 (no derived titles); e_e Part 3 L2 is 6 words (3 minimal pairs), others 8.
- `--mock-model` lesson generation succeeds for each of the five targets, and is **idempotent** (a second run reuses the seeded mock passage, no near-duplicate insert failure).
- The hardcoded-content regression test passes (no a_e fixture strings in the generators outside the content module).
- Verify gates all green: `npx prisma validate`, `npx tsc --noEmit`, `npm run test:content-v3`, `npm run content:audit-phase3-nonwords`, `npm run build`.

## Note for the PR description
This completes Phase 3 Entry as the verified reference implementation across all five daily targets. The next replication step (Phase 3 Mid and beyond) reuses this content-module pattern. Real LLM-backed content generation (replacing the deterministic fixture) remains a future spec; the §6 master-spec review pipeline still governs any generated content before it reaches students.
