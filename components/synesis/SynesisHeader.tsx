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
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <a href="/student/practice" className="flex items-center gap-3">
          <Image
            src="/branding/sy-learning-logo-v6.png"
            alt="Sý Learning"
            width={196}
            height={52}
            className="h-12 w-auto"
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
