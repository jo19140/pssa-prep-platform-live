import { generateDiagnosticAssessment, getElaStandardsForGrade } from "@/lib/diagnosticGenerator";
import { getSamplerPatternProfile } from "@/lib/pssaSamplerPatterns";
import type { Question } from "@/types";

export type TestDesignAgentInput = {
  gradeLevel: number;
  purpose?: "BASELINE_DIAGNOSTIC" | "TARGETED_PRACTICE" | "RETEST";
  focusSkills?: string[];
};

type PssaDesignRule = {
  totalCorePoints: number;
  weightedCorePoints: number;
  totalCoreItems: string;
  styleReferenceNote?: string;
  passageBasedOnePointItems: string;
  standaloneConventionsItems: number;
  multipointItems: string;
  shortAnswerItems: number;
  tdaItems: number;
  tdaWeightedPoints: number;
  sections: Array<{
    section: number;
    emphasis: string;
    itemTypes: string[];
    constructedResponseCount: number;
    estimatedPassages: number;
    estimatedMinutes: string;
  }>;
  reportingCategoryTargets: Array<{
    code: string;
    label: string;
    percentOfCore: string;
    points: string;
  }>;
  multipointMinimum: string;
};

const PSSA_ELA_DESIGN_RULES: Record<number, PssaDesignRule> = {
  3: pssaDfaAdministrationRule(3, [[18, 1, "50-60", "65-80"], [10, 1, "30-40", "45-60"], [19, 1, "50-60", "65-80"]]),
  4: pssaDfaAdministrationRule(4, [[29, 0, "70-80", "85-100"], [10, 1, "65-75", "80-95"], [12, 1, "70-80", "85-100"]]),
  5: pssaDfaAdministrationRule(5, [[30, 0, "70-80", "85-100"], [10, 1, "65-75", "80-95"], [12, 1, "70-80", "85-100"]]),
  6: pssaDfaAdministrationRule(6, [[31, 0, "70-80", "85-100"], [10, 1, "65-75", "80-95"], [11, 1, "70-80", "85-100"]]),
  7: pssaDfaAdministrationRule(7, [[30, 0, "70-80", "85-100"], [10, 1, "65-75", "80-95"], [12, 1, "70-80", "85-100"]]),
  8: pssaDfaAdministrationRule(8, [[27, 0, "70-80", "85-100"], [10, 1, "65-75", "80-95"], [14, 1, "70-80", "85-100"]]),
};

