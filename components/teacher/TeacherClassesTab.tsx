import { TeacherClassesPanel } from "@/components/TeacherClassesPanel";
import { TeacherImportStudentsPanel } from "@/components/TeacherImportStudentsPanel";

export function TeacherClassesTab() {
  return (
    <div className="space-y-5">
      <TeacherClassesPanel />
      <TeacherImportStudentsPanel />
    </div>
  );
}
