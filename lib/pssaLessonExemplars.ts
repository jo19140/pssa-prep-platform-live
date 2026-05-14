import type { LearningLessonBuild, LessonStepBuild, PracticeQuestion } from "@/lib/learningLessons";

function sectionQuestions(skill: string, correctAnswer: string): PracticeQuestion[] {
  return [
    {
      passage: "The class garden looked dry by Friday afternoon. Mara checked the soil, carried two full watering cans, and asked Leo to move the smallest seedlings into the shade.",
      question: `Which answer best practices ${skill}?`,
      choices: [correctAnswer, "The passage is mostly about lunch.", "The best answer is impossible to know.", "Every sentence should be a question."],
      correctAnswer,
      explanation: `The correct answer focuses on ${skill} and uses the example details instead of a loosely related idea.`,
      coachHint: "Match the answer to the exact skill named in the lesson.",
    },
  ];
}

function itemsFor(lesson: Omit<LearningLessonBuild, "items">) {
  return [
    { order: 1, itemType: "LESSON", title: "Lesson Steps", content: { steps: lesson.steps || [] } },
    { order: 2, itemType: "GUIDED_PRACTICE", title: "Guided Practice", content: { questions: lesson.guidedPractice } },
    { order: 3, itemType: "INDEPENDENT_PRACTICE", title: "Independent Practice", content: { questions: lesson.independentPractice } },
    { order: 4, itemType: "EXIT_TICKET", title: "Exit Ticket", content: { questions: lesson.exitTicket } },
    { order: 5, itemType: "MASTERY_CHECK", title: "Mastery Check", content: { questions: lesson.masteryCheck } },
    { order: 6, itemType: "RETEST", title: "Retest Recommendation", content: { text: lesson.retestRecommendation } },
  ];
}

function baseLesson(partial: Omit<LearningLessonBuild, "generatedBy" | "aiStatus" | "sourcePayload" | "items" | "guidedPractice" | "independentPractice" | "exitTicket" | "masteryCheck" | "retestRecommendation"> & {
  commonError: string;
  answer: string;
  retestRecommendation?: string;
}): LearningLessonBuild {
  const practice = sectionQuestions(partial.skill, partial.answer);
  const lesson = {
    ...partial,
    resourceTitle: null,
    resourceUrl: null,
    resourceProvider: null,
    resourceDescription: null,
    heroResourceLinkId: null,
    heroResource: null,
    guidedPractice: practice,
    independentPractice: practice,
    exitTicket: practice,
    masteryCheck: practice,
    retestRecommendation: partial.retestRecommendation || `After this lesson, complete a short ${partial.standardCode} progress check and explain why each answer matches ${partial.skill}.`,
    generatedBy: "AI_ENRICHED" as const,
    aiStatus: "COMPLETED" as const,
    sourcePayload: { exemplar: true, commonError: partial.commonError, librarySource: false },
  };
  return { ...lesson, items: itemsFor(lesson) };
}

