import OpenAI from "openai";

type TutorContext = {
  role: "STUDENT" | "TEACHER";
  studentName: string;
  gradeLevel: number;
  learnerSummary: string;
  weakStandards: unknown[];
  masteredSkills: unknown[];
  preferredSupports: unknown[];
  recentLessons: unknown[];
  recentReports: unknown[];
  allowedStandards: string[];
  tutorMode?: "DASHBOARD" | "LEARNING_PATH";
};

export type TutorAgentResult = {
  response: string;
  intent: string;
  artifacts: {
    miniLesson?: {
      title: string;
      explanation: string;
      workedExample: string;
    };
    practiceQuestions?: PracticeQuestion[];
    miniTest?: PracticeQuestion[];
    tdaFeedback?: {
      score?: number;
      performanceBand?: string;
      strengths: string[];
      areasForGrowth: string[];
      feedback: string;
      nextSteps: string[];
      rubricBreakdown?: Record<string, unknown>;
    };
    nextSteps?: string[];
  };
  memoryUpdate: {
    learnerSummary: string;
    preferredSupports: string[];
  };
  provider: "OPENAI" | "FALLBACK";
};

type PracticeQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

export async function runTutorAgent({
  message,
  context,
}: {
  message: string;
  context: TutorContext;
}): Promise<TutorAgentResult> {
  const intent = classifyIntent(message);
  const guardrail = checkStudentGuardrail(message, context, intent);
  if (guardrail) return guardrail;
  const fallback = buildFallbackTutorResponse({ message, context, intent });
  if (isDirectDefinitionRequest(message) && ["inference", "point of view", "flashback", "plot", "rising action", "falling action", "setting", "theme", "connotation", "denotation"].includes(inferFocus(message, context))) return fallback;
  if (isDirectDefinitionRequest(message) && inferFocus(message, context) === "figurative language") return fallback;

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_TUTOR_AGENT_MODEL || process.env.OPENAI_LESSON_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a warm, rigorous ELA tutor agent for a Pennsylvania PSSA prep app.",
            "You teach skills, create mini-lessons, create short practice sets, and recommend next steps.",
            "You do not have web browsing or internet search tools. Never claim you searched the web.",
            "Use the student's grade level and history.",
            "For students, answer only within the standards, skills, lessons, and PSSA ELA content in context. Politely redirect off-topic requests.",
            "Never give direct answers to active assignments, learning path activities, diagnostics, mastery checks, quizzes, tests, or answer choices. Do not choose A/B/C/D or tell the student which option to select.",
            "If a student asks for an answer, give a hint, ask a guiding question, explain the skill, or create a similar practice item instead.",
            "In LEARNING_PATH mode, act as a lesson-specific hint coach: clarify directions, point students back to evidence, explain the skill, and ask guiding questions without solving the current activity.",
            "In DASHBOARD mode, act as a broader learning coach: explain progress, suggest what to work on, create similar practice, and recommend next steps while still avoiding answers to assigned work.",
            "For student safety, do not produce sexual content, graphic violence, self-harm instructions, weapons instructions, hate or harassment, or adult content. If a student asks for that, redirect to grade-safe ELA practice.",
            "For TDA, use Pennsylvania PSSA Text-Dependent Analysis scoring guidelines: analysis, text evidence, evidence explanation, organization, and language/conventions on a 1-4 scale.",
            "When reviewing a student's TDA draft, teach through comments and revision guidance. Do not rewrite the essay, do not provide a finished paragraph, and do not give copy-ready sentences. Point to strengths, ask guiding questions, and name specific revision moves the student can make.",
            "Do not claim official final scoring for practice you create unless a teacher is using the teacher TDA assistant.",
            "Return only JSON matching the requested schema.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            message,
            intent,
            context,
            schema: {
              response: "student-friendly tutoring response",
              artifacts: {
                miniLesson: { title: "string", explanation: "string", workedExample: "string" },
                practiceQuestions: [{ question: "string", choices: ["A", "B", "C", "D"], correctAnswer: "string", explanation: "string" }],
                miniTest: [{ question: "string", choices: ["A", "B", "C", "D"], correctAnswer: "string", explanation: "string" }],
                tdaFeedback: { score: "optional number 1-4", performanceBand: "optional string", strengths: ["string"], areasForGrowth: ["string"], feedback: "string", nextSteps: ["string"], rubricBreakdown: "optional object" },
                nextSteps: ["specific student actions"],
              },
              memoryUpdate: {
                learnerSummary: "one concise sentence about the student's current needs",
                preferredSupports: ["support strategies that seemed useful"],
              },
            },
          }),
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    if (containsUnsafeStudentContent(parsed.response) || containsUnsafeStudentContent(JSON.stringify(parsed.artifacts || {}))) {
      return buildUnsafeRedirect(context);
    }
    return {
      response: safeString(parsed.response, fallback.response),
      intent,
      artifacts: {
        miniLesson: safeMiniLesson(parsed.artifacts?.miniLesson, fallback.artifacts.miniLesson),
        practiceQuestions: safeQuestions(parsed.artifacts?.practiceQuestions, fallback.artifacts.practiceQuestions),
        miniTest: safeQuestions(parsed.artifacts?.miniTest, fallback.artifacts.miniTest),
        tdaFeedback: safeTdaFeedback(parsed.artifacts?.tdaFeedback, fallback.artifacts.tdaFeedback),
        nextSteps: safeStringArray(parsed.artifacts?.nextSteps, fallback.artifacts.nextSteps),
      },
      memoryUpdate: {
        learnerSummary: safeString(parsed.memoryUpdate?.learnerSummary, fallback.memoryUpdate.learnerSummary),
        preferredSupports: safeStringArray(parsed.memoryUpdate?.preferredSupports, fallback.memoryUpdate.preferredSupports),
      },
      provider: "OPENAI",
    };
  } catch (error) {
    console.error("Tutor agent failed:", error);
    return fallback;
  }
}

