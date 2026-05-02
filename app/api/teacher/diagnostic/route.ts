import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDiagnosticAssessment } from "@/lib/diagnosticGenerator";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const teacher = await db.teacherProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: { classes: true },
  });

  if (role === "TEACHER" && !teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

  const classRoomId = body.classRoomId || teacher?.classes[0]?.id;
  if (!classRoomId) return NextResponse.json({ error: "No class found to assign this diagnostic to." }, { status: 400 });
  if (role === "TEACHER" && !teacher?.classes.some((classRoom) => classRoom.id === classRoomId)) {
    return NextResponse.json({ error: "Class does not belong to this teacher." }, { status: 403 });
  }

  const classRoom = await db.classRoom.findUnique({ where: { id: classRoomId } });
  if (!classRoom) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const gradeLevel = parseGrade(body.gradeLevel ?? body.grade ?? classRoom.grade ?? 6);
  const diagnostic = generateDiagnosticAssessment(gradeLevel);
  const questions = diagnostic.questions;
  const passages = diagnostic.passages;
  const standards = diagnostic.standards.map((standard) => standard.code).join(",");

  const assignment = await db.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        title: body.title || diagnostic.title,
        subject: "ELA",
        state: "PA",
        grade: diagnostic.gradeLevel,
        isAdaptive: false,
      },
    });

    await tx.assessmentQuestion.createMany({
      data: questions.map((question, index) => ({
        assessmentId: assessment.id,
        questionNo: index + 1,
        standardCode: question.standardCode,
        standardLabel: question.standardLabel,
        questionType: question.type,
        skill: question.skill,
        difficulty: question.difficulty,
        questionPayload: question as unknown as Prisma.InputJsonValue,
      })),
    });

    await tx.assessmentPassage.createMany({
      data: passages.map((passage) => ({
        assessmentId: assessment.id,
        passageKey: passage.id,
        title: passage.title,
        passageType: passage.passageType,
        genre: passage.genre,
        content: passage.content,
        wordCountTarget: passage.wordCountTarget,
        actualWordCount: passage.actualWordCount,
        hasTable: passage.hasTable,
        hasSections: passage.hasSections,
        gradeLevel: passage.gradeLevel,
        tableData: passage.tableData as Prisma.InputJsonValue | undefined,
        metadata: passage.metadata as Prisma.InputJsonValue,
      })),
    });

    return tx.assignment.create({
      data: {
        assessmentId: assessment.id,
        classRoomId,
        assignedById: (session.user as any).id,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        standards,
        assignmentType: "DIAGNOSTIC",
        status: "ASSIGNED",
      },
      include: { assessment: true },
    });
  });

  return NextResponse.json({ assignment, questionCount: questions.length, passageCount: passages.length, standardCount: diagnostic.standards.length, gradeLevel: diagnostic.gradeLevel });
}

function parseGrade(value: unknown) {
  const match = String(value || "6").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 6;
}
