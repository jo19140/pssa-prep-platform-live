import { StudentPracticeSession } from "@/components/literacy/StudentPracticeSession";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function StudentVoicePracticePage() {
  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentPracticeSession voice />
    </SynesisPageShell>
  );
}
