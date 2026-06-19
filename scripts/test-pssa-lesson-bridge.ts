import assert from "node:assert/strict";
import fs from "node:fs";

import { CLASS_REPORT_VERSION, type ClassReport, type SuggestedClassGroup } from "../lib/content/pssaClassReport";
import { type RoleFamily } from "../lib/content/pssaInsightMapping";
import {
  BRIDGE_VERSION,
  suggestLessonsForReport,
  type BridgeLesson,
} from "../lib/content/pssaLessonBridge";
import { REPORT_VERSION } from "../lib/content/pssaStudentReport";
import { MAPPING_VERSION } from "../lib/content/pssaInsightMapping";

const approvedLessons: BridgeLesson[] = [
  lesson("l-main", "Main Idea", ["CC.1.2.3.A"], ["key_ideas_evidence", "main_idea", "key_details", "central_idea"]),
  lesson("l-inference", "Inference", ["CC.1.2.3.B", "CC.1.3.3.B"], ["key_ideas_evidence", "inference", "text_evidence", "prove_answer", "unsupported_inference"]),
  lesson("l-text-evidence", "Text Evidence", ["CC.1.2.3.B", "CC.1.3.3.B"], ["key_ideas_evidence", "text_evidence", "cite_evidence", "prove_answer"]),
  lesson("l-text-features", "Text Features", ["CC.1.2.3.E", "CC.1.2.3.G"], ["craft_structure", "text_features", "graphics", "search_tools"]),
  lesson("l-point-of-view", "Point of View", ["CC.1.2.3.D", "CC.1.3.3.D"], ["craft_structure", "point_of_view", "author_point_of_view", "narrator", "speaker"]),
  lesson("l-context-clues", "Context Clues", ["CC.1.2.3.F", "CC.1.3.3.F"], ["vocabulary", "context_clues", "word_meaning", "literal_nonliteral"]),
  lesson("l-connotation", "Connotation and Figurative Language", ["CC.1.2.3.F", "CC.1.3.3.F"], ["vocabulary", "figurative_language", "nonliteral_language", "word_meaning", "literal_nonliteral"]),
  lesson("l-capitalization", "Capitalization and Titles", ["CC.1.4.3.F"], ["conventions", "capitalization", "titles"]),
  lesson("l-commas", "Commas in a Series", ["CC.1.4.3.F"], ["conventions", "commas", "punctuation", "series_commas"]),
  lesson("l-complete-sentences", "Complete Sentences", ["CC.1.4.3.F"], ["conventions", "sentence_formation", "complete_sentences"]),
  lesson("x-vowels", "Short and Long Vowel Patterns", ["CC.1.1.3.D"], ["foundational_support", "vowel_patterns", "phonics"]),
  lesson("x-opinion", "Opinion Reasons", ["CC.1.4.3.G"], ["writing_tda", "opinion_writing"]),
  lesson("x-paragraph", "Paragraph Organization", ["CC.1.4.3.J"], ["writing_tda", "paragraph_organization"]),
  lesson("x-tda", "TDA Evidence and Explanation", ["CC.1.4.3.S"], ["writing_tda", "text_dependent_analysis"]),
  lesson("x-pronoun", "Pronoun Agreement and Shifts", ["CC.1.4.3.F"], ["exclude_from_grade3_bridge", "pronoun_shift", "grammar"]),
  lesson("x-style", "Formal and Informal Style", ["CC.1.4.3.K"], ["exclude_from_grade3_bridge", "style", "language_use"]),
];

const badLessons: BridgeLesson[] = [
  lesson("bad-untagged", "Untagged", ["CC.X"], [], "approved"),
  lesson("bad-multi", "Multi Top", ["CC.X"], ["vocabulary", "conventions"], "approved"),
  lesson("bad-unapproved", "Unapproved", ["CC.X"], ["vocabulary", "context_clues"], "draft"),
];

function lesson(lessonId: string, skill: string, standardCodes: string[], pssaBridgeTags: string[], reviewStatus = "approved"): BridgeLesson {
  return {
    lessonId,
    title: `Grade 3 ${skill} Lesson`,
    skill,
    gradeLevel: 3,
    standardCode: standardCodes[0],
    standardCodes,
    pssaBridgeTags,
    reviewStatus,
  };
}

