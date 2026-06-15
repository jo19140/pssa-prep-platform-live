# Capture foundation — bottom-up build plan (child-reading data flywheel)

**Date:** 2026-06-14 · Verified against `origin/main` (`caee276`).
**Why:** capture is the moat (`asr-strategy.md`). The lesson currently drops every read; every uncaptured read is corpus lost forever. This builds the production capture path **foundation-up**, starting from secure storage.

## Verified state (what's already built — most of the stack)
- **Consent (Tier-2 training opt-in): BUILT end-to-end.** `VoiceConsent` model, parent-auth route (`requireUser(["PARENT","ADMIN"])`), onboarding opt-in (`DialectOnboardingFlow`), settings toggle (`VoiceConsentSettings`), token parental-consent flow (`app/parental-consent/[token]`), retention tier derived from consent (`recordStudentEvent` → `TRAINING`), opt-out purge.
- **Session + lifecycle: BUILT.** `VoiceSession` (`audioStorageKey`/`retentionTier`/`audioDeletedAt`), `voice-session` create route, `retentionForVoiceSession`, `purgeVoiceSessionAudio` + `deleteVoiceAudioObject` (Vercel Blob `del`), retention-expiry cron, deletion log, audio **access-controlled + logged serving route** (`app/api/voice/audio/session/[id]` — auth, role checks, `voiceAudioAccessLog`, 404-on-deleted, server-side proxy with `no-store`), corpus export, parent/admin UIs.

## The decision (settled): private Vercel Blob store
The storage backend is **Vercel Blob** (`@vercel/blob ^2.3.3`; `del` already wired). The existing `put()` calls in the app all use **`access: "public"`** — **unacceptable for a child's voice** (a public blob URL is fetchable by anyone who has it, bypassing the route's auth/logging; that's obscurity, not access control).
Vercel now offers **Private Storage** (public beta): private stores require auth on every read/write, URLs are `*.private.blob.vercel-storage.com` (not public), and **signed URLs** (time-bound, scoped) are available for secure download. ([sources below])
**→ Children's voice audio goes in a PRIVATE Vercel Blob store**, served only through the existing authed/logged route via signed URLs. Encrypted at rest by the provider. (Beta-status caveat: acceptable and Vercel-native, but flagged.)

## The two real gaps (bottom-up build order)
- **Layer 1 — private upload route (the missing half of storage).** Nothing uploads voice audio; the `voice-session` route only *accepts* a key as input. Build the consent-gated `put()`-to-private-store counterpart to `deleteVoiceAudioObject`, returning `audioStorageKey`. *(spec: `capture-layer-1-blob-upload-codex-spec.md`)*
- **Layer 2 — player capture wiring.** The lesson player (`StudentPracticeSession`) is process-and-drop and calls none of this. For **Tier-2-consented students only**, record the read (MediaRecorder), upload via Layer 1, create a `VoiceSession` with the key + retention. Start with **silly-word (pseudoword) reads** — the highest-value decoding signal. *(spec later, after Layer 1 audited)*

## Bedrock invariants (every layer must hold)
- **Consent is the gate.** No `trainingCorpusOptedIn === true` → **no capture, no upload, no storage.** Default is process-and-drop (unchanged). The Wave 1 VAD surfaces stay storage-free unless this consent path is active.
- **Private only.** Never `access: "public"` for voice. Access only via the authed/logged serving route + signed URLs.
- **Pseudowords are still never ASR-scored.** Capture ≠ scoring — we store audio for future training; Harper still only VAD-confirms + encourages on that surface.
- **Retention + deletion already enforced** — reuse `retentionForVoiceSession` / `purgeVoiceSessionAudio`; never write a new lifecycle path.
- **No raw audio/text in `ModelDecision`.** Storage is the private blob + `VoiceSession` row only.
- **Child-first labeling:** every clip tagged surface (`pseudoword`/etc.), target pattern, `speakerAgeBand` — the metadata that makes the corpus valuable.

## Sequencing / cost note
Layer 1 is small (one route + one storage helper) and is the genuine new infra. Get it audited before Layer 2. Private-store pricing is the one ongoing cost; a child's short reads are tiny, but set the retention policy deliberately (capture the gold — failures, uncertain reads, the labeled subset — not everything forever).

## Sources
- [Private Storage — Vercel Blob](https://vercel.com/docs/vercel-blob/private-storage)
- [Private storage for Vercel Blob, now available in public beta](https://vercel.com/changelog/private-storage-for-vercel-blob-now-available-in-public-beta)
- [Vercel Signed URLs](https://vercel.com/docs/vercel-blob/vercel-signed-urls)
- [Security — Vercel Blob](https://vercel.com/docs/vercel-blob/security)
