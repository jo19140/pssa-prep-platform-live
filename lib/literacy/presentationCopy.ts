import type { PresentationProfile } from "./presentationProfile";

export type BuddyStateLabelMap = {
  idle: string;
  listening: string;
  speaking: string;
  confused: string;
};

export type PresentationCopy = {
  shell: {
    brandInitials: string;
    brandName: string;
    targetPrefix: string;
    subtitle: string;
    replayHarper: string;
    doneWithPart: string;
    adultControlsTitle: string;
    adultControlsDescription: string;
    adultRetryOnly: string;
    assistedModeLater: string;
    evidencePreviewTitle: string;
    modeLabel: string;
    evidenceLabel: string;
  };
  partNav: Array<{ icon: string; short: string; mode: string; evidence: string }>;
  partTitles: Record<number, string>;
  buddy: {
    name: string;
    imageAlt: string;
    stateLabels: BuddyStateLabelMap;
  };
  listenAttempt: {
    heardCounter: string;
    heardStatus: string;
    tapToStop: string;
    tryAgain: string;
    tapToRead: string;
    adultSupport: string;
    noVoiceTryAgain: string;
    micUnavailable: string;
    stopEarlyTryAgain: string;
    fallbackConfirm: string;
    adultSupportThanks: string;
    warmup: {
      intro: string;
      prompt: string;
      encourage: string;
      completeLabel: string;
      completeDisabledLabel: string;
    };
    pseudoword: {
      title: string;
      body: string;
      intro: string;
      prompt: string;
      encourage: string;
      completeLabel: string;
      completeDisabledLabel: string;
      completeMessage: string;
    };
  };
  conceptDemo: {
    mainPair: string;
    practicePair: string;
    beforeLabel: string;
    afterLabel: string;
    arrowLabel: string;
    listenAgain: string;
    completeLabel: string;
    completeDisabledLabel: string;
  };
  part3: {
    defaultReteachPrompt: string;
    defaultFeedback: string;
    readWord: string;
    listeningStop: string;
    technicalRetry: string;
    rateLimitHarper: string;
    rateLimitChip: string;
    correct: string;
    retryPrompt: string;
    assisted: string;
    adultSupportDone: string;
    currentInstructionListening: string;
    currentInstructionThinking: string;
    currentInstructionRateLimited: string;
    currentInstructionComplete: string;
    currentInstructionDefault: string;
    lineLabel: string;
    checkingStatus: string;
    tapToReadStatus: string;
    processingStatus: string;
    currentWordLabel: string;
    currentWordInstruction: string;
    adultSupportButton: string;
    realWordsCompleteLabel: string;
    doneButton: string;
  };
  powerWords: {
    heartKind: string;
    vocabularyKind: string;
    completeLabel: string;
    completeDisabledLabel: string;
  };
  sentenceReading: {
    sentenceLabel: string;
    readingMessage: string;
    idleMessage: string;
    harperListen: string;
    harperEncourage: string;
    startButton: string;
    doneButton: string;
  };
  spelling: {
    harperSays: string;
    listenToWord: string;
    inputPlaceholder: string;
    clearButton: string;
    correctFeedback: string;
    retryFeedback: string;
    checkButton: string;
  };
  storyReading: {
    storyLabel: string;
    defaultTitle: string;
    listenFirstHarper: string;
    afterListenHarper: string;
    readOnOwnHarper: string;
    finishEncourage: string;
    readingMessage: string;
    idleMessage: string;
    listeningButton: string;
    listenFirstButton: string;
    readOnOwnButton: string;
    doneButton: string;
  };
  talk: {
    placeholder: string;
    completeLabel: string;
  };
  placeholder: {
    badge: string;
    defaultPreview: string;
  };
  tappablePractice: {
    heardBadge: string;
    heardCounter: string;
  };
  fallback: {
    part2Speech: string;
    part3Description: string;
    part5Description: string;
    part7Description: string;
    defaultDescription: string;
    disabledTitle: string;
    disabledMessage: string;
  };
};

export type PresentationTheme = {
  layout: {
    showAdultEvidencePanel: boolean;
    page: string;
    grid: string;
  };
  shell: {
    rail: string;
    brandBadge: string;
    brandText: string;
    navActive: string;
    navComplete: string;
    navIdle: string;
    header: string;
    targetPill: string;
    secondaryButton: string;
    primaryButton: string;
    lessonFrame: string;
    buddyPanel: string;
    speechBubble: string;
    metaBox: string;
    activitySurface: string;
    adultPanel: string;
  };
  cards: {
    blueNotice: string;
    amberNotice: string;
    demoCard: string;
    generatedCard: string;
    neutralCard: string;
    dashedCard: string;
    primaryAction: string;
    secondaryAction: string;
  };
};

export const DEFAULT_BUDDY_STATE_LABELS: BuddyStateLabelMap = {
  idle: "Ready",
  listening: "Listening",
  speaking: "Speaking",
  confused: "Trying another clue",
};

