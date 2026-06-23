# Codex Spec — Process-Figure Support (shared figure infrastructure prerequisite)

**Type:** infrastructure (generalize an existing shared contract). **Owner:** Jonathan. **Date:** 2026-06-23.
**Branch:** `codex/pssa-process-figure-support` (preserve `codex/teacher-lessons-tab-pr1`). **Blocks:** EOY P1 authoring (`specs/codex_pssa_eoy_p1_items.md`) — that spec's process diagram cannot be represented on `main` today.

## 0. Why this exists (verified blocker on `main`)

The committed shared figure contract is **map-only**:
- `lib/content/pssaFigureFeature.ts`: `PssaFigureFeature.figureKind` is the literal `"map"`; `validatePssaFigureFeatureShared` throws `figure_kind_unsupported` for any other kind (line ~81); `requireStructuredData` mandates non-empty map-specific `legend`/`locations`/`relationships`/`routes`/`annotations`; `longDescription` must equal `generatePssaFigureLongDescription(structuredData)` (map generator) or it throws `figure_long_description_mismatch`; `projectPssaFigureFeatureForStudent` hard-codes `figureKind:"map"`; `pssaFigureHashInput` bakes `figureKind` + `structuredData` into the figure hash.
- `scripts/content/lib/pssa-figure-feature-node.ts`: `validatePssaFigureAssetNode` → `assertSvgLabelsMatchStructuredData` reads map-only `legend`/`locations`/`annotations` to assert the SVG text labels; SVG allowlist + path guard + SHA-256 are kind-agnostic.

A crayon **process diagram** (5 ordered stages) cannot pass any of these. **Generalize the existing module in place** — do **not** add a parallel module, player, or route.

## 0.1 Guardrails / STOP conditions

- **Do NOT modify** scoring (`pssaScoring.ts`), the distractorRole registry, the DB schema/Prisma, delivery, form assembly, or any BOY/MOY/EOY content. STOP and report if a change there appears required.
- **No new route or player.** Reuse the existing figure render path. **Inspect the existing renderer first.** No renderer path is in the §2 allowed-paths list, so a renderer edit is out of scope by default: **if a renderer modification turns out to be required, STOP and amend this tracked spec with the exact existing renderer path (add it to §2) before editing it.** If no renderer change is needed (expected — the renderer consumes `altText`/`longDescription`/`structuredData` generically), change nothing there.
- Preserve **all existing map behavior byte-identically** (validation result, generated long description, student projection, and figure hash for the MOY P1 map are unchanged).
- Clean-worktree flow off `origin/main`; absolute-path, fail-closed (§7).

## 1. Required contract

### 1.1 Discriminated structured-data shape
Keep the existing map shape; add a process shape and discriminate on `figureKind`:

```ts
// Existing map shape — body UNCHANGED. Renamed conceptually, but the EXISTING exported
// name MUST be preserved as an alias so current imports keep resolving (no out-of-scope
// MOY edits, no TS breakage):
export type PssaFigureMapStructuredData = { /* existing: legend, locations, relationships, routes, annotations — UNCHANGED */ };
export type PssaFigureStructuredData = PssaFigureMapStructuredData;   // REQUIRED back-compat alias

export type PssaFigureProcessStage = {
  order: number;     // 1-based
  targetId: string;  // unique, non-empty (the matching-grid / item anchor)
  label: string;     // non-empty (short stage name, shown in the SVG)
  caption: string;   // non-empty full sentence (functional, not decoration)
};
export type PssaFigureProcessStructuredData = { stages: PssaFigureProcessStage[] };
```

Keep the existing `PssaFigureStructuredData` export resolving (as the alias above) — current code imports that name; do **not** rename it without the alias or you force an out-of-scope MOY edit / TS break. `PssaFigureFeature` and `PssaStudentFigureFeature` become discriminated unions on `figureKind: "map" | "process"`, where `structuredData` is the matching shape for the kind. Keep every existing map field; add no optional cruft.

