# PSSA Diagnostic Insights — WS2-R2: Teacher Diagnostic Insights panel (UI)
## Render the ClassReport (WS2-R1) in the teacher dashboard — the engine made visible

> Tracked spec. Commit to `specs/pssa-ws2r2-insights-panel.md`.
> Builds on WS2-R1 (`GET /api/teacher/pssa/class-report`) + WS3 engine, all on main.
> **First UI slice.** Presentational only — the panel **renders** a `ClassReport`; it performs **NO aggregation, scoring, or report logic** (all of that lives in the engine + WS2-R1). No scoring/schema/engine/data changes.
> **Visual contract = the locked mockup's Reports view** (`specs/mockups/sylearning-dashboard-mockup.html`, "Teacher · Reports"). Depends on WS2.0 committing that mockup.

## Goal
A teacher opens **Diagnostic Insights** for a class + benchmark and sees: a readiness overview, skill-cluster bars (with evidence/coverage context), a misconception map, and suggested small groups — all rendered from the `ClassReport` JSON, matching the mockup. This is the destination the Test Prep PA button (WS2.5) will point at.

## Reuse (verified at source)
- **Auth/layout:** `SynesisPageShell roles={["TEACHER"]}` (as in `app/teacher/literacy/...`).
- **Data:** `GET /api/teacher/pssa/class-report?classRoomId=&formId=` (WS2-R1) → `ClassReport`.
- **Class list** for the selector: the existing teacher classes source (`app/api/teacher/classes`), reused — do not rebuild roster logic.
- **Visual:** the locked mockup's Reports view + brand styling (orange = State Track).

## ClassReport fields the UI renders (verified exact names — read the types, don't guess)
```
ClassReport: benchmarkSeason, formId, formVersion?, assignedStudents, completedStudents, incompleteStudents,
  scoreStatusCounts { final, provisional, incomplete }, medianOperationalScore (number|null),
  bandDistribution: Record<"Strong"|"Developing"|"Needs support"|"Incomplete", number>,
  clusterResults: ClassClusterResult[], topPriorityCluster, topClassInsight (string|null),
  misconceptionMap: ClassMisconceptionMapEntry[], suggestedGroups: SuggestedClassGroup[], + versions.
ClassClusterResult: cluster, completedStudents, usableStudents, studentsNeedingSupport, classPercent (number|null), signal, limitedEvidence (boolean).
ClassMisconceptionMapEntry: cluster, roleFamily, classLabel, studentsAffected, sharePct, totalResponses, studentIds, interpretation, recommendedAction, recommendedSkill?.
SuggestedClassGroup: groupId, label, cluster, roleFamily, classLabel, studentIds, recommendedAction, recommendedSkill?.
ClassMisconceptionLabel: high_priority_class_trend | class_trend | small_group_opportunity | below_threshold.
```

## Scope (only these)
1. **NEW page** `app/teacher/pssa/insights/page.tsx`: `SynesisPageShell roles={["TEACHER"]}`; renders the client container.
2. **NEW client** `components/pssa/TeacherPssaInsightsClient.tsx`: reads query params, loads classes (reuse the classes source), fetches WS2-R1, handles loading / error / empty states + the class/form selector.
3. **NEW presentational panel** `components/pssa/TeacherPssaInsightsPanel.tsx`: props `{ report: ClassReport }`; renders the sections below. Pure rendering — no fetch, no aggregation.
4. (Optional) small subcomponents (cluster bar, misconception row, group card) in `components/pssa/`.

**DO NOT TOUCH:** the WS3 engine modules, WS2-R1 route/loader, `pssaScoring.ts`, prisma schema, item content, the existing `TeacherDashboardPage` internals (mount as a standalone page for now; the full tab integration is WS2.1–2.4).

