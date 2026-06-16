# P4A — synthetic grade-7 end-to-end voice-capture smoke · Codex spec

**Date:** 2026-06-16 · v2 post-Pro · Verified against `origin/main` (post-P3). Track: Reading Buddy age-band (P1→P2→P3 landed).
**Goal:** prove the **already-built** capture path works end-to-end for a 7-8-band reader, using a **synthetic throwaway account** — *before* any real minor touches it. A synthetic grade-7 student → derives `BAND_7_8` → loads the a_e Coach Mode lesson ("Jake at the Race") → reads nonsense words into a real mic → a clip lands in **private** blob + a `VoiceSession` and `LabeledVoiceSegment` row are created → a `VOICE_ANNOTATOR` can see and stream the segment to label it. **No infrastructure is built here — discovery confirmed it all exists.** P4A only seeds the accounts and adds a post-capture DB **verifier**.

**This is P4A (technical, synthetic-only). The real consented Yohanna pilot is P4B and is explicitly OUT OF SCOPE here** (see bottom).

## What discovery already confirmed is BUILT (do NOT rebuild)
- `StudentProfile.grade: Int`; `presentationProfileForGrade(grade)` (grade ≥ 7 → `BAND_7_8`); `app/student/practice/page.tsx` derives the profile + `trainingCaptureEnabled` server-side and calls `buildLessonPlayerData("a_e", { presentationProfile, trainingCaptureEnabled, studentUserId })`.
- Consent gate: `VoiceConsent.trainingCorpusOptedIn === true` (checked in `app/student/practice/page.tsx` AND re-checked in `app/api/voice/capture/pseudoword/route.ts:56-59`).
- Capture path: `app/api/voice/capture/pseudoword/route.ts` — `ensureLiteracyProfile(studentUserId)` (auto-creates the LiteracyProfile, line 86), validates the pseudoword via `canonicalPseudowordsForTargetPatterns` (content-v3 seed), creates a `VoiceSession` (`retentionTier: "TRAINING"`) and a per-word `LabeledVoiceSegment` (`segmentAudioKey`, `expectedText`, `asrTranscript: ""`, `labeledAt` null, `phonogramCode`/`syllableType` from validation).
- Private storage: `lib/voice/storage.ts` `addVoiceAudioObject(... access:"private")`, pathname `voice/${studentUserId}/...`, ownership-prefix guard in `voiceAudioPathnameForStudent`/`getVoiceAudioObject`; token `VOICE_BLOB_READ_WRITE_TOKEN`.
- Labeling: `app/api/voice/audio/segment/[id]/route.ts` (streams the clip to `ADMIN`/`VOICE_ANNOTATOR`, annotator only for unlabeled/unskipped, no raw blob URL, access-logged via `voiceAudioAccessLog`), `app/api/voice/labeling/queue/route.ts` (predicate `labeledAt: null, skippedAt: null`), `app/api/voice/labeling/segment/[id]/route.ts`, and the admin UI under `app/admin/voice/labeling/*`. Role `VOICE_ANNOTATOR` is a plain `User.role` string already recognized in `middleware.ts` + those routes.
- Consent helpers (`lib/voice/consent.ts`): `ensureVoiceConsent(studentUserId, actor?)` and `updateVoiceConsent({ studentUserId, actor: Actor, trainingCorpusOptedIn? })` — **`actor` is required for the update** and both write a `VoiceConsentDecision` log.
- `seed.ts` already upserts a grade-7 student (`grade7.student@example.com`) but seeds **no** `VoiceConsent`, **no** `VOICE_ANNOTATOR`, **no** `LiteracyProfile`.

## STOP-0 — read-only discovery to confirm before writing any code
Confirm against the real code; if any is unclear, STOP and report rather than inventing:
1. The exact `Actor` type + `ensureVoiceConsent`/`updateVoiceConsent` signatures in `lib/voice/consent.ts` (P4A sets `trainingCorpusOptedIn` ONLY via these helpers with a real actor — never a raw `db.voiceConsent.create`/`db.voiceConsentDecision.create`).
2. The real a_e accepted pseudoword path: `canonicalPseudowordsForTargetPatterns` + the content-v3 seed used by `capture/pseudoword/route.ts` — the verifier derives the accepted set from THIS, not a duplicated list.
3. That `VOICE_ANNOTATOR` users need no profile row (role string only) and no onboarding FK blocks login.
4. The dev seed password convention (how `prisma/seed.ts` builds `passwordHash`) so the smoke accounts reuse it; and the labeling-queue eligibility predicate (`labeledAt: null, skippedAt: null`) so the verifier asserts the exact same condition.

