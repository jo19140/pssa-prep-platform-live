# Voice Data Flywheel · Codex Implementation Spec

**Status:** Draft for Codex execution
**Author:** Jonathan Diaz (with Claude assistance)
**Date:** 2026-05-24
**Companion to:** `specs/reading-buddy-v1-codex-spec.md` (Reading Buddy v1 chassis)
**Source of truth for pedagogy:** `memory/reference_phonogram_methodology.md`
**Source of truth for brand:** `memory/project_synesis_brand_decision.md`

---

## 1. Overview

This spec covers the **voice data flywheel** — the infrastructure that captures voice sessions, manages parental consent, builds a labeled corpus of kids' reading-aloud audio, and prepares the platform to fine-tune speech models on its own user base over time.

The strategic goal: every kid who uses Reading Buddy generates data that, over 2-3 years, becomes a proprietary asset competitors can't replicate. The execution principle: **start cheap, capture broadly, label selectively, fine-tune later.** This spec covers Stages 0 and 1 (capture infrastructure + labeling MVP) and lays the schema and architecture groundwork for Stages 2-5.

This is **not** a spec for training an ASR model. Model training is deferred to a future spec (`specs/voice-fine-tuning-codex-spec.md`) once the corpus is large enough to justify it (~10,000+ labeled segments).

---

## 2. Consent Model — The Foundation

The product uses a **two-tier consent model** that is COPPA-compliant, school-district-sellable, and parent-trust-reinforcing.

### Tier 1: Service-operation audio (default ON, parent can opt out)

Audio retained for up to **90 days** to support service operation: scoring reads, generating feedback, populating autopilot decisions, parent voice-session playback. This is what COPPA refers to as "operation of the service" and does not require explicit opt-in beyond the general privacy policy and notice surfaced at signup.

- **Default state:** ON.
- **Parent control:** can disable at any time. If disabled, live audio is still processed in-session for scoring, but no audio object is persisted.
- **Retention:** 90 days from session date, then auto-deleted.
- **Visibility:** parent can listen to and delete any individual session at any time.

### Tier 2: Training-corpus audio (explicit opt-in only)

Audio retained beyond 90 days, used to improve speech recognition and miscue detection for all users. **This requires verifiable parental opt-in.** Default is OFF.

- **Default state:** OFF. No retention beyond 90 days unless opt-in is captured.
- **Consent surface:** explicit toggle in the dialect onboarding flow and in parent settings, with clear copy: *"Help Reading Buddy get better — we'll keep your child's recordings to improve how the program listens to kids. You can change your mind anytime."*
- **Granularity:** parent can opt in to "improve the product" (standard) and separately to "may be used in published research" (rare, for academic partnerships only).
- **Revocability:** parent can opt out at any time. On opt-out, the program **purges all training-tier audio** for that student within 30 days and removes labeled segments from future training batches.

### Why this model

- **COPPA-compliant.** Secondary uses (training) require explicit opt-in per FTC guidance. Service operation is covered by notice.
- **School-sellable.** Districts will not enroll under a default-on training model. Two-tier preserves the path to school sales.
- **Parent trust.** Default-on for training is the single most common ed-tech compliance failure pattern. The two-tier model is the well-trodden compliant path.
- **Still produces a flywheel.** Service-tier audio (90 days) is fully usable for short-term active learning and eval-set construction. Training-tier opt-in typically pulls 40-60% of families when the value prop is clearly stated.

---

## 3. In Scope / Out of Scope

### In scope (this spec)

- Database schema for: consent state per user, consent decision log, voice session retention tier, labeled segment storage, training corpus batch tracking.
- Consent surfaces: opt-in toggles in dialect onboarding and parent settings; consent versioning; consent decision audit log.
- Audio storage policy: tier-aware retention, scheduled deletion job, audit trail of deletions.
- Internal labeling tool MVP: web UI for annotators to review session audio, correct transcripts, tag miscue types, and flag uncertainty.
- Active-learning queue: scoring sessions for uncertainty and routing the highest-value ones to the labeling tool.
- Eval-set export: tool for exporting a labeled JSONL manifest suitable for measuring WER or fine-tuning later.
- Privacy controls: encryption at rest, authenticated reads, no PII in filenames, dev/prod bucket separation.

