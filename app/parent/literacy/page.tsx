import { getServerSession } from "next-auth";
import { ParentLiteracyDashboard } from "@/components/literacy/ParentLiteracyDashboard";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFullLiteracyProfile } from "@/lib/literacy/profile";

async function ParentLiteracyData() {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  const parent = await db.parentProfile.findUnique({
    where: { userId },
    include: { children: { include: { studentProfile: true } } },
  });
  const studentUserId = parent?.children[0]?.studentProfile.userId;
  const profile = studentUserId ? await getFullLiteracyProfile(studentUserId) : null;
  const latestOutcome = studentUserId
    ? await db.studentEventOutcome.findFirst({
        where: { studentEvent: { studentUserId } },
        orderBy: { measuredAt: "desc" },
      })
    : null;
  return <ParentLiteracyDashboard profile={profile} latestOutcome={latestOutcome} />;
}

export default function ParentLiteracyPage() {
  return (
    <SynesisPageShell roles={["PARENT"]}>
      <ParentLiteracyData />
    </SynesisPageShell>
  );
}
