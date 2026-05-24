import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function requireUser(roles?: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = {
    id: String((session.user as any).id),
    role: String((session.user as any).role),
    email: session.user.email || undefined,
    name: session.user.name || undefined,
  };
  if (roles?.length && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
