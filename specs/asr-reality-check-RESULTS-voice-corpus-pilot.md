# ASR voice-corpus pilot — results + the Yohanna case

**Source:** first audio-backed capture session on the dev harness (`/dev/asr-check`, Phase B child target-only, gpt-4o-transcribe), consent-gated local capture (`voice-corpus/`). 2026-06-11. Companion to [[asr-reality-check-RESULTS-phaseB]] (transcript-only) — this run is the first with **audio retained**. Grounds [[asr-strategy]].

## Corpus snapshot

**158 clips, 6 consented readers, ages 11–12, 0 orphan rows** (every manifest line has its audio). Real children, parent-consented (parent-self / parent), nicknames only.

Isolated words: n=86, **false-negative 31 (36%)**, **false-credit 0**. Connected + passage tracked separately. Across the whole run the danger direction (crediting a miss) stayed essentially clean — consistent with every prior probe.

## Two findings

### 1. Per-speaker variance dominates age (in the 11–12 band)

| reader | age | isolated FN |
| --- | --- | ---: |
| Destiny | 12 | 2/11 (18%) |
| Saleem | **11** | 3/14 (21%) |
| Mallory | 12 | 4/12 (33%) |
| Zavier | 12 | 8/22 (36%) |
| **Yohanna** | 12 | **13/18 (72%)** |

A **4× spread** at the same age, driven by *who is reading*, not how old they are. The youngest reader (Saleem, 11) is among the **best**, which overturns "younger = worse" within this range. At this age, the recognizer's reliability is a property of the *speaker*, not the *grade*.

### 2. Word hot spots (isolated, gpt-4o-transcribe)

`cape` is the consistent black hole (~62% across cohorts); `made` and `name` the next tier (~44%); `take`/`plate` the most reliable. `made → maid` is a true homophone (verifier v1 should accept homophones).

## The Yohanna case (the centerpiece)

Yohanna, age 12, **soft-spoken, with documented reading difficulties** — i.e. *exactly* the child Reading Buddy exists to serve. Her 18 isolated clips:

- **She read 16 of 18 correctly** (replay-labeled). Despite the reading difficulties, she decoded these a_e words accurately.
- The engine **false-negatived 13 of those correct reads.** What it returned is the tell — these are **weak-signal** failures, not wrong-word errors:
  - cape → "Okay" / "Ok" / **"K"**  (caught a single consonant)
  - made → **"Me"** / "Mate"  (grabbed the vowel, lost the word)
  - lake → "Lek" / "Lick"
  - game → **"Qué?" / "Que"**  (language prior took over on a too-quiet signal)
  - plate → "Please"
- Her 2 genuine misreads (take→"tick", plate→"plae" — vowel substitutions, her real reading difficulty) were correctly **not** counted as false-negatives.

**Interpretation: the 72% is the tool failing Yohanna, not Yohanna failing.** She read the words right; her soft voice gave the recognizer too little signal, so it returned fragments or hallucinated. An off-the-shelf autonomous scorer would have told a struggling reader "try again" on 13 words she nailed — the precise experience that makes a fragile reader give up.

## Why this validates the strategy

1. **Never autonomous-reject at this tier** (`harper_retry_only`). Yohanna is the concrete reason the rule exists: auto-scoring her would punish correct reads from the exact kid the product is for.
2. **The flywheel must contain the Yohannas.** A verifier trained without soft-voiced, struggling readers will fail soft-voiced, struggling readers. Her clips are the *highest-value* data in the corpus because they're the hardest — keep every one; do not "fix" her by recording loud, her natural voice is the signal production must handle.
3. **Engineering signal:** input-gain normalization / voice-activity tuning for quiet speakers belongs on the verifier roadmap — the failure mode here is signal level, not pronunciation.
4. **Equity is measurable, not rhetorical:** a single fixed confidence threshold underserves specific children 4× more than others, and the worst-served are the most vulnerable. Per-speaker calibration + a diverse corpus is the answer — and the moat.

## Caveats (honest)

Small per-child n (11–22 isolated each) — individual rates are directional, not final. Single recording setup; "soft voice" is observed, not instrumented (no calibrated dB). The *spread* and the *word pattern* are robust; the exact per-child percentages are not. Dev/local probe, not production. Next: more clips per reader, instrument input level, and (later) use these clips as the held-out eval set + first fine-tune material.
