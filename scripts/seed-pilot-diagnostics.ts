import { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { generateDiagnosticAssessment } from "../lib/diagnosticGenerator";

const PILOT_GRADES = [6, 7];

async function seedGradeDiagnostic(gradeLevel: number) {
  console.log(`\n--- Grade ${gradeLevel} ---`);
  const diagnostic = generateDiagnosticAssessment(gradeLevel);
  console.log(`Generated: ${diagnostic.title}`);
  console.log(`  passages: ${diagnostic.passages.length}`);
  console.log(`  questions: ${diagnostic.questions.length}`);
  console.log(`  standards: ${diagnostic.standards.length}`);

  const deterministicId = `pilot-diagnostic-g${gradeLevel}-id`;

  await db.$transaction(async (tx) => {
    const assessment = await tx.assessment.upsert({
      where: { id: deterministicId },
      create: {
        id: deterministicId,
        title: `Grade ${gradeLevel} PSSA ELA Pilot Diagnostic`,
        subject: "ELA",
        state: "PA",
        grade: gradeLevel,
        isAdaptive: false,
      },
      update: {
        title: `Grade ${gradeLevel} PSSA ELA Pilot Diagnostic`,
        subject: "ELA",
        state: "PA",
        grade: gradeLevel,
        isAdaptive: false,
      },
    });

    // Clear existing children before re-inserting (idempotent re-run).
    await tx.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
    await tx.assessmentPassage.deleteMany({ where: { assessmentId: assessment.id } });

    await tx.assessmentPassage.createMany({
      data: diagnostic.passages.map((passage) => ({
        assessmentId: assessment.id,
        passageKey: passage.id,
        title: passage.title,
        passageType: passage.passageType,
        genre: passage.genre,
        content: passage.content,
        wordCountTarget: passage.wordCountTarget,
        actualWordCount: passage.actualWordCount,
        hasTable: passage.hasTable,
        hasSections: passage.hasSections,
        gradeLevel: passage.gradeLevel,
        tableData: passage.tableData as Prisma.InputJsonValue | undefined,
        metadata: passage.metadata as Prisma.InputJsonValue,
      })),
    });

    await tx.assessmentQuestion.createMany({
      data: diagnostic.questions.map((question: any, index: number) => ({
        assessmentId: assessment.id,
        questionNo: index + 1,
        standardCode: question.standardCode,
        standardLabel: question.standardLabel,
        questionType: question.type,
        skill: question.skill,
        difficulty: question.difficulty,
        questionPayload: question as unknown as Prisma.InputJsonValue,
      })),
    });

    console.log(`  Assessment ${assessment.id} upserted; children replaced.`);
  });
}

async function main() {
  for (const grade of PILOT_GRADES) {
    await seedGradeDiagnostic(grade);
  }

  console.log("\n--- Final state ---");
  const all = await db.assessment.findMany({
    where: { id: { in: PILOT_GRADES.map((g) => `pilot-diagnostic-g${g}-id`) } },
    select: {
      id: true,
      title: true,
      grade: true,
      _count: { select: { questions: true, passages: true } },
    },
  });
  console.table(all);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
