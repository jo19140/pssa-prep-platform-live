# Wave 1 — Listen Everywhere + Voice-Attempt Check (Part 1 warm-up + silly words)

> Naming note: this gate confirms Harper **heard an audible reading attempt** — it is NOT word recognition or correctness. Never call it "verified correct"/"scored." (Pro + Claude, 2026-06-14.)

**Date:** 2026-06-14 · Mock signed off: `specs/mockups/wave1-listen-everywhere-mock.html` · Verified against `origin/main` (`caee276`).
Companion: `specs/produce-surfaces-redesign.md`, `specs/asr-strategy.md` (Tier-1 = on-device VAD, no transcription, no storage).

## Goal
Two surfaces in `components/literacy/StudentPracticeSession.tsx` still let a kid advance without reading:
- **Part 1 warm-up (`WarmupPart`)** — currently tap-to-self-confirm, no mic.
- **Part 3 silly words** (the pseudoword block in the decoding part — `tryPseudoword` / `confirmPseudowords`) — currently tap-to-confirm, "read with your adult."

Change both to the **per-item listen-and-verify** pattern: tap a word → Harper listens → she marks it ✓ **only when she actually hears the kid read it** (on-device voice-activity check) → encourage → the Continue/confirm gate stays locked until every word is verified. Never scored. Silly words: Harper **never says them first**.

This is **Tier-1**: on-device energy/VAD only — **no transcription, no upload, no storage**, audio dropped.

> **Why no storage here — read this so it isn't misread.** Silly-word (pseudoword) reads are the **highest-value capture data we have** — purest decoding signal, no real-word shortcut; they're the core of the moat (see `asr-strategy.md`). "No storage" in Wave 1 is **not** a judgment that they don't matter. It's a legal/sequencing boundary: storing a child's voice requires verifiable parental **training consent + secure encrypted storage + retention/deletion**, which is the **Wave 2 capture path**. Wave 1 ships the listen/anti-gaming layer without holding any audio. **The instant Wave 2's capture path is live, silly words are the first thing it captures** (Tier-2 `trainingCorpusOptedIn` only). Re-sequencing option: `specs/wave-2-capture-pull-forward.md`.

---

## 1. New helper: `lib/voice/voiceActivity.ts` (on-device VAD)
`lib/voice/audioCapture.ts` only does `MediaRecorder` chunk capture (uploads). Do **not** route warm-up/silly-word audio to `/api/voice/transcribe`. Add a dedicated on-device detector that never produces a blob or network call:

- `startVoiceActivity(): Promise<VoiceActivityHandle>` — `getUserMedia({audio:true})`, create an `AudioContext` + `AnalyserNode`, sample the time-domain buffer on an interval (~50ms) and accumulate "voiced" time.
- Calibrate a **noise floor** from the first ~300–400ms of the window; treat a frame as voiced when its RMS exceeds `noiseFloor * k` (start `k≈2`, tunable) with a small absolute floor.
- Expose `handle.voicedMs` (cumulative) and `handle.heardSpeech(minMs)` (default `minMs≈550`).
- `stopVoiceActivity(handle)` — fully tears down stream/context. **Nothing recorded, nothing uploaded, nothing persisted.**
- All thresholds are exported constants with `// tune from real kids` comments.

Unit-testable core: factor the RMS→voiced decision into a pure function (e.g. `isVoicedFrame(samples, threshold)` and a `voicedMsFromFrames(...)`) so tests can feed synthetic buffers without a real mic.

---

## 2. Shared component: `ListenForReadingAttempt` (used by both surfaces)
**Purpose (state it in a header comment):** gate progress on Harper hearing a *speech attempt* — NOT on correctness. This is an on-device voice-activity confirmation, not word recognition. VAD cannot tell that the child read *this* word, read it *correctly*, or that a nearby adult didn't speak. Naming and copy must never imply correctness.

A `"listen for an attempt, completion-only"` React piece (place near `SentenceReadingPart`). Props mirror `SentenceReadingPart`: `{ words, onComplete, onHarperMessage, onBuddyState, onSpeak, surface, idleCopy, promptCopy, encourageCopy }`.

