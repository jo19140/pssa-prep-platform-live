# ASR Reality Check — plan & protocol (the gate before any Part-3 build)

**Status:** DRAFT for sign-off. Executable artifact that comes after the runtime foundation spec ([[reading-buddy-lesson-runtime-reconcile-and-scaffold-spec]]) and **before** the Part-3 live-loop Codex spec. No Part-3 build until this returns a filled result table + an A/B/C verdict.

## Why this exists

Harper's core move is listening to a child read and responding specifically ("you said *cack*") — but only when that's safe. The scaffold ladder's rule: name the transcript only on a high-confidence, plausible decoding attempt; otherwise re-model ("let's try that together"). The worst failure mode is Harper confidently "correcting" a child off a bad transcript, or **giving credit for a miss** because the recognizer auto-corrected the error away. We set the threshold empirically here, not by guessing.

## Verified preconditions (read the code, 2026-06-07 — do not assume)

- **Web Speech exists:** `MicButton` uses the browser Web Speech API and returns `{ transcript, audioConfidence?, noAttempt?, clientIssue? }`. `audioConfidence` is frequently `undefined`, and Web Speech **normalizes toward real words** (a child's "cack" can come back as "cake" → false credit).
- **Whisper is NOT wired:** a repo-wide grep for `audio.transcriptions` / `whisper` / `createTranscription` finds only specs + the `VoiceSession.asrVendor` schema field. Nothing calls Whisper. Audio is captured (`lib/voice/audioCapture`) but transcription today = client Web Speech only. The `openai` package (^6.35.0) is a dependency, so a transcribe route is one call away.
- **Whisper is ALSO a language-model transcriber.** Whisper / gpt-4o-transcribe are trained to produce fluent, correct text — they carry a strong LM prior that auto-corrects toward real words, the *same* failure mode as Web Speech, possibly worse on miscues and nonwords. **Do not assume Whisper solves over-normalization just because it's the decided engine. The test must prove it.**
- **`MicButton` already does same-click dual capture:** it calls `startAudioCapture` and runs Web Speech off one `start()`. The dev page reuses this; the only thing to confirm is that `audioCapture` returns a retrievable blob to POST to Whisper (else use `MediaRecorder` directly).

## Scope — temporary dev-only instrumentation (NOT "read-only")

The only new code is throwaway, dev-gated test instrumentation: a minimal transcribe route + a dev capture page. Explicitly: **no student-facing route, no lesson-player code, no content/gate changes, no production data dependency, no stored child audio by default.** Removed (or promoted deliberately) after the verdict. **No `ModelDecision` write for the reality check** — log cost/latency on-screen only, to avoid any DB-write ambiguity.

## Privacy (child-data handling — explicit)

Tier-1 consent already permits in-session processing. For this test: process the audio for transcription, display/export the table row, then **delete the audio blob after the row is produced.** No training-corpus use, no reuse outside this verdict, no storage beyond the active test session unless a parent/guardian explicitly consents to storage. Privacy is a build requirement, not a reason to weaken the test.

## Test corpus

Three groups: ordinary real-word confusions, the actual VCe→closed decoding miscues, and pseudowords.

```
similar real words (ordinary ASR confusion):  cake/take · made/maid · cape/tape · lake/make
VCe → closed decoding miscues (the real test): cake/cack · cape/cap · made/mad · lake/lack · game/gam · take/tack · name/nam · plate/plat
pseudowords (validated a_e fixtures ONLY):     zake · mave · pame · vade · sape · nace · gake · tave
2nd pattern (generality):                      team_ow snow/grow/show  OR  r_controlled her/turn
irregular controls (non-decodable):            said · was
connected text (the recognizer's BEST case):   the a_e Part-5 sentences + the "Dave's Cake" passage, read whole (not word-by-word)
```

**Why connected text is in the corpus (important):** isolated single words are the **worst** case for Whisper / gpt-4o-transcribe — they're trained on continuous speech, so a lone word has no context and the LM prior over-normalizes hardest ("cack"→"cake" is *more* likely on a one-word clip than inside a sentence). Part 3 is the easiest place for the *scoring logic* (known target) but the *hardest* for the *recognizer*. A test built only on isolated words risks a falsely pessimistic verdict for a product that mostly listens to **connected reading** (Parts 5/7), where continuous ASR + word alignment is most tractable. So we sample both, tagged separately, to learn which surface the speech loop can actually lean on. (This does not change "build Part 3 first" — it makes the measurement honest.)

**Pseudoword rule (binding):** every pseudoword in this test MUST come from an already-validated content-v3 nonword fixture — here, the current `a_e` `exampleNonwords` in `lib/content/phase3EntrySeed.ts` (verified 2026-06-07). **Do NOT invent nonwords in this plan** (e.g. `nave` is a real word; `nake` isn't a validated fixture) — that's the `vate→veit` / `fy→phy` collision class. Pseudowords are in the corpus to **measure over-normalization severity and confirm the no-ASR-score rule**, NOT to find a confidence threshold θ.

## Protocol

- **Phase A — adult simulating miscues (fast, no consent):** read each item twice — once **correct**, once as the **intended miscue** (literally say "cack" for cake). Isolates ASR mechanics from child-voice variability and validates the harness before any child is involved.
- **Phase B — real child (Tier-1 consent):** child reads the real target words AND the connected text naturally; some correct, some genuine miscues. **`humanHeardAs` is filled from the recording on replay, NOT typed live** — a human mishearing a live child is the same failure mode as the ASR, so the ground truth must be more careful than the thing it judges. If the listener is unsure, mark `humanHeardAs = unclear` (never a guessed word). On the first child test, use two adult listeners on a sample and **exclude disagreements from θ** (per the flywheel's inter-annotator discipline).
- **Same-utterance capture (HARD REQUIREMENT):** each spoken attempt is captured ONCE and fed to BOTH engines — Web Speech (via `MicButton`) and the Whisper route receive the *same* audio, tied by one shared `utteranceId`. Never compare Web Speech from one read against Whisper from a separate re-read.

## Required output — the audit table (one row per utterance)

Row schema:

```
utteranceId | phase | surfaceType | target | isPseudoword | groundTruthSource | humanHeardAs |
  webspeech_transcript | webspeech_conf | webspeech_latencyMs |
  whisper_transcript | whisper_confidence_or_proxy | whisper_latencyMs |
  uncertaintyScore | engineError | audioQualityNote | expectedFeedbackFamily | safe_branch
```

- `surfaceType`: `isolated_word` | `connected_sentence` | `connected_passage` — drives the two surface-specific verdicts (the gate uses isolated only).
- `isPseudoword` (bool) + `expectedFeedbackFamily` (`ASR-scoreable-real-word` | `self/adult-confirm-pseudoword`): keep pseudowords from being evaluated with the real-word rule — a `true`/`self-adult-confirm` row is never a θ data point.

- `groundTruthSource`: `adult-scripted` | `adult-listener` | `child-self-report`.
- `humanHeardAs`: what a human actually heard the speaker say — **this is the column that catches false credit** (target=cake, humanHeardAs=cack, both transcripts="cake" → over-crediting).
- `whisper_confidence_or_proxy`: record `avgLogprob` / segment / token confidence **if the chosen model returns it**; gpt-4o-transcribe snapshots are parameter-limited and may not — then record `null` and rely on transcript-match + `uncertaintyScore` + the human label. **Do not fabricate a confidence value.**
- `uncertaintyScore`: from the existing `computeUncertaintyScore({ asrConfidenceMean, asrTranscript, expectedText })`.
- `safe_branch`: the scaffold-ladder action the row supports (correct→praise / specific "you said ___" / re-model fallback / self-adult confirm / false-credit risk).

## What the data must decide (derive, don't guess)

1. **False-credit rate (the dangerous error):** how often does each engine return the *expected* word when `humanHeardAs` is the miscue? High here = that engine cannot be the authoritative scorer.
2. **Over-normalization probe:** does Whisper auto-correct "cack"→"cake" / "mave"→"wave" like Web Speech? Test with and without a biasing `prompt` + `temperature=0` (whisper-1) to see if it can be suppressed.
3. **Specific-feedback threshold θ:** for which (transcript, confidence) combos is the transcript a faithful rendering of the miscue, so "you said ___" is safe?
4. **Latency tolerance:** Web Speech instant/on-device vs the transcription round-trip — is the delay acceptable for a 6-year-old (≈≤1.5s feels OK; ≈5s feels broken)? Outcome = **gpt-4o-transcribe/Whisper authoritative**, or **Web-Speech instant UI hint + gpt-4o-transcribe/Whisper authoritative**.
5. **Pseudoword behavior:** confirm neither engine reliably returns the validated nonwords (zake/mave/…) → pseudowords stay self/adult-confirm in v1.
6. **Isolated vs connected:** does the recognizer do materially better on the connected read than on isolated words? If yes, the speech loop should lean on Parts 5/7 for real scoring and treat Part-3 single-word feedback more conservatively.

## Verdict — TWO surface-specific verdicts (not "ASR works")

The test returns a separate A/B/C verdict for **(1) isolated Part-3 word reads** and **(2) connected sentence/story reads**. Each verdict maps to *what the scaffold ladder can safely do* — the gate is "which branches are safe," not "build or not":

- **Verdict A — naming is safe.** A defensible θ exists where "you said ___" avoids false credit on close pairs → full ladder, including the specific-miscue branch. (Ship: gpt-4o-transcribe/Whisper authoritative; Web Speech UI-only or low-latency hint.)
- **Verdict B — correct/incorrect is reliable, naming is not.** The recognizer can tell a correct read from a miss but the transcript isn't faithful enough to name the error → re-model + retry ladder, Harper never asserts "you said ___". The listening loop still works; it just doesn't name the miscue.
- **Verdict C — even correct-vs-incorrect is unreliable (false credit too high).** Autonomous scoring is off → adult/self confirmation for v1 while collecting consented labeled clips; route the real fix to **phoneme-level scoring** (forced alignment / wav2vec2-phoneme — already roadmapped as `voice-phonogram-scoring`), the correct tool for separating cake from cack when word-level ASR can't.

**Gate rule (binding):** **Part-3 build permission comes ONLY from the isolated-word verdict.** Connected-text results are advisory for the future Part 5/7 plan, NOT for the Part-3 "you said ___" branch. So if isolated = B/C but connected = A, Part 3 still ships with re-model/retry (or adult/self-confirm), NOT specific naming — connected promise does not authorize Part-3 specific feedback. (Sentence/story alignment is deferred anyway per the runtime foundation spec.)

## Minimal harness (throwaway, dev-only, hard-gated)

1. `app/api/voice/transcribe/route.ts` (dev) — POST an audio blob → OpenAI `audio.transcriptions`; return `{ transcript, confidenceProxy?, latencyMs }`. **Admin/dev-auth only, not linked from any student UI, no audio persistence, no `ModelDecision` write during the test.** Test `gpt-4o-transcribe` first; `whisper-1` as an optional baseline (and the `prompt`/`temperature` over-normalization probe). **Verify the current OpenAI transcription API/model params at build time — do not assume confidence/logprob fields exist or fabricate them.**
2. `app/dev/asr-check/page.tsx` (dev, gated) — shows each corpus word; on read, captures ONE audio blob (`audioCapture`/`MediaRecorder`) while `MicButton` runs Web Speech; posts the same blob to `/api/voice/transcribe`; computes `uncertaintyScore`; records latency + any engine error; lets the tester type `humanHeardAs`; appends a row (shared `utteranceId`) to an on-screen table that exports to CSV/markdown. Deletes the blob after the row.

**Cleanup is asymmetric (Pro's call):** the **dev page is throwaway** — delete after the verdict. The **transcribe route is delete-OR-promote** — if it works it's the same infrastructure the Part-3 live loop needs, so **promote it deliberately** into the real voice-service path behind the existing proxy pattern (auth + rate-limit + consent-tiered retention + `ModelDecision` cost instrumentation, mirroring `specs/voice-tts-upgrade` and the `VoiceSession.asrVendor` field) rather than deleting it and rebuilding next PR (wasted effort + drift). Neither is on a student path during the test.

## How it runs

Phase A: Jonathan (adult) reads the corpus correct+miscue → harness logs the dual-engine table. Phase B: a child reads naturally with consent, tester fills `humanHeardAs`. Jonathan pastes the table back; Claude reads it and writes the A/B/C verdict + θ + the Web-Speech-role decision + pseudoword confirmation → straight into the Part-3 live-loop Codex spec.

## Open questions for sign-off

1. OK to stand up the throwaway, dev-gated Whisper route + dev page (the only way to test the decided path)?
2. `gpt-4o-transcribe` first with `whisper-1` baseline + the prompt/temperature over-normalization probe — agreed?
3. Phase A (you, adult) first to prove the harness, then Phase B (child)?

## After the verdict

→ Part-3 live-loop Codex spec (θ, Web-Speech role, pseudoword rule baked in; or Verdict B/C path) → build Part 3 only at `/student/practice`, emitting evidence. Sequence per [[reading-buddy-lesson-runtime-reconcile-and-scaffold-spec]]. Part-2 kid rule-copy is authored separately (3 exemplars first, Jonathan reviews).
