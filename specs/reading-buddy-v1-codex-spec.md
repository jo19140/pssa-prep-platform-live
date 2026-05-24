# Sýnesis Learning v1 · Codex Implementation Spec

**Status:** Draft for Codex execution
**Author:** Jonathan Diaz (with Claude assistance)
**Date:** 2026-05-23 · brand updated 2026-05-23
**Source of truth for design:** `/mockups/index.html` and the thirteen linked mockup screens (including `navigation-ia.html`)
**Source of truth for brand:** `memory/project_synesis_brand_decision.md`
**Source of truth for pedagogy:** `memory/reference_phonogram_methodology.md`

---

## 1. Overview

This spec covers **Sýnesis Learning v1** — the literacy intervention platform that becomes the company's flagship product. Reading Buddy (on Venus) is the first subject program inside Sýnesis. PSSA prep continues as one Test Prep module under the Sýnesis umbrella.

**Parent brand:** Sýnesis Learning (formal) / Sýnesis (display). Reading Buddy is the literacy program label. Math Buddy / Mercury, Science Buddy / Mars, etc. are future programs in the same family.

**What we are building:** schema, UI, API plumbing, and voice infrastructure for the thirteen approved mockup screens. Content generation (literacy lessons, passages, vocab inventories) is **out of scope** for this spec and will be addressed in a follow-up after a content sourcing strategy and literacy-specific quality rubric are in place.

**Pedagogy:** all behavior must align with the framework documented in `reference_phonogram_methodology.md` — Ehri's four phases of word reading, the six syllable types (closed, open, VCe, vowel team, r-controlled, consonant + le), phonogram-by-analogy decoding, and the 6-strand literacy model (Phonemic Awareness, Decoding, Morphology, Fluency, Vocabulary, Comprehension).

**Branding:** soft rebrand — new surfaces ship as Sýnesis. Existing PSSA-focused surfaces (legacy teacher dashboard, TDA scoring, etc.) keep PSSA branding for now. Full app-wide rebrand from "PSSA Platform" to "Sýnesis Learning" is deferred to a separate spec.

---

## 2. In Scope / Out of Scope

### In scope (this spec)
- Database schema additions for: Ehri phase placement, 6-strand literacy profile, phonogram & syllable-type mastery model, Lexile + grade-equivalent fields, dialect/L1 listening settings, voice session storage, autopilot decision log, Program enum + user-program enrollments, migration-banner dismissal flag
- Ten new/updated Next.js routes (nine literacy screens + navigation IA — see §4)
- New & extended API endpoints (see §5)
- Voice infrastructure: browser SpeechSynthesis as TTS MVP, MediaRecorder-based STT (extends existing `ReadingCoachPanel`)
- **Sýnesis brand layer:** new global chrome (top nav with Program Switcher + Test Prep dropdown, Sýnesis logo + tagline, role-based default landing routes, one-time migration banner for existing PA users)
- Autopilot decision engine for plan generation/adjustment (skeleton — calls existing `lib/lessonGeneratorV2.ts` for now)
- Phonogram + syllable-type mastery tracking and visualization
- Dialect/L1 onboarding flow with skip-at-every-step UX
- Speed drill practice mode

### Out of scope (deferred)
- **Literacy content generation** (phonogram word lists, passages, Tier 2 vocab, decoding items, comprehension probes). The phonogram inventory + AWL + SUBTLEX datasets are produced by the **v2 content pipeline spec** (`specs/v2-content-pipeline-codex-spec.md`). Passage and vocab item generation (with the literacy-extended quality rubric) is a separate v3 spec still to be written.
- Full app-wide rebrand from PSSA Platform → Reading Buddy
- Production-quality TTS vendor selection (ElevenLabs vs. others)
- Spanish-language full product mode (dialect onboarding captures the data; UI translation is later)
- Personalized AI-generated stories (Tier 2 add-on, separate spec)
- Daily SMS to parents (Tier 3 add-on, separate spec)
- "Read together" parent mode (Tier 5, separate spec)
- Early-flag for learning differences (Tier 6, deferred indefinitely)
- State expansion beyond PSSA (architecture supports it; no new state modules in v1)

---

## 3. Database Schema Changes

All additions to `prisma/schema.prisma`. New models and field additions.

