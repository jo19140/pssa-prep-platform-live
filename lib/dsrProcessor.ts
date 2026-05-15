import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { eraseUserData, escapeHtml } from "@/lib/compliance";
import { sendEmail } from "@/lib/email";

export async function processDsrExport(requestId: string) {
  const request = await db.dataSubjectRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request || request.requestType !== "EXPORT" || request.status === "COMPLETED") return request;
  await db.dataSubjectRequest.update({ where: { id: requestId }, data: { status: "PROCESSING" } });
  const payload = await collectUserExport(request.userId);
  let payloadUrl: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`dsr-export-${request.userId}-${request.id}.json`, JSON.stringify(payload, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    payloadUrl = blob.url;
  }
  const completed = await db.dataSubjectRequest.update({
    where: { id: requestId },
    data: {
      status: "COMPLETED",
      payloadUrl,
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reasonNotes: payloadUrl ? request.reasonNotes : "Export completed, but BLOB_READ_WRITE_TOKEN is not configured; no download URL was created.",
    },
  });
  await sendEmail({
    to: request.user.email,
    subject: "Your data export is ready",
    html: `<p>Hi ${escapeHtml(request.user.name)},</p><p>Your data export request is complete.</p>${payloadUrl ? `<p><a href="${payloadUrl}">Download JSON export</a></p>` : "<p>The export was generated, but file storage is not configured. Contact privacy@[domain].</p>"}`,
  });
  return completed;
}

export async function processDsrDelete(requestId: string) {
  const request = await db.dataSubjectRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request || request.requestType !== "DELETE" || request.status === "COMPLETED") return request;
  await db.dataSubjectRequest.update({ where: { id: requestId }, data: { status: "PROCESSING" } });
  const email = request.user.email;
  const name = request.user.name;
  await eraseUserData(request.userId);
  const completed = await db.dataSubjectRequest.update({
    where: { id: requestId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await sendEmail({
    to: email,
    subject: "Your account deletion is complete",
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your deletion request has been completed. Your account row was retained only as a de-identified audit record.</p>`,
  });
  return completed;
}

export async function collectUserExport(userId: string) {
  const [
    user,
    studentProfile,
    teacherProfile,
    parentProfile,
    sessions,
    learningProgress,
    questAttempts,
    readingCoachAttempts,
    tutorMessages,
    tutorMemory,
    parentalConsent,
    dataSubjectRequests,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.studentProfile.findUnique({ where: { userId }, include: { enrollments: true, parentLinks: true } }),
    db.teacherProfile.findUnique({ where: { userId }, include: { classes: true } }),
    db.parentProfile.findUnique({ where: { userId }, include: { children: true } }),
    db.testSession.findMany({
      where: { userId },
      include: {
        responses: { include: { essayEvaluation: true } },
        report: true,
        learningPath: { include: { items: true, lessons: { include: { steps: true, items: true } } } },
      },
    }),
    db.studentLessonProgress.findMany({ where: { userId } }),
    db.learningQuestAttempt.findMany({ where: { userId } }),
    db.readingCoachAttempt.findMany({ where: { userId } }),
    db.tutorAgentMessage.findMany({ where: { userId } }),
    db.tutorAgentMemory.findUnique({ where: { userId } }),
    db.parentalConsent.findUnique({ where: { studentUserId: userId } }),
    db.dataSubjectRequest.findMany({ where: { userId } }),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    exportVersion: 1,
    user,
    profiles: { studentProfile, teacherProfile, parentProfile },
    sessions,
    learningProgress,
    questAttempts,
    readingCoachAttempts,
    tutorMessages,
    tutorMemory,
    parentalConsent,
    dataSubjectRequests,
  };
}
