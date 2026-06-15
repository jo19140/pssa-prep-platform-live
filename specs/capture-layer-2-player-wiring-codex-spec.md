# Capture Layer 2 — player capture wiring (Codex spec, v2 post-Pro)

**Date:** 2026-06-14 · Foundation: `capture-foundation-plan.md` · Layer 1 (live-smoked): `capture-layer-1-blob-upload-codex-spec.md`. Verified against `origin/main` (`caee276`). **v2 incorporates Pro's four blockers + verification.**
**STATUS: IMPLEMENTED + audited (`5c22896`, 2026-06-14) — mergeable.** All 4 blockers + invariants verified closed against code: segment-purge extension (opt-out/expiry/explicit all reach `segmentAudioKey`), atomic route (validate-before-upload + blob-delete on every DB-failure path), server-validated `expectedText` + auth-derived identity, explicit lazy session, server-derived `trainingCaptureEnabled` gating recorder *construction* (non-consented build no `MediaRecorder`), capture only on VAD-confirmed, no ASR/score, `labeledAt` null = unlabeled, recorder reuses VAD stream + full cleanup. Branch is stacked (Wave 1 + Layer 1 + Layer 2). **Clip-truncation follow-up: DONE + audited (`fc658ba`)** — `completeHeard` now awaits `clipRecorder.stop()` (flush while tracks live) before `stopActiveListening`, with a `completingRef` re-entry guard (try/finally, scoped to the flush window; `handleWordTap` no-ops during flush; encouragement tail outside the guard; defensive catch → capture failure invisible to child). All 9 audit points pass. **Runtime caveat remains:** live mic + consent + opt-out-purge smoke still needed.

**Goal:** capture **silly-word (pseudoword) reads** — the highest-value decoding signal — into the corpus, **for Tier-2-consented students only**, privately stored, unscored, ready for later human labeling. First real reads into the flywheel.

## Non-negotiable invariants (verify each in audit)
1. **Non-consented students get ZERO recording.** No `MediaRecorder`, no blob, no upload. Wave 1's VAD path stays **byte-identical** for them. Capture switches on only when a **server-derived** flag is true.
2. **Consent + identity are server-authoritative.** The lesson page (server) resolves `VoiceConsent.trainingCorpusOptedIn` → passes `trainingCaptureEnabled` to the player (UI gating only). The capture route **re-checks consent** and **derives `studentUserId` from auth** (STUDENT→self; ADMIN→explicit id + `canAccessStudent`). Never trust client-asserted consent or studentUserId.
3. **Only VAD-confirmed attempts are captured.** A clip is uploaded **only** when Wave 1's `heardSpeech()` succeeded. Silence-timeout, mic-denied, tap-confirm fallback, and failed VAD produce **no clip** (the lesson still completes normally).
4. **Pseudowords are NEVER scored / ASR'd.** No `/api/voice/transcribe`, no miscue/score event. Stored as a raw, unlabeled segment.
5. **Capture never blocks or alters the child's experience.** Best-effort; a failure is invisible to the child (but logged server-side so we can notice broken capture).
6. **Deletion must reach segment audio** (Blocker 1) and **no orphaned blobs** (Blocker 2) — see Lifecycle + Server.

## Data model (decided: VoiceSession + per-word LabeledVoiceSegment)
A pseudoword clip = (audio, target word, skill labels) — exactly a `LabeledVoiceSegment`.
- **One `VoiceSession` per silly-word block** (sessionType `PRACTICE`), retention from consent (`TRAINING`), session-level `audioStorageKey = null`.
- **One `LabeledVoiceSegment` per captured word:** `segmentAudioKey` = uploaded clip key; `expectedText` = the **server-validated** pseudoword; `phonogramCode`/`syllableType` = the target pattern; `segmentStartMs = 0`, `segmentEndMs = clipDurationMs`; `routedFromQueue = false`, `isEvalSet = false`.
- **Unlabeled state uses the existing signal — `labeledAt = null`** (there is no `labelStatus` enum; `labeledAt`/`humanTranscript`/`miscueType` start **null**; annotators fill them later). **Do not fake a label.** `asrTranscript = ""` is set only because the column is required and pseudowords are deliberately un-ASR'd — it means "no ASR," not "empty transcript."

## Lifecycle (Blocker 1 — REQUIRED, same PR)
Today **nothing deletes `segmentAudioKey`**; `purgeVoiceSessionAudio` only deletes the session-level key (and returns early when it's null — our case). **Extend `purgeVoiceSessionAudio`** (in this PR) to, for the session: delete **every** `LabeledVoiceSegment.segmentAudioKey` via `deleteVoiceAudioObject`, null those keys, and write a `voiceAudioDeletionLog` row per deleted object — then proceed with the existing session-key logic. Because `purgeAudioForStudent` (opt-out) and the retention-expiry cron both call `purgeVoiceSessionAudio`, this single fix covers **opt-out, retention expiry, and explicit deletion**. **Do not store any segment audio until this is implemented and tested.**

## Server — single atomic capture route (Blockers 2, 3, 4)
### `app/api/voice/capture/pseudoword/route.ts` (new)
- `POST`, `requireUser(["STUDENT","ADMIN"])`, **same-origin**, **rate-limited**, `multipart/form-data`.
- Body: the audio `Blob` + `{ voiceSessionId?, lessonTargetCode, expectedText, wordIndex, speakerAgeBand, clipDurationMs }`.
- **Identity + consent:** derive `studentUserId` from auth (STUDENT→self; ADMIN→explicit `studentUserId` + `canAccessStudent`). Load `VoiceConsent`; require `trainingCorpusOptedIn === true` → else **403**, store nothing.
- **Validate labels (Blocker 3):** recompute the lesson's pseudowords for `lessonTargetCode` (deterministic generator — `canonicalPseudowordsForTargetPatterns` / the lesson seed) and assert `expectedText` is one of them; derive `targetPattern` from that target server-side (don't trust a client `targetPattern`). On mismatch → **400**, store nothing.
- **Atomic upload+persist (Blocker 2):** validate MIME/size → `addVoiceAudioObject(bytes, pathname, contentType)` (Layer 1 helper, private store; pathname `voice/${studentUserId}/...`) → then in a try/catch:
  - If `voiceSessionId` absent (Blocker 4 — **first clip of the block**): create the `VoiceSession` (retention from consent) + the first `LabeledVoiceSegment`; **return `{ voiceSessionId }`**.
  - If `voiceSessionId` present: verify it belongs to `studentUserId`, then create the `LabeledVoiceSegment` linked to it.
  - **On any DB failure: `deleteVoiceAudioObject` the just-uploaded key** (no orphan). Cleanup only ever deletes the key this request just created.
