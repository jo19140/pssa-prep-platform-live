import { Prisma } from "@prisma/client";

export const PHASE_3_ENTRY = {
  phaseNumber: 3,
  subPosition: "ENTRY",
  label: "Phase 3 Entry",
  phonicsTrack:
    "Silent-e vowel-consonant-e patterns introduced as specific daily targets. Instruction stays pattern-specific, beginning with a_e and contrasting only against previously taught closed syllables.",
  morphologyTrack:
    "Early inflection awareness only. Morphology is observed as a diagnostic strand but does not introduce commercial-program word lists or advanced morpheme catalogs in this seed.",
  prerequisites: ["PHASE_2_MID"],
};

export const PHASE_3_MID = {
  phaseNumber: 3,
  subPosition: "MID",
  label: "Phase 3 Mid",
  phonicsTrack:
    "Mixed silent-e consolidation across previously introduced vowel-consonant-e daily targets. Instruction stays inside VCe patterns only.",
  morphologyTrack:
    "No new morphology target. Phase 3 Mid consolidates phonics transfer before later morphology expansion.",
  prerequisites: ["PHASE_3_ENTRY"],
};

export const PHASE_4_ENTRY = {
  phaseNumber: 4,
  subPosition: "ENTRY",
  label: "Phase 4 Entry",
  phonicsTrack:
    "Long-vowel team entry targets grouped by sound. Instruction introduces ai/ay, ee/ea, oa, and igh as specific daily targets while preserving Phase 3 VCe behavior.",
  morphologyTrack:
    "No new morphology target. Phase 4 Entry expands phonics transfer into long-vowel teams before r-controlled and diphthong expansion.",
  prerequisites: ["PHASE_3_MID"],
};

export const PHASE_4_MID = {
  phaseNumber: 4,
  subPosition: "MID",
  label: "Phase 4 Mid",
  phonicsTrack:
    "Same-sound long-vowel consolidation: each target groups the VCe spelling with the vowel-team spellings of one long vowel (a_e/ai/ay, e_e/ee/ea, o_e/oa, i_e/igh).",
  morphologyTrack: "No new morphology target.",
  prerequisites: ["PHASE_4_ENTRY"],
};

export const PHASE_4_RCONTROLLED = {
  phaseNumber: 4,
  subPosition: "RCONTROLLED",
  label: "Phase 4 R-Controlled Entry",
  phonicsTrack:
    "R-controlled vowel entry: ar and or as distinct sounds, then er/ir/ur as three spellings of the same r-controlled sound.",
  morphologyTrack: "No new morphology target.",
  prerequisites: ["PHASE_4_MID"],
};

export const PHASE_4_DIPHTHONG = {
  phaseNumber: 4,
  subPosition: "DIPHTHONG",
  label: "Phase 4 Diphthong Entry",
  phonicsTrack:
    "Diphthongs and ambiguous vowels: oi/oy and ou/ow gliding vowels, the two sounds of oo, and au/aw as one broad-a sound with two spellings.",
  morphologyTrack: "No new morphology target.",
  prerequisites: ["PHASE_4_RCONTROLLED"],
};

export const PHASE_4_TEAMS_CLEANUP = {
  phaseNumber: 4,
  subPosition: "TEAMS_CLEANUP",
  label: "Phase 4 Teams Cleanup",
  phonicsTrack:
    "Cleanup of the deferred ambiguous vowel teams: ow as long o, ew and ue as long u, and the two sounds of ie.",
  morphologyTrack: "No new morphology target.",
  prerequisites: ["PHASE_4_DIPHTHONG"],
};

export const PHASE_4_MORPHOLOGY = {
  phaseNumber: 4,
  subPosition: "MORPHOLOGY",
  label: "Phase 4 Morphology Entry A",
  phonicsTrack:
    "No new phonics target; morphology applies suffix spelling rules to already-taught stems.",
  morphologyTrack:
    "Suffix spelling changes: drop final e before a vowel suffix; double the final consonant of a short-vowel stem before a vowel suffix. Suffixes -ing, -ed, -s, -es.",
  prerequisites: ["PHASE_4_TEAMS_CLEANUP"],
};

