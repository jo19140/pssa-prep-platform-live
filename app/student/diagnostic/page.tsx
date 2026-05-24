import { StudentDiagnosticFlow } from "@/components/literacy/StudentDiagnosticFlow";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function StudentDiagnosticPage() {
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentDiagnosticFlow />
    </SynesisPageShell>
  );
}
