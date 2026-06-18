import "server-only";

import { db } from "@/lib/db";
import { getFullLiteracyProfile } from "@/lib/literacy/profile";
import { createParentDashboardLoader } from "@/lib/parent/parentDashboardLoaderCore";
import { loadParentStateTrack } from "@/lib/parent/parentStateTrackFromDiagnostic";

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
  scoreStatus?: "final" | "provisional";
};

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

  async loadStateTrack(child) {
    return loadParentStateTrack(child.studentUserId);
  },

  async loadReadingBuddy(child) {
    return getFullLiteracyProfile(child.studentUserId);
  },
});
