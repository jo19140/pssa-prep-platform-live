# presentationProfile architecture — age-band presentation (design, pre-Codex)

**Date:** 2026-06-14 · Verified against `origin/main` (`ea0fdaf`). Decision basis: [[project_age_band_differentiation]].
**Goal:** decouple the **skill rung** (set by the diagnostic) from the **presentation** (keyed to the student's age). Build the band dimension properly (K-3 / 4-6 / 7-8), starting with the **7-8** band so a real 7th-grade striving reader (Yohanna) can pilot the a_e lesson without babyish framing — and exercise the still-unproven real-mic capture path.

## The band model
`type PresentationProfile = "BAND_K_3" | "BAND_4_6" | "BAND_7_8"`.
**Derived from `StudentProfile.grade` (an `Int` that already exists)** — the *student's* grade, not the skill's grade:
- grade ≤ 3 → `BAND_K_3`
- grade 4–6 → `BAND_4_6`
- grade ≥ 7 → `BAND_7_8` (also catches struggling HS readers)
- no profile / unknown → `BAND_K_3` (current behavior; safe default)

**Extension point (deferred):** an optional explicit `presentationProfileOverride` on `StudentProfile` for the young-for-grade or student-preference case. Not in v1 — derive from grade. (When added, override wins; else grade-derived.)

## What varies per band (and what never does)
**Never varies:** the diagnostic-assigned skill/target (a_e is a_e), the structured-literacy method, the 8-part flow, the VAD gate, the capture/consent rules. A 7th grader decodes a_e the same way.

**Varies by band:**
1. **Decodable content** — passage / sentences / power words / comprehension. *Same skill pattern, age-respecting text.* (e.g. a_e: K-3 "Dave's Cake" → 7-8 a realistic teen-stakes micro-narrative.) Same decodability constraints; validated by the existing pseudoword/audit gates.
2. **Kid-facing copy + Harper tone** — part titles, prompts, encouragement, term choices ("silly words" → "nonsense words"). Harper keeps her image; her *register* shifts (respectful, low-saccharine, metacognitive). Optional later: a per-band TTS voice (defer — copy first).
3. **Visual theme** — palette/typography (K-3 warm/playful → 7-8 cleaner/cooler/tool-like).
4. **Activity format** *(LATER LAYER, not this pass)* — K-3 game-like sort/match/trace vs 7-8 text-forward. The activity-template library is its own era; this pass does content + copy + theme on the existing components.

## How it threads (foundation)
1. **Resolve band server-side:** the lesson page reads `StudentProfile.grade` → derives `presentationProfile` (helper `presentationProfileForGrade(grade)`).
2. **Pass it down:** `buildLessonPlayerData(targetCode, { presentationProfile, trainingCaptureEnabled, studentUserId })` → selects band-specific **content** + carries the band onto `LessonPlayerData`.
3. **Render per band:** the player applies band **copy** (a band→copy map), **theme** (a band→theme tokens map), and **Harper tone**. Default `BAND_K_3` reproduces today's experience exactly (zero regression).

## Content structure change
Today: `LESSON_CONTENT_BY_DAILY_TARGET[target]` = one content set (the K-3 default).
Change to band-aware: keep the existing set as the `BAND_K_3` default, add a `BAND_7_8` variant per target (start with a_e). Shape option: `LESSON_CONTENT_BY_DAILY_TARGET[target].byBand[band]` with `BAND_K_3` = current content (unchanged). Resolver falls back to `BAND_K_3` when a band variant is absent (so unbuilt bands degrade gracefully, never crash). 4-6 added later by interpolation.

## Phased build (foundation-up; each a Codex PR + audit)
- **P1 — presentationProfile foundation:** the type + `presentationProfileForGrade` + threading through the lesson page → `buildLessonPlayerData` → `LessonPlayerData`. K-3 default = current behavior (regression-tested). No content/copy change yet. *Small, safe.*
- **P2 — 7-8 a_e content:** author + validate the age-respecting a_e content (passage/sentences/power words/comprehension) as the `BAND_7_8` variant. **MUST pass the content-v3 decodability/pseudoword/lesson-audit gates** — the mock content is placeholder and contains violations (`rough`/ough, `stayed`/`Stays` ay, `eyes`) that would fail. The story/sentences/words come from the validated pipeline, not hand-written prose.
- **P3 — 7-8 presentation layer = "Coach Mode" (locked target).** Visual + tone direction approved from Pro's full-length mock (`specs/mockups/reading-buddy-7-8-coach-mode-mock.html`): slate/indigo clean tool-like system, "private reading coach" framing, "training reps," concise coach feedback ("Got it" / "Read that once more" / "Check the silent e"), "nonsense words — not graded (shows the pattern is automatic)," mature rule wording ("silent e changes the vowel to its long sound: cap→cape"), Part 8 as low-pressure reflection. Build = band→copy map + Harper older-tone copy + band→theme tokens wired into the player; `BAND_K_3` unchanged.
  - **Reconcile (do NOT inherit from the mock):** (1) **keep Harper's real image** `harper-character-v1.png` per the "same Harper, older tone" decision — not the mock's abstract gradient avatar; (2) the **evidence/event-log + adult/teacher panels are dev/teacher-only**, hidden from the student view; (3) all words/story are **placeholder until they pass the decodability gates** (P2).
  - **P3 INTERACTION-REUSE RULE (locked, Pro + Claude — the guardrail Claude caught):** *P3 may change presentation only — theme, layout density, labels, tone, typography, age-band copy. It MUST reuse the existing player interactions UNCHANGED:* warm-up & nonsense words → **Wave 1 VAD listen-for-attempt**; consented nonsense-word capture → **Layer 2**; Part 3 real words → **FL-2 scored ASR loop**; power words → **tap-to-hear**; Parts 5/7 → **listen-and-encourage only**. **No reimplementation of the reading loop, VAD, capture, or scoring logic.** The 7-8 band is the same engine with older skin + validated older content — not a second player.
- **P4 — pilot enablement:** seed a grade-7 test student + a `VOICE_ANNOTATOR` account (also closes the annotator-smoke gap from the labeling era), so Yohanna's pilot exercises the **real-mic capture** end-to-end.
- **Later:** 4-6 band (interpolate); per-band TTS voice; the activity-template library.

## Guardrails
- `BAND_K_3` default must be byte-equivalent to today (regression test the current a_e experience).
- Band resolution is server-side from grade; never client-asserted.
- Missing band content/copy → fall back to `BAND_K_3`, never crash.
- The capture/consent/VAD rules are band-independent (a consented 7-8 student still captures pseudowords; pseudowords still never scored).
- 7-8 content still passes the same decodability/pseudoword/audit gates as all content.