export function buildLearnerSummaryFromData({
  currentSummary,
  weakStandards,
  masteredSkills,
}: {
  currentSummary?: string | null;
  weakStandards: unknown[];
  masteredSkills: unknown[];
}) {
  if (currentSummary) return currentSummary;
  const weakCount = weakStandards.length;
  const masteredCount = masteredSkills.length;
  if (weakCount) return `Student has ${weakCount} priority standard${weakCount === 1 ? "" : "s"} to practice and ${masteredCount} mastered skill${masteredCount === 1 ? "" : "s"}.`;
  return "Student is ready for guided practice based on recent assignments and learning path progress.";
}

function classifyIntent(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("tda") || lower.includes("essay") || lower.includes("rubric") || lower.includes("grade my writing") || lower.includes("score this")) return "TDA_SUPPORT";
  if (lower.includes("test") || lower.includes("quiz") || lower.includes("questions")) return "CREATE_PRACTICE_TEST";
  if (lower.includes("lesson") || lower.includes("teach")) return "CREATE_LESSON";
  if (lower.includes("explain") || lower.includes("help")) return "EXPLAIN_SKILL";
  return "TUTOR_CHAT";
}

function buildFallbackTutorResponse({
  message,
  context,
  intent,
}: {
  message: string;
  context: TutorContext;
  intent: string;
}): TutorAgentResult {
  const focus = inferFocus(message, context);
  const tdaFeedback = intent === "TDA_SUPPORT" ? buildFallbackTdaSupport(context.role) : undefined;
  const miniLesson = {
    title: `${focus} Mini-Lesson`,
    explanation: focus === "inference"
      ? `An inference is something you figure out even though the text does not say it directly. For grade ${context.gradeLevel}, make an inference by combining text clues with what you already know, then prove it with evidence from the passage.`
      : focus === "point of view"
        ? `Point of view is the perspective a story or text is told from. It answers: Who is telling this, what do they know, and how do they feel or think about it? In grade ${context.gradeLevel}, you use pronouns, narrator clues, word choice, and details to explain how the author develops point of view.`
        : focus === "flashback"
          ? `A flashback is when a story shifts from the present moment to an earlier event. It is a text structure skill because the author changes the order of events. In grade ${context.gradeLevel}, explain why the author includes the flashback and how it helps develop plot, setting, theme, or character.`
        : focus === "plot"
          ? `Plot is how the events of a story unfold. It includes the beginning, middle, end, conflict, character decisions, cause and effect, and resolution. In grade ${context.gradeLevel}, explain how important events move the story forward and how characters respond or change.`
        : focus === "rising action"
          ? `Rising action is the part of the plot where the conflict grows and events become more complicated before the climax. It comes after the exposition and before the climax. In grade ${context.gradeLevel}, explain how each event increases tension, creates cause and effect, and pushes the character toward an important decision.`
        : focus === "falling action"
          ? `Falling action is the part of the plot after the climax where the story begins moving toward the resolution. The biggest turning point has already happened, and now readers see the results of that choice, conflict, or event. In grade ${context.gradeLevel}, explain how the falling action connects the climax to the ending.`
        : focus === "theme"
          ? `Theme is the message or lesson a story suggests about life or people. A theme is usually a complete idea, not one word. In grade ${context.gradeLevel}, find theme by looking at the character's problem, choices, changes, and the ending, then support the theme with text evidence.`
        : focus === "setting"
          ? `Setting is the time, place, and environment of a story. It can include where and when events happen, plus social, historical, or cultural context. In grade ${context.gradeLevel}, explain how setting affects plot, characters, mood, or theme.`
        : focus === "connotation"
          ? `Connotation means the feeling or idea a word suggests beyond its dictionary definition. Two words can have almost the same basic meaning but different connotations. For grade ${context.gradeLevel}, pay attention to whether a word sounds positive, negative, or neutral, then explain how that word choice affects tone or meaning.`
        : focus === "denotation"
          ? `Denotation means the literal dictionary meaning of a word. It is what the word directly means before you think about feelings, tone, or associations. For grade ${context.gradeLevel}, compare denotation with connotation to explain why an author chose one word instead of another.`
        : focus === "figurative language"
          ? `Figurative language is language that does not always mean exactly what the words literally say. It includes similes, metaphors, personification, hyperbole, and idioms. In grade ${context.gradeLevel}, explain what the phrase means in context and how it affects meaning, tone, or mood.`
      : `Let's slow this skill down. For grade ${context.gradeLevel}, ${focus} means reading carefully, finding the best text details, and explaining how those details prove the answer.`,
    workedExample: focus === "inference"
      ? `If a character keeps checking the dark clouds and packs an umbrella, the text may not say "she is worried about rain," but you can infer it. The evidence is that she notices the clouds and prepares for rain.`
      : focus === "point of view"
        ? `If a passage says, "I could not believe Malik wanted to leave the signs in the storm," the first-person narrator is inside the story and feels worried or frustrated. If it says, "Nora worried that Malik would leave," the third-person narrator tells about Nora from outside the events.`
        : focus === "flashback"
          ? `If a story begins with a character afraid to enter a science fair, then shifts to last year when the character forgot every line of a presentation, that earlier scene is a flashback. It helps the reader understand why the character is nervous now.`
        : focus === "plot"
          ? `If Nora hears thunder and chooses to protect the class garden signs, that event affects the plot because it creates action, shows her responsibility, and leads toward the resolution of the problem.`
        : focus === "rising action"
          ? `At the start, Nora worries that the class garden signs will blow away. Then the storm gets closer, Malik wants to leave, and Nora has to decide what to do. Those events are rising action because they build tension before the biggest moment of choice.`
        : focus === "falling action"
          ? `If the climax is Nora deciding to save the garden signs during the storm, the falling action might show her carrying the signs inside, explaining her choice to Malik, and seeing the class project stay safe. Those events show what happens after the biggest decision and lead toward the resolution.`
        : focus === "theme"
          ? `If a character tells the truth about losing a class key and classmates trust her more afterward, a supported theme could be, "Honesty can help rebuild trust." The evidence is the character's honest choice and the result of that choice.`
        : focus === "setting"
          ? `If a story takes place in a courtyard during a thunderstorm, the setting creates urgency. The storm can affect the plot by making the problem harder and affect the character by pushing her to make a brave choice.`
        : focus === "connotation"
          ? `The words "thin" and "slender" both mean not wide or not heavy. But "slender" has a more positive connotation, while "thin" can sound neutral or even negative depending on context. If an author writes "the slender tree bent in the wind," the word may make the tree seem graceful.`
        : focus === "denotation"
          ? `The word "home" denotes a place where someone lives. Its connotation might be warmth, safety, family, or comfort. Denotation is the basic meaning; connotation is the feeling connected to the word.`
        : focus === "figurative language"
          ? `If a text says, "the problem sat like a stone in her pocket," it does not mean there is a real stone. It means the problem feels heavy and hard to ignore. That simile creates a serious tone.`
      : `If a question asks for ${focus}, first reread the key sentence. Then choose the answer that is supported by more than one detail. A strong answer can point back to the text and say, "This shows..." or "This proves..."`,
  };
  const practiceQuestions = buildQuestions(focus, context.gradeLevel, 3);
  const miniTest = buildQuestions(focus, context.gradeLevel, 5);
  const nextSteps = [
    `Review the ${focus} explanation.`,
    "Try the guided practice and explain why each answer is correct.",
    "Take the mini-test when you can answer without hints.",
  ];
  return {
    response: intent === "CREATE_PRACTICE_TEST"
      ? `I made a short practice set for ${focus}. Try each question, then check the explanations.`
      : intent === "TDA_SUPPORT"
        ? context.role === "TEACHER"
          ? "I can help review this TDA using the PSSA-style 4-point rubric. Use the feedback as a draft scoring aid and adjust it with your professional judgment."
          : "I can help you improve your TDA writing using the PSSA rubric. I will focus on claim, evidence, explanation, organization, and conventions."
      : `Let's work on ${focus}. I made a short lesson, example, and practice set for you.`,
    intent,
    artifacts: { miniLesson, practiceQuestions, miniTest, tdaFeedback, nextSteps },
    memoryUpdate: {
      learnerSummary: `${context.studentName} is currently practicing ${focus} at a grade ${context.gradeLevel} level.`,
      preferredSupports: ["worked examples", "short practice sets", "text evidence reminders"],
    },
    provider: "FALLBACK",
  };
}