### 1.2 Process structured-data validation (new branch in `requireStructuredData`/validator)
The **shared** process contract validates a **generic, contiguous `1..N` stage sequence** (do **not** hard-code 5 in shared infrastructure — that would make the "shared" feature P1-specific): `stages` is a non-empty array (N ≥ 2); the **array itself must be in ascending order** — i.e. `stages.map((s) => s.order)` deep-equals `[1, 2, …, N]` (each `order` exactly once, no gaps/dupes/out-of-range, **and** stored in ascending array position). This is required because `projectPssaFigureFeatureForStudent` and `pssaFigureHashInput` **preserve the original array order** — so a shuffled-but-valid array would yield different student data / hashes for logically identical figures. `targetId` non-empty and **unique** across stages; `label` and `caption` non-empty strings. **The count `=== 5` is enforced only in the EOY P1 author + `test-pssa-eoy-p1.ts`, not in shared infra.** Map validation is untouched and still runs for `figureKind:"map"`. `validatePssaFigureFeatureShared` allows `"process"` (replace the `!== "map"` throw with a kind switch); `featureId`/`title`/`sectionId` mandatory and section-membership check unchanged; `requireSafePublicFigurePath` + `assetSha256` regex unchanged; `altText` required (literal, author-supplied — **not** generated); `longDescription === generatePssaFigureLongDescription(structuredData)` still enforced (now via the kind-branched generator).

### 1.3 Deterministic process long-description generator
Add a process branch to `generatePssaFigureLongDescription` (map branch byte-identical). **Pure function of the stage records** (no topic noun, no hand-authoring):

```
// stages are already validated ascending (§1.2), so iterate the array directly —
// generator, projection, and hash all use the same array order (no separate sort).
head = `This diagram shows ${stages.length} steps in order.`
body = stages.map(s => `Step ${s.order}: ${s.label}. ${s.caption}`).join(" ")
return `${head} ${body}`
```

For the P1 stages (§1.7 of the P1 item spec) this deterministically yields **exactly**:
> `This diagram shows 5 steps in order. Step 1: Melt the wax. Paraffin wax is heated or kept warm until it is liquid. Step 2: Add the color. Powdered pigment is blended in to give the wax its color. Step 3: Fill the mold. The colored wax is poured into crayon-shaped holes and cooled. Step 4: Push out and check. Hardened crayons are pushed out; broken or chipped ones are removed. Step 5: Wrap and pack. Each crayon gets a paper label, then crayons are sorted and boxed.`

(The P1 author sets `longDescription` to this generator output — never a hand-written string.)

### 1.4 Student projection
`projectPssaFigureFeatureForStudent` preserves `feature.figureKind` (stop hard-coding `"map"`) and deep-clones the kind-appropriate `structuredData` (add a process clone branch to `cloneStructuredData`). Student projection still drops `assetSha256` and exposes `src`/`altText`/`longDescription`/`structuredData`.

### 1.5 Hash canonicalization
`pssaFigureHashInput` already passes `figureKind` + `structuredData` through — keep it; the process figure's hash legitimately differs from any map's. **Assert the MOY P1 map's `pssaFigureHashInput` output is byte-identical to `main`.**

### 1.6 Node-side SVG label match
Generalize `assertSvgLabelsMatchStructuredData` (`pssa-figure-feature-node.ts`): branch on `figureKind`. Captions are declared **functional content**, so the SVG must carry them too. For `"process"`, required labels =

```ts
[
  feature.title,
  ...stages.flatMap((stage) => [stage.label, stage.caption]),
]
```

(every one must appear in the SVG `<text>` labels). This **extends** the existing node check (which today asserts the map title + structured labels), not bypasses it. Map branch unchanged. SVG allowlist, path guard, and SHA-256 computation stay kind-agnostic.

## 2. Deliverables / allowed tracked paths

```
lib/content/pssaFigureFeature.ts                        (generalize: types, validator, generator, projection, clone)
scripts/content/lib/pssa-figure-feature-node.ts         (generalize: assertSvgLabelsMatchStructuredData)
scripts/test-pssa-process-figure-feature.ts             (NEW — process happy-path + rejection battery)
scripts/test-pssa-figure-map-feature.ts                 (type-annotation narrowing ONLY: helper + one cast → PssaFigureMapFeature, required by the true discriminated union; no runtime/assertion change)
scripts/test-pssa-content.ts                            (test wiring only, if needed)
specs/codex_pssa_process_figure_support.md
```
Anything else (scoring/registry/schema/delivery/form-assembly/content) → **STOP**. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.

## 3. Regression + new tests (FAIL-CLOSED)

