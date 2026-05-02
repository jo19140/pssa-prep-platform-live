import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const grade = searchParams.get("grade");
  const teacherId = searchParams.get("teacherId");
  const [schools, teachers, students, classes, sessions, reports, assignments] = await Promise.all([
    db.school.findMany({ orderBy: { name: "asc" } }),
    db.user.count({ where: { role: "TEACHER" } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.classRoom.findMany({ include: { school: true, teacher: { include: { user: true } }, enrollments: true } }),
    db.testSession.findMany({ include: { user: true, assessment: true, report: true } }),
    db.reportSummary.findMany(),
    db.assignment.findMany({ include: { classRoom: true, assessment: true } })
  ]);
  const filteredClasses = classes.filter((c) => { if (schoolId && c.schoolId !== schoolId) return false; if (grade && String(c.grade) !== grade) return false; if (teacherId && c.teacher.userId !== teacherId) return false; return true; });
  const filteredClassIds = new Set(filteredClasses.map((classRoom) => classRoom.id));
  const filteredAssignments = assignments.filter((assignment) => filteredClassIds.has(assignment.classRoomId));
  const filteredAssessmentIds = new Set(filteredAssignments.map((assignment) => assignment.assessmentId));
  const filteredSessions = sessions.filter((testSession) => filteredAssessmentIds.has(testSession.assessmentId));
  const filteredReports = filteredSessions.map((testSession) => testSession.report).filter(Boolean) as any[];
  const classRows = filteredClasses.map((classRoom) => { const relatedAssignments = filteredAssignments.filter((a) => a.classRoomId === classRoom.id); const relatedSessions = sessions.filter((s) => relatedAssignments.some((a) => a.assessmentId === s.assessmentId)); const relatedReports = relatedSessions.map((s) => s.report).filter(Boolean) as any[]; const averageScore = relatedReports.length ? Math.round(relatedReports.reduce((sum, r) => sum + r.percentScore, 0) / relatedReports.length) : 0; const growthVals = relatedReports.map((r) => r.growthFromPrevious).filter((v) => typeof v === "number") as number[]; const averageGrowth = growthVals.length ? Math.round(growthVals.reduce((sum, v) => sum + v, 0) / growthVals.length) : 0; return { classId: classRoom.id, className: classRoom.name, schoolId: classRoom.schoolId, schoolName: classRoom.school?.name || "Unassigned School", grade: classRoom.grade, teacherName: classRoom.teacher.user.name, studentCount: classRoom.enrollments.length, assignmentCount: relatedAssignments.length, averageScore, averageGrowth }; });
  const standardsMap = new Map<string, any>();
  for (const report of filteredReports) {
    const standardsMastery = ((report.summaryPayload as any)?.standardsMastery) || [];
    for (const row of standardsMastery) {
      if (!standardsMap.has(row.standardCode)) standardsMap.set(row.standardCode, { standardCode: row.standardCode, standardLabel: row.standardLabel, totalScore: 0, count: 0 });
      const current = standardsMap.get(row.standardCode); current.totalScore += row.percentScore; current.count += 1;
    }
  }
  const standardsSummary = Array.from(standardsMap.values()).map((row) => ({ standardCode: row.standardCode, standardLabel: row.standardLabel, averageScore: row.count ? Math.round(row.totalScore / row.count) : 0, count: row.count })).sort((a,b)=>a.averageScore-b.averageScore);
  const teacherRows = filteredClasses.reduce((acc: any, classRoom) => { const name = classRoom.teacher.user.name; if (!acc[name]) acc[name] = { teacherName: name, classCount: 0, studentCount: 0 }; acc[name].classCount += 1; acc[name].studentCount += classRoom.enrollments.length; return acc; }, {});
  const schoolRows = schools.map((school) => {
    const schoolClasses = classes.filter((classRoom) => classRoom.schoolId === school.id);
    const schoolClassIds = new Set(schoolClasses.map((classRoom) => classRoom.id));
    const schoolAssignments = assignments.filter((assignment) => schoolClassIds.has(assignment.classRoomId));
    return {
      id: school.id,
      name: school.name,
      districtName: school.districtName,
      gradeSpan: school.gradeSpan,
      classCount: schoolClasses.length,
      studentCount: schoolClasses.reduce((sum, classRoom) => sum + classRoom.enrollments.length, 0),
      assignmentCount: schoolAssignments.length,
    };
  });
  const growthValues = filteredReports.map((r) => r.growthFromPrevious).filter((v): v is number => typeof v === "number");
  return NextResponse.json({ overview: { schools: schools.length, teachers, students, classes: filteredClasses.length, completedReports: filteredReports.length, averageScore: filteredReports.length ? Math.round(filteredReports.reduce((sum, r) => sum + r.percentScore, 0) / filteredReports.length) : 0, averageGrowth: growthValues.length ? Math.round(growthValues.reduce((sum,v)=>sum+v,0) / growthValues.length) : 0, assignments: filteredAssignments.length }, schools: schoolRows, teachers: Object.values(teacherRows), teacherOptions: classes.map((c) => ({ id: c.teacher.userId, name: c.teacher.user.name, schoolId: c.schoolId })), gradeOptions: [...new Set(classes.map((c) => c.grade))], topClasses: [...classRows].sort((a,b)=>b.averageScore-a.averageScore).slice(0,5), supportClasses: [...classRows].sort((a,b)=>a.averageScore-b.averageScore).slice(0,5), standardsSummary });
}