export const PHASE_4_MORPHOLOGY_Y_TO_I = {
  phaseNumber: 4,
  subPosition: "MORPHOLOGY_Y_TO_I",
  label: "Phase 4 Morphology y to i",
  phonicsTrack:
    "No new phonics target; applies the y-to-i spelling rule to already-taught final-y long-i stems.",
  morphologyTrack: "Change y to i before -ed and -es; keep y before -ing.",
  prerequisites: ["PHASE_4_MORPHOLOGY"],
};

export type DailyTargetSeed = {
  code: string;
  kidVisibleLabel: string;
  tutorLabel: string;
  description: string;
  introductionOrder: number;
  targetPatternsJson: Prisma.InputJsonValue;
  allowedPatternCodes: string[];
  blockedPatternCodes: string[];
  exampleWords: string[];
  exampleNonwords: string[];
};

export const PHASE_3_ENTRY_TARGETS: DailyTargetSeed[] = [
  {
    code: "a_e",
    kidVisibleLabel: "a_e words",
    tutorLabel: "a_e silent-e pattern",
    description: "Specific daily target for a_e words where silent e helps a say its name.",
    introductionOrder: 1,
    targetPatternsJson: { patterns: ["a_e"], vowelLetter: "a", graphemes: ["a_e"] },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"],
    blockedPatternCodes: ["i_e", "o_e", "u_e", "e_e", "ai", "ay", "oa", "ee"],
    exampleWords: ["cake", "game", "make", "same", "tape"],
    // 8 nonwords so Part 3 line 4 meets the 8-10 pseudoword count gate. All pass pseudowordValidator
    // (a_e only, not real words, no homophone/near-spelling collisions).
    exampleNonwords: ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"],
  },
  {
    code: "i_e",
    kidVisibleLabel: "i_e words",
    tutorLabel: "i_e silent-e pattern",
    description: "Specific daily target for i_e words where silent e helps i say its name.",
    introductionOrder: 2,
    targetPatternsJson: { patterns: ["i_e"], vowelLetter: "i", graphemes: ["i_e"] },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e"],
    blockedPatternCodes: ["o_e", "u_e", "e_e", "igh", "ie", "oa", "ee"],
    exampleWords: ["bike", "time", "line", "five", "ride"],
    exampleNonwords: ["zibe", "mide", "fime", "pive", "wibe", "jite", "vime", "nibe"],
  },
  {
    code: "o_e",
    kidVisibleLabel: "o_e words",
    tutorLabel: "o_e silent-e pattern",
    description: "Specific daily target for o_e words where silent e helps o say its name.",
    introductionOrder: 3,
    targetPatternsJson: { patterns: ["o_e"], vowelLetter: "o", graphemes: ["o_e"] },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e", "i_e"],
    blockedPatternCodes: ["u_e", "e_e", "oa", "ow", "oe", "ai", "ay"],
    exampleWords: ["home", "rope", "joke", "note", "stone"],
    exampleNonwords: ["zome", "fope", "bofe", "nofe", "vone", "wode", "zode", "lote"],
  },
  {
    code: "u_e",
    kidVisibleLabel: "u_e words",
    tutorLabel: "u_e silent-e pattern",
    description: "Specific daily target for u_e words where silent e helps u say its name.",
    introductionOrder: 4,
    targetPatternsJson: { patterns: ["u_e"], vowelLetter: "u", graphemes: ["u_e"] },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e", "i_e", "o_e"],
    blockedPatternCodes: ["e_e", "ue", "ew", "oo", "oa", "ai", "ay"],
    exampleWords: ["cube", "mule", "cute", "tune", "flute"],
    exampleNonwords: ["mune", "plute", "vune", "zune", "gube", "mube", "nube", "pude"],
  },
  {
    code: "e_e",
    kidVisibleLabel: "e_e words",
    tutorLabel: "e_e silent-e pattern",
    description: "Specific daily target for e_e words where silent e helps e say its name.",
    introductionOrder: 5,
    targetPatternsJson: { patterns: ["e_e"], vowelLetter: "e", graphemes: ["e_e"] },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e", "i_e", "o_e", "u_e"],
    blockedPatternCodes: ["ee", "ea", "y_final", "ai", "ay", "oa", "ue"],
    exampleWords: ["these", "theme", "eve", "complete", "delete"],
    exampleNonwords: ["pheme", "zede", "gete", "kete", "nepe", "zene", "gede", "hefe"],
  },
];

