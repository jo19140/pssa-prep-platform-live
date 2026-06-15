import type { DailyTargetSeed } from "@/lib/content/phase3EntrySeed";
import { CONTENT_V3_DAILY_TARGETS, PHASE_3_ENTRY } from "@/lib/content/phase3EntrySeed";
import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { auditPassage, type PassageAuditResult } from "@/lib/literacy/passageAudit";
import { canonicalPseudowordsForTargetPatterns, generateLessonDraft } from "@/lib/literacy/lessonGenerator";
import type { GeneratedLessonDraft } from "@/lib/literacy/lessonAudit";
import { morphologyConfigFromTargetPatternsJson } from "@/lib/literacy/morphologyAnalyzer";
import type { PresentationProfile } from "@/lib/literacy/presentationProfile";
import type { GeneratedLessonPart, LessonGeneratorContext } from "@/lib/literacy/lessonParts/types";

export type LessonPlayerPart = Pick<
  GeneratedLessonPart,
  "partNumber" | "partLabel" | "partType" | "kidVisibleCopy" | "contentJson" | "studentDisplayMode" | "responseMode"
>;

export type EnabledLessonPlayerData = {
  enabled: true;
  targetCode: string;
  trainingCaptureEnabled: boolean;
  presentationProfile: PresentationProfile;
  studentUserId?: string;
  title: string;
  dailyTargetLabel: string;
  parts: LessonPlayerPart[];
};

export type DisabledLessonPlayerData = {
  enabled: false;
  targetCode: string;
  presentationProfile: PresentationProfile;
  disabledReason: string;
};

export type LessonPlayerData = EnabledLessonPlayerData | DisabledLessonPlayerData;

type LessonPlayerBuildOptions = { trainingCaptureEnabled?: boolean; studentUserId?: string; presentationProfile?: PresentationProfile };

export type LessonPlayerDraftBuild = {
  playerData: LessonPlayerData;
  draft: GeneratedLessonDraft | null;
  selectedPassageAudit: PassageAuditResult | null;
};

export async function buildLessonPlayerData(
  targetCode = "a_e",
  options: LessonPlayerBuildOptions = {},
): Promise<LessonPlayerData> {
  return (await buildLessonPlayerDraftData(targetCode, options)).playerData;
}

export async function buildLessonPlayerDraftData(
  targetCode = "a_e",
  options: LessonPlayerBuildOptions = {},
): Promise<LessonPlayerDraftBuild> {
  const presentationProfile = options.presentationProfile ?? "BAND_K_3";
  if (targetCode !== "a_e") {
    return {
      draft: null,
      selectedPassageAudit: null,
      playerData: {
        enabled: false,
        targetCode,
        presentationProfile,
        disabledReason: "Only the approved a_e lesson has kid-facing rule copy in this slice.",
      },
    };
  }

  const seed = CONTENT_V3_DAILY_TARGETS.find((target) => target.code === targetCode);
  if (!seed) {
    return {
      draft: null,
      selectedPassageAudit: null,
      playerData: { enabled: false, targetCode, presentationProfile, disabledReason: "Lesson seed was not found." },
    };
  }

  const content = phase3EntryLessonContentFor(targetCode, presentationProfile);
  if (!content.kidRuleStatement || !content.reteachPrompt) {
    return {
      draft: null,
      selectedPassageAudit: null,
      playerData: {
        enabled: false,
        targetCode,
        presentationProfile,
        disabledReason: "Kid-facing rule copy is required before this lesson can be shown.",
      },
    };
  }

  const phasePosition = {
    id: "phase-3-entry-player",
    phaseNumber: PHASE_3_ENTRY.phaseNumber,
    label: PHASE_3_ENTRY.label,
  };
  const dailyTarget = dailyTargetFromSeed(seed);
  const targetPatterns = targetPatternsFromSeed(seed);
  const pseudowordPatterns = pseudowordPatternsFromSeed(seed, targetPatterns);
  const morphology = morphologyConfigFromTargetPatternsJson(seed.targetPatternsJson);
  const heartWords = [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown];
  const selectedPassageAudit = auditPassage(content.mockPassageText, {
    phasePosition,
    dailyTarget,
    heartWords,
    vocabularyAllowlist: content.vocabulary,
  });

  const ctx: LessonGeneratorContext = {
    phasePosition,
    presentationProfile,
    dailyTarget,
    targetPattern: seed.code,
    targetPatterns,
    pseudowordPatterns,
    targetWords: seed.exampleWords.slice(0, 5),
    reviewWords: content.reviewWords ?? [],
    pseudowords: canonicalPseudowordsForTargetPatterns(
      seed.code,
      seed.exampleNonwords,
      targetPatterns,
      "content-v3 lesson seed",
      pseudowordPatterns,
      { allowNoPseudowords: morphology?.rule === "compare" },
    ),
    heartWordsPreviewedThisLesson: content.heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown: content.heartWordsAssumedKnown,
    vocabularyWords: content.vocabulary,
    selectedPassage: {
      id: "a-e-player-mock-passage",
      text: content.mockPassageText,
      contentAuditJson: selectedPassageAudit as any,
      decodabilityScore: selectedPassageAudit.decodabilityScore,
    },
    selectedPassageAudit,
  };

  const draft = await generateLessonDraft(ctx, {
    recordDecision: async (_context, run) => {
      const result = await run();
      return result.output;
    },
  });

  return {
    draft,
    selectedPassageAudit,
    playerData: {
      enabled: true,
      targetCode,
      trainingCaptureEnabled: options.trainingCaptureEnabled === true,
      presentationProfile,
      studentUserId: options.studentUserId,
      title: `${content.mockPassageTitle} Lesson`,
      dailyTargetLabel: seed.kidVisibleLabel,
      parts: draft.parts.map((part) => ({
        partNumber: part.partNumber,
        partLabel: part.partLabel,
        partType: part.partType,
        kidVisibleCopy: part.kidVisibleCopy,
        contentJson: part.contentJson,
        studentDisplayMode: part.studentDisplayMode,
        responseMode: part.responseMode,
      })),
    },
  };
}

function dailyTargetFromSeed(seed: DailyTargetSeed): LessonGeneratorContext["dailyTarget"] {
  return {
    id: `seed-${seed.code}`,
    code: seed.code,
    kidVisibleLabel: seed.kidVisibleLabel,
    tutorLabel: seed.tutorLabel,
    targetPatternsJson: seed.targetPatternsJson as LessonGeneratorContext["dailyTarget"]["targetPatternsJson"],
    allowedPatternCodes: seed.allowedPatternCodes,
    blockedPatternCodes: seed.blockedPatternCodes,
    exampleWords: seed.exampleWords,
    exampleNonwords: seed.exampleNonwords,
  };
}

function targetPatternsFromSeed(seed: DailyTargetSeed) {
  const patterns = jsonStringArray(seed.targetPatternsJson, "patterns");
  return patterns.length ? patterns : [seed.code];
}

function pseudowordPatternsFromSeed(seed: DailyTargetSeed, fallback: string[]) {
  const patterns = jsonStringArray(seed.targetPatternsJson, "pseudowordPatterns");
  return patterns.length ? patterns : fallback;
}

function jsonStringArray(json: unknown, key: string) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const value = (json as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
