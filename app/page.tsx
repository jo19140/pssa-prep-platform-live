import { DifferentiatorGrid } from "@/components/marketing/DifferentiatorGrid";
import { FinalCTASection } from "@/components/marketing/FinalCTASection";
import { HeroSection } from "@/components/marketing/HeroSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PlatformFeatures } from "@/components/marketing/PlatformFeatures";
import { ResearchTrustSection } from "@/components/marketing/ResearchTrustSection";
import { StatsBar } from "@/components/marketing/StatsBar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <main>
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <PlatformFeatures />
        <DifferentiatorGrid />
        <ResearchTrustSection />
        <FinalCTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
