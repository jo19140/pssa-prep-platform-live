const cards = [
  "Wiley Blevins's Phonogram Inventory",
  "Ehri's Phases of Reading Development",
  "Dialect-Aware Scoring Research",
];

export function ResearchTrustSection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl font-black tracking-normal text-synesis-ink">Grounded in published research.</h2>
          <p className="mt-4 text-lg leading-8 text-synesis-body">Sý Learning is built on the methods reading researchers actually agree on.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-lg font-black text-synesis-ink">{card}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
