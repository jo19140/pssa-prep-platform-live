import Image from "next/image";
import Link from "next/link";

const roles = [
  { label: "Listens as your child reads aloud", tone: "bg-[#efe7ff] text-[#5f3fb3]" },
  { label: "Helps decode tricky words", tone: "bg-[#e8ddff] text-[#5f3fb3]" },
  { label: "Teaches the next sound pattern", tone: "bg-[#f2eaff] text-[#5f3fb3]" },
  { label: "Adapts tomorrow's practice", tone: "bg-[#fff2c7] text-[#9a6300]" },
  { label: "Sends you a simple parent update", tone: "bg-[#ffe8b8] text-[#9a6300]" },
];

export function MeetHarperSection() {
  return (
    <section className="bg-[#faf8f3] px-4 py-16 text-synesis-ink sm:px-6 sm:py-20 lg:px-8" aria-labelledby="meet-harper-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full border border-[#ded4f4] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-synesis-primary shadow-sm">
            MEET HARPER
          </p>
          <h2 id="meet-harper-heading" className="mt-5 font-display text-4xl font-black tracking-normal text-synesis-ink sm:text-5xl">
            Read with Harper. Confidence grows.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8 text-synesis-body">
            Harper listens as your child reads aloud, helps decode tricky words, and gives the next right practice — one read-aloud at a time.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="relative flex justify-center">
            <div className="absolute inset-x-8 top-10 h-56 rounded-full bg-[radial-gradient(circle,rgba(194,166,255,0.5)_0%,rgba(194,166,255,0.26)_42%,rgba(250,248,243,0)_72%)] blur-xl sm:inset-x-14 sm:h-72" aria-hidden="true" />
            <Image
              src="/branding/harper-character-v1.png"
              alt="Harper, the Sý Learning reading buddy, holding a book."
              width={974}
              height={1400}
              className="relative z-10 h-auto w-full max-w-[250px] object-contain sm:max-w-[300px] lg:max-w-[340px]"
              sizes="(min-width: 1024px) 340px, (min-width: 640px) 300px, 250px"
            />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-synesis-primary">HARPER&apos;S ROLE</p>
            <ol className="mt-5 grid gap-4">
              {roles.map((role, index) => (
                <li key={role.label} className="flex items-center gap-4 rounded-lg bg-white/70 p-3 shadow-sm shadow-slate-200/60">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${role.tone}`} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="text-base font-extrabold leading-6 text-synesis-ink">{role.label}</span>
                </li>
              ))}
            </ol>

            <figure className="mt-6 rounded-lg border-l-4 border-[#f3b63f] bg-white p-5 shadow-sm shadow-slate-200/70">
              <blockquote className="text-lg font-black leading-8 text-synesis-ink">
                &quot;I&apos;m here to help you read with confidence. We&apos;ll take it one sound, one word, one story at a time.&quot;
              </blockquote>
            </figure>

            <div className="mt-7">
              <Link href="/signup" className="inline-flex rounded-full bg-synesis-primary px-6 py-3.5 text-base font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-synesis-primaryDark">
                Start reading with Harper
              </Link>
              <p className="mt-3 text-sm font-bold text-synesis-body">Free for 14 days · No credit card required</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
