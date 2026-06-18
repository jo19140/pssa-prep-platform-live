import { getServerSession } from "next-auth";
import { StudentPracticeSession } from "@/components/literacy/StudentPracticeSession";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { ProductWorkspaceSwitcher } from "@/components/synesis/ProductWorkspaceSwitcher";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { loadCurrentUserProducts } from "@/lib/auth/currentUserProducts";
import { db } from "@/lib/db";
import { presentationProfileForGrade } from "@/lib/literacy/presentationProfile";
import { resolveStudentHomeHref, STUDENT_WORKSPACE_HREFS } from "@/lib/student/studentWorkspace";

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
  const products = await loadCurrentUserProducts();

  return (
    <SynesisPageShell
      roles={["STUDENT"]}
      variant="product"
      homeHref={resolveStudentHomeHref(products)}
      productNavigation={
        <ProductWorkspaceSwitcher
          products={products}
          activeProduct="reading_buddy"
          workspaceHrefs={STUDENT_WORKSPACE_HREFS}
          ariaLabel="Student product workspaces"
        />
      }
    >
      <StudentPracticeSession lesson={lesson} presentationProfile={lesson.presentationProfile} />
    </SynesisPageShell>
  );
}
