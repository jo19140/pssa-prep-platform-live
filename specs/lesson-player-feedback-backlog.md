# Lesson player — feedback & fixes backlog

**Running list from live testing of the FL-1 + FL-2 player (2026-06-12).** Status: PR 2A + FL-0 + FL-1 + FL-2 merged to `main` and live-tested in the browser; Part 3 live loop confirmed working (real ASR scoring: CORRECT / retry / reteach / INCORRECT / assisted, exact-match, no echo, pseudoword self-confirm, in-flight guard, 429 handling). Remaining: FL-3 + the fixes below.

## A. Immediate fixes (do with / right after the core player)

1. **Rate limit too low → mid-lesson 429.** PR 2A set `RATE_LIMIT_CAPACITY = 20` per 60s. A real 20-word Part 3 (plus retries) blows past it and triggers Harper's "Let's take a quick pause" mid-lesson. **Fix: bump to 60** (`app/api/voice/transcribe/route.ts`). Tested locally as the fix; **needs a proper committed PR** (route change). Consider also a faster refill or per-lesson scoping later.

2. **Part 3 layout — current word + feedback are split.** The "CURRENT WORD" + Read button sit at the *bottom* of the whole word-grid, while Harper's feedback bubble is at the *top*. At normal zoom a kid can't see the word they're reading AND whether they got it at the same time. **Fix: co-locate current-word + Read button + Harper feedback as one focal unit in the kid's eye-line** (the word-lines grid stays as context; the active interaction becomes the prominent thing — sticky or top, not bottom).

3. **Silly-words (pseudoword) UX is confusing.** (a) Individual silly-word *chips* aren't clickable (confirm is the purple "We read the silly words" button) — but kids/testers try tapping the words. (b) There are **two** silly-word displays stacked (the word-lines "SILLY WORDS" card + the "Now the silly words" confirm card) — redundant. **Fix: single, clear silly-words step**; make the affordance obvious (tap words as "tried," or clearly route to the one confirm button).

## B. Enhancements (sequenced AFTER the core player loop is done)

4. **Pseudoword "Harper listens + encourages" (no scoring).** Jonathan's idea: instead of silent self-confirm, Harper listens to the kid read the silly words, gives a warm "Good job trying those!", then models/reviews — **without judging correctness**. Safe + on-strategy: pseudowords *over-normalize* in ASR (mave→"Maeve"), so they must NOT be scored, but listening + encouraging is the same pattern as Parts 5/7. **Modest build, process-and-drop, no consent blocker.**

5. **Pseudoword audio → flywheel capture (CONSENT-GATED, deferred).** Pseudoword reads are *premium* flywheel data — pure decoding, no real-word shortcut, so a correct "gake" proves the kid applied silent-e to a novel word. Worth capturing — BUT student-path audio retention needs the **production consent + secure-storage layer** (the student path is deliberately process-and-drop today). Lands on the consent/storage track, NOT a bolt-on.

6. **Part 8 comprehension — capture + async teacher grade + AI shadow-grader.** Today Part 8 is open-response, ungraded, and answers aren't even saved (only a count). Decision: **capture answers for async teacher review** (teacher grade = the label) AND **train an AI grader in shadow** (scores silently, never shown to the kid, graduates only when it agrees with teachers). Same flywheel pattern as voice/ASR. Needs consent + a teacher-review UI; AI stays shadow-only until proven. **Its own track, with #5.**

## C. Watch-items (tune later, not bugs)

7. **Low-confidence retry.** A *correct* read with ASR confidence <0.55 currently gets "read it once more" instead of credit. Safe (never says "wrong"), but may over-ask soft/quiet/struggling readers (the Yohanna case) to repeat correct reads. Watch in real use; tune the 0.55 threshold if it fires too often.

8. **No explicit `PART3_SCORING_MODE` flag.** Behavior is hardcoded `harper_retry_only` (correct). A config flag would ease pilot switching between modes. Minor, add later if wanted.

## D. To verify

9. **Part 1 warm-up heading "Cumulative code review."** Showed as the Part 1 title in the unstyled view — looks wrong for a warm-up (should be "Warm-up / words you know"). Check whether it's the generated Part 1 title (a generator label quirk) or a rendering issue, now that styling works.

## E. Local-dev / infra (not lesson-code bugs)

10. **`.env.local` line 5 `DATABASE_URL` has an unbalanced quote** (3 quotes) → caused server crashes (`ERR_CONNECTION_REFUSED` on all routes, which is what made "every word wrong" — the transcribe fetch was refused, not misread). Fix the quote so the value is properly balanced.
11. **CSS vanished until `rm -rf .next`** — stale Next dev cache. Operational; clear `.next` + hard-refresh if styling disappears.

## Confirmed WORKING (so we don't re-litigate)

- FL-1: `/student/practice` renders the real generated a_e lesson; Parts 1/2/4/6/8 interactive (Part 1 tap/no-mic, Part 6 tile/typed scored, Part 8 open-response); Parts 3/5/7 placeholders (3 now live via FL-2); non-a_e → coming-soon; events fire.
- FL-2: Part 3 live read→retry→reteach→assisted on real gpt-4o-transcribe; exact-match, no "you said ___" echo, `VOICE_MISCUE_DETECTED` only on reteach, pseudowords self-confirm, in-flight guard blocks duplicate POSTs, 429/Retry-After + technical-failure handling all work, process-and-drop (no persistence).

## Suggested order

FL-3 (Parts 5/7 listen-encourage) → fixes #1, #2, #3 (rate limit, layout, silly-words UX) → verify #9 → enhancement #4 (pseudoword listen+encourage) → then the consent/storage track for #5 + #6 (capture + grading flywheels). Watch-items #7/#8 tuned from pilot data.