### Out of scope (deferred)

- **Actual model training or fine-tuning.** Deferred to `specs/voice-fine-tuning-codex-spec.md` once corpus is sized (~10,000+ labeled segments).
- **Custom acoustic model.** Stage 5+ work, year 2-3.
- **Vendor swap from Whisper to SoapBox Labs.** Deferred to `specs/voice-vendor-evaluation-codex-spec.md` (pilot evaluation will inform the swap).
- **Real-time barge-in via Pipecat/LiveKit.** Separate UX spec.
- **TTS upgrade from browser SpeechSynthesis to OpenAI TTS / ElevenLabs.** Already named in the v1 spec; separate small TTS upgrade spec to follow.
- **Public researcher API for the labeled corpus.** Not for v1.

---

## 4. Database Schema Changes

All additions to `prisma/schema.prisma`. Extends models introduced in the Reading Buddy v1 spec.

### 4.1 New models

```prisma
model VoiceConsent {
  id                          String    @id @default(cuid())
  // The consent record is for a STUDENT user; the consent itself is given by a parent/guardian
  studentUserId               String    @unique
  // Tier 1: service-operation audio (default ON, parent can opt out)
  serviceAudioRetained        Boolean   @default(true)
  serviceAudioRetentionDays   Int       @default(90)
  // Tier 2: training-corpus audio (default OFF, explicit opt-in required)
  trainingCorpusOptedIn       Boolean   @default(false)
  trainingCorpusOptedInAt     DateTime?
  trainingCorpusOptedOutAt    DateTime?
  // Optional research-publication consent (Tier 2.5)
  researchPublicationOptedIn  Boolean   @default(false)
  researchPublicationOptedInAt DateTime?
  // Provenance & versioning
  consentTextVersion          String    // e.g. "v1.0" — which consent copy was shown
  consentLastUpdatedAt        DateTime  @default(now())
  consentLastUpdatedByUserId  String?   // parent/guardian who made the last change
  createdAt                   DateTime  @default(now())

  student                     User      @relation("StudentConsent", fields: [studentUserId], references: [id], onDelete: Cascade)
  decisionLog                 VoiceConsentDecision[]

  @@index([trainingCorpusOptedIn])
}

model VoiceConsentDecision {
  id                String    @id @default(cuid())
  voiceConsentId    String
  changeType        String    // "INITIAL_DECISION" | "TRAINING_OPT_IN" | "TRAINING_OPT_OUT" | "RESEARCH_OPT_IN" | "RESEARCH_OPT_OUT" | "SERVICE_DISABLED" | "SERVICE_ENABLED" | "RETENTION_CHANGED"
  previousValue     Json?     // snapshot of prior state for audit
  newValue          Json      // snapshot of new state
  consentTextVersion String
  ipAddress         String?   // for verifiable parental consent audit trail (COPPA)
  userAgent         String?
  changedByUserId   String?   // parent/guardian user id
  createdAt         DateTime  @default(now())

  voiceConsent      VoiceConsent @relation(fields: [voiceConsentId], references: [id], onDelete: Cascade)

  @@index([voiceConsentId, createdAt])
}

model LabeledVoiceSegment {
  id                  String        @id @default(cuid())
  voiceSessionId      String
  // The slice of audio being labeled
  segmentStartMs      Int
  segmentEndMs        Int
  segmentAudioKey     String?       // optional sub-clip key; null if the labeler works against the full session audio
  // What was expected vs what happened
  expectedText        String        @db.Text
  asrTranscript       String        @db.Text  // raw output from ASR vendor
  humanTranscript     String?       @db.Text  // ground truth from annotator, may equal asrTranscript if no correction needed
  // Pedagogical labels
  miscueType          String?       // see enum-like values in §4.3
  phonogramCode       String?       // phonogram being practiced, references PhonogramFamily.code
  syllableType        SyllableType?
  // Dialect handling
  dialectTransferTag  String?       // e.g. "AAE_FINAL_TH_F" — present only if labeler identifies a dialect transfer
  // Active learning support
  uncertaintyScore    Float?        // 0.0-1.0 — higher means more uncertain, higher routing priority
  routedFromQueue     Boolean       @default(false)
  // Annotation provenance
  labeledByUserId     String?
  labeledAt           DateTime?
  labelerNotes        String?       @db.Text
  // Eval vs training disposition
  isEvalSet           Boolean       @default(false)  // protected from training use; only used for measurement
  createdAt           DateTime      @default(now())

  voiceSession        VoiceSession  @relation(fields: [voiceSessionId], references: [id], onDelete: Cascade)

  @@index([voiceSessionId, segmentStartMs])
  @@index([labeledAt])
  @@index([miscueType])
  @@index([isEvalSet])
}

model TrainingCorpusBatch {
  id                String        @id @default(cuid())
  batchName         String        @unique
  exportPurpose     String        // "EVAL_SET" | "FINE_TUNE_TRAINING" | "FINE_TUNE_VALIDATION" | "RESEARCH_EXPORT"
  segmentCount      Int
  totalDurationMs   Int
  manifestStorageKey String       // JSONL manifest path in object storage
  exportedAt        DateTime      @default(now())
  exportedByUserId  String
  // Audit: which consent versions were honored at export time
  minimumConsentVersion String
  excludedSegmentCount  Int       @default(0)  // segments excluded due to opt-out, retention expiry, etc.
  notes             String?       @db.Text

  @@index([exportPurpose, exportedAt])
}

model VoiceAudioDeletionLog {
  id                  String    @id @default(cuid())
  voiceSessionId      String?   // null if session record itself was already deleted
  studentUserId       String?
  audioStorageKey     String
  deletionReason      String    // "RETENTION_EXPIRY" | "PARENT_REQUEST" | "TRAINING_OPT_OUT" | "ACCOUNT_DELETION" | "DSR_REQUEST"
  triggeredByUserId   String?
  deletedAt           DateTime  @default(now())

  @@index([studentUserId, deletedAt])
  @@index([deletedAt])
}
```

