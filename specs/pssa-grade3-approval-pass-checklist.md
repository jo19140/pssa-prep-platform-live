# Grade 3 approval pass — reviewer checklist (Jonathan's session guide)

Run AFTER the conventions-vocab normalization AND #4p imports, on a rebuilt approval-free dev DB, as a single pass over the full pool: **7 passages + 91 active items**. (Vocab is already merged + rebuilt as of e5e4951; #4p import is the remaining precondition.)

**The five rules:** Run after conventions-vocab + #4p imports. Approve only if human-defensible. Skip when unsure. Use DB-6 dry-run reports as truth. Never override a fail-closed gate. Surface: `/admin/pssa-review` (approve/reject only; CLI for anything batch-level). The pipeline's structural gates already passed — your job is the FINAL HUMAN JUDGMENT the gates can't make: is this content correct, fair, and something you'd put in front of a third grader?

## Before you start (5 min)
- Confirm DB state: import dry-run manifest shows 7/91/12/12/8, `studentReady = 0`, nothing approved. If ANY approvals exist from testing, stop and rebuild fresh — never mix.
- Confirm the queue shows honest computed reasons (no `MISSING_RESPONSE_DOMAIN` anywhere — if one appears, STOP: that's the selector tripwire firing on a serializer regression; do not approve that item; report it).
- Budget: ~2–3 hours at 1–2 min/item. Split across evenings is fine — approvals are per-row and durable; there is no partial-pass hazard (fail-closed selector means un-reviewed items simply stay unready).

## Order of operations (dependency-aware)
1. **All 7 passages FIRST** — items can't become student-ready until their passage is approved (selector recursion). Read each passage fully once; you wrote the bar: genuinely original, coherent, age-appropriate, concrete.
2. **Reading MCQs** (`reading_mcq_grade3`, 40 after #4p) — the bulk; do these while fresh.
3. **Multipoint TEIs** (`ebsr`, `multi_select`, `hot_text`, `matching_grid`, `drag_drop` batches).
4. **Conventions** (9 items — incl. the 4 normalized ones; they review like any other now).
5. **Short Answer pool** (7) — slowest per item (rubric + band examples).

## Per-item judgment (what the gates could NOT check)
- **Key correctness**: the reviewer block shows the key + rationale. Is the keyed answer actually, defensibly correct — and is it the ONLY defensible answer (single-defensibility)?
- **Distractor fairness**: would a strong reader who understood the passage ever pick a distractor for a GOOD reason? If yes → reject (reason: ambiguous).
- **EC fit, human read**: does the item genuinely test the skill its EC names, or does it merely mention it?
- **Kid test**: vocabulary load, sentence length, cultural assumptions, anything confusing for an 8-year-old.
- **Per-type extras**: EBSR — Part B evidence genuinely supports Part A, no near-miss spans; MS/HT — the "choose N" instruction matches the key count; MG — every row has exactly one defensible column (watch the Both-column rows); DD — order items have exactly one sensible order; INLINE_DROPDOWN — wrong options are real error patterns, not silly; SA — the rubric's band examples would actually score that way under the 3/2/1/0 + copied-text cap.

## Decision semantics
- **Approve** — with a short reason ("human review pass" is fine; specifics only when you hesitated).
- **Reject** — required reason; rejection is recoverable (item returns to candidate; fix → re-audit → re-import path on a fresh DB if content changes).
- **Skip** (leave pending) — when unsure; note why. Pending costs nothing; a wrong approve costs governance.
- NEVER approve to "see what happens" — approval is the single switch that makes content student-reachable once PR D lands.

## After the pass (the victory lap)
1. `getStudentReadyPssaItems` count should equal approved items whose passages + batches are clean (target: 91 if you approved everything).
2. Run the DB-6 assemble dry-run (seed `g3-form-001`). Expected IF all required content was approved: a blueprint-valid 45-pt form — conventions exactly 9, category A satisfiable (2-lit + 2-info now possible). If it refuses, do NOT override or hand-pick content; the deficit/gate report identifies the missing approval, category, EC-variety, or form-level shortcut issue. A refusal is the gate working, not a reviewer mistake.
3. Try one or two additional seeds. A different valid form proves the #4p payoff: real assembly freedom beyond mural-dependence. If a seed converges to the same form, record it — that alone is not a failure unless ALL tested seeds collapse to the same selection.
4. Report all tested form outputs back for the audit log.

## Known context (so nothing surprises you)
- The 4 normalized conventions items (`hottext_spelling/function`, `drag_address/dialogue`) carry NEW content hashes from the vocab fix — expected, documented, reviewable as normal.
- The 12 deprecated items never appear in the queue (structurally excluded).
- License fields are all `internal_original/cleared` from import — no attestation flags needed in this pass (the formal commercial-use attestation remains a separate launch-checklist item).
- This pass is on the disposable dev DB. The same pass repeats on any future production DB — your reasons/notes in `PssaReviewLog` are the rehearsal record.

## Watchlist
- `pssa_item_g3_reading_24` — does "followed the mural's bus route with a finger" read naturally?
- `pssa_ms_g3_cart_01` — preserve the multi-select cart watch: both keyed details should be necessary and no third choice should be defensible.
