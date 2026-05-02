import type { Question, QuestionType } from "@/types";

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
  ["B", "Text Evidence", "Cite textual evidence and make inferences", "Informational"],
  ["C", "Text Structure", "Analyze text structure and author's craft", "Informational"],
  ["D", "Vocabulary", "Determine word meaning and vocabulary", "Informational"],
  ["A", "Theme", "Determine theme and summarize literature", "Literature"],
  ["B", "Literary Evidence", "Cite textual evidence in literature", "Literature"],
  ["C", "Character / Plot", "Analyze character, plot, and setting", "Literature"],
  ["D", "Literary Vocabulary", "Determine figurative and connotative meaning", "Literature"],
] as const;

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

export function getElaStandardsForGrade(gradeLevel: number): GradeStandard[] {
  const grade = clampGrade(gradeLevel);
  const reading = readingLabels.map(([letter, skill, label, strand], index) => ({
    code: `CC.${index < 4 ? "1.2" : "1.3"}.${grade}.${letter}`,
    label,
    skill,
    strand: strand as GradeStandard["strand"],
  }));
  const conventions = conventionSkills.map((skill, index) => ({
    code: `CC.1.4.${grade}.F${index + 1}`,
    label: `${skill} in Standard English`,
    skill,
    strand: "Conventions" as const,
  }));
  return [...reading, ...conventions, { code: `CC.1.4.${grade}.S`, label: "Text-dependent analysis essay", skill: "TDA Writing", strand: "Writing" as const }];
}

export function generateDiagnosticAssessment(gradeLevel: number) {
  const grade = clampGrade(gradeLevel);
  const passages = buildPassages(grade);
  const standards = getElaStandardsForGrade(grade);
  const standardBySkill = new Map(standards.map((standard) => [standard.skill, standard]));
  const questions: Question[] = [];
  let id = grade * 10000 + 1;

  const readingPlan = [
    ...Array.from({ length: 7 }).map((_, index) => ({ type: "MCQ" as QuestionType, passageId: passages[index % 4].id, skill: index % 2 ? "Text Evidence" : "Main Idea" })),
    { type: "EBSR" as QuestionType, passageId: "literary", skill: "Literary Evidence" },
    { type: "EBSR" as QuestionType, passageId: "paired", skill: "Text Evidence" },
    ...teTypes.map((type, index) => ({ type, passageId: ["informational", "paired", "table"][index], skill: ["Text Structure", "Theme", "Vocabulary"][index] })),
  ];

  readingPlan.forEach((item, index) => {
    const passage = passages.find((entry) => entry.id === item.passageId) || passages[0];
    const standard = standardBySkill.get(item.skill) || standards[index % 8];
    questions.push(buildReadingQuestion({ id: id++, grade, standard, type: item.type, passage, itemIndex: index }));
  });

  conventionSkills.forEach((skill, index) => {
    questions.push(buildConventionsQuestion({ grade, skill, index, id: id++ }));
  });

  questions.push(buildTdaQuestion({ grade, passage: passages.find((item) => item.id === "paired") || passages[0], id: id++ }));

  return {
    gradeLevel: grade,
    title: `Grade ${grade} PSSA ELA Diagnostic`,
    standards,
    passages,
    questions,
  };
}

export function generateGrade6DiagnosticQuestions() {
  return generateDiagnosticAssessment(6).questions;
}

export const grade6ElaStandards = getElaStandardsForGrade(6).filter((standard) => standard.strand !== "Conventions" && standard.strand !== "Writing");

