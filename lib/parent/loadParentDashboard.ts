import "server-only";

import { db } from "@/lib/db";
import { getFullLiteracyProfile } from "@/lib/literacy/profile";
import { createParentDashboardLoader } from "@/lib/parent/parentDashboardLoaderCore";

export type ParentDashboardStateTrackPayload = {
  studentId: string;
  studentName: string;
  grade: number | null;
  latestAssessment: string | null;
  latestScore: number | null;
  performanceBand: string | null;
  growth: unknown;
  standardsMastery: unknown[];
  standardsGrowth: unknown[];
  sessionId: string | null;
  submittedAt: Date | null;
};

async function loadStateTrackForChild({
  studentUserId,
  name,
  grade,
}: {
  studentUserId: string;
  name: string | null;
  grade: number | null;
}): Promise<ParentDashboardStateTrackPayload> {
  const latest = await db.testSession.findFirst({
    where: { userId: studentUserId, submittedAt: { not: null } },
    include: { assessment: true, report: true },
    orderBy: { submittedAt: "desc" },
  });
  const payload = (latest?.report?.summaryPayload as any) || {};
  return {
    studentId: studentUserId,
    studentName: name?.trim() || "Student",
    grade,
    latestAssessment: latest?.assessment.title ?? null,
    latestScore: latest?.report?.percentScore ?? null,
    performanceBand: latest?.report?.performanceBand ?? null,
    growth: payload.growth ?? null,
    standardsMastery: payload.standardsMastery ?? [],
    standardsGrowth: payload.standardsGrowth ?? [],
    sessionId: latest?.id ?? null,
    submittedAt: latest?.submittedAt ?? null,
  };
}

export const loadParentDashboard = createParentDashboardLoader({
  async loadParentIdentity(userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, parentProfile: { select: { id: true } } },
    });
    if (user?.role !== "PARENT" || !user.parentProfile) return null;
    return { parentProfileId: user.parentProfile.id };
  },

  async loadLinkedChildren(parentProfileId) {
    const links = await db.parentStudentLink.findMany({
      where: { parentProfileId },
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                enrolledPrograms: true,
                enrolledTestPrep: true,
              },
            },
          },
        },
      },
    });

    return links.map((link) => ({
      studentProfileId: link.studentProfile.id,
      studentUserId: link.studentProfile.userId,
      name: link.studentProfile.user.name,
      grade: link.studentProfile.grade,
      enrolledPrograms: link.studentProfile.user.enrolledPrograms,
      enrolledTestPrep: link.studentProfile.user.enrolledTestPrep,
    }));
  },

  loadStateTrack: loadStateTrackForChild,

  async loadReadingBuddy(child) {
    return getFullLiteracyProfile(child.studentUserId);
  },
});