### 4.2 Field additions to existing models

```prisma
// Add to VoiceSession (introduced in Reading Buddy v1 spec)
retentionTier        String        @default("SERVICE")  // "SERVICE" (90-day) | "TRAINING" (extended) | "NONE" (no retention)
deleteAfterDate      DateTime?
audioDeletedAt       DateTime?
asrVendor            String?       // "WHISPER" | "SOAPBOX" | etc. — track which vendor produced asrTranscript for fair comparison later
asrModelVersion      String?       // vendor model version string
asrConfidenceMean    Float?        // mean word-level confidence, used to feed uncertaintyScore on segments

// Add to User
voiceConsent         VoiceConsent? @relation("StudentConsent")
```

### 4.3 Miscue type vocabulary (string constants, not a Prisma enum)

Kept as string constants in `lib/voice/miscueTypes.ts` rather than a Prisma enum so taxonomy can evolve without migrations:

```ts
export const MISCUE_TYPES = {
  CORRECT: "CORRECT",
  SUBSTITUTION: "SUBSTITUTION",                       // said wrong word
  OMISSION: "OMISSION",                                // skipped word
  INSERTION: "INSERTION",                              // added word
  SELF_CORRECTION: "SELF_CORRECTION",                  // said wrong, then fixed
  HESITATION: "HESITATION",                            // paused mid-word
  REPETITION: "REPETITION",                            // re-read word/phrase
  MISPRONUNCIATION: "MISPRONUNCIATION",                // recognizable attempt but phonetic miss
  DECODING_ERROR: "DECODING_ERROR",                    // letter-by-letter failure
  EXPECTED_DIALECT_TRANSFER: "EXPECTED_DIALECT_TRANSFER", // not an error — dialect-appropriate variant
  UNINTELLIGIBLE: "UNINTELLIGIBLE",                    // ASR + labeler can't tell what was said
} as const;
```

### 4.4 Indexes & retention enforcement

- A nightly cron job (`scripts/voice/enforce-retention.ts`) deletes audio objects where `VoiceSession.deleteAfterDate < NOW()` and writes a `VoiceAudioDeletionLog` entry per deletion. Sets `VoiceSession.audioDeletedAt`; does **not** delete the `VoiceSession` row itself (transcript and metadata are retained for autopilot history; only the audio object is purged).
- When `VoiceConsent.trainingCorpusOptedOutAt` is set, a job purges all `LabeledVoiceSegment` records for that student from future training-batch exports (sets a `student_opted_out_at_export` exclusion flag computed at export time).

