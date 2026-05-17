import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const rejectSchema = z.object({
  reviewerNotes: z.string().trim().min(20).max(1000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = rejectSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });

  const suggestion = await db.resourceSuggestion.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  if (suggestion.status !== "PENDING") return NextResponse.json({ error: "Suggestion has already been reviewed." }, { status: 409 });

  const updated = await db.resourceSuggestion.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: String((session.user as any).id),
      reviewedAt: new Date(),
      reviewerNotes: parsed.data.reviewerNotes,
    },
  });

  await sendEmail({
    to: suggestion.teacher.email,
    subject: "Resource suggestion update",
    html: `<p>Thanks for suggesting <strong>${escapeHtml(suggestion.title)}</strong>.</p><p>We are not adding it to the library right now.</p><p><strong>Reviewer note:</strong> ${escapeHtml(parsed.data.reviewerNotes)}</p>`,
  });

  return NextResponse.json({ suggestion: updated });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}
