export type TeacherLessonQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  passage?: string;
  coachHint?: string;
  interactionType?: string;
};

export type TeacherLessonSeedInput = {
  gradeLevel: number;
  standardCode: string;
  standardCodes?: string[];
  standardLabel: string;
  skill: string;
  title: string;
  domain: string;
  pssaBridgeTags?: string[];
  lessonExplanation: string;
  workedExample: string;
  guidedPractice: TeacherLessonQuestion[];
  independentPractice: TeacherLessonQuestion[];
  exitTicket: TeacherLessonQuestion[];
  masteryCheck: TeacherLessonQuestion[];
  retestRecommendation: string;
};

export type TeacherLessonDbRowInput = {
  id: string;
  title: string;
  gradeLevel: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  reviewStatus: string;
};

export type TeacherLessonCategory =
  | "key_ideas_evidence"
  | "craft_structure"
  | "vocabulary"
  | "conventions"
  | "writing";

export type TeacherLessonPlacement = "state_track" | "writing";

export type TeacherLessonListItem = {
  id: string;
  title: string;
  gradeLevel: number;
  skill: string;
  domain?: string;
  standardCodes: string[];
  placement: TeacherLessonPlacement;
  category: TeacherLessonCategory;
  categoryLabel: string;
  approvalStatus: "APPROVED";
};

export type TeacherLessonPreview = TeacherLessonListItem & {
  standardLabel: string;
  lessonExplanation: string;
  workedExample: string;
  guidedPractice: TeacherLessonQuestion[];
  independentPractice: TeacherLessonQuestion[];
  exitTicket: TeacherLessonQuestion[];
  masteryCheck: TeacherLessonQuestion[];
  retestRecommendation: string;
  teacherNote?: string;
};

export type TeacherLessonAuditWarning = {
  code: "approved_row_unmatched_seed" | "approved_row_missing_metadata" | "approved_row_hidden";
  lessonId?: string;
  gradeLevel?: number;
  skill?: string;
  title?: string;
};

export type GradeThreeSourceAudit = {
  total: number;
  counts: Record<GradeThreeAuditBucket, number>;
  visibleMax: number;
};

type GradeThreeAuditBucket =
  | "key_ideas_evidence"
  | "craft_structure"
  | "vocabulary"
  | "conventions"
  | "writing_tda"
  | "foundational_support"
  | "exclude_from_grade3_bridge";

type LessonVisibility =
  | {
      visible: true;
      placement: TeacherLessonPlacement;
      category: TeacherLessonCategory;
      categoryLabel: string;
      teacherNote?: string;
    }
  | {
      visible: false;
      reason: "foundational_support" | "exclude_from_grade3_bridge" | "grade3_tda_hidden" | "missing_metadata";
    };

const CATEGORY_LABELS = {
  key_ideas_evidence: "Key Ideas & Evidence",
  craft_structure: "Craft & Structure",
  vocabulary: "Vocabulary",
  conventions: "Conventions",
} as const satisfies Record<Exclude<TeacherLessonCategory, "writing">, string>;

const REPORT_FAMILY_TAGS = Object.keys(CATEGORY_LABELS) as Exclude<TeacherLessonCategory, "writing">[];
const WRITING_TAG = "writing_tda";
const FOUNDATIONAL_TAG = "foundational_support";
const EXCLUDE_TAG = "exclude_from_grade3_bridge";

const TOP_LEVEL_TAGS = [...REPORT_FAMILY_TAGS, WRITING_TAG, FOUNDATIONAL_TAG, EXCLUDE_TAG] as const;
const CATEGORY_ORDER = ["key_ideas_evidence", "craft_structure", "vocabulary", "conventions", "writing"] as const;

export class TeacherLessonLibraryIntegrityError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TeacherLessonLibraryIntegrityError";
  }
}

