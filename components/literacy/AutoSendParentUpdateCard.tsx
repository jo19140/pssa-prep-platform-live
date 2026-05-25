export function AutoSendParentUpdateCard({ latestOutcome }: { latestOutcome?: any }) {
  const hasComputedEvidence = Boolean(latestOutcome);
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-900">Parent update ready</p>
      <p className="mt-1 text-sm text-emerald-800">
        {hasComputedEvidence
          ? `Latest evidence: ${latestOutcome.outcomeLabel || latestOutcome.outcomeType}. The next update will use current Reading Buddy outcomes.`
          : "Your reader is building their literacy profile. The first update will appear after outcome evidence is computed."}
      </p>
    </div>
  );
}