### 3.1 New enums

```prisma
enum EhriPhase {
  PRE_ALPHABETIC
  PARTIAL_ALPHABETIC
  FULL_ALPHABETIC
  CONSOLIDATED_ALPHABETIC
}

enum SynesisProgram {
  // Planet-named subject programs under Sýnesis
  VENUS    // Reading Buddy
  MERCURY  // Math Buddy (future)
  MARS     // Science Buddy (future)
  EARTH    // History/Social Studies Buddy (future)
}

enum TestPrepModule {
  PSSA   // Pennsylvania
  STAAR  // Texas (future)
  FSA    // Florida (future)
  MCAS   // Massachusetts (future)
}

enum LiteracyStrand {
  PHONEMIC_AWARENESS
  DECODING
  MORPHOLOGY
  FLUENCY
  VOCABULARY
  COMPREHENSION
}

enum SyllableType {
  CLOSED
  OPEN
  VCE              // vowel-consonant-e
  VOWEL_TEAM
  R_CONTROLLED
  CONSONANT_LE
}

enum MasteryLevel {
  UNTESTED
  NOT_YET
  DEVELOPING
  SOLID
  MASTERED
}
```

### 3.2 New models

```prisma
model LiteracyProfile {
  id              String        @id @default(cuid())
  studentUserId   String        @unique
  ehriPhase       EhriPhase     @default(PRE_ALPHABETIC)
  ehriPhaseConfidence Float     @default(0)
  lexileEstimate  Int?
  gradeEquivalent Float?
  lastDiagnosticAt DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  student         User          @relation(fields: [studentUserId], references: [id], onDelete: Cascade)
  strandScores    StrandScore[]
  phonogramMastery PhonogramMastery[]
  syllableTypeMastery SyllableTypeMastery[]
  dialectSettings DialectSettings?
  autopilotDecisions AutopilotDecision[]
  voiceSessions   VoiceSession[]
}

model StrandScore {
  id              String        @id @default(cuid())
  literacyProfileId String
  strand          LiteracyStrand
  score           Float         // 0-100
  level           MasteryLevel
  priorityRank    Int?          // 1 = highest leverage gap
  evidenceCount   Int           @default(0)
  lastUpdatedAt   DateTime      @default(now())
  literacyProfile LiteracyProfile @relation(fields: [literacyProfileId], references: [id], onDelete: Cascade)

  @@unique([literacyProfileId, strand])
}

model PhonogramFamily {
  // Reference data — seeded, not user-generated
  id              String        @id @default(cuid())
  code            String        @unique  // e.g. "ake", "ight", "tion"
  category        String        // long-a, long-i, r-controlled, etc.
  syllableType    SyllableType
  exampleWords    String[]
  introductionOrder Int         // pedagogical sequence
  createdAt       DateTime      @default(now())
  masteryRecords  PhonogramMastery[]
}

model PhonogramMastery {
  id              String        @id @default(cuid())
  literacyProfileId String
  phonogramFamilyId String
  level           MasteryLevel  @default(UNTESTED)
  correctAttempts Int           @default(0)
  totalAttempts   Int           @default(0)
  lastSeenAt      DateTime?
  literacyProfile LiteracyProfile @relation(fields: [literacyProfileId], references: [id], onDelete: Cascade)
  phonogramFamily PhonogramFamily @relation(fields: [phonogramFamilyId], references: [id])

  @@unique([literacyProfileId, phonogramFamilyId])
}

model SyllableTypeMastery {
  id              String        @id @default(cuid())
  literacyProfileId String
  syllableType    SyllableType
  level           MasteryLevel  @default(UNTESTED)
  correctAttempts Int           @default(0)
  totalAttempts   Int           @default(0)
  literacyProfile LiteracyProfile @relation(fields: [literacyProfileId], references: [id], onDelete: Cascade)

  @@unique([literacyProfileId, syllableType])
}

model DialectSettings {
  id                String        @id @default(cuid())
  literacyProfileId String        @unique
  homeLanguages     String[]      // ISO codes: ["en", "es"]
  regionalDialects  String[]      // tags: ["AAE", "Southern", "Chicano", "Caribbean"]
  optedInAt         DateTime?
  skippedAt         DateTime?
  lastUpdatedAt     DateTime      @updatedAt
  literacyProfile   LiteracyProfile @relation(fields: [literacyProfileId], references: [id], onDelete: Cascade)
}

model AutopilotDecision {
  id                String        @id @default(cuid())
  literacyProfileId String
  decisionType      String        // "PLAN_CHANGE", "PROMOTION", "INTERVENTION", "PROGRESS_CHECK"
  summary           String        // teacher-facing: "switched to morphology focus because comprehension stalled 3 weeks"
  reasoning         String        @db.Text  // longer explanation
  appliedAt         DateTime      @default(now())
  overriddenAt      DateTime?
  overriddenByUserId String?
  literacyProfile   LiteracyProfile @relation(fields: [literacyProfileId], references: [id], onDelete: Cascade)

  @@index([literacyProfileId, appliedAt])
}

model VoiceSession {
  id                String        @id @default(cuid())
  literacyProfileId String
  sessionType       String        // "DIAGNOSTIC", "PRACTICE", "SPEED_DRILL"
  startedAt         DateTime      @default(now())
  endedAt           DateTime?
  durationSeconds   Int?
  audioStorageKey   String?       // path in object storage, nullable if recording disabled
  transcriptJson    Json?         // structured turn-by-turn transcript
  wordsRead         Int?
  wordsCorrect      Int?
  wordsSelfCorrected Int?
  wordsMissed       Int?
  wpm               Int?
  literacyProfile   LiteracyProfile @relation(fields: [literacyProfileId], references: [id], onDelete: Cascade)

  @@index([literacyProfileId, startedAt])
}
```

