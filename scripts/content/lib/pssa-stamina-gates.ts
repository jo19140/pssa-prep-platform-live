import {
  isPssaFigureFeature,
  validatePssaFigureFeatureShared,
  validateUniquePssaFigureFeatureIds,
  type PssaFigureFeature,
} from "../../../lib/content/pssaFigureFeature";

export type StaminaGateStatus = "PASS" | "FAIL" | "SKIP";

export const PSSA_STAMINA_GATE_IDS = [
  "PSSA_ITEM_FOOTNOTE_GIVEAWAY",
  "PSSA_DOMAIN_FACT_CHECK_REQUIRED",
  "PSSA_TEXT_FEATURE_INTEGRITY",
  "PSSA_TEXT_FEATURE_ITEM_LINK",
  "PSSA_PASSAGE_STAMINA_METADATA",
  "PSSA_SECTION_LOOKBACK_BALANCE",
] as const;

export type PssaStaminaGateId = typeof PSSA_STAMINA_GATE_IDS[number];

export type StaminaTextFeature = {
  type: string;
  label?: string;
  bodyText?: string;
  featureText?: string;
  sectionId?: string;
  charBounds?: { startChar: number; endChar: number };
  term?: string;
  marker?: string;
  decorative?: boolean;
  context_only?: boolean;
  mustUseInItem?: boolean;
  linkedByItemIds?: string[];
} | PssaFigureFeature;

export type StaminaPassageInput = {
  id: string;
  title?: string;
  text: string;
  wordCount?: number | null;
  staminaBand?: string | null;
  genre?: string | null;
  pov?: string | null;
  domainVocabularyLoad?: string | null;
  textFeaturesJson?: StaminaTextFeature[] | null;
  factCheckNotesJson?: unknown;
  factCheckRequired?: boolean | null;
};

export type StaminaItemInput = {
  id?: string;
  itemId?: string;
  passageId?: string | null;
  eligibleContent?: string | null;
  itemType?: string | null;
  interactionType?: string | null;
  studentFacingPrompt?: string | null;
  stem?: string | null;
  prompt?: string | null;
  targetWordOrPhrase?: string | null;
  testsApplicationNotDefinition?: boolean | null;
  structuredChoicesJson?: Array<{
    text: string;
    isCorrect?: boolean;
    rationale?: string;
    evidenceLinks?: StaminaEvidenceLink[];
    distractorRole?: string | null;
  }> | null;
};

export type StaminaEvidenceLink = {
  evidenceKind?: string;
  sectionId?: string;
  sceneId?: string;
  lineIndex?: number;
  speaker?: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  quotedSpan?: string;
  startChar?: number;
  endChar?: number;
};

export type StaminaGateRow = {
  gateId: PssaStaminaGateId;
  targetId: string;
  status: StaminaGateStatus;
  detail: string;
};

type SectionRow = {
  sectionId: string;
  label: string;
  startChar: number;
  endChar: number;
  text: string;
};

function itemId(item: StaminaItemInput) {
  return String(item.itemId ?? item.id ?? "");
}

function interactionType(item: StaminaItemInput) {
  return String(item.interactionType ?? item.itemType ?? "");
}

function isStaminaPassage(passage: StaminaPassageInput) {
  return passage.staminaBand === "released_length";
}

function isStaminaScoped(passage: StaminaPassageInput) {
  return isStaminaPassage(passage) || passage.factCheckRequired === true || featureRows(passage).length > 0;
}

function genre(passage: StaminaPassageInput) {
  return String(passage.genre ?? "").toLowerCase();
}

function isInformationalGenre(passage: StaminaPassageInput) {
  const value = genre(passage);
  return value.startsWith("informational_") || value === "paired_informational";
}

function isLiteraryGenre(passage: StaminaPassageInput) {
  return genre(passage) === "literary_narrative";
}

