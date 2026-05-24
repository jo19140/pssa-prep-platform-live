export function VoiceConsentExplainerCard() {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <h2 className="text-lg font-black">Voice consent has two separate tiers</h2>
      <p className="mt-2">
        Reading Buddy keeps service recordings for up to 90 days by default so families can replay sessions and the program can give feedback.
        Training-corpus use is separate and stays off unless a parent explicitly opts in.
      </p>
      <p className="mt-2 font-semibold">We never sell, share, or publish recordings, and filenames use opaque IDs instead of names or emails.</p>
    </section>
  );
}