---

## 5. New & Updated Routes

All under `app/`. Use existing auth/rateLimit patterns.

### Parent-facing consent surfaces

| Route | Component | Purpose |
|---|---|---|
| `app/parent/settings/voice/page.tsx` | `components/literacy/VoiceConsentSettings.tsx` | Parent dashboard for voice retention and training-corpus opt-in. Shows current state, history of changes, and lets parent toggle. |
| `app/onboarding/listening/page.tsx` (extend, from v1 spec) | `components/literacy/DialectOnboardingFlow.tsx` (extend) | Add an optional final step: training-corpus opt-in card. Skip-able like all dialect-onboarding steps. |

### Internal labeling tool

| Route | Component | Purpose |
|---|---|---|
| `app/admin/voice/labeling/page.tsx` | `components/admin/voice/LabelingQueuePage.tsx` | Admin-only queue view: shows highest-uncertainty segments awaiting labels. |
| `app/admin/voice/labeling/[segmentId]/page.tsx` | `components/admin/voice/LabelingWorkspace.tsx` | Single-segment labeling workspace: audio playback + expected text + ASR transcript + correction field + miscue tag picker + phonogram picker + dialect-transfer field + uncertainty rating + notes. |
| `app/admin/voice/eval-set/page.tsx` | `components/admin/voice/EvalSetManager.tsx` | View/manage segments marked as `isEvalSet = true`. Promote labeled segments to eval set. |
| `app/admin/voice/exports/page.tsx` | `components/admin/voice/CorpusExportPanel.tsx` | Trigger and view `TrainingCorpusBatch` exports. |

All admin routes gated by an `ADMIN` or new `VOICE_ANNOTATOR` role (see §6).

---

## 6. API Endpoints

All under `app/api/`. Follow existing auth/rateLimit patterns.

### Consent endpoints

| Method + Path | Purpose | Auth |
|---|---|---|
| `GET /api/voice/consent/:studentId` | Return current `VoiceConsent` state + decision log | Parent (linked), Student (self if 13+), Admin |
| `POST /api/voice/consent/:studentId` | Update consent. Writes `VoiceConsentDecision` audit entry. Body: `{ serviceAudioRetained?, trainingCorpusOptedIn?, researchPublicationOptedIn? }` | Parent (linked), Admin |
| `POST /api/voice/consent/:studentId/purge-training-corpus` | On training opt-out, schedule purge job. Returns expected completion date (within 30 days). | Parent (linked), Admin |

### Labeling endpoints

| Method + Path | Purpose | Auth |
|---|---|---|
| `GET /api/voice/labeling/queue?limit=50` | Return highest-uncertainty unlabeled segments | Voice annotator, Admin |
| `GET /api/voice/labeling/segment/:id` | Return segment + parent voice session + signed audio URL | Voice annotator, Admin |
| `POST /api/voice/labeling/segment/:id` | Submit labels: `{ humanTranscript, miscueType, phonogramCode, syllableType, dialectTransferTag, labelerNotes, isEvalSet }` | Voice annotator, Admin |
| `POST /api/voice/labeling/segment/:id/skip` | Mark segment as low-value (e.g., bad audio) without labeling | Voice annotator, Admin |

### Eval set & exports

| Method + Path | Purpose | Auth |
|---|---|---|
| `POST /api/voice/eval-set/promote/:segmentId` | Promote a labeled segment to the eval set (`isEvalSet = true`) | Admin |
| `POST /api/voice/exports/create` | Create a `TrainingCorpusBatch` export. Body: `{ purpose, minDateRange?, maxDateRange?, includeEvalSet?: false }`. Excludes opted-out students. | Admin |
| `GET /api/voice/exports` | List recent batches | Admin |
| `GET /api/voice/exports/:id/manifest` | Download the JSONL manifest for a batch | Admin |

### Internal: retention enforcement (not an HTTP endpoint)

`scripts/voice/enforce-retention.ts` — runs nightly via cron. Deletes expired audio objects, writes deletion log entries, sets `audioDeletedAt`.