### 3.3 Field additions to existing models

```prisma
// Add to Assessment model
ehriPhaseAtTime    EhriPhase?
lexileBand         Int?

// Add to User model — Sýnesis brand additions + back-relations
literacyProfile                      LiteracyProfile?
enrolledPrograms                     SynesisProgram[]    // which subject planets this user has access to
enrolledTestPrep                     TestPrepModule[]    // which state-test modules
synesisMigrationBannerDismissedAt    DateTime?           // one-time banner dismissal for existing PA users
```

### 3.4 New model — `StateRequests` (lead capture from Test Prep dropdown)

```prisma
model StateRequests {
  id            String   @id @default(cuid())
  userId        String?
  email         String?
  stateCode     String   // "TX", "FL", "CA", etc.
  requestNotes  String?  @db.Text
  createdAt     DateTime @default(now())
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([stateCode, createdAt])
}
```

Populated when a user clicks "Request your state" in the Test Prep dropdown. Free market research — tells the team which states have demand before committing engineering.

### 3.4 Seed data (separate seed script, not user-generated content)

`prisma/seed-phonograms.ts` — seeds `PhonogramFamily` from the v2 content pipeline output. **Do NOT seed from the uploaded reference PDFs (copyright).** This seed script reads `data/phonogram/alignment.sqlite` + `data/phonogram/subtlex.sqlite` produced by the v2 pipeline (see `specs/v2-content-pipeline-codex-spec.md`).

The seed clusters CMUdict alignments by their final vowel + final consonant chunks to derive phonogram families (long-a `-ake`, r-controlled `-urn`, etc.) with appropriate `introductionOrder` per the Blevins methodology in `memory/reference_phonogram_methodology.md`.

Acceptance: all six syllable types represented, ~80-120 phonogram families covering long vowels, r-controlled, diphthongs, consonant + le, common consonant clusters. The v2 pipeline must run first (or its output committed to the repo) before this seed will execute.

---

## 4. New & Updated Routes (UI Pages)

All under `app/`. Use existing layout/auth patterns. New surfaces use Reading Buddy branding; existing surfaces unchanged.