function checkStudentGuardrail(message: string, context: TutorContext, intent: string): TutorAgentResult | null {
  if (context.role !== "STUDENT") return null;
  const lower = message.toLowerCase();
  if (containsUnsafeStudentContent(lower)) return buildUnsafeRedirect(context);
  if (isDirectAnswerRequest(lower)) return buildAnswerCoachingRedirect(context);
  const allowedTopics = [
    "pssa", "ela", "reading", "passage", "question", "standard", "main idea", "theme", "evidence", "inference", "infrence", "infer", "implied", "conclude", "conclusion", "clues", "read between the lines",
    "vocabulary", "text structure", "point of view", "pov", "perspective", "bias", "viewpoint", "narrator", "reliability", "reliable", "unreliable",
    "setting", "time", "place", "environment", "historical context", "cultural context", "mood", "atmosphere",
    "plot", "plot development", "plot analysis", "exposition", "rising action", "raising action", "climax", "falling action", "conflict", "resolution", "event", "events", "cause and effect", "character change", "character response",
    "flashback", "flashbacks", "sequence", "sequencing", "time shift", "time shifts", "nonlinear", "foreshadowing", "plot structure",
    "figurative", "figurative language", "simile", "metaphor", "personification", "hyperbole", "idiom", "idioms", "literal", "nonliteral", "connotation", "denotation", "tone", "mood", "symbolism",
    "conventions", "grammar", "punctuation", "tda", "essay", "writing", "lesson", "test", "practice", "help", "explain",
  ];
  const mentionsAllowedStandard = context.allowedStandards.some((standard) => lower.includes(standard.toLowerCase()));
  const isElaTopic = allowedTopics.some((topic) => lower.includes(topic));
  const shortLearningRequest = lower.split(/\s+/).length <= 5 && ["help", "lesson", "practice", "test", "teach"].some((word) => lower.includes(word));
  if (isElaTopic || mentionsAllowedStandard || shortLearningRequest) return null;

  const standardsText = context.allowedStandards.length ? ` Right now I can help with: ${context.allowedStandards.slice(0, 4).join(", ")}.` : "";
  return {
    response: `I can only help with the ELA standards and lessons your teacher assigned in this app.${standardsText} Ask me about a passage, TDA essay, text evidence, main idea, theme, conventions, or your learning path.`,
    intent: "GUARDRAIL_REDIRECT",
    artifacts: { nextSteps: ["Choose a skill from your learning path.", "Ask for a mini-lesson, practice questions, or TDA writing help."] },
    memoryUpdate: {
      learnerSummary: context.learnerSummary,
      preferredSupports: context.preferredSupports.filter((item): item is string => typeof item === "string"),
    },
    provider: "FALLBACK",
  };
}