export function designAssessmentBlueprint(input: TestDesignAgentInput) {
  const gradeLevel = clampGrade(input.gradeLevel);
  const purpose = input.purpose || "BASELINE_DIAGNOSTIC";
  const diagnostic = generateDiagnosticAssessment(gradeLevel);
  const standards = getElaStandardsForGrade(gradeLevel);
  const pssaDesign = PSSA_ELA_DESIGN_RULES[gradeLevel];
  const samplerPatternProfile = getSamplerPatternProfile(gradeLevel);
  const focusSkills = (input.focusSkills || []).map((skill) => skill.toLowerCase());
  const selectedStandards = focusSkills.length
    ? standards.filter((standard) => focusSkills.some((skill) => standard.skill.toLowerCase().includes(skill)))
    : standards;
  const questionCounts = diagnostic.questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.type] = (counts[question.type] || 0) + 1;
    return counts;
  }, {});
  const interactionModeCounts = diagnostic.questions.reduce<Record<string, number>>((counts, question) => {
    const mode = question.interactionMode;
    if (mode) counts[mode] = (counts[mode] || 0) + 1;
    return counts;
  }, {});
  const learnedInteractionPatterns = learnedTePatternsForGrade(gradeLevel);
  const strandCoverage = selectedStandards.reduce<Record<string, number>>((counts, standard) => {
    counts[standard.strand] = (counts[standard.strand] || 0) + 1;
    return counts;
  }, {});
  const styleAnalysis = analyzePssaStyle({
    gradeLevel,
    questions: diagnostic.questions,
    passages: diagnostic.passages,
  });

  return {
    title: titleForPurpose(purpose, gradeLevel),
    gradeLevel,
    purpose,
    designSummary: purpose === "BASELINE_DIAGNOSTIC"
      ? `Balanced grade-level diagnostic modeled on the PCS PSSA ELA design: ${pssaDesign.passageBasedOnePointItems} passage-based 1-point items, ${pssaDesign.standaloneConventionsItems} conventions items, ${pssaDesign.multipointItems} multipoint items, and ${gradeLevel === 3 ? "grade 3 short answers" : "one weighted TDA prompt"}.`
      : "Targeted standards-based assessment plan designed around the selected focus skills.",
    sourceAlignment: {
      sourceName: gradeLevel === 3
        ? "PCS PSSA ELA Test Design and 2024-2025 Grade 3 Item Sampler"
        : "PCS PSSA English Language Arts Test Design, updated February 2025",
      authoritySplit: {
        testCountsAndBlueprint: "PCS PSSA English Language Arts Test Design PDF",
        samplerLinks: "Grade-specific style references for passage complexity, question wording, vocabulary level, answer choices, and TDA/conventions patterns only",
      },
      reportingCategories: [
        "A = Literature Text",
        "B = Informational Text",
        "D = Conventions of Standard English",
        gradeLevel === 3 ? "Grade 3 uses short-answer items instead of TDA." : "E = Text-Dependent Analysis",
      ],
      coreCompetencies: [
        "A-K/B-K = Key Ideas and Details",
        "A-C/B-C = Craft and Structure, and Integration of Knowledge and Ideas",
        "A-V/B-V = Vocabulary Acquisition and Use",
      ],
    },
    samplerPatternProfile,
    pssaDesign,
    passagePlan: diagnostic.passages.map((passage) => ({
      passageType: passage.passageType,
      title: passage.title,
      genre: passage.genre,
      wordCountTarget: passage.wordCountTarget,
      actualWordCount: passage.actualWordCount,
      hasTable: passage.hasTable,
      hasSections: passage.hasSections,
    })),
    styleAnalysis,
    itemPlan: {
      totalQuestions: diagnostic.questions.length,
      targetCoreItems: pssaDesign.totalCoreItems,
      targetCorePoints: pssaDesign.totalCorePoints,
      targetWeightedCorePoints: pssaDesign.weightedCorePoints,
      targetPassageBasedOnePointItems: pssaDesign.passageBasedOnePointItems,
      targetStandaloneConventionsItems: pssaDesign.standaloneConventionsItems,
      targetMultipointItems: pssaDesign.multipointItems,
      targetShortAnswerItems: pssaDesign.shortAnswerItems,
      targetTdaItems: pssaDesign.tdaItems,
      targetTdaWeightedPoints: pssaDesign.tdaWeightedPoints,
      questionCounts,
      interactionModeCounts,
      learnedInteractionPatterns,
      includesTda: diagnostic.questions.some((question) => question.type === "TDA"),
      includesShortAnswer: diagnostic.questions.some((question) => question.type === "SHORT_RESPONSE"),
      includesConventions: diagnostic.questions.some((question) => question.type === "CONVENTIONS"),
      includesTechnologyEnhanced: diagnostic.questions.some((question) => ["HOT_TEXT", "DRAG_DROP", "MULTI_SELECT"].includes(question.type)),
      difficultyBands: ["Below Grade Review", "On Grade Level", "PSSA-Style Analysis"],
    },
    standardsPlan: {
      totalStandards: selectedStandards.length,
      strandCoverage,
      standards: selectedStandards.map((standard) => ({
        code: standard.code,
        skill: standard.skill,
        strand: standard.strand,
        label: standard.label,
      })),
    },
    qualityChecks: [
      "Uses PCS PSSA Test Design as the only source for item counts, point totals, reporting categories, and blueprint structure.",
      "Uses grade-specific sampler links only to study passage complexity, wording patterns, vocabulary level, distractor style, and TDA/conventions style.",
      "Balances literature and informational reading under reporting categories A and B.",
      "Separates conventions as reporting category D with 9 standalone 1-point items.",
      gradeLevel === 3
        ? "Uses grade 3 short-answer design; TDA begins in grade 4."
        : "Includes one TDA prompt aligned to reporting category E and treats it as weighted in the design plan.",
      `Targets ${pssaDesign.multipointItems} multipoint EBSR/TE items. ${pssaDesign.multipointMinimum}`,
      learnedInteractionPatterns.length
        ? `Uses learned grade ${gradeLevel} release-item patterns from released/sampler items: ${learnedInteractionPatterns.map((pattern) => pattern.mode).join(", ")}.`
        : "Uses grade-appropriate TE formats from the sampler-pattern profile when available.",
      "Keeps scoring deterministic; AI can enrich wording but should not replace answer-key validation.",
      "Saves as a database-backed Assignment through the existing TestSession flow.",
      `Reviews wording, text length, and complexity: ${styleAnalysis.overallRating}.`,
    ],
    recommendation: purpose === "BASELINE_DIAGNOSTIC"
      ? "Use this as the first baseline for the class, then let the learning pathway prioritize weak standards."
      : "Use this after instruction or intervention to check whether students are ready to move forward.",
  };
}

