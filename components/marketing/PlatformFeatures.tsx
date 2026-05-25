const features = [
  {
    title: "Reading Coach in Every Lesson",
    body: "Buddy reads with your students — listens to their reading, celebrates progress, and gently coaches them past stumbles. Voice-first, dialect-aware, available 24/7.",
    label: "Voice practice",
  },
  {
    title: "Personalized Lessons That Adapt",
    body: "Sý generates phonogram-aware, research-grounded lessons tailored to where each student actually is on Ehri's reading development phases — not what their grade level says.",
    label: "Lesson sample",
  },
  {
    title: "Teacher Dashboards That Actually Help",
    body: "See your caseload at a glance. Strand-level mastery for every student. Targeted intervention recommendations. Spend time teaching, not tracking.",
    label: "Teacher monitor",
  },
  {
    title: "Parent Visibility Without the Overwhelm",
    body: "Weekly summaries in plain English. See what's working, what's hard, and how to support practice at home.",
    label: "Parent dashboard",
  },
];

function FeatureVisual({ label }: { label: string }) {
  return (
    <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.32),_transparent_34%),linear-gradient(135deg,_#eef2ff,_#ffffff_45%,_#ede9fe)] p-6 shadow-xl shadow-indigo-950/10">
      <div className="rounded-3xl border border-white bg-white/75 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-synesis-primary">{label}</p>
        <div className="mt-5 space-y-3">
          <div className="h-4 rounded-full bg-slate-200" />
          <div className="h-4 w-3/4 rounded-full bg-slate-200" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="h-20 rounded-2xl bg-indigo-100" />
            <div className="h-20 rounded-2xl bg-amber-200" />
            <div className="h-20 rounded-2xl bg-purple-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformFeatures() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="font-display text-4xl font-black tracking-normal text-synesis-ink">One platform for every reader.</h2>
          <p className="mt-4 text-lg leading-8 text-synesis-body">Sý helps teachers, tutors, and parents support the same child from the same map of growth.</p>
        </div>
        <div className="mt-14 space-y-16">
          {features.map((feature, index) => (
            <article key={feature.title} className={`grid items-center gap-8 lg:grid-cols-2 ${index % 2 ? "lg:[&>div:first-child]:order-2" : ""}`}>
              <FeatureVisual label={feature.label} />
              <div>
                <h3 className="text-3xl font-black text-synesis-ink">{feature.title}</h3>
                <p className="mt-4 text-lg leading-8 text-synesis-body">{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