| Mockup file | Route | Component file | Notes |
|---|---|---|---|
| `student-diagnostic.html` | `app/student/diagnostic/page.tsx` | `components/literacy/StudentDiagnosticFlow.tsx` | Multi-step diagnostic; final screen shows Ehri phase to adult |
| `student-practice.html` | `app/student/practice/page.tsx` | `components/literacy/StudentPracticeSession.tsx` | Daily session shell; pulls plan from autopilot |
| `voice-diagnostic.html` | `app/student/diagnostic/voice/page.tsx` | `components/literacy/VoiceDiagnosticFlow.tsx` | Voice-first variant; same data model as text diagnostic |
| `voice-practice.html` | `app/student/practice/voice/page.tsx` | `components/literacy/VoicePracticeSession.tsx` | Buddy character, conversational; interruptible passages |
| `speed-drill.html` | `app/student/speed-drill/page.tsx` | `components/literacy/SpeedDrillSession.tsx` | 1-minute timed phonogram drill |
| `dialect-onboarding.html` | `app/onboarding/listening/page.tsx` | `components/literacy/DialectOnboardingFlow.tsx` | Skip-at-every-step; writes to `DialectSettings` |
| `teacher-caseload.html` | `app/teacher/literacy/page.tsx` | `components/literacy/TeacherLiteracyMonitor.tsx` | Replaces nothing; new sibling to existing teacher dashboard |
| `teacher-student-detail.html` | `app/teacher/literacy/[studentId]/page.tsx` | `components/literacy/StudentLiteracyProfile.tsx` | Includes phonogram + syllable-type mastery grid |
| `parent-dashboard.html` | `app/parent/literacy/page.tsx` | `components/literacy/ParentLiteracyDashboard.tsx` | New parent surface; warm hero summary |
| `parent-voice-sessions.html` | `app/parent/literacy/voice-sessions/page.tsx` | `components/literacy/ParentVoiceSessionsPage.tsx` | Audio playback + transcript view |

**Buddy character component:** `components/literacy/BuddyCharacter.tsx` — reusable, accepts `state: 'idle' | 'listening' | 'speaking' | 'confused'` prop. Used in all voice screens.

**Sýnesis global chrome (new components):**
- `components/synesis/SynesisHeader.tsx` — top nav with Sýnesis logo, ProgramSwitcher, TestPrepDropdown, user menu. Replaces `AppChromeHeader.tsx` on all new routes; legacy PSSA routes keep the old header.
- `components/synesis/ProgramSwitcher.tsx` — planet-tile selector. Renders enrolled programs from `User.enrolledPrograms` (Venus active = warm amber theme; Mercury greyed if not enrolled; etc.). Each tile carries its own color theme via a `colorTheme` config.
- `components/synesis/TestPrepDropdown.tsx` — dropdown showing enabled `User.enrolledTestPrep` modules (e.g., PSSA for PA users), plus a "Coming soon" teaser list and a "Request your state" form that writes to `StateRequests`.
- `components/synesis/MigrationBanner.tsx` — one-time banner shown to existing pre-launch PA users on first post-launch login. Visible only if `User.synesisMigrationBannerDismissedAt` is null AND account was created before launch date. Three reassurance pills ("Your PSSA work · Test Prep tab" / "What's new · Reading Buddy on Venus" / "Your data · Untouched"). Dismissible; never shown again.
- `components/synesis/ProgramBreadcrumb.tsx` — renders "Sýnesis › Test prep › PSSA" style breadcrumbs on nested module pages.

**Default landing routes per role** (new logic in `middleware.ts` or per-role redirect):
- Student → `app/student/practice/page.tsx` (Reading Buddy session today)
- Teacher → `app/teacher/literacy/page.tsx` (Sýnesis literacy monitor)
- Parent → `app/parent/literacy/page.tsx` (Sýnesis parent dashboard)
- Admin → existing admin dashboard (unchanged)

**Legacy navigation preservation:** the existing `AppChromeHeader.tsx` continues rendering on PSSA-specific routes (PSSA scoring, legacy teacher dashboard). DO NOT modify it. The two headers coexist by route — Sýnesis chrome on new routes, PSSA Platform chrome on legacy routes — until the full rebrand spec lands.

---

## 5. API Endpoints

All under `app/api/`. Follow existing auth/rateLimit patterns (see `lib/auth.ts`, `lib/rateLimit.ts`).

### New endpoints

