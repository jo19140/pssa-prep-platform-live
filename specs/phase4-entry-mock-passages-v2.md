# Phase 4 Entry full-audit passages — v3.4 FINAL (APPROVED, Codex-ready)

Status: APPROVED v3.4 — 2026-06-03. History: v3.2 architecture approved by Jonathan; v3.3 removed `put`/`of` (classifier passed both but phonetically irregular: /pʊt/, /əv/); v3.4 = style polish (smoother sentence rhythm, less template feel) validated against ALL THREE layers — production `passesAuditGate`, strict spec checks (declared heart list only, no banned function words, no target-team inflections, non-heart evidence per pattern), and full-package e2e (`canPersist`, coverage). The styled passages below are the FINAL `fullAuditPassageText` values; the exact text the gate validated is the exact text Part 7 renders.

Minor note: the v3.4 oa rewrite dropped "Joan ran to get him." The inference question "Why did Joan look at the goat?" is still answerable ("Stop that!" + the runaway sequence) but with slightly less direct support.

Decisions locked in:

- **Additive, not replacement.** Existing short `mockPassageText`/`mockPassageTitle` stay byte-identical. New fields `fullAuditPassageText`/`fullAuditPassageTitle` carry the 80–120 word gate passages.
- **Heart-word rollback.** `heartWordsPreviewedThisLesson` stays `said/was/they`; `sharedHeartWordsAssumedKnown` rolls back from the PR's 20-word expansion to the declared `["I", "a", "the", "to"]`. `we/he/see` are NOT added to make anything pass.
- **Part 7 renders `fullAuditPassageText`.** The gate validates the same passage the student reads. The short passage becomes a compact lesson/demo fixture.
- **Companion sentence/dictation/seed edits are gate-blocking, not optional.** Verified: with the heart rollback and original sentences, all four targets fail `LESSON_NO_UNCLASSIFIED_WORDS` (Part 5 contains `we`/`see` that no longer classify). With the edits below, all four pass.

## Implementation

`lib/content/phase3EntryLessonContent.ts`:

```ts
// add to LessonContentByDailyTarget:
fullAuditPassageText?: string;   // 80-120 words, passes full phase-4 passesAuditGate
fullAuditPassageTitle?: string;
```

- Four Phase 4 Entry targets get the passages below as `fullAuditPassageText`/`fullAuditPassageTitle`.
- `sharedHeartWordsAssumedKnown` → `["I", "a", "the", "to"]`.
- Phase 3 targets: no new fields, no changes — behavior must remain byte-identical.

`lib/literacy/lessonGenerator.ts` (`buildLessonGeneratorContext`):

- Phase ≥ 4: `selectedPassage`/`selectedPassageAudit` and Part 7 use `fullAuditPassageText`. Missing `fullAuditPassageText` on a phase ≥ 4 target is a hard failure.
- Phase 3: unchanged (`mockPassageText`).

`scripts/test-content-v3-lesson-pipeline.ts`:

- Restore `assert.equal(targetCtx.selectedPassageAudit?.passesAuditGate, true, ...)` for ALL phases — at phase ≥ 4 the selected passage is now the full audit passage, so no relaxation is needed.

## Role split

Short mock passage (unchanged, lighter role): compact lesson/demo preview; must not use bare Phase 4 target codes; heart-word exemptions never count as target evidence; not required to satisfy the 80–120 band or `passesAuditGate`. Known accepted misses under the rolled-back heart list, documented as legacy-short exemptions: unclassified `we/he/see`, blocked `see(team_ee)`/`day(team_ay)`, inflections `weeds/sleeps/oats`; decodability 0.939–0.958.

Full audit passage (new): 80–120 words; decodability 1.000; unclassified 0; blocked 0; quality pass; `passesAuditGate` true; `canPersist` true; non-heart evidence for every target pattern.

## Validation — all layers pass with the rolled-back heart list

| target | words | decodability | unclassified | blocked | quality | passesAuditGate | strict checks | canPersist | coverage |
|---|---:|---:|---:|---:|---|---|---|---|---|
| team_ai_ay | 91 | 1.000 | 0 | 0 | pass | PASS | PASS | true | PASS |
| team_ee_ea | 112 | 1.000 | 0 | 0 | pass | PASS | PASS | true | PASS |
| team_oa | 111 | 1.000 | 0 | 0 | pass | PASS | PASS | true | n/a (single pattern) |
| team_igh | 98 | 1.000 | 0 | 0 | pass | PASS | PASS | true | n/a (single pattern) |

Strict checks = heart list limited to `said/was/they/I/a/the/to`; no `we/he/she/me/be/go/so/by/my/no`; no `-s/-es/-ed/-ing` on target-team stems; non-heart evidence per pattern (ai: gail, rain, wait, paint, pail, sail, snail · ay: jay, play, day, stay, may, gray, away · ee: see, deep, green, reef, feet, keep, sleep, speed · ea: jean, dean, sea, seal, eat, treat, meat, bean · oa: joan, goat, oat, load, road, soap, foam, toast · igh: dwight, knight, light, high, night, bright, might, fight).

## Full audit passages (v3.4 FINAL — use these verbatim)

### team_ai_ay — "Gail's Rainy Day" (91 words)

Gail and Jay like to play. The rain fell all day. "Stay in," said Gail. Jay had to wait a long time. May came with paint and a big pail. "Make a sail," said May. Gail made a gray sail. Jay set a snail on his sail. May made a jay with a red wing. Rain hit the pane: drip, drip, drip. "The haze is gray," said Jay. At last, the sun came up. They ran to the wet grass. The sail slid away. "That was a fun day," said May.

### team_ee_ea — "The Seal" (112 words)