const subjectVerbSteps: LessonStepBuild[] = [
  {
    order: 1,
    stepType: "INTRO",
    title: "Hearing Agreement Problems",
    bodyText:
      'Imagine Jalen rereads his paragraph and stops at this sentence: "The list of supplies are on the desk." Something sounds off. The word "list" is the subject, so the verb should match one list: "The list of supplies is on the desk."',
    narrationScript:
      'Sometimes a sentence sounds almost right, but one verb is not matching its subject. Today we will listen for that mismatch and use the subject, not the nearby words, to choose the verb.',
    imagePrompt: "A student revising a sentence in a notebook while checking a subject and verb, no readable text",
    checkQuestion: null,
  },
  {
    order: 2,
    stepType: "EXPLANATION",
    title: "Matching Subjects And Verbs",
    bodyText:
      'Rule: a singular subject takes a singular verb, and a plural subject takes a plural verb. Positive example: "The bird sings" works because one bird matches sings. Common error: "The bird sing" is wrong because one bird needs the singular verb sings.',
    narrationScript:
      'Here is the rule in one sentence: the subject and verb must agree in number. One bird sings. Many birds sing. The subject is in charge, even when other words sit between the subject and verb.',
    imagePrompt: null,
    checkQuestion: null,
  },
  {
    order: 3,
    stepType: "MODEL",
    title: "Ignoring Nearby Distractor Words",
    bodyText:
      'Consider the sentence, "The box of markers sit near the window." The phrase "of markers" can trick us because markers is plural. I ask, who or what sits? The box sits. Since box is singular, the correct sentence is, "The box of markers sits near the window."',
    narrationScript:
      'Watch how I cover the distracting phrase. The subject is box, not markers. Box is one thing, so I need sits. That is how I know the sentence should say the box sits.',
    imagePrompt: "A grammar lesson scene showing a student separating a subject from a distracting phrase, no text",
    checkQuestion: null,
  },
  {
    order: 4,
    stepType: "CHECK_QUESTION",
    title: "Choosing The Agreeing Verb",
    bodyText:
      'Try one. Read the whole sentence, find the subject, and choose the verb that agrees with it: "The pages in the old notebook ___ yellow at the edges." The subject is pages, not notebook.',
    narrationScript:
      'Now you try. Find the subject first. Pages is plural, so the verb has to match more than one page.',
    imagePrompt: null,
    checkQuestion: {
      question: 'Which verb correctly completes the sentence: "The pages in the old notebook ___ yellow at the edges"?',
      choices: ["is", "are", "was", "has"],
      correctIndex: 1,
      explanation: 'The subject is "pages," which is plural, so the agreeing verb is "are."',
    },
  },
  {
    order: 5,
    stepType: "WORKED_EXAMPLE",
    title: "Checking Multiple Verb Pairs",
    bodyText:
      'Worked example: "The captain and her teammates practice before the game, and the coach watches from the sideline." There are two subject-verb pairs. Captain and teammates is a compound subject, so practice is correct. Coach is singular, so watches is correct.',
    narrationScript:
      'Longer sentences can have more than one subject and verb. I check one pair at a time. Captain and teammates practice. Coach watches. Each verb matches its own subject.',
    imagePrompt: "A student using two colored highlighters to mark subject-verb pairs, no text",
    checkQuestion: null,
  },
];

const inferenceSteps: LessonStepBuild[] = [
  {
    order: 1,
    stepType: "INTRO",
    title: "Reading Feelings From Actions",
    bodyText:
      "Imagine a character says she is fine, but she keeps twisting her bracelet and staring at the floor. A reader can infer she is nervous because her actions give clues. The inference is the idea; the evidence is the proof.",
    narrationScript:
      "Characters do not always announce how they feel. We can figure it out by connecting what they do and say to a reasonable idea.",
    imagePrompt: "A student noticing body language clues in a story scene, no text",
    checkQuestion: null,
  },
  {
    order: 2,
    stepType: "EXPLANATION",
    title: "Inference Plus Text Evidence",
    bodyText:
      'Rule: an inference is a logical idea based on clues, and text evidence is the exact detail that proves it. Positive example: if Eli checks the clock three times, you may infer he is impatient. Common error: saying "Eli is funny" without a detail does not prove anything.',
    narrationScript:
      "A strong inference has two parts. First, name what you figured out. Then point to the detail that made that idea reasonable.",
    imagePrompt: null,
    checkQuestion: null,
  },
  {
    order: 3,
    stepType: "MODEL",
    title: "Connecting Clue To Inference",
    bodyText:
      'Consider this excerpt: "Nora folded the permission slip twice. She slid it under her math book when her mother walked in. At dinner, she barely touched her soup." The clues show Nora is worried about the slip. Hiding it and losing interest in food both support that inference.',
    narrationScript:
      "I do not just pick a feeling. I connect the clue to the idea. Nora hides the slip and acts distracted, so worried is a supported inference.",
    imagePrompt: "A student using arrows to connect story clues to an inference, no readable words",
    checkQuestion: null,
  },
  {
    order: 4,
    stepType: "CHECK_QUESTION",
    title: "Evidence Or Just Related",
    bodyText:
      'Question: Which detail best supports the inference that Malik is proud of his project? Look for the choice that proves pride, not just a detail about the project topic.',
    narrationScript:
      "This check asks you to separate strong evidence from details that only sound related. The right detail proves the inference.",
    imagePrompt: null,
    checkQuestion: {
      question: "Which detail best supports the inference that Malik is proud of his project?",
      choices: ["He carries it carefully to the display table.", "The project is about birds.", "The table is near the window.", "His class meets after lunch."],
      correctIndex: 0,
      explanation: "Carrying it carefully shows Malik values the project, which supports the inference that he is proud.",
    },
  },
  {
    order: 5,
    stepType: "WORKED_EXAMPLE",
    title: "Explaining A Longer Inference",
    bodyText:
      'In a longer paragraph, look for repeated clues. If a character rereads a speech, whispers the first line, and smiles after the audience claps, you can infer the character becomes more confident. The evidence moves from nervous preparation to a positive reaction.',
    narrationScript:
      "For a longer inference, I gather more than one clue. The pattern matters: nervous practice at first, then smiling after applause. That change supports confidence.",
    imagePrompt: "A student tracing repeated character clues across a short story passage, no text",
    checkQuestion: null,
  },
];