const phase3MidAllowedPatternCodes = [
  "closed_short_a",
  "closed_short_i",
  "closed_short_o",
  "closed_short_u",
  "closed_short_e",
];

const phase3MidBlockedPatternCodes = ["ai", "ay", "oa", "ow", "oe", "ee", "ea", "igh", "ie", "ue", "ew", "y_final"];

function phase3MidAllowedPatterns(targetPatterns: string[]) {
  return [...phase3MidAllowedPatternCodes, ...["a_e", "i_e", "o_e", "u_e", "e_e"].filter((pattern) => !targetPatterns.includes(pattern))];
}

export const PHASE_3_MID_TARGETS: DailyTargetSeed[] = [
  {
    code: "vce_mix_ai",
    kidVisibleLabel: "a_e and i_e words",
    tutorLabel: "Mixed a_e and i_e silent-e consolidation",
    description: "Consolidation target for reading and spelling mixed a_e and i_e VCe words.",
    introductionOrder: 6,
    targetPatternsJson: { patterns: ["a_e", "i_e"] },
    allowedPatternCodes: phase3MidAllowedPatterns(["a_e", "i_e"]),
    blockedPatternCodes: phase3MidBlockedPatternCodes,
    exampleWords: ["cake", "bike", "lake", "time", "ride"],
    exampleNonwords: ["zake", "pame", "vade", "sape", "zibe", "mide", "fime", "pive"],
  },
  {
    code: "vce_mix_oue",
    kidVisibleLabel: "o_e, u_e, and e_e words",
    tutorLabel: "Mixed o_e, u_e, and e_e silent-e consolidation",
    description: "Consolidation target for reading and spelling mixed o_e, u_e, and e_e VCe words.",
    introductionOrder: 7,
    targetPatternsJson: { patterns: ["o_e", "u_e", "e_e"] },
    allowedPatternCodes: phase3MidAllowedPatterns(["o_e", "u_e", "e_e"]),
    blockedPatternCodes: phase3MidBlockedPatternCodes,
    exampleWords: ["home", "mule", "note", "cute", "scene"],
    exampleNonwords: ["zome", "fope", "bofe", "mune", "plute", "vune", "pheme", "zede"],
  },
  {
    code: "vce_mix_all",
    kidVisibleLabel: "silent-e review",
    tutorLabel: "Mixed all silent-e VCe consolidation",
    description: "Consolidation target for reading and spelling all five introduced VCe patterns.",
    introductionOrder: 8,
    targetPatternsJson: { patterns: ["a_e", "i_e", "o_e", "u_e", "e_e"] },
    allowedPatternCodes: phase3MidAllowedPatterns(["a_e", "i_e", "o_e", "u_e", "e_e"]),
    blockedPatternCodes: phase3MidBlockedPatternCodes,
    exampleWords: ["cake", "bike", "home", "mule", "Pete"],
    exampleNonwords: ["zake", "pame", "zibe", "mide", "zome", "fope", "mune", "pheme"],
  },
];

export const PHASE_3_TARGETS = [...PHASE_3_ENTRY_TARGETS, ...PHASE_3_MID_TARGETS];

const phase4EntryAllowedPatternCodes = [
  "closed_short_a",
  "closed_short_i",
  "closed_short_o",
  "closed_short_u",
  "closed_short_e",
  "a_e",
  "i_e",
  "o_e",
  "u_e",
  "e_e",
];

const phase4EntryBlockedPatternCodes = [
  "team_ai",
  "team_ay",
  "team_ee",
  "team_ea",
  "team_oa",
  "team_ow",
  "team_igh",
  "team_ew",
  "team_ue",
  "team_ie_long_i",
  "team_ie_long_e",
  "team_oo_long",
  "team_oo_short",
  "diph_ow",
  "diph_ou",
  "diph_oi",
  "diph_oy",
  "r_ar",
  "r_er",
  "r_ir",
  "r_or",
  "r_ur",
];