---

## 7. Component Changes

### Extend

- `components/literacy/DialectOnboardingFlow.tsx` (from v1 spec) — add a final optional step for training-corpus consent. Skip-able. Default is *not* opt-in; explicit toggle required.
- `components/literacy/ParentVoiceSessionsPage.tsx` (from v1 spec) — add a "Voice settings" link in the header pointing to `app/parent/settings/voice/page.tsx`.

### Create new

- `components/literacy/VoiceConsentSettings.tsx` — parent-facing consent toggles, retention slider (30/60/90 days, default 90), decision history view.
- `components/literacy/VoiceConsentExplainerCard.tsx` — reusable card explaining the two tiers in plain English; embedded in onboarding and settings.
- `components/admin/voice/LabelingQueuePage.tsx`
- `components/admin/voice/LabelingWorkspace.tsx` — audio waveform + playback, expected text alongside ASR transcript with diff highlighting, miscue tag picker, phonogram picker, dialect-transfer field, uncertainty slider, notes field, keyboard shortcuts (J/K to navigate, 1-9 to tag miscue type).
- `components/admin/voice/EvalSetManager.tsx`
- `components/admin/voice/CorpusExportPanel.tsx`
- `components/admin/voice/MiscueTagPicker.tsx` — reusable miscue-type chip selector.

### Role addition

Add a new user role `VOICE_ANNOTATOR` to the existing role enum / auth check, scoped to the admin labeling routes only. Used for hiring part-time annotators (reading specialists, SLPs, etc.) without granting full admin access.

---

## 8. Consent Copy

The exact strings shown to parents. Treat these as product-critical and reviewed copy.

### Tier 1 — Service-operation retention (default ON, in dialect onboarding)

> **Reading Buddy keeps recordings of your child's reading sessions for up to 90 days.**
>
> This lets you listen to today's session, see how your child is improving over time, and helps the program give better feedback. You can change this anytime in your voice settings.
>
> [✓] Keep recordings for 90 days (default)
> [Adjust retention] — 30 / 60 / 90 days
> [Turn off recording] — the program still listens during sessions, but no audio is saved.

### Tier 2 — Training-corpus opt-in (default OFF, separate card)

> **Help Reading Buddy get better at listening to kids like yours.**
>
> Most reading programs are built for adult voices and miss the way kids — especially kids who speak different dialects or who are learning English — actually sound. With your permission, we'll keep your child's recordings longer than 90 days and use them to help our program listen more accurately.
>
> We will:
> - Keep your child's name and identifying info out of any training data
> - Never sell, share, or publish recordings
> - Let you turn this off and delete past recordings at any time
>
> [ ] Yes, you can keep my child's recordings to improve the program
> [Skip for now]

### Research opt-in (default OFF, separate small toggle in settings only — not in onboarding)

> **Allow your child's anonymized recordings to be used in published research?**
>
> We sometimes partner with university research groups studying how kids learn to read. Your child's recordings would be stripped of all identifying info and used only in studies about literacy development. This is separate from improving Reading Buddy.
>
> [ ] Yes, you may include my child's recordings in published research

### Consent versioning

Each block above is tagged with a `consentTextVersion`. Any change to the wording bumps the version. When a parent makes a consent decision, `VoiceConsentDecision.consentTextVersion` records which version they saw. If wording materially changes, parents who consented under a prior version must re-consent (handled by a one-time banner when their version is below the current minimum).

---

## 9. Privacy & Security Requirements

### Storage

- All audio objects stored in object storage (extend existing reading-coach pattern from v1 spec).
- **Authenticated reads only.** Never public URLs. Signed URLs with short expirations (15 minutes) for parent playback.
- Encrypted at rest (server-side encryption, vendor-managed keys acceptable for v1).
- Filenames must contain **no PII** — use opaque CUIDs only. Example: `s3://synesis-voice-prod/segments/clxxxxxxxxxx.webm`.
- **Separate buckets per environment.** Prod audio never touches dev/staging. Enforce via IAM, not just convention.

### Access controls

