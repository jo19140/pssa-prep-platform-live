# Codex Spec — Phase 4A: Analytics-Only Scoring & Reporting Support

**Type:** extend-don't-rebuild. **Owner:** Jonathan. **Date:** 2026-06-18.
**Gate before:** G3 MOY/EOY benchmark blueprint locked (`specs/pssa_g3_benchmark_blueprint_moy_eoy.md`).
**Gate after:** merge + audit Phase 4A → *then* MOY passage authoring (NOT in this PR).

## 0. Scope guardrails (read first)

- **Do NOT author MOY/EOY passages or items.** This PR adds the *mechanism*; content comes later.
- **Do NOT rebuild scoring, delivery, or reporting.** Extend the existing modules named in §1.
- **Do NOT touch the distractorRole registry** (`mappingRegistry` in `lib/content/pssaInsightMapping.ts`). It is referenced by reporting but not modified here.
- **STOP and report** if separating analytics-only cleanly turns out to require a broad scoring/result-system redesign rather than the additive changes below. Do not force it.
- Additive migration only — no destructive column changes, no backfill that rewrites existing rows' meaning.

## 1. Inventory (verified at source — extend these, do not replace)

| Concern | Location | Current behavior |
|---|---|---|
| Per-item scoring engine | `lib/content/pssaScoring.ts` → `scorePssaItem(item, response)` | Stateless, per-item, returns `{status, pointsEarned, maxPoints, detail}`. **No change.** |
| Per-answer scoring | `lib/content/pssaFormSession.ts` → `answerPssaSessionItem` (~L206-254) | Already scores every item identically and stores `pointsEarned/maxPoints/scoreStatus` per `PssaFormResponse`. **No change** (analytics items already score here). |
| **Submit aggregation (split point)** | `lib/content/pssaFormSession.ts` → `submitPssaSession` (~L267-286) | Sums `earnedPoints`/`pendingHumanPoints` over **all** responses; `totalPoints` = sum of **all** item `pointValue`. **CHANGE: split operational vs analytics_only.** |
| Session totals storage | `prisma` `PssaFormSession` (L893) | Has `totalPoints/earnedPoints/pendingHumanPoints`. **ADD analytics counterparts.** |
| Form item membership | `prisma` `PssaFormItem` (L870) | `slotType/pointValue/position…`. **ADD `scoringBucket`.** |
| Content hash | `scripts/content/lib/pssa-form-assembly.ts` → `buildCanonical` (~L274) + `computePssaFormContentHash` | Canonical item map omits bucket. **ADD bucket to canonical, default omitted.** |
| Student DTO | `lib/content/pssaStudentDto.ts` → `projectPssaStudentItem` + `PSSA_STUDENT_DTO_BANNED_KEYS` | Allowlist projection (only `interactionType/interactionSubtype/pointValue/responseSpec`). Bucket can't leak through projection. **ADD `scoringBucket` to banned-keys as defense-in-depth.** |
| Student report + **readiness band** | `lib/content/pssaStudentReport.ts` → `buildStudentReport`, `bandFor`, `sumEarnedPoints` | `bandFor(earnedPoints, maxPoints, …)` **IS** the readiness band (Strong/Developing/Needs support/Incomplete). Currently sums **all** responses. **CHANGE: band/score/clusters use operational only; add separate analytics block.** |
| Class report loader | `lib/content/pssaClassReportServerLoader.ts` → `loadPssaClassReportForTeacher` | Reads `session.earnedPoints/totalPoints` + per-response `pointsEarned`. After the submit change these become operational-only automatically; **add analytics aggregate, exclude analytics from operational rows.** |
| distractorRole registry (WS3-A) | `lib/content/pssaInsightMapping.ts` → `mappingRegistry`, `mapDistractor`, `roleFamilyOf`, `MAPPING_VERSION="pssa-ws3a-insight-mapping-v1"` | The authoritative role→action map. **No change in 4A.** (MOY authoring prerequisite — see §10.) |

Confirmed: no `lib/growth.ts` / `classGrowth.ts` / `standardsGrowth.ts` code reads `PssaFormSession.earnedPoints` (those are legacy TestSession growth). PSSA-form readiness is contained in `pssaStudentReport.bandFor`.

## 2. Schema change (additive migration)

Migration dir: `prisma/migrations/20260618120000_add_pssa_form_scoring_bucket/` (follow the `YYYYMMDDHHMMSS_` pattern).

**2.1 New enum** (near the other PSSA enums, schema L136-160):

```prisma
enum PssaScoringBucket {
  operational
  analytics_only
}
```

**2.2 `PssaFormItem` — add bucket (default operational):**

```prisma
model PssaFormItem {
  // … existing fields unchanged …
  scoringBucket PssaScoringBucket @default(operational)
}
```