function analyzePssaStyle({
  gradeLevel,
  questions,
  passages,
}: {
  gradeLevel: number;
  questions: Question[];
  passages: Array<{
    passageType: string;
    title: string;
    genre: string;
    content: string;
    wordCountTarget: number;
    actualWordCount: number;
    hasTable: boolean;
    hasSections: boolean;
    metadata: Record<string, unknown>;
  }>;
}) {
  const questionAnalyses = questions.map((question) => {
    const text = questionText(question);
    return {
      id: question.id,
      type: question.type,
      skill: question.skill,
      standardCode: question.standardCode,
      languageMoves: detectLanguageMoves(text),
      demand: demandForQuestion(question, text),
      wordingNotes: wordingNotes(question, text),
      wordCount: countWords(text),
      sampleWording: text.slice(0, 180),
    };
  });
  const passageAnalyses = passages.map((passage) => {
    const lengthCheck = Math.abs(passage.actualWordCount - passage.wordCountTarget) <= 25 ? "On target" : passage.actualWordCount < passage.wordCountTarget ? "Shorter than target" : "Longer than target";
    return {
      title: passage.title,
      passageType: passage.passageType,
      genre: passage.genre,
      wordCountTarget: passage.wordCountTarget,
      actualWordCount: passage.actualWordCount,
      lengthCheck,
      complexityFeatures: [
        passage.hasSections ? "sections/headings" : "continuous prose",
        passage.hasTable ? "table/chart data" : "no table/chart",
        String(passage.metadata?.structure || "").trim() ? `structure: ${passage.metadata.structure}` : null,
        Array.isArray(passage.metadata?.technicalVocabulary) ? "technical vocabulary" : null,
        passage.metadata?.includesDialogue ? "dialogue" : null,
        passage.metadata?.includesConflict ? "conflict" : null,
      ].filter(Boolean),
      complexityRating: ratePassageComplexity(gradeLevel, passage.actualWordCount, passage.hasSections, passage.hasTable, passage.metadata),
    };
  });
  const demandCounts = questionAnalyses.reduce<Record<string, number>>((counts, item) => {
    counts[item.demand] = (counts[item.demand] || 0) + 1;
    return counts;
  }, {});
  const languageMoveCounts = questionAnalyses.flatMap((item) => item.languageMoves).reduce<Record<string, number>>((counts, move) => {
    counts[move] = (counts[move] || 0) + 1;
    return counts;
  }, {});
  const flaggedItems = questionAnalyses.filter((item) => item.wordingNotes.length);
  const samplerPatternProfile = getSamplerPatternProfile(gradeLevel);
  return {
    overallRating: flaggedItems.length <= Math.max(2, Math.round(questions.length * 0.15)) ? "PSSA-like with minor review flags" : "Needs wording/complexity review",
    questionLanguage: {
      demandCounts,
      languageMoveCounts,
      flaggedItems,
    },
    textComplexity: {
      averagePassageWords: Math.round(passages.reduce((sum, passage) => sum + passage.actualWordCount, 0) / Math.max(1, passages.length)),
      passages: passageAnalyses,
    },
    recommendations: [
      "Do not use sampler item counts as the generated assessment blueprint; sampler counts are examples from a released booklet, not the operational design target.",
      "Use PSSA-style stems such as best explains, which detail supports, what can be inferred, how does the author, and select TWO details.",
      "Keep answer choices plausible and tied to common student mistakes, not obviously silly distractors.",
      "Check that passage length rises by grade and that informational texts include headings, technical vocabulary, and data where appropriate.",
      "Use EBSR and TE items for evidence selection, not just recall.",
      ...learnedTePatternsForGrade(gradeLevel).map((pattern) => `Learned release-item pattern ${pattern.mode}: ${pattern.description} Placement: ${pattern.placement}`),
      ...samplerPatternProfile.questionLanguagePatterns.slice(0, 4).map((pattern) => `Sampler pattern: ${pattern}`),
      ...(samplerPatternProfile.technologyEnhancedPatterns || []).slice(0, 12).map((pattern) => `TE pattern: ${pattern}`),
    ],
  };
}

