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
