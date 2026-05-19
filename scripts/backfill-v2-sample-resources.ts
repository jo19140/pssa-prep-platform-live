import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";

const SAMPLE_DIR = path.join(process.cwd(), "audit", "v2-samples");

async function main() {
  if (!existsSync(SAMPLE_DIR)) throw new Error(`Missing sample directory: ${SAMPLE_DIR}`);

  const files = readdirSync(SAMPLE_DIR)
    .filter((filename) => filename.endsWith(".json") && filename !== "summary.json")
    .sort();

  let checked = 0;
  let alreadyPopulated = 0;
  let missingResource = 0;
  let updated = 0;
  let normalizedNulls = 0;

  for (const filename of files) {
    const filePath = path.join(SAMPLE_DIR, filename);
    const raw = JSON.parse(readFileSync(filePath, "utf8"));
    const lesson = raw.lesson;
    if (!lesson) continue;
    if (!lesson.heroResourceLinkId) {
      if (!("resourceTitle" in lesson) || !("resourceUrl" in lesson) || !("resourceProvider" in lesson) || !("resourceDescription" in lesson)) {
        lesson.resourceTitle = null;
        lesson.resourceUrl = null;
        lesson.resourceProvider = null;
        lesson.resourceDescription = null;
        writeFileSync(filePath, `${JSON.stringify(raw, null, 2)}\n`);
        normalizedNulls += 1;
      }
      continue;
    }
    checked += 1;

    if (lesson.resourceUrl) {
      alreadyPopulated += 1;
      continue;
    }

    const resource = await db.resourceLink.findUnique({
      where: { id: lesson.heroResourceLinkId },
      select: { title: true, url: true, provider: true, description: true },
    });

    if (!resource) {
      missingResource += 1;
      console.warn(`Missing ResourceLink for ${filename}: ${lesson.heroResourceLinkId}`);
      continue;
    }

    lesson.resourceTitle = resource.title;
    lesson.resourceUrl = resource.url;
    lesson.resourceProvider = resource.provider;
    lesson.resourceDescription = resource.description;
    writeFileSync(filePath, `${JSON.stringify(raw, null, 2)}\n`);
    updated += 1;
    console.log(`Updated ${filename}: ${resource.title}`);
  }

  console.log(JSON.stringify({ files: files.length, checked, updated, alreadyPopulated, missingResource, normalizedNulls }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
