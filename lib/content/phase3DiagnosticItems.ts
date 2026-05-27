import { Prisma } from "@prisma/client";
import { PHASE_3_ENTRY_TARGETS } from "./phase3EntrySeed";

type DiagnosticItemSeed = {
  strand: "PA" | "DECODING" | "MORPHOLOGY" | "FLUENCY" | "VOCABULARY" | "COMPREHENSION";
  itemType: string;
  dailyTargetCode?: string;
  promptJson: Prisma.InputJsonValue;
  correctAnswer?: string;
  scoringRubricJson?: Prisma.InputJsonValue;
  difficultyBand: number;
  isPracticeItem?: boolean;
};

const CLOSED_REVIEW_WORDS = ["cat", "sit", "hop", "mud", "bed"];

export function buildPhase3EntryDiagnosticItems(): DiagnosticItemSeed[] {
  const items: DiagnosticItemSeed[] = [
    {
      strand: "PA",
      itemType: "ORAL_SOUND_MATCH",
      promptJson: {
        kidPrompt: "Buddy will say three words. Which two start the same way?",
        audioScript: "sun, seal, map",
        choices: ["sun and seal", "sun and map", "seal and map"],
      },
      correctAnswer: "sun and seal",
      scoringRubricJson: { scoring: "selected_choice", evidence: "initial sound matching" },
      difficultyBand: 3,
    },
    {
      strand: "PA",
      itemType: "ORAL_WORD_BLEND",
      promptJson: {
        kidPrompt: "Buddy will say the parts slowly. Say the whole word.",
        audioScript: "m ... ake",
      },
      correctAnswer: "make",
      scoringRubricJson: { scoring: "speech_match", acceptedResponses: ["make"] },
      difficultyBand: 3,
    },
    {
      strand: "MORPHOLOGY",
      itemType: "BASE_WORD_ID",
      promptJson: {
        kidPrompt: "Which word is the base word in playful?",
        choices: ["play", "ful", "playful"],
      },
      correctAnswer: "play",
      scoringRubricJson: { scoring: "selected_choice", evidence: "base word recognition" },
      difficultyBand: 3,
    },
    {
      strand: "VOCABULARY",
      itemType: "WORD_MEANING_CONTEXT",
      promptJson: {
        kidPrompt: "In this sentence, what does brave mean? The brave kid tried again after the tower fell.",
        choices: ["not afraid to try", "very sleepy", "made of stone"],
      },
      correctAnswer: "not afraid to try",
      scoringRubricJson: { scoring: "selected_choice", evidence: "context meaning" },
      difficultyBand: 3,
    },
    {
      strand: "COMPREHENSION",
      itemType: "LISTENING_MAIN_IDEA",
      promptJson: {
        kidPrompt: "Listen to Buddy read. Then choose what the story is mostly about.",
        audioScript: "Mia and Ben built a small bridge from sticks. The first bridge fell. They tried a wider base, and the bridge held.",
        choices: ["friends solving a building problem", "a bridge over a city river", "a race across a field"],
      },
      correctAnswer: "friends solving a building problem",
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
        promptJson: {
          kidPrompt: "Read this word out loud.",
          displayText: realWordA,
          noVisibleTimer: true,
          latencyRules: { delayedAfterMs: 5000, noAttemptAfterMs: 10000, placementUsesAccuracyOnly: true },
        },
        correctAnswer: realWordA,
        scoringRubricJson: { scoring: "speech_match", acceptedResponses: [realWordA], latencyFeeds: "FLUENCY" },
        difficultyBand: 3,
      },
      {
        strand: "DECODING",
        itemType: "PSEUDOWORD_DECODE",
        dailyTargetCode: target.code,
        promptJson: {
          kidPrompt: "Read this made-up word out loud.",
          displayText: nonwordA,
          noVisibleTimer: true,
          latencyRules: { delayedAfterMs: 5000, noAttemptAfterMs: 10000, placementUsesAccuracyOnly: true },
        },
        correctAnswer: nonwordA,
        scoringRubricJson: { scoring: "speech_match", acceptedResponses: [nonwordA], latencyFeeds: "FLUENCY" },
        difficultyBand: 3,
      },
      {
        strand: "FLUENCY",
        itemType: "PHRASE_READ",
        dailyTargetCode: target.code,
        promptJson: {
          kidPrompt: "Read this short phrase out loud.",
          displayText: `${realWordB} and ${CLOSED_REVIEW_WORDS[target.introductionOrder - 1]}`,
          noVisibleTimer: true,
        },
        correctAnswer: `${realWordB} and ${CLOSED_REVIEW_WORDS[target.introductionOrder - 1]}`,
        scoringRubricJson: { scoring: "speech_accuracy_plus_latency", delayedAfterMs: 5000, noAttemptAfterMs: 10000 },
        difficultyBand: 3,
      },
    );
  }

  return items;
}