function blockedExcept(targetPatterns: string[]) {
  return phase4EntryBlockedPatternCodes.filter((pattern) => !targetPatterns.includes(pattern));
}

export const PHASE_4_ENTRY_TARGETS: DailyTargetSeed[] = [
  {
    code: "team_ai_ay",
    kidVisibleLabel: "long a team words",
    tutorLabel: "Long a teams: ai and ay",
    description: "Phase 4 Entry target for long a vowel-team words spelled ai or ay.",
    introductionOrder: 9,
    targetPatternsJson: { patterns: ["team_ai", "team_ay"], pseudowordPatterns: ["team_ai"], graphemes: ["ai", "ay"], sound: "long_a" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["team_ai", "team_ay"]),
    exampleWords: ["rain", "wait", "mail", "paid", "play", "stay", "day", "gray"],
    exampleNonwords: ["zaib", "vaib", "jaib", "maig", "naid", "paib", "saib", "taib"],
  },
  {
    code: "team_ee_ea",
    kidVisibleLabel: "long e team words",
    tutorLabel: "Long e teams: ee and ea",
    description: "Phase 4 Entry target for long e vowel-team words spelled ee or ea.",
    introductionOrder: 10,
    targetPatternsJson: { patterns: ["team_ee", "team_ea"], pseudowordPatterns: ["team_ee", "team_ea"], graphemes: ["ee", "ea"], sound: "long_e" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["team_ee", "team_ea"]),
    exampleWords: ["see", "feet", "green", "deep", "sea", "seat", "read", "team"],
    exampleNonwords: ["zeed", "veeb", "jeeb", "meeb", "zead", "veab", "jeab", "meab"],
  },
  {
    code: "team_oa",
    kidVisibleLabel: "oa words",
    tutorLabel: "Long o team: oa",
    description: "Phase 4 Entry target for long o vowel-team words spelled oa only.",
    introductionOrder: 11,
    targetPatternsJson: { patterns: ["team_oa"], pseudowordPatterns: ["team_oa"], graphemes: ["oa"], sound: "long_o" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["team_oa"]),
    exampleWords: ["boat", "goat", "road", "coat", "foam", "load", "soap", "toast"],
    exampleNonwords: ["zoab", "voab", "joad", "moag", "noab", "poab", "soab", "toag"],
  },
  {
    code: "team_igh",
    kidVisibleLabel: "igh words",
    tutorLabel: "Long i team: igh",
    description: "Phase 4 Entry target for long i vowel-team words spelled igh.",
    introductionOrder: 12,
    targetPatternsJson: { patterns: ["team_igh"], pseudowordPatterns: ["team_igh"], graphemes: ["igh"], sound: "long_i" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["team_igh"]),
    exampleWords: ["light", "night", "bright", "fight", "might", "sight", "high", "tight"],
    exampleNonwords: ["zighb", "vighg", "jighd", "mighb", "nighb", "pighb", "sighg", "tighb"],
  },
];

function phase4MidAllowedPatterns(targetPatterns: string[]) {
  return [
    "closed_short_a",
    "closed_short_i",
    "closed_short_o",
    "closed_short_u",
    "closed_short_e",
    ...["a_e", "i_e", "o_e", "u_e", "e_e"].filter((pattern) => !targetPatterns.includes(pattern)),
  ];
}

