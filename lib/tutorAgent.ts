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
            "Use the student's grade level and history.",
            "For students, answer only within the standards, skills, lessons, and PSSA ELA content in context. Politely redirect off-topic requests.",
            "For TDA, use Pennsylvania PSSA Text-Dependent Analysis scoring guidelines: analysis, text evidence, evidence explanation, organization, and language/conventions on a 1-4 scale.",
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
    explanation: `Let's slow this skill down. For grade ${context.gradeLevel}, ${focus} means reading carefully, finding the best text details, and explaining how those details prove the answer.`,
    workedExample: `If a question asks for ${focus}, first reread the key sentence. Then choose the answer that is supported by more than one detail. A strong answer can point back to the text and say, "This shows..." or "This proves..."`,
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
  const allowedTopics = [
    "pssa", "ela", "reading", "passage", "question", "standard", "main idea", "theme", "evidence", "inference",
    "vocabulary", "text structure", "conventions", "grammar", "punctuation", "tda", "essay", "writing", "lesson", "test", "practice", "help", "explain",
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

function buildFallbackTdaSupport(role: "STUDENT" | "TEACHER") {
  return {
    score: role === "TEACHER" ? 2 : undefined,
    performanceBand: role === "TEACHER" ? "Basic" : undefined,
    strengths: ["The response can be reviewed for a clear claim and text-based evidence."],
    areasForGrowth: ["Add specific text evidence.", "Explain how the evidence proves the claim.", "Use clear organization."],
    feedback: role === "TEACHER"
      ? "Use the 4-point PSSA-style TDA rubric as a guide: analysis, evidence, explanation, organization, and conventions. Confirm the final score after reading the full passage and essay."
      : "To improve your TDA, write a clear claim, include evidence from the passage, and explain how each detail supports your answer.",
    nextSteps: ["Underline the claim.", "Find two text details.", "Add one sentence after each detail explaining why it matters."],
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
  if (lower.includes("evidence")) return "text evidence";
  if (lower.includes("main idea")) return "main idea";
  if (lower.includes("grammar") || lower.includes("punctuation")) return "conventions";
  const firstWeak = context.weakStandards[0] as any;
  return firstWeak?.skill || firstWeak?.standardLabel || "reading comprehension";
}

function buildQuestions(focus: string, gradeLevel: number, count: number): PracticeQuestion[] {
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
