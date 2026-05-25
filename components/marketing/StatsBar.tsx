const stats = [
  { icon: "▣", value: "6", label: "Strands tracked" },
  { icon: "◉", value: "44", label: "Phonemes mapped" },
  { icon: "◎", value: "100%", label: "Phonogram-aware" },
  { icon: "⌂", value: "PA", label: "Built for Pennsylvania" },
];

export function StatsBar() {
  return (
    <section className="bg-white shadow-[0_-12px_28px_rgba(15,23,42,0.08)]">
      {/* TODO: Swap structural/pre-pilot numbers for real engagement stats after the pilot. */}
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-synesis-primary" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <p className="font-display text-3xl font-black text-synesis-ink">{stat.value}</p>
              <p className="text-sm font-bold text-synesis-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
