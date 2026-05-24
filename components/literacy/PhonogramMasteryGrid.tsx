import type { MasteryLevel, SyllableType } from "@prisma/client";
import { TODO_CONTENT_NOTE } from "@/lib/literacy/constants";

const tone: Record<MasteryLevel, string> = {
  UNTESTED: "bg-slate-100 text-slate-600",
  NOT_YET: "bg-rose-50 text-rose-800",
  DEVELOPING: "bg-amber-50 text-amber-900",
  SOLID: "bg-sky-50 text-sky-800",
  MASTERED: "bg-emerald-50 text-emerald-800",
};

export function PhonogramMasteryGrid({
  records,
}: {
  records: Array<{
    level: MasteryLevel;
    correctAttempts: number;
    totalAttempts: number;
    phonogramFamily: { code: string; category: string; syllableType: SyllableType; exampleWords: string[] };
  }>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Phonogram mastery</h2>
      {records.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {records.map((record) => (
            <div key={record.phonogramFamily.code} className={`rounded-md p-3 ${tone[record.level]}`}>
              <p className="text-lg font-black">{record.phonogramFamily.code}</p>
              <p className="text-xs font-semibold">{record.phonogramFamily.syllableType.replace(/_/g, " ")}</p>
              <p className="mt-2 text-xs">{record.correctAttempts}/{record.totalAttempts} attempts</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-600">{TODO_CONTENT_NOTE}</div>
      )}
    </section>
  );
}
