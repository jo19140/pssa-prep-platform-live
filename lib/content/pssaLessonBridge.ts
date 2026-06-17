import type { ClassReport, SuggestedClassGroup } from "@/lib/content/pssaClassReport";
import type { RoleFamily } from "@/lib/content/pssaInsightMapping";
import type { PssaReportCluster } from "@/lib/content/pssaStudentReport";

export const BRIDGE_VERSION = "pssa-ws3d-pre-lesson-bridge-v1";

export type TopLevelBridgeTag =
  | "key_ideas_evidence"
  | "craft_structure"
  | "vocabulary"
  | "conventions"
  | "writing_tda"
  | "foundational_support"
  | "exclude_from_grade3_bridge";

export type BridgeLesson = {
  lessonId: string;
  title: string;
  skill: string;
  gradeLevel: number;
  standardCode: string;
  standardCodes: string[];
  pssaBridgeTags: string[];
  reviewStatus: string;
};

export type LessonCandidate = {
  lessonId: string;
  title: string;
  skill: string;
  standardCodes: string[];
  matchBasis: string[];
  score: number;
};

export type LessonBridgeAuditWarning = {
  lessonId: string;
  reason: "missing pssaBridgeTags" | "multiple top-level bridge tags" | "unapproved";
};

export type LessonBridgeGroupSuggestion = {
  groupId: string;
  cluster: PssaReportCluster;
  roleFamily: RoleFamily;
  candidates: LessonCandidate[];
  note?: string;
};

export type LessonBridgeClusterSuggestion = {
  cluster: PssaReportCluster;
  candidates: LessonCandidate[];
};

export type LessonBridgeResult = {
  perGroup: LessonBridgeGroupSuggestion[];
  perCluster: LessonBridgeClusterSuggestion[];
  auditWarnings: LessonBridgeAuditWarning[];
  bridgeVersion: typeof BRIDGE_VERSION;
};

export type LessonBridgeOptions = {
  allowClusterFallback?: boolean;
  maxPerGroup?: number;
};

type SuggestableLesson = BridgeLesson & {
  topTag: TopLevelBridgeTag;
};

type ScoredCandidate = LessonCandidate & {
  roleTagOverlap: number;
  skillTitleMatch: number;
  standardCodeOverlap: number;
};

type GroupWithOptionalStandards = SuggestedClassGroup & {
  standardCodes?: string[];
};

export const TOP_LEVEL_BRIDGE_TAGS: readonly TopLevelBridgeTag[] = [
  "key_ideas_evidence",
  "craft_structure",
  "vocabulary",
  "conventions",
  "writing_tda",
  "foundational_support",
  "exclude_from_grade3_bridge",
];

export const CLUSTER_TOP_TAG: Record<PssaReportCluster, TopLevelBridgeTag> = {
  "Key Ideas & Evidence": "key_ideas_evidence",
  "Craft & Structure": "craft_structure",
  "Vocabulary": "vocabulary",
  "Conventions": "conventions",
};

export const ROLE_FAMILY_PREFERRED_TAGS: Partial<Record<RoleFamily, readonly string[]>> = {
  unsupported_inference: ["inference", "text_evidence", "prove_answer", "unsupported_inference"],
  wrong_section: ["text_evidence", "cite_evidence", "prove_answer"],
  plausible_misreading: ["text_evidence", "inference", "prove_answer"],
  opposite_claim: ["inference", "key_details"],
  too_narrow: ["main_idea", "central_idea", "key_details"],
  wrong_emphasis: ["main_idea", "key_details"],
};

export const CONVENTIONS_FAMILY_PREFERRED_TAGS: Partial<Record<RoleFamily, readonly string[]>> = {
  capitalization: ["capitalization", "titles"],
  commas: ["commas", "punctuation", "series_commas"],
  sentence_formation: ["sentence_formation", "complete_sentences"],
};

const intentionalExclusions = new Set<TopLevelBridgeTag>([
  "writing_tda",
  "foundational_support",
  "exclude_from_grade3_bridge",
]);

