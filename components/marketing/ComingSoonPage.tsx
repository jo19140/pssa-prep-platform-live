import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[#f7f2ff] text-synesis-ink">
      <MarketingHeader />
      <main className="mx-auto flex min-h-[58vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="rounded-full bg-white px-4 py-2 text-sm font-black text-synesis-primary shadow-sm">Coming soon</p>
        <h1 className="mt-6 font-display text-5xl font-black tracking-normal">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-synesis-body">
          We are shaping this page for the pilot audience now. In the meantime, you can start from the homepage or contact the Sý Learning team.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