function group(
  groupId: string,
  cluster: SuggestedClassGroup["cluster"],
  roleFamily: RoleFamily,
  recommendedSkill?: string,
): SuggestedClassGroup {
  return {
    groupId,
    label: groupId,
    cluster,
    roleFamily,
    classLabel: "small_group_opportunity",
    studentIds: ["s1", "s2", "s3"],
    recommendedAction: "Reteach with a short lesson.",
    ...(recommendedSkill ? { recommendedSkill } : {}),
  };
}

function report(groups: SuggestedClassGroup[], opts: Partial<ClassReport> = {}): ClassReport {
  return {
    classReportVersion: CLASS_REPORT_VERSION,
    reportVersion: REPORT_VERSION,
    mappingVersion: MAPPING_VERSION,
    benchmarkSeason: "BOY",
    formId: "form-1",
    assignedStudents: 3,
    completedStudents: 3,
    incompleteStudents: 0,
    scoreStatusCounts: { final: 3, provisional: 0, incomplete: 0 },
    medianOperationalScore: 20,
    bandDistribution: { Strong: 0, Developing: 1, "Needs support": 2, Incomplete: 0 },
    clusterResults: [],
    topPriorityCluster: null,
    topClassInsight: "Evidence trend",
    misconceptionMap: groups.map((row) => ({
      cluster: row.cluster,
      roleFamily: row.roleFamily,
      classLabel: row.classLabel,
      studentsAffected: row.studentIds.length,
      sharePct: 1,
      totalResponses: 3,
      studentIds: row.studentIds,
      interpretation: "Synthetic pattern",
      recommendedAction: row.recommendedAction,
      ...(row.recommendedSkill ? { recommendedSkill: row.recommendedSkill } : {}),
    })),
    suggestedGroups: groups,
    additionalAnalyticsItems: emptyAnalyticsItems(),
    ...opts,
  };
}

function emptyAnalyticsItems() {
  return {
    label: "Additional Analytics Items — did not affect the diagnostic score" as const,
    studentCount: 3,
    earnedPoints: 0,
    possiblePoints: 0,
    pendingHumanPoints: 0,
    percent: null,
    byItem: [],
    byEc: [],
  };
}

function candidatesFor(result: ReturnType<typeof suggestLessonsForReport>, groupId: string) {
  return result.perGroup.find((row) => row.groupId === groupId)?.candidates ?? [];
}

function candidateIds(result: ReturnType<typeof suggestLessonsForReport>) {
  return result.perGroup.flatMap((row) => row.candidates.map((candidate) => candidate.lessonId));
}

function testReadingRoleRanking() {
  const result = suggestLessonsForReport(
    report([
      group("unsupported", "Key Ideas & Evidence", "unsupported_inference"),
      group("wrong-section", "Key Ideas & Evidence", "wrong_section"),
      group("narrow", "Key Ideas & Evidence", "too_narrow"),
    ]),
    approvedLessons,
  );
  assert.deepEqual(candidatesFor(result, "unsupported").slice(0, 2).map((row) => row.skill), ["Inference", "Text Evidence"]);
  assert.equal(candidatesFor(result, "wrong-section")[0].skill, "Text Evidence");
  assert.equal(candidatesFor(result, "narrow")[0].skill, "Main Idea");
}

function testCraftAndVocabularySkillRouting() {
  const result = suggestLessonsForReport(
    report([
      group("features", "Craft & Structure", "plausible_misreading", "Text Features"),
      group("pov", "Craft & Structure", "plausible_misreading", "Point of View"),
      group("context", "Vocabulary", "plausible_misreading", "Context Clues"),
      group("nonliteral", "Vocabulary", "plausible_misreading", "nonliteral language"),
    ]),
    approvedLessons,
  );
  assert.equal(candidatesFor(result, "features")[0].skill, "Text Features");
  assert.equal(candidatesFor(result, "pov")[0].skill, "Point of View");
  assert.equal(candidatesFor(result, "context")[0].skill, "Context Clues");
  assert.equal(candidatesFor(result, "nonliteral")[0].skill, "Connotation and Figurative Language");
  assert.ok(candidatesFor(result, "nonliteral")[0].matchBasis.some((basis) => basis.startsWith("role_tag_overlap")));
}

