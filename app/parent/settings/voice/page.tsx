import { getServerSession } from "next-auth";
import { VoiceConsentSettings } from "@/components/literacy/VoiceConsentSettings";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureVoiceConsent } from "@/lib/voice/consent";

async function ParentVoiceSettingsData() {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  const parent = await db.parentProfile.findUnique({
    where: { userId },
    include: { children: { include: { studentProfile: true }, take: 1 } },
  });
  const studentUserId = parent?.children[0]?.studentProfile.userId;
  if (!studentUserId) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-slate-700">No linked student found.</main>;
  }
  const consent = await ensureVoiceConsent(studentUserId, { id: userId, role: "PARENT" });
  return <VoiceConsentSettings studentUserId={studentUserId} consent={consent} />;
}

export default function ParentVoiceSettingsPage() {
  return (
    <SynesisPageShell roles={["PARENT"]}>
      <ParentVoiceSettingsData />
    </SynesisPageShell>
  );
}
