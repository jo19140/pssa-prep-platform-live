import { db } from "@/lib/db";
import { enforceVoiceRetention } from "@/lib/voice/retentionJobs";

async function main() {
  const purged = await enforceVoiceRetention();
  console.log(`Purged ${purged} expired voice audio objects.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
