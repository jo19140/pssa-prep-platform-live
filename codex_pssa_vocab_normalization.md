# PSSA conventions-vocab normalization — serializer + projection + selector gate + deliberate test flips (cross-layer; CRITICAL PATH for form assembly)

## Context (read first)
Issue doc of record: `specs/pssa-conventions-vocab-gap-followup.md` (Pro-approved; on main). Four #4n conventions items use a vocabulary the canonical serializer doesn't translate, leaving empty machine-scorable domains in `responseSpecJson`. Consequence chain: PR B projects empty/unrenderable DTOs; PR C throws `malformed_item_scoring_data` for them (4 named test markers); and because the Grade 3 blueprint requires EXACTLY 9 conventions points from exactly 9 pool items, **no valid form can assemble until this lands**. This PR is a DELIBERATE content-shape correction — the opposite of a DB-6.5 pure refactor — so hash changes are expected, bounded, and documented, and the bank is rebuilt on a fresh disposable DB.

The four items: `pssa_conv_g3_hottext_spelling_01`, `pssa_conv_g3_hottext_function_01` (HOT_TEXT — authored `selectableTokens[].tokenId`), `pssa_conv_g3_drag_address_01`, `pssa_conv_g3_drag_dialogue_01` (DRAG_DROP — authored `draggableTokens` + `slots`/`slotId`).

## Scope / boundary (locked)
1. **Serializer normalization** in `scripts/content/lib/pssa-import-plan.ts` (`responseSpec()` + `correctResponse()`).
2. **PR B projection extension** in `lib/content/pssaStudentDto.ts` — minimal: accept the normalized output (one optional field).
3. **Selector domain gate (MUST, from the PR D decision)** in `scripts/content/lib/pssa-student-ready-selector.ts` + one ADDITIVE enum value.
4. **Deliberate test flips**: PR C 75+4 → 79/79; DB-6.5 corpus-hash constant update; new pinned non-empty-domain tests.
5. **Fresh-DB rebuild runbook** (operator section — Jonathan executes).

**Explicitly NOT in scope:** editing the four items' AUTHORED exemplar content (normalization is serializer-side only); legacy routes/scorer/StudentTest; PssaForm/assembler logic; approval CLI semantics beyond the selector gate; new renderers (the existing two must render the normalized shapes); PR D tables/routes.

## 1. Serializer normalization (exact rules — locked by the issue doc)
Domains come from AUTHORED DOMAIN ARRAYS, never from `correctResponseJson`/key fields.

**HOT_TEXT** (when `selectableTokens` present and `selectableSpans` absent):
- `selectableTokens[].tokenId` → `selectableSpans[].spanId`; `.text` → `.text`; add `spanKind: "token"`.
- Do NOT invent offsets (omit `paragraphIndex`/`sentenceIndex`/`startOffset`/`endOffset`).
- STRIP `isCorrect`, `errorPattern`, `rationale`, and every other authoring field (F2b discipline). Every token becomes a span — including wrong tokens.
- `correctResponse()` already maps `correctTokenIds` → `correctSpanIds` — verify, don't duplicate.

**DRAG_DROP** (when `draggableTokens`/`slots` present and `tokens`/`targets` absent):
- `draggableTokens[]` → `tokens[]` (`{tokenId, text}` only); `slots[]` → `targets[]` (`{targetId: slotId, label}`).
- `correctResponse()`: `correctAssignments[].slotId` → `targetId`. The `slotId` vocabulary must NOT survive anywhere in canonical scorer-facing data.
- `baseSentenceWithSlots` → the canonical `prompt` surface if `prompt` absent.

Reading-vocabulary items must serialize BYTE-IDENTICALLY to today (blast radius = exactly the 4 items; proven by the golden hashes below).

## 2. Projection extension (minimal — PATCH: offset optionality is explicit, not implied)
For HOT_TEXT projection, span location fields become OPTIONAL for token spans:
```
selectableSpans: [{
  spanId,
  text,
  spanKind?: "token",
  paragraphIndex?,
  sentenceIndex?,
  startOffset?,
  endOffset?
}]
```
- Reading-vocabulary HOT_TEXT spans remain byte-identical and still carry their existing location fields.
- Conventions token spans carry `spanKind: "token"` and must NOT invent `paragraphIndex`, `sentenceIndex`, `startOffset`, or `endOffset`.
- Any HOT_TEXT preview/renderer path touched in this PR may ONLY add support for offsetless `spanKind:"token"` spans from the normalized DTO. It must not use `correctResponseJson`, `isCorrect`, `errorPattern`, `rationale`, legacy `StudentTest.tsx`, or client scoring.

