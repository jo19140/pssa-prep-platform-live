# Product Vision

## Company

**Sýnesis Learning** (display: **Sýnesis**, pronounced "SIN-eh-sis", tagline "Learning Woven Together") is an AI-powered literacy intervention and mastery platform for grades K-8. The company's flagship product is **Reading Buddy**, a voice-first reading intervention program. Pennsylvania PSSA test prep — the work this codebase originally shipped — continues as one **Test Prep** module under the Sýnesis umbrella.

The repository folder is still named `pssa-prep-platform-live` for legacy reasons. The product identity is Sýnesis. The product name on new surfaces is Sýnesis; the program name on the literacy surfaces is Reading Buddy. PSSA prep is a sibling module to Reading Buddy, not the parent.

## Product Family

Sýnesis is organized as a family of subject programs under a planetary metaphor:

- **Reading Buddy** on **Venus** — literacy intervention. Flagship and the only built program in v1.
- **Math Buddy** on **Mercury** — math intervention. Future.
- **Science Buddy** on **Mars** — science. Future.
- **History/Social Studies Buddy** on **Earth** — future.

Test prep is a separate sibling surface (not a planet), exposed as a dropdown in the global chrome:

- **PSSA** (Pennsylvania) — only currently built module.
- **STAAR** (Texas), **FSA** (Florida), **MCAS** (Massachusetts) — planned. A "Request your state" lead-capture form writes to `StateRequests` so we learn which states have demand before we build them.

## Core Product Loop

1. A student takes a standards-aligned diagnostic, optionally voice-first.
2. The system places the student on Ehri's four-phase model and produces a 6-strand literacy profile plus a phonogram and syllable-type mastery grid.
3. An autopilot engine generates a personalized intervention plan and logs every plan change with adult-facing reasoning.
4. The student practices through reading sessions, speed drills, and voice activities; transcripts and audio are stored with parent visibility and authenticated access.
5. The teacher, tutor, interventionist, or parent sees growth, autopilot decisions, and what the program will do next, in plain-English copy.

## Pedagogy

Sýnesis's literacy work is grounded in a specific framework (see `memory/reference_phonogram_methodology.md`):

- **Ehri's four phases** of word reading (pre-alphabetic → consolidated alphabetic).
- **Six syllable types**: closed, open, VCe, vowel team, r-controlled, consonant + le.
- **Phonogram-by-analogy** decoding.
- **The 6-strand literacy model**: Phonemic Awareness, Decoding, Morphology, Fluency, Vocabulary, Comprehension.

Adult-facing surfaces lead with Ehri phase placement; Lexile is a supporting tag. Copy uses **"striving readers"**, never "struggling."

## Differentiators

- **Voice-first.** TTS and STT are first-class. v1 uses browser `SpeechSynthesis` and Whisper-backed STT; an interface seam (`lib/voice/tts.ts`) lets us swap to ElevenLabs or similar later without touching components.
- **Dialect-aware.** Families can opt in to home-language and regional-dialect settings (e.g., AAE, Southern, Chicano, Caribbean). Expected dialect transfers are not counted as reading errors. Dialect is **never auto-detected**, and the product **never collects or infers race or ethnicity**.
- **Autopilot.** Plan generation and adjustment runs automatically with every decision logged in adult-readable language ("switched to morphology focus because comprehension stalled 3 weeks"). Teachers and parents can see and override.
- **Buddy character.** A reusable animated companion (`BuddyCharacter` component) with idle/listening/speaking/confused states lives inside the voice surfaces.
- **PSSA-grade rigor.** The PSSA module — exemplar-grounded items, TEI support, TDA scoring, PA Core mappings — is a credibility anchor and the proof of standards rigor in PA. It is preserved and continues to evolve as a Test Prep module.

## Go-to-Market

Per the trademark filing intake (`branding/trademark-attorney-email.md`):

- **Initial deployment is direct-to-family parent-pay** subscription.
- **School and district licensing** follows once the product is proven with families.
- **Pennsylvania customers retain PSSA test-prep functionality** through the transition; the PSSA module is the local distribution hook in PA.
- **National expansion** as a general literacy product, with additional state test-prep modules added in response to demand signals from `StateRequests`.

This is a different go-to-market than the old PSSA-platform thesis (which was teacher- and classroom-led). Tutors, interventionists, and small learning centers remain a relevant secondary buyer, especially in PA, but the primary commercial wedge is families.

## Primary Users

- **Parents (primary).** Subscribed family. The parent surfaces (parent dashboard, parent voice sessions) lead with warm, plain-English summaries and the ability to listen to and delete sessions.
- **Students (primary).** K-8 readers. Voice and text both supported; the kid does the work.
- **Teachers and interventionists (secondary).** The literacy monitor and student profile surfaces support school-affiliated adults and tutoring relationships, especially the PA cohort that arrived through PSSA.
- **Admins.** Existing admin surfaces unchanged.

## Architecture Direction

The schema already supports the new direction (see `prisma/schema.prisma`). New first-class concepts (per the v1 spec):

