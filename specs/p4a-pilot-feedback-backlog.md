# P4A pilot — first real-run feedback backlog (Jonathan, 2026-06-16)

First end-to-end Coach Mode run as the synthetic grade-7 student (`grade7-voice-smoke@example.com`). Coach Mode rendered correctly through all 8 parts; mic/VAD confirmations fired; BAND_7_8 copy polish ("High-utility word"/"Vocabulary word", "tell your support person") is live. Below is the triaged feedback from that run. **None of these block the P4A *capture verifier* (that just needs a nonsense-word mic read) — these are UX/quality items for the next polish wave.**

## BLOCKERS (break the flow / can't complete a part)
- **F1 — Part 7 (Passage read): no visible stop/done control; can't advance.** After choosing "Read on my own"/"Listen first" there's no stop button in view and no way to move to Part 8. (May be the same below-the-fold problem as F3 — verify whether "Done reading" exists but is off-screen.)
- **F2 — Part 2 (Pattern focus): the BEFORE and SILENT E WORD demo cards render EMPTY.** The big focus-pair cards show only the labels, no words (should show e.g. `cap` / `cape`). The minimal-pair chips below (cap→cape …) populate fine, so the active-pair DemoCard `word` prop isn't filling. Real bug.
- **F3 — Navigation: after completing a part you must scroll back to the top nav to continue.** No in-view "next/continue" affordance once a part's task is done. High friction across every part; a striving reader will lose the thread.

## BUGS / QUALITY
- **Q1 — BAND_7_8 theme is too dark; part-title headings are near-invisible (dark-on-dark contrast).** Headings like "Pattern focus", "High-utility words", "Passage read", "Jake at the Race Lesson" render in a very dark color on the slate-950 background — barely legible. Likely a heading text color that wasn't overridden for the dark Coach theme (fine on K-3 cream, invisible on dark). **Top fix — accessibility/contrast matters most for a struggling reader.** May also reconsider whether slate-950 is too dark overall vs a lighter slate.
- **Q2 — Part 2 demo voices only the FIRST word (cap), not the second (cape).** To teach the silent-e transformation, Harper should voice BOTH `cap` → `cape` so the student hears the change.
- **Q3 — Part 3 Harper assist ("Listen: {word}. Now you try.") plays too fast with no replay.** When Harper models the word on a miss, add a "listen again"/replay so the student can re-hear it.

## TTS PRONUNCIATION (separate voice-tts track — provider behavior on short/isolated words)
- **T1 — "tap" is pronounced like "type."** (Part 2 demo / Part 3.)
- **T2 — "the" is pronounced like "thee"/"did."** (Part 4 high-utility words.)
- Note: OpenAI TTS on isolated short function words is a known weak spot. Options: per-word phoneme hints/SSML-style overrides, a small recorded-audio override table for the highest-frequency heart words, or a different TTS voice/model for single-word reads. Belongs to the voice-tts upgrade track, not the player.

## DESIGN CONSIDERATIONS (intentional today; worth revisiting)
- **D1 — Part 5 (Sentences): expected per-sentence tap-to-record; today it's one whole-block Start/Done.** Current design: Parts 5 & 7 are deliberately "listen-and-encourage" (completion-only, not per-item scored) per the lesson spec. Jonathan's instinct is per-sentence activation. Decision needed: keep whole-block listen-and-encourage, or move to per-sentence record (more capture data + more granular, but heavier interaction). Affects the interaction freeze — would be its own PR.
- **D2 — Part 8 (Reflection): show the passage alongside the comprehension questions** so the student can refer back to the text (open-book comprehension). Easy, high-value for a striving reader. Low-risk chrome/layout change.

## Suggested next wave (order)
1. **Q1 contrast** (legibility — affects everything) + **F2 empty demo cards** + **F1/F3 stop/advance navigation** — these three make the lesson actually completable and readable.
2. **Q2/Q3** demo-both-words + assist replay.
3. **D2** passage-with-questions (cheap win).
4. **D1** per-sentence recording — decide first; it's a design call + interaction-freeze PR.
5. **T1/T2** TTS pronunciation — route to the voice-tts track.

Each becomes its own scoped PR (mock-first where it's visual), specced and Pro-reviewed like P1-P4A. None of these are required to call the **capture path** proven — that's the nonsense-word mic read + `npm run test:p4a-voice-smoke`.
