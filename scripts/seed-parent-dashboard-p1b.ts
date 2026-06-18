import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const PARENT_EMAIL = "parent.p1b@dev.local";
const PARENT_PASSWORD = "ParentP1b!2026";
const E2E_STUDENT_EMAILS = ["e2e.student1@dev.local", "e2e.student2@dev.local", "e2e.student3@dev.local"];
const SINGLE_PRODUCT_EMAIL = "parent.p1b.math-soon.student@dev.local";
const LEGACY_SINGLE_PRODUCT_EMAIL = "parent.p1b.reading-only.student@dev.local";

const db = new PrismaClient();

async function main() {
  assertSeedAllowed(process.env.DATABASE_URL, process.env.ALLOW_PSSA_PARENT_SEED);
  const passwordHash = await bcrypt.hash(PARENT_PASSWORD, 10);

  await db.$transaction(async (tx) => {
    const e2eStudents = await tx.user.findMany({
      where: { email: { in: E2E_STUDENT_EMAILS } },
      include: { studentProfile: true },
      orderBy: { email: "asc" },
    });
    if (e2eStudents.length !== E2E_STUDENT_EMAILS.length || e2eStudents.some((student) => !student.studentProfile)) {
      throw new Error(`expected_e2e_students_missing:${E2E_STUDENT_EMAILS.join(",")}`);
    }

    const existingParent = await tx.user.findUnique({ where: { email: PARENT_EMAIL } });
    if (existingParent && existingParent.role !== "PARENT") throw new Error(`parent_email_role_conflict:${existingParent.role}`);

    const parentUser = await tx.user.upsert({
      where: { email: PARENT_EMAIL },
      update: { name: "Phase 1b Parent", role: "PARENT", passwordHash, accountDeletedAt: null, emailVerifiedAt: new Date() },
      create: { email: PARENT_EMAIL, name: "Phase 1b Parent", role: "PARENT", passwordHash, emailVerifiedAt: new Date() },
    });
    const parentProfile = await tx.parentProfile.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: { userId: parentUser.id },
    });

    const bothProductStudent = e2eStudents[0];
    await tx.user.update({
      where: { id: bothProductStudent.id },
      data: {
        name: "Ava Carter",
        enrolledTestPrep: unionEnumValues(bothProductStudent.enrolledTestPrep, ["PSSA"]),
        enrolledPrograms: unionEnumValues(bothProductStudent.enrolledPrograms, ["VENUS"]),
      },
    });
    await linkParent(tx, parentProfile.id, bothProductStudent.studentProfile!.id);

    const syntheticStudent = await upsertSingleProductStudent(tx, passwordHash);
    await linkParent(tx, parentProfile.id, syntheticStudent.studentProfile.id);
    await unlinkLegacySyntheticChild(tx, parentProfile.id);

    const combos = await tx.parentStudentLink.findMany({
      where: { parentProfileId: parentProfile.id },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { studentProfileId: "asc" },
    });

    console.log(`Parent login: ${PARENT_EMAIL} / ${PARENT_PASSWORD}`);
    console.log("Parent URL: http://localhost:3000/parent");
    for (const link of combos) {
      console.log(`${link.studentProfile.user.name}: ${displayProducts(link.studentProfile.user.enrolledPrograms, link.studentProfile.user.enrolledTestPrep).join(", ") || "No active products"}`);
    }
  });
}

function assertSeedAllowed(databaseUrl: string | undefined, allow: string | undefined) {
  if (allow !== "1") throw new Error("refusing_seed_without_ALLOW_PSSA_PARENT_SEED=1");
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" || parsed.port !== "5433" || databaseName !== "pssa_dev") {
    throw new Error(`refusing_non_dev_database:${parsed.hostname}:${parsed.port}/${databaseName}`);
  }
}

function unionEnumValues<T extends string>(existing: T[], additions: T[]): T[] {
  return [...new Set([...existing, ...additions])];
}

async function linkParent(tx: PrismaTransaction, parentProfileId: string, studentProfileId: string) {
  await tx.parentStudentLink.upsert({
    where: { parentProfileId_studentProfileId: { parentProfileId, studentProfileId } },
    update: {},
    create: { parentProfileId, studentProfileId },
  });
}

async function upsertSingleProductStudent(tx: PrismaTransaction, passwordHash: string) {
  const user = await tx.user.upsert({
    where: { email: SINGLE_PRODUCT_EMAIL },
    update: {
      name: "Marcus Rivera",
      role: "STUDENT",
      passwordHash,
      accountDeletedAt: null,
      emailVerifiedAt: new Date(),
      enrolledPrograms: ["MERCURY"],
      enrolledTestPrep: ["PSSA"],
    },
    create: {
      email: SINGLE_PRODUCT_EMAIL,
      name: "Marcus Rivera",
      role: "STUDENT",
      passwordHash,
      emailVerifiedAt: new Date(),
      enrolledPrograms: ["MERCURY"],
      enrolledTestPrep: ["PSSA"],
    },
  });
  const studentProfile = await tx.studentProfile.upsert({
    where: { userId: user.id },
    update: { grade: 3, schoolName: "PSSA Dev E2E" },
    create: { userId: user.id, grade: 3, schoolName: "PSSA Dev E2E" },
  });
  return { user, studentProfile };
}

async function unlinkLegacySyntheticChild(tx: PrismaTransaction, parentProfileId: string) {
  const legacy = await tx.user.findUnique({
    where: { email: LEGACY_SINGLE_PRODUCT_EMAIL },
    include: { studentProfile: true },
  });
  if (!legacy?.studentProfile) return;
  await tx.parentStudentLink.deleteMany({
    where: { parentProfileId, studentProfileId: legacy.studentProfile.id },
  });
}

function displayProducts(enrolledPrograms: string[], enrolledTestPrep: string[]) {
  const labels = [];
  if (enrolledTestPrep.length) labels.push("State Track");
  if (enrolledPrograms.includes("VENUS")) labels.push("Reading Buddy with Harper");
  if (enrolledPrograms.includes("MERCURY")) labels.push("Math Buddy with Damien");
  if (enrolledPrograms.includes("MARS")) labels.push("Science Buddy");
  if (enrolledPrograms.includes("EARTH")) labels.push("History Buddy");
  return labels;
}

type PrismaTransaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
