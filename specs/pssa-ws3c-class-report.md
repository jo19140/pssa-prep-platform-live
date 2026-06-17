Implement WS3-C: PSSA class misconception map + small groups (teacher-facing data layer).
Single source of truth = specs/pssa-ws3c-class-report.md. Read it fully first.
If that spec file is missing, STOP and report. Do not invent it.

Builds on WS3-A (lib/content/pssaInsightMapping.ts) and WS3-B (lib/content/pssaStudentReport.ts), both on main.

PURE data/aggregation layer:
- NO report UI, NO student-facing output
- NO scoring changes, NO schema/migration/DTO changes
- NO item-bank/content changes, NO delivery/session instrumentation

BRANCH: feat/pssa-ws3c-class-report

SCOPE - only these:
1. NEW lib/content/pssaClassReport.ts exporting:
   - CLASS_REPORT_VERSION
   - pure buildClassReport(studentReports: StudentReportInput[], opts) -> ClassReport
   Renders nothing. Imports only from pssaStudentReport (WS3-B) + pssaInsightMapping (WS3-A) + types. No scoring, no Prisma.
2. NEW test file (synthetic cohorts only).
3. Commit the spec at specs/pssa-ws3c-class-report.md.

DO NOT TOUCH: pssaScoring.ts, pssaFormSession.ts, pssaStudentReport.ts, pssaInsightMapping.ts, student DTOs, prisma schema, migrations, item content, UI, delivery/session.

INPUT (IMPORTANT - PssaStudentReport has NO studentId):
type StudentReportInput = { studentId: string; report: PssaStudentReport };
buildClassReport(studentReports: StudentReportInput[], opts) -> ClassReport
- Do NOT add studentId to PssaStudentReport. Do NOT modify WS3-B.
- Use StudentReportInput.studentId for misconceptionMap.studentIds and suggestedGroups.studentIds.
- All inputs must share report.formId and report.benchmarkSeason; otherwise STOP/throw.

REAL WS3-B FIELDS (use these exact names - verified on main):
- report.scoreStatus ("final" | "provisional" | "incomplete")
- report.band
- report.earnedPoints (number|null) and report.maxPoints   // the operational score; there is NO operationalScore field
- report.clusterResults[]  (field is clusterResults, NOT clusters; each has cluster: PssaReportCluster, signal)
- report.priorityCluster
- report.likelyPatterns[]   (PssaStudentInsight: roleFamily, confidence, interpretation, teacherMove, recommendedSkill?, evidence[])
- report.missedReview[]      (itemId, cluster: PssaReportCluster, evidenceItemIds[])
Each PssaStudentInsight.evidence[] item has: itemId, roleFamily, distractorRole, clusterId.
WARNING: evidence.clusterId is a PASSAGE id, NOT one of the 4 report clusters - do NOT aggregate by it.

Fixed cluster order (used for all tie-breaks and group-assignment order):
1. Key Ideas & Evidence
2. Craft & Structure
3. Vocabulary
4. Conventions

CLUSTER-OF-A-PATTERN (taxonomy alignment):
To aggregate by the 4 report clusters used elsewhere:
- For each likelyPattern's evidence itemId, resolve its report cluster by joining to report.missedReview (itemId -> cluster: PssaReportCluster).
- Aggregate by (reportCluster, roleFamily). If a pattern's evidence spans multiple report clusters, split into one contribution per cluster.
- Every likelyPattern evidence itemId MUST resolve to a report cluster through report.missedReview. If any evidence itemId cannot be resolved, throw a clear error and fail the test. Do NOT silently skip unresolvable evidence.

DENOMINATOR (D1):
Completed = report.scoreStatus !== "incomplete".
Only completed students count toward median, cluster percentages, and misconception thresholds.
Band distribution counts completed students in Strong / Developing / "Needs support", and incomplete students only in the Incomplete bucket.
Also report scoreStatusCounts { final, provisional, incomplete } where completed = final + provisional.
medianOperationalScore = median of completed report.earnedPoints (null if none).

MISCONCEPTION MAP (D2):
Aggregate by (reportCluster, roleFamily). A student counts if that roleFamily appears in their likelyPatterns resolving to that report cluster.
Show studentsAffected, sharePct (of completed), totalResponses (sum evidence counts), studentIds (from wrapper).
Pull interpretation/recommendedAction/recommendedSkill from WS3-A; do not invent misconception logic.
classLabel - a family needs >=3 students for ANY actionable label; given >=3 take the highest applicable:
- >=33% and >=3 students -> high_priority_class_trend
- >=25% and >=3 students -> class_trend
- >=3 students -> small_group_opportunity
- else -> below_threshold (mapped, not grouped)
Sort map by studentsAffected desc, then fixed cluster order.

