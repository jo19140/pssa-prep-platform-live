import { getServerSession } from "next-auth";
import { TeacherLiteracyMonitor } from "@/components/literacy/TeacherLiteracyMonitor";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLiteracyProfile } from "@/lib/literacy/profile";

async function TeacherLiteracyData() {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  const teacher = await db.teacherProfile.findUnique({
    where: { userId },
    include: {
      students: { include: { user: true } },
      classes: { include: { enrollments: { include: { studentProfile: { include: { user: true } } } } } },
    },
  });

  const studentProfiles = new Map<string, { userId: string; name: string; grade: number }>();
  for (const student of teacher?.students || []) {
    studentProfiles.set(student.userId, { userId: student.userId, name: student.user.name, grade: student.grade });
  }
  for (const classroom of teacher?.classes || []) {
    for (const enrollment of classroom.enrollments) {
      const student = enrollment.studentProfile;
      studentProfiles.set(student.userId, { userId: student.userId, name: student.user.name, grade: student.grade });
    }
  }

  const rows = await Promise.all(
    [...studentProfiles.values()].map(async (student) => {
      const profile = await ensureLiteracyProfile(student.userId);
      return { ...student, phase: profile.ehriPhase, confidence: profile.ehriPhaseConfidence };
    })
  );

  const decisions = rows.length
    ? await db.autopilotDecision.findMany({
        where: {
          appliedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          literacyProfile: { studentUserId: { in: rows.map((student) => student.userId) } },
        },
        orderBy: { appliedAt: "desc" },
        take: 12,
      })
    : [];

  return <TeacherLiteracyMonitor students={rows} decisions={decisions} />;
}

export default function TeacherLiteracyPage() {
  return (
    <SynesisPageShell roles={["TEACHER"]}>
      <TeacherLiteracyData />
    </SynesisPageShell>
  );
}
