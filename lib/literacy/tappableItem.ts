export type TappableItem = {
  id: string;
  label: string;
  helper: string;
  utterance: string;
};

export function buildDemoPairItems(
  pair: { before: string; after: string; pairIndex: number },
  helpers: { beforeHelper: string; afterHelper: string },
): TappableItem[] {
  if (!pair.before.trim()) throw new Error("Demo pair before word is required.");
  if (!pair.after.trim()) throw new Error("Demo pair after word is required.");
  return [
    {
      id: `demo:${pair.pairIndex}:before`,
      label: pair.before,
      helper: helpers.beforeHelper,
      utterance: `${pair.before}.`,
    },
    {
      id: `demo:${pair.pairIndex}:after`,
      label: pair.after,
      helper: helpers.afterHelper,
      utterance: `${pair.after}.`,
    },
  ];
}
