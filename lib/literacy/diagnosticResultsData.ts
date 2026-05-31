import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessStudent } from "./profile";

export async function currentAdultUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: String((session.user as any).id),
    role: String((session.user as any).role),
    email: session.user.email || undefined,
    name: session.user.name || undefined,
  };
}

export async function canReadAdultDiagnostic(user: { id: string; role: string }, studentUserId: string) {
  if (user.role === "STUDENT") return false;
  return canAccessStudent(user, studentUserId);
}

export async function getCompletedDiagnosticSession(sessionId: string) {
  return db.diagnosticSession.findFirst({
    where: { id: sessionId, completedAt: { not: null } },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }, { id: "desc" }],
  });
}

export async function getLatestCompletedDiagnosticSession(studentUserId: string) {
  return db.diagnosticSession.findFirst({
    where: { studentUserId, completedAt: { not: null } },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }, { id: "desc" }],
  });
}
