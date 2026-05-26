import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

const differentiators = [
  "Voice-first AI Buddy reads with your students",
  "Dialect-aware fluency scoring - fair to every child",
  "Phonogram-based lessons grounded in published research",
];

export default function LoginPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-synesis-ink"
      style={{
        backgroundImage: "url('/branding/sy-learning-login-background-v1.png'), linear-gradient(180deg, #00001b 0%, #0b0638 24%, #5b21b6 44%, #d8ccff 70%, #f7f2ff 86%, #fffdf7 100%)",
        backgroundPosition: "top center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "100% auto, 100% 100%",
      }}
    >
      <header className="sy-login-fade-in h-6 w-full sm:h-8 lg:h-10" aria-hidden="true" />

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-10 pt-4 sm:px-6 lg:pt-6">
        <section className="sy-login-fade-in max-w-4xl text-center">
          <h1 className="font-display text-4xl font-black tracking-normal text-white drop-shadow-[0_4px_18px_rgba(0,0,27,0.65)] sm:text-5xl">
            Reading practice that listens.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-7 text-indigo-100 drop-shadow-[0_2px_10px_rgba(0,0,27,0.55)] sm:text-xl">
            AI reading practice that meets every child where they are - built for striving readers in grades 3-8.
          </p>
          <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
            {differentiators.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/75 p-4 shadow-lg shadow-indigo-950/10 backdrop-blur-md">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-synesis-warmth text-white">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                <p className="text-sm font-semibold leading-6 text-synesis-ink">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 w-full max-w-[440px]" aria-label="Account access">
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
