# Wave 0 — Codex specs (close the open loops)

**Date:** 2026-06-14 · Companion to `specs/reading-buddy-roadmap.md`.
Two independent specs. Do them in order; each is paste-ready for Codex. Verified against `main` @ `83346c2`.

---

# Spec 1 — OpenAI TTS → fixes the robotic voice

> **STATUS: RESOLVED (2026-06-14).** PR F (`93fd1ca`) was **already merged on `origin/main`** (`caee276`) — no cherry-pick was needed. The robotic voice was a **`.env` runtime config** issue, not a missing merge. Codex set `TTS_PROVIDER=OPENAI` + `TTS_PER_STUDENT_DAILY_CAP=100` + the key (local `.env`, uncommitted), and verified live: `POST /api/voice/tts 200`, equality fixture passing, security properties confirmed (STUDENT-only, server-side key, hashed cacheKey, cache-before-cap, 429 cap, graceful fallback). The cherry-pick instructions below are **moot/historical** — kept for the record. The original "built but never merged" framing was a stale-local-mount error (mount was at `83346c2`, behind `origin/main`).

## Why (original framing — superseded; see STATUS above)
Harper sounds robotic because main only has browser `SpeechSynthesis`. The OpenAI TTS work (PR F) was fully built but never merged — it lives on branch `codex/pr-f-openai-tts`, commit `93fd1ca`.

## Critical: do NOT merge the whole branch
`codex/pr-f-openai-tts` also carries commits PR A (`6e174c9`), B (`831c60d`), E (`5eb7333`). **A and E are already on main** via the FL track (kid-facing titles + Harper character). Merging the branch would re-apply/duplicate them. **Cherry-pick PR F's single commit instead** — it's clean.

PR F's commit (`93fd1ca`) touches only:
```
.env.example                                     (+2)
app/api/voice/tts/route.ts                       (NEW, server proxy)
components/literacy/StudentPracticeSession.tsx   (+4/-2: browserTts -> getTtsProvider)
lib/decisions/decisionTypes.ts                   (+1: TTS_GENERATION)
lib/voice/providers/openai-tts.ts                (NEW)
lib/voice/providers/openai-tts.equality.test.ts  (NEW)
lib/voice/tts-cache.ts                           (NEW)
lib/voice/tts-cost-cap.ts                        (NEW)
lib/voice/tts-decision.ts                        (NEW)
lib/voice/tts.ts                                 (+11: getTtsProvider factory)
package.json                                     (+1 dep)
```

## Steps (Codex, on the real Mac repo)
```bash
cd /Users/diaz/pssa-prep-platform-live
git checkout main && git pull
git checkout -b codex/merge-pr-f-tts
git cherry-pick 93fd1ca
```
- If a conflict appears in `components/literacy/StudentPracticeSession.tsx`, it's only the `browserTts` → `getTtsProvider()` swap (import line + the one `speak()` call). Resolve by keeping **`getTtsProvider()`**, drop `browserTts`.
- Then:
```bash
npm install            # package.json gained a dependency
```
- **Lockfile:** this repo uses `package-lock.json`. `npm install` will likely update it — **include the updated `package-lock.json` in the PR** (expected, not pollution). Do **not** hand-edit the lockfile.

## Configure runtime (the actual reason it falls back to robotic)
- Ensure **`.env`** (not just `.env.example`) has:
  ```
  TTS_PROVIDER=OPENAI
  OPENAI_API_KEY=sk-...        # server-side only
  ```
- The provider falls back to browser TTS on any failure, so a missing/invalid key = robotic voice with no error. This is the #1 thing to check.

## Audit checklist (confirm, do not assume — these were the security constraints)
- `app/api/voice/tts/route.ts`: **authenticated, not public.** Verified on the branch as `requireUser(["STUDENT"])` — keep as-is; the player is the only caller. Do **not** add `ADMIN` (or any other role) speculatively — an unused role is needless auth surface. Add `ADMIN` only if/when an actual admin TTS-preview surface calls this route.
- **reads key from `process.env.OPENAI_API_KEY` server-side only**, never returned to client; strips stray quotes from the key (`.trim().replace(/^['"]|['"]$/g,"")`).
- **Cache checked FIRST** (server-side, `getCachedTtsAudio` before any OpenAI call) — a cache hit does not call OpenAI and does not charge the cost cap.
- Cost cap reached → HTTP **429** (`{ error: "tts_cap_reached", ... }`).
- `ModelDecision` for TTS stores **metadata only** (`textLength`, `voice`, `model`, `cacheKey`) — **never raw audio bytes or raw passage text**. Confirm-point (verified on the branch, keep it true): `cacheKey` is a **`sha256` hash** of `{model,text,voice}` (`tts-cache.ts`), not raw text, and `tts-decision.ts` records `rawTextStored: false, rawAudioStored: false`. The cache metadata must remain a hash — never embed the passage text.
- On OpenAI failure → graceful fallback to `BrowserTtsProvider` (kid still hears something).
- `getTtsProvider()` factory returns OpenAI by default, browser when `TTS_PROVIDER=BROWSER`.

