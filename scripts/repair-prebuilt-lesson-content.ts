import { PrismaClient } from "@prisma/client";
import { repairPrebuiltLessonContent } from "../lib/prebuiltLessonLibrary";

const db = new PrismaClient();

repairPrebuiltLessonContent(db)
  .then((result) => {
    console.log(`Prebuilt lesson content repaired: ${result.updated} lesson records updated.`);
  })
  .finally(async () => {
    await db.$disconnect();
  });
