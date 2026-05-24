import { db } from "@/lib/db";
import { computeDataFlywheelOutcomes } from "@/lib/dataflywheel/outcomes";

async function main() {
  const result = await computeDataFlywheelOutcomes();
  console.log(`Computed outcomes: ${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
