# Post-Foundation Readiness Audit

Date: 2026-05-24
Branch: `codex/post-foundation-audit`
Audited code state: `origin/main` plus the PR #9/#10 branch commits, because GitHub still reported PR #9 and PR #10 as open during this audit even though the task prompt said they were merged.

## Executive Summary

The foundation is structurally impressive but not yet product-ready. The biggest blocker is not a React bug; it is environment/database readiness. The configured dev database has not applied the three foundation migrations (`reading_buddy_v1`, `voice_data_flywheel`, `data_flywheel_foundation`) and has two migrations in its migration table that are not present locally. Because of that drift, authenticated walkthroughs fail before the new Sýnesis surfaces can be exercised as real users.

Once migration drift is resolved, the next biggest gap is content. The Reading Buddy v1 routes mostly render shells around explicit `TODO: from content pipeline` placeholders. Voice capture, speed drills, diagnostic results, parent summaries, phonogram mastery, clip markers, and practice passages are scaffolded but not meaningful without seeded literacy content and real STT.

## 1. End-to-End Flow Walkthrough

### Test Setup Findings

- `npm run dev` starts successfully only after overriding `NEXTAUTH_URL` to localhost. `.env.local` points `NEXTAUTH_URL` at production Vercel, which makes local credential auth brittle.
- Credential login with `student@example.com / Password123!` failed. Server log showed:
  - `The column User.enrolledPrograms does not exist in the current database.`
- `npx prisma migrate status` reported unapplied local migrations:
  - `20260524153000_add_reading_buddy_v1`
  - `20260524172000_add_voice_data_flywheel`
  - `20260524190000_add_data_flywheel_foundation`
- It also reported remote DB migrations missing locally:
  - `20260517131328_add_lesson_v2_metadata`
  - `20260519152000_add_hero_match_cache`
  - `20260519153500_add_grade_fit_to_hero_match_cache`

Because authenticated login is blocked by DB/schema drift, the route walkthrough below combines direct HTTP redirect checks with source-level inspection of what each authenticated page would render.

| Route | Auth check | Render/readiness assessment |
| --- | --- | --- |
| `/student/practice` | Direct unauthenticated request redirects to `/login`. | Authenticated page should render `StudentPracticeSession`; content is explicitly placeholder. The only meaningful action is a TTS “Speak” button that reads a placeholder sentence. No real word inventory or practice activity yet. |
| `/student/diagnostic` | Redirects to `/login`. | Authenticated page should render checkboxes for literacy strands and a “Complete diagnostic” button. The diagnostic posts synthetic strand scores (`72 - index * 4`), not a real assessment. Placeholder passage is shown. |
| `/student/speed-drill` | Redirects to `/login`. | Authenticated page should render timer controls and “Save sample run”. It persists a hardcoded sample run (`18/15/2/1`) rather than real drill rows. Meaningless until phonogram content is seeded. |
| `/student/practice/voice` | Redirects to `/login`. | Same as practice, plus “Hold mic” changes UI state only. No microphone capture is wired here. TTS upgrade should work for the “Speak” button once auth and API key are valid. |
| `/student/diagnostic/voice` | Redirects to `/login`. | Auto-speaks a placeholder diagnostic intro via `getTtsProvider()`. The “voice-first” state is visual only; no real voice diagnostic capture or STT. |
| `/onboarding/listening` | Redirects to `/login`. | UI renders explicit language/dialect toggles and a skip path. Bug: it posts training consent to `/api/voice/consent/self`, but that POST route requires `PARENT`/`ADMIN`; a student sees “Settings saved” even though the training-consent update is silently caught and ignored. |
| `/teacher/literacy` | Redirects to `/login`. | Authenticated teacher page should load caseload students and `AutopilotDecisionFeed`. It will be empty unless teacher/student links and `LiteracyProfile` rows exist. Uses DB columns from unapplied v1 migrations, so it currently cannot run against the configured DB. |
| `/teacher/literacy/[studentId]` | Requires teacher access. | Should render `StudentLiteracyProfile` with strand, syllable, phonogram, and autopilot panels. Most panels are empty/TODO until diagnostic and content pipeline data exist. |
| `/parent/literacy` | Requires parent auth. | Parent dashboard renders a warm summary, but the headline claims “gained another month of reading this week” without computed evidence. “Words she’s learning” is `TODO: from content pipeline`. |
| `/parent/literacy/voice-sessions` | Requires parent auth. | Should list sessions and audio delete controls. Works structurally if `VoiceSession` rows exist, but configured DB lacks the required tables/columns. Clip markers remain `TODO: from content pipeline`. |

