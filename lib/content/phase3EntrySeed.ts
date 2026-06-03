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
    exampleWords: ["boat", "goat", "road", "coat", "oats", "load", "soap", "toast"],
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

export const CONTENT_V3_DAILY_TARGETS = [...PHASE_3_TARGETS, ...PHASE_4_ENTRY_TARGETS];

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