const figurativeSteps: LessonStepBuild[] = [
  {
    order: 1,
    stepType: "INTRO",
    title: "Picture The Comparison",
    bodyText:
      'A sentence says, "The hallway buzzed like a jar of bees." The hallway is not actually a jar. The simile helps us imagine noise and energy. Figurative language gives readers a picture or feeling beyond the literal words.',
    narrationScript:
      "When words seem impossible literally, pause and ask what picture or feeling the author is creating.",
    imagePrompt: "A busy school hallway shown with energetic motion lines but no words",
    checkQuestion: null,
  },
  {
    order: 2,
    stepType: "EXPLANATION",
    title: "Simile Metaphor Personification",
    bodyText:
      'Rule: figurative language uses nonliteral words to create meaning. A simile compares using like or as, such as "quiet as snow." A metaphor says one thing is another, such as "her idea was a spark." Personification gives human action to something nonhuman, such as "the wind whispered."',
    narrationScript:
      "Three common types are simile, metaphor, and personification. The type matters less than the meaning it creates in context.",
    imagePrompt: null,
    checkQuestion: null,
  },
  {
    order: 3,
    stepType: "MODEL",
    title: "Interpreting An Unfamiliar Phrase",
    bodyText:
      'Consider the phrase, "The unanswered question followed him down the street." A question cannot literally follow someone. The personification means he keeps thinking about it. The phrase creates a worried mood because the question feels impossible to escape.',
    narrationScript:
      "I ask what cannot be literal. A question cannot walk behind someone. So the phrase means the question stays in his mind and affects the mood.",
    imagePrompt: "A thoughtful student walking while a soft symbolic question shape trails behind, no text",
    checkQuestion: null,
  },
  {
    order: 4,
    stepType: "CHECK_QUESTION",
    title: "Meaning In Context",
    bodyText:
      'Try a quick interpretation. If a story says, "The news landed like a stone," think about the feeling a heavy stone creates. The phrase suggests the news feels serious or upsetting.',
    narrationScript:
      "Do not stop at naming the comparison. Explain what the comparison suggests in this sentence.",
    imagePrompt: null,
    checkQuestion: {
      question: 'What does "The news landed like a stone" suggest?',
      choices: ["The news felt heavy or upsetting.", "The news was printed on a rock.", "The news made everyone laugh.", "The news was easy to ignore."],
      correctIndex: 0,
      explanation: "The simile compares the news to something heavy, which suggests a serious or upsetting feeling.",
    },
  },
  {
    order: 5,
    stepType: "WORKED_EXAMPLE",
    title: "Explaining Effect On Mood",
    bodyText:
      'Worked example: "The empty swing creaked a lonely song." The swing does not sing, so this is personification. The words empty, creaked, and lonely create a quiet, sad mood. A complete answer names the type, explains the meaning, and connects it to mood.',
    narrationScript:
      "A strong figurative language answer has three moves: identify what is happening, explain the meaning, and tell how it affects the passage.",
    imagePrompt: "An empty playground swing in a quiet scene, no text",
    checkQuestion: null,
  },
];

