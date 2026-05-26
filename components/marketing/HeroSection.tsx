import Link from "next/link";

const callouts = [
  "Voice-First Buddy — Reads with your students",
  "Dialect-Aware — Fair to every child",
  "Phonogram-Based — Research-grounded lessons",
  "Built for Striving Readers — Grades 3-8",
];

function LessonPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-[#fff7f2] text-slate-950 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between bg-purple-700 px-4 py-2 text-[0.65rem] font-black uppercase tracking-wide text-white">
        <span>Reading Buddy</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5">Live practice</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-purple-100 bg-white/85 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,_#34d399_0%,_#a7f3d0_60%,_#fde68a_100%)] shadow-lg shadow-emerald-200">
              <span className="absolute left-5 top-5 h-2.5 w-2.5 rounded-full bg-slate-950" />
              <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-slate-950" />
              <span className="absolute bottom-5 h-2 w-7 rounded-full border-2 border-white/90 bg-slate-900/20" />
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-wide text-emerald-700">Listening</p>
              <p className="text-sm font-black text-slate-950">Buddy is reading along</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-950">
            Patient support starts after a pause, never while your student is trying.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-wide text-purple-700">Read aloud</p>
              <p className="text-sm font-black text-slate-950">Why the Rain Came Back</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-black text-amber-900">Grade 4</span>
          </div>
          <p className="text-base font-semibold leading-7 text-slate-800">
            The children watched the creek <span className="rounded bg-emerald-100 px-1 text-emerald-950">shine</span> after the rain. Each bright line of water helped the garden grow again.
          </p>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200" aria-label="Speak">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2" />
                <path d="M5 10a7 7 0 0 0 14 0M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-950">Speak when ready</p>
              <p className="text-[0.7rem] font-semibold text-slate-500">Buddy tracks each word as it is read.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00001b]/90 via-[#060336]/76 to-[#00001b]/25" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[#f7f2ff]" aria-hidden="true" />

      <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
        <div className="relative max-w-3xl">
          <div className="relative z-10 mb-5 flex max-w-2xl justify-center">
            <p className="inline-flex rounded-full border border-white/25 bg-white/[0.15] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/10 backdrop-blur">
              Voice-first reading support for grades 3-8
            </p>
          </div>
          <h1 className="relative z-10 font-display text-5xl font-black tracking-normal text-white drop-shadow-[0_4px_18px_rgba(0,0,27,0.75)] sm:text-6xl lg:text-7xl">
            Reading practice that listens.
          </h1>
          <p className="relative z-10 mt-6 max-w-2xl text-lg font-medium leading-8 text-indigo-100 drop-shadow-[0_2px_10px_rgba(0,0,27,0.55)] sm:text-xl">
            Sý Learning gives every striving reader a Personal AI Reading Buddy — voice-first, dialect-aware, and grounded in published reading research. Built for grades 3-8.
          </p>
          <div className="relative z-10 mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
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
                <LessonPreview />
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