const recommendedSkillTagAliases = new Map<string, readonly string[]>([
  ["text_features", ["text_features"]],
  ["point_of_view", ["point_of_view"]],
  ["vocabulary_in_context", ["context_clues"]],
  ["context_clues", ["context_clues"]],
  ["nonliteral_language", ["nonliteral_language"]],
  ["figurative_language", ["figurative_language", "nonliteral_language"]],
  ["capitalization", ["capitalization", "titles"]],
  ["commas", ["commas", "punctuation", "series_commas"]],
  ["complete_sentences", ["sentence_formation", "complete_sentences"]],
]);

export function suggestLessonsForReport(
  report: ClassReport,
  lessons: BridgeLesson[],
  opts: LessonBridgeOptions = {},
): LessonBridgeResult {
  const maxPerGroup = opts.maxPerGroup ?? 3;
  const { suggestableLessons, auditWarnings } = resolveSuggestableLessons(lessons);
  const perGroup = report.suggestedGroups.map((group) => {
    const clusterTopTag = CLUSTER_TOP_TAG[group.cluster];
    const clusterLessons = suggestableLessons.filter((lesson) => lesson.topTag === clusterTopTag);
    const candidates = clusterLessons
      .map((lesson) => scoreLessonForGroup(lesson, group))
      .map((candidate) => addClusterFallback(candidate, opts.allowClusterFallback === true))
      .filter((candidate) => candidate.score > 0)
      .sort(compareCandidates)
      .slice(0, maxPerGroup)
      .map(stripSortSignals);
    return {
      groupId: group.groupId,
      cluster: group.cluster,
      roleFamily: group.roleFamily,
      candidates,
      ...(candidates.length === 0 ? { note: "No approved lesson matched this group's bridge tags." } : {}),
    };
  });

  return {
    perGroup,
    perCluster: buildPerCluster(report, perGroup),
    auditWarnings,
    bridgeVersion: BRIDGE_VERSION,
  };
}

function resolveSuggestableLessons(lessons: BridgeLesson[]) {
  const auditWarnings: LessonBridgeAuditWarning[] = [];
  const suggestableLessons: SuggestableLesson[] = [];
  for (const lesson of lessons) {
    const topTags = lesson.pssaBridgeTags.filter(isTopLevelBridgeTag);
    if (topTags.length === 0) {
      auditWarnings.push({ lessonId: lesson.lessonId, reason: "missing pssaBridgeTags" });
      continue;
    }
    if (topTags.length > 1) {
      auditWarnings.push({ lessonId: lesson.lessonId, reason: "multiple top-level bridge tags" });
      continue;
    }
    if (lesson.reviewStatus.toLowerCase() !== "approved") {
      auditWarnings.push({ lessonId: lesson.lessonId, reason: "unapproved" });
      continue;
    }
    if (intentionalExclusions.has(topTags[0])) continue;
    suggestableLessons.push({ ...lesson, topTag: topTags[0] });
  }
  return { suggestableLessons, auditWarnings };
}

function scoreLessonForGroup(lesson: SuggestableLesson, group: SuggestedClassGroup): ScoredCandidate {
  const preferredTags = preferredTagsForGroup(group);
  const roleTagOverlap = preferredTags.filter((tag) => lesson.pssaBridgeTags.includes(tag)).length;
  const skillTitleMatch = skillTitleMatches(lesson, group) ? 1 : 0;
  const standardCodeOverlap = overlappingStandardCodes(lesson, group).length;
  const matchBasis = [
    ...(roleTagOverlap > 0 ? [`role_tag_overlap:${roleTagOverlap}`] : []),
    ...(skillTitleMatch > 0 ? ["skill_title_match"] : []),
    ...(standardCodeOverlap > 0 ? [`standard_code_overlap:${standardCodeOverlap}`] : []),
    "cluster_fallback",
  ];
  return {
    lessonId: lesson.lessonId,
    title: lesson.title,
    skill: lesson.skill,
    standardCodes: lesson.standardCodes,
    matchBasis,
    score: roleTagOverlap * 100 + skillTitleMatch * 25 + standardCodeOverlap * 10,
    roleTagOverlap,
    skillTitleMatch,
    standardCodeOverlap,
  };
}