`@default(operational)` makes the migration safe for every existing BOY/foundation form row (they become explicitly `operational`).

**2.3 `PssaFormSession` — add analytics counterparts (nullable):**

```prisma
model PssaFormSession {
  // … existing totalPoints/earnedPoints/pendingHumanPoints stay = OPERATIONAL …
  analyticsTotalPoints        Int?
  analyticsEarnedPoints       Int?
  analyticsPendingHumanPoints Int?
}
```

**Semantic note (document in the migration + PR description):** the existing `totalPoints/earnedPoints/pendingHumanPoints` now mean **operational only**. This is behavior-preserving for every existing form because BOY/foundation have **zero** analytics-only items (operational = all items). New analytics columns are nullable; treat `null` as `0` in readers.

## 3. Student delivery (no exposure)

- Deliver both buckets in normal position order; the student experience is identical.
- `scoringBucket` must **not** appear in any student-facing DTO. The allowlist projection already prevents it; additionally add `"scoringBucket"` to `PSSA_STUDENT_DTO_BANNED_KEYS` so `assertNoBannedKeys` fails loudly if a future change tries to pass it through.
- Section review, completion checks, and progress treat analytics-only items exactly like operational items (no visual marker, no separate count, no "this won't be scored" hint).

## 4. Scoring (split aggregation — `submitPssaSession`)

Replace the single accumulation loop (~L267-286) with a bucket-aware split. Join each `response.formItemId` → its `PssaFormItem.scoringBucket` (already loaded via `session.form.items`).

```ts
let earnedPoints = 0, pendingHumanPoints = 0;                 // OPERATIONAL
let analyticsEarnedPoints = 0, analyticsPendingHumanPoints = 0;
for (const response of session.responses) {
  const formItem = session.form.items.find(i => i.id === response.formItemId);
  if (!formItem) throw new PssaSessionError(409, "response_form_item_missing");
  if (response.maxPoints !== formItem.pointValue) throw new PssaSessionError(409, "response_point_snapshot_mismatch");
  const isOp = formItem.scoringBucket === "operational";
  if (response.scoreStatus === "pending_human_scoring") {
    if (isOp) pendingHumanPoints += response.maxPoints; else analyticsPendingHumanPoints += response.maxPoints;
  } else if (response.scoreStatus === "scored") {
    if (isOp) earnedPoints += response.pointsEarned ?? 0; else analyticsEarnedPoints += response.pointsEarned ?? 0;
  }
}
const totalPoints          = session.form.items.filter(i => i.scoringBucket === "operational").reduce((s, i) => s + i.pointValue, 0);
const analyticsTotalPoints = session.form.items.filter(i => i.scoringBucket === "analytics_only").reduce((s, i) => s + i.pointValue, 0);
```

Persist all six fields on the session. **Use the existing per-item scores** — no second scoring pass, no new engine. The only change is *which accumulator* each already-computed `pointsEarned` lands in.

`sessionStateDto` (~L585) should surface the analytics totals alongside the operational ones (post-submit only), clearly named (`analyticsTotalPoints`, `analyticsEarnedPoints`, `analyticsPendingHumanPoints`).

## 5. Teacher reporting (separate, clearly-labeled)

**5.1 Student report (`pssaStudentReport.ts`):**