export function buildTeacherLessonLibraryList(
  rows: TeacherLessonDbRowInput[],
  seeds: TeacherLessonSeedInput[],
): { lessons: TeacherLessonListItem[]; auditWarnings: TeacherLessonAuditWarning[] } {
  const seedIndex = buildSeedIndex(seeds);
  assertNoDuplicateApprovedRows(rows);
  const auditWarnings: TeacherLessonAuditWarning[] = [];
  const lessons: TeacherLessonListItem[] = [];

  for (const row of rows) {
    if (row.reviewStatus !== "APPROVED") continue;
    const seed = seedIndex.get(joinKey(row));
    if (!seed) {
      auditWarnings.push(warning("approved_row_unmatched_seed", row));
      continue;
    }

    const visibility = deriveLessonVisibility(seed);
    if (visibility.visible === false) {
      if (visibility.reason === "missing_metadata") {
        auditWarnings.push(warning("approved_row_missing_metadata", row));
      } else {
        auditWarnings.push(warning("approved_row_hidden", row));
      }
      continue;
    }

    lessons.push(toListItem(row, seed, visibility));
  }

  return {
    lessons: lessons.sort(compareListItems),
    auditWarnings,
  };
}

export function buildTeacherLessonPreview(
  lessonId: string,
  rows: TeacherLessonDbRowInput[],
  seeds: TeacherLessonSeedInput[],
): { preview: TeacherLessonPreview | null; auditWarnings: TeacherLessonAuditWarning[] } {
  const { lessons, auditWarnings } = buildTeacherLessonLibraryList(rows, seeds);
  const listItem = lessons.find((lesson) => lesson.id === lessonId);
  if (!listItem) return { preview: null, auditWarnings };

  const row = rows.find((candidate) => candidate.id === lessonId && candidate.reviewStatus === "APPROVED");
  if (!row) return { preview: null, auditWarnings };
  const seed = buildSeedIndex(seeds).get(joinKey(row));
  if (!seed) return { preview: null, auditWarnings };
  const visibility = deriveLessonVisibility(seed);
  if (!visibility.visible) return { preview: null, auditWarnings };

  return {
    preview: {
      ...listItem,
      standardLabel: row.standardLabel || seed.standardLabel,
      lessonExplanation: seed.lessonExplanation,
      workedExample: seed.workedExample,
      guidedPractice: copyQuestions(seed.guidedPractice),
      independentPractice: copyQuestions(seed.independentPractice),
      exitTicket: copyQuestions(seed.exitTicket),
      masteryCheck: copyQuestions(seed.masteryCheck),
      retestRecommendation: seed.retestRecommendation,
      ...(visibility.teacherNote ? { teacherNote: visibility.teacherNote } : {}),
    },
    auditWarnings,
  };
}

export function auditGradeThreeLessonSeeds(seeds: TeacherLessonSeedInput[]): GradeThreeSourceAudit {
  const counts: Record<GradeThreeAuditBucket, number> = {
    key_ideas_evidence: 0,
    craft_structure: 0,
    vocabulary: 0,
    conventions: 0,
    writing_tda: 0,
    foundational_support: 0,
    exclude_from_grade3_bridge: 0,
  };

  let total = 0;
  let visibleMax = 0;
  for (const seed of seeds) {
    if (seed.gradeLevel !== 3) continue;
    total += 1;
    const bucket = singleTopLevelTag(seed);
    if (!bucket) {
      throw new TeacherLessonLibraryIntegrityError("Grade 3 lesson seed is missing bridge metadata", {
        skill: seed.skill,
        title: seed.title,
      });
    }
    counts[bucket] += 1;
    const visibility = deriveLessonVisibility(seed);
    if (visibility.visible) visibleMax += 1;
  }

  return { total, counts, visibleMax };
}