function isDirectAnswerRequest(lower: string) {
  const directPhrases = [
    "what is the answer",
    "what's the answer",
    "give me the answer",
    "tell me the answer",
    "which answer",
    "which choice",
    "which option",
    "pick the answer",
    "choose the answer",
    "is it a",
    "is it b",
    "is it c",
    "is it d",
  ];
  if (directPhrases.some((phrase) => lower.includes(phrase))) return true;
  return /\b(answer|answers|choice|option|letter)\b/.test(lower) && /\b(give|tell|pick|choose|select|which|what)\b/.test(lower);
}

function buildAnswerCoachingRedirect(context: TutorContext): TutorAgentResult {
  const inLearningPath = context.tutorMode === "LEARNING_PATH";
  return {
    response: inLearningPath
      ? "I cannot choose the answer for you, but I can help you find it. Reread the question, then look for the text detail that proves one choice better than the others. Tell me the skill or the confusing word, and I will give you a hint."
      : "I cannot give answers to assignments, diagnostics, or checks. I can help you practice the skill, explain your progress, or make a similar example so you can solve it yourself.",
    intent: "ANSWER_COACHING_REDIRECT",
    artifacts: {
      nextSteps: inLearningPath
        ? ["Reread the question stem.", "Underline the clue words in the passage.", "Eliminate any choice that is not supported by the text."]
        : ["Ask for a hint instead of the answer.", "Ask for a similar practice question.", "Ask me to explain the skill being tested."],
    },
    memoryUpdate: {
      learnerSummary: context.learnerSummary,
      preferredSupports: Array.from(new Set([
        ...context.preferredSupports.filter((item): item is string => typeof item === "string"),
        "hint-first tutoring",
      ])).slice(0, 6),
    },
    provider: "FALLBACK",
  };
}

