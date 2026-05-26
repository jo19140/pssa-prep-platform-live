const steps = [
  {
    icon: "☑",
    title: "Take the diagnostic",
    body: "Sý finds every gap from phonemic awareness through comprehension — placement in 15 minutes.",
  },
  {
    icon: "◌",
    title: "Practice with your Buddy",
    body: "A voice-first AI reading coach listens, supports, and adapts as your student reads aloud.",
  },
  {
    icon: "↗",
    title: "Track progress",
    body: "Teachers and parents see strand-level growth with Ehri-phase placement and weekly summaries.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#f7f2ff] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl font-black tracking-normal text-synesis-ink">How Sý Learning Works</h2>
          <p className="mt-4 text-lg font-medium text-synesis-body">Three steps from gap to growth.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-3xl border border-white bg-white/80 p-7 shadow-xl shadow-indigo-950/5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-synesis-primary text-2xl font-black text-white" aria-hidden="true">
                {step.icon}
              </span>
              <h3 className="mt-6 text-2xl font-black text-synesis-ink">{step.title}</h3>
              <p className="mt-3 leading-7 text-synesis-body">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
