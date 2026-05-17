import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const adminUserId = String((session?.user as any).id);

  const suggestion = await db.resourceSuggestion.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  if (suggestion.status !== "PENDING") return NextResponse.json({ error: "Suggestion has already been reviewed." }, { status: 409 });

  const { resource, updated } = await db.$transaction(async (tx) => {
    const resource = await tx.resourceLink.create({
      data: {
        gradeLevel: suggestion.gradeLevel,
        standardCode: suggestion.standardCode || "UNMAPPED",
        skill: suggestion.skill || "Teacher Suggested Resource",
        title: suggestion.title,
        url: suggestion.url,
        provider: suggestion.provider,
        description: suggestion.description || null,
        createdById: adminUserId,
      },
    });
    const updated = await tx.resourceSuggestion.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: adminUserId,
        reviewedAt: new Date(),
        resourceLinkId: resource.id,
      },
    });
    return { resource, updated };
  });

  await sendEmail({
    to: suggestion.teacher.email,
    subject: "Your resource suggestion was approved",
    html: `<p>Thanks for suggesting <strong>${escapeHtml(suggestion.title)}</strong>.</p><p>It has been approved and is now live in the resource library.</p>`,
  });

  return NextResponse.json({ resource, suggestion: updated });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}
