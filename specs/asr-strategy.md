# ASR Strategy — Harper-first autonomy, confidence-gated scoring, and the child-reading data flywheel

**Status:** DECIDED (Jonathan + Pro + Claude, 2026-06-08). North-star reference for all voice/reading-recognition work. Supersedes any "adult confirms" framing as the *product experience* — adult review is a hidden, async quality/training layer only.

## The vision (non-negotiable)

The child reads and **Harper** listens. Kid + Harper, never kid + parent-in-the-loop. The product experience never says "wait for a grown-up," and Harper never tells a child they're wrong unless the system has *proven* it can make that judgment safely.

## Confidence-gated autonomy (the core model)

Harper acts on her own confidence, in three tiers:

- **Confident read** → Harper scores it and responds, autonomously.
- **Uncertain read** → Harper says *"read that one more time for me"* — kid + Harper only, and re-reading is good teaching (builds fluency). No "wrong," no parent.
- **Genuinely ambiguous read** → quietly logged for a teacher/parent to glance at **later, asynchronously**. The child never waits and never sees it.

This is autonomy with a graceful, Harper-led fallback — **not** a human grading in the loop. What grows over time, as the corpus and model improve, is the share of reads Harper handles confidently, until "uncertain" shrinks toward zero. **The human is the ladder we use to remove the human.**

**Naming (retire `adult_confirm`).** The config that selects how a Part scores is `PART3_SCORING_MODE = "harper_confidence_gated" | "harper_retry_only" | "async_review_required"` — never a child-facing "wait for an adult" mode. `harper_confidence_gated`: Harper auto-accepts confident reads, retries uncertain ones, logs ambiguous ones. `harper_retry_only`: Harper listens and retries but makes **no** mastery decision from ASR (the safe default for the youngest + isolated cell). `async_review_required`: Harper keeps the child moving; the read is reviewed later for training/evidence. In every mode the child experience is identical — listen → respond → retry — and Harper appears to drive even when an adult is nearby in an early pilot.

## Autonomy is a frontier, not an on/off switch

"Confident" is not a fixed line — it's wherever the *evidence* proves Harper is safe today. The frontier has two axes:

- **Age:** 4 → 5 → 6 → 7 → 8+ (younger = harder; emergent speech, more variability)
- **Surface:** isolated word → short phrase → sentence → connected passage (isolated single words = the recognizer's worst case; connected reading gives context and is far stronger)

Phase B evidence ([[asr-reality-check-RESULTS-phaseB]], 2026-06-08, small founder-run probe incl. the 4–5-year-olds): **isolated word is NOT safe to score autonomously** — gpt-4o-transcribe false-negatived a *correctly*-read isolated word **20/35 (57%)** of the time; **connected sentences were materially better (5/14, 36%)**, and most of those misses are proper-noun/function-word wobble that content-word alignment would forgive. **False-credit was 0 everywhere** (0/35 isolated, 0/14 connected) — the danger direction is clean; the unsafe direction at this cell is *rejecting correct reads*. So autonomy ships first on the safe cells (**older kids + connected reading**) and reaches the hardest cell (**youngest + isolated words**) last, as the model earns it. (Caveat: small n, direction-setting probe, not a final accuracy number — the frontier probe widens it.) We ship the cells the data supports and let the flywheel expand the frontier.

## The moat

Sý Learning's durable advantage is **owning the largest labeled corpus of children reading aloud, and training a child-reading verifier on it** — target text + audio + what-the-child-actually-said + skill-tagged error labels + longitudinal reading-outcome data. No competitor can copy that, because nobody else is sitting on the data. Off-the-shelf ASR can't hear a kindergartner read a lone word; *that hard problem is the moat.* We don't wait for gpt-4o to improve — we collect the data that lets us pass it.

## What we build (and the order)

This is a **reading verifier**, not general dictation. The question is "did this child read *this known target* accurately enough?", not "what did this audio say?". Verifier output (not `transcript === target`, which is what failed):

```
{ decision: "auto_accept" | "try_again" | "adult_review", confidence, targetText, heardText?, likelyIssue? }
```

**Verifier versions (so "transcript match" is never mistaken for the destination):**

- **v0 — transcript-match heuristic.** Normalize transcript + exact-target match + `uncertaintyScore`; no transcript echo; retry on uncertainty; ambiguous → async review. A *temporary* Part-3 prototype scoring path, **not the method.** This is the only place exact-match is allowed, and only as v0.
- **v1 — confidence-gated rules verifier.** The same loop, but routing is calibrated on the labeled child reads (per age × surface), and isolated words stay non-autonomous until the data clears them. Output shape above. No model training.
- **v2 — trained/aligned verifier.** Fine-tuned child-reading model + content-word / forced alignment for the hardest cells. Needs corpus + revenue + ML help.

Build order (each step funds/feeds the next — do NOT front-load model training):

1. **Verifier v0→v1 = rules, not a model.** Ship v0 (exact-match heuristic) for the first Part-3 slice, then calibrate to v1 on labeled reads. Route on confidence + the existing `uncertaintyScore`: auto-accept only on a clean high-confidence match (mostly connected, older); else try-again; truly ambiguous → async review. Days of work, no GPU.
2. **Capture + labeling flywheel** (already in motion: dev capture spec). Every read stores target + audio + humanHeardAs + transcript + confidence + error label. This is the foundation.
3. **Frontier probe** — a *small* study (ages 5–8 × isolated/connected, ~15 clips each, includes **misreads** for false-credit, not just correct reads) to find where autonomy is safe *today*. Small ≠ the corpus.
4. **Ship connected-sentence autonomy** on the cells that pass the false-credit / false-negative bar; keep isolated words on Harper-retry + async review.
5. **Word-level alignment** for connected sentences (score the target/content words; ignore proper-noun/function-word wobble — "Dave→They" shouldn't fail a read).
6. **Fine-tune** a child-reading verifier (wav2vec2 / Whisper) once the corpus is large enough AND there's revenue to fund it — this phase needs ML help (contractor/hire/partner) and compute. Gate it; don't solo-train on $600.
7. **Phoneme-level alignment** (forced alignment / wav2vec2-CTC) for isolated decoding — the real tool for the hardest cell — later.

## Metrics (safety, not WER)

Track **false credit** (child misread, system credited — *dangerous*), **false negative** (child read right, system rejected — *erodes trust, worst for struggling readers*), **adult-review rate** (how often the system defers), per age × surface. For isolated words the bar is: false credit ≈ 0, false negative low, defer-rate acceptable while training. **Split train/test by student, never by clip.**

## Do NOT

Train a model from scratch now · score by `transcript === target` · auto-*reject* isolated words · prompt the ASR with the *exact* target word (false-credit risk; a constrained word-*set* prompt is a testable experiment, the exact answer is not) · use any child's audio without consent + retention rules · evaluate on correct reads only (must include misreads) · split train/test by clip.

## The one-line decision

We are building toward full Harper autonomy. We do not block launch on the hardest ASR case. We ship only the autonomy cells the evidence supports, we collect the corpus that makes us the leader, and the human stays an invisible, async ladder we climb and then remove.
