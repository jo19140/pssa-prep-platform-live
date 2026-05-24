import type { SynesisProgram, TestPrepModule } from "@prisma/client";
import LogoutButton from "@/components/LogoutButton";
import { MigrationBanner } from "@/components/synesis/MigrationBanner";
import { ProgramSwitcher } from "@/components/synesis/ProgramSwitcher";
import { TestPrepDropdown } from "@/components/synesis/TestPrepDropdown";

export function SynesisHeader({
  enrolledPrograms,
  enrolledTestPrep,
  showMigrationBanner = false,
}: {
  enrolledPrograms?: SynesisProgram[];
  enrolledTestPrep?: TestPrepModule[];
  showMigrationBanner?: boolean;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      {showMigrationBanner ? <MigrationBanner /> : null}
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <a href="/student/practice" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-amber-400 font-black text-slate-950">S</div>
          <div>
            <div className="text-xl font-black text-slate-950">Sýnesis</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Learning Woven Together</div>
          </div>
        </a>
        <ProgramSwitcher enrolledPrograms={enrolledPrograms} />
        <div className="flex items-center gap-3">
          <TestPrepDropdown enrolledTestPrep={enrolledTestPrep} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
