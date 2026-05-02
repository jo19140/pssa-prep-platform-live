import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SCHOOL_NAME = "Bethune Elementary";
const DISTRICT_NAME = "Bethune Elementary Pilot";
const PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await db.user.upsert({
    where: { email: "admin@example.com" },
    update: { name: "Demo Admin", role: "ADMIN", passwordHash },
    create: { email: "admin@example.com", name: "Demo Admin", role: "ADMIN", passwordHash },
  });

  const school = await db.school.upsert({
    where: { name_districtName: { name: SCHOOL_NAME, districtName: DISTRICT_NAME } },
    update: { city: "Philadelphia", state: "PA", gradeSpan: "K-8" },
    create: {
      name: SCHOOL_NAME,
      districtName: DISTRICT_NAME,
      city: "Philadelphia",
      state: "PA",
      gradeSpan: "K-8",
    },
  });

  const teacherUserBase = await db.user.upsert({
    where: { email: "teacher@example.com" },
    update: { name: "Demo Teacher", role: "TEACHER", passwordHash },
    create: { email: "teacher@example.com", name: "Demo Teacher", role: "TEACHER", passwordHash },
  });

  const teacherProfile = await db.teacherProfile.upsert({
    where: { userId: teacherUserBase.id },
    update: { schoolId: school.id, schoolName: school.name, gradeBand: "3-8" },
    create: { userId: teacherUserBase.id, schoolId: school.id, schoolName: school.name, gradeBand: "3-8" },
  });
  const teacherUser = { ...teacherUserBase, teacherProfile };

  await db.classRoom.updateMany({
    where: { teacherId: teacherProfile.id, schoolId: { not: school.id } },
    data: { schoolId: school.id },
  });

  await db.school.deleteMany({
    where: {
      name: "Liberty Middle School",
      teacherProfiles: { none: {} },
      studentProfiles: { none: {} },
      classes: { none: {} },
    },
  });

  const classRooms = new Map<number, Awaited<ReturnType<typeof db.classRoom.upsert>>>();
  for (const grade of [3, 4, 5, 6, 7, 8]) {
    const classRoom = await db.classRoom.upsert({
      where: { id: `bethune-grade-${grade}-ela` },
      update: {
        name: `Grade ${grade} ELA`,
        grade,
        schoolId: school.id,
        teacherId: teacherProfile.id,
      },
      create: {
        id: `bethune-grade-${grade}-ela`,
        name: `Grade ${grade} ELA`,
        grade,
        schoolId: school.id,
        teacherId: teacherProfile.id,
      },
    });
    classRooms.set(grade, classRoom);
  }

  const studentSeeds = [
    { email: "student@example.com", name: "Demo Student", grade: 6 },
    { email: "student2@example.com", name: "Liam Brooks", grade: 6 },
    { email: "student3@example.com", name: "Sophia Reed", grade: 6 },
    { email: "grade3.student@example.com", name: "Ava Carter", grade: 3 },
    { email: "grade4.student@example.com", name: "Noah Johnson", grade: 4 },
    { email: "grade5.student@example.com", name: "Mia Thompson", grade: 5 },
    { email: "grade7.student@example.com", name: "Ethan Williams", grade: 7 },
    { email: "grade8.student@example.com", name: "Isabella Davis", grade: 8 },
  ];

  const studentUsers = [] as any[];
  for (const studentSeed of studentSeeds) {
    const studentUser = await db.user.upsert({
      where: { email: studentSeed.email },
      update: { name: studentSeed.name, role: "STUDENT", passwordHash },
      create: { email: studentSeed.email, name: studentSeed.name, role: "STUDENT", passwordHash },
    });
    const studentProfile = await db.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: {
        grade: studentSeed.grade,
        schoolId: school.id,
        schoolName: school.name,
        teacherId: teacherProfile.id,
      },
      create: {
        userId: studentUser.id,
        grade: studentSeed.grade,
        schoolId: school.id,
        schoolName: school.name,
        teacherId: teacherProfile.id,
      },
    });
    const classRoom = classRooms.get(studentSeed.grade);
    if (classRoom) {
      await db.enrollment.upsert({
        where: { classRoomId_studentProfileId: { classRoomId: classRoom.id, studentProfileId: studentProfile.id } },
        update: {},
        create: { classRoomId: classRoom.id, studentProfileId: studentProfile.id },
      });
    }
    studentUsers.push({ ...studentUser, studentProfile });
  }

  const parentUserBase = await db.user.upsert({
    where: { email: "parent@example.com" },
    update: { name: "Demo Parent", role: "PARENT", passwordHash },
    create: { email: "parent@example.com", name: "Demo Parent", role: "PARENT", passwordHash },
  });
  const parentProfile = await db.parentProfile.upsert({
    where: { userId: parentUserBase.id },
    update: {},
    create: { userId: parentUserBase.id },
  });

  await db.parentStudentLink.upsert({
    where: {
      parentProfileId_studentProfileId: {
        parentProfileId: parentProfile.id,
        studentProfileId: studentUsers[0].studentProfile.id,
      },
    },
    update: {},
    create: {
      parentProfileId: parentProfile.id,
      studentProfileId: studentUsers[0].studentProfile.id,
    },
  });

  const gradeSixClass = classRooms.get(6);
  const assessment = await db.assessment.upsert({
    where: { id: "demo-assessment-id" },
    update: { title: "PSSA ELA Practice Test 1", subject: "ELA", state: "PA", grade: 6, isAdaptive: true },
    create: { id: "demo-assessment-id", title: "PSSA ELA Practice Test 1", subject: "ELA", state: "PA", grade: 6, isAdaptive: true },
  });

  if (gradeSixClass) {
    await db.assignment.upsert({
      where: { id: "demo-assignment-id" },
      update: {
        assessmentId: assessment.id,
        classRoomId: gradeSixClass.id,
        assignedById: teacherUser.id,
        status: "ASSIGNED",
        standards: "CC.1.2.6.A,CC.1.2.6.B",
        assignmentType: "FULL",
      },
      create: {
        id: "demo-assignment-id",
        assessmentId: assessment.id,
        classRoomId: gradeSixClass.id,
        assignedById: teacherUser.id,
        status: "ASSIGNED",
        standards: "CC.1.2.6.A,CC.1.2.6.B",
        assignmentType: "FULL",
      },
    });
  }

  for (const [index, student] of studentUsers.filter((item) => item.studentProfile.grade === 6).slice(0, 2).entries()) {
    const existingSession = await db.testSession.findFirst({
      where: { userId: student.id, assessmentId: assessment.id, submittedAt: { not: null } },
    });
    if (existingSession) continue;

    const session = await db.testSession.create({
      data: {
        userId: student.id,
        assessmentId: assessment.id,
        submittedAt: new Date(),
        currentQuestionNo: 5,
        scorePercent: 68 + index * 10,
        totalPoints: 6,
        earnedPoints: 4 + index,
        proficiencyBand: index === 0 ? "Basic" : "Proficient",
      },
    });
    await db.responseRecord.createMany({
      data: [
        { sessionId: session.id, questionId: 1, skill: "Inference", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", questionType: "MCQ", difficulty: 2, isCorrect: true, scorePointsEarned: 1, maxPoints: 1, errorPattern: "none", timeSpentSec: 50, answerPayload: {} },
        { sessionId: session.id, questionId: 2, skill: "Inference", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", questionType: "EBSR", difficulty: 4, isCorrect: index === 1, scorePointsEarned: index === 1 ? 2 : 1, maxPoints: 2, errorPattern: index === 1 ? "none" : "part_a_correct_but_evidence_wrong", timeSpentSec: 70, answerPayload: {} },
        { sessionId: session.id, questionId: 4, skill: "Main Idea", standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", questionType: "MULTI_SELECT", difficulty: 3, isCorrect: true, scorePointsEarned: 1, maxPoints: 1, errorPattern: "none", timeSpentSec: 60, answerPayload: {} },
      ],
    });
    await db.reportSummary.create({
      data: {
        sessionId: session.id,
        percentScore: 68 + index * 10,
        performanceBand: index === 0 ? "Basic" : "Proficient",
        strongestSkill: "Main Idea",
        weakestSkill: "Inference",
        growthFromPrevious: index === 0 ? null : 12,
        previousReportId: null,
        summaryPayload: {
          growth: { previousScore: index === 0 ? null : 66, currentScore: 68 + index * 10, growthPoints: index === 0 ? null : 12, previousBand: index === 0 ? null : "Basic", currentBand: index === 0 ? "Basic" : "Proficient" },
          standardsMastery: [
            { standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", earnedPoints: 1, totalPoints: 1, questionCount: 1, percentScore: 100, performanceBand: "Advanced" },
            { standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", earnedPoints: index === 1 ? 3 : 2, totalPoints: 3, questionCount: 2, percentScore: index === 1 ? 100 : 67, performanceBand: index === 1 ? "Advanced" : "Basic" },
          ],
          standardsGrowth: [
            { standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", previousScore: null, currentScore: 100, growthPoints: null, previousBand: null, currentBand: "Advanced" },
            { standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", previousScore: index === 0 ? null : 55, currentScore: index === 1 ? 100 : 67, growthPoints: index === 0 ? null : 45, previousBand: index === 0 ? null : "Basic", currentBand: index === 1 ? "Advanced" : "Basic" },
          ],
        },
      },
    });
  }

  if (gradeSixClass) {
    await db.reportSchedule.create({
      data: { teacherUserId: teacherUser.id, classRoomId: gradeSixClass.id, frequency: "WEEKLY", sendDay: 5, sendHour: 7, reportType: "GROWTH" },
    }).catch(() => {});
  }

  console.log("Seed complete");
  console.log(`${SCHOOL_NAME} roster created for grades 3-8`);
  console.log(`All seeded users use password: ${PASSWORD}`);
  console.log("admin@example.com");
  console.log("teacher@example.com");
  console.log("student@example.com");
  console.log("grade3.student@example.com");
  console.log("grade4.student@example.com");
  console.log("grade5.student@example.com");
  console.log("grade7.student@example.com");
  console.log("grade8.student@example.com");
  console.log("parent@example.com");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
