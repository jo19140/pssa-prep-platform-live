import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GOOGLE_CLASSROOM_TOKEN_COOKIE, getGoogleClassroomConfig } from "@/lib/googleClassroom";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = getGoogleClassroomConfig(req);
  return NextResponse.json({
    configured: config.configured,
    connected: Boolean(req.cookies.get(GOOGLE_CLASSROOM_TOKEN_COOKIE)?.value),
    missing: config.missing,
    connectUrl: "/api/teacher/google-classroom/connect",
  });
}
