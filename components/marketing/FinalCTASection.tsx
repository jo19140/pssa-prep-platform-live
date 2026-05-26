import Link from "next/link";

export function FinalCTASection() {
  return (
    <section className="bg-[#00001b] px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-4xl font-black tracking-normal sm:text-5xl">Ready to give every reader what they deserve?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-indigo-100">
          Start your 14-day free trial. No credit card. Pilot launching with Pennsylvania tutors Spring 2026.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/signup" className="rounded-full bg-white px-7 py-4 font-black text-synesis-primary shadow-xl shadow-black/20">
            Start Free for 14 Days
          </Link>
          <Link href="/contact" className="font-black text-white underline-offset-4 hover:underline">
            Talk to our team
          </Link>
        </div>
      </div>
    </section>
  );
}
