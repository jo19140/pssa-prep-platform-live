import type { SynesisProgram, TestPrepModule } from "@prisma/client";
import Image from "next/image";
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
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <a href="/student/practice" className="flex items-center gap-3">
          <Image
            src="/branding/sy-learning-header-left-slim-locked-2048.png"
            alt="Sý Learning"
            width={2048}
            height={446}
            className="h-12 w-auto sm:h-14"
            priority
          />
          <span className="sr-only">Sý Learning</span>
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