function isDramaGenre(passage: StaminaPassageInput) {
  return genre(passage) === "drama";
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function wordCount(text: string) {
  return normalizeText(text).split(" ").filter(Boolean).length;
}

function slug(value: string) {
  return normalizeText(value).replace(/\s+/g, "_");
}

export function pssaStaminaSectionIdForHeading(heading: string) {
  return slug(heading);
}

export function buildPssaStaminaSectionMap(passage: StaminaPassageInput): SectionRow[] {
  if (isDramaGenre(passage)) return buildDramaSceneSectionMap(passage);
  if (isLiteraryGenre(passage)) return buildParagraphSectionMap(passage);
  const text = passage.text;
  const headingPattern = /^###\s+(.+)$/gm;
  const headings = [...text.matchAll(headingPattern)].map((match) => ({
    label: match[1].trim(),
    start: match.index ?? 0,
    bodyStart: (match.index ?? 0) + match[0].length,
  }));
  const sections: SectionRow[] = [];
  if (!headings.length) {
    sections.push({ sectionId: "section_0_intro", label: "Intro", startChar: 0, endChar: text.length, text });
  } else {
    const introText = text.slice(0, headings[0].start).trim();
    if (introText) {
      sections.push({
        sectionId: "section_0_intro",
        label: "Intro",
        startChar: 0,
        endChar: headings[0].start,
        text: text.slice(0, headings[0].start),
      });
    }
    headings.forEach((heading, index) => {
      const end = headings[index + 1]?.start ?? text.length;
      sections.push({
        sectionId: pssaStaminaSectionIdForHeading(heading.label),
        label: heading.label,
        startChar: heading.start,
        endChar: end,
        text: text.slice(heading.bodyStart, end),
      });
    });
  }
  const features = Array.isArray(passage.textFeaturesJson) ? passage.textFeaturesJson : [];
  if (features.some((feature) => feature.type === "sidebar")) {
    sections.push({
      sectionId: "section_sidebar",
      label: "Sidebar",
      startChar: featureStart(features, "sidebar"),
      endChar: featureEnd(features, "sidebar"),
      text: features.filter((feature) => feature.type === "sidebar").map((feature) => feature.bodyText ?? "").join("\n"),
    });
  }
  if (features.some((feature) => feature.type === "footnote")) {
    sections.push({
      sectionId: "section_footnotes",
      label: "Footnotes",
      startChar: featureStart(features, "footnote"),
      endChar: featureEnd(features, "footnote"),
      text: features.filter((feature) => feature.type === "footnote").map((feature) => feature.bodyText ?? "").join("\n"),
    });
  }
  return sections;
}

export function buildPssaDramaLineMap(passage: StaminaPassageInput) {
  const scenes = buildDramaSceneSectionMap(passage).filter((section) => section.sectionId !== "front_matter");
  return scenes.flatMap((scene) => {
    const lines = scene.text.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines
      .filter((line) => !/^##?\s*SCENE\s+\d+/i.test(line))
      .map((text, lineIndex) => {
        const spoken = text.match(/^([A-Z][A-Z\s'-]*):\s*(.+)$/);
        return {
          sceneId: scene.sectionId,
          lineIndex,
          speaker: spoken?.[1]?.trim(),
          text,
          evidenceKind: spoken ? "spoken_line" : "stage_direction",
        };
      });
  });
}

export function pssaDramaEvidenceKey(link: StaminaEvidenceLink) {
  if (!link.sceneId || !Number.isInteger(link.lineIndex)) return "";
  return `${link.sceneId}:${link.lineIndex}`;
}

function buildDramaSceneSectionMap(passage: StaminaPassageInput): SectionRow[] {
  const text = passage.text;
  const scenePattern = /^#{0,2}\s*SCENE\s+(\d+)\b.*$/gim;
  const markers = [...text.matchAll(scenePattern)].map((match) => ({
    label: match[0].trim().replace(/^#+\s*/, ""),
    number: Number(match[1]),
    start: match.index ?? 0,
    bodyStart: (match.index ?? 0) + match[0].length,
  }));
  const rows: SectionRow[] = [];
  if (!markers.length) {
    return [{ sectionId: "front_matter", label: "Front Matter", startChar: 0, endChar: text.length, text }];
  }
  const frontMatter = text.slice(0, markers[0].start);
  if (frontMatter.trim()) {
    rows.push({ sectionId: "front_matter", label: "Front Matter", startChar: 0, endChar: markers[0].start, text: frontMatter });
  }
  markers.forEach((marker, index) => {
    const end = markers[index + 1]?.start ?? text.length;
    rows.push({
      sectionId: `scene_${String(marker.number).padStart(2, "0")}`,
      label: marker.label,
      startChar: marker.start,
      endChar: end,
      text: text.slice(marker.start, end),
    });
  });
  return rows;
}

function buildParagraphSectionMap(passage: StaminaPassageInput): SectionRow[] {
  const rows: SectionRow[] = [];
  const matches = [...passage.text.matchAll(/(?:^|\n\n)([^\n][\s\S]*?)(?=\n\n|$)/g)];
  matches.forEach((match, index) => {
    const text = match[1];
    const startChar = (match.index ?? 0) + (match[0].startsWith("\n\n") ? 2 : 0);
    rows.push({
      sectionId: `paragraph_${String(index + 1).padStart(2, "0")}`,
      label: `Paragraph ${index + 1}`,
      startChar,
      endChar: startChar + text.length,
      text,
    });
  });
  return rows;
}

function featureStart(features: StaminaTextFeature[], type: string) {
  return Math.min(...features.filter((feature) => feature.type === type).map((feature) => feature.charBounds?.startChar ?? 0));
}

function featureEnd(features: StaminaTextFeature[], type: string) {
  return Math.max(...features.filter((feature) => feature.type === type).map((feature) => feature.charBounds?.endChar ?? 0));
}

function featureRows(passage: StaminaPassageInput) {
  return Array.isArray(passage.textFeaturesJson) ? passage.textFeaturesJson : [];
}

function activeFeatures(passage: StaminaPassageInput) {
  return featureRows(passage).filter((feature) => !feature.decorative && !feature.context_only);
}

function visibleFootnoteTerms(passage: StaminaPassageInput) {
  return featureRows(passage)
    .filter((feature) => feature.type === "footnote")
    .map((feature) => normalizeText(String(feature.term ?? feature.label ?? "")))
    .filter(Boolean);
}

function asksDefinition(item: StaminaItemInput) {
  const prompt = String(item.studentFacingPrompt ?? item.stem ?? item.prompt ?? "");
  return /\bwhat does\b.+\bmean\b/i.test(prompt)
    || /\bmeaning\b/i.test(prompt)
    || /\bdefinition\b/i.test(prompt)
    || /\bmeans\b/i.test(prompt);
}

export function evaluatePssaItemFootnoteGiveaway(item: StaminaItemInput, passage: StaminaPassageInput): StaminaGateStatus {
  const terms = visibleFootnoteTerms(passage);
  if (!terms.length) return "PASS";
  if (!String(item.eligibleContent ?? "").includes("-V.")) return "PASS";
  const target = normalizeText(String(item.targetWordOrPhrase ?? ""));
  if (!target) return "FAIL";
  if (terms.includes(target) && asksDefinition(item) && !item.testsApplicationNotDefinition) return "FAIL";
  return "PASS";
}

export function evaluatePssaDomainFactCheckRequired(passage: StaminaPassageInput): StaminaGateStatus {
  if (!isStaminaScoped(passage)) return "SKIP";
  if (!passage.factCheckRequired && !isInformationalGenre(passage)) return "SKIP";
  const notes = Array.isArray(passage.factCheckNotesJson) ? passage.factCheckNotesJson : [];
  if (!notes.length) return "FAIL";
  return notes.every((note) => {
    const row = note as Record<string, unknown>;
    const required = ["claimId", "claim", "sourceTitle", "organization", "sourceUrl", "claimSupported", "dateAccessed"];
    if (!required.every((key) => row[key] !== undefined && row[key] !== null && String(row[key]).trim())) return false;
    if (row.claimSupported !== true) return false;
    try {
      const url = new URL(String(row.sourceUrl));
      return url.protocol === "https:" && !String(row.sourceUrl).includes("...");
    } catch {
      return false;
    }
  }) ? "PASS" : "FAIL";
}

export function evaluatePssaTextFeatureIntegrity(passage: StaminaPassageInput, items: StaminaItemInput[] = []): StaminaGateStatus {
  if (!isStaminaScoped(passage)) return "SKIP";
  const features = featureRows(passage);
  if (!features.length) return "SKIP";
  if (isDramaGenre(passage)) return evaluateDramaFeatureIntegrity(passage);
  if (isLiteraryGenre(passage)) return evaluateLiteraryFeatureIntegrity(passage);
  const headings = features.filter((feature) => feature.type === "heading");
  const headingLabels = headings.map((feature) => String(feature.label ?? "").trim()).filter(Boolean);
  if (new Set(headingLabels).size !== headingLabels.length) return "FAIL";
  for (const label of headingLabels) {
    const marker = `### ${label}`;
    const index = passage.text.indexOf(marker);
    if (index < 0) return "FAIL";
    const after = passage.text.slice(index + marker.length);
    const nextHeading = after.search(/\n###\s+/);
    const body = (nextHeading >= 0 ? after.slice(0, nextHeading) : after).trim();
    if (!body) return "FAIL";
  }

  const footnotes = features.filter((feature) => feature.type === "footnote");
  for (const footnote of footnotes) {
    const term = String(footnote.term ?? footnote.label ?? "").trim();
    const body = String(footnote.bodyText ?? "").trim();
    const marker = String(footnote.marker ?? "").trim();
    if (!term || !body) return "FAIL";
    if (marker && !passage.text.includes(marker)) return "FAIL";
    if (!normalizeText(passage.text).includes(normalizeText(term))) return "FAIL";
  }

  for (const sidebar of features.filter((feature) => feature.type === "sidebar")) {
    if (!String(sidebar.bodyText ?? "").trim()) return "FAIL";
    const linkedByMetadata = Array.isArray(sidebar.linkedByItemIds) && sidebar.linkedByItemIds.length > 0;
    const linkedByEvidence = items.some((item) => evidenceSectionIds(item, passage).has(sidebar.sectionId ?? "section_sidebar"));
    if (!sidebar.decorative && !sidebar.context_only && !linkedByMetadata && !linkedByEvidence) return "FAIL";
  }

  for (const feature of features) {
    if (!feature.type) return "FAIL";
    if (isPssaFigureFeature(feature)) {
      try {
        validateUniquePssaFigureFeatureIds(features);
        validatePssaFigureFeatureShared(feature, buildPssaStaminaSectionMap(passage).map((section) => section.sectionId));
      } catch {
        return "FAIL";
      }
      continue;
    }
    if (feature.type === "heading" && !headingLabels.includes(String(feature.label ?? "").trim())) return "FAIL";
    if (feature.type === "sidebar" && !passage.text.includes(String(feature.bodyText ?? "").trim())) return "FAIL";
    if (feature.type === "footnote" && !passage.text.includes(String(feature.bodyText ?? "").trim())) return "FAIL";
  }
  return "PASS";
}

function evaluateDramaFeatureIntegrity(passage: StaminaPassageInput): StaminaGateStatus {
  const allowed = new Set(["cast_list", "scene_marker", "stage_direction"]);
  const sceneIds = new Set(buildPssaStaminaSectionMap(passage).map((section) => section.sectionId));
  for (const feature of featureRows(passage)) {
    if (!allowed.has(feature.type)) return "FAIL";
    if ("featureText" in feature) {
      if (typeof feature.featureText !== "string" || !feature.featureText.trim()) return "FAIL";
      if (!passage.text.includes(feature.featureText)) return "FAIL";
    }
    if (feature.type === "scene_marker" && feature.sectionId && !sceneIds.has(feature.sectionId)) return "FAIL";
    for (const key of ["mustUseInItem", "decorative", "context_only"] as const) {
      if (key in feature && typeof feature[key] !== "boolean") return "FAIL";
    }
  }
  return "PASS";
}

function evaluateLiteraryFeatureIntegrity(passage: StaminaPassageInput): StaminaGateStatus {
  const allowed = new Set(["dialogue", "figurative_language", "character_arc", "multi_scene"]);
  for (const feature of featureRows(passage)) {
    if (!allowed.has(feature.type)) return "FAIL";
    if ("featureText" in feature) {
      if (typeof feature.featureText !== "string" || !feature.featureText.trim()) return "FAIL";
      if (!passage.text.includes(feature.featureText)) return "FAIL";
    }
    for (const key of ["mustUseInItem", "decorative", "context_only"] as const) {
      if (key in feature && typeof feature[key] !== "boolean") return "FAIL";
    }
  }
  return "PASS";
}

export function evaluatePssaTextFeatureItemLink(passage: StaminaPassageInput, items: StaminaItemInput[]): StaminaGateStatus {
  if (!isStaminaScoped(passage)) return "SKIP";
  const required = activeFeatures(passage).filter((feature) => {
    if (feature.mustUseInItem) return true;
    if (isDramaGenre(passage)) return false;
    if (isLiteraryGenre(passage)) return false;
    return ["sidebar", "footnote", "diagram"].includes(feature.type);
  });
  if (!required.length) return "SKIP";
  const featureSections = new Set(required.map((feature) => feature.sectionId).filter(Boolean));
  return items.some((item) => {
    const ec = String(item.eligibleContent ?? "");
    return ec.includes("-C.2.1.2")
      || required.some((feature) => feature.linkedByItemIds?.includes(itemId(item)))
      || [...evidenceSectionIds(item, passage)].some((sectionId) => featureSections.has(sectionId));
  }) ? "PASS" : "FAIL";
}

export function evaluatePssaPassageStaminaMetadata(passage: StaminaPassageInput): StaminaGateStatus {
  if (!isStaminaPassage(passage)) return "SKIP";
  if (isDramaGenre(passage)) {
    return Number(passage.wordCount ?? wordCount(passage.text)) > 0
      && Boolean(passage.staminaBand)
      && Boolean(passage.genre)
      && featureRows(passage).length > 0
      ? "PASS"
      : "FAIL";
  }
  if (isLiteraryGenre(passage)) {
    return Number(passage.wordCount ?? wordCount(passage.text)) > 0
      && Boolean(passage.staminaBand)
      && Boolean(passage.genre)
      && Boolean(passage.pov)
      && featureRows(passage).length > 0
      ? "PASS"
      : "FAIL";
  }
  return Number(passage.wordCount ?? wordCount(passage.text)) > 0
    && Boolean(passage.staminaBand)
    && Boolean(passage.domainVocabularyLoad)
    && featureRows(passage).length > 0
    ? "PASS"
    : "FAIL";
}

export function evaluatePssaSectionLookbackBalance(passage: StaminaPassageInput, items: StaminaItemInput[]): StaminaGateStatus {
  if (!isStaminaPassage(passage)) return "SKIP";
  const sectionIds = new Set<string>();
  for (const item of items) {
    if (item.passageId && item.passageId !== passage.id) continue;
    for (const sectionId of evidenceSectionIds(item, passage)) sectionIds.add(sectionId);
  }
  sectionIds.delete("section_footnotes");
  return sectionIds.size >= 2 ? "PASS" : "FAIL";
}

export function evaluatePssaStaminaGates(passage: StaminaPassageInput, items: StaminaItemInput[]): StaminaGateRow[] {
  const rows: StaminaGateRow[] = [];
  for (const item of items) {
    if (item.passageId && item.passageId !== passage.id) continue;
    rows.push({
      gateId: "PSSA_ITEM_FOOTNOTE_GIVEAWAY",
      targetId: itemId(item),
      status: evaluatePssaItemFootnoteGiveaway(item, passage),
      detail: "vocab targets must not be visible footnote definitions",
    });
  }
  rows.push(
    { gateId: "PSSA_DOMAIN_FACT_CHECK_REQUIRED", targetId: passage.id, status: evaluatePssaDomainFactCheckRequired(passage), detail: "released_length factual claims require structured https sources" },
    { gateId: "PSSA_TEXT_FEATURE_INTEGRITY", targetId: passage.id, status: evaluatePssaTextFeatureIntegrity(passage, items), detail: "declared text features must match passage structure" },
    { gateId: "PSSA_TEXT_FEATURE_ITEM_LINK", targetId: passage.id, status: evaluatePssaTextFeatureItemLink(passage, items), detail: "non-decorative text features require an item link" },
    { gateId: "PSSA_PASSAGE_STAMINA_METADATA", targetId: passage.id, status: evaluatePssaPassageStaminaMetadata(passage), detail: "released_length passages require stamina metadata" },
    { gateId: "PSSA_SECTION_LOOKBACK_BALANCE", targetId: passage.id, status: evaluatePssaSectionLookbackBalance(passage, items), detail: "released_length itemsets must cite at least two sections" },
  );
  return rows;
}

export function evidenceSectionIds(item: StaminaItemInput, passage: StaminaPassageInput) {
  const sections = buildPssaStaminaSectionMap(passage);
  const ids = new Set<string>();
  const choices = Array.isArray(item.structuredChoicesJson) ? item.structuredChoicesJson : [];
  for (const choice of choices) {
    for (const link of choice.evidenceLinks ?? []) {
      if (link.evidenceKind === "section_synthesis" && link.sectionId) ids.add(link.sectionId);
      else if (link.evidenceKind === "scene_synthesis" && link.sceneId) ids.add(link.sceneId);
      else if (link.evidenceKind === "paragraph_synthesis" && link.sectionId) ids.add(link.sectionId);
      else if (link.evidenceKind === "whole_play_synthesis") {
        continue;
      }
      else if (link.evidenceKind === "whole_passage_synthesis") {
        for (const section of sections) ids.add(section.sectionId);
      }
      else if ((link.evidenceKind === "spoken_line" || link.evidenceKind === "stage_direction") && link.sceneId) ids.add(link.sceneId);
      else if (link.sectionId) ids.add(link.sectionId);
      else if (typeof link.startChar === "number") {
        const section = sections.find((row) => link.startChar! >= row.startChar && link.startChar! < row.endChar);
        if (section) ids.add(section.sectionId);
      } else if (link.quotedSpan) {
        const index = passage.text.indexOf(link.quotedSpan);
        const section = sections.find((row) => index >= row.startChar && index < row.endChar);
        if (section) ids.add(section.sectionId);
      }
    }
  }
  return ids;
}