function buildUnsafeRedirect(context: TutorContext): TutorAgentResult {
  return {
    response: "I can help with grade-level ELA skills, but I cannot help with sexual content, graphic violence, self-harm, weapons, or other unsafe topics. Choose a reading skill from your learning path, or ask me to teach a term like theme, inference, point of view, connotation, rising action, or falling action.",
    intent: "SAFETY_REDIRECT",
    artifacts: {
      nextSteps: [
        "Ask for a definition of an ELA term.",
        "Ask for a PSSA-style practice question.",
        "Choose a skill from your learning path.",
      ],
    },
    memoryUpdate: {
      learnerSummary: context.learnerSummary,
      preferredSupports: context.preferredSupports.filter((item): item is string => typeof item === "string"),
    },
    provider: "FALLBACK",
  };
}

function containsUnsafeStudentContent(value: string) {
  const lower = value.toLowerCase();
  const sexualTerms = [
    "sex", "sexual", "porn", "nude", "naked", "explicit", "erotic", "fetish", "orgasm", "rape", "molest", "incest",
  ];
  const graphicViolenceTerms = [
    "gore", "graphic violence", "torture", "beheading", "decapitate", "dismember", "dismemberment", "massacre",
  ];
  const weaponInstructionTerms = [
    "how to make a bomb", "make a bomb", "build a bomb", "school shooting", "shoot up", "stab someone", "kill someone", "murder someone",
  ];
  const selfHarmTerms = [
    "kill myself", "suicide method", "how to die", "self harm instructions",
  ];

  return [...sexualTerms, ...graphicViolenceTerms, ...weaponInstructionTerms, ...selfHarmTerms].some((term) => lower.includes(term));
}

function buildFallbackTdaSupport(role: "STUDENT" | "TEACHER") {
  return {
    score: role === "TEACHER" ? 2 : undefined,
    performanceBand: role === "TEACHER" ? "Basic" : undefined,
    strengths: ["The response can be reviewed for a clear claim and text-based evidence."],
    areasForGrowth: ["Add specific text evidence.", "Explain how the evidence proves the claim.", "Use clear organization."],
    feedback: role === "TEACHER"
      ? "Use the 4-point PSSA-style TDA rubric as a guide: analysis, evidence, explanation, organization, and conventions. Confirm the final score after reading the full passage and essay."
      : "To improve your TDA, check whether your claim answers the prompt, your evidence comes from the passage, and your explanation shows how the evidence proves your idea. I will give revision moves, not write the response for you.",
    nextSteps: ["Underline your claim.", "Circle two text details you already used.", "After each detail, add your own sentence explaining why that evidence proves the claim."],
    rubricBreakdown: {
      analysisOfText: "Check whether the response explains an idea about the text, not just retells.",
      useOfTextEvidence: "Look for accurate details from the passage.",
      explanationOfEvidence: "Look for because/shows/proves language that connects evidence to the claim.",
      organization: "Check for a clear beginning, development, and ending.",
      languageAndConventions: "Check sentence clarity and grade-level conventions.",
    },
  };
}

