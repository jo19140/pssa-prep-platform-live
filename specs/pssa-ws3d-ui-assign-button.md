Here's the complete WS3-D-UI hand-off. Save the spec to `specs/pssa-ws3d-ui-assign-button.md`, then paste this to Codex:

```text
Implement WS3-D-UI: wire the Insights panel "Assign" button to the existing assign-from-report route.
Single source of truth = specs/pssa-ws3d-ui-assign-button.md. Read it fully first. If missing, STOP and report.

Builds on WS2-R2 (panel/client), WS3-D (assign route + assembleBridgeLessons helper), WS3-D-pre (bridge), all on main.

This is a thin GET route + UI wiring. Reuse audited helpers:
- NO new analytics / scoring / engine / report logic
- NO bridge / assign-route / schema / migration changes

BRANCH: feat/pssa-ws3d-ui-assign-button

SCOPE — only these:
1. NEW app/api/teacher/pssa/lesson-suggestions/route.ts (GET): given classRoomId+formId(+benchmarkSeason), reuse loadPssaClassReportForTeacher (report) + assembleBridgeLessons (from lib/content/pssaAssignRecommendedLesson.ts) + suggestLessonsForReport (bridge) -> per-group candidate lessons. Thin glue. Auth/ownership like the other PSSA routes (401/403/404). Cache-Control: no-store.
   Response: { benchmarkSeason, formId, groups: [{ groupId, candidates: [{ lessonId, title, skill }] }], auditWarnings? }
2. components/pssa/TeacherPssaInsightsClient.tsx: owns ALL network — fetch report, fetch suggestions, POST assign. Pass suggestions (keyed by groupId) + an onAssign handler down to the panel.
3. components/pssa/TeacherPssaInsightsPanel.tsx: presentational only. Per group, show "Recommended: {title}"; the Assign button opens an inline form (lesson select default=top candidate; required due-date input YYYY-MM-DD) -> calls onAssign({ groupId, lessonId, dueDate, studentProfileIds: group.studentIds }). NO fetch/POST in the panel.

DO NOT TOUCH: the bridge, the assign route, the report engine, scoring, prisma schema, migrations, the WS3 engine modules.

KEY CONSTRAINTS:
- Reuse assembleBridgeLessons from lib/content/pssaAssignRecommendedLesson.ts (it is already a shared helper). Reuse loadPssaClassReportForTeacher + suggestLessonsForReport. NEVER import one Next route handler from another.
- maxPerGroup: do NOT hard-code a separate value. Omit it (use the bridge default) in the suggestions route so the candidates match exactly what the assign route validates against. If parity would require changing the assign route or bridge, STOP and report.
- Read the ACTUAL assign-route response shape { ok, lessonId, dueDate, results: [{ studentProfileId, outcome: "created" | "updated" }] } and adapt the UI to it. If it differs materially, STOP and report — do not invent a parallel shape.
- The CLIENT performs POST /api/teacher/pssa/assign-recommended-lesson with { classRoomId, formId, benchmarkSeason, groupId, lessonId, studentProfileIds, dueDate }.

UX / STATES:
- Whole-group assignment in v1 (group.studentIds); no add/remove students. Show "{n} students".
- Teacher confirms lesson + due date before any write (no auto-assign).
- Success: "Assigned to N students — X new, Y updated, due {date}".
- 409 stale_report_group / stale_or_invalid_lesson_candidate -> "This report changed — refresh and try again." 400/403 -> friendly message.
- Group with no candidate -> "No eligible lesson yet", Assign disabled.
- If suggestions fetch fails but the report fetch succeeds -> still render the report; affected groups show "Lesson suggestions unavailable — refresh and try again", Assign disabled.

PRIVACY:
- Raw studentProfileIds may be held in client memory and POSTed to the authorized assign route, but NEVER displayed, logged, or persisted client-side.
- Do NOT render raw auditWarnings to teachers (at most a generic "Some suggestions may be unavailable"); do not console.log warnings containing lesson IDs / internals.
- no-store on the suggestions route; no report/suggestion JSON persisted client-side.

ACCEPTANCE:
1. Suggestions route reuses loadPssaClassReportForTeacher + assembleBridgeLessons + suggestLessonsForReport (no re-implemented bridge/report logic; no route-from-route import); auth 401/403/404; no-store.
2. maxPerGroup parity: every shown candidate is accepted by the assign route.
3. Client owns all network; panel is presentational via onAssign(...) (no fetch/POST in the panel).
4. Assign posts the correct payload (group.studentIds, selected lessonId, dueDate); success shows created/updated/due.
5. 409 stale -> refresh message; 400/403 -> friendly error; no raw IDs shown.
6. Group with no candidate -> "No eligible lesson yet", Assign disabled.
7. Whole-group only in v1 (no add/remove students).
8. Suggestions failure still renders the report; affected groups degrade gracefully.
9. Raw studentProfileIds never displayed/logged/persisted; auditWarnings not shown raw.
10. No bridge/assign-route/engine/scoring/schema change; suggestions route read-only.
11. npx tsc --noEmit; OPENAI_API_KEY=sk-build-dummy npm run build; PSSA suite green; no schema diff.

STOP and report if: the spec is missing; the assign-route response differs materially from the spec; maxPerGroup parity needs route/bridge changes; assembleBridgeLessons is not importable as a shared helper; any scoring/engine/bridge/schema change appears necessary.

STOP REPORT: branch + commit SHA; files changed (suggestions route + client + panel (+ test) only); proof the suggestions route reuses the existing helpers (no re-implemented logic, no route-from-route import); maxPerGroup-parity proof; client-owns-network/panel-onAssign proof; Assign-posts-correct-payload proof; success + 409-stale + no-candidate + suggestions-failure states proof; no-raw-studentIds + no-store proof; tsc + build + PSSA suite results.
```

When Codex returns the stop report, paste it here and I'll audit at source — the suggestions route reusing the helpers (no duplicated bridge logic / no route-from-route import), `maxPerGroup` parity, network confined to the client, the panel staying presentational, and no raw student IDs in the UI. That completes the **clickable** loop — then the live end-to-end test is the real next step.