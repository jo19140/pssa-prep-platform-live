export function DialectChip({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <span className={`rounded-md border px-3 py-2 text-sm font-semibold ${selected ? "border-teal-300 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700"}`}>
      {label}
    </span>
  );
}
