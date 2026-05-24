import { db } from "@/lib/db";
import { purgeTrainingOptOuts } from "@/lib/voice/retentionJobs";

async function main() {
  const processed = await purgeTrainingOptOuts();
  console.log(`Processed ${processed} training opt-out purge records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