## Verify
```bash
npm test -- openai-tts.equality      # the wrapped-vs-unwrapped equality fixture must pass
npm run dev                          # RUN FROM THE PRIMARY CHECKOUT (has data/phonogram/subtlex.csv)
```
- Open `/student/practice`, trigger Harper speech. Confirm a **warm voice**, and in the Network tab `/api/voice/tts` returns **200** (not erroring into fallback).
- **Cache acceptance (corrected):** a second playback of the same `(text, voice, model)` within 24h must produce **no new OpenAI API call and no cost-cap charge**. The cache is **server-side**, so the client may still call `/api/voice/tts`; the route must return the cached audio (`X-TTS-Cache: HIT`). Do **not** assert "no route call" — assert "no new OpenAI call / no cap charge."

## Then
Commit, push, open PR, merge to main after the audit + equality test pass.

## Do NOT
Merge the whole branch · expose `OPENAI_API_KEY` to the client · store raw audio/text in `ModelDecision` · change the `TTSProvider` interface · add ElevenLabs/Cartesia (future spec).

---

# Spec 2 — Lexicon graceful render fix (no more `HOMOPHONE_LEXICON_UNAVAILABLE` crash)

## Why
The student lesson render path calls `validatePseudowordCandidate(..., { strictLexicon: true })`. When the **gitignored** lexicon data (`data/phonogram/subtlex.csv`, CMUdict) is absent — e.g. a fresh worktree — the helper `getHomophoneLexicon(true)` **throws** `HOMOPHONE_LEXICON_UNAVAILABLE` and the lesson crashes. Render should degrade gracefully; **audit + tests must stay strict**.

## Important finding (refines the earlier one-line plan)
In `lib/literacy/pseudowordValidator.ts`, `strictLexicon` does **two** jobs:
1. Whether the lexicon helpers **throw** when data is missing (lines 364, 382, 399).
2. Whether the **strict exact-match collision checks run** (gated on `opts.strictLexicon === true` at lines **211** and **215**).

So the naive "render → `strictLexicon: false`" would *also* silently disable those exact-match homophone checks on the student path. (The variant-based check at lines 228–253 is **not** strict-gated and still runs, so the regression is partial, not total — but we should not weaken it on purpose.) **Decouple the two concerns instead.**

## Change (recommended — decouple fail-closed from strict-checking)
In `lib/literacy/pseudowordValidator.ts`:

1. Add an option to `PseudowordValidationOptions`:
   ```ts
   /** When the lexicon data files are missing: true (default) throws; false degrades gracefully. */
   failClosedOnMissingLexicon?: boolean;
   ```
2. Change the three helpers `getHomophoneLexicon`, `getCmudictReverseIndex`, `getRawCmudictWords` to take a `throwIfUnavailable: boolean` param (instead of conflating with `strictLexicon`). When `false`, return the existing `{ unavailable: true }` fallback (already implemented) instead of throwing.
3. In the validator body, compute once:
   ```ts
   const throwIfUnavailable = opts.failClosedOnMissingLexicon !== false; // default true
   ```
   and pass `throwIfUnavailable` to the **three exact call-sites** (these are the throw sources):
   - line **191**: `getHomophoneLexicon(opts.strictLexicon === true)` → `getHomophoneLexicon(throwIfUnavailable)`
   - line **216**: `getRawCmudictWords(true)` → `getRawCmudictWords(throwIfUnavailable)`
   - line **241**: `getCmudictReverseIndex(opts.strictLexicon === true)` → `getCmudictReverseIndex(throwIfUnavailable)`
   **Keep passing `opts.strictLexicon` to gate the strict checks at lines 211/215** — those stay ON for render.

4. **Non-blocking guardrail (do not regress this).** The unavailable flags must stay **diagnostic, not invalidating.** In the current code `valid` is computed as `valid: blockingIssues.length === 0`, and the `*_UNAVAILABLE` flags are pushed to **`issues`**, not **`blockingIssues`** — so a pseudoword whose only problem is missing lexicon data is still `valid: true`. **Keep it that way.** A missing-lexicon issue must never set `valid: false`, or the downstream selector `canonicalPseudowordsForTargetPatterns` (filters on `.valid`, throws "fewer than 8 valid pseudowords" at `lessonGenerator.ts:303`) would crash render at a different point.

## Caller updates
- **Render path → fail open, stay strict:**
  - `lib/literacy/lessonGenerator.ts:298` → `{ strictLexicon: true, failClosedOnMissingLexicon: false }`
  - `lib/literacy/lessonParts/part3Decoding.ts:11` and `:12` → add `failClosedOnMissingLexicon: false` (keep `strictLexicon: true`)
- **Audit + tests → unchanged (fail closed):**
  - `lib/literacy/lessonAudit.ts:201` stays `{ strictLexicon: true }` (default `failClosedOnMissingLexicon: true` → still throws loudly).
  - All `scripts/test-content-v3-*.ts` unchanged — they run where the data is present.

