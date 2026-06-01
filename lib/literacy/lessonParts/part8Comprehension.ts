import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

const QUESTIONS = [
  { question: "Why did Dave make the cake?", questionType: "inference" },
  { question: "What did Jane do when Dave gave her the cake?", questionType: "literal" },
  { question: "Tell me what happened at the lake, in your own words.", questionType: "retell" },
  { question: "What is something you would make for a pal?", questionType: "personal_connection" },
];

export function generatePart8Comprehension(ctx: LessonGeneratorContext): GeneratedLessonPart {
  return withCommonPartMetadata(ctx, {
    partNumber: 8,
    partLabel: "Comprehension and language extension",
    partType: "COMPREHENSION_LANGUAGE_EXTENSION",
    kidVisibleCopy: {
      title: "Talk about the story",
      directions: "Answer in your own words.",
      questions: QUESTIONS,
    },
    tutorVisibleCopy: {
      purpose: "Check literal understanding, inference, retell, and language extension without making grade-level claims.",
    },
    contentJson: {
      skillFocus: "comprehension_language_extension",
      questions: QUESTIONS,
      questionTypes: QUESTIONS.map((entry) => entry.questionType),
      responseMode: "speech_response",
      studentDisplayMode: "OPEN_RESPONSE_QUESTIONS",
    },
    scoringRubricJson: { scoring: "open_response_rubric", evidence: "story comprehension and oral language" },
    studentDisplayMode: "OPEN_RESPONSE_QUESTIONS",
    responseMode: "speech_response",
  });
}
