import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DiagnosticResultsCard } from "@/components/literacy/diagnostic-results/DiagnosticResultsCard";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { getLatestCompletedDiagnosticSession } from "@/lib/literacy/diagnosticResultsData";
import { toParentPayload } from "@/lib/literacy/diagnosticResultsPayload";
import { canAccessStudent } from "@/lib/literacy/profile";

export default async function ParentDiagnosticResultsPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const session = await getServerSession(authOptions);
  const currentUser = { id: String((session?.user as any)?.id || ""), role: String((session?.user as any)?.role || "") };
  if (currentUser.role !== "PARENT") redirect("/parent/literacy");
  if (!(await canAccessStudent(currentUser, childId))) notFound();
  const diagnostic = await getLatestCompletedDiagnosticSession(childId);
  const result = diagnostic?.resultJson ? toParentPayload(diagnostic.resultJson) : null;
  return (
    <SynesisPageShell roles={["PARENT"]}>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <DiagnosticResultsCard result={result} audience="parent" />
      </main>
    </SynesisPageShell>
  );
}