function inferFocus(message: string, context: TutorContext) {
  const lower = message.toLowerCase();
  if (lower.includes("theme")) return "theme";
  if (lower.includes("setting") || lower.includes("time and place") || lower.includes("where and when") || lower.includes("environment")) return "setting";
  if (lower.includes("rising action") || lower.includes("raising action")) return "rising action";
  if (lower.includes("falling action")) return "falling action";
  if (lower.includes("plot") || lower.includes("conflict") || lower.includes("resolution") || lower.includes("event affect") || lower.includes("character change")) return "plot";
  if (lower.includes("point of view") || lower.includes("pov") || lower.includes("perspective") || lower.includes("bias") || lower.includes("narrator")) return "point of view";
  if (lower.includes("flashback") || lower.includes("time shift") || lower.includes("nonlinear") || lower.includes("sequence") || lower.includes("sequencing") || lower.includes("foreshadowing")) return "flashback";
  if (lower.includes("connotation")) return "connotation";
  if (lower.includes("denotation")) return "denotation";
  if (lower.includes("figurative") || lower.includes("simile") || lower.includes("metaphor") || lower.includes("personification") || lower.includes("hyperbole") || lower.includes("idiom") || lower.includes("tone") || lower.includes("mood") || lower.includes("symbolism")) return "figurative language";
  if (lower.includes("inference") || lower.includes("infrence") || lower.includes("infer") || lower.includes("implied") || lower.includes("conclude") || lower.includes("read between the lines")) return "inference";
  if (lower.includes("evidence")) return "text evidence";
  if (lower.includes("main idea")) return "main idea";
  if (lower.includes("grammar") || lower.includes("punctuation")) return "conventions";
  const firstWeak = context.weakStandards[0] as any;
  return firstWeak?.skill || firstWeak?.standardLabel || "reading comprehension";
}

function isDirectDefinitionRequest(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("what is") || lower.includes("what does") || lower.includes("define") || lower.includes("meaning of");
}