SUGGESTED GROUPS (D3 - priority need only):
Candidates = map entries >= small_group_opportunity.
A student joins a group IFF: group's cluster == student's report.priorityCluster AND that group's roleFamily is in the student's likelyPatterns for that cluster.
(No priorityRoleFamily field - derive from priorityCluster x likelyPatterns.)
- If fewer than 2 students qualify by priority need, SUPPRESS the group (keep the map entry).
Labels (D4, cosmetic; logic driven by cluster+roleFamily):
- Key Ideas & Evidence (evidence family) -> "Evidence Builders"
- Key Ideas & Evidence (main idea / too_narrow) -> "Main Idea Support"
- Vocabulary -> "Vocabulary in Context"
- Craft & Structure -> "Structure & Craft"
- Conventions -> "Conventions Check"
- fallback = cluster name.
Deterministic order: classLabel severity -> studentsAffected -> fixed cluster order.
To enforce at most one group per student: order candidate groups by that deterministic order, then assign each student to the FIRST qualifying group and exclude them from later groups (this resolves a student whose priorityCluster has two role families in likelyPatterns).

CLASS OVERVIEW:
assigned/completed/incomplete + scoreStatusCounts; medianOperationalScore; bandDistribution { Strong, Developing, "Needs support", Incomplete };
per-cluster ClassClusterResult (classPercent aggregate of completed students' cluster points/counts, studentsNeedingSupport, signal); a class-limited cluster -> limited_evidence and never topPriorityCluster / never a class verdict;
topPriorityCluster (lowest non-limited); topClassInsight (one hedged headline; null if nothing reaches threshold).

MEASUREMENT HONESTY:
All percentages over completed students with counts shown. Never "the class cannot/believes/definitely/guessed"; never official PSSA labels; no timing/guessing. Reuse a banned-phrase lint over GENERATED class-report text (not just static strings).

TRACEABILITY: benchmarkSeason, formId, formVersion (if available), MAPPING_VERSION, REPORT_VERSION, CLASS_REPORT_VERSION.
DETERMINISM: same set of inputs + versions -> identical output.

ACCEPTANCE (synthetic cohorts only; never commit real student data):
1. Input is StudentReportInput[]; studentIds come from the wrapper; PssaStudentReport unmodified.
2. Mixed formId/benchmarkSeason -> throws.
3. Median/cluster%/misconception thresholds use completed only; band distribution puts completed in Strong/Developing/Needs support and incomplete only in Incomplete; scoreStatusCounts reported; median uses earnedPoints.
4. Map aggregated by (reportCluster, roleFamily) via missedReview join (NOT evidence.clusterId); unresolvable evidence item throws and is covered by a test.
5. >=3 students for any actionable label; %-labels also require >=3; below-threshold mapped not grouped.
6. Group membership = priorityCluster == group cluster AND roleFamily in likelyPatterns; at most one group per student (first qualifying in deterministic order); <2 priority-need members -> group suppressed, map entry kept.
7. Limited-evidence clusters never topPriorityCluster / never a class verdict.
8. topClassInsight hedged; null when nothing reaches threshold.
9. Patterns/labels from WS3-A; no new misconception logic.
10. Banned-phrase lint over generated class-report text passes.
11. Deterministic; traceability stamp present.
12. No student-facing output; no scoring/schema/DTO/UI/content change.
13. Tests synthetic-only.

RUN: npx tsc --noEmit; test:pssa-content; test:pssa-db6; test:pssa-pr-b; confirm no schema/migration diff.

STOP and report if: spec missing, inputs span multiple forms, any evidence item can't be clustered through missedReview, or any scoring/schema/DTO/UI/content change appears necessary.

STOP REPORT: branch + commit SHA; files changed (new class-report module + tests + spec only); wrapper-input/studentId proof; mixed-form throws proof; completed-vs-incomplete + scoreStatusCounts + band-distribution proof; cluster-join-via-missedReview proof + unresolvable-throws test; threshold->classLabel proof (3 / 25% / 33% + min-3 guard); group-from-priority + first-qualifying assignment + <2 suppression + <=1-group-per-student proof; limited-evidence-never-priority proof; all-correct empty-map proof; banned-phrase lint over generated text; determinism + traceability; tsc + PSSA suite results; synthetic-only confirmation.
