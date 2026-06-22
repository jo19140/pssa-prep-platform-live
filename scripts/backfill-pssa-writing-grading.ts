import { db } from "@/lib/db";
import { backfillPssaWritingGradingJobs } from "@/lib/content/pssaWritingGrading";

async function main() {
  const result = await backfillPssaWritingGradingJobs(db);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("pssa writing grading backfill failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