function buildQuestions(focus: string, gradeLevel: number, count: number): PracticeQuestion[] {
  if (focus === "theme") {
    return [
      {
        question: `Grade ${gradeLevel} theme practice: Which answer is written as a theme?`,
        choices: ["Friendship", "A school hallway", "True friends help each other during difficult moments.", "The main character is Ava."],
        correctAnswer: "True friends help each other during difficult moments.",
        explanation: `A theme is a complete message or lesson. "Friendship" is only a topic.`,
      },
      {
        question: `Which evidence would best support the theme "perseverance helps people improve"?`,
        choices: ["A character practices each day and performs better at the end.", "A character owns a backpack.", "The story takes place in April.", "The title has three words."],
        correctAnswer: "A character practices each day and performs better at the end.",
        explanation: `The evidence shows persistence and a positive result, which supports the theme.`,
      },
      {
        question: `What should you look at when finding theme?`,
        choices: ["Character choices, conflict, changes, and the ending", "Only the first word", "Only the page number", "Only the author's photograph"],
        correctAnswer: "Character choices, conflict, changes, and the ending",
        explanation: `Theme grows from what characters experience and what the story suggests about life.`,
      },
    ].slice(0, count);
  }
  if (focus === "connotation") {
    return [
      {
        question: `Grade ${gradeLevel} connotation practice: Which word has the most positive connotation?`,
        choices: ["Skinny", "Slender", "Bony", "Weak"],
        correctAnswer: "Slender",
        explanation: `"Slender" suggests something graceful or attractive, while the other choices sound more negative.`,
      },
      {
        question: `In the sentence "The child marched into the room," what does marched suggest?`,
        choices: ["The child moved quietly.", "The child moved with purpose or confidence.", "The child was lost.", "The child was floating."],
        correctAnswer: "The child moved with purpose or confidence.",
        explanation: `"Marched" has a stronger connotation than "walked"; it suggests purpose, confidence, or determination.`,
      },
      {
        question: `Which pair has the same denotation but different connotations?`,
        choices: ["Happy and joyful", "House and building", "Curious and nosy", "Run and jump"],
        correctAnswer: "Curious and nosy",
        explanation: `Both can mean wanting to know, but "curious" sounds positive or neutral while "nosy" sounds negative.`,
      },
    ].slice(0, count);
  }
  if (focus === "denotation") {
    return [
      {
        question: `Grade ${gradeLevel} denotation practice: What is denotation?`,
        choices: ["The dictionary meaning of a word", "The feeling a word suggests", "A comparison using like or as", "A narrator's opinion"],
        correctAnswer: "The dictionary meaning of a word",
        explanation: `Denotation is the literal, dictionary meaning. Connotation is the feeling or idea connected to the word.`,
      },
      {
        question: `Which answer gives the denotation of "frigid"?`,
        choices: ["Scary and lonely", "Very cold", "Beautiful", "Exciting"],
        correctAnswer: "Very cold",
        explanation: `The denotation of "frigid" is very cold. The mood it creates may be uncomfortable or harsh.`,
      },
      {
        question: `Which word names the feeling a word suggests?`,
        choices: ["Denotation", "Connotation", "Plot", "Evidence"],
        correctAnswer: "Connotation",
        explanation: `Connotation is the feeling or association; denotation is the literal meaning.`,
      },
    ].slice(0, count);
  }
  if (focus === "plot") {
    return [
      {
        question: `Grade ${gradeLevel} plot practice: How does an important event usually affect a story?`,
        choices: ["It moves the action forward or changes what a character does next", "It only tells the reader the page number", "It removes all conflict from the story", "It changes the genre to informational text"],
        correctAnswer: "It moves the action forward or changes what a character does next",
        explanation: `Plot questions often ask how one event causes another event or affects a character's decision.`,
      },
      {
        question: `Which question helps you analyze plot?`,
        choices: ["What caused this event, and what happened because of it?", "How many letters are in the title?", "Is the passage printed in large font?", "What is the author's biography?"],
        correctAnswer: "What caused this event, and what happened because of it?",
        explanation: `Plot is built through cause and effect, conflict, decisions, and resolution.`,
      },
      {
        question: `In a story, a character decides to apologize after causing a problem. What plot role might that decision play?`,
        choices: ["It may move the story toward resolution", "It proves there is no conflict", "It is only a setting detail", "It is unrelated to character change"],
        correctAnswer: "It may move the story toward resolution",
        explanation: `Character decisions often affect the plot because they lead to new events or help solve the conflict.`,
      },
    ].slice(0, count);
  }
  if (focus === "rising action") {
    return [
      {
        question: `Grade ${gradeLevel} rising action practice: What is rising action?`,
        choices: ["The events that build conflict and tension before the climax", "The final solution to the problem", "The first sentence of any passage", "The dictionary meaning of a word"],
        correctAnswer: "The events that build conflict and tension before the climax",
        explanation: `Rising action comes after exposition and before climax. It develops the conflict through connected events.`,
      },
      {
        question: `Which event is most likely part of rising action?`,
        choices: ["A problem gets harder and the character must make a choice", "The conflict is completely solved", "The author lists the glossary", "The story ends peacefully"],
        correctAnswer: "A problem gets harder and the character must make a choice",
        explanation: `Rising action increases tension and moves the character toward the climax.`,
      },
      {
        question: `How does rising action affect plot?`,
        choices: ["It creates a cause-and-effect chain that builds toward the climax", "It removes the conflict", "It only describes the setting", "It tells the reader the page number"],
        correctAnswer: "It creates a cause-and-effect chain that builds toward the climax",
        explanation: `Rising action makes the story more intense by adding events that complicate the conflict.`,
      },
    ].slice(0, count);
  }
  if (focus === "falling action") {
    return [
      {
        question: `Grade ${gradeLevel} falling action practice: What is falling action?`,
        choices: ["Events after the climax that lead toward the resolution", "Events before the conflict begins", "The dictionary meaning of a word", "The title of the story"],
        correctAnswer: "Events after the climax that lead toward the resolution",
        explanation: `Falling action shows what happens after the turning point and helps move the story toward the ending.`,
      },
      {
        question: `Which event is most likely falling action?`,
        choices: ["After the big argument, the friends apologize and clean up the classroom together.", "The story introduces the school setting.", "The conflict first begins.", "The author defines a vocabulary word."],
        correctAnswer: "After the big argument, the friends apologize and clean up the classroom together.",
        explanation: `This happens after the major conflict and leads toward resolution.`,
      },
      {
        question: `How does falling action affect plot?`,
        choices: ["It shows the results of the climax and prepares the ending.", "It creates the first conflict.", "It is unrelated to the climax.", "It only tells where the story happens."],
        correctAnswer: "It shows the results of the climax and prepares the ending.",
        explanation: `Falling action connects the story's biggest moment to the resolution.`,
      },
    ].slice(0, count);
  }
  if (focus === "setting") {
    return [
      {
        question: `Grade ${gradeLevel} setting practice: What is setting?`,
        choices: ["The time, place, and environment of a story", "Only the main character's name", "The dictionary meaning of a word", "The answer choices on a test"],
        correctAnswer: "The time, place, and environment of a story",
        explanation: `Setting includes where and when the story happens and the environment around the characters.`,
      },
      {
        question: `How can setting affect a character?`,
        choices: ["It can create conditions that influence what the character does", "It always prevents characters from making choices", "It only tells the page number", "It never affects the plot"],
        correctAnswer: "It can create conditions that influence what the character does",
        explanation: `Setting can shape character actions, conflict, mood, and plot events.`,
      },
      {
        question: `Which question helps analyze setting?`,
        choices: ["How does the time or place affect the conflict or mood?", "How many letters are in the title?", "What is the font size?", "Who printed the passage?"],
        correctAnswer: "How does the time or place affect the conflict or mood?",
        explanation: `PSSA-style setting questions usually ask how setting affects plot, character, mood, or theme.`,
      },
    ].slice(0, count);
  }
  return Array.from({ length: count }, (_, index) => ({
    question: `Grade ${gradeLevel} ${focus} practice ${index + 1}: Which answer is best supported by the text?`,
    choices: [
      "A detail that sounds interesting but is not central",
      `An answer that uses evidence to explain ${focus}`,
      "A choice based only on opinion",
      "A choice that ignores the passage",
    ],
    correctAnswer: `An answer that uses evidence to explain ${focus}`,
    explanation: `The correct answer must connect the skill, ${focus}, to evidence from the text.`,
  }));
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function safeStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : fallback;
}

