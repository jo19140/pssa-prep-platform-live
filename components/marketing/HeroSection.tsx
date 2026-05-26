import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#00001b] text-white">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/branding/sy-learning-hero-waves-v2.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 z-[4] h-40 bg-gradient-to-b from-transparent to-[#f7f2ff]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="relative max-w-3xl lg:pl-24 lg:pt-12">
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
      </div>
    </section>
  );
}
