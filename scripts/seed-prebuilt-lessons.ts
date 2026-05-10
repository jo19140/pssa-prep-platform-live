import { PrismaClient } from "@prisma/client";
import { seedPrebuiltLessonLibrary } from "../lib/prebuiltLessonLibrary";

const db = new PrismaClient();

seedPrebuiltLessonLibrary(db)
  .then((result) => {
    console.log(`Prebuilt lesson library ready: ${result.created} created, ${result.existing} already existed, ${result.total} total.`);
  })
  .finally(async () => {
    await db.$disconnect();
  });