function learnedTePatternsForGrade(gradeLevel: number) {
  if (gradeLevel === 3) {
    return [
      {
        mode: "GRADE3_COMPARATIVE_COMPLETION",
        itemType: "CONVENTIONS",
        reportingCategory: "D - Conventions of Standard English",
        description: "A single sentence has one blank and four answer choices that test a comparative or superlative form, such as earlier vs. earliest vs. nonstandard double comparatives.",
        placement: "Use in the opening conventions block before passage-based reading items.",
        scoring: "One point for selecting the grammatically correct word or words.",
      },
      {
        mode: "GRADE3_DESCRIBING_WORD_MC",
        itemType: "CONVENTIONS",
        reportingCategory: "D - Conventions of Standard English",
        description: "Students read one simple sentence and identify which word describes a noun in that sentence.",
        placement: "Use as an early conventions/language item with a short sentence and familiar vocabulary.",
        scoring: "One point for selecting the word that functions as the descriptor.",
      },
      {
        mode: "GRADE3_UNDERLINED_WORD_CORRECTION",
        itemType: "CONVENTIONS",
        reportingCategory: "D - Conventions of Standard English",
        description: "A sentence contains several underlined words; students choose the underlined word that should be changed to correct a mistake.",
        placement: "Use for irregular verbs, homophones, spelling, capitalization, or usage in the conventions block.",
        scoring: "One point for selecting the underlined word that contains the error.",
      },
      {
        mode: "GRADE3_TITLE_CAPITALIZATION",
        itemType: "CONVENTIONS",
        reportingCategory: "D - Conventions of Standard English",
        description: "Students choose the sentence with a mistake in title capitalization, using underlined book, play, song, or chapter titles.",
        placement: "Use in conventions after simple grammar items, with familiar school/library contexts.",
        scoring: "One point for selecting the sentence with the capitalization mistake.",
      },
      {
        mode: "GRADE3_NOTE_CHECKLIST",
        itemType: "MULTI_SELECT",
        reportingCategory: "D - Conventions / Writing Support",
        description: "Students put check marks next to three notes that best support a topic for a paragraph, such as notes for a paragraph about making orange juice.",
        placement: "Use as a scaffolded writing-support item in the conventions/writing section.",
        scoring: "One point when all three supporting notes are selected and unsupported notes are not selected.",
      },
      {
        mode: "GRADE3_CHARACTER_EVIDENCE_DETAIL",
        itemType: "MCQ",
        reportingCategory: "A - Literature Text",
        description: "After a short literary passage, students choose the detail that best shows a character trait, motivation, or problem-solving behavior.",
        placement: "Use inside a grouped literary passage block; keep the same passage across several consecutive questions.",
        scoring: "One point for the detail that directly supports the stated trait or inference.",
      },
      {
        mode: "GRADE3_PHRASE_IN_CONTEXT",
        itemType: "MCQ",
        reportingCategory: "A/B - Vocabulary Acquisition and Use",
        description: "Students interpret a simple phrase or idiom in passage context, such as what a phrase means in dialogue.",
        placement: "Use in a passage block after students have enough context to infer meaning.",
        scoring: "One point for the context-supported meaning rather than the literal meaning.",
      },
      {
        mode: "GRADE3_MOST_LIKELY_REASON",
        itemType: "MCQ",
        reportingCategory: "A - Literature Text",
        description: "Students answer why characters most likely do something, using nearby events and dialogue from the passage.",
        placement: "Use with narrative passages that include a clear goal, plan, or reason for action.",
        scoring: "One point for the reason best supported by the passage.",
      },
      {
        mode: "GRADE3_EBSR_EVIDENCE_PAIR",
        itemType: "EBSR",
        reportingCategory: "A/B - Reading",
        description: "Part One asks for a central message, inference, or character idea; Part Two asks students to choose two direct details or quotations that support Part One.",
        placement: "Use at the end of a passage block after several MC items on the same text.",
        scoring: "Two points when Part One is correct and both Part Two evidence choices support it.",
      },
      {
        mode: "GRADE3_SPLIT_PASSAGE_QUESTION",
        itemType: "PRESENTATION",
        reportingCategory: "PSSA Online Administration Style",
        description: "The same passage stays in a left reading pane while the right pane advances through several related questions; tool hints may mention line guide, cross-off, highlighter, notepad, or check marks.",
        placement: "Use for generated diagnostics so questions are grouped by passage instead of jumping to a new passage every item.",
        scoring: "Presentation pattern only; scoring belongs to the underlying item type.",
      },
    ];
  }

  if (gradeLevel !== 6) return [];
  return [
    {
      mode: "INLINE_DROPDOWN",
      itemType: "DRAG_DROP",
      reportingCategory: "D - Conventions of Standard English",
      description: "A paragraph contains embedded drop-down blanks; students choose the word from each list that best completes each sentence.",
      placement: "Use in the opening conventions block for agreement, verb tense, pronoun, or frequently confused word decisions.",
      scoring: "One point when every blank maps to the keyed word.",
    },
    {
      mode: "SENTENCE_HIGHLIGHT",
      itemType: "HOT_TEXT",
      reportingCategory: "D - Conventions of Standard English",
      description: "Students select one sentence in a paragraph; the selected sentence is highlighted to show the response.",
      placement: "Use for sentence revision, inappropriate shift, vague pronoun, style, or capitalization/punctuation review.",
      scoring: "One point for selecting the keyed sentence.",
    },
    {
      mode: "CHECK_TABLE",
      itemType: "MULTI_SELECT",
      reportingCategory: "D - Conventions of Standard English",
      description: "Students put check marks in a two-column table, such as Formal Style vs. Informal Style, with one check per row.",
      placement: "Use for style/register, sentence correctness, or formal/informal conventions analysis.",
      scoring: "One point when all rows match the keyed categories.",
    },
    {
      mode: "SENTENCE_BLANK",
      itemType: "DRAG_DROP",
      reportingCategory: "D - Conventions of Standard English",
      description: "Students choose the sentence that best fits a blank line while maintaining the style of an article or paragraph.",
      placement: "Use in the conventions block for style, precision, and sentence-completion revision tasks.",
      scoring: "One point for placing the keyed sentence on the blank line.",
    },
    {
      mode: "SELECT_TO_RESPOND",
      itemType: "MULTI_SELECT",
      reportingCategory: "A/B - Reading",
      description: "Students select multiple sentences into a response box to show evidence supporting an idea about a passage.",
      placement: "Use with a Grade 6 literary passage for evidence selection, educational value, theme, narrator change, or central idea support.",
      scoring: "One point when the selected response set matches the key.",
    },
    {
      mode: "MATCH_LINES",
      itemType: "DRAG_DROP",
      reportingCategory: "A/B - Reading",
      description: "Students connect passage titles or categories to details; in the app this is represented with a matching table/drop-down pattern.",
      placement: "Use with paired passages to connect each detail to the correct passage title; each title can match more than one detail.",
      scoring: "One point when every detail is matched to the keyed title/category.",
    },
    {
      mode: "SUMMARY_HIGHLIGHT",
      itemType: "HOT_TEXT",
      reportingCategory: "A/B - Reading",
      description: "Students read a summary and select the one sentence that should be added to make the summary complete.",
      placement: "Use with literary or informational reading blocks for objective summary and major-event reasoning.",
      scoring: "One point for selecting the keyed missing-summary sentence.",
    },
  ];
}

