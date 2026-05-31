import type { DiagnosticResultsViewModel } from "./types";
import { ConfidenceEvidence } from "./ConfidenceEvidence";
import { DecodingEvidenceCards } from "./DecodingEvidenceCards";
import { FirstLessonRecommendation } from "./FirstLessonRecommendation";
import { ImplementationNotesAdult } from "./ImplementationNotesAdult";
import { ListeningVsReadingCard } from "./ListeningVsReadingCard";
import { ParentFriendlySummary } from "./ParentFriendlySummary";
import { PlacementHeader } from "./PlacementHeader";
import { StrandPriorityRanking } from "./StrandPriorityRanking";
import { WhyThisPlacementSection } from "./WhyThisPlacementSection";

export function DiagnosticResultsCard({
  result,
  audience,
}: {
  result: DiagnosticResultsViewModel | null;
  audience: "tutor" | "parent";
}) {
  if (!result) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">No diagnostic yet</h1>
        <p className="mt-3 text-slate-700">
          {audience === "tutor"
            ? "Have your student open Reading Buddy and start the diagnostic."
            : "Have your child open Reading Buddy and start the diagnostic."}
        </p>
      </section>
    );
  }
  return (
    <div className="space-y-5">
      <PlacementHeader result={result} />
      <WhyThisPlacementSection result={result} />
      <DecodingEvidenceCards result={result} />
      <StrandPriorityRanking result={result} />
      <ListeningVsReadingCard result={result} />
      <ConfidenceEvidence result={result} />
      <FirstLessonRecommendation result={result} />
      <ParentFriendlySummary result={result} />
      <ImplementationNotesAdult result={result} />
    </div>
  );
}
