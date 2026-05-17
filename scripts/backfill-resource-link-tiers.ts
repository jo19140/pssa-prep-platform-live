import { readFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";

type VideoRow = {
  watch_url?: string | null;
  embed_url?: string | null;
  tier?: string | null;
};

async function countTiers() {
  const [foundational, onGrade, advanced, belowGradeLevel, aboveGradeLevel] = await Promise.all([
    db.resourceLink.count({ where: { tier: "foundational" } }),
    db.resourceLink.count({ where: { tier: "on_grade" } }),
    db.resourceLink.count({ where: { tier: "advanced" } }),
    db.resourceLink.count({ where: { belowGradeLevel: true } }),
    db.resourceLink.count({ where: { aboveGradeLevel: true } }),
  ]);
  return { foundational, onGrade, advanced, belowGradeLevel, aboveGradeLevel };
}

async function main() {
  const before = await countTiers();
  const catalogPath = path.join(process.cwd(), "data", "oer-videos.json");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as { videos?: VideoRow[] };
  const byUrl = new Map<string, { tier: string | null; belowGradeLevel: boolean; aboveGradeLevel: boolean }>();

  for (const video of catalog.videos || []) {
    const url = video.watch_url || video.embed_url;
    if (!url) continue;
    const tier = video.tier?.trim() || null;
    byUrl.set(url, {
      tier,
      belowGradeLevel: tier === "foundational",
      aboveGradeLevel: tier === "advanced",
    });
  }

  let matchedRows = 0;
  let matchedVideos = 0;
  for (const [url, data] of byUrl.entries()) {
    const result = await db.resourceLink.updateMany({ where: { url }, data });
    if (result.count) {
      matchedVideos += 1;
      matchedRows += result.count;
    }
  }

  const after = await countTiers();
  console.log("ResourceLink tier backfill complete.");
  console.log(`  Catalog URLs processed: ${byUrl.size}`);
  console.log(`  Catalog URLs matched: ${matchedVideos}`);
  console.log(`  ResourceLink rows updated: ${matchedRows}`);
  console.log("  Before:", before);
  console.log("  After:", after);
}

main()
  .catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
