import { withCommonPartMetadata, type GeneratedLessonPart, type LessonGeneratorContext } from "./types";

export function generatePart4HeartVocab(ctx: LessonGeneratorContext): GeneratedLessonPart {
  const vocabulary = ctx.vocabularyWords.map((word) => ({ word, role: "story_vocabulary" }));
  return withCommonPartMetadata(ctx, {
    partNumber: 4,
    partLabel: "High-utility word and vocabulary preview",
    partType: "HFW_VOCAB",
    kidVisibleCopy: {
      title: "Words to know",
      heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
      vocabulary,
    },
    tutorVisibleCopy: {
      purpose: "Preview heart words and vocabulary that appear later in sentences and connected text.",
      heartWordsAssumedKnown: ctx.heartWordsAssumedKnown,
    },
    contentJson: {
      skillFocus: "heart_word_and_vocabulary_preview",
      heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
      heartWordsPreviewedThisLesson: ctx.heartWordsPreviewedThisLesson,
      heartWordsAssumedKnown: ctx.heartWordsAssumedKnown,
      vocabularyWords: vocabulary,
      studentDisplayMode: "WORD_CARDS",
      responseMode: "listen_and_repeat",
    },
    wordTagsJson: {
      words: [
        ...ctx.heartWordsPreviewedThisLesson.map((word) => ({ word, tag: "heart", previewStatus: "previewed_this_lesson" })),
        ...ctx.heartWordsAssumedKnown.map((word) => ({ word, tag: "heart", previewStatus: "assumed_known" })),
        ...ctx.vocabularyWords.map((word) => ({ word, tag: "vocabulary", previewStatus: "previewed_this_lesson" })),
      ],
    },
    studentDisplayMode: "WORD_CARDS",
    responseMode: "listen_and_repeat",
  });
}
