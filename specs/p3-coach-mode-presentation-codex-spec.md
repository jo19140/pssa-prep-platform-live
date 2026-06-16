# P3 — Coach Mode presentation layer (band-aware chrome copy + theme) · Codex spec

**Date:** 2026-06-15 · v3 post-Pro · Verified against `origin/main` (post-P2). Depends on P1 (merged) + P2 (landed). Visual/tone target: `specs/mockups/reading-buddy-7-8-coach-mode-mock.html` (Coach Mode, reconciled).
**Goal:** make the lesson **player chrome** (kid-facing copy + theme) band-aware so the 7-8 band reads as a "reading coach session," not a kid game. **Content is NOT touched** — P2 already made rule/sentences/story/comprehension band-aware via `phase3EntryLessonContentFor`. **K-3 (`BAND_K_3`) resolved output must be identical to today.**

## The hard boundary: chrome vs generated content
P3 owns **player chrome only**. Generated lesson content stays P2/content-v3-owned and is rendered from `contentJson`/`kidVisibleCopy`, never moved into a UI constant.

**Chrome (P3 MAY make band-aware — copy + theme):**
- App/player shell labels + the shell subtitle (`StudentPracticeSession.tsx:176`).
- Part navigation short labels, `KID_FACING_PART_TITLES`, `PART_META` mode/evidence labels.
- Button labels, Harper/Buddy state labels (`BuddyCharacter.tsx`).
- `ListenForReadingAttempt` warm-up prompts (`intro`/`prompt`/`encourage`/`completeLabel`).
- Part 2 demo labels/buttons ("Before", "Silent e word", "to", "Main pair", "Practice pair", "Listen again", "I practiced it", "Tap each pair first", "Heard").
- Part 5 sentence-reading prompts/buttons ("Start reading", "Done reading", Harper's listen/encourage lines).
- Part 6 spelling labels/feedback ("Harper says", "Listen to word {n}", "type the word", "Clear", "Check spelling", "That matches.", "Keep building the word you hear.").
- Part 7 story-reading prompts/buttons ("Listen first", "Listening...", "Read on my own", "Done reading", Harper's listen/encourage lines).
- Part 8 textarea placeholder + "I talked about it"; PlaceholderPart chrome.
- Pseudoword surface label: K-3 "silly words" → 7-8 "nonsense words".
- Fallback / rate-limit / technical-retry copy — **as copy only** (see interaction freeze).

**Content (P3 MAY NOT touch — stays generated, P2-owned):**
- Part 2 `kidRuleStatement` (rendered from `contentJson.kidRuleStatement || kidVisibleCopy.kidRuleStatement` — `StudentPracticeSession.tsx:374` and `:1567`).
- Part 3 `reteachPrompt`, demonstration **pair word values**, word lines, heart/power words.
- Part 5 sentences; Part 6 dictation words/sentences; Part 7 story title/text.
- Part 8 comprehension questions, `questionType`, the answer flow.
- Any generated `contentJson` / `kidVisibleCopy` lesson content.

## What to build
1. **Profile-resolved copy + theme resolvers** (new, `lib/literacy/presentationCopy.ts`): typed, sectioned copy covering **every chrome-bearing section currently in `StudentPracticeSession`** — `shell`, `partNav`, `partTitles`, `buddy`, `listenAttempt`, `conceptDemo`, `part3`, `powerWords`, `sentenceReading`, `spelling`, `storyReading`, `talk`, `placeholder`, `tappablePractice`, `fallback` — plus a theme tokens object. Expose:
   ```ts
   presentationCopyFor(profile?: PresentationProfile)
   presentationThemeFor(profile?: PresentationProfile)
   ```
   `BAND_K_3` = **the exact current strings/classes** (verbatim). `BAND_7_8` = Coach Mode copy + slate/indigo theme. `BAND_4_6` and `undefined` → resolve to `BAND_K_3`.
2. **Wire it once, at the top of `StudentPracticeSession`:** resolve `presentationCopyFor(presentationProfile)` + `presentationThemeFor(presentationProfile)` into single objects the component consumes; remove `void presentationProfile;` (`:67`). Centralize the currently-inline theme classes (e.g. `bg-[#f6efe7]`, `border-[#e8d9c7]`, `bg-amber-300`, `rounded-[28px]`) into the theme object **without changing K-3's resolved values**.
3. **Raw `BAND_7_8` branching lives ONLY inside the two resolver functions.** Individual part components / `PartRenderer` / `BuddyCharacter` must NOT branch on the raw band — they consume resolved copy/theme objects (Buddy via a prop). Mirrors P2's resolver discipline.

## Hard guardrails
- **`BAND_K_3` "byte-identical" = resolved-values-identical, not source-frozen.** Moving inline strings/classes into typed maps is allowed; what must match today exactly is the **resolved** chrome copy, theme class strings/tokens, visible labels, and render behavior — i.e. the K-3 resolved values deep-equal a hardcoded snapshot, and the K-3 student-facing render does not change. This **includes** keeping the existing "Adult controls" / "Evidence preview" side panel for K-3 (`StudentPracticeSession.tsx:238`/`:244`/`:246`).
- **Resolve the panel contradiction this way:** K-3 keeps the existing adult/evidence panel (resolved-identical); **`BAND_7_8` Coach Mode must NOT render the Adult controls / Evidence preview panel** — **hide it at render time only, via a resolved layout flag, not a raw-band conditional.** Add a resolved boolean (e.g. `theme.layout.showAdultEvidencePanel`): K-3/`undefined`/`BAND_4_6` resolve `true`, `BAND_7_8` resolves `false`. `StudentPracticeSession` may branch on that resolved boolean but must **not** reference `BAND_7_8`. Do NOT remove `eventLines` state, `emitLessonEvent`/event-logging calls, or any lesson telemetry; do NOT change K-3 panel rendering. Removing that panel globally from K-3 is a **separate cleanup PR**, not P3.
- **Harper's image unchanged** — `BuddyCharacter` keeps `src="/branding/harper-character-v1.png"`; do NOT swap to the mock's abstract avatar/initials or change the asset path. Buddy *state labels* (`Ready`/`Listening`/`Speaking`/`Trying another clue`, `BuddyCharacter.tsx:11`) MAY become band-aware — but only via a **resolved-labels prop** (e.g. `stateLabels`) passed in from `StudentPracticeSession`. **`BuddyCharacter` must NOT branch on raw `PresentationProfile`/`BAND_7_8`** (raw-band handling stays in `presentationCopyFor`), and must keep the image path.
- **Interaction freeze — copy may move, behavior may not.** Moving fallback/rate-limit/retry/VAD/pseudoword strings into the copy map must NOT change: timers, retry counts, disabled conditions, fallback thresholds, VAD start/stop behavior, capture behavior, ASR calls, event payloads, `immediateOutcome`, `scoringMode`, `scaffoldStep`, `independentScoreEligible`. **Do NOT rename `eventType`, `immediateOutcome`, `scaffoldStep`, `scoringMode`, or metadata keys** as part of copy cleanup.
- **No content change** — do NOT edit `lib/content/phase3EntryLessonContent.ts` (P2 content is already landed), the generator, gates, seed, or move any generated content into `presentationCopy.ts` (see boundary above). This file legitimately contains `BAND_7_8` — leave it untouched.
- Shell subtitle: K-3 stays exactly `"Full 8-part structured literacy lesson · generated content-v3 data"`; `BAND_7_8` becomes Coach Mode copy.
- Part 8: P3 MAY change the chrome title/label (e.g. "Talk about it" → Coach Mode wording); P3 may NOT edit the generated questions/`questionType`/answer flow.

## Acceptance / tests
- **Complete chrome inventory (do first):** before coding, inventory **all** hardcoded student-visible strings in `StudentPracticeSession.tsx` and `BuddyCharacter.tsx`. Every student-visible chrome string must either (1) move into the typed `presentationCopyFor(...)` structure, or (2) be explicitly identified as generated lesson content from `contentJson`/`kidVisibleCopy` and left content-owned. Do NOT leave chrome strings hardcoded just because they weren't on a list.
- **K-3 chrome regression (hardcoded, non-circular):** add a hardcoded K-3 chrome+theme **snapshot** covering **all current chrome sections** — `PART_META`, part titles, shell labels/subtitle/buttons, Buddy labels, `ListenForReadingAttempt` warm-up + pseudoword strings, Part 2 demo labels/buttons, Part 3 status/chip/fallback/rate-limit strings, power-words labels, Part 5 sentence-reading labels/prompts/buttons, Part 6 spelling labels/placeholders/buttons/feedback, Part 7 story-reading prompts/buttons, Part 8 textarea/button chrome, PlaceholderPart chrome, the TappableItemPractice labels used by Parts 2 & 4, and the resolved theme tokens. **Do NOT** limit the snapshot to PART_META/titles/ListenForReadingAttempt/Part 3. **Do NOT** test K-3 by comparing it to `presentationCopy.BAND_K_3` (circular). Assert: `presentationCopyFor("BAND_K_3")`, `presentationCopyFor(undefined)`, and `presentationCopyFor("BAND_4_6")` all deep-equal the snapshot; same three for `presentationThemeFor`.
- **7-8 presentation:** `BAND_7_8` shows Coach Mode copy ("nonsense words" not "silly words", coach-tone prompts) + slate/indigo theme, and does NOT render the Adult controls / Evidence preview panel. Harper's image is still `harper-character-v1.png`.
- **No raw-band leakage — grep scoped to P3 UI files (CRITICAL — do not widen):** `git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx` must return **zero** hits. `BAND_7_8` is **expected and allowed** in `lib/literacy/presentationCopy.ts` (new), the P3 test, `lib/literacy/presentationProfile.ts` (P1 type), and the already-landed P2/P1 files `lib/content/phase3EntryLessonContent.ts` + `scripts/test-content-v3-band-7-8-ae.ts` + `scripts/test-presentation-profile.ts`. **Do NOT edit the P1/P2 files to satisfy any grep** — their `BAND_7_8` hits are correct and protected. (If automated: `git grep` exits **1** on zero matches — treat zero output as PASS; any printed matching line is FAIL.)
- **No behavior drift:** diff shows only copy/theme/resolver edits; `void presentationProfile;` is gone; `scripts/test-voice-activity.ts` still passes; no `eventType`/`immediateOutcome`/`scaffoldStep`/`scoringMode`/metadata-key renames.
- **Harper guard:** assert `BuddyCharacter` still renders `/branding/harper-character-v1.png`.
- `tsc --noEmit` + `npm run build` pass.

## Test wiring
Add a **permanent** regression script, e.g. `scripts/test-presentation-copy.ts`, and wire it into the appropriate test command in `package.json`. **`package.json` may be touched ONLY for that test wiring** — no other change. P3 is a profile-regression surface, so the test is permanent, not a one-off.

## Scope
`lib/literacy/presentationCopy.ts` (new — sectioned copy + theme resolvers), `components/literacy/StudentPracticeSession.tsx` (resolve copy/theme once at top, consume objects, remove `void`, centralize inline theme classes, hide adult panel for `BAND_7_8` at render time, pass resolved Buddy labels as a prop), possibly `components/literacy/BuddyCharacter.tsx` (consume a `stateLabels` prop; no raw-band branching; image path unchanged), `scripts/test-presentation-copy.ts` (new) + `package.json` (test wiring only). No content/generator/seed/interaction-logic files; **`lib/content/phase3EntryLessonContent.ts` and the P1/P2 test+type files are off-limits.** If anything beyond copy/theme/resolver wiring is needed (panel removal from K-3, interaction changes, content edits, P2-file edits to satisfy a grep), STOP and report — those are out of P3 scope.

## Note (mock-first already satisfied)
Visual/tone direction = the approved Coach Mode mock (`specs/mockups/reading-buddy-7-8-coach-mode-mock.html`) minus the reconcile items in `specs/presentation-profile-architecture.md` P3: keep Harper's real image; dev/teacher panels hidden for 7-8 (not globally removed here); reuse the real interactions; content stays from P2.