## Implementation constraints (read before building)
- **Import the real `ClassReport` type from the WS3-C module — type-only:** `import type { ClassReport } from "@/lib/content/pssaClassReport";`. Do NOT hand-roll a parallel interface, and do NOT runtime-import `pssaClassReport` (or any engine function) into client components — the browser bundle must not pull in data-layer code. Use the exact verified field names; **if the type's fields differ from this spec, STOP and report** — don't guess.
- **Shell / client / panel split:**
  - `app/teacher/pssa/insights/page.tsx` — `SynesisPageShell roles={["TEACHER"]}`, renders the client container.
  - `components/pssa/TeacherPssaInsightsClient.tsx` — reads query params, loads classes, fetches WS2-R1, handles loading/error/empty.
  - `components/pssa/TeacherPssaInsightsPanel.tsx` — pure presentational, props `{ report: ClassReport }`, no fetch, no aggregation.
- **Form selection:** class selector reuses `app/api/teacher/classes`. For the form: prefer `formId` from the URL query; use an existing PSSA form source if one already exists; **do NOT create a new form-catalog endpoint**. If none exists, show a friendly "Choose a benchmark / missing formId" state, or default only to an existing fall/BOY form constant if present.
- **Fetch hygiene:** fetch WS2-R1 only when `classRoomId` AND `formId` exist; `cache: "no-store"`; do NOT store report JSON in localStorage/sessionStorage; do NOT `console.log` full report payloads; ignore/abort stale fetches when selectors change.
- **No raw `studentIds`:** show student **counts** only. Student names are out of scope for WS2-R2 (require a roster display-name sidecar — a later safe WS2-R1 join or WS3-D).
- **Labels vs interpretations:** the UI MAY format enum labels for badges (e.g. `high_priority_class_trend` → "High-priority class trend"). It MUST render `interpretation`, `recommendedAction`, and `topClassInsight` **verbatim** — no UI-authored misconception copy.
- **Assign affordance:** disabled / `aria-disabled`; calls no route; mutates no state; labeled "Assign — coming soon" (WS3-D wires it later).
- **Accessibility:** don't rely on color alone for bands/signals; bars need text + `aria-label`; "Limited evidence" must be visible as text, not just muted color; disabled controls keyboard-safe.

## Sections to render (match the mockup's Reports view)
1. **Header:** "Diagnostic Insights — {benchmarkSeason} PSSA Benchmark · Grade 3 ELA". Subtitle: scores are teacher-facing; students never see a score. **Disclaimer (always visible):** "Readiness bands are Sý Learning practice levels, not official PSSA proficiency labels."
2. **Readiness overview:** `completedStudents` / `assignedStudents` completed; `medianOperationalScore` / 45 (show "—" if null); **band pills** from `bandDistribution` (Strong / Developing / Needs support / Incomplete) — they reconcile by construction. If `scoreStatusCounts.provisional > 0`, show a small "N provisional (awaiting hand-scoring)" note.
3. **Skill clusters:** one bar per `clusterResults` entry — cluster name, `classPercent` (or "—" when null), **evidence/coverage context** from the report's own fields ("{usableStudents} of {completedStudents} measurable", `studentsNeedingSupport`). **Do NOT invent item counts** — render only the coverage fields the `ClassReport` exposes. **If `limitedEvidence` is true, render it as "Limited evidence" (muted, no confident bar, visible in text) — never a strong/needs-support verdict, never `topPriorityCluster`.**
4. **Misconception map:** rows from `misconceptionMap` where `classLabel !== "below_threshold"` — render `interpretation` (verbatim, hedged — do NOT rewrite), `studentsAffected` + `sharePct`, a **label badge** (high_priority_class_trend / class_trend / small_group_opportunity), and `recommendedAction`. Sorted as the engine returns them.
5. **Suggested groups:** cards from `suggestedGroups` — `label`, student count (`studentIds.length`), the `cluster`/`roleFamily` "why", `recommendedAction`. Include an **"Assign" affordance that is visibly inert / "coming soon"** (the real assign action is WS3-D — do NOT wire it here).
6. **Top insight:** if `topClassInsight` is non-null, show it as a one-line headline near the top.

