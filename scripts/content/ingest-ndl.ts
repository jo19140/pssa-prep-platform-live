import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { NDL_LICENSE_ATTRIBUTION } from "../../lib/content/phase3EntrySeed";

const db = new PrismaClient();
const DEFAULT_NDL_PATH = path.join(process.cwd(), "data", "hfw", "ndl_lemmatized.json");

type RawNdlEntry =
  | string
  | {
      lemma?: string;
      word?: string;
      forms?: string[];
      inflectedForms?: string[];
      rank?: number;
      ndlRank?: number;
      subtlexRank?: number;
      isRegular?: boolean;
      introducedAtPhase?: number;
    };

function normalizeEntry(entry: RawNdlEntry, index: number) {
  const lemma = typeof entry === "string" ? entry : entry.lemma || entry.word;
  if (!lemma) throw new Error(`NDL entry #${index + 1} is missing a lemma/word.`);

  const normalizedLemma = lemma.trim().toLowerCase();
  if (!normalizedLemma) throw new Error(`NDL entry #${index + 1} has an empty lemma.`);

  const forms = typeof entry === "string" ? [normalizedLemma] : entry.forms || entry.inflectedForms || [normalizedLemma];

  return {
    lemma: normalizedLemma,
    forms: Array.from(new Set(forms.map((form) => form.trim().toLowerCase()).filter(Boolean))),
    isRegular: typeof entry === "string" ? false : entry.isRegular ?? false,
    ndlRank: typeof entry === "string" ? index + 1 : entry.ndlRank ?? entry.rank ?? index + 1,
    subtlexRank: typeof entry === "string" ? null : entry.subtlexRank ?? null,
    introducedAtPhase: typeof entry === "string" ? 3 : entry.introducedAtPhase ?? 3,
  };
}

export async function ingestNdl(filePath = process.env.NDL_LEMMATIZED_PATH || DEFAULT_NDL_PATH) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as RawNdlEntry[] | { words?: RawNdlEntry[]; entries?: RawNdlEntry[] };
  const entries = Array.isArray(parsed) ? parsed : parsed.words || parsed.entries;
  if (!Array.isArray(entries)) {
    throw new Error("NDL lemmatized file must be a JSON array, or an object with a words/entries array.");
  }

  await db.licenseAttribution.upsert({
    where: { sourceCode: NDL_LICENSE_ATTRIBUTION.sourceCode },
    create: NDL_LICENSE_ATTRIBUTION,
    update: NDL_LICENSE_ATTRIBUTION,
  });

  let upserted = 0;
  for (const [index, entry] of entries.entries()) {
    const word = normalizeEntry(entry, index);
    await db.highFrequencyWord.upsert({
      where: { lemma: word.lemma },
      create: word,
      update: word,
    });
    upserted += 1;
  }

  return { upserted, filePath };
}

async function main() {
  const filePath = process.argv[2] || process.env.NDL_LEMMATIZED_PATH || DEFAULT_NDL_PATH;
  const result = await ingestNdl(filePath);
  console.log(`Ingested ${result.upserted} NDL high-frequency words from ${result.filePath}`);
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (error) => {
      console.error("Failed to ingest NDL:", error);
      await db.$disconnect();
      process.exit(1);
    });
}