## Acceptance / tests
**Simulate "unavailable" via a test-only cache reset/override — NOT by deleting data files.** The lexicons are held in module-level caches (`homophoneLexiconCache`, `cmudictReverseCache`, and the raw-cmudict cache) in `pseudowordValidator.ts`. Add a test-only hook (e.g. `__setLexiconCachesUnavailableForTest()` / a reset that forces the `{ status: "unavailable" }` branch), or override the data path. **Codex must not delete, move, or rename `data/phonogram/*` or any gitignored local data in tests.**

1. **Validator, render mode — no throw, valid, diagnostic flag:** with caches forced unavailable,
   `validatePseudowordCandidate("zaf", "a_e", { strictLexicon: true, failClosedOnMissingLexicon: false })`
   returns **without throwing**, with `valid: true` (no blocking issue) and `issues` containing `HOMOPHONE_LEXICON_UNAVAILABLE`.
2. **Validator, default/audit mode — still throws loudly:** with caches forced unavailable,
   `validatePseudowordCandidate("zaf", "a_e", { strictLexicon: true })` **throws** `HOMOPHONE_LEXICON_UNAVAILABLE`. (Proves the default stayed fail-closed.)
3. **End-to-end render path (the test my first draft was missing — required):** with caches forced unavailable, run the **real render path** — `canonicalPseudowordsForTargetPatterns(...)` (and/or `generatePart3Decoding` via `part3Decoding.ts`) for an a_e target — and assert it **does not throw**, still returns the expected 8-item pseudoword line, and the results carry the `*_UNAVAILABLE` diagnostic flags. This catches the "validator doesn't throw but the selector still crashes on the <8 count" case.
4. **Audit caller still fails closed:** with caches forced unavailable, the `lessonAudit.ts` path (which calls with default options) **still throws** — proving the content gate isn't weakened.
5. Existing strict test scripts still pass when run from the primary checkout (data present) — no behavior change when lexicons load.

### Regression pins (Pro + Claude, 2026-06-14) — required
6. **`failClosedOnMissingLexicon:false` must NOT weaken strict checks when data is present.** With lexicons **available**, take an **existing known-collision fixture from the current validator tests** (a homophone / near-spelling rejection — reuse a proven one, don't invent) and run it with `{ strictLexicon: true, failClosedOnMissingLexicon: false }`. It must **still be rejected** (`valid === false`). Proves the new option only changes missing-data throw behavior, not collision strictness.
7. **Non-blocking assertion — use the REAL result shape.** `PseudowordValidationResult` exposes only `{ valid, reason, collidesWith, issues }` — **there is no `blockingIssues` field on the result** (it's internal; `issues` is the merged `[...blockingIssues, ...issues]`). So for render mode + missing lexicon, assert:
   - `result.valid === true`
   - `result.reason === null`  ← the real proof of non-blocking (a blocking issue would set `reason`)
   - `result.collidesWith === null`
   - `result.issues` includes `HOMOPHONE_LEXICON_UNAVAILABLE`
   (Do **not** assert on `result.blockingIssues` — that field doesn't exist; the assertion would be vacuous.)
8. **Test helper must be test-only.** Any cache-reset / availability-override helper must be unreachable from app/runtime code. Use deliberately ugly names, e.g. `__resetPseudowordLexiconCachesForTests()` / `__setPseudowordLexiconAvailabilityForTests(...)`. No production route or runtime toggle may make lexicons "unavailable."

## Do NOT
**Do not change `lessonAudit.ts` or any content-v3 audit caller** — the audit path must continue to fail closed by default (do not "helpfully" make it render-friendly too) · delete the strict checks at 211/215 · let a missing-lexicon issue set `valid: false` · **delete/move/rename `data/phonogram/*` in tests** (use a cache reset/override) · commit `subtlex.csv` (large, gitignored) · change default behavior for existing callers (default must stay fail-closed).

---

## Paste-to-Codex order
1. Spec 1 (TTS) — independent, highest visible win.
2. Spec 2 (lexicon) — independent resilience fix.
Both can be separate PRs off clean main; neither depends on the other.

---

## Review log (Pro + Claude, 2026-06-14)
Both specs reviewed with Pro; tightenings folded in after verifying each against the code:
- **Spec 1:** include updated `package-lock.json` (confirmed present); cache acceptance corrected to "no new OpenAI call / no cap charge" — cache is server-side so the client may still hit the route (`X-TTS-Cache: HIT`). **Divergence from Pro:** route stays `STUDENT`-only (verified `requireUser(["STUDENT"])`); not adding `ADMIN` speculatively — no admin caller exists.
- **Spec 2:** Pro's feared "`valid:false` starves the selector" path does **not** occur — `valid = blockingIssues.length === 0` and `*_UNAVAILABLE` is a non-blocking `issues` entry; codified as an explicit guardrail. Added the end-to-end render-path test, the audit-still-throws test, and the "simulate via cache reset, never delete data files" rule. Helper throw-sites pinned to lines 191/216/241.
