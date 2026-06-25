import type { EnabledLessonPlayerData, LessonPlayerPart } from "@/components/literacy/lessonPlayerData";

type CoachLessonStepBase = {
  id: string;
  partNumber: number;
  partLocalIndex: number;
  partLocalTotal: number;
  taskLocalIndex: number;
  taskLocalTotal: number;
};

export type CoachLessonStep = CoachLessonStepBase & (
  | { kind: "warmup_word"; payload: { word: string; sourceIndex: number } }
  | { kind: "rule"; payload: { statement: string } }
  | { kind: "demo_pair"; payload: { before: string; after: string; pairIndex: number } }
  | {
      kind: "real_word";
      payload: {
        word: string;
        lineNumber: number;
        role: RealWordLineRole;
        lineWordIndex: number;
        realWordIndex: number;
      };
    }
  | { kind: "nonsense_word"; payload: { word: string; wordIndex: number } }
  | { kind: "power_word"; payload: { word: string; group: "heart" | "vocab"; index: number } }
  | { kind: "sentence"; payload: { text: string; index: number } }
  | { kind: "spell_word"; payload: { word: string; index: number } }
  | {
      kind: "passage";
      payload: {
        title: string;
        text: string;
        listenFirstAllowed: boolean;
        readOnOwnAllowed: boolean;
      };
    }
  | { kind: "reflect"; payload: { question: string; questionType: string; index: number } }
);

type RealWordLineRole = "target_real_words" | "contrastive_target_vs_review" | "cumulative_review";

const EXPECTED_PART_TYPES = [
  "CUMULATIVE_CODE_REVIEW",
  "EXPLICIT_TARGET_INSTRUCTION",
  "WORD_LEVEL_DECODING",
  "HFW_VOCAB",
  "SENTENCE_READING",
  "ENCODING_SPELLING",
  "CONNECTED_TEXT_READING",
  "COMPREHENSION_LANGUAGE_EXTENSION",
] as const;

const EXPECTED_PART3_LINES: Array<{ lineNumber: number; role: RealWordLineRole | "target_pseudowords" }> = [
  { lineNumber: 1, role: "target_real_words" },
  { lineNumber: 2, role: "contrastive_target_vs_review" },
  { lineNumber: 3, role: "cumulative_review" },
  { lineNumber: 4, role: "target_pseudowords" },
];

export function buildCoachLessonSteps(lesson: EnabledLessonPlayerData): CoachLessonStep[] {
  const parts = requireParts(lesson.parts);

  return [
    ...buildWarmupSteps(parts[0]),
    ...buildConceptSteps(parts[1]),
    ...buildWordReadingSteps(parts[2]),
    ...buildPowerWordSteps(parts[3]),
    ...buildSentenceSteps(parts[4]),
    ...buildSpellingSteps(parts[5]),
    ...buildPassageSteps(parts[6]),
    ...buildReflectSteps(parts[7]),
  ];
}

function requireParts(parts: LessonPlayerPart[]): LessonPlayerPart[] {
  if (!Array.isArray(parts) || parts.length !== EXPECTED_PART_TYPES.length) {
    throw new Error(`lesson.parts must contain exactly ${EXPECTED_PART_TYPES.length} parts`);
  }

  parts.forEach((part, index) => {
    const where = `lesson.parts[${index}]`;
    const expectedPartNumber = index + 1;
    if (part.partNumber !== expectedPartNumber) {
      throw new Error(`${where}.partNumber must be ${expectedPartNumber}`);
    }
    if (part.partType !== EXPECTED_PART_TYPES[index]) {
      throw new Error(`${where}.partType must be ${EXPECTED_PART_TYPES[index]}`);
    }
  });

  return parts;
}

function buildWarmupSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const words = requireStringArray(part.contentJson.warmupWords, "part1.contentJson.warmupWords");
  return words.map((word, index) => ({
    id: `part1:warmup:${index}`,
    kind: "warmup_word",
    ...base(part.partNumber, index, words.length, index, words.length),
    payload: { word, sourceIndex: index },
  }));
}

function buildConceptSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const demoMode = requireNonEmptyString(part.contentJson.demoMode, "part2.contentJson.demoMode");
  if (demoMode !== "minimal_pairs") {
    throw new Error(`part2.contentJson.demoMode must be minimal_pairs`);
  }

  const statement = requireNonEmptyString(part.contentJson.kidRuleStatement, "part2.contentJson.kidRuleStatement");
  const pairs = requireRecordArray(part.contentJson.demonstrationPairs, "part2.contentJson.demonstrationPairs");
  const partLocalTotal = pairs.length + 1;
  const steps: CoachLessonStep[] = [
    {
      id: "part2:rule",
      kind: "rule",
      ...base(part.partNumber, 0, partLocalTotal, 0, 1),
      payload: { statement },
    },
  ];

  pairs.forEach((pair, pairIndex) => {
    steps.push({
      id: `part2:demo:${pairIndex}`,
      kind: "demo_pair",
      ...base(part.partNumber, pairIndex + 1, partLocalTotal, pairIndex, pairs.length),
      payload: {
        before: requireNonEmptyString(pair.closed, `part2.contentJson.demonstrationPairs[${pairIndex}].closed`),
        after: requireNonEmptyString(pair.target, `part2.contentJson.demonstrationPairs[${pairIndex}].target`),
        pairIndex,
      },
    });
  });

  return steps;
}

function buildWordReadingSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const lines = requireRecordArray(part.contentJson.contrastiveLines, "part3.contentJson.contrastiveLines");
  if (lines.length !== EXPECTED_PART3_LINES.length) {
    throw new Error(`part3.contentJson.contrastiveLines must contain exactly ${EXPECTED_PART3_LINES.length} lines`);
  }

  const validatedLines = lines.map((line, index) => {
    const expected = EXPECTED_PART3_LINES[index];
    const where = `part3.contentJson.contrastiveLines[${index}]`;
    const lineNumber = requireInteger(line.lineNumber, `${where}.lineNumber`);
    const role = requireNonEmptyString(line.role, `${where}.role`);
    if (lineNumber !== expected.lineNumber) {
      throw new Error(`${where}.lineNumber must be ${expected.lineNumber}`);
    }
    if (role !== expected.role) {
      throw new Error(`${where}.role must be ${expected.role}`);
    }
    return {
      lineNumber,
      role: role as RealWordLineRole | "target_pseudowords",
      words: requireStringArray(line.words, `${where}.words`),
    };
  });

  const realLines = validatedLines.slice(0, 3) as Array<{
    lineNumber: number;
    role: RealWordLineRole;
    words: string[];
  }>;
  const nonsenseLine = validatedLines[3];
  const realWordTotal = realLines.reduce((sum, line) => sum + line.words.length, 0);
  const nonsenseWords = nonsenseLine.words;
  const partLocalTotal = realWordTotal + nonsenseWords.length;
  const steps: CoachLessonStep[] = [];

  let realWordIndex = 0;
  realLines.forEach((line) => {
    line.words.forEach((word, lineWordIndex) => {
      steps.push({
        id: `part3:line${line.lineNumber}:word${lineWordIndex}`,
        kind: "real_word",
        ...base(part.partNumber, realWordIndex, partLocalTotal, realWordIndex, realWordTotal),
        payload: {
          word,
          lineNumber: line.lineNumber,
          role: line.role,
          lineWordIndex,
          realWordIndex,
        },
      });
      realWordIndex += 1;
    });
  });

  nonsenseWords.forEach((word, wordIndex) => {
    steps.push({
      id: `part3:nonsense:${wordIndex}`,
      kind: "nonsense_word",
      ...base(part.partNumber, realWordTotal + wordIndex, partLocalTotal, wordIndex, nonsenseWords.length),
      payload: { word, wordIndex },
    });
  });

  return steps;
}

function buildPowerWordSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const heartWords = requireStringArray(part.contentJson.heartWords, "part4.contentJson.heartWords");
  const vocabularyRecords = requireRecordArray(part.contentJson.vocabularyWords, "part4.contentJson.vocabularyWords");
  const vocabularyWords = vocabularyRecords.map((record, index) =>
    requireNonEmptyString(record.word, `part4.contentJson.vocabularyWords[${index}].word`),
  );
  const total = heartWords.length + vocabularyWords.length;

  return [
    ...heartWords.map((word, index) => ({
      id: `part4:heart:${index}`,
      kind: "power_word" as const,
      ...base(part.partNumber, index, total, index, total),
      payload: { word, group: "heart" as const, index },
    })),
    ...vocabularyWords.map((word, index) => ({
      id: `part4:vocab:${index}`,
      kind: "power_word" as const,
      ...base(part.partNumber, heartWords.length + index, total, heartWords.length + index, total),
      payload: { word, group: "vocab" as const, index },
    })),
  ];
}

function buildSentenceSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const sentences = requireStringArray(part.contentJson.sentences, "part5.contentJson.sentences");
  return sentences.map((text, index) => ({
    id: `part5:sentence:${index}`,
    kind: "sentence",
    ...base(part.partNumber, index, sentences.length, index, sentences.length),
    payload: { text, index },
  }));
}

function buildSpellingSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const dictatedWords = requireStringArray(part.contentJson.dictatedWords, "part6.contentJson.dictatedWords");
  return dictatedWords.map((word, index) => ({
    id: `part6:spell:${index}`,
    kind: "spell_word",
    ...base(part.partNumber, index, dictatedWords.length, index, dictatedWords.length),
    payload: { word, index },
  }));
}

function buildPassageSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const title = requireNonEmptyString(part.kidVisibleCopy.title, "part7.kidVisibleCopy.title");
  const text = requireNonEmptyString(part.contentJson.passageText, "part7.contentJson.passageText");
  return [
    {
      id: "part7:passage",
      kind: "passage",
      ...base(part.partNumber, 0, 1, 0, 1),
      payload: {
        title,
        text,
        listenFirstAllowed: requireBoolean(part.contentJson.listenFirstAllowed, "part7.contentJson.listenFirstAllowed"),
        readOnOwnAllowed: requireBoolean(part.contentJson.readOnOwnAllowed, "part7.contentJson.readOnOwnAllowed"),
      },
    },
  ];
}

function buildReflectSteps(part: LessonPlayerPart): CoachLessonStep[] {
  const questions = requireRecordArray(part.contentJson.questions, "part8.contentJson.questions");
  const questionTypes = requireStringArray(part.contentJson.questionTypes, "part8.contentJson.questionTypes");
  if (questionTypes.length !== questions.length) {
    throw new Error(`part8.contentJson.questionTypes length must match questions length`);
  }

  return questions.map((question, index) => {
    const questionType = requireNonEmptyString(question.questionType, `part8.contentJson.questions[${index}].questionType`);
    if (questionTypes[index] !== questionType) {
      throw new Error(`part8.contentJson.questionTypes[${index}] must match questions[${index}].questionType`);
    }

    return {
      id: `part8:question:${index}`,
      kind: "reflect",
      ...base(part.partNumber, index, questions.length, index, questions.length),
      payload: {
        question: requireNonEmptyString(question.question, `part8.contentJson.questions[${index}].question`),
        questionType,
        index,
      },
    };
  });
}

function base(
  partNumber: number,
  partLocalIndex: number,
  partLocalTotal: number,
  taskLocalIndex: number,
  taskLocalTotal: number,
): Omit<CoachLessonStepBase, "id"> {
  return { partNumber, partLocalIndex, partLocalTotal, taskLocalIndex, taskLocalTotal };
}

function requireNonEmptyString(value: unknown, where: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${where} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where} must be a non-empty string array`);
  }
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`${where}[${index}] must be a non-empty string`);
    }
  });
  return value;
}

function requireRecordArray(value: unknown, where: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where} must be a non-empty record array`);
  }
  value.forEach((entry, index) => {
    if (!isPlainRecord(entry)) {
      throw new Error(`${where}[${index}] must be a record`);
    }
  });
  return value;
}

function requireInteger(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${where} must be an integer`);
  }
  return value;
}

function requireBoolean(value: unknown, where: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${where} must be a boolean`);
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