Small fix made during audit:

- Added `type="button"` and `aria-pressed` to the dialect/language toggle buttons in `components/literacy/DialectOnboardingFlow.tsx`.

## 2. TODO Inventory

Command used:

```bash
rg -i "TODO|FIXME|from content pipeline|placeholder|stub|defer|deferred|not implemented|coming soon" app components lib scripts prisma specs
```

Raw match count: 113.

Grouped counts:

- Content and placeholder learning material: 44
- Voice/STT/audio deferrals and placeholders: 11
- Parent UX: 2
- Admin tooling: 4
- Legacy form placeholder attributes: 50
- Other/schema defaults: 2

Top 10 highest-priority items:

1. `lib/literacy/constants.ts` defines the global Reading Buddy content placeholder. This blocks practice, diagnostic, speed drill, phonogram mastery, and parent “words learning” surfaces from being meaningful.
2. `components/literacy/StudentPracticeSession.tsx` displays only `PLACEHOLDER_PASSAGE`; there is no real practice task, word split, or answer loop.
3. `components/literacy/StudentDiagnosticFlow.tsx` posts synthetic strand scores instead of administering actual diagnostic items.
4. `components/literacy/SpeedDrillSession.tsx` saves a hardcoded sample run instead of using seeded phonogram rows.
5. `app/api/literacy/speed-drill/route.ts` writes `transcriptJson: { mode: "speed-drill", content: "TODO: from content pipeline" }`.
6. `app/api/literacy/voice-session/route.ts` defaults transcript JSON to `TODO: from content pipeline`; no STT transcript is produced.
7. `components/literacy/VoiceSessionTimeline.tsx` renders “Clip markers: TODO: from content pipeline”; no segment markers are available to parents or labelers.
8. `components/literacy/PhonogramMasteryGrid.tsx` renders a TODO instead of meaningful mastery groups unless content pipeline records are seeded.
9. `components/literacy/ParentLiteracyDashboard.tsx` has content placeholders and an overconfident progress headline not backed by computed growth evidence.
10. `components/admin/voice/LabelingWorkspace.tsx` exists, but labeling throughput/keyboard QA from the spec has not been validated against real audio segments.

## 3. Missing Acceptance Criteria

### PR #5: Reading Buddy v1

- Routes and models exist, but the configured dev DB cannot run them until migrations are applied.
- “Do not generate literacy content” was honored, but the resulting user flows are mostly placeholders. This is acceptable for v1 chassis but should not be mistaken for usable Reading Buddy.
- Voice routes are not true voice workflows. `/student/practice/voice` has a visual hold-mic button; `/student/diagnostic/voice` auto-speaks intro copy. Neither captures microphone audio.
- Retention fields are structurally inserted on `VoiceSession` creation paths, but the requested quick query against dev DB could not be performed because migrations are not applied.

### PR #6: Voice Data Flywheel

- Schema and endpoints exist, but end-to-end acceptance is not proven in the current DB.
- Parent delete is now wired to object deletion and deletion logs, but only works when blob storage is configured. In unconfigured environments it correctly returns an error rather than writing a misleading deletion log.
- Training opt-in is default off in code/schema, but onboarding has a consent bug: student onboarding posts to `/api/voice/consent/self`; POST is parent/admin-only and the error is swallowed.
- Labeling UI and queue endpoints exist, but there is no evidence of throughput QA, real segment creation, or disagreement workflow dogfooding.
- Authenticated audio reads enforce ownership/admin/annotator checks, but object retrieval currently returns `{ audioStorageKey, expiresInSeconds }` for non-HTTPS keys rather than streaming local/private object bytes.

