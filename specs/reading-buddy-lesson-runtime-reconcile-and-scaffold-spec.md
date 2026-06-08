# Reading Buddy lesson runtime — V6↔generator reconcile + Part-3 scaffold ladder (design spec, NOT a build order)

**Status:** DRAFT for sign-off (Jonathan + Pro + Claude). This is the foundation artifact that must exist before Codex builds the content-v3 lesson runtime. It does NOT authorize a build. Verified first-hand against the code 2026-06-07.

## Framing (settled — do not reopen)

- This is a **runtime**, not a new lesson design. The content-v3 8-part lesson generates + audits in the backend (`generateLessonDraft` + `lib/literacy/lessonParts/part1..8`) for 30 daily targets, but **no student component renders it**; `/student/practice` (`components/literacy/StudentPracticeSession.tsx`) is a stub. (See [[project-app-state-map]].)
- **`specs/mockups/lesson-v6-preview.html` is canonical** for the teaching design (it already encodes the reading-specialist loop: miscue→re-teach→retry→scaffold, I-do/you-do, mastery warm-up, adult evidence, autopilot recommendation). The newer `mockups/lesson-player-mock.html` is **interaction-reference only** (one-screen-at-a-time, tap-to-advance, animation, build-the-word) and will be retired.
- **Reuse, don't rebuild:** the diagnostic, `MicButton`, `lib/voice/audioCapture`, `BuddyCharacter`, TTS, consent, `uncertainty`/`miscueTypes`, `recordStudentEvent`. Do NOT touch content generation or the literacy gates.
- **First live slice = Part 3 (word lines) ONLY.** Speech strategy is settled ([[reference-voice-speech-strategy]]): Whisper bootstrap STT, real-time feedback on Tier-1 consent.

## 1. V6 ↔ generated-LessonPart reconcile (exact fields)

Each row: what V6 renders vs the actual `contentJson` the generator emits (verified) vs the decision. `studentDisplayMode`/`responseMode` are real emitted values.

