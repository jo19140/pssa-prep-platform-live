# Reading Buddy v1 · Audio Retention Patch

**Status:** In-flight patch for Codex during v1 execution
**Date:** 2026-05-24
**Patches:** `specs/reading-buddy-v1-codex-spec.md` §3.2 (`VoiceSession` model) and §5 (voice-session API endpoints)
**Enables:** clean additive migration for `specs/voice-data-flywheel-codex-spec.md` after v1 ships

---

## 1. Purpose

The voice-data-flywheel spec (post-v1) will introduce two-tier consent and a retention-enforcement cron. To keep that migration purely additive — instead of having to retrofit retention metadata into already-shipped session save paths — v1 should emit two extra fields on every `VoiceSession` it creates.

This patch adds **exactly two fields** to `VoiceSession` and sets their defaults at write time. Nothing else. No consent UI, no consent model, no retention enforcement, no labeling — those all land in the voice-data-flywheel spec after v1 is done.

---

## 2. Schema Patch

Add these two fields to the `VoiceSession` model defined in `specs/reading-buddy-v1-codex-spec.md` §3.2:

```prisma
// Patch additions to VoiceSession
retentionTier    String    @default("SERVICE")  // "SERVICE" (90-day) | "TRAINING" (extended) | "NONE" (no retention)
deleteAfterDate  DateTime?
```

If Codex has already created and applied the v1 migration that adds `VoiceSession`, ship a follow-on migration that adds just these two fields. If the v1 migration hasn't yet been generated, fold these fields into it.

---

## 3. Write-Time Defaults

Anywhere v1 creates a `VoiceSession` row — at minimum the handlers for:

- `POST /api/literacy/voice-session` (from v1 §5)
- `POST /api/literacy/speed-drill` (from v1 §5)
- any other code path that inserts a `VoiceSession`

set these fields on insert:

```ts
retentionTier: "SERVICE",
deleteAfterDate: addDays(startedAt, 90),
```

Use a single helper (e.g., `lib/voice/retention.ts → defaultRetention(startedAt)`) so the post-v1 spec can extend the logic in one place when consent state is introduced.

---

## 4. What This Patch Does NOT Do

To prevent scope creep during v1:

1. **No consent model.** `VoiceConsent` and `VoiceConsentDecision` are post-v1.
2. **No consent UI.** The dialect onboarding final step that surfaces training-corpus opt-in is post-v1.
3. **No retention enforcement.** v1 sets `deleteAfterDate` but does not delete audio when it passes. The nightly cron is post-v1.
4. **No labeling tool.** Post-v1.
5. **No changes to audio storage buckets or paths.** v1 keeps whatever storage pattern it was already implementing.
6. **No changes to existing v1 components or UI surfaces.**

---

## 5. Acceptance

Every `VoiceSession` row created by v1 has:

- `retentionTier = "SERVICE"`
- `deleteAfterDate = startedAt + 90 days`

Verified by: a unit test on the voice-session insert path, and a quick query against the dev DB after the diagnostic, practice, and speed-drill flows are exercised end-to-end.

---

## 6. Hand-off

After v1 ships and this patch is in, Codex's next task is `specs/voice-data-flywheel-codex-spec.md`, which:

- Adds `VoiceConsent`, `VoiceConsentDecision`, `LabeledVoiceSegment`, `TrainingCorpusBatch`, `VoiceAudioDeletionLog`.
- Adds the remaining `VoiceSession` field additions (`audioDeletedAt`, `asrVendor`, `asrModelVersion`, `asrConfidenceMean`).
- Wires the retention enforcement cron, the parent consent UI, and the internal labeling tool.

Because v1 already emits `retentionTier` and `deleteAfterDate`, that migration is purely additive — no backfill, no retrofit of session save paths.

---

**End of patch.**