## What to build
1. **Dedicated, idempotent seed script — `scripts/seed-reading-buddy-p4a-voice-smoke.ts` (NOT `prisma/seed.ts`).** The global demo seed must not silently start opting a student into training capture. Do NOT modify `prisma/seed.ts` (or any existing demo student) — if a blocker forces it, STOP and report. The script `upsert`s, clearly synthetic, and may reuse existing school/class conventions:
   - A **dedicated synthetic capture-smoke student**: `email: "grade7-voice-smoke@example.com"`, `name: "Grade7 Voice Smoke (synthetic)"`, `role: "STUDENT"`, `StudentProfile.grade: 7`, `passwordHash` via bcrypt using the **dev seed password convention** (never a production secret/real password).
   - A **`VOICE_ANNOTATOR`** account: `email: "voice-annotator-smoke@example.com"`, `name: "Voice Annotator Smoke (synthetic)"`, `role: "VOICE_ANNOTATOR"`, same dev password convention, no profile.
   - **Consent opt-in via helpers only:** create/upsert the student AND an actor (use the smoke annotator or an existing admin) first, then `ensureVoiceConsent(student.id, actor)` followed by `updateVoiceConsent({ studentUserId: student.id, actor, trainingCorpusOptedIn: true })`. Do NOT raw-create `VoiceConsent`/`VoiceConsentDecision` rows.
   - Do NOT seed a `LiteracyProfile` (the capture route auto-creates it via `ensureLiteracyProfile`).
   - On success, **print** the synthetic student email, the annotator email, and the smoke password, so the manual checklist can log in.
