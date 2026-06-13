# Codex spec — ASR harness age-band + source tagging (tiny patch, no persistence)

**Why:** Phase B's CSV had no `speakerAgeBand` column and logged every row's `groundTruthSource` as the default `adult-scripted`, even when the 4–5-year-olds read (see [[asr-reality-check-RESULTS-phaseB]]). To run the **12–13-year-old cohort** and keep its data distinguishable from the 4–5 run — and correctly sourced — the harness needs two small label fields stamped onto every row + export. **This is a labels-only patch: no persistence, no capture, no route changes** (the local-disk capture is the separate [[dev-voice-corpus-capture-codex-spec]]).

## Scope / boundary

Edit `app/dev/asr-check/page.tsx` only. Still **dev-only, admin-gated, prod-404, in-memory, process-and-drop** — nothing about audio handling changes. No new route, no `lib/*` change, no DB/disk write. Two new session-level inputs that flow into each committed row and into the CSV + markdown export.

## Changes

1. **Add a "Reader age band" input** (session-level, applies to subsequent rows): a small text field `speakerAgeBand`, with **validation conditioned on `groundTruthSource`** (so adult sanity-check rows don't need a fake numeric age):
   - when `groundTruthSource = adult-scripted` → `speakerAgeBand` defaults to and accepts the literal **`adult`** (also accept a numeric band if the tester types one, but `adult` is valid and the default);
   - when `groundTruthSource = child-natural` → `speakerAgeBand` is **required** and must match **`^\d{1,2}(-\d{1,2})?$`** — a single age (`4`, `5`, `12`, `13`) or a compact band (`4-5`, `12-13`).
   - **A blank/invalid `speakerAgeBand` for a child-natural row disables "Commit row"** (same gating pattern as the existing `humanHeardAs` requirement), so no child row is committed unlabeled. (Format-validate the numeric case; do NOT use a closed enum of allowed ages — that would needlessly reject 9/10/11 if a middle age is ever tested.)
   - Persist it in component state across recordings; stamp the current value onto every committed row. Changing it mid-session affects only subsequent rows.

2. **Add a "Ground-truth source" selector** (session-level): `groundTruthSource ∈ { "adult-scripted", "child-natural" }`. **Phase-aware defaults (do NOT use one global default):** when **Phase = A → `groundTruthSource = adult-scripted` and `speakerAgeBand = adult`**; when **Phase = B → `groundTruthSource = child-natural` and `speakerAgeBand` blank until entered**. Changing the Phase resets both fields to that phase's defaults; the user can then manually override either. Validation keys off the *current* `groundTruthSource` (per point 1), so a manual override to `adult-scripted` makes `adult` valid. This replaces the hard-coded `adult-scripted` default that mislabeled the Phase B child run, without forcing a fake age onto adult rows.

3. **Export both columns.** Add `speakerAgeBand` and ensure `groundTruthSource` reflects the selector in the CSV header/rows AND the markdown export. Keep all existing columns and the existing per-engine false-credit/false-negative flags + `excludeFromThreshold` unchanged.

4. **On-screen table column order (so wrong setup is caught before recording 30 rows):** surface `speakerAgeBand` and `groundTruthSource` near the front, next to `phase`/`surfaceType` — e.g. `utteranceId · phase · speakerAgeBand · groundTruthSource · surfaceType · screenTarget/target · humanHeardAs · …` — not buried at the end. (CSV/markdown column order is unconstrained as long as both fields are present.)

5. **Per-surface rates already break out by `surfaceType`** (from the Phase B patch) — leave that as is. (Cross-age comparison is done later by filtering the exported rows on `speakerAgeBand`; no need to compute age-split rates in the harness.)

## Out of scope

No persistence/disk/cloud/DB, no capture route, no consent UI, no scoring/scaffold logic, no `lib/literacy`/content changes, no transcribe-route changes. Labels only.

## Verification

`npx tsc --noEmit` · `npm run build`. Manual:
- Set Phase B, age `12`, source `child-natural`; record + replay-label + commit → the on-screen row + CSV + markdown all carry `speakerAgeBand=12` and `groundTruthSource=child-natural`.
- Switch age to `5` mid-session → subsequent rows carry `5`; prior rows stay `12`.
- On a child-natural row, clear the age field (or enter `12 years`) → **Commit row is disabled** (required + format-validated).
- Switch to Phase A → `groundTruthSource` defaults to `adult-scripted` and `speakerAgeBand` defaults to `adult`; commit is allowed with `speakerAgeBand=adult` (no fake numeric age needed). Manual override of either still works.
- Confirm nothing persists (process-and-drop unchanged) and grep shows no `prisma`/`ModelDecision`/`writeFile`/`fs.`/`upload`/`putObject`/storage calls were added.

## After this

Jonathan runs the **same Phase B a_e corpus** (isolated words + connected sentences) with the 12–13-year-olds, age band set to `12`/`13`, source `child-natural`; exports that cohort's CSV separately; pastes it → Claude computes the per-engine isolated/connected false-credit + false-negative rates for the older cell and compares against the 4–5 run. Clean older-cell numbers would license shipping connected (and possibly isolated) autonomy for older readers first.
