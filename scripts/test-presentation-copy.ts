import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  presentationCopyFor,
  presentationThemeFor,
  type PresentationCopy,
  type PresentationTheme,
} from "../lib/literacy/presentationCopy";

const expectedK3Copy: PresentationCopy = {
  shell: {
    brandInitials: "Rb",
    brandName: "Reading Buddy",
    targetPrefix: "Target:",
    subtitle: "Full 8-part structured literacy lesson · generated content-v3 data",
    replayHarper: "Replay Harper",
    doneWithPart: "Done with this part",
    adultControlsTitle: "Adult controls",
    adultControlsDescription: "Support for a parent or tutor nearby.",
    adultRetryOnly: "Harper retry only",
    assistedModeLater: "Assisted mode available later",
    evidencePreviewTitle: "Evidence preview",
    modeLabel: "Mode",
    evidenceLabel: "Evidence",
  },
  partNav: [
    { icon: "Fire", short: "Warm", mode: "listen for attempt", evidence: "heard speech / completion only" },
    { icon: "Spark", short: "Rule", mode: "teaching", evidence: "no score" },
    { icon: "Words", short: "Words", mode: "read and retry", evidence: "speech attempt" },
    { icon: "Heart", short: "Power", mode: "listen and repeat", evidence: "not scored" },
    { icon: "Read", short: "Sent.", mode: "listen and encourage", evidence: "completion only" },
    { icon: "Spell", short: "Spell", mode: "spelling match", evidence: "typed/tile" },
    { icon: "Story", short: "Story", mode: "listen and encourage", evidence: "completion only" },
    { icon: "Talk", short: "Talk", mode: "open response", evidence: "no auto-grade" },
  ],
  partTitles: {
    1: "Warm-up",
    2: "New thing to learn",
    3: "Read the words",
    4: "Power words",
    5: "Read sentences",
    6: "Spell it",
    7: "Read the story",
    8: "Talk about it",
  },
  buddy: {
    name: "Harper",
    imageAlt: "Harper",
    stateLabels: {
      idle: "Ready",
      listening: "Listening",
      speaking: "Speaking",
      confused: "Trying another clue",
    },
  },
  listenAttempt: {
    heardCounter: "Heard {done}/{total}",
    heardStatus: "✓ heard",
    tapToStop: "tap to stop",
    tryAgain: "try again",
    tapToRead: "tap to read",
    adultSupport: "I read it with my adult",
    noVoiceTryAgain: "I did not hear your voice yet. Try that one again.",
    micUnavailable: "I could not use the microphone. You can read it with your adult and tap confirm.",
    stopEarlyTryAgain: "Try that one again so Harper can hear your voice.",
    fallbackConfirm: "You can read it with your adult and tap confirm.",
    adultSupportThanks: "Thanks for reading it with your adult.",
    warmup: {
      intro: "Tap each word and read it to Harper. Harper will listen for your voice.",
      prompt: "I'm listening — read it to me.",
      encourage: "Thanks — I heard you read that!",
      completeLabel: "I read the warm-up words",
      completeDisabledLabel: "Read each word to Harper first",
    },
    pseudoword: {
      title: "Now the silly words",
      body: "Sound out each silly word and read it to Harper. Harper will listen for your try. She won't say silly words for you; they are just for trying.",
      intro: "Sound out each silly word and read it to Harper. Harper will listen for your try.",
      prompt: "I'm listening — sound it out for me.",
      encourage: "Thanks — I heard your try!",
      completeLabel: "We read the silly words",
      completeDisabledLabel: "Read each silly word to Harper first",
      completeMessage: "Nice work with the silly words.",
    },
  },
  conceptDemo: {
    mainPair: "Main pair",
    practicePair: "Practice pair",
    beforeLabel: "Before",
    afterLabel: "Silent e word",
    arrowLabel: "to",
    listenAgain: "Listen again",
    completeLabel: "I practiced it",
    completeDisabledLabel: "Tap each pair first",
  },
  part3: {
    defaultReteachPrompt: "Look carefully at the word. Try again: {word}.",
    defaultFeedback: "Tap the highlighted word when you are ready. Harper will listen to one word at a time.",
    readWord: "Read {word}.",
    listeningStop: "I'm listening. Tap this word again when you are done.",
    technicalRetry: "I had trouble hearing that. Let's try once more.",
    rateLimitHarper: "Let's take a quick pause. I'll be ready in a moment.",
    rateLimitChip: "Let's take a quick pause. Harper will be ready in a moment.",
    correct: "Nice reading — that was {word}!",
    retryPrompt: "Read that one more time for me.",
    assisted: "Listen: {word}. Now you try.",
    adultSupportDone: "Thanks for reading with your adult. Let's keep going.",
    currentInstructionListening: "Harper is listening. Tap the word again when you are done.",
    currentInstructionThinking: "Harper is thinking about that word.",
    currentInstructionRateLimited: "Harper is taking a quick pause before the next try.",
    currentInstructionComplete: "Nice word reading. Now try the silly words with your adult.",
    currentInstructionDefault: "Tap the highlighted word to read it to Harper.",
    lineLabel: "Line {lineNumber}",
    checkingStatus: "checking",
    tapToReadStatus: "tap to read",
    processingStatus: "Harper is listening",
    currentWordLabel: "Current word",
    currentWordInstruction: "Use the highlighted word chip above. The word is the read button.",
    adultSupportButton: "I read it with my adult",
    realWordsCompleteLabel: "Real words complete: {done}/{total}",
    doneButton: "Done with word lines",
  },
  powerWords: {
    heartKind: "Power word",
    vocabularyKind: "Story word",
    completeLabel: "I know these",
    completeDisabledLabel: "Tap each word first",
  },
  sentenceReading: {
    sentenceLabel: "Sentence {index}",
    readingMessage: "Harper is listening while you read. Tap done when you finish.",
    idleMessage: "Tap start when you are ready to read the sentences.",
    harperListen: "I'm listening. Read each sentence out loud when you are ready.",
    harperEncourage: "I loved listening to you read those sentences!",
    startButton: "Start reading",
    doneButton: "Done reading",
  },
  spelling: {
    harperSays: "Harper says",
    listenToWord: "Listen to word {index}",
    inputPlaceholder: "type the word",
    clearButton: "Clear",
    correctFeedback: "That matches.",
    retryFeedback: "Keep building the word you hear.",
    checkButton: "Check spelling",
    nextButton: "Next word",
    doneButton: "Done spelling",
  },
  storyReading: {
    storyLabel: "Story",
    defaultTitle: "Story",
    listenFirstHarper: "Listen first. Then you can read it on your own.",
    afterListenHarper: "Now you can read the story on your own when you are ready.",
    readOnOwnHarper: "I'm listening. Read the story in your own voice.",
    finishEncourage: "I loved listening to you read that!",
    readingMessage: "Harper is listening while you read. Tap done when you finish.",
    idleMessage: "Choose listen first, or read the story on your own.",
    listeningButton: "Listening...",
    listenFirstButton: "Listen first",
    readOnOwnButton: "Read on my own",
    doneButton: "Done reading",
  },
  talk: {
    placeholder: "Type a quick note or tell your adult.",
    completeLabel: "I talked about it",
  },
  placeholder: {
    badge: "Coming in the next lesson-player slice",
    defaultPreview: "This part is generated and will be wired in a later slice.",
  },
  tappablePractice: {
    heardBadge: "Heard",
    heardCounter: "Heard {done}/{total}",
  },
  fallback: {
    part2Speech: "Listen to the new thing with Harper.",
    part3Description: "Read the generated word lines with Harper.",
    part5Description: "Read the generated sentences with Harper listening.",
    part7Description: "Listen first or read the generated story on your own.",
    defaultDescription: "Generated lesson activity.",
    disabledTitle: "This lesson is coming soon",
    disabledMessage:
      "Harper has the first silent-e lesson ready. The {targetCode} lesson will turn on after its kid-facing rule copy is approved.",
  },
};