2. **Post-capture DB verifier — `scripts/test-reading-buddy-p4-voice-smoke.ts`**. **DB-only:** it must NOT fetch private blob data, mint raw blob URLs, or require `VOICE_BLOB_READ_WRITE_TOKEN` (audio streaming is verified manually through the authenticated UI/segment route). Given the synthetic student's email, it queries the DB AFTER a manual mic capture and asserts:
   - The synthetic student has `VoiceConsent.trainingCorpusOptedIn === true`.
   - At least one `VoiceSession` for the student's LiteracyProfile with `retentionTier === "TRAINING"`.
   - At least one `LabeledVoiceSegment` with: `segmentAudioKey` starting `voice/${studentUserId}/` (private prefix), `asrTranscript === ""` (never transcribed), `labeledAt === null` (unlabeled), `expectedText` ∈ the **derived** a_e canonical pseudoword set (from `canonicalPseudowordsForTargetPatterns`, not a hardcoded list), and `phonogramCode === "a_e"` / `syllableType === "VCE"` (set by the route's validation).
   - That segment satisfies the **exact** labeling-queue predicate (`labeledAt: null, skippedAt: null`) so the annotator would see it.
   - The `VOICE_ANNOTATOR` smoke account exists with role `VOICE_ANNOTATOR`.
   - **Fail loudly** with a clear "run the manual mic step first" message if no qualifying capture exists yet — never a false green. The verifier checks invariants; it does NOT fake the mic step.
3. **Manual smoke checklist — `specs/p4a-voice-smoke-checklist.md`** (new), explicit ordering:
   - Run the seed script → note the printed emails + smoke password.
   - Log in as the synthetic student → open `/student/practice` → confirm BAND_7_8 Coach Mode ("Reading Coach", slate/indigo, "Jake at the Race") → reach Part 3 **nonsense words** → read one into a real mic.
   - **Run the DB verifier now — after capture, BEFORE labeling.** (Once the annotator labels the segment, `labeledAt` is no longer null and the queue-eligibility assertion will fail *by design* — so verify first.)
   - Log in as the `VOICE_ANNOTATOR` smoke account → open the labeling queue → confirm the segment is listed and the clip streams via `/api/voice/audio/segment/[id]` (no raw blob URL), then label it.
4. **Package wiring — explicit MANUAL aliases ONLY.** Add exactly these two scripts to `package.json` and nothing else:
   - `"seed:p4a-voice-smoke": "tsx scripts/seed-reading-buddy-p4a-voice-smoke.ts"`
   - `"test:p4a-voice-smoke": "tsx scripts/test-reading-buddy-p4-voice-smoke.ts"`
   **Do NOT add `test:p4a-voice-smoke` to any aggregate/default command** (`build`, `test:content-v3`, `test:reading-buddy`, or any CI-like aggregate). It is *expected to fail* until the manual mic step has happened, so it must only ever be run by hand.

## Hard guardrails
- **Synthetic ONLY.** Do NOT seed, modify, or enable capture for any real student. `trainingCorpusOptedIn: true` is set ONLY on the obviously-synthetic smoke student.
- **No real minor in P4A.** P4A may *produce* the P4B checklist but must not touch a real account.
- **No child audio without consent.** Capture stays gated on `trainingCorpusOptedIn === true` — do not weaken or bypass the gate.
- **Private storage only.** No public Blob, no raw blob URL exposure — reuse the existing helpers/routes unchanged. Verifier is DB-only.
- **Do NOT change** VAD, capture, ASR, scoring, lesson content, the presentation/Coach Mode layer (P1/P2/P3), the consent model, the storage helpers, or the labeling routes. P4A is **seed script + verifier + checklist only**.
- **Known gotcha — do NOT fix it in P4A:** `GET /api/voice/labeling/segment/[id]` returns `audioUrl: /api/voice/audio/session/${voiceSessionId}` (a session-level URL) even for segment audio (route.ts:29). The admin labeling *page* correctly prefers `/api/voice/audio/segment/[id]` when `segmentAudioKey` exists, so the manual smoke should confirm the admin UI/audio element uses the **segment** route. If this JSON-route discrepancy actually blocks the checklist, **STOP and report** — do not let P4A become a route-fix PR.
- **Do NOT create a new role** — `VOICE_ANNOTATOR` already exists; just assign the string.
- Clearly-synthetic emails/names; impossible to confuse with a real child. Smoke password is a dev convention, never a secret/real password.
- If the consent-helper/actor shape, pseudoword path, or any seed relation is unclear → **STOP and report** (do not invent).

## Out of scope — P4B (separate, consent-gated)
The real-student (Yohanna) pilot is **P4B**, not P4A. P4A must not seed/modify/enable capture for a real account. P4B will handle: confirmed **parental consent** (the signable form already exists), real account verification, grade/profile/opt-in verification, a live-session checklist, and the post-session retention/labeling check. P4A's deliverable for P4B is just the checklist.

## Acceptance / tests
- The dedicated seed script runs idempotently (re-runnable) and creates: the synthetic grade-7 capture student + `VoiceConsent(trainingCorpusOptedIn=true)` via the helpers + the `VOICE_ANNOTATOR` smoke account; prints the emails + smoke password; **`prisma/seed.ts` and all existing demo students are untouched** (diff confirms).
- After a manual mic capture as the synthetic student, `scripts/test-reading-buddy-p4-voice-smoke.ts` passes all invariant assertions (run before labeling); before any capture it fails with the clear "run the mic step first" message.
- Existing voice tests still pass: `npx tsx scripts/test-voice-activity.ts` and `npm run test:voice-capture-layer2` (the only verified-existing aliases are `test:voice-flywheel`/`test:voice-tts`/`test:voice-capture-layer2`; run any other existing voice invariant scripts directly via `tsx` if present, but do NOT invent new aliases), plus `npx tsc --noEmit` and `npm run build`.
- `package.json` gains ONLY `seed:p4a-voice-smoke` + `test:p4a-voice-smoke`, and `test:p4a-voice-smoke` is NOT added to any aggregate command.
- `git grep` shows no weakening of the consent gate or storage privacy; the diff is limited to the four files below.

## Scope (files)
`scripts/seed-reading-buddy-p4a-voice-smoke.ts` (new), `scripts/test-reading-buddy-p4-voice-smoke.ts` (new), `package.json` (manual `seed:p4a-voice-smoke` + `test:p4a-voice-smoke` aliases only; NOT added to any aggregate command), `specs/p4a-voice-smoke-checklist.md` (new). **No `prisma/seed.ts`, app/route/lib/component changes.** If anything else needs editing, STOP and report.
