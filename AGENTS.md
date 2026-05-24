# Agent Guidance

## Product Strategy

This repository powers **Sýnesis Learning** — an AI-powered literacy intervention and mastery platform for K-8. The company brand is Sýnesis (display) / Sýnesis Learning (formal). The flagship product is **Reading Buddy**, the literacy program on the **Venus** tile of the planetary product family. Pennsylvania PSSA test prep is **one Test Prep module** under the Sýnesis umbrella, not the product identity.

The repo folder is still named `pssa-prep-platform-live` for legacy reasons; do not let the folder name shape new code.

Read `PRODUCT_VISION.md` for the full direction. Read `specs/reading-buddy-v1-codex-spec.md` before touching any literacy code — it is the source of truth for v1 schema, routes, components, and acceptance criteria.

## Soft Rebrand Rule

We are in a **soft rebrand**. The two brand layers coexist by route until a separate hard-rebrand spec lands:

- **New routes** (`app/student/*`, `app/teacher/literacy/*`, `app/parent/literacy/*`, `app/onboarding/listening/*`) render the Sýnesis chrome: `SynesisHeader`, `ProgramSwitcher`, `TestPrepDropdown`, `MigrationBanner`, `ProgramBreadcrumb`.
- **Legacy PSSA routes** (existing teacher dashboard, TDA scoring, PSSA-aligned lessons) keep `AppChromeHeader.tsx` and existing copy. **Do not modify them in soft-rebrand work.**

If a task would force both headers to change at once, stop and confirm — that scope belongs to the hard-rebrand spec, not to a literacy or content task.

## Pedagogy Discipline

All literacy behavior must align with `memory/reference_phonogram_methodology.md`:

- **Ehri's four phases** of word reading (`EhriPhase` enum).
- **Six syllable types** (`SyllableType` enum): closed, open, VCe, vowel team, r-controlled, consonant + le.
- **Phonogram-by-analogy** decoding — word splitting must split on real phonogram boundaries from `PhonogramFamily`, not arbitrary syllables.
- **6-strand literacy model** (`LiteracyStrand` enum): Phonemic Awareness, Decoding, Morphology, Fluency, Vocabulary, Comprehension.

Adult-facing surfaces lead with **Ehri phase placement** as the headline metric; Lexile is a supporting tag. Use **"striving readers"**, never "struggling."

## Voice Rules

- TTS in v1 is the browser `SpeechSynthesis` API, wrapped behind `lib/voice/tts.ts`. **Do not introduce ElevenLabs or any third-party TTS** without an explicit spec.
- STT extends the existing OpenAI/Whisper-backed `app/api/student/reading-coach/route.ts` pipeline.
- All audio storage must be authenticated reads. **Never public URLs.**
- Recording can be disabled per-student; live transcription must still work without retained audio.
- Default audio retention is 90 days; parents can delete a session at any time.

## Dialect & Privacy — Hard Limits

- Dialect and L1 settings are **opt-in only** via the dialect-onboarding flow. **Never auto-detect dialect.**
- The product **must never collect or infer race, ethnicity, or socioeconomic status** — not as a field, not as an analytics dimension, not as a derived signal.
- Dialect transfers (e.g., AAE pronunciation of "tooth" as "toof") must log as `EXPECTED_DIALECT_TRANSFER` when dialect settings opt in, not as reading errors.
- The dialect onboarding flow must be skip-able at every step. Empty `regionalDialects` is a valid state.

## Module-Aware Code

Treat assessment, standards, and module metadata as first-class:

- `SynesisProgram` (Venus/Mercury/Mars/Earth) for subject programs.
- `TestPrepModule` (PSSA, with STAAR/FSA/MCAS planned) for state test prep.
- `User.enrolledPrograms` and `User.enrolledTestPrep` gate visibility.
- New user-facing copy that names a state ("Pennsylvania PSSA," "PA Core") is acceptable **only inside the PSSA Test Prep module surfaces**, not in shared chrome or generic onboarding.
- Use the "Request your state" form (writing to `StateRequests`) for unbuilt state modules. Do not ship empty UI for unbuilt states.

## PSSA Handling

PSSA is a **preserved asset**. Do not delete or flatten:

