import { StudentPracticeSession } from "@/components/literacy/StudentPracticeSession";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function StudentPracticePage() {
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentPracticeSession />
    </SynesisPageShell>
  );
}
