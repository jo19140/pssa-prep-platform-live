export const PRESENTATION_PROFILES = ["BAND_K_3", "BAND_4_6", "BAND_7_8"] as const;

export type PresentationProfile = typeof PRESENTATION_PROFILES[number];

export function normalizePresentationProfile(presentationProfile?: PresentationProfile | null): PresentationProfile {
  return presentationProfile ?? "BAND_K_3";
}
