import { getServerSession } from "next-auth";
import { StudentPracticeSession } from "@/components/literacy/StudentPracticeSession";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TargetPracticePage({ params }: { params: Promise<{ target: string }> }) {
  const { target } = await params;
  const session = await getServerSession(authOptions);
  const studentUserId = typeof (session?.user as { id?: unknown } | undefined)?.id === "string" ? (session!.user as { id: string }).id : "";
  const trainingCaptureEnabled = studentUserId
    ? (await db.voiceConsent.findUnique({ where: { studentUserId }, select: { trainingCorpusOptedIn: true } }))?.trainingCorpusOptedIn === true
    : false;
  const lesson = await buildLessonPlayerData(target, { trainingCaptureEnabled, studentUserId });

  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentPracticeSession lesson={lesson} />
    </SynesisPageShell>
  );
}
