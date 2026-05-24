import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StudentLiteracyProfile } from "@/components/literacy/StudentLiteracyProfile";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { canAccessStudent, getFullLiteracyProfile } from "@/lib/literacy/profile";

export default async function TeacherStudentLiteracyPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await getServerSession(authOptions);
  const currentUser = { id: String((session?.user as any)?.id || ""), role: String((session?.user as any)?.role || "") };
  if (!(await canAccessStudent(currentUser, studentId))) redirect("/teacher/literacy");
  const profile = await getFullLiteracyProfile(studentId);
  if (!profile) notFound();

  return (
    <SynesisPageShell roles={["TEACHER"]}>
      <StudentLiteracyProfile profile={profile} />
    </SynesisPageShell>
  );
}