## Honesty in the UI (non-negotiable)
- Render the engine's **hedged strings verbatim** (`interpretation`, `recommendedAction`, `topClassInsight`). The UI must NOT author its own misconception/interpretation copy.
- Show **evidence/coverage context** on every cluster (the report's `usableStudents`/`completedStudents`/`studentsNeedingSupport` — never invented item counts); `limitedEvidence` → muted "Limited evidence", never a confident percentage verdict.
- Bands use our labels only (never Below Basic/Basic/Proficient/Advanced); disclaimer always present.
- No timing/guessing language anywhere.
- The panel computes nothing — it only displays `ClassReport` fields.

## States
- **Loading:** skeleton/spinner.
- **Empty / nobody completed** (`completedStudents === 0`): "No students have completed this benchmark yet." (don't render empty bars/maps).
- **Section-level empties (valid but quiet data):** no actionable misconceptions → "Not enough repeated patterns yet."; empty `suggestedGroups` → "No suggested groups yet."; `topClassInsight` null → don't render the top-insight card.
- **Error / not authorized:** friendly message; 403 → "You don't have access to this class."
- **No `classRoomId` selected:** "Choose a class."
- **No `formId` selected / no form source:** "Choose a benchmark" (do not invent a form catalog).
- Fetch WS2-R1 only when `classRoomId` AND `formId` are **both** present.

## Acceptance criteria
1. Page is `TEACHER`-gated via `SynesisPageShell`; fetches WS2-R1; renders the panel on 200.
2. Panel renders all six sections from the **exact** `ClassReport` field names (no guessed keys).
3. `limitedEvidence` clusters render as "Limited evidence" (muted), never a confident verdict, and aren't shown as priority.
4. Band pills come from `bandDistribution`; the disclaimer ("not official PSSA labels") is always visible; provisional note shown when `scoreStatusCounts.provisional > 0`.
5. Misconception/interpretation/action/topClassInsight strings are rendered **verbatim** from the report — the UI authors no misconception copy.
6. Suggested-group "Assign" is inert/"coming soon" (no WS3-D wiring).
7. Empty (`completedStudents === 0`), loading, and error/403 states handled.
8. The panel does **no** aggregation/scoring/data logic; no engine/WS2-R1/scoring/schema/content changes.
9. `npx tsc --noEmit`; build passes; PSSA suite green; no schema/migration diff.

## Tests
- Component render test with a **synthetic `ClassReport` fixture** (only if the repo has a component-test pattern; else manual/source proof in the stop report — do NOT invent a test framework): all sections render; a `limitedEvidence` cluster shows "Limited evidence"; a `below_threshold` misconception is omitted; empty-state when `completedStudents === 0`.
- `npx tsc --noEmit`; `OPENAI_API_KEY=sk-build-dummy npm run build`; PSSA suite green.

## STOP and report if
- the spec file is missing;
- the mockup file (`specs/mockups/sylearning-dashboard-mockup.html`) is missing;
- the real `ClassReport` type's fields differ from this spec;
- no existing form selection/source exists and implementing one would require a new endpoint;
- rendering student names would require adding data to WS2-R1;
- any aggregation/scoring/interpretation logic appears necessary in the UI.

## Stop report
branch; commit SHA; files changed (confirm: new page + client + panel (+ subcomponents) only; no engine/WS2-R1/scoring/schema/content change); proof the UI **imports the real `ClassReport` type** (not a hand-rolled interface); section-by-section render proof against real fields; limited-evidence rendering proof (text, not color-only); verbatim-strings proof (no UI-authored interpretation); bands + disclaimer + provisional-note proof; **proof no raw `studentIds` rendered**; **proof no report JSON persisted/logged**; **proof fetch uses `no-store`**; inert-Assign proof; **proof no form-catalog endpoint invented**; empty/section-empty/loading/error states proof; a11y (no color-only) note; tsc + build + PSSA suite results; mockup-fidelity note (which mockup view it matches).