export const PHASE_4_MID_TARGETS: DailyTargetSeed[] = [
  {
    code: "consolidate_long_a",
    kidVisibleLabel: "long a spellings",
    tutorLabel: "Long a consolidation: a_e, ai, ay",
    description: "Phase 4 Mid target consolidating long a spellings a_e, ai, and ay.",
    introductionOrder: 13,
    targetPatternsJson: {
      patterns: ["a_e", "team_ai", "team_ay"],
      pseudowordPatterns: ["a_e", "team_ai"],
      graphemes: ["a_e", "ai", "ay"],
      sound: "long_a",
    },
    allowedPatternCodes: phase4MidAllowedPatterns(["a_e", "team_ai", "team_ay"]),
    blockedPatternCodes: blockedExcept(["a_e", "team_ai", "team_ay"]),
    exampleWords: ["cake", "rain", "play", "made", "day", "wait", "gray", "lake"],
    exampleNonwords: ["zake", "pame", "vade", "sape", "zaib", "vaib", "naid", "paib"],
  },
  {
    code: "consolidate_long_e",
    kidVisibleLabel: "long e spellings",
    tutorLabel: "Long e consolidation: e_e, ee, ea",
    description: "Phase 4 Mid target consolidating long e spellings e_e, ee, and ea.",
    introductionOrder: 14,
    targetPatternsJson: {
      patterns: ["e_e", "team_ee", "team_ea"],
      pseudowordPatterns: ["e_e", "team_ee", "team_ea"],
      graphemes: ["e_e", "ee", "ea"],
      sound: "long_e",
    },
    allowedPatternCodes: phase4MidAllowedPatterns(["e_e", "team_ee", "team_ea"]),
    blockedPatternCodes: blockedExcept(["e_e", "team_ee", "team_ea"]),
    exampleWords: ["Pete", "green", "sea", "these", "feet", "eat", "team", "keep"],
    exampleNonwords: ["pheme", "zede", "zeed", "veeb", "jeeb", "zead", "veab", "jeab"],
  },
  {
    code: "consolidate_long_o",
    kidVisibleLabel: "long o spellings",
    tutorLabel: "Long o consolidation: o_e, oa",
    description: "Phase 4 Mid target consolidating long o spellings o_e and oa.",
    introductionOrder: 15,
    targetPatternsJson: {
      patterns: ["o_e", "team_oa"],
      pseudowordPatterns: ["o_e", "team_oa"],
      graphemes: ["o_e", "oa"],
      sound: "long_o",
    },
    allowedPatternCodes: phase4MidAllowedPatterns(["o_e", "team_oa"]),
    blockedPatternCodes: blockedExcept(["o_e", "team_oa"]),
    exampleWords: ["home", "boat", "note", "road", "rope", "goat", "soap", "hose"],
    exampleNonwords: ["zome", "fope", "nofe", "vone", "zoab", "voab", "joad", "moag"],
  },
  {
    code: "consolidate_long_i",
    kidVisibleLabel: "long i spellings",
    tutorLabel: "Long i consolidation: i_e, igh",
    description: "Phase 4 Mid target consolidating long i spellings i_e and igh.",
    introductionOrder: 16,
    targetPatternsJson: {
      patterns: ["i_e", "team_igh"],
      pseudowordPatterns: ["i_e", "team_igh"],
      graphemes: ["i_e", "igh"],
      sound: "long_i",
    },
    allowedPatternCodes: phase4MidAllowedPatterns(["i_e", "team_igh"]),
    blockedPatternCodes: blockedExcept(["i_e", "team_igh"]),
    exampleWords: ["ride", "light", "time", "night", "fine", "bright", "bike", "high"],
    exampleNonwords: ["zibe", "mide", "fime", "pive", "zighb", "vighg", "jighd", "mighb"],
  },
];

