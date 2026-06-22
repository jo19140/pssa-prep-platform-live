import { db } from "@/lib/db";
import { processPssaWritingGradingJob } from "@/lib/content/pssaWritingGrading";

async function main() {
  const jobId = process.argv[2];
  if (!jobId) throw new Error("Usage: npx tsx scripts/process-pssa-writing-grading-job.ts <jobId>");
  const result = await processPssaWritingGradingJob(db, jobId);
  console.log(JSON.stringify({ id: result.id, status: result.status }, null, 2));
}

main()
  .catch((error) => {
    console.error("pssa writing grading job failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