function questionText(question: Question) {
  if (question.type === "EBSR") return [question.partAQuestion, question.partBQuestion, ...question.partAChoices, ...question.partBChoices].join(" ");
  if (question.type === "HOT_TEXT") return [question.hotTextPrompt, ...question.selectableSpans].join(" ");
  if (question.type === "DRAG_DROP") return [question.dragDropPrompt, ...question.categories, ...question.dragItems.map((item) => item.text)].join(" ");
  if (question.type === "TDA" || question.type === "SHORT_RESPONSE") return [question.prompt, question.type === "TDA" ? question.rubric : question.sampleAnswer].join(" ");
  return [question.question, ...question.choices].join(" ");
}

function detectLanguageMoves(text: string) {
  const lower = text.toLowerCase();
  const moves = [
    lower.includes("based on") ? "based-on wording" : null,
    lower.includes("best") ? "best-answer wording" : null,
    lower.includes("support") || lower.includes("evidence") ? "evidence-based wording" : null,
    lower.includes("infer") || lower.includes("concluded") ? "inference wording" : null,
    lower.includes("analyze") || lower.includes("how does") || lower.includes("why does") ? "analysis wording" : null,
    lower.includes("select two") || lower.includes("which two") ? "multi-evidence wording" : null,
    lower.includes("part one") || lower.includes("part two") ? "EBSR part wording" : null,
    lower.includes("diagram") || lower.includes("table") || lower.includes("chart") ? "visual-text connection wording" : null,
    lower.includes("section") ? "section connection wording" : null,
    lower.includes("generalization") ? "generalization evidence wording" : null,
    lower.includes("meaning") || lower.includes("suggest") ? "vocabulary/meaning wording" : null,
    lower.includes("author") || lower.includes("narrator") ? "author craft wording" : null,
    lower.includes("select") || lower.includes("choose") ? "student selection interaction" : null,
    lower.includes("move") || lower.includes("drag") ? "drag/drop interaction" : null,
    lower.includes("box") || lower.includes("row") || lower.includes("table") ? "table/checkbox interaction" : null,
    lower.includes("blank") || lower.includes("complete the sentence") ? "completion interaction" : null,
  ].filter(Boolean) as string[];
  return moves.length ? moves : ["basic comprehension wording"];
}

