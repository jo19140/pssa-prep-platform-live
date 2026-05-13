import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeReviewContent, updateSection, validateSectionContent } from "@/lib/lessonReview";

const schema = z.object({
  sectionType: z.string().trim().max(80),
  sectionIndex: z.number().int().min(0).optional(),
  newContent: z.unknown(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { id } = await params;
  const review = await db.lessonReview.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  try {
    const section = validateSectionContent(parsed.data.sectionType, parsed.data.newContent);
    const currentContent = updateSection(normalizeReviewContent(review.currentContent || review.aiOriginalContent), parsed.data.sectionType, parsed.data.sectionIndex, section);
    const updated = await db.lessonReview.update({
      where: { id },
      data: { currentContent: currentContent as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ review: updated, currentContent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid edit." }, { status: 400 });
  }
}
