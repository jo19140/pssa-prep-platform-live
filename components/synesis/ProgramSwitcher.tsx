import type { SynesisProgram } from "@prisma/client";

const programs: Array<{ code: SynesisProgram; label: string; planet: string; href: string; active?: boolean }> = [
  { code: "VENUS", label: "Reading Buddy", planet: "Venus", href: "/student/practice", active: true },
  { code: "MERCURY", label: "Math Buddy", planet: "Mercury", href: "#", active: false },
  { code: "MARS", label: "Science Buddy", planet: "Mars", href: "#", active: false },
  { code: "EARTH", label: "History Buddy", planet: "Earth", href: "#", active: false },
];

export function ProgramSwitcher({ enrolledPrograms = ["VENUS"] }: { enrolledPrograms?: SynesisProgram[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {programs.map((program) => {
        const enabled = enrolledPrograms.includes(program.code);
        return (
          <a
            key={program.code}
            href={enabled ? program.href : "#"}
            className={`min-w-[128px] rounded-md border px-3 py-2 text-sm transition ${
              enabled
                ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
            aria-disabled={!enabled}
          >
            <span className="block font-semibold">{program.label}</span>
            <span className="text-xs">{program.planet}</span>
          </a>
        );
      })}
    </div>
  );
}