| Method + Path | Purpose | Auth |
|---|---|---|
| `POST /api/literacy/diagnostic` | Submit diagnostic responses → write `LiteracyProfile`, `StrandScore[]`, initial `PhonogramMastery[]`, `EhriPhase` placement | Student or Admin |
| `GET /api/literacy/profile/:studentId` | Return full literacy profile + strand scores + mastery grid | Student (self), Teacher (assigned), Parent (linked), Admin |
| `POST /api/literacy/voice-session` | Persist voice session: transcript, audio key, scoring | Student |
| `GET /api/literacy/voice-session/:id` | Retrieve session for playback (parent view) | Parent (linked), Teacher (assigned), Admin |
| `POST /api/literacy/speed-drill` | Submit speed drill result; updates phonogram mastery | Student |
| `POST /api/literacy/dialect-settings` | Save/update dialect & L1 settings | Parent (linked), Student (self if 13+) |
| `GET /api/literacy/autopilot-decisions/:studentId` | List autopilot decisions (paginated, newest first) | Teacher (assigned), Parent (linked), Admin |
| `POST /api/literacy/autopilot-decisions/:id/override` | Mark a decision as overridden | Teacher (assigned), Admin |
| `POST /api/literacy/autopilot/run/:studentId` | Trigger autopilot evaluation (cron + manual) | System / Admin |

### Extended endpoints
- `POST /api/student/reading-coach` (existing) — extend response to include phonogram detection on the transcript. When a kid reads "tooth" as "toof" and dialect settings include AAE, do NOT count as error; log as `EXPECTED_DIALECT_TRANSFER`.

---

## 6. Component Changes

### Extend (don't rebuild)
- `components/ReadingCoachPanel.tsx` — extract the MediaRecorder pipeline into `lib/voice/audioCapture.ts` so it's reusable by `VoiceDiagnosticFlow`, `VoicePracticeSession`, `SpeedDrillSession`.
- `components/GrowthCharts.tsx` — add a `LiteracyTrendChart` export for Ehri-phase-aware growth (vertical axis is Ehri phases, not just scores).
- `components/StandardsProgressPanel.tsx` — keep as-is for PSSA; add a sibling `components/literacy/LiteracyStrandPanel.tsx` for the 6-strand model.

### Create new
- `components/literacy/BuddyCharacter.tsx`
- `components/literacy/PhonogramMasteryGrid.tsx`
- `components/literacy/SyllableTypeGrid.tsx`
- `components/literacy/EhriPhaseBadge.tsx`
- `components/literacy/AutopilotDecisionFeed.tsx`
- `components/literacy/AutoSendParentUpdateCard.tsx`
- `components/literacy/VoiceSessionTimeline.tsx` (for parent visibility)
- `components/literacy/SpeedDrillTimer.tsx`
- `components/literacy/DialectChip.tsx`

---

## 7. Voice Infrastructure

### TTS (text-to-speech)
v1 ships with browser `SpeechSynthesis` API. Wrap in `lib/voice/tts.ts` with a single interface so we can swap to ElevenLabs or similar in a later spec without touching components.

```ts
// lib/voice/tts.ts
export interface TTSProvider {
  speak(text: string, options?: { rate?: number; voice?: string }): Promise<void>;
  cancel(): void;
  isAvailable(): boolean;
}
```

### STT (speech-to-text)
Extend the existing OpenAI-backed `app/api/student/reading-coach/route.ts` pipeline. Audio chunks → Whisper → text + word-level timestamps. Voice answers to comprehension questions are graded by GPT-4o against a rubric (gist-match, not exact-string).

### Audio storage
Voice session audio stored in object storage (extend whatever pattern the existing reading-coach uses). Audio retention: 90 days default, configurable in `DialectSettings`-adjacent privacy settings. Parents can delete a session anytime via the parent voice sessions UI.

### Privacy
- Audio capture requires explicit MediaRecorder permission (browser-native flow).
- Recording can be disabled per-student via a settings toggle; the program still listens (live transcription) but doesn't keep audio.
- All audio storage paths must be authenticated reads — never public URLs.

---

## 8. Branding & Copy

