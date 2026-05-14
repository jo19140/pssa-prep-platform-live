import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateStepAudio } from "@/lib/lessonStepAudio";

const schema = z.object({
  stepId: z.string().min(1).max(128),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { id } = await params;

  const review = await db.lessonReview.findUnique({
    where: { id },
    include: { lesson: { include: { steps: { select: { id: true } } } } },
  });
  if (!review?.lesson) return NextResponse.json({ error: "Review lesson not found." }, { status: 404 });
  if (!review.lesson.steps.some((step) => step.id === parsed.data.stepId)) return NextResponse.json({ error: "Step does not belong to this review." }, { status: 400 });

  const content = (review.currentContent || review.aiOriginalContent) as any;
  const currentStep = Array.isArray(content?.steps) ? content.steps.find((step: any) => step.id === parsed.data.stepId) : null;
  const dbStep = await db.lessonStep.findUnique({ where: { id: parsed.data.stepId } });
  const narrationScript = String(currentStep?.narrationScript || dbStep?.narrationScript || "");
  if (!narrationScript) return NextResponse.json({ error: "Step narration is empty." }, { status: 400 });
  const audioUrl = await generateStepAudio({ stepId: parsed.data.stepId, narrationScript });
  if (audioUrl) await db.lessonStep.update({ where: { id: parsed.data.stepId }, data: { audioUrl } });
  return NextResponse.json({ audioUrl });
}
