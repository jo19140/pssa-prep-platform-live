import { StudentPracticeSession } from "@/components/literacy/StudentPracticeSession";
import { buildLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default async function TargetPracticePage({ params }: { params: Promise<{ target: string }> }) {
  const { target } = await params;
  const lesson = await buildLessonPlayerData(target);

  return (
    <SynesisPageShell roles={["STUDENT"]}>
      <StudentPracticeSession lesson={lesson} />
    </SynesisPageShell>
  );
}