function addClusterFallback(candidate: ScoredCandidate, allowClusterFallback: boolean): ScoredCandidate {
  if (!allowClusterFallback) {
    return {
      ...candidate,
      matchBasis: candidate.matchBasis.filter((basis) => basis !== "cluster_fallback"),
    };
  }
  return {
    ...candidate,
    score: candidate.score + (candidate.matchBasis.length === 1 ? 1 : 0),
  };
}

function preferredTagsForGroup(group: SuggestedClassGroup) {
  const tags = group.cluster === "Conventions"
    ? [...(CONVENTIONS_FAMILY_PREFERRED_TAGS[group.roleFamily] ?? [])]
    : [...(ROLE_FAMILY_PREFERRED_TAGS[group.roleFamily] ?? [])];
  const recommendedSkillKey = normalizeTag(group.recommendedSkill ?? "");
  const recommendedSkillTags = recommendedSkillTagAliases.get(recommendedSkillKey) ?? [];
  for (const tag of recommendedSkillTags) {
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function skillTitleMatches(lesson: BridgeLesson, group: SuggestedClassGroup) {
  const haystack = normalizeText(`${lesson.skill} ${lesson.title}`);
  const recommendedSkill = normalizeText(group.recommendedSkill ?? "");
  if (recommendedSkill && haystack.includes(recommendedSkill)) return true;
  return Boolean(group.recommendedSkill && normalizedTokens(group.recommendedSkill).every((token) => haystack.includes(token)));
}

function overlappingStandardCodes(lesson: BridgeLesson, group: SuggestedClassGroup) {
  const groupCodes = new Set((group as GroupWithOptionalStandards).standardCodes ?? []);
  return lesson.standardCodes.filter((code) => groupCodes.has(code));
}

function buildPerCluster(report: ClassReport, perGroup: LessonBridgeGroupSuggestion[]) {
  const actionableClusters = new Set<PssaReportCluster>();
  for (const entry of report.misconceptionMap) {
    if (entry.classLabel !== "below_threshold") actionableClusters.add(entry.cluster);
  }
  if (report.topPriorityCluster) actionableClusters.add(report.topPriorityCluster);
  return [...actionableClusters].sort().map((cluster) => ({
    cluster,
    candidates: dedupeCandidates(perGroup.filter((group) => group.cluster === cluster).flatMap((group) => group.candidates)),
  }));
}

function dedupeCandidates(candidates: LessonCandidate[]) {
  const byId = new Map<string, LessonCandidate>();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.lessonId);
    if (!existing || candidate.score > existing.score) byId.set(candidate.lessonId, candidate);
  }
  return [...byId.values()].sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill) || a.lessonId.localeCompare(b.lessonId));
}

function compareCandidates(a: ScoredCandidate, b: ScoredCandidate) {
  return b.score - a.score
    || b.roleTagOverlap - a.roleTagOverlap
    || b.skillTitleMatch - a.skillTitleMatch
    || b.standardCodeOverlap - a.standardCodeOverlap
    || a.skill.localeCompare(b.skill)
    || a.lessonId.localeCompare(b.lessonId);
}

function stripSortSignals(candidate: ScoredCandidate): LessonCandidate {
  return {
    lessonId: candidate.lessonId,
    title: candidate.title,
    skill: candidate.skill,
    standardCodes: candidate.standardCodes,
    matchBasis: candidate.matchBasis,
    score: candidate.score,
  };
}

function isTopLevelBridgeTag(tag: string): tag is TopLevelBridgeTag {
  return (TOP_LEVEL_BRIDGE_TAGS as readonly string[]).includes(tag);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeTag(value: string) {
  return normalizeText(value).replace(/\s+/g, "_");
}

function normalizedTokens(value: string) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}
