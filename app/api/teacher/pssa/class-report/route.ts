import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pssaNoStoreHeaders } from "@/lib/content/pssaItemReview";
import { assembleClassReport, type ClassReportLoaderEntry, type LoadedSession } from "@/lib/content/pssaClassReportLoader";
import type { PssaReportForm, PssaReportItem } from "@/lib/content/pssaStudentReport";

const querySchema = z.object({
  classRoomId: z.string().trim().min(1).max(128),
  formId: z.string().trim().min(1).max(128),
  benchmarkSeason: z.string().trim().min(1).max(40).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return json({ error: "Unauthorized" }, 401);
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return json({ error: "Forbidden" }, 403);

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ error: "Invalid query", issues: parsed.error.flatten().fieldErrors }, 400);
  const { classRoomId, formId } = parsed.data;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!teacher) return json({ error: "Teacher profile not found" }, 404);

  const classRoom = await db.classRoom.findUnique({
    where: { id: classRoomId },
    include: { enrollments: { include: { studentProfile: { select: { id: true, userId: true } } } } },
  });
  if (!classRoom) return json({ error: "Class not found" }, 404);
  if (classRoom.teacherId !== teacher.id) return json({ error: "Forbidden" }, 403);

  const form = await db.pssaForm.findUnique({
    where: { id: formId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          item: {
            select: {
              id: true,
              itemType: true,
              interactionType: true,
              eligibleContent: true,
              reportingCategory: true,
              responseSpecJson: true,
              correctResponseJson: true,
            },
          },
        },
      },
    },
  });
  if (!form) return json({ error: "Form not found" }, 404);

  const userIds = classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId).filter(Boolean);
  const sessions = userIds.length
    ? await db.pssaFormSession.findMany({
      where: { formId, userId: { in: userIds } },
      include: { responses: { orderBy: { positionSnapshot: "asc" } } },
    })
    : [];
  const sessionsByUserId = groupSessionsByUserId(sessions);
  const entries: ClassReportLoaderEntry[] = classRoom.enrollments
    .slice()
    .sort((a, b) => a.studentProfile.id.localeCompare(b.studentProfile.id))
    .map((enrollment) => ({
      studentId: enrollment.studentProfile.id,
      session: enrollment.studentProfile.userId ? sessionsByUserId.get(enrollment.studentProfile.userId) ?? null : null,
    }));

  const benchmarkSeason = parsed.data.benchmarkSeason ?? defaultBenchmarkSeason(form);
  const report = assembleClassReport(entries, {
    form: normalizeForm(form),
    benchmarkSeason,
    formId: form.id,
    formVersion: form.contentHash,
  });
  return json(report, 200);
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: pssaNoStoreHeaders() });
}

function groupSessionsByUserId(sessions: any[]): Map<string, LoadedSession[]> {
  const grouped = new Map<string, LoadedSession[]>();
  for (const session of sessions) {
    const rows = grouped.get(session.userId) ?? [];
    rows.push({
      status: session.status,
      earnedPoints: session.earnedPoints,
      totalPoints: session.totalPoints,
      pendingHumanPoints: session.pendingHumanPoints,
      submittedAt: session.submittedAt,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      responses: session.responses.map((response: any) => ({
        itemId: response.itemId,
        responsePayloadJson: response.responsePayloadJson,
        scoreStatus: response.scoreStatus,
        pointsEarned: response.pointsEarned,
        maxPoints: response.maxPoints,
      })),
    });
    grouped.set(session.userId, rows);
  }
  return grouped;
}

function normalizeForm(form: any): PssaReportForm {
  return {
    id: form.id,
    formId: form.id,
    formVersion: form.contentHash,
    blueprintVersion: form.blueprintVersion,
    contentHash: form.contentHash,
    items: form.items.map(normalizeFormItem),
  };
}

function normalizeFormItem(formItem: any): PssaReportItem {
  const item = formItem.item;
  return {
    id: formItem.itemId,
    itemId: formItem.itemId,
    interactionType: String(item.interactionType),
    itemType: item.itemType,
    eligibleContent: item.eligibleContent,
    reportingCategory: item.reportingCategory,
    correctIndex: correctIndexOf(item.correctResponseJson),
    structuredChoicesJson: choicesArray(item.responseSpecJson),
    answerChoicesJson: choicesArray(item.responseSpecJson),
    choices: choicesArray(item.responseSpecJson),
  };
}

function choicesArray(responseSpecJson: unknown) {
  const spec = plainObject(responseSpecJson);
  const direct = spec.structuredChoicesJson ?? spec.choices ?? spec.answerChoicesJson;
  return Array.isArray(direct) ? direct : [];
}

function correctIndexOf(correctResponseJson: unknown) {
  const correct = plainObject(correctResponseJson);
  return typeof correct.correctIndex === "number" && Number.isInteger(correct.correctIndex) ? correct.correctIndex : null;
}

function plainObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function defaultBenchmarkSeason(form: any) {
  return typeof form.blueprintVersion === "string" && form.blueprintVersion.toLowerCase().includes("fall") ? "fall" : "BOY";
}