- `LiteracyProfile`, `StrandScore`, `PhonogramFamily`, `PhonogramMastery`, `SyllableTypeMastery`, `DialectSettings`, `VoiceSession`, `AutopilotDecision`.
- `SynesisProgram` enum (Venus/Mercury/Mars/Earth) and `TestPrepModule` enum (PSSA/STAAR/FSA/MCAS) for module-aware enrollment.
- `StateRequests` for demand capture on un-built modules.
- Sýnesis brand chrome (`SynesisHeader`, `ProgramSwitcher`, `TestPrepDropdown`, `MigrationBanner`, `ProgramBreadcrumb`) lives alongside the legacy `AppChromeHeader` — they coexist by route during the soft rebrand.

The existing PSSA work — `lib/diagnosticGenerator.ts`, `lib/testDesignAgent.ts`, `lib/pssaSamplerPatterns.ts`, `lib/essayGrader.ts`, `lib/pssaTdaExemplars.ts`, `lib/lessonGeneratorV2.ts` and friends, the V2 lesson pipeline with TEI/audio/exemplar grounding — is the PSSA module. It is preserved and continues to evolve. State-specific code should be wrapped in module-aware naming over time, not deleted.

## Phasing — Where We Actually Are

### Phase 0 — DONE
- Brand decision: Sýnesis Learning, planetary product family, "Learning Woven Together," domain `synesislearning.com` being secured, trademark clearance in motion.
- V2 lesson pipeline shipped: PSSA exemplar grounding, TEI items (hot-text, drag-drop, EBSR), self-critique, distractor pedagogy rules, TTS audio, hero video matching, OER catalog.
- 13 approved mockup screens covering student diagnostic + practice, voice diagnostic + practice, speed drill, dialect onboarding, teacher caseload, teacher student detail, parent dashboard, parent voice sessions, navigation IA.
- v1 Codex implementation spec drafted: `specs/reading-buddy-v1-codex-spec.md`.
- v2 content pipeline spec drafted: `specs/v2-content-pipeline-codex-spec.md`.
- Phonogram pipeline scaffolded under `scripts/phonogram/`.

### Phase 1 — IN FLIGHT
**Reading Buddy v1 chassis** (per `specs/reading-buddy-v1-codex-spec.md`).
- Schema migrations for literacy models, enums, `StateRequests`, migration-banner flag.
- Sýnesis global chrome on new routes; legacy PSSA chrome preserved on legacy routes.
- Voice infrastructure (`lib/voice/tts.ts`, extracted `lib/voice/audioCapture.ts`).
- The ten new literacy routes wired to placeholder content.
- Autopilot decision engine skeleton + decision feed.
- Dialect onboarding flow (skip-at-every-step UX).
- Parent dashboard + parent voice sessions.

Content generation is explicitly out of scope for v1 — that is the v2 content pipeline.

### Phase 2 — NEXT
**v2 content pipeline** (per `specs/v2-content-pipeline-codex-spec.md`).
- Phonogram inventory, AWL, SUBTLEX, CMUdict alignment.
- `PhonogramFamily` seed data generated from pipeline output (not from copyrighted reference PDFs).
- Literacy-specific quality rubric extension.

### Phase 3
**v3 literacy content generation spec** (TBW).
- Passage strategy decision (licensed vs. generated vs. hybrid).
- Tier 2 vocab inventory generation.
- Decoding items, comprehension probes, phonogram practice item generation.

### Phase 4
**National expansion + product growth.**
- Parent-pay billing and subscription flows.
- Full app-wide rebrand from "PSSA Platform" → Sýnesis (separate spec, hard rebrand pass).
- Additional Test Prep modules driven by `StateRequests` demand (STAAR likely first based on market size).
- ElevenLabs or comparable production TTS swap.
- Tier 2+ add-ons in the spec backlog: personalized AI stories, daily SMS to parents, "Read together" parent mode.

### Phase 5+
**Additional planets.**
- Math Buddy / Mercury.
- Science Buddy / Mars.
- History / Earth.

## What Should Not Change

Do not delete or flatten PSSA-specific work. The PSSA module is a strategic asset: it is the most pedagogically rigorous standards implementation in the codebase, the proof point for state-test rigor, and the PA distribution hook. Reframe and wrap PSSA assets as `TestPrepModule.PSSA`-scoped over time, but treat them as durable.

Do not modify the existing `AppChromeHeader.tsx` or the legacy PSSA routes during the soft rebrand. They render on legacy paths; Sýnesis chrome renders on new paths. The two coexist until the dedicated hard-rebrand spec lands.

## Sources of Truth

- **Brand:** `memory/project_synesis_brand_decision.md`, `branding/`, `branding/trademark-attorney-email.md`.
- **Pedagogy:** `memory/reference_phonogram_methodology.md`.
- **Design:** `mockups/index.html` and the linked screens (the dark "Design notes for review" panels are spec material, not flavor text).
- **v1 implementation:** `specs/reading-buddy-v1-codex-spec.md`.
- **v2 content pipeline:** `specs/v2-content-pipeline-codex-spec.md`.
- **Agent rules:** `AGENTS.md`.
