import type { PresentationProfile } from "./presentationProfile";

export type LessonPlayerMode = "scroll" | "stepper";

/**
 * PR-B is a shell / walking-skeleton PR. Do NOT run a real student pilot on PR-B alone.
 * The Yohanna / real-mic pilot stays BLOCKED until PR-C restores the real read-aloud,
 * capture, spelling, and tap-to-hear interactions.
 */
export function lessonPlayerModeFor(profile: PresentationProfile | undefined): LessonPlayerMode {
  return profile === "BAND_7_8" ? "stepper" : "scroll";
}