function safeMiniLesson(value: any, fallback: TutorAgentResult["artifacts"]["miniLesson"]) {
  if (!value || typeof value !== "object") return fallback;
  return {
    title: safeString(value.title, fallback?.title || "Mini-Lesson"),
    explanation: safeString(value.explanation, fallback?.explanation || ""),
    workedExample: safeString(value.workedExample, fallback?.workedExample || ""),
  };
}

function safeQuestions(value: unknown, fallback: PracticeQuestion[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item) => item && typeof item.question === "string" && typeof item.correctAnswer === "string").map((item) => ({
    question: String(item.question),
    choices: Array.isArray(item.choices) ? item.choices.map(String).slice(0, 4) : [],
    correctAnswer: String(item.correctAnswer),
    explanation: typeof item.explanation === "string" ? item.explanation : "Use text evidence to check your answer.",
  }));
}

function safeTdaFeedback(value: any, fallback: TutorAgentResult["artifacts"]["tdaFeedback"]) {
  if (!value || typeof value !== "object") return fallback;
  return {
    score: typeof value.score === "number" ? Math.min(4, Math.max(1, Math.round(value.score))) : fallback?.score,
    performanceBand: typeof value.performanceBand === "string" ? value.performanceBand : fallback?.performanceBand,
    strengths: safeStringArray(value.strengths, fallback?.strengths || []),
    areasForGrowth: safeStringArray(value.areasForGrowth || value.areas_for_growth, fallback?.areasForGrowth || []),
    feedback: safeString(value.feedback, fallback?.feedback || ""),
    nextSteps: safeStringArray(value.nextSteps || value.next_steps, fallback?.nextSteps || []),
    rubricBreakdown: typeof value.rubricBreakdown === "object" && value.rubricBreakdown ? value.rubricBreakdown : fallback?.rubricBreakdown,
  };
}
