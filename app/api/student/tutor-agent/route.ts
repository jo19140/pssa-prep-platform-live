import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildLearnerSummaryFromData, runTutorAgent } from "@/lib/tutorAgent";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id;
  const memory = await getOrCreateMemory(userId);
  const messages = await db.tutorAgentMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 });
  return NextResponse.json({ memory, messages: messages.reverse() });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { message } = await req.json();
  const cleanMessage = String(message || "").trim();
  if (cleanMessage.length < 2) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const userId = (session.user as any).id;
  const student = await db.studentProfile.findUnique({ where: { userId }, include: { user: true } });
  const memory = await getOrCreateMemory(userId);
  const sessions = await db.testSession.findMany({
    where: { userId, submittedAt: { not: null } },
    include: {
      assessment: true,
      report: true,
      learningPath: { include: { lessons: { include: { progress: { where: { userId } } }, orderBy: { priority: "asc" } } } },
    },
    orderBy: { submittedAt: "desc" },
    take: 3,
  });

  const recentReports = sessions.map((testSession) => ({
    assessmentTitle: testSession.assessment.title,
    scorePercent: testSession.scorePercent,
    performanceBand: testSession.proficiencyBand,
    submittedAt: testSession.submittedAt,
    standardsMastery: ((testSession.report?.summaryPayload as any)?.standardsMastery || []).slice(0, 6),
  }));
  const recentLessons = sessions.flatMap((testSession) => testSession.learningPath?.lessons || []).slice(0, 8).map((lesson) => ({
    standardCode: lesson.standardCode,
    skill: lesson.skill,
    title: lesson.title,
    status: lesson.progress[0]?.status || "NOT_STARTED",
    whyAssigned: lesson.whyAssigned,
  }));
  const allowedStandards = Array.from(new Set([
    ...recentLessons.map((lesson) => lesson.standardCode).filter(Boolean),
    ...recentReports.flatMap((report) => (report.standardsMastery || []).map((row: any) => row.standardCode).filter(Boolean)),
    ...((memory.weakStandards as any[]) || []).map((row) => row.standardCode).filter(Boolean),
  ]));

  const result = await runTutorAgent({
    message: cleanMessage,
    context: {
      role: "STUDENT",
      studentName: student?.user.name || "Student",
      gradeLevel: student?.grade || memory.gradeLevel || 6,
      learnerSummary: memory.learnerSummary,
      weakStandards: (memory.weakStandards as any[]) || [],
      masteredSkills: (memory.masteredSkills as any[]) || [],
      preferredSupports: (memory.preferredSupports as any[]) || [],
      recentLessons,
      recentReports,
      allowedStandards,
    },
  });

  const updatedMemory = await db.tutorAgentMemory.update({
    where: { userId },
    data: {
      gradeLevel: student?.grade || memory.gradeLevel,
      learnerSummary: result.memoryUpdate.learnerSummary,
      preferredSupports: result.memoryUpdate.preferredSupports as Prisma.InputJsonValue,
      weakStandards: deriveWeakStandards(recentReports, memory.weakStandards as any[]) as Prisma.InputJsonValue,
      masteredSkills: deriveMasteredSkills(recentReports, memory.masteredSkills as any[]) as Prisma.InputJsonValue,
      lastInteractionAt: new Date(),
    },
  });

  const savedMessage = await db.tutorAgentMessage.create({
    data: {
      userId,
      role: "STUDENT",
      intent: result.intent,
      message: cleanMessage,
      response: result.response,
      artifacts: { ...result.artifacts, provider: result.provider } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ result, memory: updatedMemory, message: savedMessage });
}

async function getOrCreateMemory(userId: string) {
  const existing = await db.tutorAgentMemory.findUnique({ where: { userId } });
  if (existing) return existing;

  const student = await db.studentProfile.findUnique({ where: { userId } });
  const reports = await db.reportSummary.findMany({
    where: { session: { userId } },
    include: { session: { include: { assessment: true } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const standardsRows = reports.flatMap((report) => ((report.summaryPayload as any)?.standardsMastery || []) as any[]);
  const weakStandards = standardsRows.filter((row) => Number(row.percentScore || 0) < 70).slice(0, 5);
  const masteredSkills = standardsRows.filter((row) => Number(row.percentScore || 0) >= 85).slice(0, 5);

  return db.tutorAgentMemory.create({
    data: {
      userId,
      gradeLevel: student?.grade || null,
      learnerSummary: buildLearnerSummaryFromData({ weakStandards, masteredSkills }),
      weakStandards: weakStandards as Prisma.InputJsonValue,
      masteredSkills: masteredSkills as Prisma.InputJsonValue,
      preferredSupports: ["worked examples", "guided practice"] as Prisma.InputJsonValue,
    },
  });
}

function deriveWeakStandards(recentReports: any[], fallback: any[]) {
  const rows = recentReports.flatMap((report) => report.standardsMastery || []);
  const weak = rows.filter((row) => Number(row.percentScore || 0) < 70).slice(0, 8);
  return weak.length ? weak : fallback || [];
}

function deriveMasteredSkills(recentReports: any[], fallback: any[]) {
  const rows = recentReports.flatMap((report) => report.standardsMastery || []);
  const mastered = rows.filter((row) => Number(row.percentScore || 0) >= 85).slice(0, 8);
  return mastered.length ? mastered : fallback || [];
}
