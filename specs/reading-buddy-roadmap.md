# Reading Buddy — Roadmap & Sequencing

**Date:** 2026-06-14 · **Owner:** Jonathan (founder) + Codex (executor) + Claude (spec/audit)
**Purpose:** One ordered plan so we stop jumping between threads. Close near-done loops first, then build toward the highest-leverage work.

---

> **Correction (2026-06-14):** an earlier draft of this section said "PR F (TTS) was built but never merged." That was wrong — it came from reading a **stale local mount at `83346c2`**. The authoritative `origin/main` is **`caee276`**, and PR F **is** merged there. Harper's robotic voice was a **`.env` runtime config** issue (`TTS_PROVIDER`/`OPENAI_API_KEY` unset → silent fallback to browser TTS), now fixed by Codex and verified live (`POST /api/voice/tts 200`). Lesson: verify against `origin/main`, not the mount's local HEAD.

## Ground truth (verified against `origin/main` @ `caee276`, 2026-06-14)

**DONE on main:**
- 8-part lesson player shell (FL-1), Part 3 live read → retry → reteach loop (FL-2), **Parts 5 & 7 listen-and-encourage** (FL-3).
- Kid-facing part titles, Harper character (`BuddyCharacter`) wired into the player.
- `/api/voice/transcribe` student-auth + process-and-drop; dev voice-corpus capture harness (local, consent-gated, for the pilot).
- Content-v3 Phase 4 complete (28 daily targets); PSSA Grade-3 item-bank build board complete.

**Pending (uncommitted in working tree):** 3 spec docs (`produce-surfaces-redesign`, `lesson-player-feedback-backlog`, `asr-strategy`) + this roadmap + `reference/external/` symlink.

**OpenAI TTS (PR F):** ✅ already merged on `origin/main` (commit `93fd1ca`, reachable from `caee276`). Robotic voice was a `.env` config issue, not a missing merge — **resolved 2026-06-14** (Codex set `TTS_PROVIDER=OPENAI` + key; verified `POST /api/voice/tts 200`). `.env` stays local/uncommitted (holds the secret key).

**Not built yet:** lexicon graceful render fix; Part 1 + silly-words listen/record; production capture + secure storage; word-following highlight / forced alignment; Part 8 comprehension grading; age-band differentiation (`presentationProfile`).

> Effort numbers below are rough sizing for a part-time solo founder + Codex, **not date promises**. Treat as relative.

---

## WAVE 0 — Close the open loops (≈ 2–3 days). Lowest effort, clears the desk.

1. **Commit the pending specs** (this roadmap included). *Now, ~0 effort.*
2. **Merge PR F (OpenAI TTS) → fixes the robotic voice.** Already built on `codex/pr-f-openai-tts`. Re-audit scope against clean main (base-pollution risk), clean-apply only the TTS files (`app/api/voice/tts/route.ts`, `lib/voice/providers/openai-tts.ts`, `lib/voice/tts.ts` factory, decisionTypes, `.env.example`), confirm `.env` has `OPENAI_API_KEY`. *~0.5 day. High visible impact.*
3. **Lexicon graceful render fix.** Not committed anywhere. Render path → `strictLexicon:false` (lenient), audit stays strict. Prevents the `HOMOPHONE_LEXICON_UNAVAILABLE` crash when run without `subtlex.csv`. *~0.5–1 day. Resilience.*

**Exit:** clean main, warm voice, no render crash. The lesson demos cleanly end-to-end.

---

## WAVE 1 — Finish "listen everywhere" (produce-surfaces) (≈ 1 week). Completes a model already 60% landed.

Parts 3 / 5 / 7 already do kid-reads → Harper-listens. Two surfaces remain:

1. **Part 1 warm-up:** today it's tap-to-self-confirm (gameable, no mic). Change to: tap each word → kid reads → Harper listens → encourage → **gate until all read**. (Known words, no score.)
2. **Part 3 silly words (pseudowords):** today nothing/given. Change to: tap each → **kid decodes/reads** → Harper listens → encourage → gate. (Never ASR-scored — purest decoding capture.)

