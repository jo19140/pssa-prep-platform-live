import { getServerSession } from "next-auth";
import { StudentPracticeSession } from "@/components/literacy/StudentPracticeSession";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { presentationProfileForGrade } from "@/lib/literacy/presentationProfile";

export default async function StudentPracticePage() {
  const session = await getServerSession(authOptions);
  const studentUserId = typeof (session?.user as { id?: unknown } | undefined)?.id === "string" ? (session!.user as { id: string }).id : "";
  const [voiceConsent, studentProfile] = studentUserId
    ? await Promise.all([
        db.voiceConsent.findUnique({ where: { studentUserId }, select: { trainingCorpusOptedIn: true } }),
        db.studentProfile.findUnique({ where: { userId: studentUserId }, select: { grade: true } }),
      ])
    : [null, null];
  const trainingCaptureEnabled = voiceConsent?.trainingCorpusOptedIn === true;
  const presentationProfile = presentationProfileForGrade(studentProfile?.grade);
  const lesson = await buildLessonPlayerData("a_e", { trainingCaptureEnabled, studentUserId, presentationProfile });

  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentPracticeSession lesson={lesson} presentationProfile={lesson.presentationProfile} />
    </SynesisPageShell>
  );
}