### PR #7: Data Flywheel Foundation

- Event/decision tables and admin explorers exist, but the configured DB has not applied the migration, so no live signal can be observed in dev.
- `ITEM_ANSWER_SUBMITTED` capture exists only on legacy test answer submission, not on the new Reading Buddy placeholder diagnostic/practice flows.
- Wrapped LLM call sites now have equality fixtures after PR #10, but this was not true at PR #7 merge time.
- Outcome computation cron exists structurally, but no end-to-end “diagnostic -> events -> outcomes -> export” proof could be run because DB migrations are missing.
- Admin explorers are inspectable tables, but useful only after events/decisions exist.

### PR #9: TTS Upgrade

- TTS server proxy, cache, cost cap, and decision logging are structurally implemented.
- The manual human blind test was performed outside Codex by request, but no automated e2e confirms `/student/practice/voice` produces an OpenAI-backed audio response under auth.
- Cost cap is count-based via `ModelDecision` rows, not actual dollars. It enforces “100 generated plays/day” rather than a dollar ceiling.
- Cache is in-memory per process. That matches v1 scope but will not dedupe across serverless instances.

### PR #10: Equality Fixtures

- Fixtures now cover the five PR #7 call sites and forced capture failure.
- Some production call sites use `persistModelDecision` (fire-and-forget/persist-only) rather than `recordModelDecision`; PR #10 introduced helper functions so fixtures can exercise the same wrapping logic.
- The fixtures prove returned values, not that real DB rows are created, because they use deterministic fake persistence.

## 4. v1 Deferrals Still Open

- LLM paraphrase grading: still open. Short answer/gist grading is heuristic server scoring plus `GIST_GRADING` capture, not LLM paraphrase grading.
- Full STT: still open. `asrVendor`, `asrModelVersion`, and `asrConfidenceMean` fields exist; no real STT is wired into Reading Buddy practice/diagnostic/speed drill.
- Latency QA: still open. Latency fields are captured for model decisions and TTS, but no user-facing latency budget or QA harness exists.
- Content pipeline integration: open. The phonogram inventory exists in repo scripts/data from prior work, but the Reading Buddy UI still displays `TODO: from content pipeline`.
- Real diagnostic content: open. Current diagnostic uses synthetic checkbox-derived scores.
- Real speed drill content: open. Current speed drill posts a hardcoded sample run.
- Parent summary truthfulness: open. Parent dashboard copy implies measured reading growth without a real computed growth signal.
- Consent/onboarding polish: open. Student-facing listening onboarding can appear to save training-consent choices that are rejected by the API.

## 5. Data Flywheel Signal Check

Could not observe live event/decision rows in the configured dev database because migrations are not applied. Login fails before route exercise, and Prisma reports the foundation migrations missing from the target DB.

Expected signal paths after migration:

- `ITEM_ANSWER_SUBMITTED`: produced by `app/api/test/answer/route.ts`, not by the new Reading Buddy placeholder routes.
- `TDA_SCORING`: produced by `lib/essayGrader.ts` when OpenAI grading runs.
- `DISTRACTOR_GENERATION`: produced by `lib/learningLessons.ts` after OpenAI lesson enrichment.
- `DISTRACTOR_CRITIC`: produced by `lib/learningLessons.ts` self-critique.
- `HERO_VIDEO_MATCH`: produced by `lib/learningLessons.ts` resource matching heuristic.
- `GIST_GRADING`: produced by `app/api/test/answer/route.ts` for short-response answers.
- `TTS_GENERATION`: produced by `/api/voice/tts` on cache misses.

Admin explorer readiness:

