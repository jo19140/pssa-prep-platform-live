# Codex spec — throwaway ASR reality-check harness (dev-only instrumentation, NOT the lesson player)

**Source of truth:** `specs/asr-reality-check-plan.md`. This spec builds the *instrument* that produces the plan's audit table. It is **temporary dev-only instrumentation** — no student route, no lesson-player code, no content/gate changes, no scoring/scaffold logic. Jonathan runs it; Codex builds it and stops.

## Scope (locked)

Exactly two new files + nothing else touched:
- `app/api/voice/transcribe/route.ts` — dev/admin-gated transcription proxy.
- `app/dev/asr-check/page.tsx` — dev/admin-gated capture + logging page.

Do NOT: add a student-facing route, touch `lib/literacy/*` or content/gates, write a `ModelDecision` or any DB row, persist audio, build any lesson/scaffold logic. Reuse existing pieces (below); do not reimplement capture.

## Reuse (do not rebuild)

- `components/literacy/diagnostic/MicButton.tsx` — its `start()` already runs `startAudioCapture` AND Web Speech off ONE click. Mirror that pattern (or factor a small shared hook) so each attempt yields a Web Speech transcript+confidence AND a single captured audio blob.
- `lib/voice/audioCapture.ts` (`startAudioCapture`/`stopAudioCapture`) — **verify it returns a retrievable Blob.** If it does not expose the recorded bytes, use `MediaRecorder` directly in the page to obtain the blob. The blob is required to POST to the transcribe route.
- `lib/voice/uncertainty.ts` `computeUncertaintyScore({ asrConfidenceMean, asrTranscript, expectedText })`.
- Existing auth/dev-gating + `OPENAI_API_KEY` (already in env; used server-side only).

## `app/api/voice/transcribe/route.ts`

- POST `multipart/form-data` (audio blob) + `{ model, expectedText? }`. Returns `{ transcript, confidenceProxy: number|null, model, latencyMs }`.
- Calls OpenAI `audio.transcriptions` server-side. **Default model `gpt-4o-transcribe`; allow `whisper-1` via the request (baseline).** Record `latencyMs` around the API call.
- **Confidence:** record `avgLogprob`/segment/token confidence **only if the chosen model actually returns it** (gpt-4o-transcribe snapshots are parameter-limited). If absent, return `confidenceProxy: null` — **never fabricate a value.** Verify the current SDK/response shape at build time.
- **Over-normalization probe:** support an optional `prompt` + `temperature: 0` pass-through (whisper-1) so the tester can check whether biasing suppresses auto-correction.
- **Auth:** dev/admin only (reuse existing gating). **No audio persistence. No `ModelDecision`/DB write.** Key stays server-side.

## `app/dev/asr-check/page.tsx` (dev/admin-gated)

Renders the corpus from `specs/asr-reality-check-plan.md` with `surfaceType` tags:
- `isolated_word`: the real-word + miscue pairs and irregular controls (cake/cack, cape/cap, made/mad, lake/lack, game/gam, take/tack, name/nam, plate/plat; said, was; similar-word set cake/take, made/maid, cape/tape, lake/make).
- `isolated_word` pseudowords (validated a_e fixtures ONLY — `isPseudoword:true`): zake, mave, pame, vade, sape, nace, gake, tave. (Do NOT invent nonwords.)
- `connected_sentence` / `connected_passage`: the a_e Part-5 sentences + the "Dave's Cake" passage, read whole.

Per attempt (**the same-utterance rule is non-negotiable — do NOT "record twice"**):
1. One Record button → start `MicButton`-style capture: Web Speech listening AND one audio blob recording, under ONE generated `utteranceId`.
2. On stop: capture Web Speech `{ transcript, audioConfidence }` + `webspeech_latencyMs`; POST the **same** blob to `/api/voice/transcribe` → `{ transcript, confidenceProxy, latencyMs }`; compute `uncertaintyScore`.
3. Tester inputs: `phase` (A/B toggle), `surfaceType`, `target`, `groundTruthSource`, and (after replay for Phase B) `humanHeardAs` (allow `unclear`).
4. Append a row to an on-screen table with the EXACT schema:
   `utteranceId | phase | surfaceType | target | isPseudoword | groundTruthSource | humanHeardAs | webspeech_transcript | webspeech_conf | webspeech_latencyMs | whisper_transcript | whisper_confidence_or_proxy | whisper_latencyMs | uncertaintyScore | engineError | audioQualityNote | expectedFeedbackFamily | safe_branch`
5. **Delete the audio blob after the row is produced.** No storage.
- A "Copy table (CSV/markdown)" button so Jonathan can paste the result back. A model toggle (gpt-4o-transcribe / whisper-1) and an optional prompt/temperature field for the over-normalization probe.
- `safe_branch` / `expectedFeedbackFamily` may be left for post-hoc analysis (the page need not compute the verdict — that's the human read).

## Verification

`npx prisma validate` (no schema change expected) · `npx tsc --noEmit` · `npm run build`. Manual: open `/dev/asr-check`, record one isolated word → a row appears with BOTH engines' transcripts + latencies + uncertaintyScore tied to one `utteranceId`; record one connected sentence → row tagged `connected_sentence`; confirm no audio is persisted and no DB row is written.

## Stop — report

Diffs for the two files; a byte-diff confirming nothing else changed (no `lib/literacy`, no schema, no student route, no `ModelDecision`); confirmation that `audioCapture` returns a usable blob (or that `MediaRecorder` was used) and that the same blob feeds both engines under one `utteranceId`; the confirmed model + response shape for `gpt-4o-transcribe` (and whether a confidence proxy exists). Do NOT run the corpus or produce a verdict — Jonathan runs Phase A, then Phase B.

## After the harness

Jonathan runs Phase A (adult scripted correct+miscue) then Phase B (child, consent) → pastes the table → Claude writes the two surface-specific A/B/C verdicts + θ → Part-3 live-loop Codex spec (per `specs/reading-buddy-lesson-runtime-reconcile-and-scaffold-spec.md`). Cleanup: dev page deleted; transcribe route deleted OR promoted into the real voice path (proxy + consent-tiered retention + `ModelDecision`, mirroring `specs/voice-tts-upgrade`).