export const PHASE_4_RCONTROLLED_TARGETS: DailyTargetSeed[] = [
  {
    code: "r_controlled_ar",
    kidVisibleLabel: "ar words",
    tutorLabel: "R-controlled ar: car, park, farm",
    description: "Phase 4 R-Controlled Entry target for ar words.",
    introductionOrder: 17,
    targetPatternsJson: { patterns: ["r_ar"], pseudowordPatterns: ["r_ar"], graphemes: ["ar"], sound: "r_controlled_ar" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["r_ar"]),
    exampleWords: ["car", "park", "barn", "farm", "star", "dark", "hard", "yard"],
    exampleNonwords: ["zarb", "varn", "jarm", "marb", "narp", "sarb", "parn", "tarb"],
  },
  {
    code: "r_controlled_or",
    kidVisibleLabel: "or words",
    tutorLabel: "R-controlled or: corn, fork, storm",
    description: "Phase 4 R-Controlled Entry target for or words.",
    introductionOrder: 18,
    targetPatternsJson: { patterns: ["r_or"], pseudowordPatterns: ["r_or"], graphemes: ["or"], sound: "r_controlled_or" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["r_or"]),
    exampleWords: ["corn", "fork", "storm", "horn", "north", "porch", "short", "fort"],
    exampleNonwords: ["vorm", "zorb", "jorm", "morb", "norp", "torb", "dorb", "lorm"],
  },
  {
    code: "r_controlled_er_ir_ur",
    kidVisibleLabel: "er, ir, and ur words",
    tutorLabel: "R-controlled er/ir/ur: her, bird, turn",
    description: "Phase 4 R-Controlled Entry target for er, ir, and ur words.",
    introductionOrder: 19,
    targetPatternsJson: {
      patterns: ["r_er", "r_ir", "r_ur"],
      pseudowordPatterns: ["r_er", "r_ir", "r_ur"],
      graphemes: ["er", "ir", "ur"],
      sound: "r_controlled_er",
    },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: blockedExcept(["r_er", "r_ir", "r_ur"]),
    exampleWords: ["her", "bird", "turn", "fern", "girl", "curb", "first", "burn"],
    exampleNonwords: ["nerb", "zerb", "derm", "jirt", "virn", "nirt", "murb", "gurb"],
  },
];

const phase4DiphthongBlockedPatternCodes = [
  "team_ai",
  "team_ay",
  "team_ee",
  "team_ea",
  "team_oa",
  "team_ow",
  "team_igh",
  "team_ew",
  "team_ue",
  "team_ie_long_i",
  "team_ie_long_e",
  "team_oo_long",
  "team_oo_short",
  "team_au",
  "team_aw",
  "diph_oi",
  "diph_oy",
  "diph_ou",
  "diph_ow",
  "r_ar",
  "r_or",
  "r_er",
  "r_ir",
  "r_ur",
];

function diphthongBlockedExcept(targetPatterns: string[]) {
  return phase4DiphthongBlockedPatternCodes.filter((pattern) => !targetPatterns.includes(pattern));
}

export const PHASE_4_DIPHTHONG_TARGETS: DailyTargetSeed[] = [
  {
    code: "diph_oi_oy",
    kidVisibleLabel: "oi and oy words",
    tutorLabel: "Diphthong oi/oy: coin, boy",
    description: "Phase 4 Diphthong Entry target for oi and oy words.",
    introductionOrder: 20,
    targetPatternsJson: { patterns: ["diph_oi", "diph_oy"], pseudowordPatterns: ["diph_oi", "diph_oy"], graphemes: ["oi", "oy"], sound: "diphthong_oi_oy" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["diph_oi", "diph_oy"]),
    exampleWords: ["coin", "boy", "oil", "joy", "soil", "toy", "join", "point"],
    exampleNonwords: ["zoit", "voib", "noib", "foid", "zoy", "voy", "snoy", "gloy"],
  },
  {
    code: "diph_ou_ow",
    kidVisibleLabel: "ou and ow words",
    tutorLabel: "Diphthong ou/ow: out, town",
    description: "Phase 4 Diphthong Entry target for ou and ow words.",
    introductionOrder: 21,
    targetPatternsJson: { patterns: ["diph_ou", "diph_ow"], pseudowordPatterns: ["diph_ou", "diph_ow"], graphemes: ["ou", "ow"], sound: "diphthong_ou_ow" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["diph_ou", "diph_ow"]),
    exampleWords: ["out", "town", "loud", "down", "found", "cow", "shout", "owl"],
    exampleNonwords: ["zoud", "vout", "noud", "foud", "zown", "fown", "plown", "vown"],
  },
  {
    code: "oo_both",
    kidVisibleLabel: "oo words",
    tutorLabel: "Two sounds of oo: moon and book",
    description: "Phase 4 Diphthong Entry target for the two common sounds of oo.",
    introductionOrder: 22,
    targetPatternsJson: { patterns: ["team_oo_long", "team_oo_short"], pseudowordPatterns: ["team_oo_short", "team_oo_long"], graphemes: ["oo"], sound: "oo_long_short" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["team_oo_long", "team_oo_short"]),
    exampleWords: ["moon", "book", "soon", "look", "food", "good", "boot", "foot"],
    exampleNonwords: ["zoon", "voom", "zood", "noof", "vook", "dook", "vood", "tood"],
  },
  {
    code: "diph_au_aw",
    kidVisibleLabel: "au and aw words",
    tutorLabel: "Vowel au/aw: haul, saw",
    description: "Phase 4 Diphthong Entry target for broad-a au and aw words.",
    introductionOrder: 23,
    targetPatternsJson: { patterns: ["team_au", "team_aw"], pseudowordPatterns: ["team_au", "team_aw"], graphemes: ["au", "aw"], sound: "broad_a_au_aw" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["team_au", "team_aw"]),
    exampleWords: ["saw", "haul", "paw", "fault", "lawn", "draw", "dawn", "yawn"],
    exampleNonwords: ["zaul", "vaul", "naul", "jaul", "zaw", "snaw", "blaw", "glaw"],
  },
];

