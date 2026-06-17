Here's the complete WS3-D-pre bridge prompt. First save the spec to `specs/pssa-lesson-bridge.md`, then paste:

```text
Implement WS3-D-pre: the PSSA Skill→Lesson Bridge (pure suggester).
Single source of truth = specs/pssa-lesson-bridge.md. Read it fully first. If missing, STOP and report.

Builds on WS3-C (ClassReport) + WS3-A (RoleFamily) + the merged lesson metadata (pssaBridgeTags). Prerequisite for WS3-D (assign-from-report) — do NOT build assignment here.

PURE data/logic layer:
- NO assignment, NO lesson content
- NO DB/Prisma/seed import
- NO scoring/report/schema/UI changes

BRANCH: feat/pssa-lesson-bridge

SCOPE — only these:
1. NEW lib/content/pssaLessonBridge.ts exporting:
   - BRIDGE_VERSION
   - the cluster->top-tag map, the roleFamily->preferred-tags map, the conventions-family guard
   - suggestLessonsForReport(report: ClassReport, lessons: BridgeLesson[], opts?) -> { perGroup, perCluster, auditWarnings, bridgeVersion }
   Type-only imports of ClassReport / PssaReportCluster / RoleFamily. No runtime engine/DB import.
2. NEW test (synthetic ClassReport + synthetic BridgeLesson[]).
3. Commit the spec at specs/pssa-lesson-bridge.md.

DO NOT TOUCH: WS3 engine modules, prisma schema, scoring, item content, UI, the lesson library.

INPUT SHAPES (exact):
BridgeLesson = { lessonId, title, skill, gradeLevel, standardCode, standardCodes[], pssaBridgeTags[], reviewStatus }.
LessonCandidate = { lessonId, title, skill, standardCodes[], matchBasis[], score }.
The bridge consumes PRE-ASSEMBLED BridgeLesson[] (the caller joins seed tags x DB id/approval; the bridge does NOT do that join).
report.suggestedGroups[] carry: groupId, cluster (PssaReportCluster), roleFamily, classLabel, studentIds, recommendedAction, recommendedSkill?.

ELIGIBILITY (resolve top tag against ALL 7 top-level tags):
Intersect pssaBridgeTags with {key_ideas_evidence, craft_structure, vocabulary, conventions, writing_tda, foundational_support, exclude_from_grade3_bridge}.
- intersection size !== 1 -> exclude + auditWarnings entry ("missing pssaBridgeTags" / "multiple top-level bridge tags").
- top tag in {writing_tda, foundational_support, exclude_from_grade3_bridge} -> exclude, never suggest (no warning; intentional).
- reviewStatus not approved -> exclude + auditWarnings entry ("unapproved").
- Suggestable iff resolved top tag in the 4 clusters AND approved.
NEVER guess a cluster from skill/domain/standardCode.

CLUSTER GATE: a group only gets lessons whose top tag == its cluster's top tag. 1:1 map:
Key Ideas & Evidence->key_ideas_evidence, Craft & Structure->craft_structure, Vocabulary->vocabulary, Conventions->conventions. Never cross clusters.

RANKING (deterministic):
score = roleTagOverlap*100 + skillTitleMatch*25 + standardCodeOverlap*10 + clusterFallback*1
- roleTagOverlap: count of the group's roleFamily preferred tags present in lesson.pssaBridgeTags (primary signal)
- skillTitleMatch: roleFamily/recommendedSkill matched to lesson.skill/title
- standardCodeOverlap: overlapping standardCodes (supporting only)
Default (allowClusterFallback false): a candidate needs score>0 from role/skill/standard match. If a group has NO match -> empty candidates + a note. Do NOT return generic cluster lessons by default.
opts.allowClusterFallback (default false): when true, cluster-gated lessons with no other signal may be returned with matchBasis ["cluster_fallback"] and the clusterFallback score term.
Sort: score desc -> roleTagOverlap desc -> skillTitleMatch desc -> standardCodeOverlap desc -> lesson.skill alphabetical -> lessonId. Cap maxPerGroup (default 3). Each candidate records matchBasis.

roleFamily -> preferred tags (reading):
  unsupported_inference -> [inference, text_evidence, prove_answer, unsupported_inference]
  wrong_section -> [text_evidence, cite_evidence, prove_answer]
  plausible_misreading -> [text_evidence, inference, prove_answer]
  opposite_claim -> [inference, key_details]
  too_narrow -> [main_idea, central_idea, key_details]
  wrong_emphasis -> [main_idea, key_details]
Conventions guard: map only conventions families that have an eligible grade-3 lesson:
  comma-related -> commas, punctuation, series_commas (Commas in a Series)
  capitalization-related -> capitalization, titles (Capitalization and Titles)
  sentence-formation-related -> sentence_formation, complete_sentences (Complete Sentences)
A conventions family that maps to an excluded/absent skill (e.g. pronoun_shift, formal style, subject-verb agreement with no eligible lesson) -> no direct match (empty + note unless allowClusterFallback). Do NOT recommend Complete Sentences for a pronoun-shift issue.
For Craft & Structure / Vocabulary (coarser families): rank by recommendedSkill/skill/title + standardCodes within the cluster.

perCluster: generate ONLY for clusters with actionable misconceptionMap entries (classLabel != below_threshold) or report.topPriorityCluster. NEVER for all-strong / below_threshold-only clusters.

ACCEPTANCE (synthetic only) — behavior anchors as explicit tests:
1. unsupported_inference group -> top two include Inference and Text Evidence (Inference may rank first via the exact unsupported_inference tag).
2. wrong_section group -> Text Evidence ranks first.
3. too_narrow group -> Main Idea top.
4. text-features group -> Text Features; point-of-view -> Point of View; vocabulary-in-context -> Context Clues; nonliteral-language -> Connotation and Figurative Language matched via nonliteral_language (no connotation tag exists).
5. Conventions group -> only Capitalization and Titles, Commas in a Series, Complete Sentences.
6. excluded-tag lessons (Short/Long Vowel Patterns, Opinion Reasons, Paragraph Organization, TDA Evidence and Explanation, Pronoun Agreement and Shifts, Formal and Informal Style) -> NEVER suggested.
7. untagged / multi-top-tag / unapproved lessons -> excluded AND surface an auditWarnings entry.
8. conventions guard: pronoun_shift family -> no direct match (no Complete Sentences unless allowClusterFallback).
9. allowClusterFallback false -> no-match group returns empty+note; true -> cluster lessons with matchBasis cluster_fallback.
10. perCluster only for actionable/topPriority clusters.
11. candidates include title + standardCodes; deterministic for same report+lessons+version; BRIDGE_VERSION present; pure (no DB/Prisma/seed/scoring import); no schema/report/UI/content change; synthetic-only tests.

RUN: npx tsc --noEmit; the bridge test; PSSA suite if relevant; confirm no schema diff.

STOP and report if: the spec is missing; the real ClassReport / RoleFamily shapes differ from the spec; any DB/scoring/schema/UI/content change appears necessary.

STOP REPORT: branch + commit SHA; files changed (new bridge module + test + spec only); eligibility-gate proof (excluded/unapproved/untagged never suggested + auditWarnings); cluster-gate proof; all behavior anchors proven; conventions-guard proof; no-match->note proof; perCluster-only-when-needed proof; determinism + BRIDGE_VERSION; tsc + PSSA suite results; synthetic-only confirmation.
```

When Codex returns the stop report, paste it here and I'll audit at source — the behavior anchors (Inference/Text Evidence top an evidence group), eligibility resolving against all 7 tags, the conventions guard, default-empty-not-fallback, and no DB/Prisma/scoring imports.