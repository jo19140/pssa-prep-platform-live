# Codex Spec — PSSA Passage Figure/Map Feature (additive `type:"figure"` text feature)

**Type:** platform feature (additive). **Owner:** Jonathan. **Date:** 2026-06-18.
**Why:** The current student passage-rendering path has **no visual figure/map feature** (the `StaminaTextFeature` JSON can store various metadata types — heading, sidebar, dialogue, figurative_language — but none renders a map). MOY P1 needs a renderable, **accessible** floor map; its map-dependent items (5 map-only; 3 & 8 map+prose) cannot exist without it. This PR adds a visual **figure** feature so a real PSSA-style stimulus is preserved instead of degraded to a text table.
**Blocks:** `specs/codex_pssa_moy_p1_items.md` (P1 item authoring) until merged + verified on `main`.

## 0. Scope & guardrails

- **Additive only.** Add a new `figure` feature variant *alongside* the existing `heading`/`sidebar` types. Do not change or remove existing feature behavior.
- **Prefer no Prisma migration.** `PssaPassage.textFeaturesJson` is already `Json?` — the figure lives inside it. **STOP and report** if the implementation unexpectedly needs a broad schema redesign or a new column.
- **Use the repo's real names.** The canonical feature type is **`StaminaTextFeature`** (`scripts/content/lib/pssa-stamina-gates.ts`, `type: string` open union; existing values `heading`, `sidebar`, `figurative_language`, `dialogue`). Extend *that* contract; reuse existing field names (e.g., `sectionId`) rather than inventing parallels. The field sketch below is illustrative — align names to what's already there.
- Do not modify `pssaScoring.ts`, the distractorRole registry, or BOY/foundation **content**. Legacy passages must be byte-identical (see §5).
- One museum-map asset is committed at a stable internal location (see §3); no external/CDN fetch.

## 1. The `figure` feature shape (align to `StaminaTextFeature`)

Add a discriminated `type:"figure"` variant. Illustrative fields (rename to repo conventions):

```ts
// extends the existing StaminaTextFeature union — type stays a string, figure adds fields
type PssaFigureFeature = {
  type: "figure";
  figureKind: "map";            // ONLY "map" implemented now — do not advertise unimplemented kinds.
                                // Add diagram/chart/illustration later, each with its own renderer + validation.
  featureId: string;            // stable id, unique within the passage
  title: string;
  sectionId: string;            // REUSE existing field name (placement anchor) — not "placementSectionId"
  assetPath: string;            // committed repo asset (see §3) — internal, /pssa/figures/, .svg
  assetSha256: string;          // "sha256:<64 lowercase hex>" digest of the committed asset
  altText: string;              // concise, AUTHORED
  longDescription: string;      // GENERATED deterministically from structuredData (not hand-authored) — see §1.1
  structuredData: {             // REQUIRED + the SINGLE SOURCE OF TRUTH for the SVG, longDescription, and accessible render
    legend: Array<{ symbol: string; meaning: string }>;
    locations: Array<{ id: string; label: string; level: string; notes?: string }>;
    relationships: Array<{ id: string; type: "adjacent_to" | "separated_from"; from: string; to: string }>;
    routes: Array<{ id: string; label: string; from: string; via: string[]; to: string }>;
    annotations: Array<{ label: string; value: string }>;  // e.g., show times
  };
};
```

`structuredData` is the **one canonical semantic source** for semantics and accessibility; the `longDescription` and the accessible render are **derived** from it, and the committed SVG must be **consistent** with it (its labels match) — though the SVG itself is hand-built, **not** generated (see §3). The visual map and the accessible equivalent are one unit, not two. **`relationships` is required** — spatial facts the map-and-prose items need (e.g., Story Stage *adjacent_to* Build Lab; Art Studio *adjacent_to* Dinosaur Dig; Quiet Corner *separated_from* Build Lab) must be first-class data, **not buried in free-text `notes`**. The accessible table and the renderer must both expose `relationships`, or a screen-reader student can't answer item 3 or AO-5.

