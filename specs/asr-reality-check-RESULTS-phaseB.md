# ASR reality check — Phase B results (child, natural reads)

**Source:** [[asr-harness-phaseB-patch-codex-spec]] run on the dev harness (`/dev/asr-check`, Phase-B corpus mode), replay-labeled `humanHeardAs`. Grounds the autonomy-frontier claim in [[asr-strategy]]. Companion to [[asr-reality-check-RESULTS-phaseA]] (adult, encouraging).

## Verdict

**The youngest + isolated-word cell is NOT safe to score autonomously off-the-shelf.** gpt-4o-transcribe false-negatived a *correctly-read* isolated word **20/35 (57.1%)** of the time. Connected sentences were materially better (**5/14, 35.7%** false-negative) — and most of those misses are proper-noun / function-word wobble that content-word alignment would forgive. Critically, **false-credit was 0 everywhere** (0/35 isolated, 0/14 connected): the engine never returned the screen word for a read that wasn't it. So the danger direction (rewarding a miss) is clean; the cost direction (rejecting a correct read) is what's unsafe at this cell.

## The numbers (gpt-4o-transcribe = "transcribe", the authoritative engine)

| surfaceType | rows | false-credit | false-negative |
| --- | ---: | ---: | ---: |
| isolated_word | 35 | 0/35 (0.000) | **20/35 (0.571)** |
| connected_sentence | 14 | 0/14 (0.000) | 5/14 (0.357) |
| connected_passage | 0 | n/a | n/a |

Web Speech (diagnostic only, never scores): isolated false-negative 16/35 (0.457) but it also **blanked** many reads entirely; it is not a scoring engine. The Part-3 autonomy decision uses **isolated_word rows only** — connected rows are advisory for future Parts 5/7.

## What the data actually looks like (why isolated fails)

The corpus was mixed adult + the **4–5-year-olds** (the `groundTruthSource` column logged the harness default "adult-scripted," but the run included the children, per Jonathan — the child reads are unmistakable in the transcripts). A correctly-read lone word came back as:

- `lake` → "Blake", "Like", "Leak", "Wake."
- `made` → "Bade", "I don't know. Wait.", "Make. Make!", "mail."
- `cape` → "Kip.", "Okay.", "K.", "CAPE!"
- `name` → "Neve."
- `game` → "King.", "GAME!"

A single decodable word, in a small child's voice, gives the recognizer almost no context, so it snaps to a nearby real word or a filler. The same children's **connected** sentences transcribed far cleaner ("Dave made a cake." came back verbatim; the misses were "Dave→They", "Jane→Rain" — names, not the target pattern).

## What this licenses (and forbids)

- **Forbids:** autonomous isolated-word *scoring* for the youngest cell, and any "you said ___" feedback off an isolated miscue transcript (Phase A already showed those transcripts are unstable: cack → Cac/Cat/Crack/Kak/CAC).
- **Licenses:** Harper *listening* to isolated words with **retry + async-review** (never autonomous reject); and pursuing **connected-text autonomy + content-word alignment** first, since 0 false-credit + cleaner connected transcripts is the safe cell to start on.

## Caveats (honest scope)

Small founder-run probe (n=35 isolated, n=14 connected), single recording setup, mixed adult/child, `groundTruthSource` mislabeled as adult-scripted in the harness (fix the corpus tagging before the next run so child rows are explicitly tagged + age-banded). This is a *direction-setting* probe, **not the corpus** — it tells us where to point the flywheel, not a final accuracy number. The frontier probe ([[asr-strategy]] step 3) widens this to ages 5–8 × isolated/connected with explicit age tags and deliberate misreads.

## Feeds

[[asr-strategy]] autonomy-frontier + build order · [[part3-live-loop-codex-spec]] `PART3_SCORING_MODE` default (isolated stays non-autonomous) · the dev-capture corpus ([[dev-voice-corpus-capture-codex-spec]]) is the path to *fixing* the 57%, by fine-tuning on real young-kid audio.
