import { PrismaClient } from "@prisma/client";
import { repairPrebuiltLessonStandards } from "../lib/prebuiltLessonLibrary";

const db = new PrismaClient();

repairPrebuiltLessonStandards(db)
  .then((result) => {
    console.log(`Prebuilt lesson standards repaired: ${result.updated} lesson records updated.`);
  })
  .finally(async () => {
    await db.$disconnect();
  });
