import { getServerSession } from "next-auth";
import { ParentVoiceSessionsPage } from "@/components/literacy/ParentVoiceSessionsPage";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function ParentVoiceSessionData() {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  const parent = await db.parentProfile.findUnique({
    where: { userId },
    include: { children: { include: { studentProfile: true } } },
  });
  const studentUserIds = (parent?.children || []).map((link) => link.studentProfile.userId);
  const sessions = studentUserIds.length
    ? await db.voiceSession.findMany({
        where: { literacyProfile: { studentUserId: { in: studentUserIds } } },
        orderBy: { startedAt: "desc" },
        take: 30,
      })
    : [];
  return <ParentVoiceSessionsPage sessions={sessions} />;
}

export default function ParentVoiceSessionsRoute() {
  return (
    <SynesisPageShell roles={["PARENT"]}>
      <ParentVoiceSessionData />
    </SynesisPageShell>
  );
}