const expectedK3Theme: PresentationTheme = {
  layout: {
    showAdultEvidencePanel: true,
    page: "min-h-screen bg-[#f6efe7] px-3 py-4 text-slate-900 md:px-5",
    grid: "mx-auto grid max-w-7xl gap-4 lg:grid-cols-[104px_minmax(0,1fr)_292px]",
  },
  shell: {
    rail: "rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-3 shadow-xl lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]",
    brandBadge: "grid h-14 w-14 place-items-center rounded-2xl bg-amber-300 text-xl font-black",
    brandText: "text-xs font-black uppercase tracking-wide text-amber-900",
    navActive: "border-amber-300 bg-amber-100 text-amber-950",
    navComplete: "border-emerald-200 bg-emerald-50 text-emerald-800",
    navIdle: "border-transparent bg-white text-slate-600",
    header: "flex flex-col gap-3 rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-4 shadow-xl md:flex-row md:items-center md:justify-between",
    targetPill: "inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900",
    secondaryButton: "rounded-2xl border border-[#e8d9c7] bg-white px-4 py-3 text-sm font-black text-amber-950",
    primaryButton: "rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-amber-950 shadow",
    lessonFrame: "grid min-h-[650px] overflow-hidden rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 shadow-xl lg:grid-cols-[260px_minmax(0,1fr)]",
    buddyPanel: "border-b border-[#e8d9c7] bg-[#fff2cf] p-5 text-center lg:border-b-0 lg:border-r",
    speechBubble: "rounded-3xl border border-[#f1dfc8] bg-white p-4 text-left text-sm font-extrabold leading-relaxed text-[#4e3b2d]",
    metaBox: "mt-4 rounded-3xl border border-dashed border-[#e6cda9] bg-white p-4 text-left text-xs font-black text-slate-600",
    activitySurface: "flex flex-1 flex-col rounded-[26px] border border-[#efe1d2] bg-white p-5",
    adultPanel: "hidden rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-4 shadow-xl lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-2.5rem)] lg:flex-col lg:gap-4",
  },
  cards: {
    blueNotice: "rounded-3xl border-2 border-blue-100 bg-blue-50 p-4 text-base font-black leading-relaxed text-blue-950",
    amberNotice: "rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 text-xl font-black leading-relaxed",
    demoCard: "rounded-3xl border-2 border-[#e7d6c1] bg-[#fffdf8] p-6 text-center",
    generatedCard: "rounded-3xl border-2 border-[#ead9c2] bg-[#fffdf8] p-4",
    neutralCard: "rounded-3xl border border-[#efe1d2] bg-[#fffdf8] p-4",
    dashedCard: "mx-auto max-w-xl rounded-3xl border-2 border-dashed border-[#ead9c2] bg-[#fffdf8] p-6",
    primaryAction: "rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50",
    secondaryAction: "rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-50",
  },
};