function demandForQuestion(question: Question, text: string) {
  const lower = text.toLowerCase();
  if (question.type === "TDA") return "Extended analysis";
  if (question.type === "EBSR" || lower.includes("which two") || lower.includes("select two")) return "Evidence selection";
  if (lower.includes("analyze") || lower.includes("how does") || lower.includes("why does") || lower.includes("effect")) return "Analysis";
  if (lower.includes("infer") || lower.includes("concluded") || lower.includes("suggest")) return "Inference";
  return "Recall/Skill check";
}

function wordingNotes(question: Question, text: string) {
  const lower = text.toLowerCase();
  const notes: string[] = [];
  if (question.type !== "CONVENTIONS" && !/(best|support|infer|concluded|analyze|how does|why does|effect|select|which two|meaning|suggest)/.test(lower)) {
    notes.push("Consider a more PSSA-like stem that asks for evidence, inference, analysis, effect, or best-supported answer.");
  }
  if ((question.type === "EBSR" || question.type === "MULTI_SELECT") && !/(two|evidence|support)/.test(lower)) {
    notes.push("Evidence-selection items should clearly ask students to choose supporting evidence.");
  }
  if (question.type === "TDA" && !/(analyz|evidence|passage|text)/.test(lower)) {
    notes.push("TDA prompt should explicitly require analysis using text evidence.");
  }
  return notes;
}

