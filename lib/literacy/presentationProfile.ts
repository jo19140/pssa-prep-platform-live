export type PresentationProfile = "BAND_K_3" | "BAND_4_6" | "BAND_7_8";

export function presentationProfileForGrade(grade: number | null | undefined): PresentationProfile {
  if (typeof grade !== "number" || !Number.isFinite(grade)) return "BAND_K_3";
  if (grade <= 3) return "BAND_K_3";
  if (grade <= 6) return "BAND_4_6";
  return "BAND_7_8";
}
