import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getGoogleClassroomConfig,
  getValidGoogleClassroomToken,
  setGoogleClassroomTokenCookie,
} from "@/lib/googleClassroom";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = getGoogleClassroomConfig(req);
  if (!config.configured) return NextResponse.json({ error: "Google Classroom is not configured.", missing: config.missing }, { status: 400 });
  const { token, refreshedToken } = await getValidGoogleClassroomToken(req);
  if (!token) return NextResponse.json({ error: "Google Classroom is not connected." }, { status: 401 });

  const googleRes = await fetch("https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&pageSize=50", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const json = await googleRes.json();
  if (!googleRes.ok) return NextResponse.json({ error: json.error?.message || "Failed to load Google Classroom courses." }, { status: googleRes.status });

  const response = NextResponse.json({
    courses: (json.courses || []).map((course: any) => ({
      id: course.id,
      name: course.name,
      section: course.section || "",
      room: course.room || "",
      state: course.courseState,
    })),
  });
  if (refreshedToken) setGoogleClassroomTokenCookie(response, refreshedToken);
  return response;
}