- Audio reads gated by ownership check: parent (linked to student), student (self if 13+), admin (audit-logged), voice annotator (audit-logged, only segments in their queue).
- Every audio read by an admin or annotator is logged with timestamp, user ID, segment ID, purpose.

### Retention enforcement

- Nightly cron deletes expired audio (`deleteAfterDate < NOW()`) and writes `VoiceAudioDeletionLog`.
- On parent training opt-out, a background job purges training-tier audio for that student within 30 days. Status visible to parent in voice settings ("Purge in progress — completes by [date]").
- On account deletion (existing DSR flow), all audio for the account is purged immediately and logged.

### COPPA-specific

- Verifiable parental consent: capture IP address and user agent on every `VoiceConsentDecision` for audit.
- Distinguish between "operating the service" (Tier 1, notice-based) and "secondary uses" (Tier 2, explicit-consent-based) in the privacy policy.
- Annual consent refresh: surface a banner if a parent's training opt-in is older than 12 months without a refresh.

### GDPR / state law preparedness

- The two-tier model and explicit Tier 2 opt-in is consistent with GDPR Article 8 (child consent) and CCPA-CPRA's children's data rules.
- Right-to-deletion: handled by extending existing DSR processor (`lib/dsrProcessor.ts`) to include audio purge.
- Right-to-access: parent can already view all sessions and download audio via existing parent voice sessions UI.

---

## 10. Labeling Tool MVP

The labeling tool is the foundation of the flywheel. It must be **fast** (annotators can label hundreds of segments per hour) and **accurate** (low rate of mislabels).

### Workflow

1. Annotator opens `app/admin/voice/labeling/page.tsx`. Queue shows next 50 highest-uncertainty unlabeled segments.
2. Annotator clicks a segment, lands on `app/admin/voice/labeling/[segmentId]/page.tsx`.
3. Workspace shows:
   - Audio player (waveform, click-to-seek, keyboard scrub)
   - Expected text (what the kid was supposed to read), with phonogram highlights
   - ASR transcript with word-level confidence shading
   - Diff highlights between expected and ASR
   - Metadata sidebar: student age, grade, phonogram being practiced, dialect settings (if opted in)
4. Annotator listens (keyboard shortcut: space to play/pause), corrects the transcript if needed, tags miscue type, optionally tags phonogram + syllable type + dialect transfer, sets isEvalSet flag.
5. Submits. Next segment loads automatically.

### Keyboard shortcuts (required for throughput)

- `Space` — play/pause
- `J` / `K` — previous / next segment
- `1`-`9` — quick-tag miscue type
- `Cmd+Enter` — submit
- `Cmd+E` — toggle isEvalSet flag

### Uncertainty scoring (for active learning queue)

A segment's `uncertaintyScore` is computed at the time the session is processed, using a weighted combination of:

- ASR mean word-level confidence (lower → more uncertain)
- Word-error distance between ASR and expected text (more diff → more interesting)
- Whether the miscue classifier (when built) gave a low-margin prediction
- Whether the student's dialect settings differ from what the model was trained on
- Whether the phonogram being practiced has few existing labeled examples (coverage gap)

Queue sorts descending by `uncertaintyScore`. Labeled segments drop out; skipped segments are re-queued with a decayed score after 30 days.

### Quality assurance

