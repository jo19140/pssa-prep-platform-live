import { getSkillProgression } from "@/lib/gradeSkillProgression";

type PracticeQuestion = {
  question?: string;
  choices?: unknown;
  correctAnswer?: string;
  explanation?: string;
  passage?: string;
  coachHint?: string;
};

type LessonQualityInput = {
  gradeLevel: number;
  skill: string;
  domain?: string | null;
  lessonExplanation?: string | null;
  workedExample?: string | null;
  guidedPractice?: PracticeQuestion[] | unknown;
  independentPractice?: PracticeQuestion[] | unknown;
  exitTicket?: PracticeQuestion[] | unknown;
  masteryCheck?: PracticeQuestion[] | unknown;
};

export type LessonQualityBlueprint = {
  version: string;
  gradeLevel: number;
  skill: string;
  domain: string;
  progressionTarget: ReturnType<typeof getSkillProgression>;
  requiredSequence: string[];
  interactionMix: string[];
  minimums: {
    guidedPractice: number;
    independentPractice: number;
    exitTicket: number;
    masteryCheck: number;
  };
  gradeSpecificDemands: {
    textComplexity: string;
    evidenceDemand: string;
    reasoningDepth: string;
    masteryExpectation: string;
  };
  teacherReviewLookFors: string[];
};

export type LessonQualityReview = {
  score: number;
  status: "Ready" | "Needs revision" | "Needs expansion";
  passed: string[];
  needsWork: string[];
};

export function getLessonQualityBlueprint({ gradeLevel, skill, domain }: { gradeLevel: number; skill: string; domain?: string | null }): LessonQualityBlueprint {
  const progressionTarget = getSkillProgression(skill, gradeLevel);
  const higherGrade = gradeLevel >= 6;
  return {
    version: "2026-05-lesson-quality-v1",
    gradeLevel,
    skill,
    domain: domain || domainForSkill(skill),
    progressionTarget,
    requiredSequence: [
      "Hook or purpose statement",
      "Explicit skill definition in student-friendly language",
      "Grade-level model text or sentence",
      "Worked example with thinking shown",
      "Guided practice with scaffolded feedback",
      "Independent practice with fresh text",
      "Exit ticket",
      "Mastery check",
      "Teacher next-step recommendation",
    ],
    interactionMix: higherGrade
      ? ["select evidence", "break apart reasoning", "compare answer strength", "short written explanation", "PSSA-style mastery item"]
      : ["listen/read", "choose the best answer", "match evidence", "sort strong and weak support", "PSSA-style mastery item"],
    minimums: {
      guidedPractice: higherGrade ? 4 : 3,
      independentPractice: higherGrade ? 5 : 4,
      exitTicket: 1,
      masteryCheck: higherGrade ? 3 : 2,
    },
    gradeSpecificDemands: {
      textComplexity: progressionTarget.passageComplexity,
      evidenceDemand: progressionTarget.evidenceDemand,
      reasoningDepth: progressionTarget.reasoningDepth,
      masteryExpectation: progressionTarget.masteryExpectation,
    },
    teacherReviewLookFors: [
      "The lesson teaches the skill before asking students to practice it.",
      "Questions use original text and do not copy outside programs.",
      "Wrong answers reveal likely misconceptions and lead to feedback.",
      "Practice grows from supported to independent.",
      "The mastery check measures the grade-specific version of the skill.",
    ],
  };
}

export function evaluateLessonQuality(lesson: LessonQualityInput): LessonQualityReview {
  const blueprint = getLessonQualityBlueprint(lesson);
  const passed: string[] = [];
  const needsWork: string[] = [];
  let score = 0;

  check(Boolean(lesson.lessonExplanation && lesson.lessonExplanation.length >= 120), "Has explicit teaching language.", "Lesson explanation is too thin.");
  check(Boolean(lesson.workedExample && lesson.workedExample.length >= 120), "Includes a worked example.", "Worked example needs to show student thinking.");
  check(count(lesson.guidedPractice) >= blueprint.minimums.guidedPractice, `Guided practice has ${blueprint.minimums.guidedPractice}+ items.`, `Guided practice needs at least ${blueprint.minimums.guidedPractice} items.`);
  check(count(lesson.independentPractice) >= blueprint.minimums.independentPractice, `Independent practice has ${blueprint.minimums.independentPractice}+ items.`, `Independent practice needs at least ${blueprint.minimums.independentPractice} items.`);
  check(count(lesson.exitTicket) >= blueprint.minimums.exitTicket, "Includes an exit ticket.", "Exit ticket is missing.");
  check(count(lesson.masteryCheck) >= blueprint.minimums.masteryCheck, `Mastery check has ${blueprint.minimums.masteryCheck}+ items.`, `Mastery check needs at least ${blueprint.minimums.masteryCheck} items.`);
  check(hasPassages(lesson), "Uses text or sentence context for practice.", "Practice needs original text or sentence context.");
  check(hasExplanations(lesson), "Practice includes explanations/feedback.", "Practice needs stronger answer explanations.");
  check(hasChoiceQuality(lesson), "Answer choices are complete enough to assess the skill.", "Some answer choices are missing or too thin.");
  check(Boolean(blueprint.progressionTarget?.masteryExpectation), "Uses a grade-specific progression target.", "Missing grade-specific progression target.");

  const status = score >= 85 ? "Ready" : score >= 65 ? "Needs revision" : "Needs expansion";
  return { score, status, passed, needsWork };

  function check(condition: boolean, pass: string, fail: string) {
    if (condition) {
      score += 10;
      passed.push(pass);
    } else {
      needsWork.push(fail);
    }
  }
}

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function allQuestions(lesson: LessonQualityInput) {
  return [lesson.guidedPractice, lesson.independentPractice, lesson.exitTicket, lesson.masteryCheck]
    .flatMap((section) => (Array.isArray(section) ? section : [])) as PracticeQuestion[];
}

function hasPassages(lesson: LessonQualityInput) {
  const questions = allQuestions(lesson);
  return questions.some((question) => typeof question.passage === "string" && question.passage.length >= 40);
}

function hasExplanations(lesson: LessonQualityInput) {
  const questions = allQuestions(lesson);
  return questions.length > 0 && questions.every((question) => typeof question.explanation === "string" && question.explanation.length >= 30);
}

function hasChoiceQuality(lesson: LessonQualityInput) {
  const questions = allQuestions(lesson);
  return questions.length > 0 && questions.every((question) => Array.isArray(question.choices) && question.choices.length >= 4 && Boolean(question.correctAnswer));
}

function domainForSkill(skill: string) {
  const lower = skill.toLowerCase();
  if (lower.includes("convention") || lower.includes("pronoun") || lower.includes("comma") || lower.includes("sentence")) return "Conventions of Standard English";
  if (lower.includes("theme") || lower.includes("plot") || lower.includes("character") || lower.includes("point of view")) return "Literary Text";
  if (lower.includes("vocab") || lower.includes("word") || lower.includes("figurative") || lower.includes("connotation")) return "Vocabulary";
  if (lower.includes("tda") || lower.includes("writing") || lower.includes("essay")) return "Text-Dependent Analysis";
  return "Informational Text";
}
