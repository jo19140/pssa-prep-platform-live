import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const SAMPLERS = [
  { grade: 3, url: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-3-item-sampler.pdf" },
  { grade: 4, url: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-4-item-sampler.pdf" },
  { grade: 5, url: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-5-item-sampler.pdf" },
  { grade: 6, url: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-6-item-sampler.pdf" },
  { grade: 7, url: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-7-item-sampler.pdf" },
  { grade: 8, url: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-8-item-sampler.pdf" },
];

const OUTPUT_DIR = path.join(process.cwd(), "reference", "pssa-released-items");

async function fetchSampler(grade: number, url: string) {
  const filename = `2024-pssa-ela-grade-${grade}-item-sampler.pdf`;
  const filepath = path.join(OUTPUT_DIR, filename);
  if (existsSync(filepath)) {
    console.log(`  ⊙ Grade ${grade} already exists, skipping`);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  ✗ Grade ${grade} fetch failed: ${res.status} ${res.statusText}`);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(filepath, buffer);
  const sizeKb = Math.round(buffer.length / 1024);
  console.log(`  ✓ Grade ${grade}: ${filename} (${sizeKb} KB)`);
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created ${OUTPUT_DIR}`);
  }

  console.log(`Downloading 2024 PSSA ELA item samplers to ${OUTPUT_DIR}`);
  for (const { grade, url } of SAMPLERS) {
    await fetchSampler(grade, url);
  }
  console.log("\nDone. Commit these to the repo so future AI prompt slices can reference them.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
