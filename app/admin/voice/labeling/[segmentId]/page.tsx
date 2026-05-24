import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { LabelingWorkspace } from "@/components/admin/voice/LabelingWorkspace";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminVoiceLabelingWorkspace({ params }: { params: Promise<{ segmentId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = String((session?.user as any)?.role || "");
  if (role !== "ADMIN" && role !== "VOICE_ANNOTATOR") redirect("/dashboard");
  const { segmentId } = await params;
  const segment = await db.labeledVoiceSegment.findUnique({ where: { id: segmentId } });
  if (!segment) notFound();
  return <LabelingWorkspace segment={segment} audioUrl={`/api/voice/audio/session/${segment.voiceSessionId}`} />;
}
