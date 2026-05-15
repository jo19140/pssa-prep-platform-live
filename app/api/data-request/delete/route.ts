import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createComplianceToken, deleteConfirmUrl, escapeHtml } from "@/lib/compliance";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const deleteSchema = z.object({
  userId: z.string().optional(),
  reasonNotes: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  const requesterId = (session.user as any).id as string;
  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const targetUserId = role === "ADMIN" && parsed.data.userId ? parsed.data.userId : requesterId;
  const user = await db.user.findUnique({ where: { id: targetUserId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const token = createComplianceToken();
  const request = await db.dataSubjectRequest.create({
    data: {
      userId: targetUserId,
      requestType: "DELETE",
      status: "PENDING",
      reasonNotes: JSON.stringify({ note: parsed.data.reasonNotes || null, token, requestedBy: requesterId }),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      processedById: role === "ADMIN" ? requesterId : null,
    },
  });
  await sendEmail({
    to: user.email,
    subject: "Confirm account deletion",
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Confirm permanent account deletion by opening this link and typing your email.</p><p><a href="${deleteConfirmUrl(token)}">Confirm deletion</a></p>`,
  });
  if (role === "ADMIN" && parsed.data.reasonNotes?.toLowerCase().includes("parental revocation")) {
    await db.parentalConsent.updateMany({ where: { studentUserId: targetUserId }, data: { revokedAt: new Date(), revokedReason: parsed.data.reasonNotes } });
  }
  return NextResponse.json({ requestId: request.id, status: request.status });
}
