"use client";

import { MISCUE_TYPE_VALUES } from "@/lib/voice/miscueTypes";

export function MiscueTagPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MISCUE_TYPE_VALUES.map((type, index) => (
        <button key={type} onClick={() => onChange(type)} className={`rounded-md border px-3 py-2 text-left text-sm font-bold ${value === type ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
          {index + 1}. {type.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
