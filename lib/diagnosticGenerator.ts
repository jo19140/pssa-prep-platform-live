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
  ["B", "Inference", "Ask and answer questions, make inferences, and support them with text evidence", "Informational"],
  ["C", "Text Structure", "Analyze text structure and author's craft", "Informational"],
  ["D", "Vocabulary", "Determine word meaning and vocabulary", "Informational"],
  ["A", "Theme", "Determine theme and summarize literature", "Literature"],
  ["B", "Literary Inference", "Make inferences in literature and support analysis with textual evidence", "Literature"],
  ["C", "Character / Plot", "Analyze character, plot, and setting", "Literature"],
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
  return [...reading, pointOfViewByGrade[grade], flashbackByGrade[grade], figurativeLanguageByGrade[grade], ...conventions, { code: `CC.1.4.${grade}.S`, label: "Text-dependent analysis essay", skill: "TDA Writing", strand: "Writing" as const }];
}

export function generateDiagnosticAssessment(gradeLevel: number) {
  const grade = clampGrade(gradeLevel);
  const passages = buildPassages(grade);
  const standards = getElaStandardsForGrade(grade);
  const standardBySkill = new Map(standards.map((standard) => [standard.skill, standard]));
  const questions: Question[] = [];
  let id = grade * 10000 + 1;

  const readingPlan = [
    ...["Main Idea", "Inference", "Point of View", "Main Idea", "Inference", "Point of View", "Main Idea"].map((skill, index) => ({ type: "MCQ" as QuestionType, passageId: passages[index % 4].id, skill })),
    { type: "EBSR" as QuestionType, passageId: "literary", skill: "Literary Inference" },
    { type: "EBSR" as QuestionType, passageId: "paired", skill: "Inference" },
    ...teTypes.map((type, index) => ({ type, passageId: ["informational", "paired", "table"][index], skill: ["Text Structure", "Point of View", "Vocabulary"][index] })),
    { type: "SHORT_RESPONSE" as QuestionType, passageId: "informational", skill: "Inference" },
    { type: "MCQ" as QuestionType, passageId: "literary", skill: "Flashback" },
    ...["literary", "paired", "informational", "literary"].map((passageId, index) => ({ type: "MCQ" as QuestionType, passageId, skill: "Figurative Language", figIndex: index })),
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
      return { ...base, type, partAQuestion: inference.partAQuestion, partAChoices: inference.partAChoices, partACorrectIndex: 0, partBQuestion: "Which TWO details best support the answer to Part A?", partBChoices: inference.partBChoices, partBCorrectIndices: [0, 2], correctAnswer: { partA: 0, partB: [0, 2] } };
    }
    if (type === "SHORT_RESPONSE") {
      return { ...base, type, prompt: inference.shortResponsePrompt, sampleAnswer: inference.sampleAnswer, maxScore: 2, correctAnswer: inference.sampleAnswer };
    }
    return { ...base, type: "MCQ", question: inference.question, choices: inference.choices, correctIndex: 0, distractorRationale: ["Correct; this inference is supported by text clues.", "This is a guess without enough evidence.", "This is obvious but not the best inference.", "This ignores important clues."], correctAnswer: 0 };
  }

  if (standard.skill === "Figurative Language") {
    const figurative = figurativeLanguagePromptForGrade(grade, passage.title, itemIndex);
    return { ...base, type: "MCQ", question: figurative.question, choices: figurative.choices, correctIndex: 0, distractorRationale: figurative.distractorRationale, correctAnswer: 0 };
  }

  if (standard.skill === "Flashback") {
    const flashback = flashbackPromptForGrade(grade, passage.title);
    return { ...base, type: "MCQ", question: flashback.question, choices: flashback.choices, correctIndex: 0, distractorRationale: flashback.distractorRationale, correctAnswer: 0 };
  }

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
