import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@example.com" },
    update: { name: "Demo Admin", role: "ADMIN", passwordHash },
    create: { email: "admin@example.com", name: "Demo Admin", role: "ADMIN", passwordHash }
  });

  const teacherUserBase = await db.user.upsert({
    where: { email: "teacher@example.com" },
    update: { name: "Demo Teacher", role: "TEACHER", passwordHash },
    create: { email: "teacher@example.com", name: "Demo Teacher", role: "TEACHER", passwordHash }
  });
  const teacherProfile = await db.teacherProfile.upsert({
    where: { userId: teacherUserBase.id },
    update: { schoolName: "Liberty Middle School", gradeBand: "6-8" },
    create: { userId: teacherUserBase.id, schoolName: "Liberty Middle School", gradeBand: "6-8" }
  });
  const teacherUser = { ...teacherUserBase, teacherProfile };

  const studentUsers = [] as any[];
  for (const [email, name] of [["student@example.com", "Demo Student"], ["student2@example.com", "Liam Brooks"], ["student3@example.com", "Sophia Reed"]]) {
    const studentUser = await db.user.upsert({
      where: { email },
      update: { name, role: "STUDENT", passwordHash },
      create: { email, name, role: "STUDENT", passwordHash }
    });
    const studentProfile = await db.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: { grade: 6, schoolName: "Liberty Middle School", teacherId: teacherUser.teacherProfile!.id },
      create: { userId: studentUser.id, grade: 6, schoolName: "Liberty Middle School", teacherId: teacherUser.teacherProfile!.id }
    });
    const student = { ...studentUser, studentProfile };
    studentUsers.push(student);
  }

  const parentUserBase = await db.user.upsert({
    where: { email: "parent@example.com" },
    update: { name: "Demo Parent", role: "PARENT", passwordHash },
    create: { email: "parent@example.com", name: "Demo Parent", role: "PARENT", passwordHash }
  });
  const parentProfile = await db.parentProfile.upsert({
    where: { userId: parentUserBase.id },
    update: {},
    create: { userId: parentUserBase.id }
  });
  const parentUser = { ...parentUserBase, parentProfile };

  const classRoom = await db.classRoom.upsert({ where: { id: "demo-class-id" }, update: {}, create: { id: "demo-class-id", name: "Period 1 ELA", grade: 6, teacherId: teacherUser.teacherProfile!.id } });

  for (const student of studentUsers) {
    await db.enrollment.upsert({ where: { classRoomId_studentProfileId: { classRoomId: classRoom.id, studentProfileId: student.studentProfile!.id } }, update: {}, create: { classRoomId: classRoom.id, studentProfileId: student.studentProfile!.id } });
  }

  await db.parentStudentLink.upsert({ where: { parentProfileId_studentProfileId: { parentProfileId: parentUser.parentProfile!.id, studentProfileId: studentUsers[0].studentProfile!.id } }, update: {}, create: { parentProfileId: parentUser.parentProfile!.id, studentProfileId: studentUsers[0].studentProfile!.id } });

  const assessment = await db.assessment.upsert({ where: { id: "demo-assessment-id" }, update: {}, create: { id: "demo-assessment-id", title: "PSSA ELA Practice Test 1", subject: "ELA", state: "PA", grade: 6, isAdaptive: true } });

 await db.assignment.upsert({
  where: { id: "demo-assignment-id" },
  update: {},
  create: {
    id: "demo-assignment-id",
    assessmentId: assessment.id,
    classRoomId: classRoom.id,
    assignedById: teacherUser.id,
    status: "ASSIGNED",
    standards: "CC.1.2.6.A,CC.1.2.6.B",
    assignmentType: "FULL"
  }
});

  for (const [index, student] of studentUsers.slice(0,2).entries()) {
    const session = await db.testSession.create({ data: { userId: student.id, assessmentId: assessment.id, submittedAt: new Date(), currentQuestionNo: 5, scorePercent: 68 + index * 10, totalPoints: 6, earnedPoints: 4 + index, proficiencyBand: index === 0 ? "Basic" : "Proficient" } });
    await db.responseRecord.createMany({ data: [
      { sessionId: session.id, questionId: 1, skill: "Inference", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", questionType: "MCQ", difficulty: 2, isCorrect: true, scorePointsEarned: 1, maxPoints: 1, errorPattern: "none", timeSpentSec: 50, answerPayload: {} },
      { sessionId: session.id, questionId: 2, skill: "Inference", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", questionType: "EBSR", difficulty: 4, isCorrect: index === 1, scorePointsEarned: index === 1 ? 2 : 1, maxPoints: 2, errorPattern: index === 1 ? "none" : "part_a_correct_but_evidence_wrong", timeSpentSec: 70, answerPayload: {} },
      { sessionId: session.id, questionId: 4, skill: "Main Idea", standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", questionType: "MULTI_SELECT", difficulty: 3, isCorrect: true, scorePointsEarned: 1, maxPoints: 1, errorPattern: "none", timeSpentSec: 60, answerPayload: {} }
    ] });
    await db.reportSummary.create({ data: { sessionId: session.id, percentScore: 68 + index * 10, performanceBand: index === 0 ? "Basic" : "Proficient", strongestSkill: "Main Idea", weakestSkill: "Inference", growthFromPrevious: index === 0 ? null : 12, previousReportId: null, summaryPayload: { growth: { previousScore: index === 0 ? null : 66, currentScore: 68 + index * 10, growthPoints: index === 0 ? null : 12, previousBand: index === 0 ? null : "Basic", currentBand: index === 0 ? "Basic" : "Proficient" }, standardsMastery: [ { standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", earnedPoints: 1, totalPoints: 1, questionCount: 1, percentScore: 100, performanceBand: "Advanced" }, { standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", earnedPoints: index === 1 ? 3 : 2, totalPoints: 3, questionCount: 2, percentScore: index === 1 ? 100 : 67, performanceBand: index === 1 ? "Advanced" : "Basic" } ], standardsGrowth: [ { standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", previousScore: null, currentScore: 100, growthPoints: null, previousBand: null, currentBand: "Advanced" }, { standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", previousScore: index === 0 ? null : 55, currentScore: index === 1 ? 100 : 67, growthPoints: index === 0 ? null : 45, previousBand: index === 0 ? null : "Basic", currentBand: index === 1 ? "Advanced" : "Basic" } ] } } });
  }

  await db.reportSchedule.create({ data: { teacherUserId: teacherUser.id, classRoomId: classRoom.id, frequency: "WEEKLY", sendDay: 5, sendHour: 7, reportType: "GROWTH" } }).catch(() => {});

  console.log("Seed complete");
  console.log("admin@example.com / Password123!");
  console.log("teacher@example.com / Password123!");
  console.log("student@example.com / Password123!");
  console.log("parent@example.com / Password123!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
