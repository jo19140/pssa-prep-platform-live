# PSSA Grade 3 micro-fix — reading_24 "traced" keyed-option wording (ONE item; final pre-approval polish)

## Scope: exactly one item. Nothing else.
Three independent reviews flagged `pssa_item_g3_reading_24`. The keyed option is gate-clean but imprecise: the passage says "Two kids traced the bus route in the air," and the current key reads "followed the mural route outline." Replace it with a natural, precise definition of *traced*.

## Change
Item: `pssa_item_g3_reading_24` (in `exemplars/pssa_grade3_pilot/pilot_backend.json`)
- Current keyed option D: `"followed the mural route outline"`
- New keyed option D: `"followed the shape of a route with a finger"`

Keep unchanged: stem, key index (D), eligibleContent/anchor/reportingCategory, passage text, distractors A/B/C (unless a gate requires a touch — if so, STOP and report rather than silently widening).

## Acceptance
- `PSSA_VOCAB_KEY_CONSTRUCT` passes (key contains no form of "traced"; <3 shared content words with the source sentence "Two kids traced the bus route in the air" — new key shares only "route", so it passes; verify).
- D remains the uniquely correct answer; A ("made marks with paint"), B ("held the smallest paint can near the library"), C ("looked closely at a picture") remain defensible distractors and none becomes co-correct.
- All five content gates remain bank-wide zero; import dry-run still `7/91/12/12/8`, 0 gate failures.
- ONLY `pssa_item_g3_reading_24`'s item hash changes; **all other 90 active item hashes, all 12 deprecated item hashes, and all 7 passage hashes remain byte-identical** (91 active + 12 deprecated = 103 total rows; exactly one changes); `GRADE3_SOURCE_CORPUS_HASH` old→new documented; DB-6.5 pinned mapping updated for this one item if it's pinned.
- All `test:pssa-*` + `tsc` + `build` green.

## After merge (operator)
Because this changes one canonical item hash, it's a final tiny corpus change before approval — DB is still approval-free, so this is the right moment. Rebuild/re-import on the fresh dev DB (migrate already applied → crosswalk write → import dry-run → write ×2), confirm `approved_items=0`, then start the approval pass. No approvals exist to invalidate.

## Stop — report
The new option text in context (all 4 choices); vocab-gate result; confirmation D still uniquely correct; the single-item hash change + corpus constant old→new; dry-run manifest; tsc/build/suites. Do NOT touch any other item or passage. Do NOT approve anything.
