import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureVoiceConsent, updateVoiceConsent } from "@/lib/voice/consent";

const PASSWORD = "Password123!";
const SCHOOL_NAME = "Bethune Elementary";
const DISTRICT_NAME = "Bethune Elementary Pilot";

const STUDENT_EMAIL = "grade7-voice-smoke@example.com";
const STUDENT_NAME = "Grade7 Voice Smoke (synthetic)";
const ANNOTATOR_EMAIL = "voice-annotator-smoke@example.com";
const ANNOTATOR_NAME = "Voice Annotator Smoke (synthetic)";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

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

  const student = await db.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: { name: STUDENT_NAME, role: "STUDENT", passwordHash },
    create: { email: STUDENT_EMAIL, name: STUDENT_NAME, role: "STUDENT", passwordHash },
  });

  await db.studentProfile.upsert({
    where: { userId: student.id },
    update: { grade: 7, schoolId: school.id, schoolName: school.name },
    create: { userId: student.id, grade: 7, schoolId: school.id, schoolName: school.name },
  });

  const annotator = await db.user.upsert({
    where: { email: ANNOTATOR_EMAIL },
    update: { name: ANNOTATOR_NAME, role: "VOICE_ANNOTATOR", passwordHash },
    create: { email: ANNOTATOR_EMAIL, name: ANNOTATOR_NAME, role: "VOICE_ANNOTATOR", passwordHash },
  });

  const actor = { id: annotator.id, role: annotator.role };
  const consent = await ensureVoiceConsent(student.id, actor);
  if (consent.trainingCorpusOptedIn !== true) {
    await updateVoiceConsent({
      studentUserId: student.id,
      actor,
      trainingCorpusOptedIn: true,
    });
  }

  console.log("P4A synthetic voice-capture smoke accounts are ready.");
  console.log(`Student: ${STUDENT_EMAIL}`);
  console.log(`Annotator: ${ANNOTATOR_EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed P4A synthetic voice-capture smoke accounts.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