function testConventionsGuardAndExclusions() {
  const result = suggestLessonsForReport(
    report([
      group("caps", "Conventions", "capitalization"),
      group("commas", "Conventions", "commas"),
      group("sentences", "Conventions", "sentence_formation"),
    ]),
    approvedLessons,
  );
  assert.equal(candidatesFor(result, "caps")[0].skill, "Capitalization and Titles");
  assert.equal(candidatesFor(result, "commas")[0].skill, "Commas in a Series");
  assert.equal(candidatesFor(result, "sentences")[0].skill, "Complete Sentences");
  assert.deepEqual(
    new Set(candidateIds(result)),
    new Set(["l-capitalization", "l-commas", "l-complete-sentences"]),
  );

  const excludedIds = ["x-vowels", "x-opinion", "x-paragraph", "x-tda", "x-pronoun", "x-style"];
  for (const id of excludedIds) assert.equal(candidateIds(result).includes(id), false, `${id} must not be suggested`);
}

function testBadLessonWarnings() {
  const result = suggestLessonsForReport(
    report([group("context", "Vocabulary", "plausible_misreading", "Context Clues")]),
    [...approvedLessons, ...badLessons],
  );
  assert.deepEqual(result.auditWarnings, [
    { lessonId: "bad-untagged", reason: "missing pssaBridgeTags" },
    { lessonId: "bad-multi", reason: "multiple top-level bridge tags" },
    { lessonId: "bad-unapproved", reason: "unapproved" },
  ]);
  for (const id of ["bad-untagged", "bad-multi", "bad-unapproved"]) assert.equal(candidateIds(result).includes(id), false);
}

function testFallbackBehavior() {
  const pronounGroup = group("pronoun", "Conventions", "pronoun_shift" as RoleFamily);
  const noFallback = suggestLessonsForReport(report([pronounGroup]), approvedLessons);
  assert.deepEqual(candidatesFor(noFallback, "pronoun"), []);
  assert.equal(noFallback.perGroup[0].note, "No approved lesson matched this group's bridge tags.");

  const withFallback = suggestLessonsForReport(report([pronounGroup]), approvedLessons, { allowClusterFallback: true });
  assert.ok(candidatesFor(withFallback, "pronoun").length > 0);
  assert.ok(candidatesFor(withFallback, "pronoun").every((candidate) => candidate.matchBasis.includes("cluster_fallback")));
}

function testPerClusterScopeAndVersionDeterminism() {
  const groups = [
    group("unsupported", "Key Ideas & Evidence", "unsupported_inference"),
    group("features", "Craft & Structure", "plausible_misreading", "Text Features"),
  ];
  const classReport = report(groups, {
    misconceptionMap: [
      {
        cluster: "Key Ideas & Evidence",
        roleFamily: "unsupported_inference",
        classLabel: "below_threshold",
        studentsAffected: 1,
        sharePct: 0.1,
        totalResponses: 1,
        studentIds: ["s1"],
        interpretation: "Too small",
        recommendedAction: "Monitor",
      },
      {
        cluster: "Vocabulary",
        roleFamily: "plausible_misreading",
        classLabel: "class_trend",
        studentsAffected: 3,
        sharePct: 1,
        totalResponses: 3,
        studentIds: ["s1", "s2", "s3"],
        interpretation: "Vocabulary trend",
        recommendedAction: "Reteach vocabulary",
      },
    ],
    topPriorityCluster: "Craft & Structure",
  });
  const first = suggestLessonsForReport(classReport, approvedLessons);
  const second = suggestLessonsForReport(classReport, approvedLessons);
  assert.equal(first.bridgeVersion, BRIDGE_VERSION);
  assert.deepEqual(first, second);
  assert.deepEqual(first.perCluster.map((row) => row.cluster).sort(), ["Craft & Structure", "Vocabulary"]);
}

function testImportHygiene() {
  const source = fs.readFileSync("lib/content/pssaLessonBridge.ts", "utf8");
  assert.match(source, /import type \{ ClassReport, SuggestedClassGroup \}/);
  assert.match(source, /import type \{ RoleFamily \}/);
  assert.match(source, /import type \{ PssaReportCluster \}/);
  assert.equal(/from ["']@prisma\/client["']/.test(source), false);
  assert.equal(/pssaScoring|pssaClassReportLoader|seedPrebuiltLesson|prebuiltLessonLibrary/.test(source), false);
}

testReadingRoleRanking();
testCraftAndVocabularySkillRouting();
testConventionsGuardAndExclusions();
testBadLessonWarnings();
testFallbackBehavior();
testPerClusterScopeAndVersionDeterminism();
testImportHygiene();

console.log("PSSA lesson bridge tests passed: eligibility, cluster gate, ranking, conventions guard, fallback, perCluster scope, determinism, import hygiene.");