export const PHASE_4_TEAMS_CLEANUP_TARGETS: DailyTargetSeed[] = [
  {
    code: "team_ow",
    kidVisibleLabel: "ow as in snow",
    tutorLabel: "Vowel team ow: snow, grow, show",
    description: "Phase 4 Teams Cleanup target for long o spelled ow.",
    introductionOrder: 24,
    targetPatternsJson: { patterns: ["team_ow"], pseudowordPatterns: ["team_ow"], graphemes: ["ow"], sound: "long_o_ow" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["team_ow"]),
    exampleWords: ["snow", "grow", "show", "low", "own", "glow", "slow", "blow"],
    exampleNonwords: ["zow", "thow", "smow", "drow", "zowl", "vowl", "blowl", "zowm"],
  },
  {
    code: "team_ew_ue",
    kidVisibleLabel: "ew and ue words",
    tutorLabel: "Long u teams ew/ue: new, blue",
    description: "Phase 4 Teams Cleanup target for long u spelled ew or ue.",
    introductionOrder: 25,
    targetPatternsJson: { patterns: ["team_ew", "team_ue"], pseudowordPatterns: ["team_ew", "team_ue"], graphemes: ["ew", "ue"], sound: "long_u_ew_ue" },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["team_ew", "team_ue"]),
    exampleWords: ["new", "blue", "few", "true", "grew", "clue", "chew", "glue"],
    exampleNonwords: ["vew", "snew", "twew", "swew", "frue", "smue", "spue", "snue"],
  },
  {
    code: "team_ie_both",
    kidVisibleLabel: "two sounds for ie",
    tutorLabel: "Two sounds of ie: pie and field",
    description: "Phase 4 Teams Cleanup target for the two common sounds of ie.",
    introductionOrder: 26,
    targetPatternsJson: {
      patterns: ["team_ie_long_i", "team_ie_long_e"],
      pseudowordPatterns: ["team_ie_long_i", "team_ie_long_e"],
      graphemes: ["ie"],
      sound: "ie_long_i_long_e",
    },
    allowedPatternCodes: phase4EntryAllowedPatternCodes,
    blockedPatternCodes: diphthongBlockedExcept(["team_ie_long_i", "team_ie_long_e"]),
    exampleWords: ["pie", "field", "tie", "chief", "brief", "shield", "niece", "lie"],
    exampleNonwords: ["zie", "blie", "snie", "grie", "vief", "zief", "glief", "sniel"],
  },
];