| Part | V6 expects | Generator emits (real `contentJson`) | Reconcile decision |
|---|---|---|---|
| **1 Warm-up** | mastery-coded **sound/phonogram** cards (sh, ch, ck, -s, -es; green=got it/yellow=review) | `warmupWords: string[]` (whole closed words e.g. cat/ran/hand, or VCe `reviewWords` override); `mayIncludeTodayPattern:false`; WORD_LIST / **speech_response** | **MISMATCH. v1: render the generated whole-word warm-up** (kid reads words aloud). Use V6's green/yellow mastery coloring ONLY where real prior per-word evidence exists; **default to a NEUTRAL state when there is no prior evidence** (green=mastered, yellow=review, neutral=unknown) — never fake mastery the system hasn't earned (a brand-new student's warm-up is all neutral). Sound-card warm-up = a later generator change, not a runtime blocker. |
| **2 New thing** | explicit **per-pattern rule card** + re-teach copy ("silent e helps a say its name") | `demoMode` (minimal_pairs / examples_only / transformation_pairs); `demonstrationPairs:[{closed?,base?,target}]`; `demonstrationExamples`; `morphologyJson`; `conceptExamples`; generic `teachingLanguage`; EXAMPLE_CARDS / **listen_and_repeat** | **PARTIAL. The per-target rule string is the gap** — `teachingLanguage` is hardcoded a_e in kidVisibleCopy and generic in contentJson; neither is correct per target. **Decision needed:** add per-target **kid-facing** copy — `kidRuleStatement` ("The silent e helps the a say its name.") + `reteachPrompt` ("Look at the e at the end. Try it again: cake.") — **NOT** the adult-facing `tutorLabel` ("a_e silent-e pattern"), which is a backend label. Used by both Part 2 AND the re-teach card. Must cover all demoModes (minimal_pairs cap→cape; examples_only snow/grow/show; transformation_pairs cry→cried, fast→faster) and be validated on a **non-a_e** target (morph_y_to_i or morph_compare_no_change). Map each `demoMode` to a V6 card variant. |
| **3 Word lines** | 4 lines: target / contrast / review / **pseudowords**; read each aloud | `contrastiveLines:[{lineNumber,role,words}]` (roles target_real_words / contrastive_target_vs_review / cumulative_review / target_pseudowords); `pseudowordValidation` (with `expectedPronunciation`); WORD_LINES / **speech_response**; `wordTagsJson` per word (tag + matchedPattern + expectedPronunciation) | **GOOD MATCH — this is the first live loop.** Real words compare directly to transcript. **Pseudowords (mave/nake) are NOT ASR-scoreable by Web Speech** (nonsense won't transcribe) → in v1 they are self/adult-judged or phoneme-scored later. |
| **4 Power words** | heart words + vocabulary **with a kid meaning** ("lake — a big body of water") | `heartWords` (+`heartWordsPreviewedThisLesson`/`AssumedKnown`, previewStatus); `vocabularyWords:[{word,role}]` — **no definition**; WORD_CARDS / listen_and_repeat | **MISMATCH on vocab meaning.** **PR2 (Part-3 slice): Part 4 is not built — ignore.** Full 8-part shell: render vocab words without definitions ONLY if no `vocabularyMeanings` map exists — "no meaning" is a stopgap, NOT the final design (vocabulary without meaning is weak). **Future generator add:** `vocabularyMeanings`. |
| **5 Sentences** | read each sentence aloud | `sentences:string[]`; `targetPatternCoverage`; `wordTagsJson = classification.words` (per-word target/prereq/heart/vocab/unclassified); SENTENCE_LIST / **speech_response**; scoring `speech_match` | **GOOD MATCH.** Per-word tags exist; sentence-level scoring needs word alignment (deferred past Part 3). |
| **6 Spelling** | "spell what you hear" + progress pills + hint + retry | `dictatedWords`, `dictatedSentences`, `expectedSpellings`, `commonErrorPatterns` (**hardcoded** ["missing silent e","short-vowel substitution"]); DICTATION / **text_response**; scoring `spelling_match` | **GOOD MATCH on shape**; `commonErrorPatterns` is hardcoded-generic. **Decision:** v1 use generic hint; per-target spelling hints = small later add. Input = tap-tiles or keyboard (decide). |
| **7 Story** | "Listen first (Buddy reads)" vs "Read on my own"; target words highlighted; independent only when read-alone | `passageText`; target/prereq/heart/vocab/unclassified words; `listenFirstAllowed:true`; `readOnOwnAllowed:true`; `connectedTextMode:"ASSISTED_OR_INDEPENDENT"`; `independentScoreEligibleWhen:"read_on_own"`; `assistedModeAllowed:true`, `independentScoreEligible:false`; CONNECTED_TEXT / **speech_response** | **EXCELLENT MATCH — I-do/you-do + independent-scoring gate already in the data.** Highlight target words from `wordTagsJson`. |
| **8 Talk about it** | comprehension Qs; talk or type | `questions:[{question,questionType}]` (literal/inference/retell/personal_connection); `questionTypes`; OPEN_RESPONSE_QUESTIONS / speech_response; scoring `open_response_rubric` | **GOOD MATCH.** Open response = **not auto-scored** in v1 (adult/self-judged; capture audio for later). |

**Net:** Parts 3, 5, 7 map cleanly (3 is the live slice). The deliberate decisions before build are four small ones — Part 1 (render words, defer sound-cards), Part 2 (add per-target `ruleStatement`), Part 4 (defer vocab meanings), Part 6 (generic hint v1) — none require touching the literacy engine/gates; Part 2's `ruleStatement` is the only one that may warrant a tiny content/seed field.

## 2. ASR reality-check (a GATE before the Part-3 build)

The whole loop depends on the speech layer distinguishing a correct decodable read from a miscue. **`MicButton` today uses the browser Web Speech API** and returns `{ transcript: string|null, audioConfidence?: number, noAttempt?, clientIssue?: "mic_problem" }`. Web Speech is adult-tuned, **normalizes toward real words**, and its `confidence` is frequently `undefined`. So before building the ladder, run a literal test (a real child or an adult reading like a struggling reader) on:

```
correct vs miscue:  cake/cack · cape/cap · made/mad · lake/lack · game/gam · take/tack
pseudowords:        mave · nake · zame · vade   (expected: Web Speech CANNOT return these)
```

**STT decision is NOT being reopened.** Whisper bootstrap is the settled scoring path + corpus source ([[reference-voice-speech-strategy]]). The reality check does NOT choose a vendor; it determines (a) the confidence thresholds for confidence-gated feedback, (b) the safe fallback behavior when unsure, and (c) whether the browser Web Speech API is acceptable as a **low-latency, non-authoritative first pass** while Whisper is the authoritative scorer. (Latency matters: Web Speech is instant/on-device; Whisper is a server round-trip — a kid waiting on Harper feels lag, so the in-loop responsiveness vs Whisper authority tradeoff is real and is exactly what the test should expose.)

**Verify-before-build:** confirm whether a Whisper transcription route already exists (the flywheel captures audio via `startAudioCapture` but transcription-via-Whisper may not be wired yet). If it isn't, the reality check is the place to stand up a minimal transcribe-the-captured-audio route so we can compare Whisper vs Web Speech on the same clips.

Decide from the transcripts:
- Can it tell a correct decodable read from the common miscue, and at what confidence?
- **When is it safe for Harper to echo "you said ___"** (high-confidence, plausible decoding error) vs when must Harper NOT name the transcript and just re-model?

**Speakers:** adult simulating the miscues first (fast, no consent needed), then a real child with consent. **Acceptance is NOT "perfect recognition"** — it is: *the system knows when it is confident enough to give specific feedback, and falls back safely ("let's try that together") when it is not.*

**Required output — an auditable table, one row per clip** (so the verdict is reviewable, not impressionistic):

```
target word | intended read | transcript | confidence | uncertainty | safe branch
cake        | cake          | cake       | high       | low         | correct → praise
cake        | cack          | ?          | ?          | ?           | specific "you said cack" OR fallback
mave        | mave          | ?          | ?          | ?           | self/adult confirm (pseudoword)
```

This is not delaying speech; it puts the differentiator's hardest risk first. **No Part-3 build until this returns that verdict.** (Full protocol → the ASR reality-check plan, the next artifact.)

## 3. Part-3 scaffold ladder (the reading-specialist behavior)

Per word in a Part 3 line. `expected` = the word. **Specific "you said X" is confidence-gated.**

**Real words vs pseudowords (explicit v1 rule — Codex must not score them the same way):**
- **Real words** (lines 1–3): ASR-scored; compare normalized transcript to `expected`; confidence-gated specific feedback per the ladder below.
- **Pseudowords** (line 4, mave/nake): v1 = **read aloud + self/adult "I read it" confirmation, OR assisted-only.** Do NOT give transcript-based specific feedback on pseudowords unless the §2 reality check proves the STT path can handle nonwords. (Web Speech cannot; Whisper + phoneme alignment is a later add.)

- **Correct read (high conf, transcript == expected):** brief praise from Harper (TTS), mark correct + `independentScoreEligible:true`, advance. Emit `VOICE_WORD_READ` (CORRECT).
- **High-confidence near-miss (transcript ≠ expected, confidence high, transcript is a plausible decoding error):** Harper names it — "You said *cack*. Look at this part" → show the **rule card** (`ruleStatement` + the word with the target grapheme highlighted, silent-e struck) → **Try again** (retry, attempt 2). Emit `VOICE_MISCUE_DETECTED`.
- **Low-confidence / unclear ASR (confidence low or transcript empty/garbled):** Harper does NOT assert a transcript — "Let's try that one together," re-models the word, retry. (This is the default whenever we're unsure, per §2.)
- **No speech / hesitation (`noAttempt`):** replay the direction (TTS), offer tap-to-hear the word, retry.
- **Repeated miss (attempt ≥ N, default N=2, same word):** drop to **I-do / you-do** — "Listen: *cake*. Now you try" → if still missed, **assisted mode**: mark `independentScoreEligible:false`, give the word, move on gently. Emit `VOICE_MISCUE_DETECTED` + the assisted flag.
- **Expected dialect transfer (transcript matches a known dialect variant of `expected`):** do NOT penalize; count as correct-with-note, record miscueType `EXPECTED_DIALECT_TRANSFER`. (Requires the kid's dialect setting; if unknown, treat as a normal near-miss.)
- **`clientIssue: "mic_problem"`:** non-blocking — fall back to a self-report "I read it" tap, mark attempt unscored, continue.

Parameters to confirm at sign-off: retry count N (default 2 before I-do/you-do), the confidence threshold for "you said X", whether pseudowords are self-judged vs phoneme-scored in v1, and the per-line advance rule.

## 4. Evidence event contract (wire to existing pipes — do not reinvent)

Use the existing `recordStudentEvent({ studentUserId, eventType, context, response?, durationMs?, immediateOutcome?, sessionId? })` and existing `EVENT_TYPES`. Consent-tiered retention is automatic.

- On lesson open: `LESSON_STARTED` (context: lessonId, dailyTargetCode, phaseBand).
- Per word attempt (Part 3): **`VOICE_WORD_READ`** — `context: { lessonId, partNumber:3, lineRole, wordId, expectedText, expectedPronunciation, attemptNumber, asrVendor, audioConfidence, uncertaintyScore }`, `response: { rawTranscript, normalizedTranscript, scaffoldStep, scoringMode: "independent"|"assisted"|"unscored" }`, `immediateOutcome: CORRECT|INCORRECT|SELF_CORRECTED|TIMED_OUT|SKIPPED`. Keep `independentScoreEligible` (boolean) AND `scoringMode` — the latter makes reports easier to reason about (assisted reads + pseudoword/self-judged + mic-problem all map to a clear mode rather than a bare false).
- On a miss/re-teach: **`VOICE_MISCUE_DETECTED`** — `context` adds `{ miscueType?, confidenceGatedFeedback:boolean, assisted:boolean }`.
- On part/lesson complete: `LESSON_STEP_COMPLETED` / `LESSON_COMPLETED` with the rolled-up counts.

This is exactly what produces V6's adult card ("18 of 20, 2 re-teach moments triggered") and feeds `lib/literacy/teacherDashboardData` + `autopilot` — the runtime **emits** the evidence; it does not rebuild the dashboard. (`VoiceSession.asrVendor`/`asrConfidenceMean` and `uncertainty.computeUncertaintyScore` are the existing homes for the speech metadata.)

## 5. Decisions — locked defaults vs sign-off vs blocked

Most are effectively chosen, so they're stated as **defaults** (a future Codex spec carries these; it does not reinterpret them). But two are genuinely NOT defaults — flattening them would either let Codex invent reading-instruction copy or pre-empt the ASR test — so they're split out honestly.

**Locked defaults (v1):**
- Part 1: render generated warm-up words; **neutral** mastery state unless real prior per-word evidence exists; defer sound-cards.
- Part 4: not built in the Part-3 slice; in the full shell, vocab renders without definitions only as a stopgap (future `vocabularyMeanings`).
- Part 6: tap-tiles + generic hint for v1 **decoding** lessons (morphology base+suffix tile variant is a later add, not v1).
- Pseudowords: v1 self/adult-confirm or assisted-only; no transcript-based scoring.
- Evidence: `recordStudentEvent` + existing event types + `scoringMode`; feed teacherDashboard/autopilot.
- V6 canonical; new mock = interaction reference; Part 3 is the first and only live slice.

**Needs Jonathan's sign-off (not Claude's to default):**
- **Part 2 `kidRuleStatement` + `reteachPrompt` is real per-target authoring** — kid-facing teaching copy for up to 30 targets. Must NOT be left for Codex to invent (a model improvising reading-instruction language is the thing we avoid). Proposed path: Claude drafts, Jonathan reviews (as with the worked exemplars), validated on a non-a_e target. Confirm.
- Ladder retry count N (default 2) and the "you said X" confidence threshold — directional defaults you may want to tune after the ASR test.

**Blocked on the ASR reality check (cannot default yet):**
- Whether Web Speech serves as a low-latency non-authoritative first pass, or Whisper-only. (Whisper is the settled authoritative scorer either way — NOT a vendor reopen.)
- The exact confidence threshold that gates "you said X" vs "let's try that together."
- Whether a Whisper transcription route already exists or must be stood up (verify item).

## After sign-off

PR-seq (per Pro/Claude): (1) this spec; (2) ASR reality check; (3) Part-3 live loop at `/student/practice` emitting evidence; (4) full 8-part shell on V6 + interaction polish; (5) diagnostic→lesson handoff (placement → first assigned target). V6 canonical; new mock = interaction reference; retire `lesson-player-design-spec.md` + `lesson-player-mock.html`.