- 5% of submitted labels are re-labeled by a second annotator. Disagreements logged for review.
- Inter-annotator agreement (Cohen's κ) tracked weekly. Target: κ ≥ 0.7 on miscue type after 4 weeks of active labeling.

---

## 11. Eval Set vs Training Set Discipline

**Hard rule:** segments where `isEvalSet = true` are **never** included in training exports. The eval set is the ground truth used to measure whether a model change helped or hurt. Contamination kills the measurement.

Enforced at the export level: `POST /api/voice/exports/create` always excludes `isEvalSet = true` unless `purpose = "EVAL_SET"`.

Target eval-set composition (by month 6 of labeling):

- 500-1,000 segments minimum
- Stratified across grades 3-8
- Stratified across the four Ehri phases
- Stratified across the six syllable types
- Stratified across dialect settings (opted-in students only; broadly representative)
- 20% phonogram-practice segments, 60% connected-text reading segments, 20% comprehension-answer segments

---

## 12. Acceptance Criteria

### Consent

- A newly created student account has a `VoiceConsent` record with `serviceAudioRetained = true`, `trainingCorpusOptedIn = false`, `researchPublicationOptedIn = false`.
- Updating consent writes a `VoiceConsentDecision` row with IP, user agent, prior state snapshot, and new state snapshot.
- Setting `trainingCorpusOptedIn = false` after it was true triggers a purge job and a parent-visible "purge in progress" status.
- A parent who hasn't seen the current consent text version sees a one-time refresh banner.

### Audio retention

- Sessions with Tier 1 retention have `deleteAfterDate` set to session date + 90 days.
- Sessions with Tier 2 retention have no `deleteAfterDate`.
- The nightly retention job deletes audio objects whose `deleteAfterDate` has passed, sets `audioDeletedAt`, and writes `VoiceAudioDeletionLog`.
- Audio object URLs are not publicly accessible; only authenticated owners (parent, student self, admin, annotator on their queue) can read.

### Labeling

- The labeling queue returns segments sorted by `uncertaintyScore` descending.
- Submitting a label writes `LabeledVoiceSegment` with annotator, timestamp, and notes; queue refresh removes the segment.
- A second annotator labeling the same segment is supported and triggers a disagreement-check workflow.
- Keyboard shortcuts (`Space`, `J`, `K`, `1`-`9`, `Cmd+Enter`) all work without mouse.

### Eval set discipline

- A training-corpus export with `purpose != "EVAL_SET"` returns zero segments where `isEvalSet = true`.
- The export manifest is valid JSONL, one segment per line, with audio storage keys, expected text, human transcript, miscue type, and metadata.

### Privacy

- No audio file path contains a student name, email, or other PII.
- An admin reading a segment audio URL writes an audit log entry.
- Account deletion via DSR triggers audio purge across all sessions for that account within 24 hours.

---

## 13. Test Strategy

- **Unit tests** for: consent state transitions (especially edge cases like opt-in → opt-out → opt-in), uncertainty score calculation, retention date calculation, miscue type validation.
- **Integration tests** for: every consent endpoint (auth, valid input, invalid input, audit log writing), every labeling endpoint, the export endpoint with consent-honoring exclusions.
- **End-to-end test** for: (a) parent toggles training-corpus opt-in → next session is retained beyond 90 days, (b) parent toggles training-corpus opt-out → purge job runs and segments excluded from export, (c) annotator labels a segment via keyboard shortcuts → label appears in eval-set candidate pool.
- **Manual QA** for: labeling-tool throughput (a trained annotator should achieve ≥100 segments/hour after a 30-minute warmup), consent copy readability (parent test).

---

## 14. What Codex Should NOT Do

1. **Do not train any speech model.** This spec only captures and labels. Model training is a separate spec.
2. **Do not change the default for Tier 2 training consent.** It is explicit opt-in, OFF by default. Any default-on training consent is a COPPA violation.
3. **Do not log PII to audit trails in plain text.** Use opaque user IDs only.
4. **Do not skip the retention enforcement cron.** Service-tier audio must auto-purge at 90 days; missing this is a privacy commitment violation.
5. **Do not invent dialect tags.** Use the controlled vocabulary in `DialectSettings` (from v1 spec) plus the dialect-transfer tag format documented in §4.1.
6. **Do not pre-populate `LabeledVoiceSegment` rows automatically.** Segments are created on demand when the active-learning queue scores a session and identifies a slice worth labeling. No batch pre-creation.
7. **Do not give admins access to audio by default.** Admin role gates access to the labeling tool; a separate audit-logged check is required to read individual audio objects.
8. **Do not expose any researcher-facing API.** All exports are admin-only and require explicit batch creation.

---

## 15. Suggested Implementation Order

Build incrementally; ship after each major step.

1. **Schema migration** — add `VoiceConsent`, `VoiceConsentDecision`, `LabeledVoiceSegment`, `TrainingCorpusBatch`, `VoiceAudioDeletionLog` models; add fields to `VoiceSession` and `User`.
2. **Consent endpoints** — `GET` and `POST /api/voice/consent/:studentId` with audit log writing.
3. **Consent UI** — `VoiceConsentSettings` component, parent settings route, extension to dialect onboarding final step.
4. **Audio storage policy** — wire `retentionTier` and `deleteAfterDate` into the existing voice session save path (from v1 spec).
5. **Retention enforcement cron** — `scripts/voice/enforce-retention.ts` + nightly schedule.
6. **Training opt-out purge job** — background job for §9 / acceptance criteria.
7. **Uncertainty scoring** — compute and store `asrConfidenceMean` on session save; compute `uncertaintyScore` when creating `LabeledVoiceSegment` rows.
8. **Active learning queue endpoint** — `GET /api/voice/labeling/queue`.
9. **Labeling workspace UI** — single-segment annotator workspace with keyboard shortcuts.
10. **Labeling submit + skip endpoints** — `POST` segment endpoints.
11. **Voice annotator role** — extend auth/roles to support `VOICE_ANNOTATOR`.
12. **Eval set + export** — promote/manage UI + `POST /api/voice/exports/create`.
13. **Privacy & access audit logging** — extend existing audit infra to log all annotator and admin audio reads.
14. **Tests + manual QA** — see §13.

Total estimated effort: ~3-4 weeks of focused engineering. The schema and consent layer (steps 1-6) can ship in week 1 and unblock immediate audio capture. The labeling tool (steps 7-12) ships in weeks 2-3. QA + polish week 4.

---

## 16. Roadmap (Future Specs)

Documented here so the architecture supports them without retrofit:

- **`specs/voice-vendor-evaluation-codex-spec.md`** — pilot SoapBox Labs vs Whisper on the eval set once labeling has produced 500+ segments. Decide vendor swap based on WER by age and dialect.
- **`specs/voice-tts-upgrade-codex-spec.md`** — replace browser `SpeechSynthesis` with OpenAI TTS (interim) and later evaluate ElevenLabs / Cartesia. Already named in v1 spec.
- **`specs/voice-realtime-barge-in-codex-spec.md`** — integrate Pipecat for real-time conversational voice. UX-level spec.
- **`specs/voice-fine-tuning-codex-spec.md`** — once corpus has ~10,000+ labeled segments, fine-tune Whisper-small with LoRA on the labeled corpus. Compute budget, eval methodology, deployment pipeline.
- **`specs/voice-miscue-classifier-codex-spec.md`** — train an in-house miscue type classifier from labeled segments. Replace heuristic miscue detection with a learned model.
- **`specs/voice-phonogram-scoring-codex-spec.md`** — phoneme-level scoring model for individual phonograms, built on wav2vec2-phoneme + labeled phonogram-practice segments.
- **`specs/voice-custom-acoustic-model-codex-spec.md`** — year 2-3 work. Custom acoustic model for the Reading Buddy user base. Requires ML hire.

---

## 17. Open Questions for Jonathan (resolve before Codex starts)

1. **Annotator hiring.** Do we hire one part-time annotator (reading specialist or SLP grad student) now, or wait until 500+ sessions have been captured? *Recommend: hire at 200 captured sessions to start producing the eval set in parallel with capture growth.*
2. **Audio storage vendor.** Extend whatever object storage the existing reading-coach uses, or stand up a dedicated voice bucket with stricter IAM? *Recommend: dedicated voice bucket with per-environment separation and explicit IAM policy for the audio-read role.*
3. **Consent text legal review.** Should the Tier 1 and Tier 2 copy be reviewed by a privacy attorney before shipping? *Recommend: yes, ~$1-2K with a COPPA-experienced attorney. Worth it for the audit trail.*
4. **Annotator UI dogfooding.** Should you (Jonathan) personally label the first 50 segments before hiring? *Recommend: yes — fastest way to find UI friction and validate the miscue taxonomy.*
5. **Research opt-in surface.** Surface in onboarding (low traffic, low opt-in) or only in deep settings (higher quality consent)? *Recommend: deep settings only; this is a sensitive permission that should be opt-in by intentional navigation, not casual onboarding.*

---

**End of Voice Data Flywheel v1 spec.**

Companion specs in order of likely execution: voice-vendor-evaluation → voice-tts-upgrade → voice-fine-tuning (once corpus is sized) → voice-miscue-classifier → voice-phonogram-scoring → voice-custom-acoustic-model.
