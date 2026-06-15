import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart8Comprehension(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const content = phase3EntryLessonContentFor(ctx.dailyTarget.code, ctx.presentationProfile);
  return withCommonPartMetadata(ctx, {
    partNumber: 8,
    partLabel: "Comprehension and language extension",
    partType: "COMPREHENSION_LANGUAGE_EXTENSION",
    kidVisibleCopy: {
      title: "Talk about the story",
      directions: "Answer in your own words.",
      questions: content.comprehensionQuestions,
    },
    tutorVisibleCopy: {
      purpose: "Check literal understanding, inference, retell, and language extension without making grade-level claims.",
    },
    contentJson: {
      skillFocus: "comprehension_language_extension",
      questions: content.comprehensionQuestions,
      questionTypes: content.comprehensionQuestions.map((entry) => entry.questionType),
      responseMode: "speech_response",
      studentDisplayMode: "OPEN_RESPONSE_QUESTIONS",
    },
    scoringRubricJson: { scoring: "open_response_rubric", evidence: "story comprehension and oral language" },
    studentDisplayMode: "OPEN_RESPONSE_QUESTIONS",
    responseMode: "speech_response",
  });
}
