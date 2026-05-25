const differentiators = [
  ["Adapted to You", "Personalized to each child's actual phase"],
  ["Class-Aligned", "Maps to Pennsylvania PSSA and grade standards"],
  ["Dialect-Aware", "Recognizes AAE and L1 patterns as valid speech"],
  ["Research-Grounded", "Built on Blevins's phonics methodology"],
  ["Voice-First", "Real reading practice, not just multiple choice"],
  ["Striving-Reader Focused", "Intervention designed for kids reading below grade level"],
];

export function DifferentiatorGrid() {
  return (
    <section className="bg-indigo-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-display text-4xl font-black tracking-normal text-synesis-ink">Built different. On purpose.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {differentiators.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-white bg-white/80 p-6 shadow-lg shadow-indigo-950/5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-synesis-warmth text-sm font-black text-slate-950" aria-hidden="true">
                •
              </span>
              <h3 className="mt-5 text-xl font-black text-synesis-ink">{title}</h3>
              <p className="mt-2 leading-7 text-synesis-body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
