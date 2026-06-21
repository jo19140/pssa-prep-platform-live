import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import {
  loadTeacherLessonPreview,
  TeacherLessonLibraryIntegrityError,
} from "@/lib/teacher/teacherLessonLibrary";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const auth = await requireUser(["TEACHER", "ADMIN"]);
  if ("error" in auth) return withNoStore(auth.error);

  const { lessonId } = await params;
  try {
    const result = await loadTeacherLessonPreview(lessonId);
    if (!result.preview) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ lesson: result.preview }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof TeacherLessonLibraryIntegrityError) {
      const requestId = crypto.randomUUID();
      console.error("teacher_lesson_library_integrity_failed", {
        requestId,
        lessonId,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json(
        { error: "teacher_lesson_library_integrity_failed", requestId },
        { status: 500, headers: NO_STORE },
      );
    }
    throw error;
  }
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
