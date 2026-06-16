import { PssaSectionedDiagnosticShell } from "@/components/pssa/PssaSectionedDiagnosticShell";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default async function StudentDiagnosticSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <PssaSectionedDiagnosticShell sessionId={sessionId} />
    </SynesisPageShell>
  );
}
