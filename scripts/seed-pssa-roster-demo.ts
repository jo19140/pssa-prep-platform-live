import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { GRADE3_EOY_DIAGNOSTIC_BLUEPRINT } from "./content/lib/pssa-form-assembly";

type Args = {
  env: string | null;
  formId: string | null;
  allowProduction: boolean;
  teacherEmail: string;
  studentEmail: string;
  password: string;
};

export type DemoRosterOptions = {
  formId: string;
  teacherEmail?: string;
  studentEmail?: string;
  teacherName?: string;
  studentName?: string;
  passwordHash?: string;
  classRoomId?: string;
};

export type DemoRosterResult = {
  teacherId: string;
  teacherProfileId: string;
  studentId: string;
  studentProfileId: string;
  classRoomId: string;
  enrollmentId: string;
  formId: string;
};

const DEFAULT_TEACHER_EMAIL = "pssa.eoy.teacher.demo.test@example.test";
const DEFAULT_STUDENT_EMAIL = "pssa.eoy.student.demo.test@example.test";
const DEFAULT_PASSWORD = "PssaDemo!2026";
const DEFAULT_CLASSROOM_ID = "pssa-g3-eoy-demo-classroom";
const DEMO_SCHOOL_NAME = "Sý Learning PSSA Demo";

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    env: null,
    formId: null,
    allowProduction: false,
    teacherEmail: DEFAULT_TEACHER_EMAIL,
    studentEmail: DEFAULT_STUDENT_EMAIL,
    password: DEFAULT_PASSWORD,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}.`);
      i += 1;
      return value;
    };
    if (arg === "--env") args.env = next();
    else if (arg.startsWith("--env=")) args.env = arg.slice("--env=".length);
    else if (arg === "--formId") args.formId = next();
    else if (arg.startsWith("--formId=")) args.formId = arg.slice("--formId=".length);
    else if (arg === "--teacher-email") args.teacherEmail = next();
    else if (arg.startsWith("--teacher-email=")) args.teacherEmail = arg.slice("--teacher-email=".length);
    else if (arg === "--student-email") args.studentEmail = next();
    else if (arg.startsWith("--student-email=")) args.studentEmail = arg.slice("--student-email=".length);
    else if (arg === "--password") args.password = next();
    else if (arg.startsWith("--password=")) args.password = arg.slice("--password=".length);
    else if (arg === "--allow-production") args.allowProduction = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function assertDemoSeedAllowed(input: { env: string | null; databaseUrl?: string; allowProduction?: boolean }) {
  if (input.env !== "dev") throw new Error("--env dev is required for the PSSA roster demo seed.");
  if (!input.databaseUrl) throw new Error("DATABASE_URL is required for the PSSA roster demo seed.");
  if (looksProductionLike(input.databaseUrl) && !input.allowProduction) {
    throw new Error("Refusing production-like DATABASE_URL without --allow-production.");
  }
}

export function looksProductionLike(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  return lower.includes("prod") || lower.includes("production") || lower.includes("neon.tech") || lower.includes("sslmode=require");
}

export async function resolveDemoFormId(db: any, explicitFormId?: string | null): Promise<string> {
  if (explicitFormId) {
    const form = await db.pssaForm.findUnique({ where: { id: explicitFormId }, select: { id: true } });
    if (!form) throw new Error(`PssaForm not found: ${explicitFormId}`);
    return form.id;
  }
  const forms = await db.pssaForm.findMany({
    where: {
      gradeLevel: 3,
      subject: "ELA",
      blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
      formStatus: "assembled",
    },
    orderBy: [{ assembledAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    select: { id: true },
    take: 2,
  });
  if (forms.length === 0) throw new Error("No assembled Grade 3 EOY PSSA form found. Pass --formId after assembling the form.");
  if (forms.length > 1) throw new Error("Multiple assembled Grade 3 EOY PSSA forms found. Re-run with --formId <id>.");
  return forms[0].id;
}

export async function upsertDemoRoster(db: any, opts: DemoRosterOptions): Promise<DemoRosterResult> {
  const teacherEmail = (opts.teacherEmail ?? DEFAULT_TEACHER_EMAIL).trim().toLowerCase();
  const studentEmail = (opts.studentEmail ?? DEFAULT_STUDENT_EMAIL).trim().toLowerCase();
  if (!teacherEmail.endsWith(".test") || !studentEmail.endsWith(".test")) {
    throw new Error("Demo roster users must use .test email addresses.");
  }
  const passwordHash = opts.passwordHash ?? null;
  const teacher = await db.user.upsert({
    where: { email: teacherEmail },
    update: {
      name: opts.teacherName ?? "PSSA EOY Demo Teacher",
      role: "TEACHER",
      passwordHash,
      accountDeletedAt: null,
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    },
    create: {
      email: teacherEmail,
      name: opts.teacherName ?? "PSSA EOY Demo Teacher",
      role: "TEACHER",
      passwordHash,
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const teacherProfile = await db.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: { schoolName: DEMO_SCHOOL_NAME, gradeBand: "3" },
    create: { userId: teacher.id, schoolName: DEMO_SCHOOL_NAME, gradeBand: "3" },
  });
  const student = await db.user.upsert({
    where: { email: studentEmail },
    update: {
      name: opts.studentName ?? "PSSA EOY Demo Student",
      role: "STUDENT",
      passwordHash,
      accountDeletedAt: null,
      parentalConsentRequired: false,
      parentalConsentAt: new Date("2026-01-01T00:00:00Z"),
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    },
    create: {
      email: studentEmail,
      name: opts.studentName ?? "PSSA EOY Demo Student",
      role: "STUDENT",
      passwordHash,
      parentalConsentRequired: false,
      parentalConsentAt: new Date("2026-01-01T00:00:00Z"),
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const studentProfile = await db.studentProfile.upsert({
    where: { userId: student.id },
    update: { grade: 3, schoolName: DEMO_SCHOOL_NAME, teacherId: teacherProfile.id },
    create: { userId: student.id, grade: 3, schoolName: DEMO_SCHOOL_NAME, teacherId: teacherProfile.id },
  });
  const classRoom = await db.classRoom.upsert({
    where: { id: opts.classRoomId ?? DEFAULT_CLASSROOM_ID },
    update: {
      name: "Grade 3 PSSA EOY Demo",
      teacherId: teacherProfile.id,
      grade: 3,
      joinEnabled: false,
    },
    create: {
      id: opts.classRoomId ?? DEFAULT_CLASSROOM_ID,
      name: "Grade 3 PSSA EOY Demo",
      teacherId: teacherProfile.id,
      grade: 3,
      joinEnabled: false,
    },
  });
  const enrollment = await db.enrollment.upsert({
    where: { classRoomId_studentProfileId: { classRoomId: classRoom.id, studentProfileId: studentProfile.id } },
    update: {},
    create: { classRoomId: classRoom.id, studentProfileId: studentProfile.id },
  });
  return {
    teacherId: teacher.id,
    teacherProfileId: teacherProfile.id,
    studentId: student.id,
    studentProfileId: studentProfile.id,
    classRoomId: classRoom.id,
    enrollmentId: enrollment.id,
    formId: opts.formId,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertDemoSeedAllowed({ env: args.env, databaseUrl: process.env.DATABASE_URL, allowProduction: args.allowProduction });
  const db = new PrismaClient();
  try {
    const formId = await resolveDemoFormId(db, args.formId);
    const passwordHash = await bcrypt.hash(args.password, 10);
    const result = await upsertDemoRoster(db, {
      formId,
      teacherEmail: args.teacherEmail,
      studentEmail: args.studentEmail,
      passwordHash,
    });
    console.log("PSSA EOY demo roster ready.");
    console.log(`teacherId=${result.teacherId}`);
    console.log(`studentId=${result.studentId}`);
    console.log(`studentUserId=${result.studentId}`);
    console.log(`studentProfileId=${result.studentProfileId}`);
    console.log(`classRoomId=${result.classRoomId}`);
    console.log(`formId=${result.formId}`);
    console.log(`teacherEmail=${args.teacherEmail}`);
    console.log(`studentEmail=${args.studentEmail}`);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
