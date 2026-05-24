import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, defaultRetention } from "@/lib/voice/retention";

export const CURRENT_VOICE_CONSENT_VERSION = "voice-consent-v1.0";
export const DEFAULT_SERVICE_RETENTION_DAYS = 90;

type Actor = { id: string; role: string };

export function consentSnapshot(consent: {
  serviceAudioRetained: boolean;
  serviceAudioRetentionDays: number;
  generalDataRetained: boolean;
  generalDataRetentionDays: number;
  trainingCorpusOptedIn: boolean;
  researchPublicationOptedIn: boolean;
  consentTextVersion: string;
}) {
  return {
    serviceAudioRetained: consent.serviceAudioRetained,
    serviceAudioRetentionDays: consent.serviceAudioRetentionDays,
    generalDataRetained: consent.generalDataRetained,
    generalDataRetentionDays: consent.generalDataRetentionDays,
    trainingCorpusOptedIn: consent.trainingCorpusOptedIn,
    researchPublicationOptedIn: consent.researchPublicationOptedIn,
    consentTextVersion: consent.consentTextVersion,
  };
}

export async function ensureVoiceConsent(studentUserId: string, actor?: Actor) {
  const existing = await db.voiceConsent.findUnique({
    where: { studentUserId },
    include: { decisionLog: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (existing) return existing;
  const created = await db.voiceConsent.create({
    data: {
      studentUserId,
      serviceAudioRetained: true,
      serviceAudioRetentionDays: DEFAULT_SERVICE_RETENTION_DAYS,
      generalDataRetained: true,
      generalDataRetentionDays: DEFAULT_SERVICE_RETENTION_DAYS,
      trainingCorpusOptedIn: false,
      researchPublicationOptedIn: false,
      consentTextVersion: CURRENT_VOICE_CONSENT_VERSION,
      consentLastUpdatedByUserId: actor?.id,
    },
  });
  await db.voiceConsentDecision.create({
    data: {
      voiceConsentId: created.id,
      changeType: "INITIAL_DECISION",
      previousValue: undefined,
      newValue: consentSnapshot(created) as Prisma.InputJsonValue,
      consentTextVersion: CURRENT_VOICE_CONSENT_VERSION,
      changedByUserId: actor?.id,
    },
  });
  return db.voiceConsent.findUniqueOrThrow({
    where: { id: created.id },
    include: { decisionLog: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
}

export async function updateVoiceConsent(input: {
  studentUserId: string;
  actor: Actor;
  serviceAudioRetained?: boolean;
  serviceAudioRetentionDays?: number;
  generalDataRetained?: boolean;
  generalDataRetentionDays?: number;
  trainingCorpusOptedIn?: boolean;
  researchPublicationOptedIn?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const prior = await ensureVoiceConsent(input.studentUserId, input.actor);
  const previous = consentSnapshot(prior);
  const now = new Date();
  const serviceRetention = input.serviceAudioRetentionDays ?? prior.serviceAudioRetentionDays;
  const generalDataRetention = input.generalDataRetentionDays ?? prior.generalDataRetentionDays;
  const nextTrainingOptedIn = input.trainingCorpusOptedIn ?? prior.trainingCorpusOptedIn;
  const nextResearchOptedIn = input.researchPublicationOptedIn ?? prior.researchPublicationOptedIn;
  const trainingOptedOut = prior.trainingCorpusOptedIn && nextTrainingOptedIn === false;
  const updated = await db.voiceConsent.update({
    where: { id: prior.id },
    data: {
      serviceAudioRetained: input.serviceAudioRetained ?? prior.serviceAudioRetained,
      serviceAudioRetentionDays: serviceRetention,
      generalDataRetained: input.generalDataRetained ?? prior.generalDataRetained,
      generalDataRetentionDays: generalDataRetention,
      trainingCorpusOptedIn: nextTrainingOptedIn,
      trainingCorpusOptedInAt: nextTrainingOptedIn && !prior.trainingCorpusOptedIn ? now : prior.trainingCorpusOptedInAt,
      trainingCorpusOptedOutAt: trainingOptedOut ? now : prior.trainingCorpusOptedOutAt,
      trainingPurgeRequestedAt: trainingOptedOut ? now : prior.trainingPurgeRequestedAt,
      trainingPurgeExpectedBy: trainingOptedOut ? addDays(now, 30) : prior.trainingPurgeExpectedBy,
      researchPublicationOptedIn: nextResearchOptedIn,
      researchPublicationOptedInAt: nextResearchOptedIn && !prior.researchPublicationOptedIn ? now : prior.researchPublicationOptedInAt,
      consentTextVersion: CURRENT_VOICE_CONSENT_VERSION,
      consentLastUpdatedAt: now,
      consentLastUpdatedByUserId: input.actor.id,
    },
  });
  await db.voiceConsentDecision.create({
    data: {
      voiceConsentId: updated.id,
      changeType: changeTypeFor(previous, consentSnapshot(updated)),
      previousValue: previous as Prisma.InputJsonValue,
      newValue: consentSnapshot(updated) as Prisma.InputJsonValue,
      consentTextVersion: CURRENT_VOICE_CONSENT_VERSION,
      ipAddress: input.ipAddress || undefined,
      userAgent: input.userAgent || undefined,
      changedByUserId: input.actor.id,
    },
  });
  if (trainingOptedOut) await markTrainingSegmentsExcluded(input.studentUserId);
  return ensureVoiceConsent(input.studentUserId, input.actor);
}

export async function retentionForVoiceSession(studentUserId: string, startedAt: Date) {
  const consent = await ensureVoiceConsent(studentUserId);
  if (!consent.serviceAudioRetained) {
    return { retentionTier: "NONE", deleteAfterDate: startedAt };
  }
  if (consent.trainingCorpusOptedIn) {
    return { retentionTier: "TRAINING", deleteAfterDate: null };
  }
  if (consent.serviceAudioRetentionDays === DEFAULT_SERVICE_RETENTION_DAYS) return defaultRetention(startedAt);
  return { retentionTier: "SERVICE", deleteAfterDate: addDays(startedAt, consent.serviceAudioRetentionDays) };
}

export async function markTrainingSegmentsExcluded(studentUserId: string) {
  await db.labeledVoiceSegment.updateMany({
    where: { voiceSession: { literacyProfile: { studentUserId } }, isEvalSet: false },
    data: { skippedAt: new Date(), skipReason: "student_opted_out_at_export" },
  });
}

function changeTypeFor(previous: ReturnType<typeof consentSnapshot>, next: ReturnType<typeof consentSnapshot>) {
  if (!previous.trainingCorpusOptedIn && next.trainingCorpusOptedIn) return "TRAINING_OPT_IN";
  if (previous.trainingCorpusOptedIn && !next.trainingCorpusOptedIn) return "TRAINING_OPT_OUT";
  if (!previous.researchPublicationOptedIn && next.researchPublicationOptedIn) return "RESEARCH_OPT_IN";
  if (previous.researchPublicationOptedIn && !next.researchPublicationOptedIn) return "RESEARCH_OPT_OUT";
  if (previous.serviceAudioRetained && !next.serviceAudioRetained) return "SERVICE_DISABLED";
  if (!previous.serviceAudioRetained && next.serviceAudioRetained) return "SERVICE_ENABLED";
  if (previous.generalDataRetained && !next.generalDataRetained) return "GENERAL_DATA_DISABLED";
  if (!previous.generalDataRetained && next.generalDataRetained) return "GENERAL_DATA_ENABLED";
  return "RETENTION_CHANGED";
}