**Figure validation (fail closed):**
- `featureId` is **unique within the passage**.
- `sectionId` references a **real passage section** (a section produced by the existing section map — see §2.1).
- **Every route endpoint** (`from`, each `via`, `to`) and **every `relationships` `from`/`to`** references a known `locations[].id` (or a known map node such as the entrance/elevator).
- **`structuredData` is complete and internally consistent** (all required sub-arrays present and well-formed; all IDs unique; all references resolve). The validator is **GENERIC and reusable** — it must **NOT hard-code museum facts.** *Which* specific facts a given map must contain (the museum's show times, Family Rest Area, adjacency/separation relationships, elevator-only route) is asserted by that map's **fixture test** (§7.2), not by `validateFigureFeatureStrictly`. The Story-Stage/Art-Studio/Quiet-Corner examples above are illustrative of the *shape*, not validator rules.
- `longDescription` **equals the generator output** for the given `structuredData` (see §1.1) — not separately authored, so there is structurally no way for the accessible text and the canonical data to disagree.

### 1.1 `longDescription` is generated, not authored

`structuredData` is the only authored semantic source. The visible text description is produced **deterministically from `structuredData`** by a generator function in this PR (legend → locations by level → relationships → routes → annotations). If the stored DTO/schema requires a `longDescription` string, **generate and validate it during authoring** (assert `longDescription === generateLongDescription(structuredData)`) rather than asking authors to keep two free-text representations in sync. This is stronger than fuzzy "contains the same facts" checks.

## 2. Implementation surfaces (extend only these)

1. **`textFeaturesJson` parser / type contract** — recognize `type:"figure"`; validate its fields strictly; leave every other feature **exactly** as-is. Do **not** convert the system into a strict union that could break `dialogue`/`figurative_language`. Branch:

   ```ts
   if (feature.type === "figure") {
     validateFigureFeatureStrictly(feature);
   } else {
     preserveLegacyFeatureExactly(feature);  // no defaults, no field reordering
   }
   ```

   (`pssa-stamina-gates.ts` `StaminaTextFeature` + any feature parser/validator.) Not adding defaults or reordering legacy fields is what keeps BOY/foundation hashes byte-identical.
2. **Student passage renderer** — render the figure with its text labels and accessible equivalent in the student player. **STOP only** if no existing student passage/player rendering path can be safely extended without creating a parallel player or broad redesign. If the current player does not render `textFeaturesJson`: **extend the existing player** to render `type:"figure"`; do **not** create a second passage renderer; report the exact existing player/component that was extended.
3. **Reviewer + student preview generation** — the author-script preview emitters render the figure (with its accessible text) in both previews.
4. **Key-free student DTO projection** — the figure must expose only safe render fields (asset, alt, long description, structured labels/legend/locations/routes/annotations). It must **never** carry item keys, correct answers, rationales, or `distractorRole`. (Apply the same banned-key discipline as `pssaStudentDto.ts`.)
5. **Passage (and therefore form) content hashing** — fold the figure into `PssaPassage.contentHash`/`approvedContentHash` so identity changes when the figure changes (see §4). Locate the actual passage-hash computation; do not duplicate it.
6. **Figure validation + gates** — fail closed on missing/invalid figure (see §6).
7. **Stable internal asset location** — the museum map asset is committed and referenced by `assetPath` + `assetSha256`.

### 2.0 Validation layering (shared/pure vs Node-only — do NOT couple the client to the filesystem)

Split validation into two modules. The student client + DTO import **only the shared/pure** layer; they must NOT import `fs`, `path`, file-reading crypto, or the SVG parser.

**Shared / pure validation** (safe for client + server):
- figure JSON shape; `figureKind = "map"`
- IDs unique; all references resolve (routes, relationships)
- `sectionId` is a real section
- `structuredData` completeness + internal consistency
- generated `longDescription` equality
- **safe public `assetPath` *syntax*** (root-relative `/pssa/figures/*.svg`, no `..`/scheme/absolute)

**Node-only authoring/gate validation** (server/build only):
- resolve `assetPath` under `public/pssa/figures/`
- read raw SVG bytes; compute SHA-256; verify `assetSha256`
- parse SVG against the element + attribute allowlist; reject active/external content
- compare SVG label text against `structuredData`

The player and student DTO consume only already-validated **safe render data**.

### 2.1 Placement & rendering behavior

- A figure renders **immediately after the passage section identified by `sectionId`**. A missing or unknown `sectionId` **fails validation**.
- The figure does **not** use fake `charBounds`. Legacy `heading`/`sidebar` features keep their existing `charBounds` behavior untouched.
- Render with semantic structure:

```html
<figure>
  <img alt="..." aria-describedby="..." />
  <figcaption>...</figcaption>
</figure>
```

- Responsive width; a full-size or zoomable view; **no tiny labels at normal display size**.
- A **visible "Text description" control available to all students** (not screen-reader-only) that opens the `longDescription` / accessible structured table.
- Focus returns correctly to the trigger after the enlarged view is closed.

## 3. The museum-map asset

- Encode the approved floor map from `specs/pssa_g3_moy_p1_passage_package.md` §3 (the v3 corrected layout: distinct Elevator/Stairs boxes; green route through the elevator only with an arrow at the Dinosaur Dig; `Family Rest Area`; show times `11:00 · 1:00 · 3:00`).
- **Pin both representations distinctly:**
  - **Repository file:** `public/pssa/figures/g3_moy_p1_museum_map.svg`
  - **`assetPath` / student public `src`:** `/pssa/figures/g3_moy_p1_museum_map.svg`
  - `assetPath` must **never** contain `public/` or an absolute filesystem path. The Node layer resolves `assetPath` → `public/pssa/figures/...` to read bytes; the client only ever sees the public URL.
- `structuredData` is the source of truth for semantics + accessibility. The SVG is a **separately committed visual representation**, checked for matching labels and reviewed for spatial geometry — it is **not** generated from `structuredData`.
- **The SVG is a committed visual asset, NOT generated from `structuredData`.** `structuredData` is canonical for *semantics and accessibility*; the SVG is the hand-built visual stimulus. The validator can check that the **SVG text contains the required labels/annotations** that appear in `structuredData` (consistency of labels), but it **cannot verify spatial geometry** — so the correct *spatial placement and route* are confirmed by **human visual review**, not code.
- **This PR commits the asset only.** It does NOT author the P1 passage/items (that's the blocked P1 PR). A throwaway fixture passage may reference the asset for tests, but no production P1 content is created here.

### 3.1 Safe asset handling (validate, fail closed)

`assetPath` rules — **disallow** (validation FAILS): `http://` / `https://`, `data:`, `javascript:`, `..`, absolute filesystem paths, any external SVG reference. Allowed: a root-relative `/pssa/figures/*.svg`.

**SVG allowlist (not just a denylist)** — validate the committed asset against a strict **allowlist** of elements and attributes; reject anything else.

- **Allowed elements:** `svg, g, rect, line, path, polyline, polygon, circle, text, tspan, title, desc` (extend only if this map genuinely needs more).
- **Allowed attributes (allowlist, not only elements):** only those the approved asset needs — `xmlns`, `viewBox`, coordinate/shape attrs (`x, y, x1, y1, x2, y2, cx, cy, r, width, height, points, d`), `fill`, `stroke`, `stroke-width`, `stroke-dasharray`, `transform`, and text/font attrs (`text-anchor`, `font-size`, `font-weight`, `font-family`, `dy`, `dx`), plus `id`/`class`. Reject any attribute not on the list.
- **Rejected (validation FAILS):** `script`, inline `style` / `@import` / `url(...)`, `foreignObject`, `image`, `use`, `a`, any event attribute (`on*`), `href` / `xlink:href`, external fonts or resources, **`<!DOCTYPE>` declarations, XML entity declarations, and processing instructions (`<?...?>`)** — and any element/attribute not on the allowlists.
- The attribute allowlist's `font-*` is the **exact** set the approved SVG uses (`font-size`, `font-weight`, `font-family`) — no other `font-*`.
- **Path safety (Node layer):** resolve the asset with `realpath` and confirm the resolved path **remains under `public/pssa/figures/`** (defeats symlink/`..` escapes) before reading bytes.
- **Render via `<img src="/pssa/figures/...svg">`**, never raw-SVG injection into the DOM.

`assetSha256` format is fixed: **`"sha256:<64 lowercase hex characters>"`**.

**Student DTO** exposes a safe public `src` (the served URL), **not** the repository filesystem path, and does **not** expose `assetSha256`.

## 4. Content-hash requirement

For a **figure-bearing** passage, the canonical hash input includes **all** of these figure fields — changing any one changes that passage's hash:

```
type · figureKind · featureId · title · sectionId · assetPath · assetSha256 · altText · longDescription · structuredData
```

(So changing the asset, digest, legend, labels, route, show times, or long description all change identity.) Conversely, **legacy passages containing only `heading`/`sidebar` features MUST keep their current hashes and rendering byte-identical** — fold figure fields into the canonical hash input **only when a figure is present** (absent → omitted, the same pattern Phase 4A used for `scoringBucket`). Legacy features are hashed exactly as today via the `preserveLegacyFeatureExactly` path (no defaults, no reordering).

**Canonicalization & asset resolution (precise — prevents accidental hash drift):**
- Canonicalize figure `structuredData` with the **repository's stable JSON serializer** (`stableStringify`). **Object-key order must NOT change the hash; array order IS meaningful and stays stable.**
- `assetSha256` is computed from the **exact raw SVG bytes** of the committed file.
- `assetPath` `/pssa/figures/foo.svg` resolves **only** to `<repo>/public/pssa/figures/foo.svg`. A missing file **fails validation**.

## 5. Backward compatibility (must stay green)

- Existing `heading`/`sidebar` passages: parsing, rendering, previews, DTO, and **content hashes byte-identical**.
- BOY stamina passages (`exemplars/pssa_grade3_stamina_pilot/*`) render and hash exactly as before.
- No Prisma migration if avoidable; if one proves unavoidable, it is additive-only and you STOP to confirm first.

## 6. Accessibility (mandatory — the dependency test depends on it)

- Responsive image or SVG; dark text on a light background; **text labels beside symbols**; route meaning **not conveyed by green color alone** (label the route).
- Concise `altText`; detailed `longDescription` and/or an accessible structured table built from `structuredData`.
- Keyboard + screen-reader access to **all** map facts a student needs: show times, Family Rest Area location, level headings, accessible route, **and the exhibit `relationships` (adjacency / separation)** — the accessible table must expose relationships, not just locations.
- A screen-reader student must be able to answer the map items from the accessible equivalent. **Therefore the dependency test means:** an item "requires the figure" iff it fails when the **entire figure feature — including its accessible representation — is removed.** It does NOT mean the student must see pixels.

## 7. Tests (all required)

**Create a focused executable entrypoint: `scripts/test-pssa-figure-map-feature.ts`**, exercising: parsing + generic (shared/pure) validation; Node-only asset validation; SHA mismatch; SVG element+attribute allowlist; DTO projection; `longDescription` generation; hash stability/sensitivity; legacy hash fixtures; and the §7.2 museum fixture assertions.

```
1.  Existing heading/sidebar passages parse + render byte-identical.
2.  BOY stamina rendering AND content hashes unchanged.
3.  Figure/map feature renders in the current student player.
4.  Figure renders in student preview AND reviewer preview.
5.  Missing asset / title / altText / longDescription → validation FAILS.
6.  assetSha256 mismatch (asset changed) → validation FAILS.
7.  Student DTO contains ONLY safe render fields (no keys/rationales/distractorRoles).
8.  Figure does not leak any item key or rationale.
9.  `assetPath` validation: `http(s)://`, `data:`, `javascript:`, `..`, filesystem/external refs → FAIL; root-relative `/pssa/figures/*.svg` → pass.
10. SVG **allowlist**: any element/attribute not on the allowlist (`script`, `style`/`@import`/`url(...)`, `foreignObject`, `image`, `use`, `a`, any `on*`, `href`/`xlink:href`, external resource) → FAIL; a map SVG using only allowed elements passes.
11. `assetSha256` wrong format (not `sha256:<64 hex>`) or mismatched with the committed asset's raw bytes → FAIL.
12. `structuredData` required + well-formed (**GENERIC — no museum facts**): missing legend/locations/**relationships**/routes/annotations → FAIL; a route endpoint OR a `relationships` `from`/`to` not referencing a known location → FAIL; duplicate `featureId` / `locations[].id` / `routes[].id` / `relationships[].id` → FAIL; missing/unknown `sectionId` → FAIL; internally inconsistent `structuredData` → FAIL.
13. `longDescription` is **generated**: `longDescription === generateLongDescription(structuredData)`; a hand-edited `longDescription` differing from the generator output → FAIL.
14. Removing the figure removes BOTH its visual render AND its accessible representation together (no orphan image, no orphan accessible text).
15. The accessible representation contains all required museum-map facts **and relationships** (show times, Family Rest Area location, level headings, elevator-only route, adjacency/separation).
16. Student DTO exposes a safe public `src` (not a filesystem path) and does NOT expose `assetSha256`.
17. Enlarge/zoom, focus-return-after-close, and visual route geometry: use the existing UI test harness **if available**; otherwise record these as explicit **manual-review checks with screenshots** — do NOT claim they are automated if they are not.
18. Hash sensitivity + stability: changing any figure hash-field changes the figure-bearing passage hash; **reordering `structuredData` object keys does NOT change it; reordering a meaningful array (routes/locations/relationships) DOES**; legacy passages' hashes unchanged.
19. Build + suites green: `npx tsc --noEmit`; `OPENAI_API_KEY=sk-build-dummy npm run build`; `npx tsx scripts/test-pssa-figure-map-feature.ts`; `npx tsx scripts/test-pssa-content.ts`; `npm run test:pssa-pr-c`; `npm run test:pssa-db6`.
```

### 7.1 Dependency-test scope guard (do NOT let this PR grow into item logic)

The platform may not have a formal "item requires feature X" contract. So:

- **Use the existing stimulus-dependency detector if one exists.**
- **If no existing detector can express map-only vs. map+prose item dependency:** do **not** invent new item schema or bank metadata in this PR. Keep the figure-rendering and accessible-stimulus fixture tests here (tests 1–18, throwaway fixtures, no real P1 items); **move the real item dependency assertions to the P1 item-authoring PR.**

**This PR proves:** the figure can be parsed, validated, hashed, projected, rendered, enlarged, and read accessibly; removing the figure removes **both** its visual and accessible representation; legacy passages are unchanged. **The later P1 PR proves** the actual items behave correctly when the figure or the prose is removed.

### 7.2 Museum-map fixture assertions (separate from the generic platform tests)

These are **fixture-level** assertions about *this* map's `structuredData` + committed SVG — NOT logic in the generic validator:

- Story Stage `adjacent_to` Build Lab
- Art Studio `adjacent_to` Dinosaur Dig
- Quiet Corner `separated_from` Build Lab
- Family Rest Area present
- show times `11:00 · 1:00 · 3:00`
- accessible route Entrance → Elevator → Dinosaur Dig
- stairs **excluded** from the accessible route
- **SVG label text matches `structuredData`** (the asset's `<text>` labels/annotations include the structuredData labels)
- **human visual review** confirms spatial placement and the route (code cannot verify geometry)

## 8. Out of scope

- Authoring the P1 passage or items (blocked PR `codex_pssa_moy_p1_items.md`).
- Any change to scoring, the registry, delivery gating, or non-figure content.
- New figure *kinds* beyond `map`. `figureKind` is **`"map"` only** now; `diagram`/`chart`/`illustration` are NOT added here — each gets its own renderer + validation contract when actually needed.

## 9. Process

Branch from `main` (commit any dirty docs first). Spec → (optional Pro review) → Codex implements → independent audit (legacy byte-identical, figure renders + accessible, DTO leak-free, hash sensitivity, the three dependency-fixture tests) → merge + regression-verify on `main` → **then** unblock and author P1 items. Do not stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.
