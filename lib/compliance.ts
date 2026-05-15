import crypto from "crypto";
import { Client } from "@upstash/qstash";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { parentalConsentText, PRIVACY_VERSION } from "@/lib/legalContent";

export const PENDING_SIGNUP_DAYS = 7;

export function baseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function createComplianceToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function calculateAge(dateOfBirth: Date, now = new Date()) {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}

export function isUnder13(dateOfBirth: Date) {
  return calculateAge(dateOfBirth) < 13;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "\"") return "&quot;";
    return "&#39;";
  });
}

export async function sendParentConsentEmail({
  parentEmail,
  parentName,
  studentName,
  token,
}: {
  parentEmail: string;
  parentName: string;
  studentName: string;
  token: string;
}) {
  const consentUrl = `${baseUrl()}/parental-consent/${encodeURIComponent(token)}`;
  await sendEmail({
    to: parentEmail,
    subject: `Parent permission needed for ${studentName}`,
    html: `<p>Hi ${escapeHtml(parentName)},</p>
      <p>${escapeHtml(studentName)} is trying to create an account for standards-aligned practice and personalized mini-lessons. Because this student is under 13, we need parent or guardian permission first.</p>
      <p>The platform collects account details, learning progress, assessment answers, tutor messages, and reading-coach transcripts as described in the Privacy Policy.</p>
      <p><a href="${consentUrl}">Review and give permission</a></p>
      <p>This link expires in ${PENDING_SIGNUP_DAYS} days. Privacy Policy: <a href="${baseUrl()}/legal/privacy">${baseUrl()}/legal/privacy</a></p>`,
  });
}

export async function sendStudentConsentCompleteEmail({ email, name }: { email: string; name: string }) {
  await sendEmail({
    to: email,
    subject: "Your parent gave permission",
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your parent or guardian gave permission for your account. You can now sign in.</p><p><a href="${baseUrl()}/login">Sign in</a></p>`,
  });
}

export function consentVersion() {
  return PRIVACY_VERSION;
}

export function currentConsentText() {
  return parentalConsentText();
}

export async function enqueueDsrJob(requestId: string, type: "EXPORT" | "DELETE") {
  const path = type === "EXPORT" ? "/api/jobs/process-dsr-export" : "/api/jobs/process-dsr-delete";
  if (!process.env.QSTASH_TOKEN) {
    if (type === "EXPORT") {
      const { processDsrExport } = await import("@/lib/dsrProcessor");
      return processDsrExport(requestId);
    }
    const { processDsrDelete } = await import("@/lib/dsrProcessor");
    return processDsrDelete(requestId);
  }
  const client = new Client({ token: process.env.QSTASH_TOKEN });
  await client.publishJSON({
    url: `${baseUrl()}${path}`,
    body: { requestId },
    deduplicationId: requestId,
  });
}

export function deleteConfirmUrl(token: string) {
  return `${baseUrl()}/data-request/confirm-delete/${encodeURIComponent(token)}`;
}

export async function eraseUserData(userId: string) {
  await db.$transaction(async (tx) => {
    await tx.tutorAgentMessage.deleteMany({ where: { userId } });
    await tx.tutorAgentMemory.deleteMany({ where: { userId } });
    await tx.readingCoachAttempt.deleteMany({ where: { userId } });
    await tx.learningQuestAttempt.deleteMany({ where: { userId } });
    await tx.studentLessonProgress.deleteMany({ where: { userId } });
    await tx.testSession.deleteMany({ where: { userId } });
    await tx.studentProfile.deleteMany({ where: { userId } });
    await tx.parentProfile.deleteMany({ where: { userId } });
    await tx.teacherProfile.deleteMany({ where: { userId } });
    await tx.reportSchedule.deleteMany({ where: { teacherUserId: userId } });
    await tx.parentalConsent.deleteMany({ where: { studentUserId: userId } });
    await tx.verificationToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.local`,
        name: "Deleted User",
        passwordHash: null,
        accountDeletedAt: new Date(),
        parentalConsentAt: null,
      },
    });
  });
}

export async function confirmDeletionByToken(token: string, email: string) {
  const requests = await db.dataSubjectRequest.findMany({ where: { requestType: "DELETE", status: "PENDING", expiresAt: { gt: new Date() } }, include: { user: true } });
  const request = requests.find((item) => {
    try {
      return JSON.parse(item.reasonNotes || "{}").token === token;
    } catch {
      return false;
    }
  });
  if (!request || request.user.email.toLowerCase() !== email.toLowerCase()) return null;
  await db.dataSubjectRequest.update({ where: { id: request.id }, data: { status: "PROCESSING" } });
  await enqueueDsrJob(request.id, "DELETE");
  return request;
}
