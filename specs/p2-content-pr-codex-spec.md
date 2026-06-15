# P2 — content PR: add BAND_7_8 a_e lesson content variant (Codex spec, v2 post-Pro)

**Date:** 2026-06-14 · Source content: `specs/content-7-8-ae-worked-exemplar.md`. Verified against `origin/main`.
**Goal:** add the 7-8 a_e lesson content as a **`BAND_7_8` variant**, selected by `presentationProfile`. **K-3 a_e content byte-unchanged.** Producer renders it. **The producer-path test is the real gate** (the earlier flat-list run is NOT the producer output — see below).

## PREREQUISITE — P1 must already be on `origin/main` before this branch starts
P2 depends on P1. **Before coding, verify `origin/main` contains all of:**
- `lib/literacy/presentationProfile.ts` + the `PresentationProfile` type
- `presentationProfileForGrade(...)`
- `buildLessonPlayerData(..., { presentationProfile })`
- the student practice-page threading from `StudentProfile.grade` → `presentationProfile`

**Do NOT require `LessonGeneratorContext.presentationProfile` to pre-exist — P1 does not add it. P2 itself adds `presentationProfile` to `LessonGeneratorContext` and threads `ctx.presentationProfile` into `phase3EntryLessonContentFor` at the generator/lesson-part call sites.**

**If the P1 artifacts above are absent from `origin/main`, STOP and report. Do NOT recreate P1 inside P2, do NOT invent grade resolution or a grade field, and do NOT stack P2 on an unmerged branch unless explicitly instructed.** Branch P2 from the updated `origin/main` after P1 merges.

## Structure (grounded — corrects the v1 spec)
- `phase3EntryLessonContentFor(code)` is called **directly in 8 places**: `lessonPlayerData.ts`, `lessonGenerator.ts`, and every part — `part2Concept.ts`, `part3Decoding.ts`, `part5Sentences.ts`, `part6Encoding.ts`, `part7ConnectedText.ts`, `part8Comprehension.ts`. So the band must thread to **all** of them, not 2 files.
- Part 3 real words = **`ctx.targetWords` (= `dailyTarget.exampleWords.slice(0,5)` from the SEED, shared/fixed) + `contrastiveLine2` + `contrastiveLine3`**; pseudowords from the seed (shared). For a_e the seed's words are **`cake game make same tape`** — these are Line 1 regardless of band. The variant only authors `contrastiveLine2`/`contrastiveLine3` and the prose fields.
- **The earlier flat-list validation ≠ the producer output** (it didn't include the seed targetWords). The producer-path test below is the authoritative gate.

## What to build
1. **Band-aware lookup + pass-through.** Keep `LESSON_CONTENT_BY_DAILY_TARGET` as the **K-3 default**. Add a separate `BAND_7_8` override map (do not nest into / mutate the default). Change `phase3EntryLessonContentFor(code, presentationProfile?: PresentationProfile)` to return the override when present else the default. Add `presentationProfile` to `LessonGeneratorContext` and pass `ctx.presentationProfile` at the 6 lessonPart call sites + `lessonGenerator.ts`; pass the band from `lessonPlayerData.ts`. **These edits may ONLY pass the band through to the resolver — no generator/gate/audit/classifier/decodability/seed/content behavior change.** If any call site can't be threaded cleanly, STOP and report it (don't silently skip).
2. **No band / `BAND_K_3` / `undefined` → identical to today** at every call site.

## BAND_7_8 a_e content (corrected to the real producer fields)
```
demoMode: "minimal_pairs"
kidRuleStatement: "Silent e changes the vowel to its long sound. When a short word adds silent e, the vowel says its name: cap turns into cape. The e stays silent."
reteachPrompt: "Silent e at the end makes the vowel long. Try {word} again."
demonstrationPairs: [{closed:"cap",target:"cape"},{closed:"at",target:"ate"},{closed:"man",target:"mane"},{closed:"tap",target:"tape"},{closed:"hat",target:"hate"}]
contrastiveLine2: ["cap","cape","man","mane","hat","hate"]   // minimal pairs; avoids "tape" dup with seed targetWords
contrastiveLine3: ["ran","lake","hand","fast","name","desk"]
sentences: ["Jake ran his last race.","He set a fast pace.","Jake gave it his best.","His pals gave a wave.","Jake was brave.","He made up the gap."]
dictatedWords: ["cape","made","lake","game","gave","brave"]
dictatedSentences: ["Jake made a save.","He gave his best."]
comprehensionQuestions: [{question:"Why did Jake feel he messed up at the start?",questionType:"inference"},{question:"How do you know Jake did not give up?",questionType:"literal"},{question:"Tell what happened at the end, in your own words.",questionType:"retell"},{question:"Tell about a time you kept going after a setback.",questionType:"personal_connection"}]
heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson
heartWordsAssumedKnown: [...sharedHeartWordsAssumedKnown, "he"]   // new array; NEVER push "he" into the shared const
vocabulary: ["brave","pace","gap"]
mockPassageText: "Jake had his last race. He came in late. His face felt hot. \"Did I mess up?\" Jake said. But Jake did not stop. He set his pace. A pal said, \"Jake, get set.\" Jake felt bad, but he ran on. He ran his best lap and did not fade. Jake ran fast in his lane. He made up the gap. At the end, Jake came in. His pals gave him a wave. Jake was brave. He gave his best."
mockPassageTitle: "Jake at the Race"
```
Expected generated Part 3 real-word set (seed + line2 + line3): `cake game make same tape` + `cap cape man mane hat hate` + `ran lake hand fast name desk` = **17 words**, all closed-short or a_e. If the producer-path test shows the count outside 15-20 or any word unclassified, adjust ONLY `contrastiveLine2`/`contrastiveLine3` length (from these validated words — no new words) and re-run.

