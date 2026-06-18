import type { PrismaClient } from "@prisma/client";

import { assembleClassReport, type ClassReportLoaderEntry, type LoadedSession } from "@/lib/content/pssaClassReportLoader";
import type { ClassReport } from "@/lib/content/pssaClassReport";
import { normalizePssaReportForm } from "@/lib/content/pssaReportFormNormalizer";

export type LoadedPssaClassReport = {
  report: ClassReport;
  classRoom: {
    id: string;
    teacherId: string;
    grade: number;
    enrollments: Array<{ studentProfile: { id: string; userId: string | null } }>;
  };
  form: { id: string; contentHash: string; blueprintVersion: string | null };
};

export async function loadPssaClassReportForTeacher(opts: {
  db: PrismaClient;
  classRoomId: string;
  formId: string;
  teacherId: string;
  benchmarkSeason?: string;
}): Promise<LoadedPssaClassReport | { error: "class_not_found" | "forbidden" | "form_not_found" }> {
  const classRoom = await opts.db.classRoom.findUnique({
    where: { id: opts.classRoomId },
    include: { enrollments: { include: { studentProfile: { select: { id: true, userId: true } } } } },
  });
  if (!classRoom) return { error: "class_not_found" };
  if (classRoom.teacherId !== opts.teacherId) return { error: "forbidden" };

  const form = await opts.db.pssaForm.findUnique({
    where: { id: opts.formId },
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
  if (!form) return { error: "form_not_found" };

  const userIds = classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId).filter((id): id is string => Boolean(id));
  const sessions = userIds.length
    ? await opts.db.pssaFormSession.findMany({
      where: { formId: opts.formId, userId: { in: userIds } },
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

  const benchmarkSeason = opts.benchmarkSeason ?? defaultBenchmarkSeason(form);
  return {
    classRoom,
    form,
    report: assembleClassReport(entries, {
      form: normalizePssaReportForm(form),
      benchmarkSeason,
      formId: form.id,
      formVersion: form.contentHash,
    }),
  };
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

function defaultBenchmarkSeason(form: any) {
  return typeof form.blueprintVersion === "string" && form.blueprintVersion.toLowerCase().includes("fall") ? "fall" : "BOY";
}
