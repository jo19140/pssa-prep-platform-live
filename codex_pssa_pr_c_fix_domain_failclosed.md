# PSSA PR C fix — remove correct-IDs-as-domain fallback; fail closed on missing response domains (same branch, scoring module + tests ONLY)

## Context
PR C's first pass compensated for four conventions items whose `responseSpecJson` lacks machine-scorable domains (they use the #4n conventions vocabulary — `selectableTokens`/`tokenId`, `draggableTokens`/`slots`/`slotId` — which the importer's `responseSpec()` serializer does not translate into canonical `selectableSpans`/`tokens`/`targets`). The compensation — deriving the allowed domain from `correctResponseJson` ids — violates the PR C contract: it collapses the distinction between a legitimate-but-wrong selection (`scored: 0`) and an out-of-domain/malformed one (`invalid_response`), and it turns answer-key data into domain data. The durable fix (serializer vocabulary normalization + PR B projection coverage + fresh-DB rebuild for the resulting hash drift) is a SEPARATE cross-layer PR — documented in `specs/pssa-conventions-vocab-gap-followup.md` — and must NOT be attempted here.

## Required changes (scoring module + test file only; `git diff` must touch nothing else)
1. **Remove the correct-IDs-as-domain fallback entirely.** The allowed response domain comes from `responseSpecJson` ONLY. `correctResponseJson` is used ONLY to evaluate correctness of in-domain responses and in the item-key consistency check (clarification 3 below). Required architecture (PATCH — Pro clarification 3):
```ts
const domain = extractDomainFromResponseSpec(interactionType, responseSpecJson); // must not accept or read correctResponseJson
validateCorrectResponseAgainstDomain(correctResponseJson, domain);               // consistency ONLY — throws malformed_item_scoring_data if the key references ids/indices outside the authored domain; NEVER adds correct ids to the domain
validateStudentResponseAgainstDomain(response, domain);                          // must not accept or read correctResponseJson
scoreInDomainResponse(response, correctResponseJson, scoringJson);               // scoring only
```
1b. **Diagnostic item id (PATCH — Pro clarification 1):** add `itemId?: string` to `PssaScorableItem` — diagnostic ONLY, never used in any scoring branch. Error format is deterministic: `malformed_item_scoring_data:${item.itemId ?? "unknown_item"}:${field}_missing`. The implementation must NOT special-case the four ids — the TEST names them; the scorer throws generically for any machine-scored item with a missing required domain.
2. **Missing/empty required domain on a machine-scored item ⇒ throw `malformed_item_scoring_data`.** For HOT_TEXT that means absent/empty `selectableSpans`; for DRAG_DROP absent/empty `tokens` or `targets`; same principle for every machine-scored type per the spec's type-specific consistency table.
3. **Real-bank coverage becomes 75 + 4, by name.** The real-bank test asserts: 70 machine-scored items score full credit on the correct response and per-rules on wrong responses; 5 SHORT_ANSWER are `pending_human_scoring`; and EXACTLY these four items throw `malformed_item_scoring_data`:
   - `pssa_conv_g3_hottext_spelling_01` (HOT_TEXT — no `selectableSpans`)
   - `pssa_conv_g3_hottext_function_01` (HOT_TEXT — no `selectableSpans`)
   - `pssa_conv_g3_drag_address_01` (DRAG_DROP — no `tokens`/`targets`; assignments keyed by `slotId`)
   - `pssa_conv_g3_drag_dialogue_01` (DRAG_DROP — no `tokens`/`targets`; assignments keyed by `slotId`)
   Assert the thrown error identifies the item and the missing domain field (e.g. `malformed_item_scoring_data:pssa_conv_g3_hottext_spelling_01:selectableSpans_missing`). When multiple domain fields are missing (DRAG_DROP with neither `tokens` nor `targets`), report the deterministic FIRST missing field in canonical order (`tokens` before `targets`) so the four expected error strings are stable — these four are serializer-gap markers, and the test names them so the follow-up PR has an executable target: when the serializer is fixed and the bank rebuilt, this test MUST fail loudly (4 expected throwers no longer throw), forcing the count back to 79/79 deliberately.
4. **All-or-nothing rule-table tests move to SYNTHETIC fixtures (PATCH — Pro clarification 2):** the original spec asked for all-or-nothing HOT_TEXT/DRAG_DROP tests on real conventions items — that now conflicts with this fix, because those real items are intentionally malformed until the serializer follow-up lands. All-or-nothing rule-table tests must use canonical synthetic fixtures with COMPLETE responseSpec domains (totalPoints=1 < |correct set|). The four real conventions HT/DD rows appear ONLY in real-bank coverage as named throwers. Do not reintroduce the fallback to keep any old real-item test passing.
5. **No other behavior changes.** All rule-table semantics, malformed-response handling, EBSR divergence test, no-key-echo sweep stay byte-identical except where the fallback removal changes results for the four named items.

## Explicitly forbidden in this fix
- Touching `scripts/content/lib/pssa-import-plan.ts` (serializer), `lib/content/pssaStudentDto.ts` (PR B projection), any renderer, route, schema, or importer file.
- Any alternative domain inference: no correct-id domains, no instruction-text parsing, no "accept any string id" mode, no per-item special cases beyond the throw.
- Changing the four items' data or their exemplar files.

## Acceptance
`test:pssa-pr-c` green with the 75+4 assertion; the four throwers named with field-specific reasons; domain-extraction and student-response validation functions neither accept nor read `correctResponseJson` (grep-provable on function signatures/bodies) — the ONLY permitted `correctResponseJson` reads outside scoring itself are the item-key consistency check, which compares the key AGAINST the extracted domain and throws on mismatch, never widening it; all-or-nothing tests run on synthetic complete-domain fixtures; `tsc` + `build` + all other `test:pssa-*` green; diff = `lib/content/pssaScoring.ts` + `scripts/test-pssa-pr-c-scoring.ts` only.

## Stop — report
The diff; the new 75+4 real-bank output; the four thrower error strings; the grep proving domain validation never reads `correctResponseJson`; tsc/build/test results.
