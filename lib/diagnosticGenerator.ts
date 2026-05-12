import type { BaseQuestion, Question, QuestionType } from "@/types";
import { getSamplerPatternProfile, samplerStemForGrade } from "@/lib/pssaSamplerPatterns";

export type GradeStandard = {
  code: string;
  label: string;
  skill: string;
  strand: "Informational" | "Literature" | "Conventions" | "Writing";
};

export type DiagnosticPassage = {
  id: string;
  title: string;
  passageType: "LITERARY" | "INFORMATIONAL_SCIENCE" | "PAIRED_TEXT" | "INFORMATIONAL_TABLE";
  genre: string;
  content: string;
  wordCountTarget: number;
  actualWordCount: number;
  hasTable: boolean;
  hasSections: boolean;
  gradeLevel: number;
  tableData?: {
    title: string;
    columns: string[];
    rows: string[][];
  };
  metadata: Record<string, unknown>;
};

const readingLabels = [
  ["A", "Main Idea", "Determine a central idea and summarize", "Informational"],
  ["B", "Inference", "Ask and answer questions, make inferences, and support them with text evidence", "Informational"],
  ["C", "Text Structure", "Analyze text structure and author's craft", "Informational"],
  ["D", "Vocabulary", "Determine word meaning and vocabulary", "Informational"],
  ["A", "Theme", "Determine theme and summarize literature", "Literature"],
  ["B", "Literary Inference", "Make inferences in literature and support analysis with textual evidence", "Literature"],
  ["C", "Character", "Analyze character development", "Literature"],
  ["D", "Literary Vocabulary", "Determine figurative and connotative meaning", "Literature"],
] as const;

const pointOfViewByGrade: Record<number, { code: string; label: string; skill: string; strand: GradeStandard["strand"] }> = {
  3: { code: "CC.1.3.3.C / CC.1.2.3.E", label: "Identify who is telling the story and distinguish first-person from third-person point of view", skill: "Point of View", strand: "Literature" },
  4: { code: "CC.1.3.4.C", label: "Compare first-person and third-person narration and understand different perspectives", skill: "Point of View", strand: "Literature" },
  5: { code: "CC.1.3.5.C", label: "Analyze how point of view influences events and compare perspectives", skill: "Point of View", strand: "Literature" },
  6: { code: "CC.1.3.6.G", label: "Explain how the author develops point of view", skill: "Point of View", strand: "Literature" },
  7: { code: "CC.1.3.7.G", label: "Analyze author bias, multiple perspectives, and narrator reliability", skill: "Point of View", strand: "Literature" },
  8: { code: "CC.1.3.8.G", label: "Evaluate bias, conflicting viewpoints, multiple perspectives, and reliability of narrator", skill: "Point of View", strand: "Literature" },
};

const flashbackByGrade: Record<number, { code: string; label: string; skill: string; strand: GradeStandard["strand"] }> = {
  3: { code: "CC.1.3.3.C", label: "Describe how events happen in order and recognize past and present events", skill: "Flashback", strand: "Literature" },
  4: { code: "CC.1.3.4.E", label: "Notice shifts in time and explain how structure shapes a story", skill: "Flashback", strand: "Literature" },
  5: { code: "CC.1.3.5.E", label: "Explain how chapters, scenes, or events fit together to build a story", skill: "Flashback", strand: "Literature" },
  6: { code: "CC.1.3.6.E", label: "Analyze how structure, including flashback, contributes to theme, setting, and plot", skill: "Flashback", strand: "Literature" },
  7: { code: "CC.1.3.7.E", label: "Analyze how structure, flashback, foreshadowing, and nonlinear storytelling contribute to meaning", skill: "Flashback", strand: "Literature" },
  8: { code: "CC.1.3.8.E", label: "Evaluate how differences in structure, including flashback, affect meaning", skill: "Flashback", strand: "Literature" },
};

const plotByGrade: Record<number, { code: string; label: string; skill: string; strand: GradeStandard["strand"] }> = {
  3: { code: "CC.1.3.3.H", label: "Describe how plot unfolds through beginning, middle, end, conflict, and resolution", skill: "Plot Development", strand: "Literature" },
  4: { code: "CC.1.3.4.H", label: "Describe how characters respond to events and how the plot unfolds", skill: "Plot Development", strand: "Literature" },
  5: { code: "CC.1.3.5.H", label: "Describe how plot unfolds and how character responses shape the story", skill: "Plot Development", strand: "Literature" },
  6: { code: "CC.1.3.6.C", label: "Describe how a plot unfolds in episodes and how characters respond or change", skill: "Plot Development", strand: "Literature" },
  7: { code: "CC.1.3.7.C", label: "Analyze how story elements interact, including plot, setting, and characters", skill: "Plot Analysis", strand: "Literature" },
  8: { code: "CC.1.3.8.C", label: "Analyze how dialogue or incidents propel action, reveal character, or provoke decisions", skill: "Plot Analysis", strand: "Literature" },
};

const settingByGrade: Record<number, { code: string; label: string; skill: string; strand: GradeStandard["strand"] }> = {
  3: { code: "CC.1.3.3.C", label: "Describe where and when a story happens and how the setting relates to events", skill: "Setting", strand: "Literature" },
  4: { code: "CC.1.3.4.C", label: "Describe setting and connect time and place to story events", skill: "Setting", strand: "Literature" },
  5: { code: "CC.1.3.5.C", label: "Describe setting and explain how it connects to characters and major events", skill: "Setting", strand: "Literature" },
  6: { code: "CC.1.3.6.C", label: "Explain how setting helps shape plot events and character responses", skill: "Setting Impact", strand: "Literature" },
  7: { code: "CC.1.3.7.C", label: "Analyze how setting interacts with plot, conflict, and characters", skill: "Setting Analysis", strand: "Literature" },
  8: { code: "CC.1.3.8.C", label: "Analyze how environment, events, or dialogue shape actions, outcomes, and meaning", skill: "Setting Analysis", strand: "Literature" },
};

const inferenceByGrade: Record<number, { informationalLabel: string; literatureLabel: string }> = {
  3: { informationalLabel: "Ask and answer questions about text and make simple inferences using clues", literatureLabel: "Ask and answer questions about literature and begin making simple inferences using clues" },
  4: { informationalLabel: "Refer to details and examples to draw inferences from informational text", literatureLabel: "Refer to details and examples to draw inferences from literature" },
  5: { informationalLabel: "Quote accurately from the text when supporting inferences", literatureLabel: "Quote accurately from literature when supporting inferences" },
  6: { informationalLabel: "Cite textual evidence to support analysis and inferences in informational text", literatureLabel: "Cite textual evidence to support analysis and inferences in literature" },
  7: { informationalLabel: "Analyze deeper meaning and author message through inference using multiple layers of evidence", literatureLabel: "Analyze theme, deeper meaning, and author message through inference using multiple layers of evidence" },
  8: { informationalLabel: "Analyze implied author message and deeper meaning using multiple layers of evidence", literatureLabel: "Analyze themes and implied meanings using multiple layers of evidence" },
};

const figurativeLanguageByGrade: Record<number, { code: string; label: string; skill: string; strand: GradeStandard["strand"] }> = {
  3: { code: "CC.1.3.3.F / CC.1.2.3.F", label: "Determine the meaning of words and phrases and recognize literal versus nonliteral language", skill: "Figurative Language", strand: "Literature" },
  4: { code: "CC.1.3.4.F / CC.1.2.4.F", label: "Determine the meaning of words and phrases, including figurative language", skill: "Figurative Language", strand: "Literature" },
  5: { code: "CC.1.3.5.F / CC.1.2.5.F", label: "Interpret figurative language in context and explain how it impacts meaning", skill: "Figurative Language", strand: "Literature" },
  6: { code: "CC.1.3.6.F / CC.1.2.6.F", label: "Determine figurative, connotative, and technical meanings and explain their effect", skill: "Figurative Language", strand: "Literature" },
  7: { code: "CC.1.3.7.F / CC.1.2.7.F", label: "Analyze tone, mood, purpose, and deeper meaning created by figurative language", skill: "Figurative Language", strand: "Literature" },
  8: { code: "CC.1.3.8.F / CC.1.2.8.F", label: "Evaluate tone, mood, symbolism, and author purpose created by figurative language", skill: "Figurative Language", strand: "Literature" },
};

const conventionSkills = [
  "Grammar",
  "Punctuation",
  "Capitalization",
  "Sentence Structure",
  "Verb Tense",
  "Pronoun Usage",
  "Commas",
  "Apostrophes",
  "Subject-Verb Agreement",
  "Frequently Confused Words",
] as const;

const teTypes: QuestionType[] = ["MULTI_SELECT", "HOT_TEXT", "DRAG_DROP"];

const passageTargets: Record<number, { literary: number; informational: number; paired: number; table: number }> = {
  3: { literary: 560, informational: 760, paired: 860, table: 760 },
  4: { literary: 700, informational: 850, paired: 950, table: 900 },
  5: { literary: 900, informational: 1080, paired: 1180, table: 1100 },
  6: { literary: 1100, informational: 1550, paired: 1250, table: 1550 },
  7: { literary: 1200, informational: 1750, paired: 1500, table: 1750 },
  8: { literary: 1350, informational: 1950, paired: 1700, table: 1950 },
};

const passageQualityBands: Record<number, { tolerance: number; literaryComplexity: string; informationalComplexity: string }> = {
  3: { tolerance: 35, literaryComplexity: "clear sequence, concrete problem, dialogue, feelings, simple central message", informationalComplexity: "short sections, concrete examples, simple domain vocabulary, one clear visual/data connection" },
  4: { tolerance: 40, literaryComplexity: "character motivation, changing relationship, dialogue, internal thoughts, theme support", informationalComplexity: "sequence or cause/effect sections, labeled visual details, context clues for domain words" },
  5: { tolerance: 50, literaryComplexity: "sustained conflict, interactions that affect character, theme, precise evidence", informationalComplexity: "headings, diagram/table connection, relationships among ideas, domain vocabulary" },
  6: { tolerance: 60, literaryComplexity: "episode structure, character reactions, shifting emotions, idioms or connotation", informationalComplexity: "cause/effect, problem/solution, technical vocabulary, objective summary details" },
  7: { tolerance: 70, literaryComplexity: "interacting story elements, theme development, dialogue, conflict escalation", informationalComplexity: "section contribution, historical or scientific context, central idea development" },
  8: { tolerance: 80, literaryComplexity: "incidents and dialogue that propel action, perspective, theme, precise word choice", informationalComplexity: "multi-step reasoning, technical context, structure that affects meaning" },
};

