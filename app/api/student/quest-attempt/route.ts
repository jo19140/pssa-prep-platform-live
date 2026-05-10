import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const lessonId = String(body.lessonId || "");
  if (!lessonId) return NextResponse.json({ error: "Missing lessonId." }, { status: 400 });

  const lesson = await db.learningLesson.findFirst({
    where: { id: lessonId, learningPath: { session: { userId: (session.user as any).id } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

  const responses = normalizeResponses(body.responses);
  const scored = responses.mode === "space-shooter" || responses.mode === "arcade-mini-game"
    ? scoreArcadeQuest(responses as { score: number; maxScore: number; shots?: unknown[]; answers?: unknown[]; gameType?: string })
    : scoreFindTheEvidenceQuest(responses);
  const attempt = await db.learningQuestAttempt.create({
    data: {
      lessonId,
      userId: (session.user as any).id,
      worldKey: worldKeyForSkill(lesson.skill),
      questKey: responses.mode === "space-shooter" ? "space-shooter" : responses.mode === "arcade-mini-game" ? String(responses.gameType || "arcade-mini-game") : "find-the-evidence",
      skill: lesson.skill,
      standardCode: lesson.standardCode,
      score: scored.score,
      maxScore: scored.maxScore,
      xpEarned: scored.xpEarned,
      responses: responses as Prisma.InputJsonValue,
      feedback: scored.feedback as Prisma.InputJsonValue,
    },
  });

  const existingProgress = await db.studentLessonProgress.findUnique({
    where: { lessonId_userId: { lessonId, userId: (session.user as any).id } },
  });
  const nextStatus = existingProgress?.status === "MASTERED" || existingProgress?.status === "COMPLETED"
    ? existingProgress.status
    : scored.score >= 2
      ? "IN_PROGRESS"
      : undefined;

  await db.studentLessonProgress.upsert({
    where: { lessonId_userId: { lessonId, userId: (session.user as any).id } },
    update: {
      status: nextStatus,
      startedAt: existingProgress?.startedAt || new Date(),
    },
    create: {
      lessonId,
      userId: (session.user as any).id,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  return NextResponse.json({ attempt, feedback: scored.feedback });
}

function normalizeResponses(value: unknown) {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  if (raw.mode === "space-shooter" || raw.mode === "arcade-mini-game") {
    return {
      mode: String(raw.mode || ""),
      gameType: String(raw.gameType || ""),
      score: Number(raw.score || 0),
      maxScore: Number(raw.maxScore || 0),
      shots: Array.isArray(raw.shots) ? raw.shots : [],
      answers: Array.isArray(raw.answers) ? raw.answers : [],
      inference: "",
      evidence: "",
      explanation: "",
    };
  }
  return {
    inference: String(raw.inference || ""),
    evidence: String(raw.evidence || ""),
    explanation: String(raw.explanation || ""),
  };
}

function scoreArcadeQuest(responses: { score: number; maxScore: number; shots?: unknown[]; answers?: unknown[]; gameType?: string }) {
  const responseCount = responses.shots?.length || responses.answers?.length || 1;
  const maxScore = Math.max(1, Math.min(10, responses.maxScore || responseCount));
  const score = Math.max(0, Math.min(maxScore, responses.score || 0));
  const percent = Math.round((score / maxScore) * 100);
  const gameType = responses.gameType || "skill";
  const gameLabel = gameType === "car" ? "car rally" : gameType === "crossing" ? "road crossing" : gameType;
  const strengths = score >= Math.ceil(maxScore * 0.7)
    ? [`You chose the correct ${gameLabel} targets most of the time.`]
    : ["You practiced matching the target skill under game pressure."];
  const nextSteps = percent >= 80
    ? ["Try a faster round or a harder target skill next."]
    : ["Slow down and read every answer choice before choosing.", "Check whether the target asks for an inference, main idea, synonym, antonym, simile, metaphor, or another skill."];

  return {
    score,
    maxScore,
    xpEarned: score * 20,
    feedback: {
      performance: percent >= 80 ? "Arcade game mastered" : percent >= 60 ? "Good run" : "Needs another try",
      strengths,
      nextSteps,
      studentMessage: percent >= 80
        ? "Great work. You chose the correct skill targets while keeping your focus."
        : "Good practice. Try again and read the mission carefully before each move.",
    },
  };
}

function scoreFindTheEvidenceQuest(responses: { inference: string; evidence: string; explanation: string }) {
  let score = 0;
  const strengths: string[] = [];
  const nextSteps: string[] = [];
  const inference = responses.inference.toLowerCase();
  const evidence = responses.evidence.toLowerCase();
  const explanation = responses.explanation.toLowerCase();

  if (["nervous", "worried", "anxious", "afraid", "unsure", "concerned"].some((word) => inference.includes(word))) {
    score += 1;
    strengths.push("You made a reasonable inference about how the character feels.");
  } else {
    nextSteps.push("Make an inference that explains what the character thinks or feels.");
  }

  if (["hands", "stomach", "reread", "note", "deep breath", "breath", "shook"].some((word) => evidence.includes(word))) {
    score += 1;
    strengths.push("You chose evidence from the passage instead of guessing.");
  } else {
    nextSteps.push("Choose a text clue from the passage that proves the inference.");
  }

  if (["because", "shows", "proves", "suggests", "this means", "this reveals"].some((word) => explanation.includes(word)) && explanation.length >= 20) {
    score += 1;
    strengths.push("You explained how the clue supports your answer.");
  } else {
    nextSteps.push("Use because, shows, proves, or suggests to explain why the evidence matters.");
  }

  const maxScore = 3;
  return {
    score,
    maxScore,
    xpEarned: score * 25,
    feedback: {
      performance: score === 3 ? "Quest mastered" : score === 2 ? "Almost there" : "Needs another try",
      strengths,
      nextSteps,
      studentMessage: score === 3
        ? "Great work. You made an inference, proved it with evidence, and explained your thinking."
        : "Good start. Try again by making sure your inference, evidence, and explanation all connect.",
    },
  };
}

function worldKeyForSkill(skill: string) {
  const lower = skill.toLowerCase();
  if (lower.includes("inference")) return "inference-world";
  if (lower.includes("figurative")) return "figurative-language-world";
  if (lower.includes("evidence")) return "text-evidence-world";
  if (lower.includes("main idea")) return "main-idea-world";
  return "reading-world";
}