### What changes
- New routes under `app/student/`, `app/teacher/literacy/`, `app/parent/literacy/`, `app/onboarding/listening/` use **Sýnesis** in page title, header chrome, and metadata. The literacy program label is "**Reading Buddy on Venus**."
- The `BuddyCharacter` component is the voice character — generic friendly orb for now, no fixed name. Leave a `name` prop defaulting to "Reading Buddy" so future branding can swap it. The character is *inside* Reading Buddy/Venus; it's not the parent brand.
- Copy throughout new surfaces uses "**striving readers**" — never "struggling."
- Ehri phase placement is the headline pedagogical metric on adult-facing surfaces; Lexile is a supporting tag.
- **Brand wordmark:** "Sýnesis" (with accent on display, plain "Synesis" in URLs/filenames/codepaths). Tagline: **"Learning Woven Together."** Logo asset: `branding/synesis-logo-v4.png` (will be replaced with SVG when designer finalizes).
- **Pronunciation guide** in product copy (footer help link or About page): "SIN-eh-sis."
- **Domain:** `synesislearning.com` (production), legacy `pssa-platform.com` (or whatever) redirects to it.

### What does NOT change
- Existing `AppChromeHeader.tsx` keeps "PSSA Platform" title — DO NOT modify. It continues to render on legacy PSSA-specific routes.
- Existing teacher dashboard, TDA scoring, PSSA-aligned learning lessons keep their current branding.
- README, password reset emails — no changes in this spec (separate full-rebrand spec will handle).

### Soft rebrand surfaces (only)
Only modify branding on the new routes listed in §4 plus the new Sýnesis chrome components in §6. Everything else is untouched. The two brand layers coexist by route during this transition.

---

## 9. Mockup → Implementation Mapping

The mockup HTML files in `/mockups/` are the design source of truth. When implementing each component, **open the corresponding mockup, screenshot it, and match the layout, spacing, color, and copy faithfully.** Do not invent new visual patterns.

Mockup design notes (the dark "Design notes for review" panels at the bottom of each mockup) capture **product behavior decisions** that are not visible in the static HTML. Read them as part of the spec — they are not flavor text.

---

## 10. Acceptance Criteria

Each feature ships when these are demonstrably true. Codex should write tests for the testable ones.

### Diagnostic
- A student completing the diagnostic ends with a populated `LiteracyProfile`, 6 `StrandScore` records, ≥1 `PhonogramMastery` per family attempted, and an `ehriPhase` field set with a confidence score.
- The adult-facing results screen (Screen 7 of `student-diagnostic.html`) renders Ehri phase placement as the headline and Lexile as a supporting tag.
- A diagnostic can be completed in voice-first mode without the kid reading any screen instruction.

### Voice practice
- The kid can hold the mic button to talk; releasing sends audio for STT processing.
- The Buddy character renders all four states (idle, listening, speaking, confused) and transitions correctly.
- When a kid speaks an answer that's gist-correct, the LLM rubric returns a pass even on non-exact wording. (Tested with at least 10 paraphrase pairs against known correct answers.)
- Word-splitting scaffolding ("dis · ap · peared") splits on real phonogram boundaries from `PhonogramFamily`, not arbitrary syllables.

### Speed drill
- A 60-second drill records correct / self-corrected / missed words with sub-500ms latency on each word.
- Drill content for a student is selected from the student's developing-tier phonograms; no random selection.
- The progress chart shows last 8 runs from `VoiceSession` records of type `SPEED_DRILL`.

### Dialect onboarding
- All four steps are skip-able. Skipping any step does not produce an error; settings are saved with whatever was provided.
- Selecting a language with sound-transfer support sets the corresponding flag in `DialectSettings`.
- Submitting the flow without selecting any dialect leaves `regionalDialects` empty and is a valid state.
- The flow never asks about race or ethnicity. (Lint check on copy.)

### Teacher monitor
- The teacher caseload renders all students in the teacher's caseload with their current Ehri phase, summary strand bars, and the most recent autopilot decision.
- The "What the program did this week" feed shows the last 7 days of `AutopilotDecision` records.
- "Override" buttons mark `AutopilotDecision.overriddenAt` and `overriddenByUserId`.

### Student profile (teacher view)
- The 6-strand panel renders all 6 strands with current score, level, and priority rank.
- The phonogram mastery grid renders every `PhonogramFamily` row colored by the student's `PhonogramMastery.level`. Untested phonograms render as gray.
- The six syllable types card row shows current level for each.

### Parent dashboard
- Hero summary is human-readable English ("Maya gained another month of reading this week"), not a metric dump.
- "Words she's learning" pulls from the student's recent phonogram + vocab activity.
- "What's coming next" pulls from the active autopilot plan.
- Page renders without any teacher in the loop (no override buttons, no caseload links).

