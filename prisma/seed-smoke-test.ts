import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "Password123!";
const emails = {
  admin: "smoke.admin@example.com",
  teacher: "smoke.teacher@example.com",
  parent: "smoke.parent@example.com",
  student: "smoke.student@example.com",
};

const placeholderPassage = [
  "This placeholder passage is only for local smoke testing.",
  "A learner visits a quiet classroom, opens a notebook, and practices reading a short set of words.",
  "The teacher listens for accuracy, pacing, and confidence while the learner explains which words felt easy and which words needed another try.",
  "The family dashboard should not treat this sample as real progress evidence.",
  "It exists so developers can verify sign-in, diagnostic submission, practice response capture, speed-drill logging, and admin event visibility without generating production literacy content.",
  "Every record seeded by this script is marked as placeholder smoke-test data and should be ignored by real reporting, pilots, or content-quality review.",
].join(" ");

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [admin, teacher, parent, student] = await Promise.all([
    upsertUser(emails.admin, "Smoke Admin", "ADMIN", passwordHash),
    upsertUser(emails.teacher, "Smoke Teacher", "TEACHER", passwordHash),
    upsertUser(emails.parent, "Smoke Parent", "PARENT", passwordHash),
    upsertUser(emails.student, "Smoke Student", "STUDENT", passwordHash),
  ]);

  const teacherProfile = await db.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: { schoolName: "Smoke Test Learning Lab", gradeBand: "5", isPlaceholderSmokeTest: true },
    create: { userId: teacher.id, schoolName: "Smoke Test Learning Lab", gradeBand: "5", isPlaceholderSmokeTest: true },
  });
  const studentProfile = await db.studentProfile.upsert({
    where: { userId: student.id },
    update: { grade: 5, schoolName: "Smoke Test Learning Lab", teacherId: teacherProfile.id, isPlaceholderSmokeTest: true },
    create: { userId: student.id, grade: 5, schoolName: "Smoke Test Learning Lab", teacherId: teacherProfile.id, isPlaceholderSmokeTest: true },
  });
  const parentProfile = await db.parentProfile.upsert({
    where: { userId: parent.id },
    update: { isPlaceholderSmokeTest: true },
    create: { userId: parent.id, isPlaceholderSmokeTest: true },
  });
  await db.parentStudentLink.upsert({
    where: { parentProfileId_studentProfileId: { parentProfileId: parentProfile.id, studentProfileId: studentProfile.id } },
    update: { isPlaceholderSmokeTest: true },
    create: { parentProfileId: parentProfile.id, studentProfileId: studentProfile.id, isPlaceholderSmokeTest: true },
  });

  await db.phonogramFamily.upsert({
    where: { code: "-ake" },
    update: {
      category: "rime",
      syllableType: "VCE",
      exampleWords: ["make", "take", "cake", "lake", "shake"],
      introductionOrder: 1,
      isPlaceholderSmokeTest: true,
    },
    create: {
      code: "-ake",
      category: "rime",
      syllableType: "VCE",
      exampleWords: ["make", "take", "cake", "lake", "shake"],
      introductionOrder: 1,
      isPlaceholderSmokeTest: true,
    },
  });

  const assessment = await db.assessment.upsert({
    where: { id: "smoke-reading-buddy-grade-5" },
    update: { title: "Smoke Test Reading Buddy Diagnostic", subject: "ELA", state: "PA", grade: 5, isAdaptive: false, isPlaceholderSmokeTest: true },
    create: { id: "smoke-reading-buddy-grade-5", title: "Smoke Test Reading Buddy Diagnostic", subject: "ELA", state: "PA", grade: 5, isAdaptive: false, isPlaceholderSmokeTest: true },
  });

  await db.assessmentPassage.upsert({
    where: { assessmentId_passageKey: { assessmentId: assessment.id, passageKey: "smoke-placeholder-passage" } },
    update: {
      title: "Smoke Placeholder Passage",
      passageType: "PLACEHOLDER",
      genre: "informational",
      content: placeholderPassage,
      wordCountTarget: 150,
      actualWordCount: placeholderPassage.split(/\s+/).length,
      gradeLevel: 5,
      metadata: { isPlaceholderSmokeTest: true, contentNote: "TODO: from content pipeline" },
      isPlaceholderSmokeTest: true,
    },
    create: {
      assessmentId: assessment.id,
      passageKey: "smoke-placeholder-passage",
      title: "Smoke Placeholder Passage",
      passageType: "PLACEHOLDER",
      genre: "informational",
      content: placeholderPassage,
      wordCountTarget: 150,
      actualWordCount: placeholderPassage.split(/\s+/).length,
      gradeLevel: 5,
      metadata: { isPlaceholderSmokeTest: true, contentNote: "TODO: from content pipeline" },
      isPlaceholderSmokeTest: true,
    },
  });

  for (let index = 1; index <= 5; index += 1) {
    await db.assessmentQuestion.upsert({
      where: { assessmentId_questionNo: { assessmentId: assessment.id, questionNo: index } },
      update: smokeQuestion(index),
      create: { assessmentId: assessment.id, questionNo: index, ...smokeQuestion(index) },
    });
  }

  console.log("Smoke-test seed complete.");
  console.log(`Users: ${Object.values(emails).join(", ")}`);
  console.log(`Password: ${PASSWORD}`);
}

async function upsertUser(email: string, name: string, role: string, passwordHash: string) {
  return db.user.upsert({
    where: { email },
    update: { name, role, passwordHash, isPlaceholderSmokeTest: true },
    create: { email, name, role, passwordHash, isPlaceholderSmokeTest: true },
  });
}

function smokeQuestion(index: number) {
  return {
    standardCode: `SMOKE.5.${index}`,
    standardLabel: "Placeholder Reading Buddy diagnostic item",
    questionType: "MCQ",
    skill: "Placeholder diagnostic skill",
    difficulty: 1,
    questionPayload: {
      isPlaceholderSmokeTest: true,
      prompt: "TODO: from content pipeline",
      choices: ["Placeholder A", "Placeholder B", "Placeholder C", "Placeholder D"],
      correctIndex: 0,
    },
    isPlaceholderSmokeTest: true,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