export function deriveLessonVisibility(seed: TeacherLessonSeedInput): LessonVisibility {
  const tags = seed.pssaBridgeTags ?? [];
  if (tags.length === 0) return { visible: false, reason: "missing_metadata" };

  const topTags = tags.filter((tag): tag is typeof TOP_LEVEL_TAGS[number] => (TOP_LEVEL_TAGS as readonly string[]).includes(tag));
  if (topTags.length === 0) {
    throw new TeacherLessonLibraryIntegrityError("Lesson seed has no recognized top-level bridge tag", {
      gradeLevel: seed.gradeLevel,
      skill: seed.skill,
      tags,
    });
  }
  if (topTags.length > 1) {
    throw new TeacherLessonLibraryIntegrityError("Lesson seed has multiple top-level bridge tags", {
      gradeLevel: seed.gradeLevel,
      skill: seed.skill,
      tags: topTags,
    });
  }

  const topTag = topTags[0];
  if (topTag === FOUNDATIONAL_TAG) return { visible: false, reason: "foundational_support" };
  if (topTag === EXCLUDE_TAG) return { visible: false, reason: "exclude_from_grade3_bridge" };
  if (topTag === WRITING_TAG) {
    return {
      visible: true,
      placement: "writing",
      category: "writing",
      categoryLabel: seed.gradeLevel === 3 ? "Writing & Short Answer" : "Writing & TDA",
      teacherNote: seed.gradeLevel === 3 ? "Grade 3 short-response practice; not an official TDA task." : undefined,
    };
  }

  return {
    visible: true,
    placement: "state_track",
    category: topTag,
    categoryLabel: CATEGORY_LABELS[topTag],
  };
}

function toListItem(
  row: TeacherLessonDbRowInput,
  seed: TeacherLessonSeedInput,
  visibility: Extract<LessonVisibility, { visible: true }>,
): TeacherLessonListItem {
  return {
    id: row.id,
    title: row.title || seed.title,
    gradeLevel: row.gradeLevel,
    skill: displaySkillForTeacher(row, seed),
    domain: seed.domain || undefined,
    standardCodes: seed.standardCodes?.length ? [...seed.standardCodes] : [row.standardCode || seed.standardCode],
    placement: visibility.placement,
    category: visibility.category,
    categoryLabel: visibility.categoryLabel,
    approvalStatus: "APPROVED",
  };
}

function buildSeedIndex(seeds: TeacherLessonSeedInput[]) {
  const index = new Map<string, TeacherLessonSeedInput>();
  const duplicates: string[] = [];
  for (const seed of seeds) {
    const key = joinKey(seed);
    if (index.has(key)) duplicates.push(key);
    index.set(key, seed);
  }
  if (duplicates.length) {
    throw new TeacherLessonLibraryIntegrityError("Duplicate lesson seed key", { keys: duplicates });
  }
  return index;
}

function assertNoDuplicateApprovedRows(rows: TeacherLessonDbRowInput[]) {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const row of rows) {
    if (row.reviewStatus !== "APPROVED") continue;
    const key = joinKey(row);
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  if (duplicates.length) {
    throw new TeacherLessonLibraryIntegrityError("Duplicate approved LearningLesson key", { keys: duplicates });
  }
}

function joinKey(value: { gradeLevel: number; skill: string }) {
  return `${value.gradeLevel}::${value.skill.trim().toLowerCase()}`;
}

function warning(code: TeacherLessonAuditWarning["code"], row: TeacherLessonDbRowInput): TeacherLessonAuditWarning {
  return {
    code,
    lessonId: row.id,
    gradeLevel: row.gradeLevel,
    skill: row.skill,
    title: row.title,
  };
}

function singleTopLevelTag(seed: TeacherLessonSeedInput): GradeThreeAuditBucket | null {
  const tags = seed.pssaBridgeTags ?? [];
  const topTags = tags.filter((tag): tag is GradeThreeAuditBucket => (TOP_LEVEL_TAGS as readonly string[]).includes(tag));
  if (topTags.length !== 1) return null;
  return topTags[0];
}

function isGradeThreeTdaSeed(seed: TeacherLessonSeedInput) {
  return seed.title === "Grade 3 TDA Evidence and Explanation Lesson" || seed.skill === "TDA Evidence and Explanation";
}

function displaySkillForTeacher(row: TeacherLessonDbRowInput, seed: TeacherLessonSeedInput) {
  return seed.gradeLevel === 3 && isGradeThreeTdaSeed(seed) ? "Text Evidence and Explanation" : row.skill;
}

function compareListItems(a: TeacherLessonListItem, b: TeacherLessonListItem) {
  return (
    a.gradeLevel - b.gradeLevel ||
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}

function copyQuestions(questions: TeacherLessonQuestion[]) {
  return questions.map((question) => ({
    ...question,
    choices: [...question.choices],
  }));
}
