import { EhriPhaseBadge } from "@/components/literacy/EhriPhaseBadge";
import { LiteracyStrandPanel } from "@/components/literacy/LiteracyStrandPanel";
import { PhonogramMasteryGrid } from "@/components/literacy/PhonogramMasteryGrid";
import { SyllableTypeGrid } from "@/components/literacy/SyllableTypeGrid";
import { AutopilotDecisionFeed } from "@/components/literacy/AutopilotDecisionFeed";

export function StudentLiteracyProfile({ profile }: { profile: any }) {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Student literacy profile</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{profile?.student?.name || "Student"}</h1>
        {profile ? <div className="mt-4"><EhriPhaseBadge phase={profile.ehriPhase} confidence={profile.ehriPhaseConfidence} /></div> : null}
      </div>
      <LiteracyStrandPanel scores={profile?.strandScores || []} />
      <SyllableTypeGrid records={profile?.syllableTypeMastery || []} />
      <PhonogramMasteryGrid records={profile?.phonogramMastery || []} />
      <AutopilotDecisionFeed decisions={profile?.autopilotDecisions || []} />
    </main>
  );
}