**Byte-identical map regression** — `scripts/test-pssa-figure-map-feature.ts`, `scripts/test-pssa-moy-p1.ts` still pass unchanged; additionally, in the new test, assert the MOY P1 map figure against **LITERAL pre-change snapshot values** — capture the current `origin/main` outputs (run before the change, or read them off `main`) and **paste them as literal string/JSON constants in the test**; do NOT recompute the "expected" via the modified implementation (that would make the snapshot tautological). Assert: `validatePssaFigureFeatureShared(map, sections) === true`; `generatePssaFigureLongDescription(map)` equals the pinned literal pre-change string; `JSON.stringify(projectPssaFigureFeatureForStudent(map))` equals the pinned literal pre-change projection; `JSON.stringify(pssaFigureHashInput(map))` equals the pinned literal pre-change hash input.

**New `scripts/test-pssa-process-figure-feature.ts`** (shared contract = generic `1..N`):
- (a) a valid **N-stage** sample process figure (test at least N=2 and N=6 to prove the shared contract is not 5-locked) validates;
- (b) `generatePssaFigureLongDescription` equals the deterministic §1.3 output for the sample;
- (c) `projectPssaFigureFeatureForStudent` preserves `figureKind:"process"` + all stages;
- (d) `pssaFigureHashInput` includes the stages;
- (e) **rejection battery** — a **shuffled-but-valid array** (e.g. orders `[2, 1, 3]` — every value present once but not in ascending array position) throws; duplicate `targetId`; non-contiguous `order` (e.g., `1,2,3,3,5` or `0..3`); a 1-element `stages` (below N≥2); empty `label`/`caption`; a hand-written `longDescription` ≠ generator output; and an unknown `sectionId` each throw the specific error. (Note: **4 or 6 contiguous ascending stages are VALID** in shared infra — the `=== 5` rule is asserted in `test-pssa-eoy-p1.ts`, not here.)
- (f) node-side: an SVG missing a stage **label or caption** throws the label-mismatch error.

## 4. Gate battery

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-figure-map-feature.ts
npx tsx scripts/test-pssa-moy-p1.ts
npx tsx scripts/test-pssa-process-figure-feature.ts
npx tsx scripts/test-pssa-content.ts
npm run test:pssa-db6        # BOY/foundation + MOY form-assembly unaffected
echo "all process-figure gates passed"
```

## 5. Acceptance criteria
- `figureKind:"process"` validates + renders accessible text through the **existing** figure path; no new route/player; renderer touched only if strictly necessary (report if so).
- MOY P1 map: validation result, generated long description, student projection, and figure hash **byte-identical** to `main` (snapshot-proven).
- Process long description is generated deterministically from the ordered stage records (no hand-authored string); the shared infrastructure is generic `N ≥ 2`, and EOY P1 specifically requires five.
- Diff limited to §2 paths; `npm run test:pssa-db6` green.

## 6. Then unblock P1
After this branch is **independently audited and merged**, the EOY P1 item spec (`specs/codex_pssa_eoy_p1_items.md` §2/§3.1) is authored against `figureKind:"process"` with the pinned `featureId`/`title`/`sectionId`/`assetPath`/`assetSha256` and `public/pssa/figures/g3_eoy_p1_crayon_process.svg` in scope.

## 7. Process (clean-worktree, fail-closed)

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-process-figure-support
cd "$PRIMARY"; git fetch origin
if git show-ref --verify --quiet refs/heads/codex/pssa-process-figure-support; then echo "STOP: branch exists"; exit 1; fi
test ! -e "$WORKTREE" || { echo "STOP: worktree path exists"; exit 1; }
git worktree add "$WORKTREE" -b codex/pssa-process-figure-support origin/main
cd "$WORKTREE"
test "$(git branch --show-current)" = "codex/pssa-process-figure-support"
test -z "$(git status --short)"
cp "$PRIMARY/specs/codex_pssa_process_figure_support.md" specs/
git add specs/codex_pssa_process_figure_support.md
git commit -m "Process-figure support: prerequisite infra spec"
```
Then: implement §1 → §3 tests → §4 gates → scope guard (`git diff --name-only origin/main...HEAD` limited to §2) → commit (**no merge**) → report. Independent audit before merge; merge via a temp `main` worktree (never switch the occupied teacher-WIP checkout).