- `/admin/events` and `/admin/decisions` are admin-gated and table-based.
- They should be usable once auth and migrations work.
- They currently cannot demonstrate real data in this environment.

Autopilot feed:

- `recommendNextLiteracyMove()` is deterministic and route-backed via `/api/literacy/autopilot/run/[studentId]`.
- The teacher and student profile surfaces read `AutopilotDecision` rows.
- There is no automatic trigger observed that populates autopilot decisions during diagnostic/practice flows. A teacher/admin must call the run endpoint or another future job must trigger it.

## 6. Cost Reality Check

Live cost rows could not be queried because `ModelDecision` does not exist in the configured database. I ran the deterministic equality fixtures instead; those exercise the wrappers but do not persist real rows.

Fixture cost observations:

| Decision type | Fixture N | Fixture cost source | Mean cost |
| --- | ---: | --- | ---: |
| `TDA_SCORING` | 2 wrapper paths | fake metadata in fixture | `$0.0010` |
| `DISTRACTOR_GENERATION` | 2 wrapper paths | fake metadata in fixture | `$0.0010` |
| `DISTRACTOR_CRITIC` | 2 wrapper paths | fake metadata in fixture | `$0.0010` |
| `GIST_GRADING` | 2 wrapper paths | heuristic metadata | `$0.0000` |
| `HERO_VIDEO_MATCH` | 2 wrapper paths | heuristic metadata | `$0.0000` |
| `TTS_GENERATION` | 1 equality fixture + fallback fixture | OpenAI TTS character-count formula, no persisted row | nonzero formula only; no live row |

Pricing formula reality:

- `gpt-4o-mini`: `$0.15 / 1M input tokens`, `$0.60 / 1M output tokens`
- `gpt-4o`: `$2.50 / 1M input tokens`, `$10.00 / 1M output tokens`
- TTS: `$15 / 1M characters`

Surprising item:

- The TTS daily cap is implemented as a generated-playback count, not as a true dollar cap. That is probably fine for v1, but the name “cost cap” is slightly stronger than the implementation.

## 7. Top 5 Recommended Next Spec Candidates

1. **Migration and environment hardening**
   - Impact: highest. Engineering week: low.
   - The foundation cannot be exercised against the configured dev DB. Resolve migration drift, repair `.env.local` defaults, and add a one-command local readiness check that verifies auth, schema, and seeded demo users.

2. **Reading Buddy content integration**
   - Impact: highest product impact. Engineering week: medium.
   - Replace `TODO: from content pipeline` in practice, diagnostic, phonogram mastery, and speed drill surfaces with the seeded phonogram inventory and reviewed passages/items. This turns the chassis into an actual learning product.

3. **Voice capture + STT MVP**
   - Impact: high. Engineering week: medium/high.
   - The voice UI is mostly visual. Add microphone capture to practice/diagnostic, run STT or accepted fallback transcription, populate `VoiceSession` fields, and create labelable segments.

4. **Data flywheel smoke/e2e harness**
   - Impact: high. Engineering week: low/medium.
   - Add a scripted seed + exercise path that produces `StudentEvent`, `ModelDecision`, outcomes, admin explorer rows, and an export manifest. This would catch the exact current “schema exists but DB cannot run it” gap.

5. **Parent and consent UX truth pass**
   - Impact: medium/high. Engineering week: low.
   - Fix onboarding consent semantics, make parent growth copy evidence-backed, and add visible error states when consent saves fail. This is privacy-sensitive and currently too easy to misread.

## Appendix: Verification Commands Run

```bash
npx prisma migrate status
curl -sI http://localhost:3000/student/practice
curl -sI http://localhost:3000/student/diagnostic
curl -sI http://localhost:3000/onboarding/listening
curl -sI http://localhost:3000/teacher/literacy
rg -i "TODO|FIXME|from content pipeline|placeholder|stub|defer|deferred|not implemented|coming soon" app components lib scripts prisma specs
```

The route `curl` checks confirmed auth redirects. Browser login could not complete because the current database schema is behind the merged foundation code.
