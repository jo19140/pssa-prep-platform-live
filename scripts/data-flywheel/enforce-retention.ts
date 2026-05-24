import { db } from "@/lib/db";
import { enforceDataFlywheelRetention } from "@/lib/dataflywheel/retention";

async function main() {
  const result = await enforceDataFlywheelRetention();
  console.log(`Retention result: ${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
