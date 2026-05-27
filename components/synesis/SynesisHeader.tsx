import type { SynesisProgram, TestPrepModule } from "@prisma/client";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";
import { ProgramSwitcher } from "@/components/synesis/ProgramSwitcher";
import { TestPrepDropdown } from "@/components/synesis/TestPrepDropdown";

export function SynesisHeader({
  enrolledPrograms,
  enrolledTestPrep,
}: {
  enrolledPrograms?: SynesisProgram[];
  enrolledTestPrep?: TestPrepModule[];
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
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
        <div className="flex flex-wrap gap-2">
          <ProgramSwitcher enrolledPrograms={enrolledPrograms} />
          <TestPrepDropdown enrolledTestPrep={enrolledTestPrep} />
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