const expectedCoachTheme: PresentationTheme = {
  layout: {
    showAdultEvidencePanel: false,
    page: "min-h-screen bg-slate-100 px-3 py-4 text-slate-900 md:px-5",
    grid: "mx-auto grid max-w-7xl gap-4 lg:grid-cols-[104px_minmax(0,1fr)]",
  },
  shell: {
    rail: "rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]",
    brandBadge: "grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-xl font-black text-white",
    brandText: "text-xs font-black uppercase tracking-wide text-indigo-700",
    navActive: "border-indigo-300 bg-indigo-50 text-indigo-900",
    navComplete: "border-emerald-300 bg-emerald-50 text-emerald-800",
    navIdle: "border-slate-200 bg-white text-slate-600",
    header: "flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between",
    targetPill: "inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-900",
    secondaryButton: "rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700",
    primaryButton: "rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow",
    lessonFrame: "grid min-h-[650px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:grid-cols-[260px_minmax(0,1fr)]",
    buddyPanel: "border-b border-slate-200 bg-slate-50 p-5 text-center lg:border-b-0 lg:border-r",
    speechBubble: "rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-extrabold leading-relaxed text-slate-800",
    metaBox: "mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left text-xs font-black text-slate-600",
    activitySurface: "flex flex-1 flex-col rounded-[26px] border border-slate-200 bg-white p-5",
    adultPanel: "hidden rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-4 shadow-xl lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-2.5rem)] lg:flex-col lg:gap-4",
  },
  cards: {
    blueNotice: "rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-4 text-base font-black leading-relaxed text-indigo-900",
    amberNotice: "rounded-3xl border-2 border-indigo-300 bg-indigo-50 p-5 text-xl font-black leading-relaxed text-slate-900",
    demoCard: "rounded-3xl border-2 border-slate-200 bg-white p-6 text-center",
    generatedCard: "rounded-3xl border-2 border-slate-200 bg-white p-4",
    neutralCard: "rounded-3xl border border-slate-200 bg-white p-4",
    dashedCard: "mx-auto max-w-xl rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6",
    primaryAction: "rounded-2xl bg-indigo-600 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50",
    secondaryAction: "rounded-2xl border border-slate-300 bg-white px-5 py-4 font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50",
  },
};