`projectHotText` adds `spanKind` to the explicit field map and DTO type; nothing else changes. DRAG_DROP needs zero projection changes (canonical fields now exist). The deny-sweep and banned-key list are untouched.

## 3. Selector domain gate (MUST — PR D decision §finding 1)
- ADDITIVE migration: `ALTER TYPE "PssaStudentReadyBlockedReason" ADD VALUE 'MISSING_RESPONSE_DOMAIN';` (+ Prisma schema enum entry; additive-only — verify zero other DDL).
- `computeStudentReadyBlockedReason` gains a per-type domain check over `responseSpecJson`: machine-scored items with missing/empty required domain (HOT_TEXT spans, DRAG_DROP tokens/targets, MATCHING_GRID rows/columns, MULTI_SELECT/MCQ/EBSR choices, INLINE_DROPDOWN blanks/options) → `MISSING_RESPONSE_DOMAIN`, NOT student-ready — even if approval metadata is otherwise valid. SHORT_ANSWER/TDA exempt. Pure check, live-computed (the selector's standing recompute discipline).

## 4. Deliberate test flips (each one documented in the diff)
- **PR C**: the 4 named-thrower assertions FLIP — after normalization: correct response → full credit; LEGITIMATE wrong token/slot → `{status:"scored", pointsEarned:0}`; unknown id → `invalid_response`. Real-bank coverage returns to 79/79 (74 scored + 5 pending). The flip IS the proof this PR works.
- **PR B**: new non-empty-domain tests PINNED to the four item IDs (expected span/token/target counts; no `isCorrect`/`errorPattern`/`rationale`/`correct*` survive; `spanKind:"token"` present on the 2 hot-text items). Shape snapshots for these four specifically.
- **DB-6.5 golden tests**: the 3 pinned golden hashes (MCQ, SA, passage) must remain IDENTICAL — proving blast radius. `GRADE3_SOURCE_CORPUS_HASH` WILL change (4 member hashes changed): update the constant deliberately and document old→new in the commit message. The conventions batch `sourceCorpusHash` recomputes at import (DB-5 batch certs re-derive on rebuild — expected).
- **Selector gate tests**: fixture with empty domain + full approval metadata → `MISSING_RESPONSE_DOMAIN`; normalized real items → `NONE`-eligible — these "→ NONE" tests use FIXTURES where all other readiness/approval requirements are satisfied; on a fresh DB with no approvals, the same items remain blocked for normal approval reasons until Jonathan approves them.

## 5. Fresh-DB rebuild runbook (operator — after merge; NEVER against a DB with approvals)
```
docker rm -f <pssa_dev> && docker run ... fresh postgres
npx prisma migrate deploy                                  # incl. the new enum value
npm run content:load-pssa-crosswalk -- --write --env dev   # 241/936
npm run content:import-pssa-items -- --dry-run --grade 3   # manifest 5/67/12/12/8 UNCHANGED; 4 item hashes differ from old reports — expected, document
npm run content:write-pssa-items -- --write --env dev --grade 3   # then re-run: content no-op
# verify: SELECT the 4 items → responseSpecJson domains non-empty; selector returns 0 (nothing approved)
# Jonathan's SINGLE approval pass over all 79 via /admin/pssa-review (incl. the 4 — now healthy)
npm run content:assemble-pssa-form -- --env dev --grade 3 --seed g3-form-001 --blueprint pde-ela-test-design-2025-g3-v1 --dry-run
# expected: conventions_1pt now satisfiable; remaining deficits only category-A/approval-dependent
```

## Acceptance
Reading-vocab serialization byte-identical (3 golden hashes unchanged; dry-run summary/report diffs allowed ONLY for the four item rows and the source-corpus/hash lines that derive from those four changed hashes — all unrelated report rows and reading-vocabulary rows byte-identical); 4 items' domains non-empty + key-field-free; `slotId` absent from all canonical outputs; selector gate blocks empty-domain items with the new reason; PR C 79/79 with before/after semantics; PR B pinned tests green; all `test:pssa-*` + `tsc` + `build` green; migration additive-only; the 4 items render in `/admin/pssa-preview` (operator visual check).

## Stop — report (for Claude's independent audit)
Per-item before/after `responseSpecJson` for the 4; the hash-change table (exactly 4 item hashes + corpus constant old→new; 75 others + 5 passages unchanged); serializer diff; projection diff (spanKind only); selector gate implementation + enum migration SQL; all test flips with outputs; dry-run report diff scoped to the 4 rows; tsc/build results. Do NOT touch authored exemplar content, legacy surfaces, assembler logic, or PR D tables. Rebuild runbook executes AFTER my audit passes, not before.
