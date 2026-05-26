import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

const differentiators = [
  "Voice-first AI Buddy reads with your students",
  "Dialect-aware fluency scoring - fair to every child",
  "Phonogram-based lessons grounded in published research",
];

export default function LoginPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,_#00001b_0%,_#0b0638_24%,_#5b21b6_44%,_#d8ccff_70%,_#f7f2ff_86%,_#fffdf7_100%)] text-synesis-ink">
      <header className="sy-login-fade-in h-[118px] w-full overflow-hidden bg-[#00001b] sm:h-[150px] lg:h-[220px]">
        <Image
          src="/branding/sy-learning-header-center-locked-2048.png"
          alt="Sý Learning"
          width={2048}
          height={512}
          className="h-full w-full scale-[1.08] object-cover"
          priority
        />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-10 pt-8 sm:px-6 lg:pt-10">
        <section className="sy-login-fade-in max-w-4xl text-center">
          <h1 className="font-display text-4xl font-black tracking-normal text-white sm:text-5xl">
            Reading practice that listens.
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base font-medium leading-7 text-indigo-100 sm:text-xl">
            AI reading practice that meets every child where they are - built for striving readers in grades 3-8.
          </p>
          <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
            {differentiators.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/75 p-4 shadow-lg shadow-indigo-950/10 backdrop-blur-md">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-synesis-warmth text-white">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                <p className="text-sm font-semibold leading-6 text-synesis-ink">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm font-bold text-indigo-950/80">
            COPPA-compliant. Built for Pennsylvania teachers and tutors.
          </p>
        </section>

        <section className="mt-9 w-full max-w-[440px]" aria-label="Account access">
          <LoginForm />
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 px-6 pb-8 text-xs font-semibold text-indigo-950/65">
        <Link href="/legal/privacy" className="hover:text-synesis-ink">
          Privacy Policy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/terms" className="hover:text-synesis-ink">
          Terms of Service
        </Link>
        <span aria-hidden="true">·</span>
        <a href="mailto:privacy@sylearning.com" className="hover:text-synesis-ink">
          Contact
        </a>
      </footer>
    </div>
  );
}
