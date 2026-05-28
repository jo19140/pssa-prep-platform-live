import { Prisma } from "@prisma/client";
import { PHASE_3_ENTRY_TARGETS } from "./phase3EntrySeed";

type DiagnosticItemSeed = {
  strand: "PA" | "DECODING" | "MORPHOLOGY" | "FLUENCY" | "VOCABULARY" | "COMPREHENSION";
  itemType: string;
  dailyTargetCode?: string;
  studentPromptJson: Prisma.InputJsonValue;
  stimulusJson?: Prisma.InputJsonValue;
  expectedResponseJson: Prisma.InputJsonValue;
  scoringRubricJson: Prisma.InputJsonValue;
  adminReviewJson?: Prisma.InputJsonValue;
  phaseBand?: number;
  morphologyWave?: string;
  targetMorpheme?: string;
  skill?: string;
  difficultyBand: number;
  isPracticeItem?: boolean;
};

const CLOSED_REVIEW_WORDS = ["cat", "sit", "hop", "mud", "bed"];

export function buildPhase3EntryDiagnosticItems(): DiagnosticItemSeed[] {
  const items: DiagnosticItemSeed[] = [
    {
      strand: "PA",
      itemType: "ORAL_SOUND_MATCH",
      studentPromptJson: {
        kidPrompt: "Buddy will say three words. Which two start the same way?",
      },
      stimulusJson: {
        audioScript: "sun, seal, map",
      },
      expectedResponseJson: response("sun and seal", ["sun and map", "seal and map"], ["sun seal", "sun and seals"]),
      scoringRubricJson: { scoring: "speech_response", evidence: "initial sound matching" },
      adminReviewJson: { note: "Choices are reviewer/scoring context; PA kid view should stay audio-first." },
      difficultyBand: 3,
    },
    {
      strand: "PA",
      itemType: "ORAL_WORD_BLEND",
      studentPromptJson: {
        kidPrompt: "Buddy will say the parts slowly. Say the whole word.",
      },
      stimulusJson: {
        audioScript: "m ... ake",
      },
      expectedResponseJson: response("make", [], ["mayk"]),
      scoringRubricJson: { scoring: "speech_response", evidence: "oral word blend" },
      difficultyBand: 3,
    },
    {
      strand: "MORPHOLOGY",
      itemType: "BASE_WORD_ID",
      ...baseWordIdItem({
        word: "playful",
        baseWord: "play",
        boundMorpheme: "-ful",
        morphologyWave: "transparent_suffixes",
      }),
      scoringRubricJson: { scoring: "selected_choice", evidence: "base word recognition" },
      phaseBand: 3,
      morphologyWave: "transparent_suffixes",
      targetMorpheme: "-ful",
      skill: "base_word_identification",
      difficultyBand: 3,
    },
    {
      strand: "VOCABULARY",
      itemType: "WORD_MEANING_CONTEXT",
      studentPromptJson: {
        kidPrompt: "In this sentence, what does brave mean? The brave kid tried again after the tower fell.",
        choices: ["not afraid to try", "very sleepy", "made of stone"],
      },
      expectedResponseJson: response("not afraid to try", ["very sleepy", "made of stone"]),
      scoringRubricJson: { scoring: "selected_choice", evidence: "context meaning" },
      difficultyBand: 3,
    },
    {
      strand: "COMPREHENSION",
      itemType: "LISTENING_MAIN_IDEA",
      studentPromptJson: {
        kidPrompt: "Listen to Buddy read. Then choose what the story is mostly about.",
        choices: ["friends solving a building problem", "a bridge over a city river", "a race across a field"],
      },
      stimulusJson: {
        audioScript: "Mia and Ben built a small bridge from sticks. The first bridge fell. They tried a wider base, and the bridge held.",
      },
      expectedResponseJson: response("friends solving a building problem", ["a bridge over a city river", "a race across a field"]),
      scoringRubricJson: { scoring: "selected_choice", evidence: "main idea from listening" },
      difficultyBand: 3,
    },
  ];

  for (const target of PHASE_3_ENTRY_TARGETS) {
    const [realWordA, realWordB] = target.exampleWords;
    const [nonwordA, nonwordB] = target.exampleNonwords;
    items.push(
      {
        strand: "DECODING",
        itemType: "REAL_WORD_DECODE",
        dailyTargetCode: target.code,
        studentPromptJson: {
          kidPrompt: "Read this word out loud.",
          displayText: realWordA,
          noVisibleTimer: true,
        },
        expectedResponseJson: response(realWordA),
        scoringRubricJson: { scoring: "speech_match", latencyFeeds: "FLUENCY" },
        adminReviewJson: { latencyRules: { delayedAfterMs: 5000, noAttemptAfterMs: 10000, placementUsesAccuracyOnly: true } },
        difficultyBand: 3,
      },
      {
        strand: "DECODING",
        itemType: "PSEUDOWORD_DECODE",
        dailyTargetCode: target.code,
        studentPromptJson: {
          kidPrompt: "Read this made-up word out loud.",
          displayText: nonwordA,
          noVisibleTimer: true,
        },
        expectedResponseJson: response(nonwordA),
        scoringRubricJson: { scoring: "speech_match", latencyFeeds: "FLUENCY" },
        adminReviewJson: { latencyRules: { delayedAfterMs: 5000, noAttemptAfterMs: 10000, placementUsesAccuracyOnly: true } },
        difficultyBand: 3,
      },
      {
        strand: "FLUENCY",
        itemType: "PHRASE_READ",
        dailyTargetCode: target.code,
        studentPromptJson: {
          kidPrompt: "Read this short phrase out loud.",
          displayText: `${realWordB} and ${CLOSED_REVIEW_WORDS[target.introductionOrder - 1]}`,
          noVisibleTimer: true,
        },
        expectedResponseJson: response(`${realWordB} and ${CLOSED_REVIEW_WORDS[target.introductionOrder - 1]}`),
        scoringRubricJson: { scoring: "speech_accuracy_plus_latency", delayedAfterMs: 5000, noAttemptAfterMs: 10000 },
        difficultyBand: 3,
      },
    );
  }

  return items;
}

function response(canonical: string, rejectedResponses: string[] = [], speechTranscriptAliases: string[] = []): Prisma.InputJsonValue {
  return {
    canonical,
    acceptedSemanticResponses: [canonical],
    speechTranscriptAliases,
    rejectedResponses,
  };
}

function baseWordIdItem({
  word,
  baseWord,
  boundMorpheme,
  morphologyWave,
}: {
  word: string;
  baseWord: string;
  boundMorpheme: string;
  morphologyWave: string;
}): Pick<DiagnosticItemSeed, "studentPromptJson" | "expectedResponseJson" | "adminReviewJson"> {
  const choices = [baseWord, boundMorpheme, word];
  const hasBoundMorpheme = choices.some((choice) => choice.startsWith("-") || choice.endsWith("-"));
  return {
    studentPromptJson: {
      kidPrompt: hasBoundMorpheme ? `Which part is the base word in ${word}?` : `Which word is the base word in ${word}?`,
      choices,
    },
    expectedResponseJson: response(baseWord, choices.filter((choice) => choice !== baseWord)),
    adminReviewJson: {
      morphologyWave,
      targetMorpheme: boundMorpheme,
      skill: "base_word_identification",
      note: "Bound morpheme choices include boundary markers for reviewer and student clarity.",
    },
  };
}
