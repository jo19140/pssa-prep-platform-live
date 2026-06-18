export type ParentHelpTip = {
  plainExplanation: string;
  atHomeAction: string;
};

const GENERIC_TIP: ParentHelpTip = {
  plainExplanation: "This skill is a good place for a little extra practice right now.",
  atHomeAction: "Ask your child to explain their thinking out loud, then praise the evidence they use to support it.",
};

const TIPS: Record<string, ParentHelpTip> = {
  main_idea: {
    plainExplanation: "Main idea work helps your child name what a passage is mostly about.",
    atHomeAction: "After reading a short article, ask, \"What is this mostly about, and which detail proves it?\"",
  },
  inference: {
    plainExplanation: "Inference work helps your child combine text clues with what they already know.",
    atHomeAction: "Pause during reading and ask, \"What can we figure out even though the author did not say it directly?\"",
  },
  text_evidence: {
    plainExplanation: "Text evidence work helps your child point back to exact details that support an answer.",
    atHomeAction: "Ask your child to start answers with, \"I know because the text says...\"",
  },
  vocabulary_in_context: {
    plainExplanation: "Vocabulary-in-context work helps your child use nearby words to understand an unfamiliar word.",
    atHomeAction: "Pick one tricky word and ask what words around it give clues about its meaning.",
  },
  silent_e: {
    plainExplanation: "Silent-e practice helps your child notice how a final e can change a vowel sound.",
    atHomeAction: "Make word pairs like cap/cape or kit/kite and have your child read how the vowel changes.",
  },
  blends: {
    plainExplanation: "Blend practice helps your child read groups of consonant sounds smoothly.",
    atHomeAction: "Point out words with bl, st, or gr and ask your child to stretch then read the sounds together.",
  },
  comprehension: {
    plainExplanation: "Comprehension practice helps your child track meaning across a whole passage.",
    atHomeAction: "After a page, ask your child to retell the most important thing that happened and why it mattered.",
  },
  decoding: {
    plainExplanation: "Decoding practice helps your child connect letters and sound patterns more automatically.",
    atHomeAction: "Choose a short word list and ask your child to read each word, then use one in a sentence.",
  },
  fluency: {
    plainExplanation: "Fluency practice helps reading sound smoother and more confident.",
    atHomeAction: "Have your child reread a favorite paragraph once for accuracy and once for expression.",
  },
  morphology: {
    plainExplanation: "Word-part practice helps your child use prefixes, suffixes, and roots to unlock meaning.",
    atHomeAction: "Pick one longer word and look for a smaller word part that gives a clue.",
  },
  phonemic_awareness: {
    plainExplanation: "Sound awareness helps your child hear and work with the sounds inside spoken words.",
    atHomeAction: "Say a word and ask your child to change one sound, like turning map into mop.",
  },
};

const ALIASES: Record<string, string> = {
  mainidea: "main_idea",
  centralmessage: "main_idea",
  centralidea: "main_idea",
  keyideas: "main_idea",
  inference: "inference",
  inferencing: "inference",
  text_evidence: "text_evidence",
  textevidence: "text_evidence",
  evidence: "text_evidence",
  vocabulary_in_context: "vocabulary_in_context",
  vocabularycontext: "vocabulary_in_context",
  contextclues: "vocabulary_in_context",
  silent_e: "silent_e",
  silente: "silent_e",
  vce: "silent_e",
  blends: "blends",
  consonantblends: "blends",
  comprehension: "comprehension",
  decoding: "decoding",
  fluency: "fluency",
  morphology: "morphology",
  phonemic_awareness: "phonemic_awareness",
  phonemicawareness: "phonemic_awareness",
};

export function parentHelpTipForKey(value: string | null | undefined): ParentHelpTip {
  const normalized = normalizeTipKey(value);
  return normalized ? TIPS[normalized] ?? GENERIC_TIP : GENERIC_TIP;
}

export function normalizeTipKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const direct = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (TIPS[direct]) return direct;
  const compact = direct.replace(/_/g, "");
  return ALIASES[direct] ?? ALIASES[compact] ?? null;
}