- No `ModelDecision`, no transcript beyond `expectedText`. On unexpected failure, log a server warning (so broken capture is noticeable) and return non-2xx; the client swallows it.

> Layer 2 uses the Layer 1 **storage helper** directly (atomic). The standalone `/api/voice/audio/upload` route is not in the Layer 2 path.

### Lesson page (server) — pass the flag
- Resolve `trainingCorpusOptedIn` server-side; pass `trainingCaptureEnabled` (+ `studentUserId`, `lessonTargetCode`) into the player. Default false if no consent row.

## Client changes
### `lib/voice/voiceActivity.ts`
- Expose the live `MediaStream` on the public `VoiceActivityHandle` (`readonly stream: MediaStream`). **No VAD behavior change.**

### `lib/voice/captureRecorder.ts` (new)
- `startClipRecorder(stream) → { stop(): Promise<Blob | null> }` via `MediaRecorder` on the **existing** VAD stream. No second `getUserMedia`. `stop()` resolves the finalized clip (or null on error).

### `lib/voice/captureClient.ts` (new)
- `capturePseudowordClip({ blob, voiceSessionId?, lessonTargetCode, expectedText, wordIndex, speakerAgeBand, clipDurationMs })` → POST to the capture route; thread back the returned `voiceSessionId` for subsequent words. **Best-effort: swallow all errors.**

### `components/literacy/StudentPracticeSession.tsx` — `ListenForReadingAttempt`
- New props `trainingCaptureEnabled?: boolean` (default **false**), `studentUserId`, `lessonTargetCode`. Only the **pseudoword** usage opts in.
- **When `trainingCaptureEnabled !== true`: construct NO recorder** — identical to today (invariant 1).
- When enabled + `surface === "pseudoword"`: on listening start, `startClipRecorder(handle.stream)`. **Only on `heardSpeech` (VAD-confirmed), in `completeHeard`, BEFORE `stopActiveListening()` stops the tracks:** `stop()` the recorder → if a blob, fire-and-forget `capturePseudowordClip(...)` (carry the block's `voiceSessionId`). Then run the unchanged Wave 1 flow.
- On silence-timeout / fallback / retry / word-change / unmount / part-transition: **stop the recorder, discard the blob**, no upload, plus the existing VAD/stream teardown. No hot mic.

## Acceptance / tests
- **Non-consented = no capture:** flag false → no `MediaRecorder` constructed, no upload; Wave 1 VAD/gate/fallback byte-identical.
- **Consented happy path:** a VAD-confirmed silly word → clip in private store → `VoiceSession` (first word) + `LabeledVoiceSegment` with server-validated `expectedText`, `labeledAt`/`humanTranscript` null, `asrTranscript=""`, `segmentAudioKey` set, retention `TRAINING`; later words attach to the same `voiceSessionId`.
- **Only VAD-confirmed captured:** silence/fallback/mic-denied → no clip, no row.
- **Label integrity:** `expectedText` not in the lesson's generated pseudowords → 400, blob deleted, no row.
- **Atomicity:** forced DB failure after upload → the uploaded blob is deleted (no orphan).
- **Deletion reaches segments:** opt-out / retention purge / explicit purge deletes all `segmentAudioKey`s + logs them (extend + test `purgeVoiceSessionAudio`).
- **Never blocks lesson:** forced upload failure → normal child flow, server warning logged.
- **No scoring:** no `/api/voice/transcribe`, no miscue/score event from the pseudoword surface.
- **Cleanup:** recorder + stream + VAD torn down on every transition/unmount.
- `tsc --noEmit`, `npm run build`, `scripts/test-voice-activity.ts` pass.

## Do NOT
Record for non-consented students (no `MediaRecorder` at all) · trust client consent/identity/`expectedText`/`targetPattern` · capture non-VAD-confirmed attempts · score/ASR pseudowords · fake a label (`labeledAt` stays null) · leave an orphaned blob on DB failure · store segment audio before purge covers `segmentAudioKey` · let capture block/alter the lesson · open a second mic stream · store transcript/`ModelDecision`.

## Scope
Clean branch off `origin/main`. Touch only: `lib/voice/storage.ts` (extend `purgeVoiceSessionAudio` for segment keys), `lib/voice/voiceActivity.ts` (expose stream), `lib/voice/captureRecorder.ts` (new), `lib/voice/captureClient.ts` (new), `components/literacy/StudentPracticeSession.tsx`, the lesson page server file (flag), `app/api/voice/capture/pseudoword/route.ts` (new), and tests.
