# Follow-up: conventions responseSpec vocabulary normalization (cross-layer; NOT part of PR C)

Filed 2026-06-04 during the PR C audit; Pro-approved with patches applied 2026-06-04. Owner: state track. Blocked behind: PR C fix pass merging. Ordering locked: PR C fails closed on the four malformed item domains FIRST; this PR then normalizes serializer + projection + preview + scoring coverage deliberately, together.

## The gap
The #4n conventions items use a different field vocabulary than the reading TEI items, and the importer's `responseSpec()` serializer (`scripts/content/lib/pssa-import-plan.ts` ~lines 351–355) only translates the reading vocabulary. Affected items (Grade 3 bank):

| Item | Type | Authored domain fields | Canonical fields expected |
|---|---|---|---|
| `pssa_conv_g3_hottext_spelling_01` | HOT_TEXT | `selectableTokens[].tokenId` (+ inline `isCorrect`/`errorPattern`/`rationale`) | `selectableSpans[].spanId` |
| `pssa_conv_g3_hottext_function_01` | HOT_TEXT | `selectableTokens[].tokenId` | `selectableSpans[].spanId` |
| `pssa_conv_g3_drag_address_01` | DRAG_DROP | `draggableTokens` + `slots` + `baseSentenceWithSlots`; `correctAssignments[].slotId` | `tokens`/`targets`; `correctAssignments[].targetId` |
| `pssa_conv_g3_drag_dialogue_01` | DRAG_DROP | `draggableTokens` + `slots`; `correctAssignments[].slotId` | `tokens`/`targets`/`targetId` |

## Consequences across layers (all verified)
1. **DB**: these items' `responseSpecJson` carries empty/missing machine-scorable domains.
2. **PR B projection** (`lib/content/pssaStudentDto.ts`): produces empty-domain (unrenderable) DTOs for these four — passes leak tests because empty arrays leak nothing; the shape snapshot sampled the first item per type, which was a reading item. Latent.
3. **PR C scoring**: per contract, these four THROW `malformed_item_scoring_data` (after the fix pass) — they are named, executable markers in `test:pssa-pr-c`.

## Normalization principle (locked — this is the rule that prevents the PR C bug recurring in any layer)
Normalization MUST build allowed student domains from AUTHORED DOMAIN ARRAYS, never from `correctResponseJson`:
- HOT_TEXT conventions: EVERY `selectableTokens[]` entry becomes a selectable span in `responseSpecJson` — including wrong tokens.
- DRAG_DROP conventions: EVERY `draggableTokens[]` entry becomes a token; EVERY `slots[]` entry becomes a target.
- `correctResponseJson` encodes the key ONLY; it never defines the allowed domain.

## Exact normalized shapes (locked)
**Conventions HOT_TEXT:**
- `selectableTokens[].tokenId` → `selectableSpans[].spanId`
- `selectableTokens[].text` → `selectableSpans[].text`
- Token-select items have no passage offsets: emit nullable/optional location fields accepted by the DTO, or a documented `spanKind: "token"` display hint. Do NOT invent offsets.
- `isCorrect`, `errorPattern`, `rationale` must NOT survive into `responseSpecJson` (F2b projection discipline).

**Conventions DRAG_DROP:**
- `draggableTokens[]` → `tokens[]`; `slots[]` → `targets[]`; `slotId` → `targetId` EVERYWHERE in canonical `responseSpecJson` AND `correctResponseJson`. The old `slotId` vocabulary must not survive in canonical scorer-facing data. `baseSentenceWithSlots` maps to the canonical prompt/instruction surface (renderer decision below).

## The durable fix (one cross-layer PR, post-PR-C)
1. Extend `responseSpec()` per the locked shapes above; extend `correctResponse()` to emit `targetId` keys for the drag items.
2. Extend the PR B projection + a renderer decision for token-select hot-text and slot-based punctuation drag (reuse HOT_TEXT/DRAG_DROP renderers with the normalized shapes — likely zero new components; verify in `/admin/pssa-preview`).
3. **Hash consequence (do not hide):** changing serialized `responseSpecJson` AND/OR `correctResponseJson` changes the item canonical payload and therefore `contentHash` for these items → on any live DB this is content drift → the documented path is a FRESH DISPOSABLE DB rebuild (migrate → crosswalk → import ×2 → approvals), NOT in-place mutation. DB-6 forms snapshotting these items would invalidate via `--verify` — correct behavior, not a migration problem. This PR is the OPPOSITE of a DB-6.5-style pure refactor (whose invariant was hash stability) — it is a deliberate content-shape correction and must be isolated from any pure-refactor branch.
4. Flip the PR C 75+4 test back to 79/79 deliberately (the named-thrower test failing is the signal this PR is doing its job).

## Required tests (beyond leak tests — these would have caught the latent gap)
- **Non-empty-domain projection tests, pinned to the four item IDs** (not "first item per type" — sampling hits reading items and misses the conventions vocabulary): HOT_TEXT selectable domain non-empty with the expected token/span count; DRAG_DROP tokens AND targets non-empty with expected counts; no `isCorrect`/`errorPattern`/`rationale`/`correct*`/key-bearing fields survive. Shape snapshots for these four specific IDs.
- **PR C before/after behavior**: before normalization the four throw `malformed_item_scoring_data`; after normalization — correct response scores full credit; a LEGITIMATE wrong token/slot response returns `{ status: "scored", pointsEarned: 0 }`; an unknown token/span/target id returns `invalid_response`; the scorer never derives allowed domains from `correctResponseJson` (grep-provable).

## Acceptance for the follow-up PR (when scheduled)
All four items render in `/admin/pssa-preview`, score correctly in `test:pssa-pr-c` (79/79 with the before/after distinctions above), project leak-free with non-empty domains, and the full pipeline rebuild passes DB-3/4/5 gates on a fresh DB.
