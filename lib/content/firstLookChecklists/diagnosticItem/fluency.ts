import { check, type FirstLookChecklist } from "../index";

export const fluencyDiagnosticChecklist: FirstLookChecklist = {
  key: "content-v3-diagnostic-item-fluency-first-look",
  version: "2026-05-27",
  artifactType: "DIAGNOSTIC_ITEM",
  items: [
    check("FLUENCY_SHORT_READABLE_UNIT", "BLOCKER", "Kid view presents a short phrase or sentence suitable for fluency timing without showing a timer."),
    check("FLUENCY_LATENCY_BACKEND_ONLY", "BLOCKER", "Latency thresholds are backend scoring data only and are not visible in studentPromptJson."),
    check("FLUENCY_PATTERN_APPROPRIATE", "WARNING", "Words are within the target/prerequisite patterns and do not dilute the daily target."),
    check("FLUENCY_SCORING_ALIASES", "WARNING", "Expected response allows reasonable speech transcript variants where appropriate."),
    check("FLUENCY_NO_KID_METADATA", "BLOCKER", "Kid-visible copy contains no phase codes, item counters, timer labels, scoring jargon, or phoneme notation."),
  ],
};