Jean and Dean went to the sea. They had a plan to see a seal. The sea was deep and green. "I see a green reef," said Jean. A seal swam up to eat. Jean gave the seal a treat. The seal ate meat in a tin pan. "That is a neat seal," said Dean. It can leap and dive. It made a big wave. Jean got wet feet. They sat in the sand and had a snack. "I can keep him fed," said Jean. "It must sleep in the deep sea," said Dean. The seal swam off at six. "See him speed," said Jean. The trip to the beach was sweet.

### team_oa — "Joan's Goat" (111 words)

Joan has a goat at home. The goat ate oat mash. It ate much oat mash. Then the goat ran up the road. "Stop that," said Joan. The goat got in the mud. Joan got soap and a hose. Joan gave the goat a bath. The goat did not like the foam. It hid in its pen. Joan made him toast with jam. The goat had on a red coat. Joan and the goat rode in a boat on the lake. A toad sat on a log and gave a croak. The boat did float past the dock. "I like this goat," said Joan. It was a fine time at home.

### team_igh — "The Knight" (98 words)

Dwight is a knight. The knight had a small light. Dwight went up a high hill at night. The night was not bright. "I might slip on the hill," said Dwight. The wind made his light dim. The knight held the light up high. A bat came at him. The knight did not fight the bat. Dwight hid in a cave. His light lit up the cave. Dwight had figs as a snack. At last, the sun came up. The knight went home in bright sunlight. "It is a fine sight," said Dwight. Dwight slept tight all night.

## Companion edits — GATE-BLOCKING under the heart rollback (e2e-verified)

Without these, Part 5 fails `LESSON_NO_UNCLASSIFIED_WORDS` on all four targets.

`lib/content/phase3EntryLessonContent.ts`:

- team_ai_ay sentences: `"I see the gray sail," said Jay.` → `"The gray sail is big," said Jay.`
- team_ee_ea sentences: `We see a seal at the sea.` → `Jean and Dean see a seal at the sea.` · `"I see green weeds," said Jean.` → `"I see a green reef," said Jean.` · `The seal sleeps in the deep sea.` → `The seal can sleep in the deep sea.`; dictatedSentences: `We see a seal at the sea.` → `Dean can see a seal at the sea.`; vocabulary: `["seal", "weeds"]` → `["seal", "reef"]`.
- team_oa sentences: `The goat ate the oats.` → `The goat ate the oat mash.` · `"I see a goat," said Joan.` → `"That goat is fast," said Joan.` · `It was a fine day.` → `It was a fine time.`; dictatedWords: `oats` → `soap`.
- team_igh sentences: `"I see the light," said Dwight.` → `"The light is bright," said Dwight.` · `We held the light up high.` → `Dwight held the light up high.`

`lib/content/phase3EntrySeed.ts`:

- team_oa exampleWords: `oats` → `foam` (also fixes `oats` landing in targetWords via `.slice(0, 5)`).

Comprehension question fix (team_igh): `"What did Dwight see?"` has no literal `see` line under the rollback → replace with `"What did the knight take up the hill?"` (literal answer: a small light).

## Regression tests (add to `scripts/test-content-v3-phase4-entry-teams.ts`)

1. Phase 4 target with short `mockPassageText` + valid `fullAuditPassageText` passes the full audit gate.
2. Phase 4 target missing `fullAuditPassageText` fails.
3. Phase 4 `fullAuditPassageText` under 80 words fails.
4. Declared heart words (`said/was/they/I/a/the/to`) are allowed as exemptions but never count as target-team evidence.
5. Undeclared cross-team words still fail (e.g., `see` in a team_oa passage).
6. Bare `ai/ay/ee/ea/oa/igh` target codes still fail (registry codes only).
7. Phase 3 behavior remains byte-identical (existing Phase 3 tests pass untouched — Phase 3 content predates the heart expansion, so the rollback is a no-op for it).
8. For `fullAuditPassageText`, `sentences`, and `dictatedSentences`: no banned open-syllable function words (`we/he/she/me/be/go/so/by/my/no`) and no `-s/-es/-ed/-ing` token whose stem matches a target pattern. Short `mockPassageText` is exempt (documented legacy misses above).

## Order of operations for Codex

1. Add `fullAuditPassageText`/`fullAuditPassageTitle` fields + the four passages (do NOT modify `mockPassageText`).
2. Roll back `sharedHeartWordsAssumedKnown` to `["I", "a", "the", "to"]`.
3. Apply the companion sentence/dictation/seed edits (gate-blocking).
4. Wire `buildLessonGeneratorContext`: phase ≥ 4 selects `fullAuditPassageText` for Part 7 + audit; missing field fails.
5. Add regression tests 1–8.
6. THEN restore strict `passesAuditGate === true` in `scripts/test-content-v3-lesson-pipeline.ts` for all phases.
7. `npm run test:content-v3` && `npm run content:audit-phase3-nonwords` && `npm run seed:phase4-entry`.

## Teacher-facing note (include with the content)

"The Seal" and "Joan's Goat" are intentionally controlled decodable texts: every word is either a taught pattern, a declared heart word, or a previewed vocabulary word. They will sound a little more patterned than trade-book prose — that is by design, not a defect.

## Resolved review notes

- RESOLVED v3.3: `put` and `of` removed from all full audit passages per Jonathan's review (classifier passed them, but they're phonetically irregular for a child sounding out).
- RESOLVED v3.4: style pass applied and fully re-validated; no constraint loosened.
- "haze" (ai_ay) and "croak/toad" (oa) are low-frequency but cleanly decodable — accepted.
- Names carry decodability: Gail/Jay/May, Jean/Dean, Joan, Dwight all classify as target words.
