import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LabelingQueuePage } from "@/components/admin/voice/LabelingQueuePage";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminVoiceLabelingPage() {
  const session = await getServerSession(authOptions);
  const role = String((session?.user as any)?.role || "");
  if (role !== "ADMIN" && role !== "VOICE_ANNOTATOR") redirect("/dashboard");
  const segments = await db.labeledVoiceSegment.findMany({
    where: { labeledAt: null, skippedAt: null },
    orderBy: [{ uncertaintyScore: "desc" }, { createdAt: "asc" }],
    take: 50,
  });
  return <LabelingQueuePage segments={segments} />;
}