- `lib/diagnosticGenerator.ts`, `lib/testDesignAgent.ts`, `lib/pssaSamplerPatterns.ts`, `lib/pssaTdaExemplars.ts`, `lib/essayGrader.ts`.
- V2 lesson pipeline: `lib/lessonGeneratorV2.ts`, `lib/lessonV2Critic.ts`, `lib/lessonV2Schema.ts`, `lib/lessonV2Validators.ts`, `lib/prebuiltLessonLibrary.ts`, `lib/pssaExemplarLoader.ts`, `lib/pssaLessonExemplars.ts`.
- PA Core standards mappings, TDA rubric and scoring support, existing PSSA seed data and demo content, legacy PSSA UI surfaces.

Acceptable PSSA-specific locations: assessment module definitions, PSSA diagnostic generators and blueprints, PA Core standards mappings, PSSA item sampler/style references, TDA rubric and scoring support, UI copy on explicitly PSSA-aligned screens, the Test Prep module surfaces.

Avoid PSSA-specific language in: Sýnesis global chrome, Reading Buddy surfaces, parent-facing literacy copy, dialect onboarding, voice infrastructure, autopilot decision text (unless the decision is about a PSSA-aligned assessment).

## Go-to-Market Anchor

The near-term commercial focus is **direct-to-family parent-pay subscriptions**. Schools and districts are later. Tutors and small learning centers are a relevant secondary buyer, especially in Pennsylvania. When making product-shape decisions, default to flows that work for a parent paying for their own child; school-classroom assumptions are no longer the baseline.

## What Codex Should Not Do (from v1 spec §12)

1. **Do not generate literacy lesson content.** No phonogram word lists, no passages, no vocab definitions, no comprehension items in v1. Seed data comes from the v2 content pipeline.
2. **Do not modify existing PSSA-focused UI surfaces** during soft-rebrand work.
3. **Do not implement third-party TTS.** Browser `SpeechSynthesis` only, wrapped behind the TTS interface.
4. **Do not auto-detect dialect.** Settings only exist if the family explicitly opts in.
5. **Do not infer race, ethnicity, or socioeconomic status** from any input.
6. **Do not ship state-specific UI** for unbuilt states. Build module-aware architecture; the only built state module is PSSA.
7. **Do not invent passages or stories** for diagnostic, practice, or speed drill. Flag content as `TODO: from content pipeline`.

## Workflow Guidance

- **Open the mockup first.** When implementing any literacy route, open the corresponding HTML file in `mockups/`, read the dark "Design notes for review" panel (it is spec material, not flavor text), and match layout, spacing, color, and copy faithfully.
- **Schema-first.** Add Prisma models and migrations before wiring components. The v1 spec §3 lists every model.
- **Build in spec order.** v1 spec §13 has a 14-step implementation order — follow it. Ship incrementally.
- **Keep deterministic scoring reliable.** AI generates explanations, lessons, recommendations, and gist-graded answer rubrics. AI does not replace deterministic answer keys or PSSA scoring logic.
- **Test the autopilot.** Autopilot decision-making functions must be pure (inputs → known decision) so they're testable without a database.

## Sources of Truth

- **Brand:** `memory/project_synesis_brand_decision.md`, `branding/`, `branding/trademark-attorney-email.md`.
- **Pedagogy:** `memory/reference_phonogram_methodology.md`.
- **Design:** `mockups/index.html` and the thirteen linked screens.
- **v1 implementation:** `specs/reading-buddy-v1-codex-spec.md`.
- **v2 content pipeline:** `specs/v2-content-pipeline-codex-spec.md`.
- **Product vision:** `PRODUCT_VISION.md`.

## Known Areas Still Carrying Legacy PSSA Branding (For Future Hard-Rebrand)

Not to be touched during literacy work; flagged here so a future hard-rebrand spec has the inventory:

- `package.json` (`pssa-prep-platform`)
- `README.md` ("PSSA Prep Platform MVP")
- `app/layout.tsx` (title/description)
- `components/AppChromeHeader.tsx` ("PSSA Platform")
- `components/LoginForm.tsx` ("PSSA Platform account")
- `app/admin/page.tsx`, `components/AdminDashboardPage.tsx` (admin product copy)
- `prisma/seed.ts` (demo assessment titles)
- `app/api/tests/create/route.ts` (default test title)
- `app/api/teacher/assignments/route.ts` (default assignment title)
- `lib/reportBuilder.ts` (`pssa_ela_practice_01`)
- `components/StudentTest.tsx`, `components/TeacherDashboardPage.tsx`, `components/TeacherTdaScoringPanel.tsx`, `components/TeacherTutorAgentPanel.tsx`
