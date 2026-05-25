import Link from "next/link";

const callouts = [
  "Voice-First Buddy — Reads with your students",
  "Dialect-Aware — Fair to every child",
  "Phonogram-Based — Research-grounded lessons",
  "Built for Striving Readers — Grades 3-8",
];

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#00001b] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-no-repeat opacity-100"
        style={{
          backgroundImage: "url('/branding/sy-learning-header-extended-tall.png')",
          backgroundPosition: "center -52px",
          backgroundSize: "calc(100% + 180px) auto",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00001b]/95 via-[#060336]/80 to-[#00001b]/25" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[#f7f2ff]" aria-hidden="true" />

      <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-indigo-100 backdrop-blur">
            Voice-first reading support for grades 3-8
          </p>
          <h1 className="font-display text-5xl font-black tracking-normal text-white sm:text-6xl lg:text-7xl">
            Reading practice that listens.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-indigo-100 sm:text-xl">
            Sý Learning gives every striving reader a Personal AI Reading Buddy — voice-first, dialect-aware, and grounded in published reading research. Built for grades 3-8.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="rounded-full bg-white px-7 py-4 text-base font-black text-synesis-primary shadow-2xl shadow-indigo-950/30 transition hover:bg-indigo-50">
              Start Free for 14 Days
            </Link>
            <span className="text-sm font-bold text-indigo-100">No credit card required</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl shadow-black/30 backdrop-blur-md">
            <div className="rounded-[1.5rem] bg-slate-950 p-2">
              <div className="rounded-[1rem] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.35),_transparent_30%),linear-gradient(135deg,_#312e81,_#6d28d9_52%,_#0f172a)] p-6">
                {/* TODO: Replace this stylized placeholder with a real product screenshot after Phase 2 polish ships. */}
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-wide text-indigo-100">Product Preview</p>
                  <div className="mt-4 grid gap-3">
                    <div className="h-4 rounded-full bg-white/75" />
                    <div className="h-4 w-4/5 rounded-full bg-white/45" />
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-2xl bg-white/20" />
                      <div className="h-20 rounded-2xl bg-amber-300/80" />
                      <div className="h-20 rounded-2xl bg-white/20" />
                    </div>
                    <div className="h-28 rounded-2xl bg-white/15" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:absolute lg:-bottom-10 lg:-left-8 lg:right-0 lg:mt-0">
            {callouts.map((callout) => (
              <div key={callout} className="rounded-full bg-synesis-warmth px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-black/20">
                {callout}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