function main() {
  assert.deepStrictEqual(presentationCopyFor("BAND_K_3"), expectedK3Copy, "BAND_K_3 copy must match the hardcoded K-3 snapshot");
  assert.deepStrictEqual(presentationCopyFor(undefined), expectedK3Copy, "undefined profile must resolve to K-3 copy");
  assert.deepStrictEqual(presentationCopyFor("BAND_4_6"), expectedK3Copy, "BAND_4_6 must resolve to K-3 copy in P3");
  assert.deepStrictEqual(presentationThemeFor("BAND_K_3"), expectedK3Theme, "BAND_K_3 theme must match the hardcoded K-3 snapshot");
  assert.deepStrictEqual(presentationThemeFor(undefined), expectedK3Theme, "undefined profile must resolve to K-3 theme");
  assert.deepStrictEqual(presentationThemeFor("BAND_4_6"), expectedK3Theme, "BAND_4_6 must resolve to K-3 theme in P3");

  const coachCopy = presentationCopyFor("BAND_7_8");
  const coachTheme = presentationThemeFor("BAND_7_8");
  assert.deepStrictEqual(coachTheme, expectedCoachTheme, "BAND_7_8 theme must match the hardcoded Coach Mode snapshot");
  assert.notDeepStrictEqual(coachCopy, expectedK3Copy, "BAND_7_8 copy should differ from K-3");
  assert.notDeepStrictEqual(coachTheme, expectedK3Theme, "BAND_7_8 theme should differ from K-3");
  assert.equal(coachCopy.listenAttempt.pseudoword.title.includes("nonsense words"), true, "BAND_7_8 should say nonsense words");
  assert.equal(coachCopy.listenAttempt.pseudoword.title.includes("silly words"), false, "BAND_7_8 should not say silly words");
  assert.equal(coachCopy.buddy.name, "Harper", "Coach Mode must keep Harper's name");
  assert.equal(coachCopy.buddy.imageAlt, "Harper", "Coach Mode must keep Harper's alt text");
  assert.equal(coachCopy.spelling.nextButton, "Next word", "Coach Mode spelling should keep the next-word label");
  assert.equal(coachCopy.spelling.doneButton, "Finish spelling", "Coach Mode spelling should use the mature done label");
  assert.equal(coachTheme.layout.showAdultEvidencePanel, false, "Coach Mode must hide the adult/evidence panel");

  const studentPractice = readFileSync("components/literacy/StudentPracticeSession.tsx", "utf8");
  const buddy = readFileSync("components/literacy/BuddyCharacter.tsx", "utf8");
  assert.equal(studentPractice.includes("BAND_7_8"), false, "StudentPracticeSession must not branch on raw BAND_7_8");
  assert.equal(buddy.includes("BAND_7_8"), false, "BuddyCharacter must not branch on raw BAND_7_8");
  assert.equal(buddy.includes('/branding/harper-character-v1.png'), true, "BuddyCharacter must keep the branded Harper image");

  console.log("presentation copy regression checks passed");
}

main();
