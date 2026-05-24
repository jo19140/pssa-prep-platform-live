import { StudentDiagnosticFlow } from "@/components/literacy/StudentDiagnosticFlow";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function StudentVoiceDiagnosticPage() {
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentDiagnosticFlow voice />
    </SynesisPageShell>
  );
}
