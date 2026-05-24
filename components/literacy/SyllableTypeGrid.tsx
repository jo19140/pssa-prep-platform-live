import type { MasteryLevel, SyllableType } from "@prisma/client";
import { SYLLABLE_LABELS, SYLLABLE_TYPES } from "@/lib/literacy/constants";

export function SyllableTypeGrid({
  records,
}: {
  records: Array<{ syllableType: SyllableType; level: MasteryLevel; correctAttempts: number; totalAttempts: number }>;
}) {
  const byType = new Map(records.map((record) => [record.syllableType, record]));
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Syllable types</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {SYLLABLE_TYPES.map((type) => {
          const record = byType.get(type);
          return (
            <div key={type} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-black text-slate-900">{SYLLABLE_LABELS[type]}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{(record?.level || "UNTESTED").replace(/_/g, " ")}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
