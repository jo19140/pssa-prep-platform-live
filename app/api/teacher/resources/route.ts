import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const auth = await requireUser(["TEACHER", "ADMIN"]);
  if ("error" in auth) return withNoStore(auth.error);

  const [resources, teacherGrades] = await Promise.all([
    db.resourceLink.findMany({
      orderBy: [
        { gradeLevel: "asc" },
        { standardCode: "asc" },
        { skill: "asc" },
        { title: "asc" },
      ],
      take: 500,
    }),
    loadTeacherGrades(auth.user.id, auth.user.role),
  ]);

  return NextResponse.json(
    {
      resources: resources.map(toResourceDto),
      teacherGrades,
    },
    { headers: NO_STORE },
  );
}

async function loadTeacherGrades(userId: string, role: string) {
  if (role !== "TEACHER") return [];

  const teacher = await db.teacherProfile.findUnique({
    where: { userId },
    include: {
      classes: {
        select: { grade: true },
        orderBy: { grade: "asc" },
      },
    },
  });

  if (!teacher) return [];
  return [...new Set(teacher.classes.map((classRoom) => classRoom.grade))].sort((a, b) => a - b);
}

function toResourceDto(resource: {
  id: string;
  gradeLevel: number | null;
  standardCode: string;
  skill: string;
  title: string;
  url: string;
  provider: string;
  description: string | null;
  belowGradeLevel: boolean;
  aboveGradeLevel: boolean;
}) {
  return {
    id: resource.id,
    gradeLevel: resource.gradeLevel,
    standardCode: resource.standardCode,
    skill: resource.skill,
    title: resource.title,
    url: resource.url,
    provider: resource.provider,
    description: resource.description,
    belowGradeLevel: resource.belowGradeLevel,
    aboveGradeLevel: resource.aboveGradeLevel,
  };
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