**TTS / VAD sequencing — HARD REQUIREMENT (prevents Harper's own voice self-triggering the gate):**
- The per-word prompt is **visual text only** — do **not** speak it before VAD. (Removes the echo path entirely.)
- **VAD must never start while TTS is playing.** If any `onSpeak` is in flight (e.g. a part-level intro), `await` it, then wait a ~250ms cooldown before counting voiced frames. (`onSpeak` resolves on audio-end — verified — so this is enforceable.)
- **No `onSpeak` call while VAD is active.** The encourage message is spoken only **after** `stopVoiceActivity`.

Per-item behavior:
1. Each word is a tappable chip (idle: "tap to read"). Prompt shown as visible text, not spoken.
2. Tap → `onBuddyState("listening")` → `startVoiceActivity()` (after the cooldown rule above) → chip = listening. Harper message (text): `promptCopy` e.g. "I'm listening — read it to me."
3. **Heard a speech attempt (this gates completion, not a button):** poll `handle.voicedMs`; once `heardSpeech()` is true → `stopVoiceActivity()` → chip = green "✓ heard" → THEN Harper encourages (`encourageCopy`, may be spoken now that VAD is stopped) → word counts. The kid **may tap the chip again to stop early**, but stopping only counts **if `heardSpeech()` already succeeded**; stopping while silent → "try again" (see 4). **No control marks a word complete without VAD-confirmed speech or the explicit fallback (5).**
4. **Silence:** if a max window (~6s, tunable) elapses without enough voiced audio → `stopVoiceActivity()` → chip = "↻ try again" (amber), gentle re-prompt ("I didn't quite hear you — tap it and read it to me."). Word does **not** count. Tap retries.
5. **Never-trap (option b):** after **3** honest attempts on the same word, reveal a small tap-confirm fallback so the kid advances (`fallbackAccepted:true`). Blocking a real read is the dangerous direction — never trap a quiet/shy reader.
6. **No-mic / permission denied:** if `startVoiceActivity()` rejects → tap-confirm fallback for the whole surface ("Mic's off — tap each word when you've read it"). Never block.
7. **Gate:** the part's advance/confirm button is disabled until every word is done (heard or fallback-accepted). Show `(done/total)`.

`onComplete` reports **metadata only** (no audio, no transcript), e.g. `{ surface, vadConfirmedWords, fallbackWords, totalWords }`. Do **not** name any field "verified"/"correct" — VAD confirms an audible attempt, not accuracy.

---

## 3. Part 1 — `WarmupPart`
- Replace the self-confirm body with `ListenForReadingAttempt` over `stringArray(part.contentJson.warmupWords)`.
- Thread the Harper callbacks: update the render switch (the `return <WarmupPart .../>` call) to pass `onHarperMessage`, `onBuddyState`, `onSpeak` (as `SentenceReadingPart` already receives them).
- Known words, **not scored**. Copy (no correctness claims): surface intro **"Tap each word and read it to Harper. Harper will listen for your voice."**, prompt "I'm listening — read it to me.", encourage "Thanks — I heard you read that!"/"Nice reading!".
- Update `PART_META` Part 1 from `mode:"self-confirm", evidence:"not scored"` → `mode:"listen for attempt", evidence:"heard speech / completion only"`.

## 4. Part 3 — silly words
- Replace `tryPseudoword`/`confirmPseudowords` tap-confirm with the same `ListenForReadingAttempt` over the pseudoword list (`surface:"pseudoword"`).
- **Harper must NOT say silly words** — no tap-to-hear / no `onSpeak(word)` ever. The kid decodes and reads; Harper only listens. (Per-word prompt is visual text; she may speak the general instruction, but never the pseudoword.)
- **Never scored / never sent to `/api/voice/transcribe`** (pseudowords over-normalize in ASR). The gate is voiced-audio only.
- Copy change: from "Read these with your adult or tap when you have tried them" → **"Sound out each silly word and read it to Harper. Harper will listen for your try. She won't say silly words for you, and silly words are never scored."** Prompt: "I'm listening — sound it out and read it." Encourage: "Thanks — I heard you try that one!".
- Gate `confirmPseudowords` until all heard/fallback.

---

## Privacy / Tier-1 (hard constraints)
- On-device only: **no `MediaRecorder`, no `Blob`, no network call, no `/api/voice/transcribe`, no upload.**
- **No persistence:** no `VoiceCorpus`, no `VoiceSession`, no stored audio (storage is Wave 2, gated on consent + secure storage).
- **No `ModelDecision`** for this layer — VAD is local signal processing, not a model decision. If anything is logged, use ordinary student-event metadata only, e.g. `{ surface:"warmup", vadConfirmedCount:6, fallbackCount:1, totalWords:7 }` — **no audio, no transcript, no per-word timing that could reconstruct content.**
- Reuse the existing mic-permission UX; one mic prompt, graceful denial fallback.

## Acceptance / tests
- **Manual QA the three branches** on Part 1 and silly words: (a) read aloud → chip turns green "heard"; (b) stay silent → "try again," word does not advance; (c) deny mic → tap-confirm fallback, never blocked. Confirm Continue/confirm is locked until all words done.
- **TTS does not self-trigger the gate:** `startVoiceActivity` is **not** called until any in-flight `onSpeak` promise resolves; **no `onSpeak` runs while VAD is active**; the per-word prompt is visual (not spoken); pseudoword text is **never** passed to `onSpeak`. Verify by reading the diff sequence — VAD must not green a chip off Harper's own voice.
- **No upload:** Network tab shows **no** `/api/voice/transcribe` call on warm-up or silly words; no `MediaRecorder`/`Blob` created for these surfaces.
- **VAD confirms an attempt, not accuracy:** assert there is no correctness/score/miscue event emitted; result field is `vadConfirmedWords` (not "verified"/"correct").
- **Unit test** the pure VAD core (`isVoicedFrame` / `voicedMsFromFrames`) with synthetic buffers: silence → below threshold; speech-like energy → accumulates past `minMs`.
- **Never-trap:** after 3 silent attempts on a word, the tap-confirm fallback appears and lets the kid advance.
- **Cleanup / no hot-mic leak (main technical risk):** navigating away, advancing, retrying, or unmounting must call `stopVoiceActivity` and tear down the mic tracks, `AudioContext`, and all timers/intervals. Mirror the existing unmount-cleanup pattern at `StudentPracticeSession.tsx:449-452` (`return () => stopAudioCapture(...)`).
- Real-words scored path (Part 3 real words) is **unchanged** — still uses `startAudioCapture` → `/api/voice/transcribe`.
- `tsc --noEmit`, lint, and `npm run build` pass.

## Do NOT
Send warm-up / silly-word audio to any route or store it · score silly words · emit any correctness/miscue/score event for these surfaces · make Harper speak the silly words · run VAD while TTS is playing · name results "verified"/"correct" (it's an audible *attempt*) · change the real-words scoring path · hard-block a kid on a failed attempt (always retry → fallback) · add consent-storage / `VoiceCorpus` / `VoiceSession` / `ModelDecision` · **let any button mark a word complete without VAD-confirmed speech** (a stop affordance is fine — completion is gated by Harper hearing the read, not by the tap).

## Scope
Clean branch off `origin/main`. Touch only: `lib/voice/voiceActivity.ts` (new), `components/literacy/StudentPracticeSession.tsx` (WarmupPart, silly-words block, render-switch prop threading, PART_META), and a unit test for the VAD core. Do not pull unrelated WIP.

## Follow-up fix — RESOLVED (`5cb9c38`, re-audited 2026-06-14: 9/9 pass, mergeable; only in-browser mic QA of the 3 branches remains, requires a real device)
## Follow-up fix (post-audit, 2026-06-14) — cross-word TTS self-trigger
Branch `codex/wave1-listen-everywhere-vad` (`9b66a36`) implemented the above correctly EXCEPT one gap (Claude + Pro audit): spoken encouragement (`speakEncouragement` default true, on for both surfaces) from word N can still be playing when the child taps word N+1; `handleWordTap` waited a fixed `cooldownAfterSpeech()` but did NOT await the in-flight `onSpeak`, so VAD could start mid-TTS and Harper's own voice could satisfy it. **Required fix before merge:** track the encouragement promise in a self-clearing `speakPromiseRef` (`.catch(()=>undefined).finally(clear)`); in `handleWordTap`, after `startingRef.current = true` and before `cooldownAfterSpeech()`, `await` and clear any in-flight `speakPromiseRef`; null it on unmount. Guarantees VAD never begins while prior encouragement audio is playing. Everything else in the branch passed audit (pure VAD helper + teardown, within-word sequencing, no upload/storage/ASR, `vadConfirmedWords` naming, never-trap fallback, real-words path unchanged).
