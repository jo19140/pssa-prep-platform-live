# PR #43 — Phase 4 Entry: long-vowel teams (EXEMPLAR for sign-off: `team_long_a`)

This is the **sign-off exemplar** (one fully-authored, CMUdict-validated lesson) before the full spec goes to Codex — per the mock-first rule, so we lock the shape and avoid wasted Codex iterations. After you sign off on this `long-a` lesson, I author the other three targets the same way and write the Codex spec.

## Target set (4 sound-grouped multi-team targets)
Mirrors Phase 3 Mid's multi-pattern `targetPatterns` infra. My read of "ai/ay, ee/ea, oa, igh":

| Target code | `targetPatterns` (registry codes) | Sound | Kid-facing label |
|---|---|---|---|
| `team_long_a` | `team_ai`, `team_ay` | long a | "long a teams (ai, ay)" |
| `team_long_e` | `team_ee`, `team_ea` | long e | "long e teams (ee, ea)" |
| `team_long_o` | `team_oa` | long o | "long o team (oa)" |
| `team_long_i` | `team_igh` | long i | "long i team (igh)" |

**Critical (engine note):** targets use the **registry codes** (`team_ai`, not bare `ai`) so the matcher phoneme-verifies. `ow`/`ie`/`oo` are deliberately deferred (ambiguous — they belong with diphthongs/PR #44). Prerequisites available to all four: all Phase-3 closed syllables + all 5 VCe + consonant digraphs (th/sh/ch) + heart words. No r-controlled, no open-syllable function words (by/my), no inflections on the target team.

---

## EXEMPLAR — `team_long_a` lesson content (the 13-field content-module entry)

```ts
team_long_a: {
  // demo pairs: closed short-a base → ai team (same frame, vowel a→long-a)
  demonstrationPairs: [
    { closed: "ran", target: "rain" },
    { closed: "pan", target: "pain" },
    { closed: "man", target: "main" },
    { closed: "mad", target: "maid" },
    { closed: "pad", target: "paid" },
  ],
  contrastiveLine2: ["ran","rain","pan","pain","man","main","mad","maid"],
  contrastiveLine3: ["rain","day","wait","play","main","say","paid","stay"],
  sentences: [
    "Jay made a sail.",
    "The sail was gray.",
    "Jay set the sail in the rain.",
    "Gail came to play.",
    "Jay gave Gail a wave.",
    "They sail and play that day.",
  ],
  dictatedWords: ["rain","wait","paid","day","ran","made"],
  dictatedSentences: ["Jay set the sail.", "Gail came to play."],
  comprehensionQuestions: [
    { question: "What did Jay set in the rain?", questionType: "literal" },
    { question: "What was the weather like that day?", questionType: "inference" },
    { question: "Tell me what Jay and Gail did, in your own words.", questionType: "retell" },
    { question: "What would you do on a rainy day?", questionType: "personal_connection" },
  ],
  heartWordsPreviewedThisLesson: ["said","was","they"],
  heartWordsAssumedKnown: ["I","a","the","to"],
  vocabulary: ["sail","wave"],
  exampleNonwords: ["zait","vaid","jaim","blait","slaim","fraik","snaip","draim"],
  mockPassageText: "Jay made a sail. The sail was gray. Jay set the sail in the rain. Gail came to play. Jay gave Gail a wave. They sail and play that day.",
  mockPassageTitle: "Jay's Sail",
}
```

## Validation evidence (run against the real CMUdict, 135,166 entries, in-repo)
- **Target words are genuinely long-a (`EY`):** rain `R EY N`, wait `W EY T`, paid `P EY D`, maid `M EY D`, main `M EY N`, sail `S EY L`, gray `G R EY`, play `P L EY`, stay `S T EY`, day `D EY`, jay `JH EY`, say `S EY`, trail `T R EY L`, Gail `G EY L`. (So the matcher classifies them as `team_ai`/`team_ay`, not as exceptions.)
- **8 pseudowords are gate-clean:** `zait, vaid, jaim, blait, slaim, fraik, snaip, draim` — all **absent** from CMUdict and **pronunciation-homophone-safe** (no real word shares their sounded-out /onset + EY + coda/). Meets the 8-nonword count gate; all detect to `team_ai`.
- **Mock passage decodability:** all 30 words are real and composed only of taught patterns — closed (set, that, in), VCe review (made, gave, wave, came), the ai/ay team (sail = ai target team not VCe, gray, rain, play, day), heart words (the, a, was, to, they, I), and names matching the target (Jay/Gail = ai/ay). **Zero words unclassifiable.**
- **Quality gate:** the passage has **no repeated trigrams** (checked programmatically).
- **Constraint sweep:** no r-controlled words, no open-syllable function words (by/my), no inflected target-team words.

## Gates this content must pass (the same Phase-3 stack, now multi-team)
`classifyPassageWords` decodability = 1.000; `runPassageQualityAudit` (no repeated trigrams); per-pseudoword CMUdict oracle (8, absent, homophone-safe); `LESSON_PHASE3_NO_RCONTROLLED` (clean); `LESSON_DAILY_TARGET_NARROW` / pattern-in-target-set (nonwords detect to `team_ai`/`team_ay`); Part-3 real-word + pseudoword counts; the full `auditGeneratedLessonDraft` + spec-conformance loop. Because the target is multi-pattern, the seed declares `targetPatternsJson: { patterns: ["team_ai","team_ay"] }` (like Phase 3 Mid).

## What I need from you (sign-off)
1. The **4-target grouping** (long-a/e/o/i) — good, or do you want 6 single-grapheme targets, or a different split?
2. The **lesson shape** above (passage, sentences, demo pairs, nonwords) — anything to change pedagogically?
3. Kid-facing **labels** ("long a teams (ai, ay)") — acceptable, or different wording?

Once you sign off, I author `long_e` / `long_o` / `long_i` to the same validated bar and write the Codex spec (content inlined, gates enumerated) → Pro → Codex.
