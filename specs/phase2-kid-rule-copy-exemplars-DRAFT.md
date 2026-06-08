# Part 2 kid-facing rule + re-teach copy — 3 exemplars (DRAFT for Jonathan review)

**Status:** DRAFT for sign-off. This is curriculum language (what Harper *says* to teach and re-teach a pattern), NOT plumbing — so it's authored + reviewed, not invented by Codex. Per the runtime foundation spec, the generated lesson has `demoMode` / `demonstrationPairs` / `morphologyJson` but only generic/ hardcoded-a_e teaching language; the V6 concept card and re-teach card need kid-facing copy. We prove the structure on three targets (one per `demoMode` shape), then fill the rest systematically — NOT all 30 at once.

## The two fields (per target)

- **`kidRuleStatement`** — what Harper says in Part 2 to introduce the rule (spoken, audio-first). One or two short sentences, concrete, ends with a worked example.
- **`reteachPrompt`** — what Harper says in Part 3 when the child misreads (the adaptive re-teach card). Points at the feature, re-models, invites a retry. Contains a `{word}` placeholder filled at runtime with the word being read.

Notes: copy is **spoken by Harper** (no phoneme slash-notation a child would never see — Harper says the sound). Tone = instructive tutor, not peer-cheer (matches the brand: "Try the qu sound. Like queen."). Lives on the per-target content entry (`LESSON_CONTENT_BY_DAILY_TARGET`), consumed by Part 2 + the re-teach card.

## Exemplar 1 — `a_e` (demoMode: minimal_pairs)

```
kidRuleStatement: "When a word ends in a silent e, the e is quiet — but it makes the a say its name. Watch: cap turns into cape."
reteachPrompt:    "Look at the e at the end. It's silent, and it helps the a say its name. Let's try it again: {word}."
```

## Exemplar 2 — `team_ow` (demoMode: examples_only, long-o team)

```
kidRuleStatement: "Sometimes o and w work together. They make the long o sound — like in snow."
reteachPrompt:    "Look — the o and the w go together and say long o, like snow. Let's try it again: {word}."
```

## Exemplar 3 — `morph_y_to_i` (demoMode: transformation_pairs)

```
kidRuleStatement: "When a word ends in y, we change the y to i before we add -ed or -es. Watch: cry turns into cried."
reteachPrompt:    "This word ends in y. Change the y to i, then add the ending. Let's try it again: {word}."
```

(Alternate transformation target if you'd rather — `morph_compare_no_change`: kidRuleStatement "To compare, just add -er or -est — nothing else changes. Watch: fast, faster, fastest." / reteachPrompt "Just add the ending — the word stays the same. Let's try it again: {word}.")

## Why these three

They cover all three `demoMode` shapes the runtime must render, so the field design and the re-teach card are validated against the real variety — not silently a_e-shaped: `minimal_pairs` (a_e), `examples_only` (team_ow), `transformation_pairs` (morph_y_to_i). If these read well aloud and the re-teach card works for a transformation rule as well as a silent-e rule, the structure holds.

## What I need from you

1. Do these three read the way you'd want Harper to sound — instructive, warm, age-right, not babyish?
2. Any wording you'd change (you're the teacher — this is your call, not mine to finalize).
3. Confirm the field home: add `kidRuleStatement` + `reteachPrompt` to the content entry, with `{word}` runtime substitution in the re-teach prompt.

After sign-off: I draft the remaining ~27 systematically (same two fields, same voice), you review in batches, then Codex wires the field + renders it in Part 2 and the re-teach card. This is content authoring, parallel to and not blocking the ASR check.