## Producer-path test (THE gate — drive the real generator, not hand-built ctx)
The test MUST call **`buildLessonPlayerData("a_e", { presentationProfile: "BAND_7_8" })`** (unless P1 changed that signature — then use the real equivalent). If a different entry point is used it must be an **existing real producer entry point that constructs the `LessonGeneratorContext` itself** — a **hand-built `LessonGeneratorContext` does NOT satisfy this gate** (auto-reject). Run the lesson audit on the produced draft, and assert:
1. `canPersist: true`, `passesAuditGate: true`.
2. Story decodability **1.000**, 0 unclassified, 0 blocked, 0 repeated trigrams, story word-count in band (80).
3. **Print the generated Part 3 `contrastiveLines` by role**, and assert the generated real-word **set/count** = the 17 listed above (count ∈ 15-20). Do not assume hand-list order.
4. Part 2 demo PASS, pseudowords oracle-clean (the 8 seed nonwords), dictation clean.
5. **`he`/`He` is accepted** by the real generated lesson audit (0 unclassified). If it's NOT accepted, the `BAND_7_8` `heartWordsAssumedKnown` already adds it — confirm that's what makes it pass; do not rely on a hand-audit list.
6. **K-3 unchanged (regression) — executable form:**
   - `phase3EntryLessonContentFor("a_e")`, `phase3EntryLessonContentFor("a_e","BAND_K_3")`, and `phase3EntryLessonContentFor("a_e", undefined)` **all return the default K-3 object** (three separate assertions).
   - The default K-3 a_e object's fields equal the existing K-3 values **exactly**: `demoMode, kidRuleStatement, reteachPrompt, demonstrationPairs, contrastiveLine2, contrastiveLine3, sentences, dictatedWords, dictatedSentences, comprehensionQuestions, heartWordsPreviewedThisLesson, heartWordsAssumedKnown, vocabulary, mockPassageText, mockPassageTitle` (assert each, or hardcode the known K-3 values).
   - The K-3 a_e generated lesson still passes its audit.
   - The `BAND_7_8` object is a **separate object** and does not mutate any shared array (e.g. `sharedHeartWordsAssumedKnown` stays `["I","a","the","to"]` — "he" lives only on the BAND_7_8 variant).
   - The Codex diff/report must show the K-3 `a_e` block was **not edited** — only a new override map was added.

## Guardrails / Do NOT
- **Do NOT overwrite/edit the K-3 a_e content**, mutate shared heart arrays, or change the seed/generator/gates/classifier/decodability/pseudoword logic or any other target.
- **No P3 presentation here:** this PR adds age-band *content/text* only. Do NOT add Coach Mode CSS/classes/layout, change Harper visuals, rename UI labels, or alter any interaction (VAD/capture/Part-3 scoring/Parts 5-7). P3 owns presentation.
- Do NOT hand-build lesson content in the UI.

## Additional audit guardrails (Pro)
- **Resolver default tests:** the three calls above (`"a_e"`, `("a_e","BAND_K_3")`, `("a_e",undefined)`) must all return the K-3 default.
- **Never push `"he"` into `sharedHeartWordsAssumedKnown`** — only the BAND_7_8 a_e variant gets it (via a new array).
- **`package.json` may be touched ONLY** to wire a new permanent producer-path test into the content-v3 test command (make it permanent — this is the first age-band variant). No other `package.json` change.
- **Pass-through is the only allowed `lib/literacy` change:** the only edit in `lessonGenerator.ts` / `lessonParts/*` is threading `presentationProfile` into the content resolver. **No content selection may branch on grade except through `phase3EntryLessonContentFor(code, presentationProfile)`.** No generator/gate/audit/classifier/decodability/seed/pseudoword/VAD/ASR/interaction behavior change.
- The producer-path test must **print the actual generated Part 3 lines by role** and assert the generated real-word set/count — not just the hand-authored override fields.

## Scope
`lib/content/phase3EntryLessonContent.ts` (BAND_7_8 variant + band-aware resolver), `components/literacy/lessonPlayerData.ts` and `lib/literacy/lessonGenerator.ts` (band on ctx + pass-through), `lib/literacy/lessonParts/{part2Concept,part3Decoding,part5Sentences,part6Encoding,part7ConnectedText,part8Comprehension}.ts` (pass `ctx.presentationProfile` to the resolver — pass-through only), the producer-path test, and `package.json` (test wiring only). `tsc --noEmit` + `npm run build` pass. If anything beyond pass-through is needed, STOP and report.