- The operational score, `bandFor(...)`, and the cluster results must be computed from **operational responses only**. Thread `scoringBucket` onto `PssaReportItem`/`PssaReportResponse` (it's already loaded form-side) and filter to operational before `sumEarnedPoints` / band / clustering.
- Add a separate **`additionalAnalyticsItems`** block to `PssaStudentReport`: `{ earnedPoints, possiblePoints, pendingHumanPoints, percent, byItem[], byEc[] }`. Reuse the existing per-item/per-EC shaping; do not invent a parallel reporting pipeline.
- The block must be explicitly labeled (copy: **"Additional Analytics Items — did not affect the diagnostic score"**).
- Bump `REPORT_VERSION` (e.g. `pssa-ws3b-student-report-v1` → `…-v2`) since the payload shape changes.

**5.2 Class report (`pssaClassReportServerLoader.ts` + `app/api/teacher/pssa/class-report/route.ts` + `app/teacher/pssa/insights/page.tsx`):**

- Operational aggregates (the headline score, distractorRole/EC analysis feeding Diagnostic Insights) exclude analytics-only responses.
- Add an "Additional Analytics Items" section showing earned/possible, percent, by-item and by-EC, and item type where the existing report surfaces it. Labeled as not affecting the diagnostic score.
- distractorRole mapping continues to use `mapDistractor`/`mappingRegistry` unchanged; analytics items that carry a registry role may appear in the analytics section's by-EC view but never in the operational misconception map.

**Readiness/growth:** any current or future readiness computation must read the **operational** score/band only. Since `bandFor` is now fed operational responses, this holds by construction. Add the test in §7 to lock it.

## 6. Backward compatibility (must stay green)

- BOY form: still 35 items / **45 operational points**, `analyticsTotalPoints = 0`, analytics block empty. Byte-identical operational behavior.
- Existing operational-only forms and already-submitted sessions behave exactly as before (analytics columns null → treated as 0).
- Foundation scoring and foundation/legacy reports are untouched.
- All existing PSSA tests (PR-C scoring, PR-D2 delivery, section-gating, class-report loader, WS3-A/WS3-B) stay green with no assertion changes except the intentional `REPORT_VERSION` bump.

## 7. Content hash (form identity)

In `buildCanonical` (`pssa-form-assembly.ts` ~L290), add `scoringBucket` to each canonical item **only when it is `analytics_only`**, so the default (`operational`/missing) is canonical and omitted:

```ts
items: items.map(({ /*…*/ scoringBucket }) => ({
  position, itemId, slotType, pointValue, passageId,
  ...(sectionIndex ? { sectionIndex } : {}),
  ...(passageUnitId ? { passageUnitId } : {}),
  ...(scoringBucket === "analytics_only" ? { scoringBucket } : {}),
  approvedContentHashSnapshot,
})),
```

Consequences (assert in tests):
- A purely-operational form produces a **byte-identical** canonical → **same `contentHash`** as before (BOY/foundation hashes preserved).
- A form containing any analytics-only item has a different canonical → different hash.
- Two forms identical except one item's bucket assignment produce **different** hashes (form identity reflects scoring role).

The assembly path must thread `scoringBucket` from the blueprint/selection into `SelectedFormItem` so `buildCanonical` and the DB write (`assemble-pssa-form.ts`) persist it on `PssaFormItem`. Default `operational` when the selection doesn't specify (keeps BOY assembly identical).

## 8. Tests (all required; extend existing harnesses)

1. Analytics-only **MCQ / EBSR / TE** score correctly via the existing engine (reuse `scorePssaItem` fixtures).
2. Their points appear in `analyticsEarnedPoints` / the report's analytics block.
3. Their points do **not** change operational `earnedPoints`/`totalPoints` or the operational percent.
4. **Readiness/band ignores analytics:** `bandFor` + cluster results are identical whether or not analytics-only responses are present (operational responses held fixed).
5. Student DTO does **not** expose `scoringBucket` (`assertNoBannedKeys` passes; explicit assertion that the key is absent).
6. Teacher student-report DTO **does** expose the separate `additionalAnalyticsItems` block; class report exposes the analytics section.
7. **BOY regression:** a BOY-shaped fixture stays **35 items / 45 operational points**, `analyticsTotalPoints = 0`, analytics block empty, and its `contentHash` is unchanged from pre-migration.
8. **MOY-shaped fixture:** 40 delivered items, **45 operational points**, **8 separate analytics points**; operational band computed on the 35; analytics block reports 8 possible.
9. **Hash identity:** changing only one item's `scoringBucket` (operational ↔ analytics_only) changes the form `contentHash`; an all-operational form's hash equals the pre-change hash.
10. Existing operational-only tests stay green (run PR-C scoring, PR-D2 delivery, section-gated delivery, class-report loader, WS3-A insight mapping, WS3-B student report; plus the voice-invariant gates if `StudentPracticeSession.tsx` is touched — it should not be).

## 9. Out of scope (do not do here)

- MOY/EOY passage or item authoring (next chapter).
- Any change to `pssaScoring.ts` scoring logic, the delivery/section-gating flow, or the distractorRole registry.
- New readiness cut scores or growth/equating (still deferred — no official PSSA labels).
- Student-facing surfacing of analytics results.

## 10. distractorRole registry — MOY prerequisite (note, not a 4A task)

Before MOY **authoring** begins, confirm the live registry API: it is `mappingRegistry` (keys = valid `distractorRole` values) with `mapDistractor`/`roleFamilyOf` in `lib/content/pssaInsightMapping.ts`, version `pssa-ws3a-insight-mapping-v1`. Every authored distractor's `distractorRole` must be a key in `mappingRegistry`, or the class report throws (`mapDistractor`). Phase 4A does not modify this; it only consumes it for the analytics-section by-EC view. See `specs/pssa_g3_benchmark_blueprint_moy_eoy.md` §6.2.

## 11. Process

Spec → ChatGPT Pro review → Codex runs on the real Mac repo → independent audit (verify the six session fields, hash preservation on BOY, operational/analytics isolation in band math, student-DTO non-exposure) → merge. Commit from terminal (`rm -f .git/index.lock` first if needed).
