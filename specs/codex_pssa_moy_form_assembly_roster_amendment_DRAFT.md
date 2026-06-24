# DRAFT — MOY Form-Assembly Roster Amendment (conventions IDs resolved by EC)

**STATUS: DRAFT — DO NOT COMMIT until BOTH P4 and conventions are merged on `origin/main`.**

This sidecar is a **planning artifact only**. It is **not** copied into the form-assembly worktree and is **not** part of the assembly PR. The canonical spec `specs/codex_pssa_moy_form_assembly.md` **keeps its `«conv id …»` placeholders** so that Stage 1 commits the placeholder spec and the Stage-3 amendment is a separate, Stage-2-verified commit.

Resolved from the audited conventions branch `codex/pssa-moy-conventions-items` (`d8b668f`), confirmed by EC. At unblock, re-confirm these IDs exist in **committed** `origin/main:exemplars/pssa_grade3_moy_conventions/backend.json` by EC before applying (the Stage-2 contract enforces this and fails closed).

## Exact replacements (apply at §7 Stage 3, in the worktree copy of `codex_pssa_moy_form_assembly.md`)

**Section 1 (lines ~86–90):**
```
«conv id for E03.D.1.1.1»  →  pssa_item_g3_moy_conv_d111_word_function
«conv id for E03.D.1.1.4»  →  pssa_item_g3_moy_conv_d114_irregular_verb
«conv id for E03.D.1.1.5»  →  pssa_item_g3_moy_conv_d115_verb_tense
«conv id for E03.D.1.1.6»  →  pssa_item_g3_moy_conv_d116_agreement
«conv id for E03.D.1.1.8»  →  pssa_item_g3_moy_conv_d118_conjunctions
```

**Section 3 (lines ~125–128):**
```
«conv id for E03.D.1.2.1»  →  pssa_item_g3_moy_conv_d121_title_caps
«conv id for E03.D.1.2.3»  →  pssa_item_g3_moy_conv_d123_dialogue
«conv id for E03.D.1.2.5»  →  pssa_item_g3_moy_conv_d125_spelling
«conv id for E03.D.2.1.1»  →  pssa_item_g3_moy_conv_d211_word_choice
```

Each replacement keeps the row's EC, type (`INLINE_DROPDOWN`), points (1), and bucket (operational) unchanged — only the ID cell is filled. EC→section mapping is unchanged (the IDs are placed by EC, never by backend array position).

## Resulting filled roster rows (for reference — what §3 should read after the amendment)

**S1 conventions (operational, 1 pt each):**
| ID | type | pts | EC | bucket |
|---|---|---|---|---|
| `pssa_item_g3_moy_conv_d111_word_function` | INLINE_DROPDOWN | 1 | D.1.1.1 | operational |
| `pssa_item_g3_moy_conv_d114_irregular_verb` | INLINE_DROPDOWN | 1 | D.1.1.4 | operational |
| `pssa_item_g3_moy_conv_d115_verb_tense` | INLINE_DROPDOWN | 1 | D.1.1.5 | operational |
| `pssa_item_g3_moy_conv_d116_agreement` | INLINE_DROPDOWN | 1 | D.1.1.6 | operational |
| `pssa_item_g3_moy_conv_d118_conjunctions` | INLINE_DROPDOWN | 1 | D.1.1.8 | operational |

**S3 conventions (operational, 1 pt each):**
| ID | type | pts | EC | bucket |
|---|---|---|---|---|
| `pssa_item_g3_moy_conv_d121_title_caps` | INLINE_DROPDOWN | 1 | D.1.2.1 | operational |
| `pssa_item_g3_moy_conv_d123_dialogue` | INLINE_DROPDOWN | 1 | D.1.2.3 | operational |
| `pssa_item_g3_moy_conv_d125_spelling` | INLINE_DROPDOWN | 1 | D.1.2.5 | operational |
| `pssa_item_g3_moy_conv_d211_word_choice` | INLINE_DROPDOWN | 1 | D.2.1.1 | operational |

## Apply sequence (from the canonical §7, restated)

1. Both P4 **and** conventions on `origin/main` (verified) — only then proceed.
2. Create the clean form-assembly worktree from updated `origin/main`.
3. Commit the assembly spec alone — **Stage 1** (placeholders still present).
4. Replace all nine placeholders by EC (the table above).
5. Commit the roster amendment.
6. Run **Stage 2** (fails closed): no `«conv id` placeholders remain; every ID exists in committed `backend.json`; every ID maps to its locked EC and section.
7. Only then implement the assembler.

## Self-deletion note

After the amendment is applied and committed in the worktree, **delete this DRAFT sidecar** from the primary checkout (`rm specs/codex_pssa_moy_form_assembly_roster_amendment_DRAFT.md`). It must never be committed.
