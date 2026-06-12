import crypto from "node:crypto";

import { stableStringify, type GateStatus } from "./pssa-import-plan";
import { explainPssaPassageStudentReadiness, type PssaReadyPassage, type StudentReadyExplanation } from "./pssa-student-ready-selector";

export type PairedPassageSlot = "passage_1" | "passage_2" | string;

export type PairedEvidenceLink = {
  evidenceKind?: "quoted_span" | "section_synthesis" | "paragraph_synthesis" | "whole_passage_synthesis" | string;
  passageSlot?: PairedPassageSlot;
  passageId?: string;
  sectionId?: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  quotedSpan?: string;
  startChar?: number;
  endChar?: number;
};

export type PairedPassageInput = PssaReadyPassage & {
  title?: string;
  text: string;
  wordCount?: number | null;
  contentHash?: string | null;
  factCheckNotesJson?: unknown;
};

export type PairedPassageGroupMemberInput = {
  passageId: string;
  slot: PairedPassageSlot;
  position: number;
  passageContentHashSnapshot: string;
  passage: PairedPassageInput;
};

export type PairedPassageGroupInput = {
  id: string;
  gradeLevel: number;
  subject: string;
  groupType: string;
  genre: string;
  staminaBand: string;
  title?: string;
  wordCount: number;
  domainVocabularyLoad?: string | null;
  textFeaturesJson?: unknown;
  contentHash?: string | null;
  members: PairedPassageGroupMemberInput[];
};

export type PairedItemInput = {
  id?: string;
  itemId?: string;
  interactionType?: string | null;
  itemType?: string | null;
  passageGroupId?: string | null;
  isCrossText?: boolean | null;
  requiredEvidenceSlotsJson?: unknown;
  crossTextSupportRuleJson?: unknown;
  structuredChoicesJson?: Array<{ isCorrect?: boolean; evidenceLinks?: PairedEvidenceLink[] }>;
  acceptableTextSupport?: unknown;
  acceptableSupportEvidenceLinks?: PairedEvidenceLink[];
  scoreBandExamples?: unknown;
  passages?: Array<{ passage?: PssaReadyPassage | null }>;
  passageGroup?: { members?: Array<{ passage?: PssaReadyPassage | null }> } | null;
};

export type PairedSectionRow = {
  sectionId: string;
  passageSlot: PairedPassageSlot;
  paragraphIndex: number;
  label: string;
  startChar: number;
  endChar: number;
  text: string;
};

export type PairedGateRow = {
  gateId: string;
  targetId: string;
  status: GateStatus;
  detail: string;
};

function itemId(item: PairedItemInput) {
  return String(item.itemId ?? item.id ?? "");
}

function interactionType(item: PairedItemInput) {
  return String(item.interactionType ?? item.itemType ?? "").toUpperCase();
}

function sortedMembers(group: PairedPassageGroupInput) {
  return [...group.members].sort((a, b) => a.position - b.position || String(a.slot).localeCompare(String(b.slot)));
}

export function pssaPassageGroupContentHashInput(group: PairedPassageGroupInput) {
  return {
    groupType: group.groupType,
    genre: group.genre,
    staminaBand: group.staminaBand,
    wordCount: group.wordCount,
    members: sortedMembers(group).map((member) => ({
      slot: member.slot,
      position: member.position,
      passageId: member.passageId,
      passageContentHashSnapshot: member.passageContentHashSnapshot,
    })),
  };
}

