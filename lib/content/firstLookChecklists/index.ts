export type FirstLookArtifactType = "DIAGNOSTIC_ITEM" | "LESSON_PART" | "PASSAGE";

export type CheckSeverity = "BLOCKER" | "WARNING" | "INFO";

export type CheckDefinition = {
  requirementId: string;
  severity: CheckSeverity;
  requirement: string;
};

export type FirstLookChecklist = {
  key: string;
  version: string;
  artifactType: FirstLookArtifactType;
  items: CheckDefinition[];
};

import { comprehensionDiagnosticChecklist } from "./diagnosticItem/comprehension";
import { decodingDiagnosticChecklist } from "./diagnosticItem/decoding";
import { fluencyDiagnosticChecklist } from "./diagnosticItem/fluency";
import { morphologyDiagnosticChecklist } from "./diagnosticItem/morphology";
import { paDiagnosticChecklist } from "./diagnosticItem/pa";
import { vocabularyDiagnosticChecklist } from "./diagnosticItem/vocabulary";
import { passageFirstLookChecklist } from "./passage/passage";

const lessonPartChecklist: FirstLookChecklist = {
  key: "content-v3-lesson-part-first-look",
  version: "2026-05-27",
  artifactType: "LESSON_PART",
  items: [
    check("NO_KID_METADATA", "BLOCKER", "Kid-visible copy passes the content-v3 kid-view linter: no phoneme notation, no internal codes, no curriculum metadata."),
    check("NO_INTERNAL_LABELS", "BLOCKER", "Kid-visible copy contains no phase/position codes, framework codes, review-status labels, item counters, scoring labels, or design notes."),
    check("PART1_NO_TARGET_PATTERN", "WARNING", "Part 1 contains zero instances of today's daily target pattern."),
    check("PART3_CONTRASTIVE_STRUCTURE", "BLOCKER", "Part 3 word lines follow contrastive structure: closed review, contrast, target, pseudoword."),
    check("PART3_PSEUDOWORD_CLEAN", "BLOCKER", "Part 3 pseudowords use today's one specific target pattern and do not resemble real-word misspellings."),
    check("HEART_WORD_PREVIEW_MATCH", "WARNING", "Part 4 heart-word previews match the heart words used in the connected text."),
    check("DICTATION_TARGET_REVIEW", "WARNING", "Part 6 dictation includes target words and prerequisite review."),
    check("OPEN_ENDED_DISCUSSION", "INFO", "Part 8 questions are open-ended and discussion-oriented, not yes/no."),
    check("TUTOR_COPY_SEPARATED", "BLOCKER", "Tutor-visible notes are separated from kid-visible copy."),
  ],
};

const diagnosticChecklistByStrand: Record<string, FirstLookChecklist> = {
  PA: paDiagnosticChecklist,
  PHONEMIC_AWARENESS: paDiagnosticChecklist,
  DECODING: decodingDiagnosticChecklist,
  MORPHOLOGY: morphologyDiagnosticChecklist,
  FLUENCY: fluencyDiagnosticChecklist,
  VOCABULARY: vocabularyDiagnosticChecklist,
  COMPREHENSION: comprehensionDiagnosticChecklist,
};

export function checklistForArtifact(artifactTypeOrArtifact: FirstLookArtifactType | { artifactType: FirstLookArtifactType; metadata?: Record<string, unknown>; contentForReview?: unknown }) {
  const artifactType = typeof artifactTypeOrArtifact === "string" ? artifactTypeOrArtifact : artifactTypeOrArtifact.artifactType;
  if (artifactType === "LESSON_PART") return lessonPartChecklist;
  if (artifactType === "PASSAGE") return passageFirstLookChecklist;

  const metadata = typeof artifactTypeOrArtifact === "string" ? {} : artifactTypeOrArtifact.metadata || {};
  const content = typeof artifactTypeOrArtifact === "string" || !artifactTypeOrArtifact.contentForReview || typeof artifactTypeOrArtifact.contentForReview !== "object"
    ? {}
    : artifactTypeOrArtifact.contentForReview as Record<string, unknown>;
  const strand = String(metadata.strand || content.strand || "").toUpperCase();
  return diagnosticChecklistByStrand[strand] || decodingDiagnosticChecklist;
}

export function check(requirementId: string, severity: CheckSeverity, requirement: string): CheckDefinition {
  return { requirementId, severity, requirement };
}