const administrationBlueprint: Record<number, Array<{ section: number; srte: number; constructed: number; actualTestingMinutes: string; totalMinutes: string }>> = {
  3: [
    { section: 1, srte: 18, constructed: 1, actualTestingMinutes: "50-60", totalMinutes: "65-80" },
    { section: 2, srte: 10, constructed: 1, actualTestingMinutes: "30-40", totalMinutes: "45-60" },
    { section: 3, srte: 19, constructed: 1, actualTestingMinutes: "50-60", totalMinutes: "65-80" },
  ],
  4: [
    { section: 1, srte: 29, constructed: 0, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
    { section: 2, srte: 10, constructed: 1, actualTestingMinutes: "65-75", totalMinutes: "80-95" },
    { section: 3, srte: 12, constructed: 1, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
  ],
  5: [
    { section: 1, srte: 30, constructed: 0, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
    { section: 2, srte: 10, constructed: 1, actualTestingMinutes: "65-75", totalMinutes: "80-95" },
    { section: 3, srte: 12, constructed: 1, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
  ],
  6: [
    { section: 1, srte: 31, constructed: 0, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
    { section: 2, srte: 10, constructed: 1, actualTestingMinutes: "65-75", totalMinutes: "80-95" },
    { section: 3, srte: 11, constructed: 1, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
  ],
  7: [
    { section: 1, srte: 30, constructed: 0, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
    { section: 2, srte: 10, constructed: 1, actualTestingMinutes: "65-75", totalMinutes: "80-95" },
    { section: 3, srte: 12, constructed: 1, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
  ],
  8: [
    { section: 1, srte: 27, constructed: 0, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
    { section: 2, srte: 10, constructed: 1, actualTestingMinutes: "65-75", totalMinutes: "80-95" },
    { section: 3, srte: 14, constructed: 1, actualTestingMinutes: "70-80", totalMinutes: "85-100" },
  ],
};

export function getElaStandardsForGrade(gradeLevel: number): GradeStandard[] {
  const grade = clampGrade(gradeLevel);
  const reading = readingLabels.map(([letter, skill, label, strand], index) => ({
    code: `CC.${index < 4 ? "1.2" : "1.3"}.${grade}.${letter}`,
    label: skill === "Inference" ? inferenceByGrade[grade].informationalLabel : skill === "Literary Inference" ? inferenceByGrade[grade].literatureLabel : label,
    skill,
    strand: strand as GradeStandard["strand"],
  }));
  const conventions = conventionSkills.map((skill, index) => ({
    code: `CC.1.4.${grade}.F${index + 1}`,
    label: `${skill} in Standard English`,
    skill,
    strand: "Conventions" as const,
  }));
  const constructedResponse = grade === 3
    ? { code: `CC.1.2.${grade}.B`, label: "Reading short-answer response with text-based support", skill: "Short Answer Reading Response", strand: "Writing" as const }
    : { code: `CC.1.4.${grade}.S`, label: "Text-dependent analysis essay", skill: "TDA Writing", strand: "Writing" as const };
  return [...reading, pointOfViewByGrade[grade], settingByGrade[grade], plotByGrade[grade], flashbackByGrade[grade], figurativeLanguageByGrade[grade], ...conventions, constructedResponse];
}

export function generateDiagnosticAssessment(gradeLevel: number) {
  const grade = clampGrade(gradeLevel);
  const passages = buildPassages(grade);
  const standards = getElaStandardsForGrade(grade);
  const standardBySkill = new Map(standards.map((standard) => [standard.skill, standard]));
  const questions: Question[] = [];
  let id = grade * 10000 + 1;
  let readingItemIndex = 0;
  for (const section of administrationBlueprint[grade]) {
    let remainingSrte = section.srte;
    if (section.section === 1) {
      conventionSkills.slice(0, Math.min(9, remainingSrte)).forEach((skill, index) => {
        questions.push(buildConventionsQuestion({ grade, skill, index, id: id++ }));
      });
      remainingSrte -= Math.min(9, remainingSrte);
    }

    const sectionPlans = buildGroupedReadingPlans({ grade, section: section.section, count: remainingSrte });
    sectionPlans.forEach((item) => {
      const passage = passages.find((entry) => entry.id === item.passageId) || passages[0];
      const standard = standardBySkill.get(item.skill) || standards[readingItemIndex % standards.length];
      questions.push(buildReadingQuestion({ id: id++, grade, standard, type: item.type, passage, itemIndex: readingItemIndex++ }));
    });

    if (section.constructed) {
      const constructedPassage = constructedResponsePassageForSection(grade, section.section, passages);
      if (grade === 3) {
        questions.push(buildGrade3ShortAnswerQuestion({ grade, passage: constructedPassage, id: id++ }));
      } else {
        questions.push(buildTdaQuestion({ grade, passage: constructedPassage, id: id++, promptFocus: tdaFocusForSection(section.section, constructedPassage) }));
      }
    }
  }

  return {
    gradeLevel: grade,
    title: `Grade ${grade} PSSA ELA Diagnostic`,
    standards,
    passages,
    questions: applyAdministrationSections(grade, questions),
  };
}

export function generateGrade6DiagnosticQuestions() {
  return generateDiagnosticAssessment(6).questions;
}

export const grade6ElaStandards = getElaStandardsForGrade(6).filter((standard) => standard.strand !== "Conventions" && standard.strand !== "Writing");

function buildGroupedReadingPlans({ grade, section, count }: { grade: number; section: number; count: number }) {
  const blocks = passageBlocksForSection(grade, section, count);
  const plans: Array<{ type: QuestionType; passageId: string; skill: string }> = [];
  blocks.forEach((block) => {
    const skills = skillsForPassageBlock(grade, block.passageId);
    for (let i = 0; i < block.count; i += 1) {
      plans.push({ passageId: block.passageId, skill: skills[i % skills.length], type: questionTypeForBlockItem(i) });
    }
  });
  return plans.slice(0, count);
}

function passageBlocksForSection(grade: number, section: number, count: number) {
  if (count <= 0) return [];
  const sectionPassages = section === 1
    ? ["informational", "literary", "paired"]
    : section === 2
      ? ["table"]
      : grade === 3
        ? ["paired", "table"]
        : ["literary"];
  const base = Math.floor(count / sectionPassages.length);
  let remainder = count % sectionPassages.length;
  return sectionPassages.map((passageId) => {
    const blockCount = base + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    return { passageId, count: blockCount };
  }).filter((block) => block.count > 0);
}

function skillsForPassageBlock(grade: number, passageId: string) {
  const plotSkill = grade >= 7 ? "Plot Analysis" : "Plot Development";
  const settingSkill = grade >= 7 ? "Setting Analysis" : grade >= 6 ? "Setting Impact" : "Setting";
  if (passageId === "literary") return ["Theme", "Literary Inference", settingSkill, plotSkill, "Point of View", "Figurative Language", "Flashback", "Literary Vocabulary"];
  if (passageId === "paired") return ["Main Idea", "Inference", "Point of View", "Text Structure", "Vocabulary", "Inference"];
  return ["Main Idea", "Inference", "Text Structure", "Vocabulary", "Point of View", "Inference"];
}

function questionTypeForBlockItem(index: number): QuestionType {
  const cycle: QuestionType[] = ["MCQ", "MCQ", "EBSR", "MCQ", "DRAG_DROP", "MCQ", "HOT_TEXT", "MCQ", "MULTI_SELECT", "MCQ", "MCQ", "EBSR"];
  return cycle[index % cycle.length];
}

function constructedResponsePassageForSection(grade: number, section: number, passages: DiagnosticPassage[]) {
  const key = grade === 3
    ? section === 1 ? "informational" : section === 2 ? "literary" : "paired"
    : section === 2 ? "table" : "literary";
  return passages.find((passage) => passage.id === key) || passages[0];
}

function tdaFocusForSection(section: number, passage: DiagnosticPassage) {
  if (passage.id === "table") return "how the author uses information from the passage and table to develop the idea that evidence helps students choose an effective water-saving design";
  if (passage.id === "paired") return "how evidence from both texts develops the idea that planning and cooperation can improve a shared space";
  if (section === 2) return `how the author develops an important idea in ${passage.title}`;
  return "how the author's description of Nora's decisions develops a theme about responsibility";
}

function buildPassages(grade: number): DiagnosticPassage[] {
  const targets = passageTargets[grade];
  const samplerProfile = getSamplerPatternProfile(grade);
  const literary = makePassage({
    id: "literary",
    grade,
    title: "The Last Bell Before the Storm",
    passageType: "LITERARY",
    genre: "Realistic Fiction",
    target: targets.literary,
    hasSections: false,
    hasTable: false,
    seed: [
      "Nora heard thunder just as the final bell rang, but she did not move toward the buses with everyone else.",
      "\"The garden signs will blow away,\" she told Malik, clutching the folder their class had prepared for the community exhibit.",
      "Malik wanted to leave, yet he saw how much the project mattered after weeks of measuring seedlings and interviewing neighbors.",
      "Together they crossed the courtyard, argued about the safest plan, and discovered that responsibility sometimes asks for courage before comfort.",
      "By the time the rain began, Nora understood that leadership was not giving orders; it was listening, choosing, and staying when help was needed.",
    ],
    metadata: { includesDialogue: true, includesConflict: true, includesTheme: true, includesCharacterDevelopment: true, samplerSignals: samplerProfile.passageComplexitySignals },
  });

  const informational = makePassage({
    id: "informational",
    grade,
    title: "How Wetlands Protect a Watershed",
    passageType: "INFORMATIONAL_SCIENCE",
    genre: "Informational Science",
    target: targets.informational,
    hasSections: true,
    hasTable: false,
    seed: [
      "## Natural Filters",
      "Wetlands are areas where water covers the soil long enough to shape the plants, animals, and microscopic life that survive there.",
      "Specialized roots slow moving water, while sediment settles before it can cloud a stream or reservoir.",
      "This cause-and-effect process helps explain why engineers sometimes design artificial wetlands near roads, farms, and neighborhoods.",
      "Technical vocabulary such as watershed, sediment, filtration, and habitat helps scientists describe how one system protects another.",
      "## Solving Runoff Problems",
      "When heavy rain falls on pavement, runoff can carry fertilizer, oil, and loose soil into creeks.",
      "A healthy wetland reduces that problem by spreading water across a broad area and giving plants time to absorb extra nutrients.",
    ],
    metadata: { structure: "cause/effect and problem/solution", technicalVocabulary: ["watershed", "sediment", "filtration", "habitat"], samplerSignals: samplerProfile.passageComplexitySignals },
  });

  const pairedFirst = buildToTarget([
    "Text 1: In \"A Window Garden,\" a student narrator explains how a class grows herbs in recycled containers beside a sunny window.",
    "The narrator focuses on patience, observation, and the surprise of seeing small changes become useful food for the cafeteria.",
    "The central idea is that small actions can improve a community when people record data and share responsibility.",
  ], Math.floor(targets.paired / 2), { grade, passageType: "PAIRED_TEXT", genre: "Paired Informational/Literary Texts" });
  const pairedSecond = buildToTarget([
    "Text 2: In \"The Empty Lot Plan,\" a neighborhood group debates whether an unused lot should become a parking area or a public garden.",
    "The author presents reasons on both sides before showing how evidence from soil tests, traffic counts, and resident surveys shapes the decision.",
    "Both texts explore how planning and cooperation can turn an ordinary space into a resource.",
  ], targets.paired - wordCount(pairedFirst), { grade, passageType: "PAIRED_TEXT", genre: "Paired Informational/Literary Texts" });
  const pairedContent = `${pairedFirst}\n\n${pairedSecond}`;
  const pairedMetadata = buildPassageMetadata({
    grade,
    passageType: "PAIRED_TEXT",
    content: pairedContent,
    target: targets.paired,
    metadata: { textCount: 2, sharedTheme: "community problem solving", centralIdea: "Evidence and cooperation help communities improve shared spaces.", samplerSignals: samplerProfile.passageComplexitySignals },
  });
  const paired: DiagnosticPassage = {
    id: "paired",
    title: "Two Views of a Community Garden",
    passageType: "PAIRED_TEXT",
    genre: "Paired Informational/Literary Texts",
    content: pairedContent,
    wordCountTarget: targets.paired,
    actualWordCount: wordCount(pairedContent),
    hasTable: false,
    hasSections: true,
    gradeLevel: grade,
    metadata: pairedMetadata,
  };

  const tableData = {
    title: "Student Water-Saving Design Results",
    columns: ["Design", "Water Saved per Week", "Primary Challenge"],
    rows: [
      ["Rain barrel", "42 gallons", "Overflow during storms"],
      ["Drip irrigation", "31 gallons", "Initial setup time"],
      ["Mulch beds", "18 gallons", "Needs seasonal replacement"],
    ],
  };
  const table = makePassage({
    id: "table",
    grade,
    title: "Designing a Water-Smart Schoolyard",
    passageType: "INFORMATIONAL_TABLE",
    genre: "Informational with Chart",
    target: targets.table,
    hasSections: true,
    hasTable: true,
    tableData,
    seed: [
      "## The Problem",
      "During a dry spring, students noticed that the schoolyard garden needed more water than the outdoor club could easily carry.",
      "They defined the problem as a design challenge: reduce wasted water while keeping plants healthy enough for science observations.",
      "## Testing Possible Solutions",
      "Teams researched conservation, compared prototypes, and recorded weekly results in a chart.",
      "The table shows that each solution helped, but each also created a different trade-off.",
      "## Using Data",
      "The strongest proposal combined a rain barrel with drip irrigation because the two tools solved different parts of the same problem.",
    ],
    metadata: { structure: "problem/solution", technicalVocabulary: ["prototype", "conservation", "irrigation", "trade-off"], samplerSignals: samplerProfile.passageComplexitySignals },
  });

  return [literary, informational, paired, table];
}

function buildReadingQuestion({ id, grade, standard, type, passage, itemIndex }: { id: number; grade: number; standard: GradeStandard; type: QuestionType; passage: DiagnosticPassage; itemIndex: number }): Question {
  const base = {
    id,
    gradeLevel: grade,
    passageId: passage.id,
    passageType: passage.passageType,
    skill: standard.skill,
    standardCode: standard.code,
    standardLabel: standard.label,
    difficulty: itemIndex < 4 ? 2 : itemIndex < 9 ? 3 : 4,
    type,
    passageTitle: passage.title,
    passage: passage.content,
    passageMetadata: passage,
    tableData: passage.tableData,
    explanation: `This item checks ${standard.label.toLowerCase()} using the ${passage.genre.toLowerCase()} passage.`,
    skillTip: `Use specific evidence from ${passage.title} to answer ${standard.skill} questions.`,
    correctAnswer: "See keyed answer fields.",
  };
  const samplerStem = samplerStemForGrade({ gradeLevel: grade, type, skill: standard.skill, passageTitle: passage.title, passageType: passage.passageType, itemIndex });

  if (grade === 3 && ["MULTI_SELECT", "HOT_TEXT", "DRAG_DROP"].includes(type)) {
    return buildGrade3TechnologyEnhancedQuestion({ base, type, passage, itemIndex });
  }
  if (grade === 4 && ["MULTI_SELECT", "HOT_TEXT", "DRAG_DROP"].includes(type)) {
    return buildGrade4TechnologyEnhancedQuestion({ base, type, passage, itemIndex });
  }
  if (grade === 5 && ["MULTI_SELECT", "HOT_TEXT", "DRAG_DROP"].includes(type)) {
    return buildGrade5TechnologyEnhancedQuestion({ base, type, itemIndex });
  }
  if (grade === 6 && ["MULTI_SELECT", "HOT_TEXT", "DRAG_DROP"].includes(type)) {
    return buildGrade6TechnologyEnhancedQuestion({ base, type, passage, itemIndex });
  }
  if (grade === 7 && ["MULTI_SELECT", "HOT_TEXT", "DRAG_DROP"].includes(type)) {
    return buildGrade7TechnologyEnhancedQuestion({ base, type, itemIndex });
  }

  if (standard.skill === "Point of View") {
    const pov = pointOfViewPromptForGrade(grade, passage.title);
    if (type === "HOT_TEXT") {
      return { ...base, type, hotTextPrompt: pov.hotTextPrompt, selectableSpans: pov.hotTextSpans, correctSpanIndices: [1], distractorRationale: ["Introduces the topic but does not reveal POV.", "Correct.", "Related detail but not strongest for POV."], correctAnswer: [1] };
    }
    if (type === "MULTI_SELECT") {
      return { ...base, type, question: pov.multiQuestion, choices: pov.multiChoices, correctIndices: [0, 2], distractorRationale: ["Correct.", "Too general.", "Correct.", "Not supported by narration."], correctAnswer: [0, 2] };
    }
    if (type === "DRAG_DROP") {
      return { ...base, type, dragDropPrompt: "Match each detail to what it shows about point of view.", categories: ["Narrator Perspective", "Author Bias or Viewpoint"], dragItems: [{ id: "d1", text: "The narrator uses I, me, or my to tell events." }, { id: "d2", text: "The author includes loaded words that reveal an opinion." }, { id: "d3", text: "The narrator knows one character's thoughts closely." }, { id: "d4", text: "The text presents one side more favorably than another." }], correctMapping: { d1: "Narrator Perspective", d2: "Author Bias or Viewpoint", d3: "Narrator Perspective", d4: "Author Bias or Viewpoint" }, distractorRationale: "Narrator perspective is about who tells the story; bias or viewpoint is about how ideas are shaped.", correctAnswer: { d1: "Narrator Perspective", d2: "Author Bias or Viewpoint", d3: "Narrator Perspective", d4: "Author Bias or Viewpoint" } };
    }
    return { ...base, type: "MCQ", question: pov.question, choices: pov.choices, correctIndex: 0, distractorRationale: ["Correct.", "This identifies a detail but not POV.", "This ignores the narrator or author viewpoint.", "This is not supported by the passage."], correctAnswer: 0 };
  }

  if (standard.skill === "Inference" || standard.skill === "Literary Inference") {
    const inference = inferencePromptForGrade(grade, passage.title, standard.skill);
    if (type === "EBSR") {
      const stem = typeof samplerStem === "object" ? samplerStem : null;
      return { ...base, type, partAQuestion: stem?.partAQuestion || inference.partAQuestion, partAChoices: inference.partAChoices, partACorrectIndex: 0, partBQuestion: stem?.partBQuestion || "Which TWO details best support the answer to Part A?", partBChoices: inference.partBChoices, partBCorrectIndices: [0, 2], correctAnswer: { partA: 0, partB: [0, 2] } };
    }
    if (type === "SHORT_RESPONSE") {
      return { ...base, type, prompt: inference.shortResponsePrompt, sampleAnswer: inference.sampleAnswer, maxScore: grade === 3 ? 3 : 2, correctAnswer: inference.sampleAnswer };
    }
    return { ...base, type: "MCQ", question: typeof samplerStem === "string" ? samplerStem : inference.question, choices: inference.choices, correctIndex: 0, distractorRationale: ["Correct; this inference is supported by text clues.", "This is a guess without enough evidence.", "This is obvious but not the best inference.", "This ignores important clues."], correctAnswer: 0 };
  }

  if (standard.skill === "Figurative Language") {
    const figurative = figurativeLanguagePromptForGrade(grade, passage.title, itemIndex);
    return { ...base, type: "MCQ", question: typeof samplerStem === "string" ? samplerStem : figurative.question, choices: figurative.choices, correctIndex: 0, distractorRationale: figurative.distractorRationale, correctAnswer: 0 };
  }

  if (standard.skill === "Flashback") {
    const flashback = flashbackPromptForGrade(grade, passage.title);
    return { ...base, type: "MCQ", question: flashback.question, choices: flashback.choices, correctIndex: 0, distractorRationale: flashback.distractorRationale, correctAnswer: 0 };
  }

  if (standard.skill === "Plot Development" || standard.skill === "Plot Analysis") {
    const plot = plotPromptForGrade(grade, passage.title, itemIndex);
    return { ...base, type: "MCQ", question: plot.question, choices: plot.choices, correctIndex: 0, distractorRationale: plot.distractorRationale, correctAnswer: 0 };
  }

  if (standard.skill === "Setting" || standard.skill === "Setting Impact" || standard.skill === "Setting Analysis") {
    const setting = settingPromptForGrade(grade, passage.title, itemIndex);
    return { ...base, type: "MCQ", question: setting.question, choices: setting.choices, correctIndex: 0, distractorRationale: setting.distractorRationale, correctAnswer: 0 };
  }

  if (type === "EBSR") {
    const stem = typeof samplerStem === "object" ? samplerStem : null;
    return { ...base, type, partAQuestion: stem?.partAQuestion || `Which conclusion is best supported by ${passage.title}?`, partAChoices: ["The passage mainly lists unrelated facts.", "The author develops an idea through connected evidence.", "The passage avoids explaining causes.", "The title is the only useful clue."], partACorrectIndex: 1, partBQuestion: stem?.partBQuestion || "Which TWO details best support Part A?", partBChoices: ["A detail introduces the topic.", "A detail explains why the idea matters.", "A detail names an unrelated example.", "A second detail shows how evidence develops the idea."], partBCorrectIndices: [1, 3], correctAnswer: { partA: 1, partB: [1, 3] } };
  }
  if (type === "MULTI_SELECT") {
    return { ...base, type, question: `Select TWO details that best support the central idea of ${passage.title}.`, choices: ["A detail that directly supports the main point.", "A minor description that adds background.", "A second detail that confirms the main point.", "A detail that is interesting but not central."], correctIndices: [0, 2], distractorRationale: ["Correct.", "Background only.", "Correct.", "Not central."], correctAnswer: [0, 2] };
  }
  if (type === "HOT_TEXT") {
    return { ...base, type, hotTextPrompt: "Select the sentence that gives the strongest evidence for the author's point.", selectableSpans: ["The passage introduces the topic or conflict.", "The key sentence connects evidence to the central idea.", "The passage ends with a related detail."], correctSpanIndices: [1], distractorRationale: ["Introductory only.", "Correct.", "Related but less direct."], correctAnswer: [1] };
  }
  if (type === "DRAG_DROP") {
    return { ...base, type, dragDropPrompt: "Match each detail to the role it plays in the passage.", categories: ["Central Evidence", "Supporting Context"], dragItems: [{ id: "d1", text: "Shows the main problem or conflict." }, { id: "d2", text: "Adds background about the setting." }, { id: "d3", text: "Explains why the evidence matters." }, { id: "d4", text: "Names a secondary detail." }], correctMapping: { d1: "Central Evidence", d2: "Supporting Context", d3: "Central Evidence", d4: "Supporting Context" }, distractorRationale: "Central evidence directly supports the answer; context helps but is less important.", correctAnswer: { d1: "Central Evidence", d2: "Supporting Context", d3: "Central Evidence", d4: "Supporting Context" } };
  }
  return { ...base, type: "MCQ", question: typeof samplerStem === "string" ? samplerStem : `Which answer best explains ${standard.skill.toLowerCase()} in ${passage.title}?`, choices: ["The author develops the idea with relevant details from the passage.", "The author includes details that do not connect to one idea.", "The passage is mostly a list without a structure.", "The best answer can be found by using the title only."], correctIndex: 0, distractorRationale: ["Correct.", "Too broad.", "Incorrect.", "Too limited."], correctAnswer: 0 };
}

function buildGrade3TechnologyEnhancedQuestion({
  base,
  type,
  passage,
  itemIndex,
}: {
  base: Omit<Question, "question" | "choices" | "correctIndex" | "distractorRationale" | "hotTextPrompt" | "selectableSpans" | "correctSpanIndices" | "correctIndices" | "dragDropPrompt" | "categories" | "dragItems" | "correctMapping" | "partAQuestion" | "partAChoices" | "partACorrectIndex" | "partBQuestion" | "partBChoices" | "partBCorrectIndices" | "prompt" | "rubric" | "maxScore" | "sampleAnswer">;
  type: QuestionType;
  passage: DiagnosticPassage;
  itemIndex: number;
}): Question {
  if (type === "MULTI_SELECT") {
    return {
      ...base,
      type,
      question: "Read the paragraph. Select TWO phrases that help you understand the meaning of \"do not rush.\"",
      choices: [
        "walk at a leisurely pace",
        "take in the sights, sounds, and smells",
        "near a swamp",
        "different things",
      ],
      correctIndices: [0, 2],
      distractorRationale: [
        "Correct; this phrase shows moving slowly.",
        "Correct; this phrase shows taking time to notice details.",
        "This tells a place, not the meaning of the phrase.",
        "This is related to the passage but does not explain the phrase.",
      ],
      correctAnswer: [0, 1],
    };
  }

  if (type === "HOT_TEXT") {
    return {
      ...base,
      type,
      hotTextPrompt: "Read the sentence. Select the correctly spelled word from the underlined pair.",
      selectableSpans: [
        "Mr. Long bought some carrots at the market.",
        "Mr. Long boght some carrots at the market.",
        "The carrots cost fourty cents.",
        "He saved the wrest to eat later.",
      ],
      correctSpanIndices: [0],
      distractorRationale: [
        "Correct; bought is spelled correctly.",
        "Boght is not spelled correctly.",
        "Fourty is not spelled correctly.",
        "Wrest is not the correct word for what is left over.",
      ],
      correctAnswer: [0],
    };
  }

  return {
    ...base,
    type: "DRAG_DROP",
    dragDropPrompt: "Read the sentences. Move the most descriptive phrase onto the blank line to complete sentence 3.",
    categories: ["Blank Line in Sentence 3", "Not the Best Completion"],
    dragItems: [
      { id: "d1", text: "had more than enough strawberries in it" },
      { id: "d2", text: "had plenty of good strawberries in it" },
      { id: "d3", text: "was packed full of juicy strawberries" },
      { id: "d4", text: "was filled with wonderful strawberries" },
    ],
    correctMapping: {
      d1: "Not the Best Completion",
      d2: "Not the Best Completion",
      d3: "Blank Line in Sentence 3",
      d4: "Not the Best Completion",
    },
    distractorRationale: "The correct phrase is the most vivid and descriptive, while the other phrases are less precise.",
    correctAnswer: {
      d1: "Not the Best Completion",
      d2: "Not the Best Completion",
      d3: "Blank Line in Sentence 3",
      d4: "Not the Best Completion",
    },
  };
}

function buildGrade4TechnologyEnhancedQuestion({
  base,
  type,
}: {
  base: Omit<Question, "question" | "choices" | "correctIndex" | "distractorRationale" | "hotTextPrompt" | "selectableSpans" | "correctSpanIndices" | "correctIndices" | "dragDropPrompt" | "categories" | "dragItems" | "correctMapping" | "partAQuestion" | "partAChoices" | "partACorrectIndex" | "partBQuestion" | "partBChoices" | "partBCorrectIndices" | "prompt" | "rubric" | "maxScore" | "sampleAnswer">;
  type: QuestionType;
  passage: DiagnosticPassage;
  itemIndex: number;
}): Question {
  if (type === "MULTI_SELECT") {
    return {
      ...base,
      type,
      question: "This question has two parts. Part One asks for the theme of the passage. Part Two: Select TWO details that best support the theme that friendship can begin when people find something in common.",
      choices: [
        "A classmate says she has read the same mystery book and enjoyed it.",
        "The new student worries about starting over at a different school.",
        "Two students discover they share the same homeroom and an interest in mysteries.",
        "The bus ride home feels longer than usual after a difficult day.",
        "A note invites the new student to solve a puzzle with the club.",
      ],
      correctIndices: [0, 2],
      distractorRationale: [
        "Correct; this detail shows a shared interest that can begin a friendship.",
        "This is an important problem, but it does not directly support the theme.",
        "Correct; this detail shows the students finding something in common.",
        "This adds setting and mood, but it does not best support the theme.",
        "This advances the plot, but it is weaker evidence for the theme than the shared interests.",
      ],
      correctAnswer: [0, 2],
    };
  }

  if (type === "HOT_TEXT") {
    return {
      ...base,
      type,
      hotTextPrompt: "Read the paragraph. Select the sentence that should be revised to maintain a formal style.",
      selectableSpans: [
        "Many communities create gardens that provide food and shelter for pollinators.",
        "Butterflies and bees move pollen from one flower to another as they search for nectar.",
        "Lots of people think those tiny bugs are super cool and fun to watch.",
        "Planting native flowers can help pollinators survive in changing environments.",
      ],
      correctSpanIndices: [2],
      distractorRationale: [
        "This sentence uses a formal informational style.",
        "This sentence uses a formal informational style.",
        "Correct; words such as 'Lots of,' 'tiny bugs,' and 'super cool' are too informal for the paragraph.",
        "This sentence uses a formal informational style.",
      ],
      correctAnswer: [2],
    };
  }

  return {
    ...base,
    type: "DRAG_DROP",
    dragDropPrompt: "A student is writing an informational report. Move each sentence into the table to show whether the style is formal or informal.",
    categories: ["Formal Style", "Informal Style"],
    dragItems: [
      { id: "d1", text: "To make recycled paper, fibers are mixed with water to form pulp." },
      { id: "d2", text: "It is kind of wild that old paper can turn into brand-new sheets." },
      { id: "d3", text: "The pulp is spread thinly and pressed until much of the water is removed." },
      { id: "d4", text: "The whole process is really neat because the paper gets squished flat." },
    ],
    correctMapping: {
      d1: "Formal Style",
      d2: "Informal Style",
      d3: "Formal Style",
      d4: "Informal Style",
    },
    distractorRationale: "Formal sentences sound precise and appropriate for a report. Informal sentences use casual words or phrases such as 'kind of,' 'really neat,' or 'squished.'",
    correctAnswer: {
      d1: "Formal Style",
      d2: "Informal Style",
      d3: "Formal Style",
      d4: "Informal Style",
    },
  };
}

function buildGrade5TechnologyEnhancedQuestion({
  base,
  type,
}: {
  base: Omit<Question, "question" | "choices" | "correctIndex" | "distractorRationale" | "hotTextPrompt" | "selectableSpans" | "correctSpanIndices" | "correctIndices" | "dragDropPrompt" | "categories" | "dragItems" | "correctMapping" | "partAQuestion" | "partAChoices" | "partACorrectIndex" | "partBQuestion" | "partBChoices" | "partBCorrectIndices" | "prompt" | "rubric" | "maxScore" | "sampleAnswer">;
  type: QuestionType;
  itemIndex: number;
}): Question {
  if (type === "MULTI_SELECT") {
    return {
      ...base,
      type,
      question: "Read the paragraph. Select TWO phrases that help you understand the meaning of \"do not rush.\"",
      choices: [
        "walk at a leisurely pace",
        "comfortable stride",
        "you will see different things",
        "near a swamp",
      ],
      correctIndices: [0, 1],
      distractorRationale: [
        "Correct; this phrase shows moving without hurrying.",
        "Correct; this phrase explains the relaxed pace.",
        "This tells what may happen later, not what the phrase means.",
        "This names a place, not the meaning of the phrase.",
      ],
      correctAnswer: [0, 1],
    };
  }

  if (type === "HOT_TEXT") {
    return {
      ...base,
      type,
      hotTextPrompt: "Read the sentence. Select the underlined word that is spelled incorrectly.",
      selectableSpans: [
        "She found the puppy hiding underneath the porch.",
        "She found the puppy hiding beside an enormus piece of furniture.",
        "She found the puppy hiding near the library.",
        "She found the puppy hiding behind the chair.",
      ],
      correctSpanIndices: [1],
      distractorRationale: [
        "Underneath is spelled correctly.",
        "Correct; enormus should be spelled enormous.",
        "Library is spelled correctly.",
        "Behind is spelled correctly.",
      ],
      correctAnswer: [1],
    };
  }

  return {
    ...base,
    type: "DRAG_DROP",
    dragDropPrompt: "Read the descriptions of sources used in the classroom. Move the two correctly written sources into the table.",
    categories: ["Correctly Written Descriptions", "Needs Revision"],
    dragItems: [
      { id: "d1", text: "a newspaper article titled \"Art in the 1920s\"" },
      { id: "d2", text: "a book titled \"The Habitat of Turtles\"" },
      { id: "d3", text: "a book titled How to Fix a Bicycle" },
      { id: "d4", text: "a newspaper article titled Amazing Leonardo da Vinci" },
    ],
    correctMapping: {
      d1: "Correctly Written Descriptions",
      d2: "Needs Revision",
      d3: "Correctly Written Descriptions",
      d4: "Needs Revision",
    },
    distractorRationale: "Article titles use quotation marks. Book titles should be treated as full work titles, while article titles without quotation marks need revision.",
    correctAnswer: {
      d1: "Correctly Written Descriptions",
      d2: "Needs Revision",
      d3: "Correctly Written Descriptions",
      d4: "Needs Revision",
    },
  };
}

function buildGrade6TechnologyEnhancedQuestion({
  base,
  type,
  passage,
}: {
  base: Omit<Question, "question" | "choices" | "correctIndex" | "distractorRationale" | "hotTextPrompt" | "selectableSpans" | "correctSpanIndices" | "correctIndices" | "dragDropPrompt" | "categories" | "dragItems" | "correctMapping" | "partAQuestion" | "partAChoices" | "partACorrectIndex" | "partBQuestion" | "partBChoices" | "partBCorrectIndices" | "prompt" | "rubric" | "maxScore" | "sampleAnswer">;
  type: QuestionType;
  passage: DiagnosticPassage;
  itemIndex: number;
}): Question {
  if (type === "MULTI_SELECT") {
    if (passage.passageType === "LITERARY") {
      return {
        ...base,
        type,
        interactionMode: "SELECT_TO_RESPOND",
        question: `Select THREE sentences from ${passage.title} that best show the experience was important for the narrator.`,
        choices: [
          "Nora had always wanted to help with a project that mattered to the whole school.",
          "Malik's nervous voice helped Nora understand that the problem needed teamwork.",
          "The courtyard looked different under the gray sky.",
          "Nora counted the signs and made a safer plan before moving them.",
          "By the end, Nora understood that responsibility sometimes means asking for help.",
        ],
        correctIndices: [0, 1, 4],
        distractorRationale: [
          "Correct; this shows the narrator's personal connection to the experience.",
          "Correct; this shows learning through another character's response.",
          "This detail describes setting, but it is not one of the strongest details about importance.",
          "This shows an action, but it is less connected to why the experience matters.",
          "Correct; this states what the narrator learns from the experience.",
        ],
        correctAnswer: [0, 1, 4],
      };
    }
    return {
      ...base,
      type,
      question: `Select TWO pieces of evidence from ${passage.title} that best support the central idea.`,
      choices: [
        "A detail that explains how the problem affects the larger system.",
        "A detail that gives unrelated background about a different topic.",
        "A detail that shows why the solution or idea matters.",
        "A detail that only repeats a word from the title.",
      ],
      correctIndices: [0, 2],
      distractorRationale: [
        "Correct; this supports the central idea with text evidence.",
        "This may sound connected, but it does not support the main idea.",
        "Correct; this explains why the idea matters.",
        "Repeating a title word is not enough evidence.",
      ],
      correctAnswer: [0, 2],
    };
  }

  if (type === "HOT_TEXT") {
    if (passage.passageType === "LITERARY") {
      return {
        ...base,
        type,
        interactionMode: "SUMMARY_HIGHLIGHT",
        hotTextPrompt: `Read the summary of ${passage.title}. Then select the one sentence that needs to be added to make the summary complete.`,
        selectableSpans: [
          "The courtyard signs are in danger because rain and wind are moving into the schoolyard.",
          "The class had worked on the exhibit, and Nora wants to protect the project before the storm damages it.",
          "Nora and Malik disagree at first, but they listen to each other and make a safer plan.",
          "The story shows that Nora learns responsibility can include asking for help and sharing the work.",
        ],
        correctSpanIndices: [2],
        distractorRationale: [
          "This introduces the problem but does not complete the middle of the summary.",
          "This explains background, but the summary already includes the project.",
          "Correct; this sentence adds the missing major event that connects the problem to the lesson.",
          "This is the lesson, but it does not add the missing event.",
        ],
        correctAnswer: [2],
      };
    }
    return {
      ...base,
      type,
      hotTextPrompt: "Read the paragraph. Select the sentence that should be revised to maintain the style of the paragraph.",
      selectableSpans: [
        "In many areas around the world, highways pass directly through the habitats of many animals.",
        "Crossing the roads got really, really hard for some animals.",
        "As a result, people have designed and built special bridges and tunnels just for wildlife.",
        "These new wildlife crossings allow animals to move over or under the highway safely.",
      ],
      correctSpanIndices: [1],
      distractorRationale: [
        "This sentence fits the informational style.",
        "Correct; this sentence is too informal and should be revised.",
        "This sentence uses an appropriate informational style.",
        "This sentence maintains the formal style of the paragraph.",
      ],
      correctAnswer: [1],
    };
  }

  if (passage.passageType === "PAIRED_TEXT") {
    return {
      ...base,
      type: "DRAG_DROP",
      interactionMode: "MATCH_LINES",
      dragDropPrompt: "Match each detail to the correct passage title. Each passage title may connect to more than one detail.",
      categories: ["A Window Garden", "The Empty Lot Plan"],
      dragItems: [
        { id: "m1", text: "Students grow herbs in recycled containers." },
        { id: "m2", text: "People use soil tests and surveys before making a decision." },
        { id: "m3", text: "The text focuses on patience, observation, and classroom responsibility." },
        { id: "m4", text: "A group debates whether an unused space should become a garden or parking area." },
      ],
      correctMapping: {
        m1: "A Window Garden",
        m2: "The Empty Lot Plan",
        m3: "A Window Garden",
        m4: "The Empty Lot Plan",
      },
      distractorRationale: "Use details from each passage to connect the title to the matching detail.",
      correctAnswer: {
        m1: "A Window Garden",
        m2: "The Empty Lot Plan",
        m3: "A Window Garden",
        m4: "The Empty Lot Plan",
      },
    };
  }

  if (passage.passageType === "INFORMATIONAL_TABLE") {
    return {
      ...base,
      type: "DRAG_DROP",
      dragDropPrompt: "Use the passage and table. Match each statement to the solution it describes.",
      categories: ["Rain Barrel", "Drip Irrigation", "Both Solutions"],
      dragItems: [
        { id: "d1", text: "Stores water from the roof for later use." },
        { id: "d2", text: "Sends water slowly near plant roots." },
        { id: "d3", text: "Helps reduce wasted water in the schoolyard garden." },
        { id: "d4", text: "Requires students to think about maintenance before choosing a final plan." },
      ],
      correctMapping: {
        d1: "Rain Barrel",
        d2: "Drip Irrigation",
        d3: "Both Solutions",
        d4: "Both Solutions",
      },
      distractorRationale: "Use the passage and table together. Choose Both Solutions only when the statement applies to both designs.",
      correctAnswer: {
        d1: "Rain Barrel",
        d2: "Drip Irrigation",
        d3: "Both Solutions",
        d4: "Both Solutions",
      },
    };
  }

  return {
    ...base,
    type: "DRAG_DROP",
    dragDropPrompt: `Use ${passage.title}. Match each statement to whether it is supported by the passage.`,
    categories: ["Supported by the Passage", "Not Supported by the Passage"],
    dragItems: [
      { id: "d1", text: "The text explains a problem and shows why it matters." },
      { id: "d2", text: "The text gives evidence that helps readers understand the central idea." },
      { id: "d3", text: "The text says the problem is solved by ignoring the evidence." },
      { id: "d4", text: "The text presents details in a way that helps readers compare ideas." },
    ],
    correctMapping: {
      d1: "Supported by the Passage",
      d2: "Supported by the Passage",
      d3: "Not Supported by the Passage",
      d4: "Supported by the Passage",
    },
    distractorRationale: "Supported statements must match evidence from the passage. A statement that contradicts the passage belongs in Not Supported.",
    correctAnswer: {
      d1: "Supported by the Passage",
      d2: "Supported by the Passage",
      d3: "Not Supported by the Passage",
      d4: "Supported by the Passage",
    },
  };
}

function buildGrade7TechnologyEnhancedQuestion({
  base,
  type,
}: {
  base: Omit<Question, "question" | "choices" | "correctIndex" | "distractorRationale" | "hotTextPrompt" | "selectableSpans" | "correctSpanIndices" | "correctIndices" | "dragDropPrompt" | "categories" | "dragItems" | "correctMapping" | "partAQuestion" | "partAChoices" | "partACorrectIndex" | "partBQuestion" | "partBChoices" | "partBCorrectIndices" | "prompt" | "rubric" | "maxScore" | "sampleAnswer">;
  type: QuestionType;
  itemIndex: number;
}): Question {
  if (type === "MULTI_SELECT") {
    return {
      ...base,
      type,
      question: "Move the sentences that best show visiting the aquarium was educational for the narrator into the box. Choose THREE answers.",
      choices: [
        "The first exhibit we went to featured sea life from the reefs in the Caribbean Sea.",
        "I learned that they aren't really fish.",
        "I learned so much more about marine life at the aquarium.",
        "I had always wanted to visit a giant aquarium.",
        "I also found out that I never wanted to get stung by one.",
      ],
      correctIndices: [0, 1, 2],
      distractorRationale: [
        "Correct; this sentence shows the narrator learned about sea life.",
        "Correct; this sentence shows the narrator learned a fact.",
        "Correct; this sentence directly states the educational value of the visit.",
        "This shows interest before the visit, not what was educational.",
        "This is a personal reaction, but it is not one of the strongest educational details.",
      ],
      correctAnswer: [0, 1, 2],
    };
  }

  if (type === "HOT_TEXT") {
    return {
      ...base,
      type,
      hotTextPrompt: "Read the summary. Select the one sentence that needs to be added to make the summary complete.",
      selectableSpans: [
        "There are many jellyfish to see at the aquarium.",
        "The class visits many of the exhibits, and the narrator sees some interesting marine animals.",
        "The narrator watches a show that describes why some of the wildlife found in the oceans are in danger.",
        "The jellyfish at the aquarium are very pretty.",
      ],
      correctSpanIndices: [1],
      distractorRationale: [
        "This detail is too narrow for the summary.",
        "Correct; this sentence adds the missing major event from the visit.",
        "This is related background, but it is not the best missing summary sentence.",
        "This is a minor opinion, not a complete summary detail.",
      ],
      correctAnswer: [1],
    };
  }

  return {
    ...base,
    type: "DRAG_DROP",
    dragDropPrompt: "Read the information from a reliable website. Match each cat breed to the characteristic supported by the text.",
    categories: ["Sphynx", "Cornish Rex", "Devon Rex"],
    dragItems: [
      { id: "d1", text: "Wrinkled skin and almost no hair" },
      { id: "d2", text: "Soft, wavy hair and long legs" },
      { id: "d3", text: "Active, affectionate, and attentive" },
      { id: "d4", text: "Very large ears and eyes" },
    ],
    correctMapping: {
      d1: "Sphynx",
      d2: "Cornish Rex",
      d3: "Devon Rex",
      d4: "Devon Rex",
    },
    distractorRationale: "Use the source details to match each characteristic to the breed it describes.",
    correctAnswer: {
      d1: "Sphynx",
      d2: "Cornish Rex",
      d3: "Devon Rex",
      d4: "Devon Rex",
    },
  };
}

function settingPromptForGrade(grade: number, title: string, itemIndex: number) {
  if (grade <= 3) {
    const bank = [
      {
        question: `Which detail best describes the setting of ${title}?`,
        choices: ["A detail that tells where or when the story happens", "A detail that gives only the author's name", "A detail that names a grammar rule", "A detail that is not in the story"],
        distractorRationale: ["Correct.", "Author name is not setting.", "Grammar is not setting.", "Unsupported details cannot describe setting."],
      },
      {
        question: `How does the setting connect to what happens in ${title}?`,
        choices: ["The place or time helps explain an important event", "The setting has no connection to events", "The setting only tells the title", "The setting changes the story into a poem"],
        distractorRationale: ["Correct.", "Setting often shapes events.", "A title is not enough.", "Setting does not change genre by itself."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  if (grade <= 5) {
    const bank = [
      {
        question: `How does the setting influence the character's actions in ${title}?`,
        choices: ["The time or place creates conditions that affect what the character does", "The setting prevents characters from making choices", "The setting only lists unrelated facts", "The setting is always less important than dialogue"],
        distractorRationale: ["Correct.", "Characters still respond to setting.", "Setting details should connect to events.", "Setting and dialogue can both matter."],
      },
      {
        question: `What mood does the setting help create in ${title}?`,
        choices: ["A mood supported by details about the place, time, or environment", "A mood that ignores all story details", "A mood based only on the page number", "A mood unrelated to the passage"],
        distractorRationale: ["Correct.", "Mood should be supported by details.", "Page numbers do not create mood.", "Unsupported mood is not a strong answer."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  if (grade <= 6) {
    const bank = [
      {
        question: `How does the setting affect the plot or character responses in ${title}?`,
        choices: ["The environment creates pressure that shapes events and character choices", "The setting only gives a decorative background", "The setting removes the need for conflict", "The setting has no effect on character decisions"],
        distractorRationale: ["Correct.", "On-grade setting analysis connects setting to plot or character.", "Conflict can be shaped by setting.", "Character decisions often respond to setting."],
      },
      {
        question: `How does the setting contribute to the conflict in ${title}?`,
        choices: ["The time, place, or environment makes the problem more urgent or difficult", "The setting solves the conflict before it begins", "The setting only names a color", "The setting proves there are no characters"],
        distractorRationale: ["Correct.", "Conflict usually develops before resolution.", "A color alone is not enough.", "Setting does not remove characters."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  if (grade <= 7) {
    const bank = [
      {
        question: `How does the setting interact with plot and character in ${title}?`,
        choices: ["The setting affects the conflict, which influences the character's decisions and moves the plot forward", "The setting replaces the need for plot", "The setting is unrelated to character choices", "The setting only identifies the author"],
        distractorRationale: ["Correct.", "Setting interacts with plot but does not replace it.", "The interaction is the focus.", "Author identity is not setting."],
      },
      {
        question: `How does a change in time or place affect the story in ${title}?`,
        choices: ["It changes what characters face and helps develop meaning", "It has no effect on events", "It only changes the font", "It makes evidence unnecessary"],
        distractorRationale: ["Correct.", "Time and place shifts often affect meaning.", "Font is not story setting.", "Evidence is still needed."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  const bank = [
    {
      question: `How does the environment in ${title} shape the story's meaning?`,
      choices: ["It influences actions, outcomes, mood, or theme through specific details", "It only names a location without any effect", "It prevents the reader from analyzing theme", "It has no relationship to character decisions"],
      distractorRationale: ["Correct.", "Advanced setting analysis looks for effect.", "Setting can support theme.", "Setting can strongly affect decisions."],
    },
    {
      question: `How does setting help support the theme in ${title}?`,
      choices: ["Details about time, place, or environment reinforce the message of the story", "The setting replaces the theme", "The setting removes all conflict", "The setting is only useful in informational text"],
      distractorRationale: ["Correct.", "Setting supports but does not replace theme.", "Setting may create conflict.", "Literary setting is important."],
    },
  ];
  return bank[itemIndex % bank.length];
}

function plotPromptForGrade(grade: number, title: string, itemIndex: number) {
  if (grade <= 3) {
    const bank = [
      {
        question: `Which event is most important to the plot of ${title}?`,
        choices: ["The event that creates or helps solve the main problem", "A small detail about the weather", "A description that does not change what happens", "A word that only tells the setting"],
        distractorRationale: ["Correct.", "Weather may be setting, but it is not always the key plot event.", "Minor details do not drive plot.", "Setting alone is not plot."],
      },
      {
        question: `Which answer best shows the beginning, middle, and end of the plot in ${title}?`,
        choices: ["Problem, important actions, solution", "Title, author, page number", "Setting only", "One vocabulary word"],
        distractorRationale: ["Correct.", "These are text features, not plot.", "Setting is only one element.", "Vocabulary is not plot structure."],
      },
      {
        question: `Which event helps solve the main problem in ${title}?`,
        choices: ["The event that moves the story toward a solution", "A sentence that only names a place", "A small detail with no effect on the problem", "A word that describes the weather"],
        distractorRationale: ["Correct.", "Setting is not resolution.", "A detail must affect the problem to be plot.", "Weather words are not automatically plot events."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  if (grade <= 5) {
    const bank = [
      {
        question: `How does the character's response to the problem affect the plot of ${title}?`,
        choices: ["The response leads to the next important event and moves the story toward a resolution", "The response stops all conflict immediately", "The response only describes the setting", "The response proves the passage is informational"],
        distractorRationale: ["Correct.", "Most plots develop through conflict before resolution.", "A response is about action or choice, not just setting.", "Plot is a literature skill."],
      },
      {
        question: `Which event most directly leads to the resolution in ${title}?`,
        choices: ["The character's choice that helps solve the central conflict", "A detail that names the weather", "A sentence that only describes clothing", "A fact unrelated to the story problem"],
        distractorRationale: ["Correct.", "Setting detail only.", "Description only.", "Unrelated details do not lead to resolution."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  if (grade <= 6) {
    const bank = [
      {
        question: `How does the plot unfold in ${title}?`,
        choices: ["A conflict develops through a series of events, and the character's choices show change over time", "The author lists unrelated events without cause and effect", "The passage gives only facts and definitions", "The ending has no connection to the earlier conflict"],
        distractorRationale: ["Correct.", "Plot events are connected.", "This describes informational text, not plot.", "Resolutions usually connect to earlier conflict."],
      },
      {
        question: `How does one event affect what happens next in ${title}?`,
        choices: ["It creates a cause-and-effect chain that moves the story forward", "It stops the story from having a conflict", "It only repeats the title", "It changes the passage into a chart"],
        distractorRationale: ["Correct.", "Conflict usually develops across the plot.", "A title is not a plot event.", "A plot event does not change the format."],
      },
      {
        question: `Why is the character's decision important to the plot of ${title}?`,
        choices: ["It reveals a response to conflict and helps move the story toward resolution", "It gives an unrelated definition", "It removes all cause and effect", "It only tells where the story takes place"],
        distractorRationale: ["Correct.", "Definitions are not plot decisions.", "Plot depends on cause and effect.", "Setting alone is not the decision's plot role."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  if (grade <= 7) {
    const bank = [
      {
        question: `How do story elements interact to develop the plot in ${title}?`,
        choices: ["The setting and conflict influence the character's choices, which moves the action forward", "The setting replaces the need for character decisions", "The plot develops without any connection to conflict", "The theme is unrelated to what happens in the story"],
        distractorRationale: ["Correct.", "Setting affects plot but does not replace character action.", "Conflict is central to plot.", "Theme often develops through plot events."],
      },
      {
        question: `How does the conflict shape the character's choices in ${title}?`,
        choices: ["The conflict pressures the character to act, and that action changes what happens next", "The conflict has no effect on the story", "The conflict only explains the title", "The conflict is unrelated to character development"],
        distractorRationale: ["Correct.", "Conflict usually drives plot.", "A title is not enough.", "Character development is often tied to conflict."],
      },
      {
        question: `Which answer best explains a cause-and-effect relationship in the plot of ${title}?`,
        choices: ["One event causes a character decision that leads to another important event", "A detail appears once but never affects the story", "The passage gives unrelated facts", "The story has no sequence"],
        distractorRationale: ["Correct.", "No effect means weak plot evidence.", "This describes informational text.", "Plot depends on sequence."],
      },
    ];
    return bank[itemIndex % bank.length];
  }
  const bank = [
    {
      question: `What is the effect of a key incident or line of dialogue in ${title}?`,
      choices: ["It propels the action, reveals character, or causes a decision that changes what happens next", "It repeats information without affecting the story", "It proves the conflict is already solved before the story begins", "It removes the need to analyze cause and effect"],
      distractorRationale: ["Correct.", "A key incident should affect the story.", "Unsupported.", "Plot analysis depends on cause and effect."],
    },
    {
      question: `How does a specific moment in ${title} provoke a character decision?`,
      choices: ["The moment creates pressure that leads the character to choose a new action", "The moment has no connection to character choice", "The moment only gives a dictionary definition", "The moment removes the story's conflict"],
      distractorRationale: ["Correct.", "A provocation must affect choice.", "Definitions are not plot incidents.", "Conflict usually develops before resolution."],
    },
    {
      question: `Which answer best explains how an incident propels the action in ${title}?`,
      choices: ["It causes the next important event and changes the direction of the story", "It gives background that never matters again", "It only describes the font", "It prevents any events from happening"],
      distractorRationale: ["Correct.", "Unimportant background does not propel action.", "Visual font is not plot.", "Plot requires events."],
    },
  ];
  return bank[itemIndex % bank.length];
}

function figurativeLanguagePromptForGrade(grade: number, title: string, itemIndex: number) {
  const bank = figurativeLanguageBank(grade, title);
  return bank[itemIndex % bank.length];
}

function flashbackPromptForGrade(grade: number, title: string) {
  if (grade <= 3) {
    return {
      question: `Which event from ${title} happened before the present action of the story?`,
      choices: [
        "The earlier event that explains what happened before",
        "The final event in the story",
        "A detail that describes the setting only",
        "A sentence that gives a character's opinion",
      ],
      distractorRationale: ["Correct.", "This is sequence, but not a past event.", "This is setting, not flashback.", "This is opinion, not time structure."],
    };
  }
  if (grade <= 4) {
    return {
      question: `Which clue shows that the author shifts to an earlier time in ${title}?`,
      choices: [
        "A phrase such as last year or remembered signals the past",
        "A sentence describes what the character sees now",
        "The title names the topic",
        "A dialogue tag shows who is speaking",
      ],
      distractorRationale: ["Correct.", "This stays in the present.", "A title does not prove a flashback.", "Dialogue is not necessarily a time shift."],
    };
  }
  if (grade <= 6) {
    return {
      question: `Why does the author include a flashback in ${title}?`,
      choices: [
        "To reveal earlier events that help explain the character's current conflict",
        "To list facts in order from least to most important",
        "To show that the passage changes from literature to informational text",
        "To make the setting less important to the plot",
      ],
      distractorRationale: ["Correct.", "Flashback is not a list structure.", "Flashback does not change the genre.", "Flashbacks usually add meaning, not remove it."],
    };
  }
  return {
    question: `How does the flashback in ${title} contribute to the meaning of the story?`,
    choices: [
      "It changes the order of events to deepen the reader's understanding of theme and character motivation",
      "It removes the need to analyze character choices",
      "It proves the story is organized only in chronological order",
      "It gives unrelated background that does not affect the plot",
    ],
    distractorRationale: ["Correct.", "Flashback usually supports character analysis.", "Flashback means the structure is not purely chronological.", "A strong flashback affects meaning."],
  };
}

function figurativeLanguageBank(grade: number, title: string) {
  if (grade <= 3) {
    return [
      {
        question: `In ${title}, what does the simile "as busy as bees" mean?`,
        choices: ["The characters are working hard and moving quickly.", "The characters are actual bees.", "The characters are sleeping quietly.", "The characters are angry at insects."],
        distractorRationale: ["Correct.", "Takes the phrase literally.", "Opposite meaning.", "Misreads the comparison."],
      },
      {
        question: `Which phrase is an example of nonliteral language?`,
        choices: ["The idea grew like a seed.", "The class opened the door.", "The rain began at noon.", "The chart had three rows."],
        distractorRationale: ["Correct; it compares an idea to a seed.", "Literal action.", "Literal fact.", "Literal description."],
      },
      {
        question: `What does the phrase "the room was a freezer" mean?`,
        choices: ["The room felt very cold.", "The room was used to store frozen food.", "The room was outside.", "The room was full of snow."],
        distractorRationale: ["Correct.", "Takes the metaphor literally.", "Unsupported.", "Unsupported literal reading."],
      },
      {
        question: `How does the phrase "smiled like sunshine" affect the meaning?`,
        choices: ["It creates a happy, warm feeling.", "It makes the character seem angry.", "It gives a technical definition.", "It shows the setting is dangerous."],
        distractorRationale: ["Correct.", "Opposite tone.", "Not figurative effect.", "Unsupported effect."],
      },
    ];
  }
  if (grade <= 5) {
    return [
      {
        question: `What does the idiom "a fresh start" suggest in ${title}?`,
        choices: ["A chance to begin again in a better way.", "A newly washed object.", "A confusing mistake.", "A problem that cannot be solved."],
        distractorRationale: ["Correct.", "Literal misunderstanding.", "Unsupported.", "Opposite meaning."],
      },
      {
        question: `Which phrase is an example of personification?`,
        choices: ["The wind whispered through the garden.", "The students walked outside.", "The table listed three results.", "The garden needed water."],
        distractorRationale: ["Correct; wind is given a human action.", "Literal action.", "Literal description.", "Literal fact."],
      },
      {
        question: `What does the metaphor "responsibility was a heavy backpack" mean?`,
        choices: ["Responsibility felt difficult to carry.", "Responsibility was a real backpack.", "The character forgot school supplies.", "The backpack was too small."],
        distractorRationale: ["Correct.", "Takes metaphor literally.", "Unrelated.", "Unrelated literal detail."],
      },
      {
        question: `How does the figurative phrase help the reader understand the character's feelings?`,
        choices: ["It shows the feeling is strong by comparing it to something familiar.", "It removes emotion from the scene.", "It gives only a dictionary definition.", "It makes the passage less descriptive."],
        distractorRationale: ["Correct.", "Opposite effect.", "Misses figurative meaning.", "Opposite effect."],
      },
    ];
  }
  if (grade <= 6) {
    return [
      {
        question: `What does the phrase "the problem sat like a stone in her pocket" suggest?`,
        choices: ["The problem feels heavy and hard to ignore.", "The problem is an actual stone.", "The character collects rocks.", "The problem is easy to forget."],
        distractorRationale: ["Correct.", "Takes the simile literally.", "Unsupported literal detail.", "Opposite meaning."],
      },
      {
        question: `How does the metaphor "the courtyard became a stage for courage" help the reader understand the scene?`,
        choices: ["It shows the setting becomes a place where bravery is revealed.", "It means students perform a play.", "It suggests the courtyard is unsafe because it has lights.", "It only tells where the scene happens."],
        distractorRationale: ["Correct.", "Literal misunderstanding.", "Unsupported.", "Ignores the effect."],
      },
      {
        question: `What does the word "sharp" most likely suggest in the phrase "a sharp silence filled the room"?`,
        choices: ["The silence feels tense or uncomfortable.", "The silence can cut objects.", "The room contains knives.", "The silence is cheerful."],
        distractorRationale: ["Correct; connotation creates tone.", "Takes connotation literally.", "Unsupported.", "Opposite tone."],
      },
      {
        question: `What is the effect of the figurative language on the tone of ${title}?`,
        choices: ["It creates a serious, reflective tone by showing the emotion behind the event.", "It makes the passage sound silly for no reason.", "It removes the narrator's feelings.", "It makes the text purely technical."],
        distractorRationale: ["Correct.", "Unsupported effect.", "Opposite effect.", "Ignores literary tone."],
      },
    ];
  }
  return [
    {
      question: `What deeper meaning is suggested by the symbol of a locked gate in ${title}?`,
      choices: ["It may represent a barrier the character or community must overcome.", "It only means the gate is made of metal.", "It proves the setting is imaginary.", "It has no connection to the text's meaning."],
      distractorRationale: ["Correct.", "Literal-only reading.", "Unsupported.", "Ignores symbolism."],
    },
    {
      question: `How does the author's figurative language shape mood?`,
      choices: ["It creates emotion by connecting images, word choice, and implied meaning.", "It prevents the reader from feeling anything.", "It only names the setting.", "It replaces the need for evidence."],
      distractorRationale: ["Correct.", "Opposite effect.", "Too literal.", "Unsupported."],
    },
    {
      question: `Why might the author use the phrase "hope flickered like a small lantern"?`,
      choices: ["To suggest hope is fragile but still present.", "To explain how lanterns are built.", "To show the character dislikes light.", "To make the passage informational only."],
      distractorRationale: ["Correct.", "Literal misunderstanding.", "Unsupported.", "Misidentifies purpose."],
    },
    {
      question: `What is the effect of figurative language on author purpose in ${title}?`,
      choices: ["It helps communicate a deeper idea or emotional message.", "It distracts from all meaning.", "It proves all details are literal.", "It removes tone and mood."],
      distractorRationale: ["Correct.", "Unsupported.", "Literal mistake.", "Opposite effect."],
    },
  ];
}

function inferencePromptForGrade(grade: number, title: string, skill: string) {
  const isLiterary = skill === "Literary Inference";
  const target = isLiterary ? "character" : "topic";
  if (grade <= 3) {
    return {
      question: `What can the reader infer about the ${target} in ${title}?`,
      choices: ["The text gives clues that help the reader figure out something not stated directly.", "The reader should guess without using the passage.", "Only the title matters.", "The answer must be copied exactly from one sentence."],
      partAQuestion: `What can be inferred about the ${target}?`,
      partAChoices: ["The text gives clues that suggest an unstated idea.", "Nothing can be inferred from the passage.", "The answer should not use evidence.", "Only pictures can show an inference."],
      partBChoices: ["A text clue supports the inference.", "A detail is unrelated to the inference.", "Another clue supports the same inference.", "A choice is based on a guess."],
      shortResponsePrompt: `What can you figure out about the ${target} that the text does not say directly? Use one clue from ${title}.`,
      sampleAnswer: `The reader can infer an unstated idea because one clue in the text supports it.`,
    };
  }
  if (grade <= 5) {
    return {
      question: `What can be concluded based on details in ${title}?`,
      choices: ["A supported inference that combines text clues with what the reader knows.", "A guess that sounds possible but has no text evidence.", "A copied detail that does not explain what can be figured out.", "An answer based only on one word from the title."],
      partAQuestion: `What can be inferred from the details in ${title}?`,
      partAChoices: ["A conclusion supported by details and examples from the text.", "A conclusion that does not need evidence.", "A detail that is stated but not important.", "An opinion unrelated to the passage."],
      partBChoices: ["A detail that directly supports the inference.", "A detail that is interesting but not connected.", "A second detail that supports the same inference.", "A detail that contradicts the inference."],
      shortResponsePrompt: `Make an inference about ${title}. Quote or paraphrase one detail that supports your inference.`,
      sampleAnswer: `A supported inference combines what the text says with what it suggests. One detail from the passage proves the inference.`,
    };
  }
  if (grade <= 6) {
    return {
      question: `Which detail best supports the inference that the author wants readers to understand an unstated idea in ${title}?`,
      choices: ["A detail that requires readers to connect clues and support an inference.", "A detail that is obvious but unsupported by other clues.", "A detail that repeats the title without analysis.", "A detail that does not connect to the conclusion."],
      partAQuestion: `What can be inferred based on the author's details in ${title}?`,
      partAChoices: ["The author implies an idea that must be supported with textual evidence.", "The author states every idea directly.", "The reader should ignore text evidence.", "The passage has no implied meaning."],
      partBChoices: ["A detail that supports the implied idea.", "A sentence that only names the setting.", "A second detail that supports the same inference.", "A detail that is unsupported or unrelated."],
      shortResponsePrompt: `What inference can you make from ${title}? Justify your thinking with text evidence and explain how the evidence supports your inference.`,
      sampleAnswer: `The reader can infer an unstated idea because the passage gives clues. The evidence supports the inference because it shows more than the text directly says.`,
    };
  }
  return {
    question: `Which answer best analyzes a deeper inference or implied author message in ${title}?`,
    choices: ["The text uses multiple layers of evidence to imply a deeper meaning.", "The text has no implied meaning because some facts are stated.", "The reader should use background knowledge only.", "The answer should ignore theme or author message."],
    partAQuestion: `What deeper inference can be made from ${title}?`,
    partAChoices: ["The author implies a message that requires connecting multiple pieces of evidence.", "Only one literal detail matters.", "The inference should not connect to theme or message.", "The passage cannot suggest ideas indirectly."],
    partBChoices: ["A detail that supports the deeper meaning.", "A detail unrelated to theme or message.", "A second layer of evidence that supports the inference.", "A detail that weakens the inference."],
    shortResponsePrompt: `Analyze a deeper inference or implied author message in ${title}. Use evidence and explain the connection.`,
    sampleAnswer: `A deeper inference connects multiple text clues to an implied message. The evidence matters because it shows what the author suggests but does not state directly.`,
  };
}

function pointOfViewPromptForGrade(grade: number, title: string) {
  if (grade <= 3) {
    return {
      question: `Who is telling the story or presenting the information in ${title}?`,
      choices: ["A narrator or author whose words show who is speaking.", "A chart that gives numbers only.", "A character who never appears in the passage.", "The reader of the passage."],
      multiQuestion: `Select TWO clues that help identify the point of view in ${title}.`,
      multiChoices: ["Pronouns such as I, me, we, he, she, or they", "The number of paragraphs", "What the narrator knows or notices", "The title font"],
      hotTextPrompt: "Select the sentence that best shows who is telling the story.",
      hotTextSpans: ["The passage introduces the topic.", "The narrator's words reveal who is speaking or what the narrator notices.", "The passage includes a related detail."],
    };
  }
  if (grade <= 4) {
    return {
      question: `Which answer best compares first-person and third-person point of view in ${title}?`,
      choices: ["First person uses a narrator inside the events; third person tells about characters from outside the events.", "Both points of view always use the word I.", "Third person never describes thoughts or feelings.", "Point of view only means the passage topic."],
      multiQuestion: `Select TWO details that help compare perspectives in ${title}.`,
      multiChoices: ["What each narrator knows or notices", "A shift from I/me to he/she/they", "The number of answer choices", "A sentence unrelated to the narrator"],
      hotTextPrompt: "Select the sentence that best reveals the narrator's perspective.",
      hotTextSpans: ["A background detail appears.", "The wording shows what the narrator knows, feels, or believes.", "A minor description appears."],
    };
  }
  if (grade <= 6) {
    return {
      question: `How does the author develop point of view in ${title}?`,
      choices: ["By showing what the narrator or author notices, believes, and emphasizes through details and word choice.", "By listing facts without any perspective.", "By avoiding details about thoughts or opinions.", "By using only the title to explain the narrator."],
      multiQuestion: `Select TWO details that show how point of view is developed in ${title}.`,
      multiChoices: ["Word choice that reveals what the narrator values", "A detail that shows what the narrator notices", "The page number", "A detail that is unrelated to perspective"],
      hotTextPrompt: "Select the sentence that best develops point of view.",
      hotTextSpans: ["The passage gives an opening fact.", "The author's or narrator's wording reveals a viewpoint about the topic.", "The passage gives a minor closing detail."],
    };
  }
  return {
    question: `Which answer best analyzes point of view, bias, or reliability in ${title}?`,
    choices: ["The author or narrator emphasizes some details over others, shaping how readers judge the topic or events.", "The passage has no viewpoint because it has paragraphs.", "Reliability means every narrator is always correct.", "Bias only appears in fiction."],
    multiQuestion: `Select TWO details that reveal bias, reliability, or conflicting perspectives in ${title}.`,
    multiChoices: ["Loaded language or selective evidence", "A narrator's limited knowledge", "The font size", "A detail with no connection to viewpoint"],
    hotTextPrompt: "Select the sentence that best reveals bias, reliability, or perspective.",
    hotTextSpans: ["The text begins with context.", "The wording reveals what the author or narrator wants readers to believe.", "The text includes an unrelated example."],
  };
}

function buildConventionsQuestion({ grade, skill, index, id }: { grade: number; skill: string; index: number; id: number }): Question {
  const base = {
    id,
    gradeLevel: grade,
    passageId: "conventions",
    passageType: "CONVENTIONS",
    skill,
    standardCode: `CC.1.4.${grade}.F${index + 1}`,
    standardLabel: `${skill} in Standard English`,
    difficulty: index < 4 ? 2 : 3,
    passageTitle: "Conventions of Standard English",
    passage: "Choose the answer that follows the conventions of Standard English.",
    explanation: `This item checks grade ${grade} ${skill.toLowerCase()}.`,
    skillTip: "Read each option carefully and check the sentence rule.",
  };

  if (index === 1) {
    return buildConventionsTechnologyEnhancedQuestion({ base, type: "DRAG_DROP", grade, skill });
  }
  if (index === 2) {
    return buildConventionsTechnologyEnhancedQuestion({ base, type: "HOT_TEXT", grade, skill });
  }
  if (index === 5) {
    return buildConventionsTechnologyEnhancedQuestion({ base, type: "MULTI_SELECT", grade, skill });
  }
  if (index === 8) {
    return buildConventionsTechnologyEnhancedQuestion({ base, type: "DRAG_DROP", grade, skill });
  }

  type ConventionExample = { question: string; choices: string[]; correctIndex: number; passage?: string };

  const gradeFiveExamples: Record<number, ConventionExample> = {
    0: { question: "Which sentence correctly uses italics or quotation marks to indicate a title?", choices: ["The novel River Bridge should be italicized.", "The poem River Bridge should be italicized.", "The chapter River Bridge should be italicized.", "The article River Bridge should be italicized."], correctIndex: 0 },
    1: { question: "Which conjunction should fill in the blank to correctly complete the sentence? Neither the teacher _________ the students forgot the final draft.", choices: ["or", "nor", "because", "whether"], correctIndex: 1 },
    2: { question: "Which sentence uses the underlined word correctly?", choices: ["The actor had a powerful presence on stage.", "The captain was a kernel in the army.", "She packed a fishing poll for the trip.", "The jeans were too big in the waste."], correctIndex: 0 },
  };
  const gradeSixExamples: Record<number, ConventionExample> = {
    0: {
      passage: "The school garden gives students a useful way to learn science outside the classroom. Students measure plant growth each week and compare the results in their notebooks. They also observe how sunlight and water affect different vegetables. The garden has tomatoes, peppers, and beans.",
      question: "Read the paragraph. Which revision would most improve the paragraph?",
      choices: [
        "Add a sentence that explains how the final detail connects to the main idea.",
        "Delete all examples so the paragraph is shorter.",
        "Change every sentence to a question.",
        "Move the last sentence before the topic sentence.",
      ],
      correctIndex: 0,
    },
    1: {
      passage: "The students did some things with the garden.",
      question: "Read the sentence. Which revision provides the most specific information?",
      choices: [
        "The students measured the garden's growth every Friday and recorded the height of each plant.",
        "The students did some things with the garden.",
        "The students worked outside a lot.",
        "The students thought the garden was nice.",
      ],
      correctIndex: 0,
    },
    2: {
      passage: "When students revise, they should check whether their evidence supports the claim. A writer should reread the draft because you may notice missing details. The class discussed its ideas before writing. Readers can follow an essay when its organization is clear.",
      question: "Read the paragraph. Which sentence contains an inappropriate shift in pronoun person?",
      choices: [
        "When students revise, they should check whether their evidence supports the claim.",
        "A writer should reread the draft because you may notice missing details.",
        "The class discussed its ideas before writing.",
        "Readers can follow an essay when its organization is clear.",
      ],
      correctIndex: 1,
    },
    3: {
      passage: "Maya gave Lena the notes after she finished the summary. Maya finished the summary before lunch. Lena read the notes carefully. The summary included evidence from the passage.",
      question: "Read the paragraph. Which sentence has a vague pronoun?",
      choices: [
        "Maya gave Lena the notes after she finished the summary.",
        "Maya finished the summary before lunch.",
        "Lena read the notes carefully.",
        "The summary included evidence from the passage.",
      ],
      correctIndex: 0,
    },
  };
  const gradeSevenExamples: Record<number, ConventionExample> = {
    0: {
      question: "Which sentence is punctuated correctly?",
      choices: [
        "My neighbor has a large, scruffy black dog that likes to play in our yard.",
        "Shannon raced toward the ball stretched out her glove and dove, to the ground.",
        "When I added a new ingredient to the beaker the liquid bubbled, fizzed and changed colors.",
        "Jake tried to reach the toolbox on the shelf but, he realized he needed a stool.",
      ],
      correctIndex: 0,
    },
    1: {
      question: "Which underlined word is used correctly?",
      choices: [
        "Carly gave me advice on how to solve my problem.",
        "We began our decent down the long staircase.",
        "The sunlight had a major affect on the plant's growth.",
        "Kingston walked up to except his award.",
      ],
      correctIndex: 0,
    },
    2: {
      passage: "Watching her brother play with clay, Nadine realized that she missed being creative. She decided to start activities that required imagination. She begins by keeping a journal filled with story ideas and sketches. She also volunteered to help construct a model for the school play.",
      question: "Read the paragraph. Which sentence contains an inappropriate shift in verb tense?",
      choices: [
        "Watching her brother play with clay, Nadine realized that she missed being creative.",
        "She decided to start activities that required imagination.",
        "She begins by keeping a journal filled with story ideas and sketches.",
        "She also volunteered to help construct a model for the school play.",
      ],
      correctIndex: 2,
    },
  };
  const gradeEightExamples: Record<number, ConventionExample> = {
    0: {
      passage: "The team's presentation explained how the river cleanup would protect wildlife and improve the park. Members shared data from water samples, photographs of the shoreline, and a schedule for volunteers. The committee reviewed the plan carefully before deciding what to do next.",
      question: "Maintaining the style of the paragraph, which revision most improves the meaning of the sentence?",
      choices: [
        "Impressed with the team's careful evidence, the committee requested a second presentation.",
        "The committee thought the presentation was pretty cool and wanted more stuff.",
        "The committee liked it, and it was good, so they asked for another one.",
        "Amazed at the team, more was ordered by the committee.",
      ],
      correctIndex: 0,
    },
    1: {
      question: "Read the sentence. If the weather station lost power, the researchers __________________ the data by hand every hour. Which words best complete the sentence?",
      choices: ["will record", "would record", "could have recorded", "might have recorded"],
      correctIndex: 1,
    },
    2: {
      question: "A student wants to use part of a quote in a report. Which sentence correctly punctuates the partial quote?",
      choices: [
        "\"The experiment revealed several patterns . . . the final result surprised the team.\"",
        "\"The experiment revealed several patterns—the final result surprised the team.\"",
        "\"The experiment revealed several patterns, the final result surprised the team.\"",
        "\"The experiment revealed several patterns; the final result surprised the team.\"",
      ],
      correctIndex: 0,
    },
  };
  const examples: Record<string, ConventionExample> = {
    Grammar: { question: "Which sentence is written correctly?", choices: ["The students was ready.", "The students were ready.", "The student were ready.", "The students is ready."], correctIndex: 1 },
    Punctuation: { question: "Which sentence uses punctuation correctly?", choices: ["After lunch we read quietly.", "After lunch, we read quietly.", "After, lunch we read quietly.", "After lunch we, read quietly."], correctIndex: 1 },
    Capitalization: { question: "Which sentence uses capitalization correctly?", choices: ["We visited harrisburg in april.", "We visited Harrisburg in april.", "We visited Harrisburg in April.", "we visited Harrisburg in April."], correctIndex: 2 },
    "Sentence Structure": { question: "Which revision fixes the sentence fragment?", choices: ["Because the rain stopped.", "Because the rain stopped, we practiced outside.", "The rain because stopped.", "Outside because."], correctIndex: 1 },
    "Verb Tense": { question: "Which sentence keeps verb tense consistent?", choices: ["Maya opened the book and reads.", "Maya opens the book and read.", "Maya opened the book and read the first page.", "Maya opening the book and read."], correctIndex: 2 },
    "Pronoun Usage": { question: "Which sentence uses pronouns correctly?", choices: ["Lena and him studied.", "Lena and he studied.", "Her and Lena studied.", "Him studied with Lena."], correctIndex: 1 },
    Commas: { question: "Which sentence uses commas correctly?", choices: ["Yes I finished the draft.", "Yes, I finished the draft.", "Yes I, finished the draft.", "Yes I finished, the draft."], correctIndex: 1 },
    Apostrophes: { question: "Which sentence uses an apostrophe correctly?", choices: ["The teachers desk was clean.", "The teacher's desk was clean.", "The teachers' desk was clean.", "The teacher desk's was clean."], correctIndex: 1 },
    "Subject-Verb Agreement": { question: "Which sentence has correct subject-verb agreement?", choices: ["The list of supplies are long.", "The list of supplies is long.", "The supplies on the list is long.", "The list are long."], correctIndex: 1 },
    "Frequently Confused Words": { question: "Which sentence uses the correct word?", choices: ["Their going to revise.", "There going to revise.", "They're going to revise.", "Theyre going to revise."], correctIndex: 2 },
  };
  const item = grade === 5 && gradeFiveExamples[index]
    ? gradeFiveExamples[index]
    : grade === 6 && gradeSixExamples[index]
      ? gradeSixExamples[index]
      : grade === 7 && gradeSevenExamples[index]
        ? gradeSevenExamples[index]
        : grade === 8 && gradeEightExamples[index]
          ? gradeEightExamples[index]
          : examples[skill] || examples.Grammar;
  return { id, gradeLevel: grade, passageId: "conventions", passageType: "CONVENTIONS", skill, standardCode: `CC.1.4.${grade}.F${index + 1}`, standardLabel: `${skill} in Standard English`, difficulty: index < 4 ? 2 : 3, type: "CONVENTIONS", passageTitle: "Conventions of Standard English", passage: "Choose the answer that follows the conventions of Standard English.", explanation: `This item checks grade ${grade} ${skill.toLowerCase()}.`, skillTip: "Read each option carefully and check the sentence rule.", correctAnswer: item.correctIndex, ...item, distractorRationale: item.choices.map((_, choiceIndex) => choiceIndex === item.correctIndex ? "Correct." : "Contains a conventions error.") };
}

function buildConventionsTechnologyEnhancedQuestion({
  base,
  type,
  grade,
  skill,
}: {
  base: Omit<BaseQuestion, "type">;
  type: "HOT_TEXT" | "MULTI_SELECT" | "DRAG_DROP";
  grade: number;
  skill: string;
}): Question {
  if (type === "HOT_TEXT") {
    return {
      ...base,
      type,
      interactionMode: "SENTENCE_HIGHLIGHT",
      hotTextPrompt: "Read the paragraph. Select the sentence that contains an inappropriate shift in pronoun person.",
      selectableSpans: [
        "When students revise an essay, they should check whether each detail supports the claim.",
        "A writer should reread the draft because you may notice missing evidence.",
        "The class discussed its ideas before writing the final paragraph.",
        "Readers can follow an essay when its organization is clear.",
      ],
      correctSpanIndices: [1],
      distractorRationale: [
        "This sentence keeps pronoun person consistent.",
        "Correct; the sentence shifts from a writer to you.",
        "This sentence uses its clearly.",
        "This sentence keeps the subject and pronoun consistent.",
      ],
      correctAnswer: [1],
    };
  }

  if (type === "MULTI_SELECT") {
    return {
      ...base,
      type,
      interactionMode: "CHECK_TABLE",
      question: "A student is writing a report about the papermaking process. Complete the table by putting a check mark next to each sentence to show whether the style of the sentence is formal or informal.",
      choices: [
        "It is kind of wild that a thin, weak piece of paper comes from really, really big, strong trees.",
        "To be made into paper, wood must be changed into a liquid substance called pulp.",
        "Pulp is created by grinding wood chips or using chemicals to break wood into tiny pieces.",
        "When pulp is spread out super thin, all the water gets kind of pressed out until you've got paper.",
      ],
      categories: ["Formal Style", "Informal Style"],
      correctIndices: [1, 2, 4, 7],
      distractorRationale: [
        "This sentence is informal because of casual words such as kind of wild and really, really.",
        "Correct; this sentence uses formal, precise wording.",
        "Correct; this sentence uses formal, precise wording.",
        "This sentence is informal because of casual wording such as super thin and you've got.",
      ],
      correctAnswer: [1, 2, 4, 7],
    };
  }

  if (skill === "Punctuation") {
    return {
      ...base,
      type,
      interactionMode: "INLINE_DROPDOWN",
      dragDropPrompt: "Read the paragraph. Select the word from each drop-down list that best completes each sentence.",
      clozeParts: [
        "(1) Monarch butterflies, like many other animals, ",
        " south for the winter. (2) Butterfly lovers travel to Michoacan, Mexico, every year to see the millions of monarchs that spend the winter there. (3) These monarchs hatched somewhere in the north the previous spring. (4) Because monarch butterflies have short life spans, no single monarch ",
        " long enough to make the return trip. (5) That task is left to their offspring, who somehow find their way north.",
      ],
      categories: ["migrate", "migrates", "survives", "survive"],
      dragItems: [
        { id: "blank1", text: "first drop-down" },
        { id: "blank2", text: "second drop-down" },
      ],
      correctMapping: {
        blank1: "migrate",
        blank2: "survives",
      },
      distractorRationale: "Choose the verb that agrees with the subject in each sentence.",
      correctAnswer: {
        blank1: "migrate",
        blank2: "survives",
      },
    };
  }

  return {
    ...base,
    type,
    interactionMode: "SENTENCE_BLANK",
    dragDropPrompt: "Read the first sentence of a newspaper article. Move a sentence from below onto the blank line that best fits the style of the article.",
    categories: [
      "The players felt down in the dumps afterward.",
      "Later on, the kids were all totally unhappy.",
      "The team members were greatly disappointed.",
    ],
    dragItems: [
      { id: "blank", text: "blank line" },
    ],
    correctMapping: {
      blank: "The team members were greatly disappointed.",
    },
    distractorRationale: "The correct sentence uses a formal style that fits a newspaper article.",
    correctAnswer: {
      blank: "The team members were greatly disappointed.",
    },
  };
}

function buildTdaQuestion({ grade, passage, id, promptFocus }: { grade: number; passage: DiagnosticPassage; id: number; promptFocus?: string }): Question {
  const samplerPrompt = samplerStemForGrade({ gradeLevel: grade, type: "TDA", skill: "TDA Writing", passageTitle: passage.title, passageType: passage.passageType, itemIndex: 0 });
  return { id, gradeLevel: grade, passageId: passage.id, passageType: passage.passageType, skill: "TDA Writing", standardCode: `CC.1.4.${grade}.S`, standardLabel: "Text-dependent analysis essay", difficulty: 4, type: "TDA", passageTitle: passage.title, passage: passage.content, passageMetadata: passage, tableData: passage.tableData, explanation: "This item asks students to write an evidence-based analysis.", skillTip: "Use a clear claim, evidence from the passage, and explanation.", prompt: promptFocus ? `Write an essay analyzing ${promptFocus}. Use evidence from ${passage.title} to support your response.` : typeof samplerPrompt === "string" ? samplerPrompt : `Write an essay analyzing how the author develops an important idea across ${passage.title}. Use evidence from the text to support your response.`, rubric: "4: clear analysis with relevant evidence and strong organization; 3: adequate analysis with evidence; 2: partial analysis or limited evidence; 1: minimal response.", maxScore: 4, correctAnswer: "Rubric-scored essay" };
}

function buildGrade3ShortAnswerQuestion({ grade, passage, id }: { grade: number; passage: DiagnosticPassage; id: number }): Question {
  return {
    id,
    gradeLevel: grade,
    passageId: passage.id,
    passageType: passage.passageType,
    skill: "Short Answer Reading Response",
    standardCode: `CC.1.2.${grade}.B`,
    standardLabel: "Reading short-answer response with text-based support",
    difficulty: 3,
    type: "SHORT_RESPONSE",
    passageTitle: passage.title,
    passage: passage.content,
    passageMetadata: passage,
    tableData: passage.tableData,
    explanation: "This item follows the grade 3 PSSA short-answer model: answer the task and support it with accurate text details.",
    skillTip: "Answer all parts of the question and include a detail from the passage.",
    prompt: `Based on ${passage.title}, explain one important idea the reader learns. Use at least one detail from the passage to support your answer.`,
    sampleAnswer: "The reader learns an important idea from the passage, and a specific text detail supports that answer.",
    maxScore: 3,
    correctAnswer: "Scored with a 0-3 short-answer rubric.",
  };
}

function applyAdministrationSections(grade: number, questions: Question[]) {
  const sections = administrationBlueprint[grade];
  if (!sections) return questions;
  const boundaries = sections.reduce<Array<{ start: number; end: number; section: (typeof sections)[number] }>>((acc, section) => {
    const start = acc.length ? acc[acc.length - 1].end + 1 : 1;
    const end = start + section.srte + section.constructed - 1;
    acc.push({ start, end, section });
    return acc;
  }, []);
  return questions.map((question, index) => {
    const questionNumber = index + 1;
    const boundary = boundaries.find((item) => questionNumber >= item.start && questionNumber <= item.end) || boundaries[0];
    const section = boundary.section;
    return {
      ...question,
      administrationSection: section.section,
      administrationSectionLabel: `Grade ${grade} Section ${section.section}`,
      administrationQuestionRange: `Questions ${boundary.start}-${boundary.end}`,
      administrationSelectedResponseAndTechnologyEnhancedQuestions: section.srte,
      administrationConstructedResponseQuestions: section.constructed,
      administrationEstimatedActualTestingMinutes: section.actualTestingMinutes,
      administrationEstimatedTotalMinutes: section.totalMinutes,
    };
  });
}

function makePassage({ id, grade, title, passageType, genre, target, hasTable, hasSections, tableData, seed, metadata }: { id: string; grade: number; title: string; passageType: DiagnosticPassage["passageType"]; genre: string; target: number; hasTable: boolean; hasSections: boolean; tableData?: DiagnosticPassage["tableData"]; seed: string[]; metadata: Record<string, unknown> }): DiagnosticPassage {
  const content = buildToTarget(seed, target, { grade, passageType, genre });
  return {
    id,
    title,
    passageType,
    genre,
    content,
    wordCountTarget: target,
    actualWordCount: wordCount(content),
    hasTable,
    hasSections,
    gradeLevel: grade,
    tableData,
    metadata: buildPassageMetadata({ grade, passageType, content, target, metadata }),
  };
}

function buildToTarget(seed: string[], target: number, options: { grade: number; passageType: DiagnosticPassage["passageType"]; genre: string }) {
  const paragraphs = [...seed];
  const extension = extensionBankForPassage(options);
  let index = 0;
  while (wordCount(paragraphs.join("\n\n")) < target) {
    paragraphs.push(extension[index % extension.length]);
    index += 1;
  }
  return trimToTarget(paragraphs.join("\n\n"), target);
}

function extensionBankForPassage({ grade, passageType }: { grade: number; passageType: DiagnosticPassage["passageType"]; genre: string }) {
  const upperGrade = grade >= 6;
  if (passageType === "LITERARY") {
    return upperGrade ? [
      "Nora remembered the first week of the project, when she had treated every task like a checklist and let Malik make most of the decisions. Now the storm made each choice feel less like an assignment and more like a promise to the people who had trusted the class.",
      "\"If we hurry, we can save the sign frames without stepping near the flooded drain,\" Malik said. Nora noticed that his voice sounded nervous, not careless, and that changed the argument between them.",
      "The courtyard, usually loud with basketballs and lunch conversations, seemed unfamiliar under the low clouds. That change in setting made the exhibit feel fragile and made Nora understand why planning mattered.",
      "When a gust lifted the corner of the poster board, Nora had to decide whether to protect the work herself or ask for help. The decision revealed that courage was not the same as pretending not to be afraid.",
      "By the time a teacher reached the courtyard, the signs were stacked safely inside. Nora did not feel like a hero; she felt like someone who had finally learned when responsibility should be shared.",
    ] : [
      "Nora remembered painting the signs with her group. Each sign showed one plant, one fact, and one question visitors could answer as they walked through the garden.",
      "\"We should get help,\" Malik said. Nora nodded because the wind was stronger than she had expected.",
      "The courtyard looked different under the gray sky. Paper scraps rolled across the bricks, and the garden gate tapped again and again.",
      "Nora wanted to solve the problem quickly, but she also knew rushing could ruin the work. She slowed down, counted the signs, and made a safer plan.",
      "When the signs were finally inside, Malik grinned. Nora realized that being responsible sometimes meant asking someone to work beside you.",
    ];
  }

  if (passageType === "PAIRED_TEXT") {
    return upperGrade ? [
      "The first text uses a reflective narrator, so readers see how a small classroom project changes the student's understanding of responsibility. The second text uses a more public, informational style that weighs evidence before recommending action.",
      "Both texts include people making decisions with limited resources, but they develop that idea differently. One emphasizes personal observation, while the other emphasizes data, compromise, and community impact.",
      "A reader can compare the texts by asking which details show cooperation, which details show obstacles, and which details show how evidence changes a plan.",
      "The contrast matters because a garden is not presented as a simple decoration. In both texts, the garden becomes a test of planning, patience, and shared responsibility.",
    ] : [
      "In the first text, the class watches small changes each week and learns that careful records help the garden grow.",
      "In the second text, neighbors use facts before choosing what to do with the empty lot.",
      "Both texts show that people can improve a place when they listen to one another and use evidence.",
      "The two texts are different because one is told through a student's experience, while the other explains a community decision.",
    ];
  }

  if (passageType === "INFORMATIONAL_TABLE") {
    return upperGrade ? [
      "The chart does not identify a single perfect design. Instead, it helps readers compare benefits and trade-offs, which is important in an engineering problem.",
      "Students also considered maintenance because a design that works for one week might fail after several months. This long-term thinking made the investigation more realistic.",
      "The rain barrel saved the most water, but the overflow problem showed why data must be interpreted instead of copied without analysis.",
      "By combining two solutions, the class used evidence from the table and information from the passage. That connection between prose and data supports the final recommendation.",
    ] : [
      "The chart helps readers see that each design saved water in a different way.",
      "The rain barrel saved the most water, but it also had a problem during storms.",
      "Students used the numbers in the chart to talk about which solution would help the garden most.",
      "The best plan used more than one idea because each design had a strength and a challenge.",
    ];
  }

  return upperGrade ? [
    "Scientists describe wetlands as systems because water, soil, plants, and animals interact in ways that affect the whole watershed.",
    "The passage uses cause-and-effect structure to show that slowing water can reduce erosion, improve water clarity, and protect habitats downstream.",
    "Another section explains a problem-and-solution relationship: runoff carries pollutants, and wetland plants help reduce the amount that reaches creeks.",
    "Technical terms are explained through context so readers can understand how filtration, sediment, nutrients, and habitat are connected.",
    "These details develop the central idea that wetlands are not empty land; they are active natural systems that protect water quality.",
  ] : [
    "Wetlands work like natural sponges because they hold water after heavy rain.",
    "Plants in a wetland slow the water, and that gives dirt time to settle before it reaches a creek.",
    "The passage uses headings to show how wetlands filter water and help solve runoff problems.",
    "Words such as sediment and habitat are science terms, but the surrounding sentences help explain what they mean.",
    "These details support the main idea that wetlands protect both water and living things.",
  ];
}

function buildPassageMetadata({ grade, passageType, content, target, metadata }: { grade: number; passageType: DiagnosticPassage["passageType"]; content: string; target: number; metadata: Record<string, unknown> }) {
  const band = passageQualityBands[grade];
  const actual = wordCount(content);
  const sentenceStats = sentenceComplexity(content);
  const hasRequiredSections = passageType === "LITERARY" || content.includes("##") || passageType === "PAIRED_TEXT";
  const lengthDelta = actual - target;
  return {
    ...metadata,
    targetTolerance: band.tolerance,
    lengthDelta,
    lengthStatus: Math.abs(lengthDelta) <= band.tolerance ? "WITHIN_BAND" : "OUT_OF_BAND",
    complexityBand: passageType === "LITERARY" ? band.literaryComplexity : band.informationalComplexity,
    averageSentenceWords: sentenceStats.averageSentenceWords,
    sentenceCount: sentenceStats.sentenceCount,
    hasSamplerStyleStructure: hasRequiredSections,
    qualityChecks: {
      targetLength: Math.abs(lengthDelta) <= band.tolerance,
      gradeComplexitySignal: true,
      samplerStructureSignal: hasRequiredSections,
      evidenceRich: sentenceStats.sentenceCount >= (grade >= 6 ? 22 : 14),
    },
  };
}

function sentenceComplexity(value: string) {
  const sentences = value.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean);
  const totalWords = sentences.reduce((sum, sentence) => sum + wordCount(sentence), 0);
  return {
    sentenceCount: sentences.length,
    averageSentenceWords: sentences.length ? Math.round((totalWords / sentences.length) * 10) / 10 : 0,
  };
}

function trimToTarget(value: string, target: number) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= target + 20) return value;
  return `${words.slice(0, target).join(" ")}.`;
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function clampGrade(gradeLevel: number) {
  return Math.min(8, Math.max(3, Number.isFinite(gradeLevel) ? Math.round(gradeLevel) : 6));
}