function buildPassages(grade: number): DiagnosticPassage[] {
  const targets = passageTargets[grade];
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
    metadata: { includesDialogue: true, includesConflict: true, includesTheme: true, includesCharacterDevelopment: true },
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
    metadata: { structure: "cause/effect and problem/solution", technicalVocabulary: ["watershed", "sediment", "filtration", "habitat"] },
  });

  const pairedFirst = buildToTarget([
    "Text 1: In \"A Window Garden,\" a student narrator explains how a class grows herbs in recycled containers beside a sunny window.",
    "The narrator focuses on patience, observation, and the surprise of seeing small changes become useful food for the cafeteria.",
    "The central idea is that small actions can improve a community when people record data and share responsibility.",
  ], Math.floor(targets.paired / 2));
  const pairedSecond = buildToTarget([
    "Text 2: In \"The Empty Lot Plan,\" a neighborhood group debates whether an unused lot should become a parking area or a public garden.",
    "The author presents reasons on both sides before showing how evidence from soil tests, traffic counts, and resident surveys shapes the decision.",
    "Both texts explore how planning and cooperation can turn an ordinary space into a resource.",
  ], targets.paired - wordCount(pairedFirst));
  const pairedContent = `${pairedFirst}\n\n${pairedSecond}`;
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
    metadata: { textCount: 2, sharedTheme: "community problem solving", centralIdea: "Evidence and cooperation help communities improve shared spaces." },
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
    metadata: { structure: "problem/solution", technicalVocabulary: ["prototype", "conservation", "irrigation", "trade-off"] },
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

  if (type === "EBSR") {
    return { ...base, type, partAQuestion: `Which conclusion is best supported by ${passage.title}?`, partAChoices: ["The passage mainly lists unrelated facts.", "The author develops an idea through connected evidence.", "The passage avoids explaining causes.", "The title is the only useful clue."], partACorrectIndex: 1, partBQuestion: "Which TWO details best support Part A?", partBChoices: ["A detail introduces the topic.", "A detail explains why the idea matters.", "A detail names an unrelated example.", "A second detail shows how evidence develops the idea."], partBCorrectIndices: [1, 3], correctAnswer: { partA: 1, partB: [1, 3] } };
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
  return { ...base, type: "MCQ", question: `Which answer best explains ${standard.skill.toLowerCase()} in ${passage.title}?`, choices: ["The author develops the idea with relevant details from the passage.", "The author includes details that do not connect to one idea.", "The passage is mostly a list without a structure.", "The best answer can be found by using the title only."], correctIndex: 0, distractorRationale: ["Correct.", "Too broad.", "Incorrect.", "Too limited."], correctAnswer: 0 };
}

function buildConventionsQuestion({ grade, skill, index, id }: { grade: number; skill: string; index: number; id: number }): Question {
  const examples: Record<string, { question: string; choices: string[]; correctIndex: number }> = {
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
  const item = examples[skill] || examples.Grammar;
  return { id, gradeLevel: grade, passageId: "conventions", passageType: "CONVENTIONS", skill, standardCode: `CC.1.4.${grade}.F${index + 1}`, standardLabel: `${skill} in Standard English`, difficulty: index < 4 ? 2 : 3, type: "CONVENTIONS", passageTitle: "Conventions of Standard English", passage: "Choose the answer that follows the conventions of Standard English.", explanation: `This item checks grade ${grade} ${skill.toLowerCase()}.`, skillTip: "Read each option carefully and check the sentence rule.", correctAnswer: item.correctIndex, ...item, distractorRationale: item.choices.map((_, choiceIndex) => choiceIndex === item.correctIndex ? "Correct." : "Contains a conventions error.") };
}

function buildTdaQuestion({ grade, passage, id }: { grade: number; passage: DiagnosticPassage; id: number }): Question {
  return { id, gradeLevel: grade, passageId: passage.id, passageType: passage.passageType, skill: "TDA Writing", standardCode: `CC.1.4.${grade}.S`, standardLabel: "Text-dependent analysis essay", difficulty: 4, type: "TDA", passageTitle: passage.title, passage: passage.content, passageMetadata: passage, tableData: passage.tableData, explanation: "This item asks students to write an evidence-based analysis.", skillTip: "Use a clear claim, evidence from the passage, and explanation.", prompt: `Write an essay analyzing how the author develops an important idea across ${passage.title}. Use evidence from the text to support your response.`, rubric: "4: clear analysis with relevant evidence and strong organization; 3: adequate analysis with evidence; 2: partial analysis or limited evidence; 1: minimal response.", maxScore: 4, correctAnswer: "Rubric-scored essay" };
}

function makePassage({ id, grade, title, passageType, genre, target, hasTable, hasSections, tableData, seed, metadata }: { id: string; grade: number; title: string; passageType: DiagnosticPassage["passageType"]; genre: string; target: number; hasTable: boolean; hasSections: boolean; tableData?: DiagnosticPassage["tableData"]; seed: string[]; metadata: Record<string, unknown> }): DiagnosticPassage {
  const content = buildToTarget(seed, target);
  return { id, title, passageType, genre, content, wordCountTarget: target, actualWordCount: wordCount(content), hasTable, hasSections, gradeLevel: grade, tableData, metadata };
}

function buildToTarget(seed: string[], target: number) {
  const paragraphs = [...seed];
  const extension = [
    "Students examined details carefully, compared evidence, and discussed how each choice affected the larger purpose of the text.",
    "One important detail led to another, helping readers see relationships among events, ideas, causes, and results.",
    "The author uses precise language so readers can follow the development of the central idea from beginning to end.",
    "As the passage continues, new information deepens the reader's understanding and connects back to the original problem.",
  ];
  let index = 0;
  while (wordCount(paragraphs.join("\n\n")) < target) {
    paragraphs.push(extension[index % extension.length]);
    index += 1;
  }
  return trimToTarget(paragraphs.join("\n\n"), target);
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
