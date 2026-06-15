# Produce-surfaces redesign — kid reads, Harper listens, records, highlights

**Captured from the 2026-06-13 real-walkthrough of the live a_e lesson (Jonathan's feedback, "silly words recorded not given" → word-following highlight).** This is one coherent design thread, written down so it isn't lost. It revises how several parts behave and names the keystone capability (capture + alignment). Companion to `specs/lesson-player-feedback-backlog.md` and `specs/asr-strategy.md`.

## The core model: two kinds of items

Every interactive item in the lesson is one of two types, and they behave oppositely:

- **Harper MODELS** (Harper says it, kid hears — tap-to-hear): the *taught* items. Part 2 rule examples, Part 4 heart/vocabulary words. Tapping plays Harper saying the item. Correct.
- **Kid PRODUCES** (kid reads it aloud, Harper listens — tap-to-read): the *practiced* items. The kid does the work; Harper receives it.

The current build put two produce-items in the wrong (model) bucket. That's the bug this doc fixes.

## The produce-surfaces (kid reads → Harper listens → record → encourage → gate)

| Part | Surface | Scored? | Current build (wrong) | Should be |
| --- | --- | --- | --- | --- |
| 1 | Warm-up words | **no** (known words) | "tap → I read it" (no mic, gameable) | tap each word → kid reads → Harper listens → encourage → **record** → gate until all read |
| 3 | Real words | **YES** (the one scored surface) | ✅ already tap-the-word + scored | (keep) |
| 3 | Silly words (pseudowords) | **no** (ASR over-normalizes) | "tap to hear" — Harper SAYS them (defeats decoding) | tap each → **kid reads/decodes** → Harper listens → encourage → **record**; "hear it" = secondary help only |
| 5 | Sentences | **no** (no word alignment yet) | one "tap start," bulk, no per-sentence tap | tap each SENTENCE → kid reads → Harper listens → **record** → gate until all read |
| 7 | Story | **no** | "Listen first / Read on my own / Done" — gameable | read with **word-following highlight** (see below) → verify → **record** |

Parts 2 & 4 stay MODEL (tap-to-hear). Parts 6 (spelling tiles) and 8 (talk) are typed/tap.

**Three reasons every produce-surface works this way** (Jonathan named all three):
1. **Pacing / accountability** — the kid actually reads; can't tap-skip. ("With i-Ready I've watched students just click to get the lesson done.")
2. **Encouragement / presence** — Harper is really listening.
3. **DATA / recording** — the kid's read is captured (the flywheel; the moat).

## Why "silly words recorded not given" matters (the decoding point)

Pseudowords exist for ONE reason: to make the kid *decode a word they've never seen*, applying the rule to a novel string with no real-word shortcut. **If Harper says "zake" first, the kid just repeats it — zero decoding.** So the kid must read it; Harper listens. And pseudoword reads are the **highest-value capture data** (pure decoding). They are never ASR-*scored* (the recognizer over-normalizes: mave→"Maeve"), but they ARE listened-to and recorded.

## Word-following highlight (Parts 5 & 7) — the anti-gaming keystone

As the student reads, Harper **highlights each word as it's read.** This is the strongest "prove they're reading" mechanism — it directly defeats the i-Ready click-through-to-finish behavior, AND it supports struggling readers (follow-along tracking), AND it produces the cleanest training data.

**Tech reality (be honest):** real-time highlight synced to the kid's voice = **word-level alignment**, the same capability connected-text scoring needs (which is why 5/7 are listen-only today). One build, **four payoffs**: reading support + anti-gaming + connected scoring + training data. That reframes alignment from "scoring someday" to **the keystone connected-reading capability.**

Two tiers:
- **Sooner — "Listen first" highlight:** when Harper reads aloud via TTS, highlight each word as she says it (karaoke; we control timing). Buildable now; models fluent reading.
- **The real thing — highlight follows the KID's voice:** needs alignment. Most feasible first version = **record → forced-align the audio to the known text → highlight on playback + verify completion + score later.**

## The pipeline this all implies

**capture the audio → align it to the known text → highlight as they read + verify they read + score later → and the aligned recordings train the verifier.**

That single pipeline delivers everything in this doc: recording, anti-gaming, reading support, and eventual connected scoring. **The recording/capture layer is the foundation** — you can't align audio you haven't captured.

## Honest sequencing (dependency order)

1. **Listen-everywhere interaction** — all produce-surfaces become tap-each → read → Harper listens → encourage → gate. **Tier-1 consent (mic in-session, NO storage).** Near-term. Stops the worst gaming.
2. **"Listen first" highlighting** — Harper reads + karaoke-highlights. Buildable now; no alignment needed.
3. **Consent + secure-storage capture layer** — the keystone. Recording goes live (verifiable parental consent + encrypted storage required — it's a child's voice).
4. **Word-level alignment** — forced-align captured audio to text → follow-along highlight on the kid's own reading, completion verification, connected scoring, training data.

Each enables the next: can't align without capture, can't capture without consent+storage.

## The one-line takeaway

The lesson *works*; the next thing to build is the **capture + alignment layer**, because it's what turns a lesson player into a reading specialist that **proves a child is actually reading** and **learns from every child.** Everything else is polish on top of it.