const K3_COPY: PresentationCopy = {
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
    stateLabels: DEFAULT_BUDDY_STATE_LABELS,
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

const K3_THEME: PresentationTheme = {
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

const COACH_COPY: PresentationCopy = {
  ...K3_COPY,
  shell: {
    ...K3_COPY.shell,
    brandName: "Reading Coach",
    subtitle: "Coach Mode · focused reading practice from generated content-v3 data",
    doneWithPart: "Continue",
  },
  partNav: [
    { icon: "Fire", short: "Prep", mode: "attempt check", evidence: "completion only" },
    { icon: "Spark", short: "Focus", mode: "pattern briefing", evidence: "no score" },
    { icon: "Words", short: "Words", mode: "read and retry", evidence: "speech attempt" },
    { icon: "Heart", short: "Core", mode: "listen and repeat", evidence: "not scored" },
    { icon: "Read", short: "Sent.", mode: "read aloud", evidence: "completion only" },
    { icon: "Spell", short: "Spell", mode: "encoding check", evidence: "typed/tile" },
    { icon: "Story", short: "Text", mode: "passage read", evidence: "completion only" },
    { icon: "Talk", short: "Reflect", mode: "open response", evidence: "no auto-grade" },
  ],
  partTitles: {
    1: "Word warm-up",
    2: "Pattern focus",
    3: "Read the words",
    4: "High-utility words",
    5: "Sentence read",
    6: "Spell it",
    7: "Passage read",
    8: "Reflection",
  },
  buddy: {
    ...K3_COPY.buddy,
    stateLabels: {
      idle: "Ready",
      listening: "Listening",
      speaking: "Coaching",
      confused: "Trying another cue",
    },
  },
  listenAttempt: {
    ...K3_COPY.listenAttempt,
    adultSupport: "I read it with support",
    micUnavailable: "I could not use the microphone. Read it with support and tap confirm.",
    fallbackConfirm: "Read it with support and tap confirm.",
    adultSupportThanks: "Thanks for reading it with support.",
    warmup: {
      intro: "Tap each word and read it aloud. Harper will listen for your voice.",
      prompt: "I'm listening — read it aloud.",
      encourage: "Good — I heard your read.",
      completeLabel: "Warm-up complete",
      completeDisabledLabel: "Read each word aloud first",
    },
    pseudoword: {
      title: "Now the nonsense words",
      body: "Sound out each nonsense word and read it aloud. Harper listens for your attempt, but does not say these words first.",
      intro: "Sound out each nonsense word and read it aloud.",
      prompt: "I'm listening — sound it out.",
      encourage: "Good — I heard your attempt.",
      completeLabel: "Nonsense words complete",
      completeDisabledLabel: "Read each nonsense word first",
      completeMessage: "Good work with the nonsense words.",
    },
  },
  conceptDemo: {
    ...K3_COPY.conceptDemo,
    mainPair: "Focus pair",
    practicePair: "Practice pair",
    completeLabel: "Pattern practice complete",
    completeDisabledLabel: "Tap each pair first",
  },
  part3: {
    ...K3_COPY.part3,
    defaultFeedback: "Tap the highlighted word when you are ready. Harper will listen to one word at a time.",
    readWord: "Read {word}.",
    correct: "Good reading — that was {word}.",
    retryPrompt: "Read that one more time.",
    currentInstructionComplete: "Word reading complete. Now try the nonsense words.",
    currentInstructionDefault: "Tap the highlighted word to read it aloud.",
    currentWordInstruction: "Use the highlighted word chip above. The word is the read button.",
    realWordsCompleteLabel: "Words complete: {done}/{total}",
  },
  powerWords: {
    heartKind: "High-utility word",
    vocabularyKind: "Vocabulary word",
    completeLabel: "Words reviewed",
    completeDisabledLabel: "Tap each word first",
  },
  sentenceReading: {
    ...K3_COPY.sentenceReading,
    readingMessage: "Harper is listening while you read. Tap done when you finish.",
    idleMessage: "Tap start when you are ready to read the sentences.",
    harperListen: "I'm listening. Read each sentence aloud when you are ready.",
    harperEncourage: "Good sentence reading.",
  },
  spelling: {
    ...K3_COPY.spelling,
    harperSays: "Word to spell",
    listenToWord: "Hear word {index}",
    inputPlaceholder: "type the word",
    correctFeedback: "That matches.",
    retryFeedback: "Keep building the word you hear.",
  },
  storyReading: {
    ...K3_COPY.storyReading,
    storyLabel: "Passage",
    listenFirstHarper: "Listen first. Then read the passage on your own.",
    afterListenHarper: "Now read the passage on your own when you are ready.",
    readOnOwnHarper: "I'm listening. Read the passage in your own voice.",
    finishEncourage: "Good passage reading.",
    idleMessage: "Choose listen first, or read the passage on your own.",
  },
  talk: {
    placeholder: "Type a quick note or tell your support person.",
    completeLabel: "Reflection complete",
  },
  placeholder: {
    badge: "Coming in a later lesson-player slice",
    defaultPreview: "This generated part will be wired in a later slice.",
  },
  fallback: {
    ...K3_COPY.fallback,
    part2Speech: "Listen to the focus pattern with Harper.",
    part3Description: "Read the generated word lines with Harper.",
    part5Description: "Read the generated sentences aloud.",
    part7Description: "Listen first or read the generated passage on your own.",
    defaultDescription: "Generated lesson activity.",
  },
};

const COACH_THEME: PresentationTheme = {
  ...K3_THEME,
  layout: {
    showAdultEvidencePanel: false,
    page: "min-h-screen bg-slate-100 px-3 py-4 text-slate-900 md:px-5",
    grid: "mx-auto grid max-w-7xl gap-4 lg:grid-cols-[104px_minmax(0,1fr)]",
  },
  shell: {
    ...K3_THEME.shell,
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
    adultPanel: K3_THEME.shell.adultPanel,
  },
  cards: {
    ...K3_THEME.cards,
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

export function presentationCopyFor(profile?: PresentationProfile | null): PresentationCopy {
  if (profile === "BAND_7_8") return COACH_COPY;
  return K3_COPY;
}

export function presentationThemeFor(profile?: PresentationProfile | null): PresentationTheme {
  if (profile === "BAND_7_8") return COACH_THEME;
  return K3_THEME;
}
