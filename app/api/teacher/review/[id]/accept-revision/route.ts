import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeReviewContent, updateSection } from "@/lib/lessonReview";

const schema = z.object({ aiEditInstructionId: z.string().min(1).max(128) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { id } = await params;
  const instruction = await db.aiEditInstruction.findFirst({ where: { id: parsed.data.aiEditInstructionId, lessonReviewId: id }, include: { lessonReview: true } });
  if (!instruction) return NextResponse.json({ error: "Revision not found." }, { status: 404 });
  const currentContent = updateSection(normalizeReviewContent(instruction.lessonReview.currentContent || instruction.lessonReview.aiOriginalContent), instruction.sectionType, instruction.sectionIndex, instruction.revisedContent);
  await db.$transaction([
    db.aiEditInstruction.update({ where: { id: instruction.id }, data: { accepted: true } }),
    db.lessonReview.update({ where: { id }, data: { currentContent: currentContent as unknown as Prisma.InputJsonValue } }),
  ]);
  return NextResponse.json({ currentContent });
}