All on **Tier-1 consent** (in-session, **no storage**). No new infrastructure. *Leverage: kills the i-Ready click-through gaming, makes the kid actually read, consistent interaction across all 8 parts.*

**Exit:** every read surface listens; the kid can't race through any part.

---

## WAVE 2 — The capture keystone / the moat (≈ 2–4 weeks, biggest infra). **Highest strategic leverage.**

This is where listening becomes a recorded corpus — the data flywheel no competitor can copy.

1. **Consent + secure-storage capture layer** (Tier-2 training opt-in): encrypted storage, retention + deletion, verifiable parental consent. Turns every consented read into corpus. *The gate for everything below.* **Correction (2026-06-14, verified on `origin/main`): most of this already exists** — `VoiceConsent` (two-tier), `VoiceSession` (`audioStorageKey`/`retentionTier`/`audioDeletedAt`), retention cron, purge, audio-serving + export routes, admin/parent UIs are all wired. The two real gaps are an **encrypted object-storage backend** (no S3/R2/GCS upload yet) and **wiring the lesson player to capture**. So this is smaller than greenfield. Pull-forward sketch (e.g. to capture high-value silly-word reads sooner): `specs/wave-2-capture-pull-forward.md`.
2. **"Listen-first" karaoke highlight** — when Harper reads via TTS, highlight each word as she says it. Buildable now, **no alignment needed**; models fluent reading. *Cheap, ship alongside.*
3. **Word-level forced alignment** → follow-along highlight on the **kid's own voice** + completion verification + connected-word scoring + training labels. The anti-gaming keystone AND the connected-reading capability. *Sequenced after storage — can't align audio you didn't capture.*

**Exit:** the program proves a child is actually reading and learns from every child. This is the fundable core + the moat.

---

## WAVE 3 — Age-band differentiation / `presentationProfile` (≈ 3–6 weeks, expansion). **Highest market leverage; build on a working core.**

Diagnostic fixes the skill; the band changes presentation. Three bands K-3 / 4-6 / 7-8; Harper ages up.

0. **`presentationProfile` data model** — a band dimension separate from the diagnostic-determined target.
1. **Lightweight 7-8 "dignity pass" for Yohanna** — copy + art + Harper-older + age-respecting decodables, *without* the full template system. **Pull earlier if Yohanna is an active pilot user** — cheap way to stop the babyish-framing harm now.
2. **K-3 activity-template library** — sort / match / trace / color-read / chant-repeat (ref: `reference/external/alphabet-lessons-k-3`), each filled by the engine per target. Author once, reuse across rungs + bands.
3. **4-6 band** — interpolate between the two nailed endpoints.

**Exit:** a struggling 7th grader and a kindergartner each get the same skill in age-respecting packaging. Opens the MTSS / RTI / Title-I market.

---

## WAVE 4 — Part 8 comprehension grading (own track, ≈ 1–2 weeks). Slot whenever.

Mastery-markers + **semantic proximity** grader (not literal keyword), **never auto-fail**, uncertain → async teacher review → teacher's call trains the grader. Lower urgency; independent of the waves above.

---

## Why this order

Close loops first so the core **demos cleanly** (Wave 0). Make the single-band experience genuinely *teach and prove reading* (Waves 1–2) — that's the fundable core and the moat, and it's mostly in motion. Only **then** expand to more learners (Wave 3), because differentiating a half-working core is premature. Comprehension grading (Wave 4) is real but independent, so it floats.

## Parallel human-gated tracks (not on this critical path — don't forget)

- **PSSA item-bank G3:** awaiting Jonathan's single approval pass → DB-6 assemble dry-run → gated E2E demo.
- **Content-v3 lesson engine:** Phase 4 complete; next rungs (morphology y→i needs y-as-vowel registry; -er/-est) — no rush.

## This week, concretely

Wave 0 in full: commit specs (done as part of this), merge PR F to kill the robotic voice, build the lexicon graceful fix. That alone gets you a clean, warm, crash-free demo — then start Wave 1 Part 1 + silly-words listen/record.