function ratePassageComplexity(gradeLevel: number, wordCount: number, hasSections: boolean, hasTable: boolean, metadata: Record<string, unknown>) {
  let score = 0;
  if (wordCount >= (gradeLevel <= 3 ? 500 : gradeLevel <= 5 ? 650 : 1000)) score += 1;
  if (wordCount >= (gradeLevel <= 3 ? 700 : gradeLevel <= 5 ? 900 : 1400)) score += 1;
  if (hasSections) score += 1;
  if (hasTable) score += 1;
  if (metadata?.includesConflict || metadata?.structure || metadata?.technicalVocabulary) score += 1;
  if (score >= 4) return "High";
  if (score >= 2) return "Moderate";
  return "Developing";
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function pssaDfaAdministrationRule(grade: number, rows: Array<[number, number, string, string]>): PssaDesignRule {
  const srteTotal = rows.reduce((sum, [srte]) => sum + srte, 0);
  const constructedTotal = rows.reduce((sum, [, constructed]) => sum + constructed, 0);
  const usesTda = grade >= 4;
  return {
    totalCorePoints: srteTotal + constructedTotal,
    weightedCorePoints: usesTda ? srteTotal + constructedTotal + 12 : srteTotal + constructedTotal,
    totalCoreItems: `${srteTotal} SR/TE + ${constructedTotal} constructed-response item${constructedTotal === 1 ? "" : "s"}`,
    styleReferenceNote: "Grade-specific item samplers are used for wording, passage complexity, vocabulary level, and item-pattern analysis only. The 2026 DFA administration table controls section counts.",
    passageBasedOnePointItems: `${srteTotal} selected-response and technology-enhanced questions across Sections 1-3`,
    standaloneConventionsItems: 9,
    multipointItems: "Embedded within the selected-response and technology-enhanced question set",
    shortAnswerItems: usesTda ? 0 : constructedTotal,
    tdaItems: usesTda ? constructedTotal : 0,
    tdaWeightedPoints: usesTda ? 16 : 0,
    multipointMinimum: rows.map(([srte, constructed], index) => `Section ${index + 1}: ${srte} SR/TE and ${constructed} constructed response`).join("; "),
    sections: rows.map(([srte, constructed, actualMinutes], index) => ({
      section: index + 1,
      emphasis: constructed ? "Selected-response, technology-enhanced, and constructed response" : "Selected-response and technology-enhanced ELA questions",
      itemTypes: constructed ? ["MC", "TE", "EBSR", usesTda ? "TDA" : "SA"] : ["MC", "TE", "EBSR"],
      constructedResponseCount: constructed,
      estimatedPassages: index === 0 ? 3 : 1,
      estimatedMinutes: actualMinutes,
    })),
    reportingCategoryTargets: [
      { code: "A", label: "Literature Text", percentOfCore: "DFA-aligned diagnostic sampling", points: "Balanced across passage blocks" },
      { code: "B", label: "Informational Text", percentOfCore: "DFA-aligned diagnostic sampling", points: "Balanced across passage blocks" },
      { code: "D", label: "Conventions of Standard English", percentOfCore: "Standalone conventions sample", points: "9 items" },
      { code: "E", label: usesTda ? "Text-Dependent Analysis" : "Short Answer", percentOfCore: "Constructed response", points: `${constructedTotal} constructed response${constructedTotal === 1 ? "" : "s"}` },
    ],
  };
}

function pssaGradesFourThroughEightRule(): PssaDesignRule {
  return {
    totalCorePoints: 51,
    weightedCorePoints: 63,
    totalCoreItems: "38-42 SR/TE + 1 TDA",
    styleReferenceNote: "Grade-specific item samplers are used for wording, passage complexity, vocabulary level, and item-pattern analysis only. PCS PSSA Test Design controls counts.",
    passageBasedOnePointItems: "22-28",
    standaloneConventionsItems: 9,
    multipointItems: "4-6",
    shortAnswerItems: 0,
    tdaItems: 1,
    tdaWeightedPoints: 16,
    multipointMinimum: "At least 4 multipoint EBSR/TE items, including at least two 2-point items and two 3-point items.",
    sections: [
      { section: 1, emphasis: "Conventions of Standard English and Reading", itemTypes: ["MC", "TE", "EBSR"], constructedResponseCount: 0, estimatedPassages: 3, estimatedMinutes: "70-80" },
      { section: 2, emphasis: "Reading and Text-Dependent Analysis", itemTypes: ["MC", "TE", "EBSR", "TDA"], constructedResponseCount: 1, estimatedPassages: 1, estimatedMinutes: "70" },
      { section: 3, emphasis: "Conventions of Standard English, Reading, and Text-Dependent Analysis", itemTypes: ["MC", "TE", "EBSR", "TDA"], constructedResponseCount: 1, estimatedPassages: 1, estimatedMinutes: "70-80" },
    ],
    reportingCategoryTargets: [
      { code: "A", label: "Literature Text", percentOfCore: "24%-37%", points: "15-23" },
      { code: "B", label: "Informational Text", percentOfCore: "24%-37%", points: "15-23" },
      { code: "D", label: "Conventions of Standard English", percentOfCore: "14%", points: "9" },
      { code: "E", label: "Text-Dependent Analysis", percentOfCore: "25%", points: "16 weighted" },
    ],
  };
}

function pssaGradeSixAdministrationRule(): PssaDesignRule {
  return {
    totalCorePoints: 54,
    weightedCorePoints: 66,
    totalCoreItems: "52 SR/TE + 2 constructed-response items",
    styleReferenceNote: "Grade-specific item samplers are used for wording, passage complexity, vocabulary level, and item-pattern analysis only. The 2026 DFA administration table controls section counts.",
    passageBasedOnePointItems: "52 selected-response and technology-enhanced questions across Sections 1-3",
    standaloneConventionsItems: 9,
    multipointItems: "Embedded within the 52 SR/TE questions",
    shortAnswerItems: 0,
    tdaItems: 2,
    tdaWeightedPoints: 16,
    multipointMinimum: "Follow the Grade 6 DFA structure: Section 1 has 31 SR/TE and no constructed response; Section 2 has 10 SR/TE and 1 constructed response; Section 3 has 11 SR/TE and 1 constructed response.",
    sections: [
      { section: 1, emphasis: "Selected-response and technology-enhanced ELA questions", itemTypes: ["MC", "TE", "EBSR"], constructedResponseCount: 0, estimatedPassages: 3, estimatedMinutes: "70-80" },
      { section: 2, emphasis: "Selected-response, technology-enhanced, and constructed response", itemTypes: ["MC", "TE", "EBSR", "TDA"], constructedResponseCount: 1, estimatedPassages: 1, estimatedMinutes: "65-75" },
      { section: 3, emphasis: "Selected-response, technology-enhanced, and constructed response", itemTypes: ["MC", "TE", "EBSR", "TDA"], constructedResponseCount: 1, estimatedPassages: 1, estimatedMinutes: "70-80" },
    ],
    reportingCategoryTargets: [
      { code: "A", label: "Literature Text", percentOfCore: "DFA-aligned diagnostic sampling", points: "Balanced across sections" },
      { code: "B", label: "Informational Text", percentOfCore: "DFA-aligned diagnostic sampling", points: "Balanced across sections" },
      { code: "D", label: "Conventions of Standard English", percentOfCore: "Standalone conventions sample", points: "9 items" },
      { code: "E", label: "Text-Dependent Analysis", percentOfCore: "Constructed response", points: "2 constructed responses" },
    ],
  };
}

function titleForPurpose(purpose: string, gradeLevel: number) {
  if (purpose === "RETEST") return `Grade ${gradeLevel} PSSA ELA Retest Design`;
  if (purpose === "TARGETED_PRACTICE") return `Grade ${gradeLevel} PSSA ELA Targeted Practice Design`;
  return `Grade ${gradeLevel} PSSA ELA Baseline Diagnostic Design`;
}

function clampGrade(value: number) {
  if (!Number.isFinite(value)) return 6;
  return Math.min(8, Math.max(3, Math.round(value)));
}