export const PHASE_4_MORPHOLOGY_TARGETS: DailyTargetSeed[] = [
  {
    code: "morph_drop_e",
    kidVisibleLabel: "drop the e",
    tutorLabel: "Drop-e rule: hope → hoping, make → making",
    description: "Phase 4 Morphology Entry A target for dropping final e before vowel suffixes.",
    introductionOrder: 27,
    targetPatternsJson: {
      patterns: ["a_e", "i_e", "o_e", "u_e"],
      pseudowordPatterns: ["a_e", "i_e", "o_e", "u_e"],
      graphemes: ["a_e", "i_e", "o_e", "u_e"],
      sound: "morph_drop_e",
      morphologyJson: { rule: "drop_e", stemPatterns: ["a_e", "i_e", "o_e", "u_e"], suffixes: ["ing", "ed", "s", "es"] },
    },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "e_e"],
    blockedPatternCodes: diphthongBlockedExcept([]),
    exampleWords: ["hope", "make", "ride", "use", "bake", "smile", "skate", "slide"],
    exampleNonwords: ["zame", "tabe", "jide", "mive", "bime", "zote", "vope", "fute"],
  },
  {
    code: "morph_double",
    kidVisibleLabel: "double the last letter",
    tutorLabel: "Doubling rule: run → running, hop → hopped",
    description: "Phase 4 Morphology Entry A target for doubling the final consonant before vowel suffixes.",
    introductionOrder: 28,
    targetPatternsJson: {
      patterns: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"],
      pseudowordPatterns: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"],
      graphemes: ["a", "i", "o", "u", "e"],
      sound: "morph_double",
      morphologyJson: { rule: "double", stemPatterns: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"], suffixes: ["ing", "ed", "s", "es"] },
    },
    allowedPatternCodes: ["a_e", "i_e", "o_e", "u_e", "e_e"],
    blockedPatternCodes: diphthongBlockedExcept([]),
    exampleWords: ["run", "sit", "hop", "grab", "sled", "hug", "win", "swim"],
    exampleNonwords: ["zat", "vit", "jop", "gub", "zet", "mip", "fim", "nuv"],
  },
];

export const PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS: DailyTargetSeed[] = [
  {
    code: "morph_y_to_i",
    kidVisibleLabel: "change y to i",
    tutorLabel: "y to i rule: cry → cried, fly → flies",
    description: "Phase 4 Morphology target for changing final y to i before -ed and -es while keeping y before -ing.",
    introductionOrder: 29,
    targetPatternsJson: {
      patterns: ["y_long_i"],
      pseudowordPatterns: ["y_long_i"],
      graphemes: ["y"],
      sound: "morph_y_to_i",
      morphologyJson: { rule: "y_to_i", stemPatterns: ["y_long_i"], suffixes: ["ed", "es", "ing"] },
    },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e", "i_e", "o_e", "u_e", "e_e"],
    blockedPatternCodes: [
      "team_ai",
      "team_ay",
      "team_ee",
      "team_ea",
      "team_oa",
      "team_igh",
      "team_ew",
      "team_ue",
      "team_ie_long_i",
      "team_ie_long_e",
      "team_ow",
      "team_oo_long",
      "team_oo_short",
      "team_au",
      "team_aw",
      "diph_oi",
      "diph_oy",
      "diph_ou",
      "diph_ow",
      "r_ar",
      "r_or",
      "r_er",
      "r_ir",
      "r_ur",
    ],
    exampleWords: ["cry", "try", "fly", "dry", "spy", "fry", "shy", "sky"],
    exampleNonwords: ["cly", "sny", "gly", "zy", "smy", "vry", "zby", "gry"],
  },
];

export const CONTENT_V3_DAILY_TARGETS = [
  ...PHASE_3_TARGETS,
  ...PHASE_4_ENTRY_TARGETS,
  ...PHASE_4_MID_TARGETS,
  ...PHASE_4_RCONTROLLED_TARGETS,
  ...PHASE_4_DIPHTHONG_TARGETS,
  ...PHASE_4_TEAMS_CLEANUP_TARGETS,
  ...PHASE_4_MORPHOLOGY_TARGETS,
  ...PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS,
];

export const NDL_LICENSE_ATTRIBUTION = {
  sourceCode: "NDL",
  sourceName: "New Dolch List 1.1 lemmatized-for-teaching",
  licenseCode: "CC_BY_SA_4_0",
  attributionText:
    "New Dolch List 1.1 from the New General Service List Project, used under CC BY-SA 4.0. Attribution must remain in product credits and adapted redistributed list content carries the same license.",
  sourceUrl: "https://www.newgeneralservicelist.com/",
  commercialUseAllowed: true,
  shareAlikeRequired: true,
  notes: "Canonical high-frequency word source for Reading Buddy content v3.",
};