export function computePssaPassageGroupContentHash(group: PairedPassageGroupInput) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(pssaPassageGroupContentHashInput(group))).digest("hex")}`;
}

export function verifyPssaPassageGroupMemberSnapshots(group: PairedPassageGroupInput) {
  const stale = sortedMembers(group).filter((member) => member.passage.contentHash !== member.passageContentHashSnapshot);
  return stale.length
    ? { ok: false as const, detail: `group stale — recompose: ${stale.map((member) => member.slot).join(",")}` }
    : { ok: true as const, detail: "member snapshots match" };
}

export function buildPssaPairedSectionMap(group: PairedPassageGroupInput): PairedSectionRow[] {
  const rows: PairedSectionRow[] = [];
  for (const member of sortedMembers(group)) {
    const matches = [...String(member.passage.text ?? "").matchAll(/(?:^|\n\n)([^\n][\s\S]*?)(?=\n\n|$)/g)];
    matches.forEach((match, index) => {
      const text = match[1];
      const startChar = (match.index ?? 0) + (match[0].startsWith("\n\n") ? 2 : 0);
      rows.push({
        sectionId: `${member.slot}.paragraph_${String(index + 1).padStart(2, "0")}`,
        passageSlot: member.slot,
        paragraphIndex: index,
        label: `${member.slot} Paragraph ${index + 1}`,
        startChar,
        endChar: startChar + text.length,
        text,
      });
    });
  }
  return rows;
}

export function evaluatePssaPairedGroupStaminaMetadata(group: PairedPassageGroupInput): GateStatus {
  return group.groupType === "paired_informational"
    && group.genre === "paired_informational"
    && group.staminaBand === "released_length"
    && group.wordCount > 0
    && Boolean(group.domainVocabularyLoad)
    ? "PASS"
    : "FAIL";
}

function requiredSlots(item: PairedItemInput) {
  const direct = Array.isArray(item.requiredEvidenceSlotsJson) ? item.requiredEvidenceSlotsJson.map(String) : [];
  const rule = objectSource(item.crossTextSupportRuleJson);
  const fromRule = Array.isArray(rule.requiredPassageSlots) ? rule.requiredPassageSlots.map(String) : [];
  return Array.from(new Set([...direct, ...fromRule]));
}

function objectSource(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function collectEvidenceLinks(value: unknown, out: PairedEvidenceLink[] = []): PairedEvidenceLink[] {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const entry of value) collectEvidenceLinks(entry, out);
    return out;
  }
  const row = value as Record<string, unknown>;
  if ("passageSlot" in row || "evidenceKind" in row || "quotedSpan" in row || "sectionId" in row) out.push(row as PairedEvidenceLink);
  for (const nested of Object.values(row)) collectEvidenceLinks(nested, out);
  return out;
}

export function correctChoiceEvidenceLinks(item: PairedItemInput) {
  const correct = item.structuredChoicesJson?.find((choice) => choice.isCorrect);
  return correct?.evidenceLinks ?? [];
}

export function supportEvidenceLinks(item: PairedItemInput) {
  if (interactionType(item) === "MCQ") return correctChoiceEvidenceLinks(item);
  return [
    ...(item.acceptableSupportEvidenceLinks ?? []),
    ...collectEvidenceLinks(item.acceptableTextSupport),
    ...collectEvidenceLinks(item.scoreBandExamples),
    ...collectEvidenceLinks(item.crossTextSupportRuleJson),
  ];
}

export function evaluatePssaRequiredEvidenceSlots(item: PairedItemInput, group: PairedPassageGroupInput): GateStatus {
  if (!item.passageGroupId) return "PASS";
  const slots = new Set(sortedMembers(group).map((member) => String(member.slot)));
  const required = requiredSlots(item);
  if (!required.length) return item.isCrossText ? "FAIL" : "PASS";
  if (required.some((slot) => !slots.has(slot))) return "FAIL";
  const covered = new Set<string>();
  for (const link of supportEvidenceLinks(item)) {
    if (!link.passageSlot || !slots.has(String(link.passageSlot))) return "FAIL";
    covered.add(String(link.passageSlot));
  }
  return required.every((slot) => covered.has(slot)) ? "PASS" : "FAIL";
}

export function evaluatePssaPairedSectionLookbackBalance(group: PairedPassageGroupInput, items: PairedItemInput[]): PairedGateRow[] {
  const rows: PairedGateRow[] = [];
  const setSlots = new Set<string>();
  for (const item of items) {
    if (item.passageGroupId !== group.id) continue;
    const itemStatus = evaluatePssaRequiredEvidenceSlots(item, group);
    rows.push({
      gateId: "PSSA_SECTION_LOOKBACK_BALANCE",
      targetId: itemId(item),
      status: itemStatus,
      detail: itemStatus === "PASS" ? "required evidence slots covered" : "required evidence slot missing_or_unknown",
    });
    for (const link of supportEvidenceLinks(item)) if (link.passageSlot) setSlots.add(String(link.passageSlot));
  }
  rows.push({
    gateId: "PSSA_SECTION_LOOKBACK_BALANCE",
    targetId: group.id,
    status: setSlots.size >= 2 ? "PASS" : "FAIL",
    detail: `paired set draws from ${setSlots.size} passage slots`,
  });
  return rows;
}

export function pairedEvidenceKey(link: PairedEvidenceLink) {
  if (!link.passageSlot) return "";
  if (Number.isInteger(link.paragraphIndex) && Number.isInteger(link.sentenceIndex)) return `${link.passageSlot}:${link.paragraphIndex}:${link.sentenceIndex}`;
  if (link.sectionId) return `${link.passageSlot}:${link.sectionId}`;
  return "";
}

export function evaluatePssaPairedMultipointEvidenceOverlap(items: PairedItemInput[]): Record<string, GateStatus> {
  const result: Record<string, GateStatus> = {};
  const multipoint = items
    .filter((item) => ["EBSR", "HOT_TEXT", "MULTI_SELECT"].includes(interactionType(item)))
    .map((item) => ({
      id: itemId(item),
      keys: new Set(supportEvidenceLinks(item).map(pairedEvidenceKey).filter(Boolean)),
    }));
  for (const row of multipoint) result[row.id] = "PASS";
  for (let i = 0; i < multipoint.length; i += 1) {
    for (let j = i + 1; j < multipoint.length; j += 1) {
      const overlap = [...multipoint[i].keys].filter((key) => multipoint[j].keys.has(key));
      if (overlap.length > 1) {
        result[multipoint[i].id] = "FAIL";
        result[multipoint[j].id] = "FAIL";
      }
    }
  }
  return result;
}

function allPassagesReady(passages: Array<PssaReadyPassage | null | undefined>) {
  for (const passage of passages) {
    if (!passage) return { ok: false as const, detail: "passage_missing" };
    const ready = explainPssaPassageStudentReadiness(passage);
    if (ready.reason !== "NONE") return { ok: false as const, detail: `${passage.id}_${ready.detail}` };
  }
  return { ok: true as const, detail: "all_passages_ready" };
}

export function explainPssaPairedItemReadiness(item: PairedItemInput, group?: PairedPassageGroupInput | null): StudentReadyExplanation {
  const linked = allPassagesReady((item.passages ?? []).map((link) => link.passage));
  if (!linked.ok) return { reason: "PENDING_REVIEW", detail: `linked_${linked.detail}` };
  if (item.passageGroupId) {
    const members = group?.members ?? item.passageGroup?.members ?? [];
    const groupReady = allPassagesReady(members.map((member) => member.passage));
    if (!groupReady.ok) return { reason: "PENDING_REVIEW", detail: `group_member_${groupReady.detail}` };
    if (group && evaluatePssaRequiredEvidenceSlots(item, group) !== "PASS") return { reason: "PENDING_REVIEW", detail: "required_evidence_slots_not_covered" };
  }
  return { reason: "NONE", detail: "ready" };
}