### Parent voice visibility
- "Listen to today's session" plays back the most recent `VoiceSession.audioStorageKey`.
- Highlighted clip markers correspond to events flagged in `VoiceSession.transcriptJson`.
- Parents can delete a session, which sets `audioStorageKey` to null and removes the underlying audio object.

### Privacy
- No audio object is publicly accessible.
- No race or ethnicity field appears in any schema, API, or copy.
- Dialect settings can only be edited by linked parent or self (student aged 13+).

---

## 11. Test Strategy

- **Unit tests** for all autopilot decision logic. The decision-making functions must be pure (given inputs → known decision) so they're testable without a database.
- **Integration tests** for each new API endpoint covering auth, valid input, invalid input, and rate limit behavior.
- **End-to-end test** (Playwright or similar) for: (a) diagnostic completion writes correct schema records, (b) voice practice records a session, (c) dialect onboarding can be completed and skipped at every step.
- **Manual QA** before merge for: BuddyCharacter visual states, voice STT latency feel, parent dashboard warmth of copy.

---

## 12. What Codex Should NOT Do

To prevent the budget waste from prior runs:

1. **Do not generate literacy lesson content.** No phonogram word lists, no passages, no vocab definitions, no comprehension items. The seed data for `PhonogramFamily` comes from a separate sourcing script that you, Jonathan, will run and review.
2. **Do not modify the existing PSSA-focused UI surfaces.** This is a soft rebrand — new surfaces only.
3. **Do not implement ElevenLabs or any third-party TTS.** Use browser `SpeechSynthesis` only. Wrap in an interface so we can swap later.
4. **Do not auto-detect dialect.** Dialect settings only exist if the family explicitly opts in via the onboarding flow.
5. **Do not infer race, ethnicity, or socioeconomic status from any input.** Ever. Not even as a metric or analytics dimension.
6. **Do not ship a state-specific UI.** Build the schema and architecture to support multi-state, but the only state module that exists is PA (PSSA), which already exists and is unchanged.
7. **Do not invent passages or stories for the diagnostic, practice, or speed drill.** All passage and word content must be flagged as "TODO: from content pipeline" with a clear placeholder until the content spec lands.

---

## 13. Suggested Implementation Order

For Codex's own sanity. Build in this order; ship incrementally.

1. Schema changes + migrations + seed script skeleton (PhonogramFamily empty for now, SynesisProgram + TestPrepModule enums, StateRequests table)
2. Sýnesis global chrome: SynesisHeader, ProgramSwitcher, TestPrepDropdown, MigrationBanner, ProgramBreadcrumb. Render visible in isolation with mock state.
3. Default landing route logic per role (middleware redirects).
4. Voice infrastructure foundation (`lib/voice/tts.ts`, extract `lib/voice/audioCapture.ts`)
5. BuddyCharacter component (visible in isolation, all four states)
6. Diagnostic flow (text-first + voice variant) end-to-end with placeholder content
7. Practice session (text-first + voice variant) with placeholder content
8. Speed drill with placeholder content
9. Dialect onboarding flow
10. Teacher monitor + student profile (with phonogram grid)
11. Parent dashboard + parent voice sessions
12. Autopilot decision engine skeleton + decision feed
13. Tests + manual QA
14. Soft-rebrand pass on new surface metadata, page titles, and meta descriptions

---

## 14. Open Questions for Jonathan (resolve before Codex starts)

1. Voice session audio storage — extend existing reading-coach storage pattern, or stand up new object storage bucket? *Recommend: extend existing for v1.*
2. Autopilot run cadence — every session completion (event-driven) or nightly cron? *Recommend: both, with debounce.*
3. Dialect onboarding — required at signup or deferrable? *Recommend: deferrable; skip-by-default, surfaced as a banner after first session.*
4. Student profile page (teacher view) — is the phonogram grid full-width below the existing two-column layout, or replace the existing right sidebar? *Recommend: full-width below, per the mockup.*

---

**End of v1 spec.**

Companion spec to follow: `reading-buddy-v2-content-pipeline-codex-spec.md` — content sourcing strategy, literacy quality rubric extension, phonogram word list generation, passage strategy decision, Tier 2 vocab inventory.
