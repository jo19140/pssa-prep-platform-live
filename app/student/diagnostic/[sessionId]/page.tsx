import { DiagnosticSessionShell } from "@/components/literacy/diagnostic/DiagnosticSessionShell";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default async function StudentDiagnosticSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <DiagnosticSessionShell sessionId={sessionId} />
    </SynesisPageShell>
  );
}