const centralIdeaSteps: LessonStepBuild[] = [
  {
    order: 1,
    stepType: "INTRO",
    title: "Topic Versus Main Idea",
    bodyText:
      'A topic might be "school gardens." A main idea is more complete: "School gardens help students learn science while improving their community." The topic names the subject; the main idea tells what the author wants readers to understand about it.',
    narrationScript:
      "Today we separate a topic from a main idea. The topic is a label. The main idea is the whole point.",
    imagePrompt: "A student sorting broad topic cards from complete main idea cards, no readable text",
    checkQuestion: null,
  },
  {
    order: 2,
    stepType: "EXPLANATION",
    title: "Details That Support",
    bodyText:
      'Rule: the main idea states the most important point, and supporting details prove or explain it. For example, composting, planting, and measuring growth can all support a main idea about a school garden helping students learn. A detail about the cafeteria paint color is interesting but off-topic.',
    narrationScript:
      "A supporting detail should connect back to the main idea. If it is interesting but does not prove the point, it probably does not belong.",
    imagePrompt: null,
    checkQuestion: null,
  },
  {
    order: 3,
    stepType: "MODEL",
    title: "Combining Four Sentences",
    bodyText:
      'Consider this paragraph: "Students built a small weather station. They measured rainfall each morning. They graphed wind speed for a month. Their teacher used the data during science lessons." The details all show students collecting weather data to learn science, so that is the main idea.',
    narrationScript:
      "I look across all four sentences. Rainfall, wind speed, graphs, and science lessons point to one big idea about using weather data to learn.",
    imagePrompt: "A class examining weather tools and graphs without readable labels",
    checkQuestion: null,
  },
  {
    order: 4,
    stepType: "CHECK_QUESTION",
    title: "Best Complete Main Idea",
    bodyText:
      "Choose the answer that covers all the important details, not one small fact. If every sentence explains how volunteers rescue, feed, and release injured turtles, the main idea should include the rescue work as a whole.",
    narrationScript:
      "The best main idea is not too tiny and not too broad. It fits all the important details.",
    imagePrompt: null,
    checkQuestion: {
      question: "Which sentence is the best main idea for a paragraph about volunteers rescuing, feeding, and releasing injured turtles?",
      choices: ["Volunteers help injured turtles recover and return to the wild.", "Turtles can swim in the ocean.", "Some volunteers wear gloves.", "The rescue center opens at nine."],
      correctIndex: 0,
      explanation: "The correct answer covers the full pattern of rescue, care, and release.",
    },
  },
  {
    order: 5,
    stepType: "WORKED_EXAMPLE",
    title: "Testing Details Against Idea",
    bodyText:
      'Worked example: A paragraph says a library added weekend hours, created a homework table, and trained teen volunteers. The main idea is, "The library expanded services for students." Each detail supports that idea because it names a service students can use.',
    narrationScript:
      "After I choose a main idea, I test it. Weekend hours, a homework table, and teen volunteers all fit expanded services for students.",
    imagePrompt: "Students using library study supports in a warm learning space, no text",
    checkQuestion: null,
  },
];

export const pssaLessonExemplars: LearningLessonBuild[] = [
  baseLesson({
    learningPathItemOrder: 1,
    gradeLevel: 6,
    standardCode: "CC.1.4.6.F1",
    standardLabel: "Demonstrate command of conventions of standard English grammar and usage.",
    skill: "Subject-Verb Agreement",
    priority: 1,
    title: "Subject-Verb Agreement Mini-Lesson",
    whyAssigned: "This lesson targets subject-verb agreement errors in grade 6 writing.",
    lessonExplanation: "",
    workedExample: "",
    steps: subjectVerbSteps,
    commonError: "subject_verb_agreement",
    answer: "The subject and verb agree in number.",
  }),
  baseLesson({
    learningPathItemOrder: 1,
    gradeLevel: 6,
    standardCode: "CC.1.3.6.B",
    standardLabel: "Cite textual evidence to support analysis of what the text says explicitly as well as inferences.",
    skill: "Citing Textual Evidence for Inference",
    priority: 1,
    title: "Inference Evidence Mini-Lesson",
    whyAssigned: "This lesson targets linking inferences to precise text evidence.",
    lessonExplanation: "",
    workedExample: "",
    steps: inferenceSteps,
    commonError: "unsupported_inference",
    answer: "A clue from the character's action supports the inference.",
  }),
  baseLesson({
    learningPathItemOrder: 1,
    gradeLevel: 6,
    standardCode: "CC.1.3.6.F",
    standardLabel: "Determine the meaning of words and phrases as they are used in grade-level text.",
    skill: "Figurative Language",
    priority: 1,
    title: "Figurative Language Mini-Lesson",
    whyAssigned: "This lesson targets explaining figurative language in context.",
    lessonExplanation: "",
    workedExample: "",
    steps: figurativeSteps,
    commonError: "literal_interpretation",
    answer: "The phrase creates a nonliteral image that affects meaning.",
  }),
  baseLesson({
    learningPathItemOrder: 1,
    gradeLevel: 6,
    standardCode: "CC.1.2.6.A",
    standardLabel: "Determine the central idea of a text and how it is conveyed through details.",
    skill: "Main Idea and Supporting Details",
    priority: 1,
    title: "Main Idea Mini-Lesson",
    whyAssigned: "This lesson targets distinguishing a full main idea from a topic or detail.",
    lessonExplanation: "",
    workedExample: "",
    steps: centralIdeaSteps,
    commonError: "topic_not_main_idea",
    answer: "The main idea covers all important supporting details.",
  }),
];
