export type Phase3EntryLessonContent = {
  demonstrationPairs: { closed: string; target: string }[];
  contrastiveLine2: string[];
  contrastiveLine3: string[];
  sentences: string[];
  dictatedWords: string[];
  dictatedSentences: string[];
  comprehensionQuestions: { question: string; questionType: string }[];
  heartWordsPreviewedThisLesson: string[];
  heartWordsAssumedKnown: string[];
  vocabulary: string[];
  mockPassageText: string;
  mockPassageTitle: string;
};

const sharedHeartWordsPreviewedThisLesson = ["said", "was", "they"];
const sharedHeartWordsAssumedKnown = ["I", "a", "the", "to"];

export const PHASE_3_ENTRY_LESSON_CONTENT: Record<string, Phase3EntryLessonContent> = {
  a_e: {
    demonstrationPairs: [
      { closed: "cap", target: "cape" },
      { closed: "at", target: "ate" },
      { closed: "man", target: "mane" },
      { closed: "tap", target: "tape" },
      { closed: "hat", target: "hate" },
    ],
    contrastiveLine2: ["cap", "cape", "man", "mane", "tap", "tape", "hat", "hate"],
    contrastiveLine3: ["ran", "lake", "hand", "gave", "fast", "name", "desk"],
    sentences: [
      "Dave made a cake.",
      "The cake is a gift.",
      "Jane came to the lake.",
      "They gave Jane a wave.",
      "\"I made this cake,\" said Dave.",
      "Jane is a pal to Dave.",
    ],
    dictatedWords: ["cake", "made", "lake", "game", "ran", "hand"],
    dictatedSentences: ["Dave made a cake.", "Jane came to the lake."],
    comprehensionQuestions: [
      { question: "Why did Dave make the cake?", questionType: "inference" },
      { question: "What did Jane do when Dave gave her the cake?", questionType: "literal" },
      { question: "Tell me what happened at the lake, in your own words.", questionType: "retell" },
      { question: "What is something you would make for a pal?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["gift", "pal"],
    mockPassageText: `Dave has a cake. The cake is a gift to Jane. Jane came to the lake. Dave gave Jane the cake at the gate. "I made this cake," said Dave. Jane ate the cake. "This cake is the same as that cake," said Jane. They gave a big wave. Dave and Jane had fun. The lake was the best.`,
    mockPassageTitle: "Dave's Cake",
  },
  i_e: {
    demonstrationPairs: [
      { closed: "pin", target: "pine" },
      { closed: "kit", target: "kite" },
      { closed: "rid", target: "ride" },
      { closed: "fin", target: "fine" },
    ],
    contrastiveLine2: ["pin", "pine", "kit", "kite", "rid", "ride", "fin", "fine"],
    contrastiveLine3: ["ran", "lake", "hand", "bike", "fast", "mine", "desk"],
    sentences: [
      "Mike has a bike.",
      "The bike is white.",
      "Mike can ride to the lake.",
      "Jane has the same bike.",
      "\"I like this bike,\" said Mike.",
      "They ride and smile.",
    ],
    dictatedWords: ["bike", "ride", "fine", "mine", "ran", "hand"],
    dictatedSentences: ["Mike has a bike.", "Jane can ride."],
    comprehensionQuestions: [
      { question: "Why does Mike like his bike?", questionType: "inference" },
      { question: "What did Jane do at the lake?", questionType: "literal" },
      { question: "Tell me what happened at the lake in your own words.", questionType: "retell" },
      { question: "What would you ride to a lake?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["bike", "ride"],
    mockPassageText: `Mike has a fine bike. The bike is white. Mike can ride the bike. Mike will ride to the lake. Jane came to ride. "I like this bike," said Mike. Jane has a bike of the same size. They ride and smile. It was a fine time at the lake.`,
    mockPassageTitle: "Mike's Bike",
  },
  o_e: {
    demonstrationPairs: [
      { closed: "not", target: "note" },
      { closed: "rob", target: "robe" },
      { closed: "cod", target: "code" },
      { closed: "hop", target: "hope" },
    ],
    contrastiveLine2: ["not", "note", "rob", "robe", "cod", "code", "hop", "hope"],
    contrastiveLine3: ["ran", "lake", "hand", "home", "fast", "mole", "desk"],
    sentences: [
      "Rose has a home.",
      "The home has a stone gate.",
      "Rose woke and rode to the cove.",
      "Cole came to the cove.",
      "\"I hope to ride,\" said Rose.",
      "A mole dug a hole.",
    ],
    dictatedWords: ["home", "rode", "note", "hope", "ran", "hand"],
    dictatedSentences: ["Rose has a home.", "Cole rode to the cove."],
    comprehensionQuestions: [
      { question: "Why did Rose go to the cove?", questionType: "inference" },
      { question: "What did the mole do?", questionType: "literal" },
      { question: "Tell me about Rose's home in your own words.", questionType: "retell" },
      { question: "What is a place you would like to visit?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["stone", "cove"],
    mockPassageText: `Rose has a home. The home has a stone gate. Rose woke and rode to the cove. Cole came to the home. The cove has a big stone. Rose and Cole sat on the stone. A mole dug a hole. "I hope this home is nice," said Rose. It was a fine time at the cove.`,
    mockPassageTitle: "Rose's Home",
  },
  u_e: {
    demonstrationPairs: [
      { closed: "cub", target: "cube" },
      { closed: "tub", target: "tube" },
      { closed: "cut", target: "cute" },
      { closed: "hug", target: "huge" },
    ],
    contrastiveLine2: ["cub", "cube", "tub", "tube", "cut", "cute", "hug", "huge"],
    contrastiveLine3: ["ran", "lake", "ride", "mule", "fast", "home", "desk"],
    sentences: [
      "June has a cute mule.",
      "The mule is huge.",
      "June can ride the mule.",
      "Luke came to hum a tune.",
      "\"I like this mule,\" said June.",
      "The mule ate a prune.",
    ],
    dictatedWords: ["mule", "tune", "cute", "cube", "ran", "hand"],
    dictatedSentences: ["June has a mule.", "Luke can hum a tune."],
    comprehensionQuestions: [
      { question: "What can June's mule do?", questionType: "literal" },
      { question: "Why does June like the mule?", questionType: "inference" },
      { question: "Tell me what happened with the mule in your own words.", questionType: "retell" },
      { question: "What instrument would you want to play?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["mule", "flute"],
    mockPassageText: `June has a cute mule. The mule is huge. June can ride the mule. June will hum a tune. Luke came to the mule. "I like this cute mule," said June. The mule ate a prune. They sat in the shade. Luke has a flute. It was a fine tune.`,
    mockPassageTitle: "June's Mule",
  },
  e_e: {
    demonstrationPairs: [
      { closed: "pet", target: "Pete" },
      { closed: "them", target: "theme" },
      { closed: "met", target: "mete" },
    ],
    contrastiveLine2: ["pet", "Pete", "them", "theme", "met", "mete"],
    contrastiveLine3: ["ran", "lake", "ride", "home", "scene", "Pete", "desk"],
    sentences: [
      "Pete will compete.",
      "Steve has these.",
      "The scene is set.",
      "Pete and Steve will not stop.",
      "\"I can compete,\" said Pete.",
      "They will complete the game.",
    ],
    dictatedWords: ["theme", "scene", "Pete", "these", "ran", "hand"],
    dictatedSentences: ["Pete will compete.", "Steve has a theme."],
    comprehensionQuestions: [
      { question: "What are Pete and Steve going to do?", questionType: "inference" },
      { question: "What did Steve give Pete?", questionType: "literal" },
      { question: "Tell me what happened in your own words.", questionType: "retell" },
      { question: "What is something you would like to compete in?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["scene", "theme"],
    mockPassageText: `Pete will compete. Steve will compete. Pete has these. Pete has a theme. The scene is set. Pete and Steve will not stop. They will complete the game. Pete will make a plan. Steve will help Pete. "I can compete," said Pete. Steve gave Pete a note. It was a fine scene.`,
    mockPassageTitle: "Pete and Steve",
  },
  vce_mix_ai: {
    demonstrationPairs: [
      { closed: "cap", target: "cape" },
      { closed: "man", target: "mane" },
      { closed: "pin", target: "pine" },
      { closed: "rid", target: "ride" },
    ],
    contrastiveLine2: ["cap", "cape", "man", "mane", "pin", "pine", "rid", "ride"],
    contrastiveLine3: ["ran", "lake", "hand", "bike", "fast", "mine", "desk"],
    sentences: [
      "Dave has a bike.",
      "The bike is white.",
      "Mike can ride to the lake.",
      "Kate gave Dave a kite.",
      "\"I like this bike,\" said Mike.",
      "They ride and smile.",
    ],
    dictatedWords: ["cake", "bike", "ride", "made", "ran", "hand"],
    dictatedSentences: ["Dave has a bike.", "Mike can ride a mile."],
    comprehensionQuestions: [
      { question: "Why does Mike like the bike?", questionType: "inference" },
      { question: "What did Kate do?", questionType: "literal" },
      { question: "Tell me what happened at the lake in your own words.", questionType: "retell" },
      { question: "What would you like to ride?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["bike", "kite"],
    mockPassageText: `Dave has a bike. Mike has a kite. The bike is white. Mike can ride to the lake. Kate came to ride. "I like this bike," said Dave. Dave gave Kate a ride. They ride and smile. It was a fine time at the lake.`,
    mockPassageTitle: "Dave's Bike",
  },
  vce_mix_oue: {
    demonstrationPairs: [
      { closed: "not", target: "note" },
      { closed: "hop", target: "hope" },
      { closed: "cub", target: "cube" },
      { closed: "cut", target: "cute" },
      { closed: "pet", target: "Pete" },
    ],
    contrastiveLine2: ["not", "note", "hop", "hope", "cub", "cube", "cut", "cute"],
    contrastiveLine3: ["ran", "home", "hand", "mule", "fast", "scene", "desk"],
    sentences: [
      "Rose has a home.",
      "June has a cute mule.",
      "The mule is huge.",
      "Pete woke and rode home.",
      "\"I hope to compete,\" said Pete.",
      "They like the scene.",
    ],
    dictatedWords: ["home", "mule", "cute", "note", "ran", "hand"],
    dictatedSentences: ["Rose has a home.", "June has a cute mule."],
    comprehensionQuestions: [
      { question: "What does June have?", questionType: "literal" },
      { question: "Why did Pete go home?", questionType: "inference" },
      { question: "Tell me what happened in your own words.", questionType: "retell" },
      { question: "What would you like to compete in?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["mule", "scene"],
    mockPassageText: `Rose woke at home. June has a cute mule. The mule is huge. Pete rode the mule home. "I hope to compete," said Pete. Rose gave Pete a note. June and Pete like the mule. They sat on a stone. It was a fine scene.`,
    mockPassageTitle: "June's Mule",
  },
  vce_mix_all: {
    demonstrationPairs: [
      { closed: "cap", target: "cape" },
      { closed: "pin", target: "pine" },
      { closed: "hop", target: "hope" },
      { closed: "cub", target: "cube" },
      { closed: "pet", target: "Pete" },
    ],
    contrastiveLine2: ["cap", "cape", "pin", "pine", "hop", "hope", "cub", "cube"],
    contrastiveLine3: ["ran", "lake", "bike", "home", "mule", "Pete", "desk"],
    sentences: [
      "Dave has a bike.",
      "Rose has a cute mule.",
      "Pete rode home.",
      "June came to ride.",
      "\"I like these,\" said Pete.",
      "Mike and Dave like the lake.",
    ],
    dictatedWords: ["cake", "bike", "home", "mule", "ran", "hand"],
    dictatedSentences: ["Dave rode a bike.", "June has a mule."],
    comprehensionQuestions: [
      { question: "What can June ride?", questionType: "literal" },
      { question: "Why does Mike like the bike?", questionType: "inference" },
      { question: "Tell me what happened in your own words.", questionType: "retell" },
      { question: "What would you like to ride?", questionType: "personal_connection" },
    ],
    heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
    vocabulary: ["mule", "note"],
    mockPassageText: `Dave has a bike. Mike rode the bike home. Rose has a cute mule. June came to ride the mule. "I like these," said Pete. Dave gave Pete a note. Mike and June like the lake. They ride and smile. It was a fine scene.`,
    mockPassageTitle: "At the Lake",
  },
};

export function phase3EntryLessonContentFor(dailyTargetCode: string): Phase3EntryLessonContent {
  const content = PHASE_3_ENTRY_LESSON_CONTENT[dailyTargetCode];
  if (!content) throw new Error(`No Phase 3 Entry lesson content configured for ${dailyTargetCode}.`);
  return content;
}
