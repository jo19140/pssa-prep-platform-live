import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getGoogleClassroomConfig,
  getValidGoogleClassroomToken,
  setGoogleClassroomTokenCookie,
} from "@/lib/googleClassroom";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const googleCourseId = String(body.googleCourseId || "");
  const classRoomId = String(body.classRoomId || "");
  const temporaryPassword = String(body.temporaryPassword || "").trim();
  if (!googleCourseId || !classRoomId) return NextResponse.json({ error: "Choose a Google course and destination class." }, { status: 400 });

  const teacher = await db.teacherProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: { classes: { include: { school: true } }, school: true },
  });
  if (role === "TEACHER" && !teacher) return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  const classRoom = teacher?.classes.find((item) => item.id === classRoomId);
  if (role === "TEACHER" && !classRoom) return NextResponse.json({ error: "Class does not belong to this teacher." }, { status: 403 });

  const config = getGoogleClassroomConfig(req);
  if (!config.configured) return NextResponse.json({ error: "Google Classroom is not configured.", missing: config.missing }, { status: 400 });
  const { token, refreshedToken } = await getValidGoogleClassroomToken(req);
  if (!token) return NextResponse.json({ error: "Google Classroom is not connected." }, { status: 401 });

  const googleStudents = await fetchGoogleStudents(googleCourseId, token.access_token);
  const passwordHash = temporaryPassword.length >= 8 ? await bcrypt.hash(temporaryPassword, 10) : null;
  const schoolName = classRoom?.school?.name || teacher?.school?.name || teacher?.schoolName || "School";
  const schoolId = classRoom?.schoolId || teacher?.schoolId || null;
  const grade = classRoom?.grade || 6;

  let created = 0;
  let updated = 0;
  let enrolled = 0;
  let skipped = 0;

  for (const googleStudent of googleStudents) {
    const email = String(googleStudent.profile?.emailAddress || "").trim().toLowerCase();
    const name = String(googleStudent.profile?.name?.fullName || email).trim();
    if (!email) {
      skipped += 1;
      continue;
    }

    const existingUser = await db.user.findUnique({ where: { email }, include: { studentProfile: true } });
    const user = await db.user.upsert({
      where: { email },
      update: {
        name,
        role: "STUDENT",
        ...(passwordHash ? { passwordHash } : {}),
      },
      create: {
        email,
        name,
        role: "STUDENT",
        passwordHash,
      },
    });
    existingUser ? updated += 1 : created += 1;

    const profile = await db.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        grade,
        schoolName,
        schoolId,
        teacherId: teacher?.id || null,
      },
      create: {
        userId: user.id,
        grade,
        schoolName,
        schoolId,
        teacherId: teacher?.id || null,
      },
    });

    await db.enrollment.upsert({
      where: { classRoomId_studentProfileId: { classRoomId, studentProfileId: profile.id } },
      update: {},
      create: { classRoomId, studentProfileId: profile.id },
    });
    enrolled += 1;
  }

  const response = NextResponse.json({ imported: googleStudents.length, created, updated, enrolled, skipped });
  if (refreshedToken) setGoogleClassroomTokenCookie(response, refreshedToken);
  return response;
}

async function fetchGoogleStudents(courseId: string, accessToken: string) {
  const students: any[] = [];
  let pageToken = "";
  do {
    const url = new URL(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/students`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Failed to load Google Classroom students.");
    students.push(...(json.students || []));
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return students;
}
