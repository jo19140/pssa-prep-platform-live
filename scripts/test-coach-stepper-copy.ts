import assert from "node:assert/strict";
import { COACH_STEPPER_COPY, coachStepperCopy } from "@/lib/literacy/coachStepperCopy";

const expected = {
  partNames: {
    1: "Warm-up",
    2: "The pattern",
    3: "Read the words",
    4: "High-utility words",
    5: "Read sentences",
    6: "Spell it",
    7: "Read the passage",
    8: "Talk about it",
  },
  modeTags: { listen: "Listen", readAloud: "Read aloud", buildIt: "Build it", think: "Think" },
  actions: {
    markRead: "Mark read",
    markHeard: "Mark heard",
    markChecked: "Mark checked",
    markAnswered: "Mark answered",
    next: "Next",
    back: "Back",
  },
  taskLabels: {
    warmup_word: "Warm-up word {n} of {t}",
    rule: "Pattern focus",
    demo_pair: "Example {n} of {t}",
    real_word: "Word {n} of {t}",
    nonsense_word: "Nonsense word {n} of {t}",
    power_word_heart: "High-utility word {n} of {t}",
    power_word_vocab: "Vocabulary word {n} of {t}",
    sentence: "Sentence {n} of {t}",
    spell_word: "Spelling word {n} of {t}",
    passage: "Passage",
    reflect: "Question {n} of {t}",
  },
  summary: {
    title: "Coach session complete",
    message: "Nice work. You moved through every part of today's reading coach session.",
  },
  review: { completedLabel: "Completed", readOnlyLabel: "Review" },
  demoPair: {
    beforeHelper: "Before",
    afterHelper: "After silent e",
  },
  powerWord: {
    heartHelper: "High-utility word",
    vocabHelper: "Vocabulary word",
  },
  spelling: {
    hearButton: "Hear word",
    checkButton: "Check",
    doneButton: "Done",
    nextButton: "Next word",
    clearButton: "Clear",
    correctFeedback: "That matches.",
    retryFeedback: "Keep building the word you hear.",
  },
  passage: {
    listenFirstButton: "Listen first",
    listeningButton: "Listening…",
    readOnOwnButton: "Read on my own",
    doneReadingButton: "Done reading",
  },
  reflect: {
    placeholder: "Type a quick note.",
    markAnswered: "Mark answered",
  },
} as const;

assert.deepStrictEqual(COACH_STEPPER_COPY, expected);
assert.deepStrictEqual(coachStepperCopy(), expected);

console.log("Coach stepper copy tests passed.");
