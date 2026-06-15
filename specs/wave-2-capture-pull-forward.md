# Wave 2 — pull-forward sketch: capture silly-word (pseudoword) reads

**Date:** 2026-06-14 · Decision sketch (not a build spec yet) · Verified against `origin/main` (`caee276`).
**Question it answers:** Jonathan asked why Wave 1 doesn't store silly-word audio, given pseudoword reads are the highest-value decoding data. This sketches what it takes to capture them sooner.

## The case for pulling it forward
Pseudoword reads are the **purest decoding signal** — a child reading "gake" correctly proves they applied the rule to a novel string with no real-word shortcut. Per `asr-strategy.md` that's the gold of the training corpus and the moat. So if any single capture surface justifies building storage first, it's this one.

## What ALREADY exists on `origin/main` (the surprise — most of the stack is here)
Confirmed wired, not stubs:
- **Consent:** `VoiceConsent` model (two-tier — service audio + `trainingCorpusOptedIn`), `lib/voice/consent.ts` (`ensureVoiceConsent`, `updateVoiceConsent`, `retentionForVoiceSession`), consent API (`app/api/voice/consent/[studentId]/…`), and a **purge-training-corpus** route.
- **Session + retention model:** `VoiceSession` with `audioStorageKey`, `retentionTier`, `audioDeletedAt`; `db.voiceSession.create(...)` already called by `app/api/literacy/voice-session/route.ts` and `speed-drill/route.ts` (storageKey nulled when `retentionTier === "NONE"`).
- **Lifecycle:** `purgeVoiceSessionAudio` + `deleteVoiceAudioObject` (`lib/voice/storage.ts`), retention-expiry cron (`lib/voice/retentionJobs.ts`), audio-serving route (`app/api/voice/audio/session/[id]`), corpus **export** (`app/api/voice/exports/create`), admin `CorpusExportPanel`, parent voice-sessions page.

## The two real gaps
1. **No object-storage backend.** Nothing uploads an encrypted blob to produce `audioStorageKey` — no S3/GCS/R2 client is wired. Today `audioStorageKey` is just *accepted as input* and the serving route can fetch an https URL; the actual write step doesn't exist.
2. **The lesson player isn't wired to capture.** `StudentPracticeSession` is process-and-drop. The silly-word surface in Wave 1 deliberately uses on-device VAD with **no `MediaRecorder`**. Capturing for the corpus means (for Tier-2-consented students only) recording the blob and POSTing it to a storage+session path.

## Minimum work to capture silly words (Tier-2 only)
1. **Storage backend** (`lib/voice/objectStorage.ts` + env): an encrypted bucket (S3/R2/GCS), server-side `putAudioObject(bytes) → audioStorageKey`, private by default, served via the existing `audio/session/[id]` route (signed/short-lived). This is the one genuinely new infra piece.
2. **A capture path for the player:** for a student whose consent has `trainingCorpusOptedIn === true`, on a silly-word read, capture the blob (the `audioCapture.ts` MediaRecorder that Wave 1 avoids), POST to a route that `putAudioObject` → `voiceSession.create({ audioStorageKey, retentionTier: from consent, surface:"pseudoword", targetPattern, … })`. Reuse `retentionForVoiceSession`.
3. **Hard gate:** default OFF. No `trainingCorpusOptedIn` → unchanged process-and-drop (and Wave 1's VAD-only path). Never capture without a current Tier-2 consent row. Label each clip with surface = pseudoword, the target pattern, and `speakerAgeBand` (the highest-value metadata).
4. **Reuse existing** purge/retention/export/parent-view as-is — no new lifecycle code.

## What stays TRUE regardless (do not weaken)
- Tier-1 (Wave 1) stays storage-free; this adds a **separate, consent-gated** Tier-2 capture path.
- Pseudowords are **still never ASR-scored** — capture ≠ scoring. We store the audio for future training; Harper still only does VAD-confirm + encourage on this surface.
- No raw audio/text in `ModelDecision`; storage is the encrypted bucket + `VoiceSession`, gated by verifiable parental consent, with retention + deletion already enforced.

## Honest cost / sequencing call
Smaller than "build Wave 2," because consent + session + retention + deletion + export already exist. The real lift is **the encrypted object-storage backend + the player capture wiring** — call it the storage backend (the bulk) plus a focused capture PR. Trade-off: doing this now means the next build is infra (storage) rather than the lighter Part-1/silly-word listen polish. If the decoding corpus is the priority, this is a defensible re-order; if a clean demoable single-lesson experience is the priority, finish Wave 1 first. **Jonathan's call.**

## Open items to confirm before speccing
- Is `app/api/literacy/voice-session/route.ts` already the path the *lesson player* uses, or only speed-drill? (Wire vs. add.)
- Storage vendor choice (S3 / R2 / GCS) + encryption-at-rest posture + region.
- Does current Tier-2 consent UI actually collect `trainingCorpusOptedIn` from parents end-to-end, or only model it?
