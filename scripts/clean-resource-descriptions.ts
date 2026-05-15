import { db } from "../lib/db";

async function main() {
  const before = await db.resourceLink.count({ where: { description: { contains: "Status: PENDING" } } });
  console.log(`ResourceLink rows containing "Status: PENDING": ${before}`);

  const updated = await db.$executeRaw`
    UPDATE "ResourceLink"
    SET description = regexp_replace(description, ' · Status: PENDING', '', 'g')
    WHERE description LIKE '%Status: PENDING%';
  `;
  console.log(`Rows updated: ${updated}`);

  const after = await db.resourceLink.count({ where: { description: { contains: "Status: PENDING" } } });
  console.log(`Remaining rows with "Status: PENDING": ${after}`);

  const sample = await db.resourceLink.findFirst({
    where: { description: { not: null } },
    select: { gradeLevel: true, standardCode: true, skill: true, description: true },
  });
  console.log("\nSample cleaned row:");
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
