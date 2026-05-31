import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DiagnosticResultsCard } from "@/components/literacy/diagnostic-results/DiagnosticResultsCard";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { canAccessStudent } from "@/lib/literacy/profile";
import { getLatestCompletedDiagnosticSession } from "@/lib/literacy/diagnosticResultsData";
import { toTutorPayload } from "@/lib/literacy/diagnosticResultsPayload";

export default async function TeacherDiagnosticResultsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await getServerSession(authOptions);
  const currentUser = { id: String((session?.user as any)?.id || ""), role: String((session?.user as any)?.role || "") };
  if (currentUser.role !== "TEACHER" && currentUser.role !== "ADMIN") redirect("/teacher/literacy");
  if (!(await canAccessStudent(currentUser, studentId))) notFound();
  const diagnostic = await getLatestCompletedDiagnosticSession(studentId);
  const result = diagnostic?.resultJson ? toTutorPayload(diagnostic.resultJson) : null;
  return (
    <SynesisPageShell roles={["TEACHER"]}>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <DiagnosticResultsCard result={result} audience="tutor" />
      </main>
    </SynesisPageShell>
  );
}
